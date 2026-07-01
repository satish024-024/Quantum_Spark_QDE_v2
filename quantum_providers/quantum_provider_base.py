"""
Quantum Provider Base Classes - SINGLE SOURCE OF TRUTH
Multi-Provider Quantum Integration v2.1

Capability-aware base classes that properly separate:
- Gate-based quantum computing (IBM, IonQ, Rigetti, Google, AWS, Azure)
- Quantum annealing (D-Wave)
- Photonic quantum computing (Xanadu)

This is the ONLY place where provider interfaces are defined.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass, field
import uuid
import time


class ComputationModel(Enum):
    """Quantum computation paradigm - fundamentally different approaches"""
    GATE_BASED = "gate"      # Circuit-based quantum computing
    ANNEALING = "annealing"  # QUBO/Ising optimization
    PHOTONIC = "photonic"    # Continuous-variable photonic


@dataclass
class ProviderCapabilities:
    """
    Complete capability schema for provider negotiation.
    Each provider MUST declare its capabilities honestly.
    """
    # Computation model (required)
    model: ComputationModel = None
    
    # Capacity limits
    max_qubits: int = 0
    max_shots: int = 100000
    max_circuit_depth: int = 1000
    
    # Gate support (gate-based only)
    native_gates: List[str] = field(default_factory=list)
    supports_mid_circuit_measurement: bool = False
    supports_parametric_circuits: bool = False
    supports_error_mitigation: bool = False
    
    # Topology
    topology: str = ""  # "full", "limited", "chimera", "pegasus"
    
    # Access and cost
    cost_model: str = ""      # "per_shot", "per_task", "per_second", "free"
    access_model: str = ""     # "public", "restricted", "broker"
    queue_model: str = "fifo"  # "fifo", "priority", "reserved"
    
    # Compiler
    compiler_path: str = ""  # "native", "external", "transpiler"


@dataclass
class ProviderResult:
    """Standardized result for all provider operations"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    error_code: Optional[str] = None  # 'timeout', 'rate_limit', 'auth', 'network'
    retryable: bool = False
    provider: Optional[str] = None


class QuantumProviderBase(ABC):
    """
    Abstract base class for ALL quantum providers.
    SINGLE SOURCE OF TRUTH for the provider interface.
    """
    
    # Provider identity - override in subclasses
    PROVIDER_NAME = "base"
    
    def __init__(self):
        self.capabilities = ProviderCapabilities()
        self._health_cache = {}
        self._cache_ttl = 300  # 5 minutes default
    
    @abstractmethod
    def get_backends(self) -> List[Dict[str, Any]]:
        """
        Get available quantum backends/devices.
        Returns list of backends with standardized format:
        {
            'name': str,
            'provider': str,
            'computation_model': str,
            'status': str,
            'qubits': int (or 'modes' for photonic),
            ...provider-specific fields
        }
        """
        pass
    
    @abstractmethod
    def get_provider_info(self) -> Dict[str, Any]:
        """Get provider metadata and capabilities"""
        return {
            'name': self.PROVIDER_NAME,
            'model': self.capabilities.model.value if self.capabilities.model else None,
            'max_qubits': self.capabilities.max_qubits,
            'cost_model': self.capabilities.cost_model,
            'access_model': self.capabilities.access_model
        }
    
    @abstractmethod
    def health_check(self) -> bool:
        """Check if provider is accessible and operational"""
        pass
    
    def cached_health_check(self) -> bool:
        """Cached health check to prevent flapping"""
        now = time.time()
        if now - self._health_cache.get('timestamp', 0) < self._cache_ttl:
            return self._health_cache.get('healthy', False)
        
        healthy = self.health_check()
        self._health_cache = {'healthy': healthy, 'timestamp': now}
        return healthy
    
    @abstractmethod
    def list_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """List recent jobs from this provider"""
        pass
    
    def _generate_job_id(self) -> str:
        """Generate unique job ID"""
        return str(uuid.uuid4())
    
    def _standardize_error(self, error: Exception) -> ProviderResult:
        """Convert exceptions to structured results"""
        import requests
        
        if isinstance(error, requests.exceptions.Timeout):
            return ProviderResult(
                success=False,
                error='Request timeout',
                error_code='timeout',
                retryable=True,
                provider=self.PROVIDER_NAME
            )
        elif isinstance(error, requests.exceptions.ConnectionError):
            return ProviderResult(
                success=False,
                error='Network connection failed',
                error_code='network',
                retryable=True,
                provider=self.PROVIDER_NAME
            )
        elif hasattr(error, 'response') and error.response is not None:
            status = error.response.status_code
            if status == 429:
                return ProviderResult(
                    success=False,
                    error='Rate limited',
                    error_code='rate_limit',
                    retryable=True,
                    provider=self.PROVIDER_NAME
                )
            elif status in (401, 403):
                return ProviderResult(
                    success=False,
                    error='Authentication failed',
                    error_code='auth',
                    retryable=False,
                    provider=self.PROVIDER_NAME
                )
        
        return ProviderResult(
            success=False,
            error=str(error),
            error_code='unknown',
            retryable=False,
            provider=self.PROVIDER_NAME
        )


