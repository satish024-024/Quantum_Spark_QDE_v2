"""
Circuit Compiler

Translates quantum circuits between formats:
- QASM → Canonical IR (Intermediate Representation)
- Canonical IR → Provider-specific formats

Enforces the staff requirement: QASM parse errors → 400, not 500
"""

from typing import Dict, List, Any, Optional
from qiskit import QuantumCircuit
from qiskit.qasm2 import loads as qasm2_loads

class CircuitCompiler:
    """
    Compiles quantum circuits between formats.
    Central translation layer for multi-provider support.
    """
    
    def __init__(self):
        self.supported_gates = {
            'h', 'x', 'y', 'z', 'cx', 'cnot', 'ccx', 'cz', 'cy',
            'rx', 'ry', 'rz', 's', 't', 'sdg', 'tdg', 'swap',
            'id', 'u', 'u1', 'u2', 'u3', 'measure', 'barrier'
        }
    
    # ==================== QASM → Canonical IR ====================
    
    def from_qasm(self, qasm_code: str) -> Dict[str, Any]:
        """
        Parse QASM string into Canonical Circuit IR.
        
        STAFF REQUIREMENT: Invalid QASM raises ValueError (400), not 500.
        
        Args:
            qasm_code: QASM 2.0 or 3.0 string
            
        Returns:
            Canonical IR:
            {
                "qubits": int,
                "cbits": int,
                "gates": [
                    {
                        "type": str,      # gate name (lowercase)
                        "qubits": [int],  # qubit indices
                        "params": [float] # gate parameters (optional)
                    }
                ],
                "depth": int,
                "format": "canonical_ir_v1"
            }
            
        Raises:
            ValueError: Invalid QASM (maps to HTTP 400)
        """
        try:
            # Parse QASM using Qiskit
            qc = QuantumCircuit.from_qasm_str(qasm_code)
            
            # Extract gate sequence
            gates = []
            for instruction in qc.data:
                gate_name = instruction.operation.name.lower()
                qubits = [qc.find_bit(q).index for q in instruction.qubits]
                
                gate = {
                    "type": gate_name,
                    "qubits": qubits
                }
                
                # Add parameters if present
                if hasattr(instruction.operation, 'params') and instruction.operation.params:
                    gate["params"] = [float(p) for p in instruction.operation.params]
                
                gates.append(gate)
            
            # Build canonical IR
            return {
                "qubits": qc.num_qubits,
                "cbits": qc.num_clbits,
                "gates": gates,
                "depth": qc.depth(),
                "format": "canonical_ir_v1"
            }
            
        except Exception as e:
            # Staff requirement: bad user input ≠ server error
            raise ValueError(f"Invalid QASM: {str(e)}")
    
    # ==================== Canonical IR → Provider Formats ====================
    
    def to_qiskit(self, circuit_ir: Dict) -> QuantumCircuit:
        """
        Compile Canonical IR to Qiskit QuantumCircuit.
        
        Args:
            circuit_ir: Canonical IR dictionary
            
        Returns:
            Qiskit QuantumCircuit object
            
        Raises:
            ValueError: Invalid IR
        """
        try:
            # Validate IR
            self._validate_ir(circuit_ir)
            
            # Create circuit
            qubits = circuit_ir.get('qubits', 2)
            cbits = circuit_ir.get('cbits', qubits)
            qc = QuantumCircuit(qubits, cbits)
            
            # Add gates
            for gate in circuit_ir.get('gates', []):
                gate_type = gate['type'].lower()
                qubits_list = gate['qubits']
                params = gate.get('params', [])
                
                # Special handling for measurement
                if gate_type == 'measure':
                    # Measure takes qubit and classical bit indices
                    if len(qubits_list) >= 1:
                        qubit_idx = qubits_list[0]
                        cbit_idx = qubit_idx  # Map to same index by default
                        qc.measure(qubit_idx, cbit_idx)
                    continue
                
                # Special handling for barrier (no qubits specified means all qubits)
                if gate_type == 'barrier':
                    if qubits_list:
                        qc.barrier(qubits_list)
                    else:
                        qc.barrier()
                    continue
                
                # Get gate method from circuit
                if not hasattr(qc, gate_type):
                    raise ValueError(f"Unsupported gate: {gate_type}")
                
                gate_method = getattr(qc, gate_type)
                
                # Apply gate with parameters
                if params:
                    gate_method(*params, *qubits_list)
                else:
                    gate_method(*qubits_list)
            
            return qc
            
        except Exception as e:
            raise ValueError(f"Failed to compile IR to Qiskit: {e}")
    
    def to_provider_format(self, circuit_ir: Dict, provider: str) -> Any:
        """
        Compile Canonical IR to provider-specific format.
        
        Args:
            circuit_ir: Canonical IR dictionary
            provider: Provider identifier ('ibm', 'aws_braket', etc.)
            
        Returns:
            Provider-specific circuit object
            
        Raises:
            ValueError: Unknown provider or invalid IR
        """
        if provider == 'ibm':
            return self.to_qiskit(circuit_ir)
        
        # Future providers
        elif provider == 'aws_braket':
            raise NotImplementedError("AWS Braket compilation coming in Phase 2")
        
        elif provider == 'azure':
            raise NotImplementedError("Azure Quantum compilation coming in Phase 2")
        
        elif provider == 'google':
            raise NotImplementedError("Google Cirq compilation coming in Phase 2")
        
        else:
            raise ValueError(f"Unknown provider: {provider}")
    
    # ==================== Validation ====================
    
    def _validate_ir(self, circuit_ir: Dict):
        """
        Validate Canonical IR structure.
        
        Raises:
            ValueError: Invalid IR
        """
        required_fields = ['qubits', 'gates', 'format']
        
        for field in required_fields:
            if field not in circuit_ir:
                raise ValueError(f"Missing required field in IR: {field}")
        
        if circuit_ir['format'] != 'canonical_ir_v1':
            raise ValueError(f"Unsupported IR format: {circuit_ir['format']}")
        
        if not isinstance(circuit_ir['gates'], list):
            raise ValueError("Gates must be a list")
        
        for i, gate in enumerate(circuit_ir['gates']):
            if 'type' not in gate:
                raise ValueError(f"Gate {i} missing 'type' field")
            if 'qubits' not in gate:
                raise ValueError(f"Gate {i} missing 'qubits' field")
            if not isinstance(gate['qubits'], list):
                raise ValueError(f"Gate {i} 'qubits' must be a list")
    
    # ==================== Utilities ====================
    
    def get_gate_count(self, circuit_ir: Dict) -> Dict[str, int]:
        """Count gates by type in IR"""
        counts = {}
        for gate in circuit_ir.get('gates', []):
            gate_type = gate['type']
            counts[gate_type] = counts.get(gate_type, 0) + 1
        return counts
    
    def estimate_depth(self, circuit_ir: Dict) -> int:
        """Estimate circuit depth from IR"""
        return circuit_ir.get('depth', len(circuit_ir.get('gates', [])))


# ==================== Example Usage ====================

if __name__ == "__main__":
    compiler = CircuitCompiler()
    
    # Test: Bell state QASM → Canonical IR
    bell_qasm = """
    OPENQASM 2.0;
    include "qelib1.inc";
    qreg q[2];
    creg c[2];
    h q[0];
    cx q[0], q[1];
    measure q -> c;
    """
    
    print("Testing Circuit Compiler...")
    print("=" * 50)
    
    try:
        # Parse QASM
        ir = compiler.from_qasm(bell_qasm)
        print("✅ QASM → Canonical IR:")
        print(f"   Qubits: {ir['qubits']}")
        print(f"   Gates: {len(ir['gates'])}")
        print(f"   Depth: {ir['depth']}")
        print(f"   Gate count: {compiler.get_gate_count(ir)}")
        
        # Compile to Qiskit
        qc = compiler.to_provider_format(ir, 'ibm')
        print(f"\n✅ Canonical IR → Qiskit:")
        print(f"   Circuit: {qc.num_qubits} qubits, {qc.depth()} depth")
        
        print("\n✅ Circuit Compiler tests passed!")
        
    except ValueError as e:
        print(f"❌ Validation error (400): {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
