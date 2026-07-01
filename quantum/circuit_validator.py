"""
Circuit Data Validator and Normalizer
Enforces frozen schema for 3D quantum circuit visualization
"""
import math
from typing import Dict, List, Optional, Tuple, Any


# Schema version for widget compatibility
SCHEMA_VERSION = "1.0"

# Circuit limits for performance and safety
MAX_GATES = 100  # Prevent UI overload from AI hallucinations
MAX_QUBITS = 10

# Frozen gate type whitelist
ALLOWED_GATES = {
    # Single-qubit gates
    'H', 'X', 'Y', 'Z', 'S', 'T',
    # Rotation gates
    'RX', 'RY', 'RZ',
    # Two-qubit gates
    'CNOT', 'CZ', 'SWAP'
    # TOFFOLI explicitly NOT supported (3-qubit gates require schema extension)
}

SINGLE_QUBIT_GATES = {'H', 'X', 'Y', 'Z', 'S', 'T'}
TWO_QUBIT_GATES = {'CNOT', 'CZ', 'SWAP'}
ROTATION_GATES = {'RX', 'RY', 'RZ'}

# NOTE: SWAP semantics
# SWAP has no "control" conceptually - both qubits are symmetric targets
# However, for schema compatibility, we use 'control' field for second qubit
# This is documented and intentional


class CircuitValidationError(Exception):
    """Raised when circuit data violates schema"""
    pass


def validate_circuit_data(circuit_data: Dict[str, Any]) -> None:
    """
    Validate circuit data against frozen schema.
    
    Raises:
        CircuitValidationError: If validation fails
    """
    # Check required fields
    if 'qubits' not in circuit_data:
        raise CircuitValidationError("Missing required field: qubits")
    
    if 'gates' not in circuit_data:
        raise CircuitValidationError("Missing required field: gates")
    
    # Validate qubits
    qubits = circuit_data['qubits']
    if not isinstance(qubits, int):
        raise CircuitValidationError(f"qubits must be integer, got {type(qubits)}")
    
    if qubits < 1 or qubits > MAX_QUBITS:
        raise CircuitValidationError(f"qubits must be 1-{MAX_QUBITS}, got {qubits}")
    
    # Validate gates array
    gates = circuit_data['gates']
    if not isinstance(gates, list):
        raise CircuitValidationError(f"gates must be array, got {type(gates)}")
    
    # Enforce gate count limit (prevent AI hallucinations from crashing UI)
    if len(gates) > MAX_GATES:
        raise CircuitValidationError(f"Circuit too large for visualization ({len(gates)} gates, max {MAX_GATES})")
    
    # Validate each gate
    for i, gate in enumerate(gates):
        try:
            validate_gate(gate, qubits)
        except CircuitValidationError as e:
            raise CircuitValidationError(f"Gate {i}: {str(e)}")


def validate_gate(gate: Dict[str, Any], num_qubits: int) -> None:
    """
    Validate individual gate against schema.
    
    Raises:
        CircuitValidationError: If gate is invalid
    """
    
    # Check required field: type
    if 'type' not in gate:
        raise CircuitValidationError("Missing required field: type")
    
    gate_type = gate['type']
    
    # Check gate type whitelist
    if gate_type not in ALLOWED_GATES:
        raise CircuitValidationError(
            f"Invalid gate type: {gate_type}. Allowed: {', '.join(sorted(ALLOWED_GATES))}"
        )
    
    # Check required field: target
    if 'target' not in gate:
        raise CircuitValidationError("Missing required field: target")
    
    target = gate['target']
    
    # Validate target qubit index
    if not isinstance(target, int):
        raise CircuitValidationError(f"target must be integer, got {type(target)}")
    
    if target < 0 or target >= num_qubits:
        raise CircuitValidationError(f"target qubit {target} out of bounds for {num_qubits}-qubit circuit")
    
    # Gate-specific validation
    control = gate.get('control')
    parameter = gate.get('parameter')
    
    if gate_type in SINGLE_QUBIT_GATES:
        # Single-qubit gates must NOT have control or parameter
        if control is not None:
            raise CircuitValidationError(f"{gate_type} gate cannot have control qubit")
        if parameter is not None:
            raise CircuitValidationError(f"{gate_type} gate cannot have parameter")
    
    elif gate_type in TWO_QUBIT_GATES:
        # Two-qubit gates MUST have control, must NOT have parameter
        # NOTE: For SWAP, 'control' field represents second target (semantic quirk for schema compat)
        if control is None:
            raise CircuitValidationError(f"{gate_type} gate requires control qubit (second target for SWAP)")
        if not isinstance(control, int):
            raise CircuitValidationError(f"control must be integer, got {type(control)}")
        if control < 0 or control >= num_qubits:
            raise CircuitValidationError(f"control qubit {control} out of bounds")
        if control == target:
            raise CircuitValidationError(f"control and target must be different qubits, both are {target}")
        if parameter is not None:
            raise CircuitValidationError(f"{gate_type} gate cannot have parameter")
    
    elif gate_type in ROTATION_GATES:
        # Rotation gates MUST have parameter, must NOT have control
        if parameter is None:
            raise CircuitValidationError(f"{gate_type} gate requires parameter (rotation angle in radians)")
        if not isinstance(parameter, (int, float)):
            raise CircuitValidationError(f"parameter must be number, got {type(parameter)}")
        if control is not None:
            raise CircuitValidationError(f"{gate_type} gate cannot have control qubit")