class GateBasedProvider(QuantumProviderBase):
    """
    Gate-based quantum computing provider interface.
    For: IBM, IonQ, Rigetti, Google, AWS Braket (gate devices), Azure
    
    Uses quantum circuits with discrete gates (H, CNOT, RX, etc.)
    """
    
    def __init__(self):
        super().__init__()
        self.capabilities.model = ComputationModel.GATE_BASED
    
    @abstractmethod
    def submit_circuit(self, circuit: Any, backend: str, shots: int, 
                       **kwargs) -> Dict[str, Any]:
        """
        Submit a quantum circuit for execution.
        
        Args:
            circuit: Circuit in provider-specific format (Qiskit, Cirq, etc.)
            backend: Backend name or ARN
            shots: Number of measurement shots
            **kwargs: Provider-specific options (native_gates, error_mitigation, etc.)
        
        Returns:
            {
                'job_id': str,
                'status': str,
                'provider': str,
                'backend': str,
                'submitted_at': str (ISO format)
            }
        """
        pass
    
    @abstractmethod
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get current status of a submitted job.
        
        Returns:
            {
                'job_id': str,
                'status': str,  # 'queued', 'running', 'completed', 'failed', 'cancelled'
                'provider': str,
                'backend': str,
                'queue_position': int (optional),
                'estimated_completion': str (optional)
            }
        """
        pass
    
    @abstractmethod
    def get_job_result(self, job_id: str) -> Dict[str, Any]:
        """
        Get results of a completed job.
        
        Returns:
            {
                'job_id': str,
                'status': 'completed',
                'counts': Dict[str, int],  # Measurement counts
                'execution_time': float,
                'metadata': Dict
            }
        """
        pass
    
    def cancel_job(self, job_id: str) -> Dict[str, Any]:
        """Cancel a queued or running job (optional)"""
        return {'success': False, 'error': 'Not implemented'}
    
    def estimate_cost(self, backend: str, shots: int) -> float:
        """Estimate cost for a job (optional)"""
        return 0.0


class AnnealingProvider(QuantumProviderBase):
    """
    Quantum annealing provider interface.
    For: D-Wave, AWS Braket (D-Wave devices)
    
    Uses QUBO (Quadratic Unconstrained Binary Optimization) or Ising models.
    NOT compatible with gate-based circuits!
    """
    
    def __init__(self):
        super().__init__()
        self.capabilities.model = ComputationModel.ANNEALING
    
    @abstractmethod
    def submit_qubo(self, Q: Dict, backend: str, num_reads: int,
                    **kwargs) -> Dict[str, Any]:
        """
        Submit a QUBO problem for annealing.
        
        Args:
            Q: QUBO matrix as {(i,j): coefficient}
            backend: Annealer backend name
            num_reads: Number of annealing samples
            **kwargs: Annealing parameters (chain_strength, annealing_time, etc.)
        
        Returns:
            {
                'job_id': str,
                'status': str,
                'provider': str,
                'model': 'annealing',
                'result': sample (if completed synchronously)
            }
        """
        pass
    
    @abstractmethod
    def submit_ising(self, h: List, J: Dict, backend: str, num_reads: int,
                     **kwargs) -> Dict[str, Any]:
        """
        Submit an Ising problem for annealing.
        
        Args:
            h: Linear biases
            J: Quadratic couplings
            backend: Annealer backend name
            num_reads: Number of annealing samples
        """
        pass
    
    def get_embedding(self, problem_graph: Any, target_graph: Any) -> Dict:
        """Get minor embedding for problem (optional)"""
        return {}


class PhotonicProvider(QuantumProviderBase):
    """
    Photonic quantum computing provider interface.
    For: Xanadu
    
    Uses continuous-variable quantum computing with photonic modes.
    NOT compatible with discrete gate-based circuits!
    """
    
    def __init__(self):
        super().__init__()
        self.capabilities.model = ComputationModel.PHOTONIC
        self.capabilities.max_qubits = 0  # Photonic uses MODES, not qubits
    
    @abstractmethod
    def submit_photonic_program(self, program: Any, backend: str, shots: int,
                                **kwargs) -> Dict[str, Any]:
        """
        Submit a photonic program for execution.
        
        Args:
            program: PennyLane circuit with CV operations
            backend: Photonic backend name
            shots: Number of samples
        
        Returns:
            {
                'job_id': str,
                'status': str,
                'provider': str,
                'model': 'photonic',
                'variable_type': 'continuous'
            }
        """
        pass
    
    def get_modes(self, backend: str) -> int:
        """Get number of photonic modes available"""
        return 0
