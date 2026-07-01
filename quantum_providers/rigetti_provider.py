"""
Rigetti Quantum Provider Adapter
Multi-Provider Quantum Integration v2.1

Uses pyQuil for Rigetti Quantum Cloud Services (QCS).

API Reference: https://pyquil-docs.rigetti.com/
SDK: pyquil >= 4.17.0
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


class RigettiProvider(GateBasedProvider):
    """
    Rigetti quantum provider using pyQuil and QCS.
    
    Uses get_qc() to connect to quantum computers:
    - QVM (Quantum Virtual Machine) simulators
    - Physical QPUs (Ankaa, Cepheus, etc.)
    
    Requires QCS account and reservation for QPU access.
    """
    
    PROVIDER_NAME = "rigetti"
    
    # Available quantum computer names
    KNOWN_QCS = {
        # Simulators (always available)
        '9q-square-qvm': {'qubits': 9, 'type': 'simulator'},
        '16q-qvm': {'qubits': 16, 'type': 'simulator'},
        '25q-qvm': {'qubits': 25, 'type': 'simulator'},
        
        # QPUs (require reservation)
        'Ankaa-2': {'qubits': 84, 'type': 'qpu'},
        'Ankaa-9Q-1': {'qubits': 9, 'type': 'qpu'},
        'Cepheus-1-36Q': {'qubits': 36, 'type': 'qpu'},
    }
    
    def __init__(self, qcs_client: Any = None):
        """
        Initialize Rigetti provider.
        
        Args:
            qcs_client: Optional QCSClient for custom configuration
        """
        super().__init__()
        
        self._qcs_client = qcs_client
        self._qc_cache = {}
        
        # Configure capabilities
        self.capabilities.model = ComputationModel.GATE_BASED
        self.capabilities.native_gates = ['CZ', 'RX', 'RZ', 'XY']
        self.capabilities.topology = "limited"  # Nearest-neighbor
        self.capabilities.cost_model = "per_shot"
        self.capabilities.access_model = "reservation"
        self.capabilities.max_shots = 10000
    
    def _get_qc(self, name: str, as_qvm: bool = False):
        """
        Get quantum computer connection using get_qc().
        
        Args:
            name: QC name (e.g., 'Ankaa-2', '9q-square-qvm')
            as_qvm: Force QVM simulation mode
        """
        cache_key = f"{name}_{as_qvm}"
        
        if cache_key not in self._qc_cache:
            try:
                from pyquil import get_qc
                
                if self._qcs_client:
                    qc = get_qc(name, as_qvm=as_qvm, client_configuration=self._qcs_client)
                else:
                    qc = get_qc(name, as_qvm=as_qvm)
                
                self._qc_cache[cache_key] = qc
            except ImportError:
                raise ImportError("pyquil not installed. Run: pip install pyquil")
            except Exception as e:
                raise ConnectionError(f"Failed to connect to Rigetti QCS: {e}")
        
        return self._qc_cache[cache_key]
    
    def get_backends(self) -> List[Dict[str, Any]]:
        """
        Get available Rigetti quantum computers.
        
        Returns:
            List of backends with normalized fields
        """
        try:
            from pyquil.api import get_qc, list_quantum_computers
            
            backends = []
            
            # Try to list available quantum computers
            try:
                available_qcs = list_quantum_computers()
                for name in available_qcs:
                    info = self.KNOWN_QCS.get(name, {'qubits': 0, 'type': 'unknown'})
                    backends.append({
                        'id': name,
                        'name': name,
                        'provider': 'rigetti',
                        'computation_model': 'gate',
                        'status': 'online',
                        'qubits': info['qubits'],
                        'type': info['type'],
                        'native_gates': ['CZ', 'RX', 'RZ', 'XY']
                    })
            except:
                # Fall back to known QCs
                for name, info in self.KNOWN_QCS.items():
                    backends.append({
                        'id': name,
                        'name': name,
                        'provider': 'rigetti',
                        'computation_model': 'gate',
                        'status': 'online' if info['type'] == 'simulator' else 'unknown',
                        'qubits': info['qubits'],
                        'type': info['type'],
                        'native_gates': ['CZ', 'RX', 'RZ', 'XY']
                    })
            
            return backends
            
        except ImportError:
            return self._get_mock_backends()
        except Exception as e:
            print(f"Error fetching Rigetti backends: {e}")
            return self._get_mock_backends()
    
    def _get_mock_backends(self) -> List[Dict[str, Any]]:
        """Return mock backends when pyquil not configured"""
        backends = []
        for name, info in self.KNOWN_QCS.items():
            backends.append({
                'id': name,
                'name': name,
                'provider': 'rigetti',
                'computation_model': 'gate',
                'status': 'online' if info['type'] == 'simulator' else 'unknown',
                'qubits': info['qubits'],
                'type': info['type']
            })
        return backends
    
    def get_provider_info(self) -> Dict[str, Any]:
        """Get Rigetti provider metadata"""
        return {
            'name': self.PROVIDER_NAME,
            'display_name': 'Rigetti',
            'model': self.capabilities.model.value,
            'native_gates': self.capabilities.native_gates,
            'topology': self.capabilities.topology,
            'cost_model': self.capabilities.cost_model,
            'access_model': self.capabilities.access_model,
            'features': {
                'parametric_compilation': True,
                'active_reset': True,
                'quilc_optimization': True
            }
        }
    
    def health_check(self) -> bool:
        """Verify Rigetti QCS accessibility"""
        try:
            from pyquil import get_qc
            
            # Try to connect to a simulator
            qc = get_qc('9q-square-qvm')
            return qc is not None
        except:
            return False
    
    def list_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        List recent Rigetti jobs.
        
        Note: Rigetti doesn't have a direct job history API.
        Jobs would need to be tracked locally.
        """
        return []
    
    def submit_circuit(self, circuit: Any, backend: str, shots: int,
                       **kwargs) -> Dict[str, Any]:
        """
        Submit a Quil program to Rigetti.
        
        Uses QuantumComputer.run() from pyquil.
        
        Args:
            circuit: Quil program (pyquil.Program)
            backend: QC name (e.g., 'Ankaa-2', '9q-square-qvm')
            shots: Number of shots
            **kwargs: Additional options (as_qvm, active_reset, etc.)
            
        Returns:
            Job submission result with executable
        """
        try:
            import uuid
            from pyquil import get_qc
            
            as_qvm = kwargs.get('as_qvm', False)
            qc = self._get_qc(backend, as_qvm=as_qvm)
            
            # Compile the program
            executable = qc.compile(circuit)
            
            # Run the program
            result = qc.run(executable)
            
            # Get measurement results
            readout_data = result.readout_data
            
            # Convert to counts format
            counts = {}
            if readout_data:
                for key, measurements in readout_data.items():
                    for measurement in measurements:
                        bitstring = ''.join(str(bit) for bit in measurement)
                        counts[bitstring] = counts.get(bitstring, 0) + 1
            
            job_id = str(uuid.uuid4())
            
            return {
                'job_id': job_id,
                'status': 'completed',
                'provider': 'rigetti',
                'backend': backend,
                'counts': counts,
                'shots': shots,
                'completed_at': datetime.now().isoformat()
            }
            
        except ImportError:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'rigetti',
                'error': 'pyquil not installed'
            }
        except Exception as e:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'rigetti',
                'error': str(e)
            }
    
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get job status.
        
        Note: Rigetti jobs execute synchronously, so status is always completed or failed.
        """
        return {
            'job_id': job_id,
            'status': 'completed',
            'provider': 'rigetti'
        }
    
    def get_job_result(self, job_id: str) -> Dict[str, Any]:
        """
        Get job result.
        
        Note: Results are returned immediately from submit_circuit().
        """
        return {
            'job_id': job_id,
            'status': 'completed',
            'provider': 'rigetti',
            'error': 'Results returned synchronously at submission'
        }
    
    def estimate_cost(self, backend: str, shots: int) -> float:
        """
        Estimate cost for a Rigetti job.
        
        Rigetti QCS pricing (approximate, 2025):
        - QVM: Free
        - QPU: Varies by reservation
        """
        if 'qvm' in backend.lower():
            return 0.0
        else:
            # Approximate per-shot cost for QPU
            return 0.0005 * shots
