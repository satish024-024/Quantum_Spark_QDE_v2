"""
IBM Quantum Provider

Adapter for IBM Quantum backends via Qiskit Runtime.
Returns JobNormalizer v1 contract.
"""

from typing import Dict, List, Any
from datetime import datetime
from .quantum_base_provider import QuantumProvider

class IBMProvider(QuantumProvider):
    """
    IBM Quantum provider implementation.
    Wraps Qiskit Runtime Service.
    """
    
    def __init__(self, token: str = None):
        """
        Initialize IBM provider.
        
        Args:
            token: IBM Quantum API token (optional, uses saved credentials if None)
        """
        self.token = token
        self._service = None
    
    def _get_service(self):
        """Lazy initialization of QiskitRuntimeService"""
        if self._service is None:
            try:
                from qiskit_ibm_runtime import QiskitRuntimeService
                
                if self.token:
                    self._service = QiskitRuntimeService(channel="ibm_quantum_platform", token=self.token)
                else:
                    # Use saved credentials
                    self._service = QiskitRuntimeService(channel="ibm_quantum_platform")
            except Exception as e:
                raise RuntimeError(f"Failed to initialize IBM Quantum service: {e}")
        
        return self._service
    
    def get_available_backends(self, credentials=None) -> List[Dict[str, Any]]:
        """
        Get available IBM Quantum backends.
        
        Returns:
            List of backend info dictionaries
        """
        try:
            if credentials:
                token = None
                if isinstance(credentials, dict):
                    token = credentials.get('api_token') or credentials.get('token')
                else:
                    token = str(credentials)
                if token:
                    self.token = token
                    self._service = None  # Reset service to force re-authentication with new token
            
            service = self._get_service()
            backends = service.backends()
            
            result = []
            for backend in backends:
                # Get backend configuration
                config = backend.configuration()
                status = backend.status()
                
                result.append({
                    "id": backend.name,
                    "name": backend.name.replace('_', ' ').title(),
                    "qubits": config.n_qubits,
                    "type": "simulator" if backend.configuration().simulator else "qpu",
                    "status": "online" if status.operational else "offline",
                    "queue_depth": status.pending_jobs if hasattr(status, 'pending_jobs') else 0
                })
            
            return result
            
        except Exception as e:
            # Don't fail entire registry if IBM is unavailable
            raise RuntimeError(f"Failed to fetch IBM backends: {e}")
    
    def submit_job(self, circuit_ir: Dict, backend_id: str, shots: int) -> Dict:
        """
        Submit job to IBM Quantum.
        
        Args:
            circuit_ir: Canonical circuit IR
            backend_id: IBM backend name
            shots: Number of shots
            
        Returns:
            Job object (v1 contract)
        """
        try:
            from qiskit import transpile
            from qiskit_ibm_runtime import SamplerV2
            from circuit_compiler import CircuitCompiler
            
            service = self._get_service()
            backend = service.backend(backend_id)
            
            # Use circuit compiler to convert IR to Qiskit
            compiler = CircuitCompiler()
            qc = compiler.to_qiskit(circuit_ir)
            
            # Transpile circuit for backend compatibility
            transpiled_qc = transpile(qc, backend=backend, optimization_level=1)
            
            # Create sampler V2 using backend mode (Runtime 0.41.0 API)
            sampler = SamplerV2(mode=backend)
            
            # Submit job with shots parameter
            job = sampler.run([transpiled_qc], shots=shots)
            job_id = job.job_id()
            
            # Determine execution type
            is_simulator = backend.configuration().simulator
            
            # Return v1 contract
            return {
                "job_id": job_id,
                "provider": "ibm",
                "hardware_provider": "ibm",
                "execution_type": "simulator" if is_simulator else "qpu",
                "quantum_model": "gate",
                "lifecycle_state": "queued",
                "is_terminal": False,
                "submitted_at": datetime.utcnow().isoformat() + "Z",
                "backend_id": backend_id,
                "shots": shots
            }
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"IBM job submission failed: {e}")
    
    def get_job_status(self, job_id: str) -> Dict:
        """
        Poll IBM job status.
        
        Args:
            job_id: IBM job ID
            
        Returns:
            Job object (v1 contract) with updated state
        """
        try:
            service = self._get_service()
            job = service.job(job_id)
            status = job.status()
            
            # Map IBM status to lifecycle_state
            status_map = {
                'QUEUED': 'queued',
                'VALIDATING': 'validating',
                'RUNNING': 'running',
                'DONE': 'completed',
                'ERROR': 'failed',
                'CANCELLED': 'cancelled'
            }
            
            lifecycle_state = status_map.get(status.name, 'queued')
            is_terminal = lifecycle_state in ['completed', 'failed', 'cancelled']
            
            result = {
                "job_id": job_id,
                "provider": "ibm",
                "hardware_provider": "ibm",
                "execution_type": "qpu",  # Will be refined from job metadata
                "quantum_model": "gate",
                "lifecycle_state": lifecycle_state,
                "is_terminal": is_terminal
            }
            
            if is_terminal:
                result["result_status"] = "success" if lifecycle_state == "completed" else lifecycle_state
                result["completed_at"] = datetime.utcnow().isoformat() + "Z"
            
            return result
            
        except Exception as e:
            raise ValueError(f"Failed to get IBM job status: {e}")
    
    def get_job_result(self, job_id: str) -> Dict:
        """
        Retrieve IBM job results.
        
        Args:
            job_id: IBM job ID
            
        Returns:
            Results dictionary
        """
        try:
            service = self._get_service()
            job = service.job(job_id)
            
            # Check if job is complete
            status = job.status()
            if status.name != 'DONE':
                raise ValueError(f"Job {job_id} is not complete (status: {status.name})")
            
            # Get results
            result = job.result()
            
            # Extract counts
            quasi_dists = result.quasi_dists[0] if hasattr(result, 'quasi_dists') else {}
            
            # Convert quasi distribution to counts
            shots = sum(quasi_dists.values()) if quasi_dists else 1024
            counts = {bin(k)[2:].zfill(result.metadata[0]['num_clbits']): int(v * shots) 
                     for k, v in quasi_dists.items()}
            
            return {
                "counts": counts,
                "shots": int(shots),
                "backend": job.backend().name,
                "execution_time": result.metadata[0].get('time_taken', 0.0) if hasattr(result, 'metadata') else 0.0
            }
            
        except Exception as e:
            raise ValueError(f"Failed to get IBM job result: {e}")
