"""
Circuit Preflight Analyzer - Lint tool for circuits.

NOT a validator or guarantee. A preflight check that catches obvious problems.
Provider compilation may still fail even if preflight passes.
"""

from dataclasses import dataclass
from typing import Dict, List, Set
import logging

logger = logging.getLogger(__name__)


@dataclass
class PreflightResult:
    """
    Result of preflight analysis.
    
    can_proceed: True means "probably okay", NOT "guaranteed to work"
    """
    can_proceed: bool
    errors: List[str]      # Hard blockers - circuit cannot run
    warnings: List[str]    # Things that might fail on some backends
    info: List[str]        # FYI notes - not problems


# Gates that most providers can decompose into native gates
# These are safe to use without specific backend knowledge
COMMON_GATES: Set[str] = {
    "h", "x", "y", "z",           # Pauli + Hadamard
    "s", "sdg", "t", "tdg",       # Phase gates
    "rx", "ry", "rz",             # Rotation gates
    "cx", "cnot", "cz", "cy",     # Two-qubit gates
    "swap", "iswap",              # Swap gates
    "measure", "m",               # Measurement
    "barrier",                    # Barrier (no-op on most)
    "id", "i",                    # Identity
}

# Gates that require specific hardware support
SPECIAL_GATES: Set[str] = {
    "ccx", "toffoli",             # 3-qubit gates
    "cswap", "fredkin",           # 3-qubit swap
    "u", "u1", "u2", "u3",        # IBM-specific unitaries
    "gpi", "gpi2", "ms",          # IonQ native
    "xy", "cphase",               # Rigetti native
    "ecr",                        # IBM native
    "reset",                      # Mid-circuit reset
}


def analyze_circuit(
    provider: str,
    backend_id: str,
    circuit_data: Dict
) -> PreflightResult:
    """
    Preflight analysis - catches obvious problems BEFORE submission.
    
    This is a LINT tool, not validation:
    - Passing preflight does NOT guarantee success
    - Provider compilation may still fail
    - Use to catch obvious errors early
    """
    from .backend_definitions import get_definition
    
    errors: List[str] = []
    warnings: List[str] = []
    info: List[str] = []
    
    # Get backend definition
    definition = get_definition(provider, backend_id)
    if not definition:
        warnings.append(
            f"Unknown backend '{provider}/{backend_id}'. "
            "Cannot verify compatibility - proceeding with caution."
        )
        # Allow proceeding, but warn
        return PreflightResult(
            can_proceed=True,
            errors=errors,
            warnings=warnings,
            info=info
        )
    
    gates = circuit_data.get('gates', [])
    num_qubits = circuit_data.get('qubits', 0)
    
    # =========================================================================
    # Check 1: Empty circuit
    # =========================================================================
    if len(gates) == 0:
        errors.append("Circuit has no gates. Nothing to execute.")
    
    # =========================================================================
    # Check 2: Qubit count
    # =========================================================================
    if num_qubits > definition.qubits:
        errors.append(
            f"Circuit requires {num_qubits} qubits, but "
            f"{definition.name} only has {definition.qubits} qubits."
        )
    elif num_qubits > definition.qubits * 0.8:
        # Using more than 80% of available qubits
        warnings.append(
            f"Using {num_qubits}/{definition.qubits} qubits. "
            "High qubit utilization may increase error rates."
        )
    
    # =========================================================================
    # Check 3: Gate compatibility (warning only)
    # =========================================================================
    used_gates: Set[str] = set()
    for gate in gates:
        gate_type = gate.get('type', gate.get('gate', '')).lower()
        if gate_type:
            used_gates.add(gate_type)
    
    # Check for unknown gates
    all_known = COMMON_GATES | SPECIAL_GATES
    unknown_gates = used_gates - all_known
    if unknown_gates:
        warnings.append(
            f"Unrecognized gates: {unknown_gates}. "
            "These may fail on some backends."
        )
    
    # Check for special gates that might not be supported
    special_used = used_gates & SPECIAL_GATES
    if special_used:
        info.append(
            f"Special gates used: {special_used}. "
            "These may require decomposition."
        )
    
    # =========================================================================
    # Check 4: Provider-specific warnings
    # =========================================================================
    native_gates = set(g.lower() for g in definition.native_gates)
    non_native = used_gates - native_gates - {"measure", "m", "barrier"}
    
    if non_native and definition.requires_compilation:
        info.append(
            f"Gates {non_native} are not native to {definition.name}. "
            f"They will be compiled to native gates ({', '.join(native_gates)})."
        )
    
    # =========================================================================
    # Check 5: Compilation requirement
    # =========================================================================
    if definition.requires_compilation:
        info.append(
            f"{definition.name} will compile your circuit. "
            "Results may differ slightly from local simulation due to "
            "gate decomposition and hardware noise."
        )
    
    # =========================================================================
    # Check 6: Connectivity warnings (topology)
    # =========================================================================
    if definition.connectivity:
        # Find multi-qubit gates
        multi_qubit_gates = []
        for gate in gates:
            qubits = gate.get('qubits', [])
            if isinstance(qubits, list) and len(qubits) > 1:
                multi_qubit_gates.append(gate)
            elif gate.get('control') is not None and gate.get('target') is not None:
                multi_qubit_gates.append(gate)
        
        if multi_qubit_gates and definition.connectivity != "full":
            warnings.append(
                f"{definition.name} has {definition.connectivity.value} connectivity. "
                f"Multi-qubit gates may require SWAP insertions, "
                f"increasing circuit depth and error rate."
            )
    
    # =========================================================================
    # Build result
    # =========================================================================
    can_proceed = len(errors) == 0
    
    if not can_proceed:
        logger.warning(
            f"Preflight FAILED for {provider}/{backend_id}: {errors}"
        )
    elif warnings:
        logger.info(
            f"Preflight PASSED with warnings for {provider}/{backend_id}: {warnings}"
        )
    
    return PreflightResult(
        can_proceed=can_proceed,
        errors=errors,
        warnings=warnings,
        info=info
    )


def quick_check(circuit_data: Dict) -> Dict:
    """
    Quick sanity check without backend-specific analysis.
    Returns dict suitable for API response.
    """
    gates = circuit_data.get('gates', [])
    num_qubits = circuit_data.get('qubits', 0)
    
    issues = []
    
    if len(gates) == 0:
        issues.append("Circuit is empty")
    
    if num_qubits <= 0:
        issues.append("Invalid qubit count")
    
    if num_qubits > 127:
        issues.append(f"Circuit uses {num_qubits} qubits - exceeds most backends")
    
    return {
        "valid": len(issues) == 0,
        "gate_count": len(gates),
        "qubit_count": num_qubits,
        "issues": issues
    }
