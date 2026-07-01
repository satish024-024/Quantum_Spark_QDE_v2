"""
Quantinuum (H-Series) Provider Adapter
Multi-Provider Quantum Integration v2.1

Uses pytket and qnexus for Quantinuum H-Series access.

API Reference: https://docs.quantinuum.com/
SDK: pytket-quantinuum, qnexus
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

try:
    from .quantum_provider_base import (
        GateBasedProvider, 
        ProviderCapabilities, 
        ComputationModel
    )
except ImportError:
    from quantum_provider_base import (
        GateBasedProvider, 
        ProviderCapabilities, 
        ComputationModel
    )


class QuantinuumProvider(GateBasedProvider):
    """
    Quantinuum H-Series quantum provider.
    
    Uses pytket for circuit creation and qnexus for job submission.
    
    Available systems:
    - H1-1: 20-qubit trapped ion (fully connected)
    - H1-2: 20-qubit trapped ion
    - H2-1: 32-qubit trapped ion
    - H1-1E/H2-1E: Emulators (noise-accurate)
    """
    
    PROVIDER_NAME = "quantinuum"
    
    # H-Series devices
    H_SERIES_DEVICES = {
        'H1-1': {'qubits': 20, 'type': 'qpu', 'generation': 'H1'},
        'H1-2': {'qubits': 20, 'type': 'qpu', 'generation': 'H1'},
        'H2-1': {'qubits': 32, 'type': 'qpu', 'generation': 'H2'},
        'H1-1E': {'qubits': 20, 'type': 'emulator', 'generation': 'H1'},
        'H2-1E': {'qubits': 32, 'type': 'emulator', 'generation': 'H2'},
        'H1-1SC': {'qubits': 20, 'type': 'syntax_checker', 'generation': 'H1'},
    }
    
    def __init__(self, api_key: str = None, api_url: str = None):
        """
        Initialize Quantinuum provider.
        
        Args:
            api_key: Quantinuum API key (or from env QUANTINUUM_API_KEY)
            api_url: Optional custom API URL
        """
        super().__init__()
        
        self.api_key = api_key
        self.api_url = api_url
        self._backend = None
        
        # Configure capabilities
        self.capabilities.model = ComputationModel.GATE_BASED
        self.capabilities.native_gates = ['Rz', 'PhasedX', 'ZZMax']
        self.capabilities.topology = "full"  # All-to-all connectivity
        self.capabilities.cost_model = "per_shot"
        self.capabilities.access_model = "public"
        self.capabilities.max_shots = 10000
        self.capabilities.supports_mid_circuit_measurement = True
    
    def _get_backend(self, device_name: str = 'H1-1E'):
        """Get Quantinuum backend via pytket (lazy load)"""
        try:
            from pytket.extensions.quantinuum import QuantinuumBackend
            
            backend = QuantinuumBackend(
                device_name=device_name,
                api_key=self.api_key,
                url=self.api_url
            )
            return backend
            
        except ImportError:
            raise ImportError("pytket-quantinuum not installed. Run: pip install pytket-quantinuum")
    
    def get_backends(self) -> List[Dict[str, Any]]:
        """
        Get available Quantinuum H-Series devices.
        
        Returns:
            List of backends with normalized fields
        """
        try:
            from pytket.extensions.quantinuum import QuantinuumBackend
            
            backends = []
            for name, info in self.H_SERIES_DEVICES.items():
                try:
                    backend = QuantinuumBackend(device_name=name, api_key=self.api_key)
                    status = 'online'
                except:
                    status = 'unknown'
                
                backends.append({
                    'id': name,
                    'name': name,
                    'provider': 'quantinuum',
                    'computation_model': 'gate',
                    'status': status,
                    'qubits': info['qubits'],
                    'type': info['type'],
                    'generation': info['generation'],
                    'topology': 'full',
                    'native_gates': ['Rz', 'PhasedX', 'ZZMax']
                })
            
            return backends
            
        except ImportError:
            return self._get_mock_backends()
        except Exception as e:
            print(f"Error fetching Quantinuum backends: {e}")
            return self._get_mock_backends()
    
    def _get_mock_backends(self) -> List[Dict[str, Any]]:
        """Return mock backends when pytket not configured"""
        backends = []
        for name, info in self.H_SERIES_DEVICES.items():
            backends.append({
                'id': name,
                'name': name,
                'provider': 'quantinuum',
                'computation_model': 'gate',
                'status': 'unknown',
                'qubits': info['qubits'],
                'type': info['type'],
                'generation': info['generation'],
                'topology': 'full'
            })
        return backends
    
    def get_provider_info(self) -> Dict[str, Any]:
        """Get Quantinuum provider metadata"""
        return {
            'name': self.PROVIDER_NAME,
            'display_name': 'Quantinuum',
            'model': self.capabilities.model.value,
            'native_gates': self.capabilities.native_gates,
            'topology': self.capabilities.topology,
            'cost_model': self.capabilities.cost_model,
            'access_model': self.capabilities.access_model,
            'features': {
                'mid_circuit_measurement': True,
                'all_to_all_connectivity': True,
                'high_fidelity_gates': True
            }
        }
    
    def health_check(self) -> bool:
        """Verify Quantinuum API accessibility"""
        try:
            from pytket.extensions.quantinuum import QuantinuumBackend
            
            backend = QuantinuumBackend(device_name='H1-1E', api_key=self.api_key)
            return backend is not None
        except:
            return False
    
    def list_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        List recent Quantinuum jobs.
        
        Uses qnexus for job history.
        """
        try:
            import qnexus as qnx
            
            # qnexus job listing
            jobs = qnx.jobs.list(limit=limit)
            
            return [{
                'job_id': job.id,
                'provider': 'quantinuum',
                'status': job.status.lower(),
                'backend': job.device,
                'created_at': str(job.created_at),
                'computation_type': 'gate'
            } for job in jobs]
            
        except Exception as e:
            print(f"Error listing Quantinuum jobs: {e}")
            return []
    
    def submit_circuit(self, circuit: Any, backend: str, shots: int,
                       **kwargs) -> Dict[str, Any]:
        """
        Submit a circuit to Quantinuum.
        
        Supports pytket circuits or Qiskit circuits (via conversion).
        
        Args:
            circuit: pytket Circuit (or Qiskit circuit for conversion)
            backend: Device name ('H1-1', 'H1-1E', etc.)
            shots: Number of shots
            **kwargs: Additional options (optimisation_level, etc.)
            
        Returns:
            Job submission result
        """
        try:
            from pytket.extensions.quantinuum import QuantinuumBackend
            import uuid
            
            # Get backend
            qnt_backend = self._get_backend(backend)
            
            # Compile circuit with optimization
            optimisation_level = kwargs.get('optimisation_level', 2)
            compiled = qnt_backend.get_compiled_circuit(circuit, optimisation_level=optimisation_level)
            
            # Submit job
            handle = qnt_backend.process_circuit(compiled, n_shots=shots)
            
            # For emulators, results may be synchronous
            if 'E' in backend or 'SC' in backend:
                result = qnt_backend.get_result(handle)
                counts = result.get_counts()
                
                return {
                    'job_id': str(uuid.uuid4()),
                    'status': 'completed',
                    'provider': 'quantinuum',
                    'backend': backend,
                    'counts': counts,
                    'shots': shots,
                    'completed_at': datetime.now().isoformat()
                }
            
            return {
                'job_id': str(handle),
                'status': 'submitted',
                'provider': 'quantinuum',
                'backend': backend,
                'submitted_at': datetime.now().isoformat(),
                'shots': shots
            }
            
        except ImportError:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'quantinuum',
                'error': 'pytket-quantinuum not installed'
            }
        except Exception as e:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'quantinuum',
                'error': str(e)
            }
    
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get Quantinuum job status"""
        try:
            from pytket.extensions.quantinuum import QuantinuumBackend
            
            backend = self._get_backend()
            status = backend.circuit_status(job_id)
            
            return {
                'job_id': job_id,
                'status': str(status.status).lower(),
                'provider': 'quantinuum'
            }
            
        except Exception as e:
            return {
                'job_id': job_id,
                'status': 'error',
                'provider': 'quantinuum',
                'error': str(e)
            }
    
    def get_job_result(self, job_id: str) -> Dict[str, Any]:
        """Get Quantinuum job result"""
        try:
            from pytket.extensions.quantinuum import QuantinuumBackend
            
            backend = self._get_backend()
            result = backend.get_result(job_id)
            
            return {
                'job_id': job_id,
                'status': 'completed',
                'provider': 'quantinuum',
                'counts': result.get_counts()
            }
            
        except Exception as e:
            return {
                'job_id': job_id,
                'status': 'error',
                'provider': 'quantinuum',
                'error': str(e)
            }
    
    def estimate_cost(self, backend: str, shots: int) -> float:
        """
        Estimate cost for a Quantinuum job.
        
        Quantinuum uses HQC (Hybrid Quantum Credits).
        Cost per shot varies by device and circuit depth.
        """
        # Base per-shot pricing (approximate, varies by circuit)
        pricing = {
            'H1': 0.05,   # $0.05 per shot estimate
            'H2': 0.08,   # Higher for H2
        }
        
        generation = 'H1'
        for gen in ['H1', 'H2']:
            if gen in backend:
                generation = gen
                break
        
        # Emulators are cheaper
        if 'E' in backend:
            return pricing.get(generation, 0.05) * 0.1 * shots
        elif 'SC' in backend:
            return 0.0  # Syntax checker is free
        else:
            return pricing.get(generation, 0.05) * shots
