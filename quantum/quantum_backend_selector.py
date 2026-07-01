"""
Topology-Aware Backend Selector
===============================
Intelligent backend selection considering circuit requirements.

WHAT THIS CONSIDERS:
1. Coupling graph compatibility (CRITICAL for QAOA)
2. Two-qubit gate error rates (main noise source)
3. SWAP overhead after transpilation
4. Queue depth (estimated wait time)
5. Calibration recency

WHAT THIS RETURNS:
- HEURISTIC score, NOT actual fidelity
- Backend ranking with justifications
- Transpilation analysis

HONEST LIMITATIONS:
- Error rates are not independent (ignores crosstalk)
- Queue time is estimated, not exact
- Readout error not fully considered
- Decoherence time (T1/T2) simplified

This is a HEURISTIC, not a fidelity predictor.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import warnings

# Qiskit imports
try:
    from qiskit import QuantumCircuit, transpile
    from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
    
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService
        RUNTIME_AVAILABLE = True
    except ImportError:
        RUNTIME_AVAILABLE = False
    
    QISKIT_AVAILABLE = True
except ImportError as e:
    print(f"[Warning] Qiskit import error: {e}")
    QISKIT_AVAILABLE = False
    RUNTIME_AVAILABLE = False


@dataclass
class BackendScore:
    """Scoring result for a single backend"""
    backend_name: str
    heuristic_score: float  # NOT fidelity - just a ranking score
    ranking: int
    
    # Breakdown (all are HEURISTIC estimates)
    estimated_circuit_fidelity: float  # (1 - error)^gates - very approximate
    topology_compatibility: float
    queue_score: float
    calibration_freshness: float
    
    # Details
    transpiled_depth: int
    transpiled_cx_count: int
    avg_two_qubit_error: float
    estimated_queue_minutes: float
    calibration_age_hours: float
    
    # Warnings
    warnings: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            'backend': self.backend_name,
            'heuristic_score': round(self.heuristic_score, 4),
            'ranking': self.ranking,
            'breakdown': {
                'estimated_circuit_fidelity': round(self.estimated_circuit_fidelity, 4),
                'topology_compatibility': round(self.topology_compatibility, 4),
                'queue_score': round(self.queue_score, 4),
                'calibration_freshness': round(self.calibration_freshness, 4)
            },
            'details': {
                'transpiled_depth': self.transpiled_depth,
                'transpiled_cx_count': self.transpiled_cx_count,
                'avg_two_qubit_error': round(self.avg_two_qubit_error, 6),
                'estimated_queue_minutes': round(self.estimated_queue_minutes, 1),
                'calibration_age_hours': round(self.calibration_age_hours, 1)
            },
            'warnings': self.warnings
        }


class TopologyAwareBackendSelector:
    """
    Backend selector with topology and error rate awareness.
    
    IMPORTANT: This returns HEURISTIC scores, not fidelity estimates.
    
    The score combines:
    - Circuit compatibility with backend topology
    - Gate error rates from calibration data
    - Queue depth (availability)
    - Calibration recency
    
    Real execution quality depends on many factors not captured here:
    - Crosstalk between qubits
    - Time-varying noise
    - Job scheduling effects
    - Compilation randomness
    """
    
    def __init__(
        self,
        service: 'QiskitRuntimeService' = None,
        weights: Dict[str, float] = None
    ):
        """
        Initialize backend selector.
        
        Args:
            service: Qiskit Runtime service (optional)
            weights: Custom weights for scoring components
        """
        self.service = service
        
        # Default weights (sum to 1.0)
        self.weights = weights or {
            'fidelity': 0.35,      # Estimated circuit success rate
            'topology': 0.25,      # How well circuit maps to backend
            'queue': 0.20,         # Availability
            'calibration': 0.20    # Freshness of calibration
        }
        
        # Cache backends to avoid repeated API calls
        self._backend_cache = {}
        self._cache_time = None
        self._cache_ttl = timedelta(minutes=5)
    
    def recommend_backends(
        self,
        circuit: QuantumCircuit,
        n_recommendations: int = 3,
        min_qubits: int = None,
        exclude_simulators: bool = True
    ) -> List[BackendScore]:
        """
        Get ranked backend recommendations for a circuit.
        
        Args:
            circuit: Circuit to run
            n_recommendations: Number of backends to return
            min_qubits: Minimum qubit count (default: circuit.num_qubits)
            exclude_simulators: Whether to exclude simulator backends
            
        Returns:
            List of BackendScore objects, sorted by heuristic score
        """
        if not QISKIT_AVAILABLE:
            return self._simulated_recommendations(n_recommendations)
        
        if min_qubits is None:
            min_qubits = circuit.num_qubits
        
        # Get available backends
        backends = self._get_available_backends(exclude_simulators)
        
        if not backends:
            print("[Warning] No backends available")
            return self._simulated_recommendations(n_recommendations)
        
        # Score each backend
        scores = []
        for backend in backends:
            if backend.num_qubits < min_qubits:
                continue
            
            try:
                score = self.score_backend(backend, circuit)
                scores.append(score)
            except Exception as e:
                warnings.warn(f"Could not score backend {backend.name}: {e}")
        
        # Sort by score (descending)
        scores.sort(key=lambda x: x.heuristic_score, reverse=True)
        
        # Assign rankings
        for i, score in enumerate(scores):
            score.ranking = i + 1
        
        return scores[:n_recommendations]
    
    def score_backend(
        self,
        backend,
        circuit: QuantumCircuit
    ) -> BackendScore:
        """
        Calculate heuristic score for a specific backend.
        
        Args:
            backend: Qiskit backend object
            circuit: Circuit to run
            
        Returns:
            BackendScore with breakdown
        """
        warnings_list = []
        
        # 1. Transpile to get actual gate counts
        try:
            pm = generate_preset_pass_manager(
                optimization_level=3, 
                backend=backend
            )
            transpiled = pm.run(circuit)
            transpiled_depth = transpiled.depth()
            
            # Count two-qubit gates (main error source)
            ops = transpiled.count_ops()
            cx_count = ops.get('cx', 0) + ops.get('ecr', 0) + ops.get('cz', 0)
        except Exception as e:
            warnings_list.append(f"Transpilation failed: {e}")
            transpiled_depth = circuit.depth() * 2
            cx_count = circuit.num_qubits * 2
        
        # 2. Get average two-qubit error rate
        avg_2q_error = self._get_avg_two_qubit_error(backend)
        
        # 3. Estimate circuit "fidelity" (very approximate!)
        # This is (1 - error)^gates which is an upper bound
        estimated_fidelity = (1 - avg_2q_error) ** cx_count if cx_count > 0 else 1.0
        
        if estimated_fidelity < 0.1:
            warnings_list.append("Very low estimated fidelity - results may be noisy")
        
        # 4. Topology compatibility score
        topology_score = self._calculate_topology_compatibility(circuit, backend)
        
        # 5. Queue score (inverse of wait time)
        queue_depth = self._estimate_queue_depth(backend)
        queue_score = 1.0 / (1 + queue_depth * 0.1)
        estimated_queue_minutes = queue_depth * 5  # Rough estimate
        
        # 6. Calibration freshness
        cal_age_hours = self._get_calibration_age_hours(backend)
        cal_freshness = np.exp(-cal_age_hours / 24)  # Half-life of 24 hours
        
        if cal_age_hours > 24:
            warnings_list.append(f"Calibration is {cal_age_hours:.0f}h old")
        
        # Calculate final heuristic score
        heuristic_score = (
            self.weights['fidelity'] * estimated_fidelity +
            self.weights['topology'] * topology_score +
            self.weights['queue'] * queue_score +
            self.weights['calibration'] * cal_freshness
        )
        
        return BackendScore(
            backend_name=backend.name,
            heuristic_score=heuristic_score,
            ranking=0,  # Will be set after sorting
            estimated_circuit_fidelity=estimated_fidelity,
            topology_compatibility=topology_score,
            queue_score=queue_score,
            calibration_freshness=cal_freshness,
            transpiled_depth=transpiled_depth,
            transpiled_cx_count=cx_count,
            avg_two_qubit_error=avg_2q_error,
            estimated_queue_minutes=estimated_queue_minutes,
            calibration_age_hours=cal_age_hours,
            warnings=warnings_list
        )
    
    def _get_available_backends(self, exclude_simulators: bool) -> list:
        """Get list of available backends"""
        if self.service is None:
            return []
        
        # Check cache
        if (self._cache_time is not None and 
            datetime.now() - self._cache_time < self._cache_ttl):
            return list(self._backend_cache.values())
        
        try:
            backends = self.service.backends()
            
            if exclude_simulators:
                backends = [b for b in backends 
                           if not b.name.startswith('ibm_') or 
                           'simulator' not in b.name.lower()]
            
            # Update cache
            self._backend_cache = {b.name: b for b in backends}
            self._cache_time = datetime.now()
            
            return backends
        except Exception as e:
            warnings.warn(f"Could not get backends: {e}")
            return list(self._backend_cache.values())
    
    def _get_avg_two_qubit_error(self, backend) -> float:
        """Get average two-qubit gate error rate from calibration"""
        try:
            target = backend.target
            
            errors = []
            for op_name in ['cx', 'ecr', 'cz']:
                if op_name in target.operation_names:
                    for qargs in target.qargs_for_operation_name(op_name):
                        error = target[op_name][qargs].error
                        if error is not None:
                            errors.append(error)
            
            if errors:
                return float(np.mean(errors))
            
        except Exception as e:
            warnings.warn(f"Could not get error rates: {e}")
        
        return 0.01  # Default assumption
    
    def _calculate_topology_compatibility(
        self,
        circuit: QuantumCircuit,
        backend
    ) -> float:
        """
        Score how well circuit's qubit interactions match backend topology.
        
        Higher score = fewer SWAP gates needed.
        
        This is a HEURISTIC - actual SWAP count depends on compiler.
        """
        try:
            target = backend.target
            coupling_map = target.build_coupling_map()
            backend_edges = set(coupling_map.get_edges())
        except:
            return 0.5  # Cannot determine, assume neutral
        
        # Get circuit's two-qubit interactions
        circuit_edges = set()
        for instruction in circuit.data:
            if len(instruction.qubits) == 2:
                try:
                    q0 = circuit.find_bit(instruction.qubits[0]).index
                    q1 = circuit.find_bit(instruction.qubits[1]).index
                    circuit_edges.add((min(q0, q1), max(q0, q1)))
                except:
                    pass
        
        if not circuit_edges:
            return 1.0  # No two-qubit gates = perfect compatibility
        
        # What fraction of circuit edges exist directly in backend?
        # (considering both directions)
        direct_matches = 0
        for u, v in circuit_edges:
            if (u, v) in backend_edges or (v, u) in backend_edges:
                direct_matches += 1
        
        return direct_matches / len(circuit_edges)
    
    def _estimate_queue_depth(self, backend) -> int:
        """Estimate number of jobs in queue"""
        try:
            status = backend.status()
            return status.pending_jobs
        except:
            return 5  # Assume moderate queue
    
    def _get_calibration_age_hours(self, backend) -> float:
        """Get hours since last calibration"""
        try:
            # Try to get from properties
            if hasattr(backend, 'properties'):
                props = backend.properties()
                if props and hasattr(props, 'last_update_date'):
                    last_update = props.last_update_date
                    age = datetime.now(last_update.tzinfo) - last_update
                    return age.total_seconds() / 3600
        except:
            pass
        
        return 12.0  # Assume 12 hours if unknown
    
    def _simulated_recommendations(self, n: int) -> List[BackendScore]:
        """Generate simulated recommendations when no backends available"""
        simulated_backends = [
            ('ibm_brisbane', 127, 0.008),
            ('ibm_kyoto', 127, 0.010),
            ('ibm_osaka', 127, 0.012),
            ('ibm_nazca', 127, 0.015),
            ('ibm_cusco', 127, 0.018),
        ]
        
        results = []
        for i, (name, qubits, error) in enumerate(simulated_backends[:n]):
            fidelity = (1 - error) ** 50  # Assume 50 CX gates
            
            results.append(BackendScore(
                backend_name=name,
                heuristic_score=0.8 - i * 0.1,
                ranking=i + 1,
                estimated_circuit_fidelity=fidelity,
                topology_compatibility=0.7,
                queue_score=0.8 - i * 0.1,
                calibration_freshness=0.9,
                transpiled_depth=100 + i * 10,
                transpiled_cx_count=50 + i * 5,
                avg_two_qubit_error=error,
                estimated_queue_minutes=10 + i * 5,
                calibration_age_hours=6 + i * 2,
                warnings=['Simulated data - no actual backend available']
            ))
        
        return results


# Convenience function for API
def recommend_backend(
    circuit: QuantumCircuit = None,
    n_qubits: int = 4,
    service = None,
    n_recommendations: int = 3
) -> List[Dict]:
    """
    Get backend recommendations.
    
    Args:
        circuit: Optional circuit to optimize for
        n_qubits: Number of qubits if no circuit provided
        service: Qiskit Runtime service
        n_recommendations: Number of recommendations
        
    Returns:
        List of recommendation dictionaries
    """
    selector = TopologyAwareBackendSelector(service=service)
    
    if circuit is None and QISKIT_AVAILABLE:
        # Create dummy circuit for baseline scoring
        circuit = QuantumCircuit(n_qubits)
        for i in range(n_qubits - 1):
            circuit.h(i)
            circuit.cx(i, i + 1)
    
    recommendations = selector.recommend_backends(
        circuit=circuit,
        n_recommendations=n_recommendations
    )
    
    return [r.to_dict() for r in recommendations]


if __name__ == "__main__":
    print("Testing TopologyAwareBackendSelector...")
    
    # Test with simulated data
    recommendations = recommend_backend(n_qubits=5, n_recommendations=3)
    
    print("\nBackend Recommendations (simulated):")
    for rec in recommendations:
        print(f"\n#{rec['ranking']}: {rec['backend']}")
        print(f"  Heuristic Score: {rec['heuristic_score']:.4f}")
        print(f"  Breakdown: {rec['breakdown']}")
        print(f"  Details: {rec['details']}")
        if rec['warnings']:
            print(f"  [Warning] Warnings: {rec['warnings']}")