def normalize_circuit_from_qiskit_code(code: str, description: str = "") -> Optional[Dict[str, Any]]:
    """
    Extract circuit_data from Qiskit Python code.
    This is a best-effort parser - not a full Python interpreter.
    
    Returns None if parsing fails.
    """
    try:
        gates = []
        qubits = 2  # Default
        
        # Extract qubit count
        if 'QuantumCircuit(' in code:
            import re
            match = re.search(r'QuantumCircuit\((\d+)', code)
            if match:
                qubits = int(match.group(1))
        
        # Parse gates (simple pattern matching)
        lines = code.split('\n')
        for line in lines:
            line = line.strip()
            
            # Hadamard
            if line.startswith('qc.h(') or line.startswith('.h('):
                target = extract_qubit_index(line)
                if target is not None:
                    gates.append({'type': 'H', 'target': target, 'control': None, 'parameter': None})
            
            # Pauli-X
            elif line.startswith('qc.x(') or line.startswith('.x('):
                target = extract_qubit_index(line)
                if target is not None:
                    gates.append({'type': 'X', 'target': target, 'control': None, 'parameter': None})
            
            # Pauli-Y
            elif line.startswith('qc.y(') or line.startswith('.y('):
                target = extract_qubit_index(line)
                if target is not None:
                    gates.append({'type': 'Y', 'target': target, 'control': None, 'parameter': None})
            
            # Pauli-Z
            elif line.startswith('qc.z(') or line.startswith('.z('):
                target = extract_qubit_index(line)
                if target is not None:
                    gates.append({'type': 'Z', 'target': target, 'control': None, 'parameter': None})
            
            # CNOT
            elif line.startswith('qc.cx(') or line.startswith('.cx(') or line.startswith('qc.cnot('):
                control, target = extract_two_qubit_indices(line)
                if control is not None and target is not None:
                    gates.append({'type': 'CNOT', 'target': target, 'control': control, 'parameter': None})
            
            # Rotation gates (simplified - doesn't handle complex angle expressions)
            elif line.startswith('qc.rx(') or line.startswith('.rx('):
                angle, target = extract_rotation_params(line)
                if angle is not None and target is not None:
                    gates.append({'type': 'RX', 'target': target, 'control': None, 'parameter': angle})
            
            elif line.startswith('qc.ry(') or line.startswith('.ry('):
                angle, target = extract_rotation_params(line)
                if angle is not None and target is not None:
                    gates.append({'type': 'RY', 'target': target, 'control': None, 'parameter': angle})
            
            elif line.startswith('qc.rz(') or line.startswith('.rz('):
                angle, target = extract_rotation_params(line)
                if angle is not None and target is not None:
                    gates.append({'type': 'RZ', 'target': target, 'control': None, 'parameter': angle})
        
        circuit_data = {
            'schema_version': SCHEMA_VERSION,
            'qubits': qubits,
            'gates': gates,
            'name': 'Generated Circuit',
            'description': description
        }
        
        # Validate before returning
        try:
            validate_circuit_data(circuit_data)
            return circuit_data
        except CircuitValidationError as e:
            print(f"⚠️ Generated circuit failed validation: {e}")
            return None
        
    except Exception as e:
        print(f"⚠️ Circuit normalization error: {e}")
        return None


def extract_qubit_index(line: str) -> Optional[int]:
    """Extract qubit index from gate call like 'qc.h(0)'"""
    import re
    match = re.search(r'\((\d+)\)', line)
    if match:
        return int(match.group(1))
    return None


def extract_two_qubit_indices(line: str) -> Tuple[Optional[int], Optional[int]]:
    """Extract control and target from two-qubit gate like 'qc.cx(0, 1)'"""
    import re
    match = re.search(r'\((\d+),\s*(\d+)\)', line)
    if match:
        return int(match.group(1)), int(match.group(2))
    return None, None


def extract_rotation_params(line: str) -> Tuple[Optional[float], Optional[int]]:
    """Extract angle and qubit from rotation gate like 'qc.rx(math.pi/2, 0)'"""
    import re
    
    # Try to extract angle (simplified - handles pi, numbers, basic arithmetic)
    angle = None
    if 'math.pi' in line or 'np.pi' in line:
        if '/2' in line:
            angle = math.pi / 2
        elif '/4' in line:
            angle = math.pi / 4
        elif '*2' in line:
            angle = math.pi * 2
        else:
            angle = math.pi
    else:
        # Try to extract numeric value
        match = re.search(r'\(([0-9.]+)', line)
        if match:
            try:
                angle = float(match.group(1))
            except:
                pass
    
    # Extract qubit index (last number in parentheses)
    match = re.search(r',\s*(\d+)\)', line)
    qubit = int(match.group(1)) if match else None
    
    return angle, qubit


# Example usage
if __name__ == "__main__":
    # Test validation
    bell_state = {
        "qubits": 2,
        "gates": [
            {"type": "H", "target": 0, "control": None, "parameter": None},
            {"type": "CNOT", "target": 1, "control": 0, "parameter": None}
        ]
    }
    
    try:
        validate_circuit_data(bell_state)
        print("✅ Bell state valid")
    except CircuitValidationError as e:
        print(f"❌ Bell state invalid: {e}")
    
    # Test normalization
    code = """
from qiskit import QuantumCircuit
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)
"""
    
    circuit_data = normalize_circuit_from_qiskit_code(code, "Bell State")
    print(f"Normalized circuit: {circuit_data}")
