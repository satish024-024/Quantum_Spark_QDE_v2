"""
IonQ Quantum Provider Adapter
Multi-Provider Quantum Integration v2.1

Direct IonQ API integration using REST API v0.3.
Supports backend discovery, job submission, status monitoring, and result retrieval.
"""

import requests
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid

try:
    from .quantum_provider_base import GateBasedProvider, ProviderCapabilities, ComputationModel
except ImportError:
    from quantum_provider_base import GateBasedProvider, ProviderCapabilities, ComputationModel


class IonQProvider(GateBasedProvider):
    """
    IonQ quantum provider using REST API v0.3
    
    Features:
    - Native gate support (gpi, gpi2, ms, zz)
    - All-to-all qubit connectivity
    - Per-shot cost model
    - Aria, Harmony, Forte QPUs + simulators
    """
    
    PROVIDER_NAME = "ionq"
    API_VERSION = "v0.3"
    BASE_URL = "https://api.ionq.co/v0.3"
    
    def __init__(self, api_key: str, timeout: int = 30):
        """
        Initialize IonQ provider.
        
        Args:
            api_key: IonQ API key from https://cloud.ionq.com
            timeout: Request timeout in seconds
        """
        super().__init__()
        
        self.api_key = api_key
        self.timeout = timeout
        
        # Set up HTTP session
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"apiKey {api_key}",
            "Content-Type": "application/json"
        })
        
        # Configure capabilities
        self.capabilities.model = ComputationModel.GATE_BASED
        self.capabilities.native_gates = ['gpi', 'gpi2', 'ms', 'zz']
        self.capabilities.topology = "full"  # All-to-all connectivity
        self.capabilities.cost_model = "per_shot"
        self.capabilities.access_model = "public"
        self.capabilities.max_shots = 10000
        self.capabilities.supports_mid_circuit_measurement = True
        self.capabilities.supports_parametric_circuits = True
    
    def get_backends(self) -> List[Dict[str, Any]]:
        """
        Get available IonQ quantum backends.
        
        Returns:
            List of backends with normalized fields
        """
        try:
            response = self.session.get(
                f"{self.BASE_URL}/backends",
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            backends = []
            
            for b in data.get('backends', data if isinstance(data, list) else []):
                backends.append({
                    'id': b.get('backend', b.get('name', 'unknown')),
                    'name': b.get('backend', b.get('name', 'unknown')),
                    'provider': 'ionq',
                    'computation_model': 'gate',
                    'status': b.get('status', 'unknown'),
                    'qubits': b.get('qubits', 0),
                    'type': 'qpu' if 'qpu' in str(b.get('backend', '')).lower() or b.get('qubits', 0) < 50 else 'simulator',
                    'characterization': b.get('characterization', {}),
                    'degraded': b.get('degraded', False),
                    'average_queue_time': b.get('average_queue_time', 0),
                    'native_gates': ['gpi', 'gpi2', 'ms', 'zz']
                })
            
            return backends
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching IonQ backends: {e}")
            return []
    
    def get_provider_info(self) -> Dict[str, Any]:
        """Get IonQ provider metadata"""
        return {
            'name': self.PROVIDER_NAME,
            'display_name': 'IonQ',
            'api_version': self.API_VERSION,
            'model': self.capabilities.model.value,
            'max_qubits': self.capabilities.max_qubits,
            'cost_model': self.capabilities.cost_model,
            'access_model': self.capabilities.access_model,
            'native_gates': self.capabilities.native_gates,
            'topology': self.capabilities.topology,
            'features': {
                'mid_circuit_measurement': self.capabilities.supports_mid_circuit_measurement,
                'parametric_circuits': self.capabilities.supports_parametric_circuits
            }
        }
    
    def health_check(self) -> bool:
        """Verify IonQ API accessibility"""
        try:
            response = self.session.get(
                f"{self.BASE_URL}/backends",
                timeout=10
            )
            return response.status_code == 200
        except:
            return False
    
    def list_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        List recent IonQ jobs.
        
        Args:
            limit: Maximum number of jobs to return
            
        Returns:
            List of normalized job dicts
        """
        try:
            response = self.session.get(
                f"{self.BASE_URL}/jobs",
                params={"limit": limit},
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            jobs = data.get('jobs', [])
            
            return [{
                'job_id': j.get('id'),
                'provider': 'ionq',
                'status': j.get('status'),
                'backend': j.get('target'),
                'created_at': j.get('submitted_at', j.get('created_at')),
                'name': j.get('name', ''),
                'shots': j.get('shots', 0),
                'computation_type': 'gate'
            } for j in jobs]
            
        except requests.exceptions.RequestException as e:
            print(f"Error listing IonQ jobs: {e}")
            return []
    
    def submit_circuit(self, circuit: Dict[str, Any], backend: str, shots: int,
                       name: str = None, **kwargs) -> Dict[str, Any]:
        """
        Submit a quantum circuit to IonQ.
        
        Args:
            circuit: IonQ circuit format:
                {
                    'qubits': int,
                    'circuit': [
                        {'gate': 'h', 'target': 0},
                        {'gate': 'cnot', 'control': 0, 'target': 1},
                        ...
                    ]
                }
            backend: Backend name ('simulator', 'harmony', 'aria-1', 'forte')
            shots: Number of measurement shots
            name: Optional job name
            **kwargs: Additional options (gateset, error_mitigation, etc.)
            
        Returns:
            Job submission result
        """
        payload = {
            'target': backend,
            'shots': shots,
            'input': circuit
        }
        
        if name:
            payload['name'] = name
        
        # Handle native gates option
        if kwargs.get('use_native_gates'):
            payload['input']['gateset'] = 'native'
        
        # Handle error mitigation
        if kwargs.get('error_mitigation'):
            payload['error_mitigation'] = kwargs['error_mitigation']
        
        try:
            response = self.session.post(
                f"{self.BASE_URL}/jobs",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'job_id': data.get('id'),
                'status': data.get('status', 'submitted'),
                'provider': 'ionq',
                'backend': backend,
                'submitted_at': datetime.now().isoformat(),
                'shots': shots,
                'name': name
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'ionq',
                'error': str(e)
            }
    
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get current status of a job.
        
        Args:
            job_id: IonQ job ID
            
        Returns:
            Job status information
        """
        try:
            response = self.session.get(
                f"{self.BASE_URL}/jobs/{job_id}",
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'job_id': job_id,
                'status': data.get('status'),
                'provider': 'ionq',
                'backend': data.get('target'),
                'queue_position': data.get('queue_position'),
                'execution_time': data.get('execution_time'),
                'created_at': data.get('submitted_at')
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'job_id': job_id,
                'status': 'error',
                'provider': 'ionq',
                'error': str(e)
            }
    
    def get_job_result(self, job_id: str) -> Dict[str, Any]:
        """
        Get results of a completed job.
        
        Args:
            job_id: IonQ job ID
            
        Returns:
            Job results with measurement counts
        """
        try:
            response = self.session.get(
                f"{self.BASE_URL}/jobs/{job_id}",
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            
            # IonQ returns histogram in 'data' field
            histogram = data.get('data', {})
            
            # Convert probabilities to counts if needed
            shots = data.get('shots', 1000)
            if histogram and all(isinstance(v, float) for v in histogram.values()):
                counts = {k: int(v * shots) for k, v in histogram.items()}
            else:
                counts = histogram
            
            return {
                'job_id': job_id,
                'status': data.get('status'),
                'provider': 'ionq',
                'backend': data.get('target'),
                'counts': counts,
                'histogram': histogram,
                'shots': shots,
                'execution_time': data.get('execution_time'),
                'metadata': {
                    'qubits': data.get('qubits'),
                    'circuit_depth': data.get('depth'),
                    'target': data.get('target')
                }
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'job_id': job_id,
                'status': 'error',
                'provider': 'ionq',
                'error': str(e)
            }
    
    def cancel_job(self, job_id: str) -> Dict[str, Any]:
        """
        Cancel a queued or running job.
        
        Args:
            job_id: IonQ job ID
            
        Returns:
            Cancellation result
        """
        try:
            response = self.session.put(
                f"{self.BASE_URL}/jobs/{job_id}/status/cancel",
                timeout=self.timeout
            )
            response.raise_for_status()
            
            return {
                'success': True,
                'job_id': job_id,
                'status': 'cancelled'
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'job_id': job_id,
                'error': str(e)
            }
    
    def estimate_cost(self, backend: str, shots: int) -> float:
        """
        Estimate cost for a job.
        
        Args:
            backend: Target backend
            shots: Number of shots
            
        Returns:
            Estimated cost in USD
        """
        # IonQ pricing (as of 2025 - approximate)
        pricing = {
            'simulator': 0.0,  # Free
            'harmony': 0.0003,  # $0.30 per 1000 shots
            'aria-1': 0.00097,  # $0.97 per 1000 shots
            'forte': 0.0022     # $2.20 per 1000 shots
        }
        
        rate = pricing.get(backend.lower(), 0.001)
        return rate * shots
    
    def close(self):
        """Release HTTP session resources"""
        if self.session:
            self.session.close()
