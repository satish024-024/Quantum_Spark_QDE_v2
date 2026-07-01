"""
Xanadu Photonic Provider Adapter
Multi-Provider Quantum Integration v2.1

Uses Strawberry Fields and PennyLane for photonic quantum computing.

API Reference: https://strawberryfields.ai/
SDK: strawberryfields, pennylane-sf

⚠️ NOTE: This is a PHOTONIC provider - uses continuous variables, NOT qubits!
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

try:
    from .quantum_provider_base import (
        PhotonicProvider, 
        ProviderCapabilities, 
        ComputationModel
    )
except ImportError:
    from quantum_provider_base import (
        PhotonicProvider, 
        ProviderCapabilities, 
        ComputationModel
    )


class XanaduProvider(PhotonicProvider):
    """
    Xanadu photonic quantum provider.
    
    ⚠️ PHOTONIC COMPUTING: Uses MODES, not qubits!
    Not compatible with gate-based circuits.
    
    Uses Strawberry Fields for:
    - Gaussian boson sampling (GBS)
    - Continuous-variable quantum computing
    
    Available devices:
    - X8: 8-mode photonic chip (GBS)
    - Borealis: 216+ modes (GBS, cloud)
    - Aurora: Universal photonic QC (2025+)
    """
    
    PROVIDER_NAME = "xanadu"
    
    # Known Xanadu devices
    XANADU_DEVICES = {
        'X8': {'modes': 8, 'type': 'qpu', 'operations': ['GBS']},
        'X8_01': {'modes': 8, 'type': 'qpu', 'operations': ['GBS']},
        'borealis': {'modes': 216, 'type': 'qpu', 'operations': ['GBS']},
        'aurora': {'modes': 100, 'type': 'qpu', 'operations': ['universal']},
        'simulon': {'modes': 12, 'type': 'simulator', 'operations': ['universal']},
    }
    
    def __init__(self, api_key: str = None):
        """
        Initialize Xanadu provider.
        
        Args:
            api_key: Xanadu Cloud API key
        """
        super().__init__()
        
        self.api_key = api_key
        self._connection = None
        
        # Configure capabilities (photonic-specific)
        self.capabilities.model = ComputationModel.PHOTONIC
        self.capabilities.max_qubits = 0  # Photonic uses MODES
        self.capabilities.cost_model = "per_shot"
        self.capabilities.access_model = "public"
    
    def _configure_api_key(self):
        """Configure Strawberry Fields API key"""
        if self.api_key:
            try:
                import strawberryfields as sf
                sf.store_account(self.api_key)
            except:
                pass
    
    def get_backends(self) -> List[Dict[str, Any]]:
        """
        Get available Xanadu photonic devices.
        
        Returns:
            List of backends with normalized fields (uses 'modes' not 'qubits')
        """
        try:
            import strawberryfields as sf
            
            self._configure_api_key()
            
            # Try to connect to Xanadu Cloud
            connection = sf.RemoteEngine("X8")
            device_spec = connection.device_spec
            
            backends = [{
                'id': 'X8',
                'name': 'X8',
                'provider': 'xanadu',
                'computation_model': 'photonic',
                'status': 'online',
                'modes': device_spec.get('modes', 8),
                'type': 'qpu',
                'variable_type': 'continuous',
                'operations': ['GBS', 'Sgate', 'BSgate', 'Rgate']
            }]
            
            # Add known devices
            for name, info in self.XANADU_DEVICES.items():
                if name != 'X8':  # Already added
                    backends.append({
                        'id': name,
                        'name': name,
                        'provider': 'xanadu',
                        'computation_model': 'photonic',
                        'status': 'unknown',
                        'modes': info['modes'],
                        'type': info['type'],
                        'variable_type': 'continuous',
                        'operations': info['operations']
                    })
            
            return backends
            
        except ImportError:
            return self._get_mock_backends()
        except Exception as e:
            print(f"Error fetching Xanadu devices: {e}")
            return self._get_mock_backends()
    
    def _get_mock_backends(self) -> List[Dict[str, Any]]:
        """Return mock backends when Strawberry Fields not configured"""
        backends = []
        for name, info in self.XANADU_DEVICES.items():
            backends.append({
                'id': name,
                'name': name,
                'provider': 'xanadu',
                'computation_model': 'photonic',
                'status': 'online' if info['type'] == 'simulator' else 'unknown',
                'modes': info['modes'],
                'type': info['type'],
                'variable_type': 'continuous',
                'operations': info['operations']
            })
        return backends
    
    def get_provider_info(self) -> Dict[str, Any]:
        """Get Xanadu provider metadata"""
        return {
            'name': self.PROVIDER_NAME,
            'display_name': 'Xanadu',
            'model': self.capabilities.model.value,
            'cost_model': self.capabilities.cost_model,
            'access_model': self.capabilities.access_model,
            'variable_type': 'continuous',
            'uses_modes_not_qubits': True,
            'features': {
                'gaussian_boson_sampling': True,
                'continuous_variable': True,
                'gkp_qubits': True  # For Aurora
            }
        }
    
    def health_check(self) -> bool:
        """Verify Xanadu Cloud accessibility"""
        try:
            import strawberryfields as sf
            
            self._configure_api_key()
            engine = sf.RemoteEngine("X8")
            return engine is not None
        except:
            return False
    
    def list_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        List recent Xanadu jobs.
        
        Strawberry Fields tracks jobs internally.
        """
        try:
            import strawberryfields as sf
            
            self._configure_api_key()
            
            # SF doesn't have a direct job listing API
            # Would need to track locally
            return []
            
        except:
            return []
    
    def get_modes(self, backend: str) -> int:
        """Get number of photonic modes for a device"""
        device_info = self.XANADU_DEVICES.get(backend, {})
        return device_info.get('modes', 0)
    
    def submit_photonic_program(self, program: Any, backend: str, shots: int,
                                 **kwargs) -> Dict[str, Any]:
        """
        Submit a photonic program to Xanadu.
        
        Uses Strawberry Fields RemoteEngine.run().
        
        Args:
            program: Strawberry Fields Program or PennyLane circuit
            backend: Device name ('X8', 'borealis', etc.)
            shots: Number of samples
            **kwargs: Additional options
            
        Returns:
            Job submission result with samples
        """
        try:
            import strawberryfields as sf
            import uuid
            
            self._configure_api_key()
            
            # Check if using simulator
            if backend.lower() == 'simulon' or kwargs.get('use_simulator', False):
                # Run on local simulator
                engine = sf.Engine('gaussian')
                result = engine.run(program, shots=shots)
                
                job_id = str(uuid.uuid4())
                
                return {
                    'job_id': job_id,
                    'status': 'completed',
                    'provider': 'xanadu',
                    'backend': backend,
                    'model': 'photonic',
                    'samples': result.samples.tolist() if hasattr(result.samples, 'tolist') else [],
                    'completed_at': datetime.now().isoformat()
                }
            
            # Run on remote hardware
            engine = sf.RemoteEngine(backend)
            result = engine.run(program, shots=shots)
            
            job_id = str(uuid.uuid4())
            
            return {
                'job_id': job_id,
                'status': 'completed',
                'provider': 'xanadu',
                'backend': backend,
                'model': 'photonic',
                'variable_type': 'continuous',
                'samples': result.samples.tolist() if hasattr(result.samples, 'tolist') else [],
                'completed_at': datetime.now().isoformat()
            }
            
        except ImportError:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'xanadu',
                'error': 'strawberryfields not installed'
            }
        except Exception as e:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'xanadu',
                'error': str(e)
            }
    
    def estimate_cost(self, backend: str, shots: int) -> float:
        """
        Estimate cost for a Xanadu job.
        
        Xanadu Cloud pricing varies by device.
        """
        # Xanadu pricing (approximate)
        pricing = {
            'x8': 0.001,        # Per shot
            'borealis': 0.002,  # Per shot
            'aurora': 0.005,    # Per shot (estimate)
            'simulon': 0.0      # Free simulator
        }
        
        backend_lower = backend.lower()
        rate = pricing.get(backend_lower, 0.001)
        return rate * shots
