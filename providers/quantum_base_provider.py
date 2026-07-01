"""
Quantum Base Provider Interface

Abstract base class for quantum execution providers.
Enforces v1 contract compliance for JobNormalizer.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any

class QuantumProvider(ABC):
    """
    Abstract base class for quantum execution providers.
    All quantum providers must implement this interface.
    """
    
    @abstractmethod
    def get_available_backends(self) -> List[Dict[str, Any]]:
        """
        Get list of available backends from this provider.
        
        Returns:
            List of backend dictionaries:
            [
                {
                    "id": "ibm_brisbane",
                    "name": "IBM Brisbane",
                    "qubits": 127,
                    "type": "qpu",  # or "simulator"
                    "status": "online",  # or "offline", "maintenance"
                    "queue_depth": 42  # Optional
                }
            ]
        """
        pass
    
    @abstractmethod
    def submit_job(self, circuit_ir: Dict, backend_id: str, shots: int) -> Dict:
        """
        Submit a quantum job.
        
        Args:
            circuit_ir: Canonical circuit IR from CircuitCompiler
            backend_id: Backend identifier
            shots: Number of shots
            
        Returns:
            Job object conforming to JobNormalizer v1 contract:
            {
                "job_id": str,
                "provider": str,
                "hardware_provider": str,
                "execution_type": "qpu" | "simulator" | "hybrid",
                "quantum_model": "gate" | "annealing" | "photonic",
                "lifecycle_state": "queued" | "running" | "completed" | "failed" | "cancelled",
                "is_terminal": bool,
                "result_status": str (optional),
                "submitted_at": str (optional),
                "backend_id": str (optional)
            }
            
        Raises:
            ValueError: Invalid circuit or backend
            RuntimeError: Submission failed
        """
        pass
    
    @abstractmethod
    def get_job_status(self, job_id: str) -> Dict:
        """
        Poll job status.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Job object (v1 contract) with updated lifecycle_state
        """
        pass
    
    @abstractmethod
    def get_job_result(self, job_id: str) -> Dict:
        """
        Retrieve job results.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Results dictionary:
            {
                "counts": {"00": 512, "11": 512},
                "shots": 1024,
                "backend": str,
                "execution_time": float (optional)
            }
            
        Raises:
            ValueError: Job not found or not complete
        """
        pass
