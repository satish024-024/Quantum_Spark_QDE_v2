# AI Circuit Executor for IBM Quantum Cloud Integration
# Handles powerful circuit generation and execution on IBM Quantum

import logging
import time
import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

@dataclass
class CircuitExecutionResult:
    """Result of circuit execution"""
    success: bool
    job_id: Optional[str] = None
    backend: Optional[str] = None
    result: Optional[Dict] = None
    execution_time: Optional[float] = None
    error: Optional[str] = None
    real_data: bool = False
    shots: int = 1024

class AICircuitExecutor:
    """Advanced AI circuit executor with IBM Quantum Cloud integration"""
    
    def __init__(self, quantum_manager):
        self.quantum_manager = quantum_manager
        self.execution_history = []
        self.circuit_cache = {}
        
    def execute_ai_circuit(self, query: str, backend_name: str = 'auto', 
                          shots: int = 1024, parameters: Dict = None) -> CircuitExecutionResult:
        """Execute AI-generated circuit on IBM Quantum Cloud"""
        start_time = time.time()
        
        try:
            logging.info(f"[ROCKET] Executing AI circuit for query: '{query}'")
            
            # Parse natural language to circuit type
            circuit_type = self.quantum_manager.circuit_generator.parse_natural_language(query)
            logging.info(f"[SEARCH] Detected circuit type: {circuit_type}")
            
            # Generate circuit
            circuit_data = self.quantum_manager.generate_circuit(
                circuit_type, 
                parameters or {}
            )
            
            # Update shots
            circuit_data['shots'] = shots
            
            # Execute on IBM Quantum
            result = self.quantum_manager.execute_circuit(circuit_data, backend_name)
            
            execution_time = time.time() - start_time
            
            # Create execution result
            execution_result = CircuitExecutionResult(
                success=result.get('success', False),
                job_id=result.get('job_id'),
                backend=result.get('backend'),
                result=result.get('result'),
                execution_time=execution_time,
                real_data=result.get('real_data', False),
                shots=shots
            )
            
            # Store in history
            self.execution_history.append({
                'query': query,
                'circuit_type': circuit_type,
                'result': execution_result,
                'timestamp': time.time()
            })
            
            logging.info(f"[OK] Circuit execution completed in {execution_time:.2f}s")
            return execution_result
            
        except Exception as e:
            logging.error(f"[ERROR] Circuit execution failed: {e}")
            return CircuitExecutionResult(
                success=False,
                error=str(e),
                execution_time=time.time() - start_time
            )
    
    def execute_circuit_with_optimization(self, query: str, 
                                        optimization_level: int = 1,
                                        backend_name: str = 'auto') -> CircuitExecutionResult:
        """Execute circuit with optimization for better performance"""
        try:
            logging.info(f"[TOOL] Executing optimized circuit for: '{query}'")
            
            # Parse query
            circuit_type = self.quantum_manager.circuit_generator.parse_natural_language(query)
            
            # Generate circuit with optimization parameters
            params = {
                'optimization_level': optimization_level,
                'shots': 2048 if optimization_level > 1 else 1024
            }
            
            circuit_data = self.quantum_manager.generate_circuit(circuit_type, params)
            
            # Apply circuit optimizations
            circuit_data = self._optimize_circuit(circuit_data, optimization_level)
            
            # Execute
            result = self.quantum_manager.execute_circuit(circuit_data, backend_name)
            
            return CircuitExecutionResult(
                success=result.get('success', False),
                job_id=result.get('job_id'),
                backend=result.get('backend'),
                result=result.get('result'),
                real_data=result.get('real_data', False),
                shots=params['shots']
            )
            
        except Exception as e:
            logging.error(f"[ERROR] Optimized circuit execution failed: {e}")
            return CircuitExecutionResult(success=False, error=str(e))
    
    def _optimize_circuit(self, circuit_data: Dict, optimization_level: int) -> Dict:
        """Apply optimizations to circuit based on level"""
        if optimization_level <= 1:
            return circuit_data
        
        # Level 2: Basic optimizations
        if optimization_level >= 2:
            # Reduce shots for faster execution
            circuit_data['shots'] = min(circuit_data['shots'], 1024)
        
        # Level 3: Advanced optimizations
        if optimization_level >= 3:
            # Add circuit transpilation optimizations
            circuit_data['transpile_options'] = {
                'optimization_level': 3,
                'coupling_map': None,  # Let Qiskit choose
                'basis_gates': ['id', 'rz', 'sx', 'x', 'cx', 'reset']
            }
        
        return circuit_data
    
    def get_execution_history(self, limit: int = 10) -> List[Dict]:
        """Get recent execution history"""
        return self.execution_history[-limit:]
    
    def get_circuit_statistics(self) -> Dict:
        """Get statistics about circuit executions"""
        if not self.execution_history:
            return {
                'total_executions': 0,
                'success_rate': 0,
                'average_execution_time': 0,
                'most_common_circuit': None
            }
        
        total = len(self.execution_history)
        successful = sum(1 for h in self.execution_history if h['result'].success)
        avg_time = sum(h['result'].execution_time for h in self.execution_history if h['result'].execution_time) / total
        
        # Most common circuit type
        circuit_types = [h['circuit_type'] for h in self.execution_history]
        most_common = max(set(circuit_types), key=circuit_types.count) if circuit_types else None
        
        return {
            'total_executions': total,
            'success_rate': successful / total,
            'average_execution_time': avg_time,
            'most_common_circuit': most_common
        }
    
    def suggest_optimal_backend(self, circuit_type: str, qubits: int) -> str:
        """Suggest optimal backend for circuit type and qubit count"""
        try:
            backends = self.quantum_manager.get_backends()
            
            # Filter available backends
            available = [b for b in backends if b.get('operational', False)]
            
            if not available:
                return 'ibmq_qasm_simulator'  # Fallback to simulator
            
            # Score backends based on suitability
            scored_backends = []
            for backend in available:
                score = 0
                backend_qubits = backend.get('num_qubits', backend.get('n_qubits', 0))
                
                # Check qubit capacity
                if backend_qubits >= qubits:
                    score += 10
                else:
                    score -= 5
                
                # Check pending jobs (fewer is better)
                pending = backend.get('pending_jobs', 0)
                if pending == 0:
                    score += 5
                elif pending < 5:
                    score += 2
                else:
                    score -= 2
                
                # Check if it's real hardware
                if backend.get('real_data', False):
                    score += 3
                
                # Check error rates (lower is better)
                gate_error = backend.get('gate_error', 0.01)
                if gate_error < 0.001:
                    score += 5
                elif gate_error < 0.01:
                    score += 2
                else:
                    score -= 1
                
                scored_backends.append((backend['name'], score))
            
            # Sort by score and return best
            scored_backends.sort(key=lambda x: x[1], reverse=True)
            return scored_backends[0][0] if scored_backends else 'ibmq_qasm_simulator'
            
        except Exception as e:
            logging.error(f"Error suggesting backend: {e}")
            return 'ibmq_qasm_simulator'
    
    def create_advanced_circuit(self, description: str, parameters: Dict = None) -> Dict:
        """Create advanced circuit based on detailed description"""
        try:
            logging.info(f"🔬 Creating advanced circuit: '{description}'")
            
            # Enhanced circuit type detection
            circuit_type = self._detect_advanced_circuit_type(description)
            
            # Generate circuit with advanced parameters
            circuit_data = self.quantum_manager.generate_circuit(circuit_type, parameters or {})
            
            # Add advanced features
            circuit_data['advanced_features'] = {
                'description': description,
                'optimization_level': 3,
                'error_mitigation': True,
                'dynamic_decoupling': True
            }
            
            return circuit_data
            
        except Exception as e:
            logging.error(f"Error creating advanced circuit: {e}")
            return {'error': str(e)}
    
    def _detect_advanced_circuit_type(self, description: str) -> str:
        """Detect circuit type from advanced description"""
        desc_lower = description.lower()
        
        # Advanced pattern matching
        if any(word in desc_lower for word in ['quantum machine learning', 'qml', 'neural network']):
            return 'quantum_machine_learning'
        elif any(word in desc_lower for word in ['molecular', 'chemistry', 'hamiltonian', 'energy']):
            return 'quantum_chemistry'
        elif any(word in desc_lower for word in ['optimization', 'max cut', 'traveling salesman']):
            return 'quantum_approximate_optimization'
        elif any(word in desc_lower for word in ['simulation', 'dynamics', 'evolution']):
            return 'quantum_simulation'
        elif any(word in desc_lower for word in ['cryptography', 'key distribution', 'bb84']):
            return 'quantum_key_distribution'
        elif any(word in desc_lower for word in ['error correction', 'syndrome', 'stabilizer']):
            return 'quantum_error_correction'
        else:
            # Fall back to basic detection
            return self.quantum_manager.circuit_generator.parse_natural_language(description)
    
    def analyze_circuit_performance(self, circuit_data: Dict) -> Dict:
        """Analyze circuit performance and provide recommendations"""
        try:
            circuit = circuit_data['circuit']
            analysis = {
                'qubits': circuit.num_qubits,
                'depth': circuit.depth(),
                'gate_count': len(circuit.data),
                'complexity_score': 0,
                'recommendations': []
            }
            
            # Calculate complexity score
            analysis['complexity_score'] = (
                circuit.num_qubits * 2 + 
                circuit.depth() * 3 + 
                len(circuit.data) * 1
            )
            
            # Generate recommendations
            if circuit.num_qubits > 20:
                analysis['recommendations'].append("Consider using fewer qubits for better performance")
            
            if circuit.depth() > 100:
                analysis['recommendations'].append("Circuit depth is high, consider optimization")
            
            if len(circuit.data) > 50:
                analysis['recommendations'].append("Many gates detected, consider circuit simplification")
            
            if analysis['complexity_score'] > 200:
                analysis['recommendations'].append("High complexity circuit, may need error mitigation")
            
            return analysis
            
        except Exception as e:
            logging.error(f"Error analyzing circuit: {e}")
            return {'error': str(e)}
    
    def generate_circuit_report(self, execution_result: CircuitExecutionResult) -> str:
        """Generate detailed report for circuit execution"""
        if not execution_result.success:
            return f"[ERROR] **Execution Failed**\n\nError: {execution_result.error}\n\nPlease check your circuit and try again."
        
        report = f"""[ROCKET] **Circuit Execution Report**

**Status:** {'[OK] Success' if execution_result.success else '[ERROR] Failed'}
**Backend:** {execution_result.backend or 'Unknown'}
**Job ID:** {execution_result.job_id or 'N/A'}
**Execution Time:** {execution_result.execution_time:.2f}s
**Shots:** {execution_result.shots}
**Data Source:** {'Real IBM Quantum' if execution_result.real_data else 'Simulation'}

**Results:** {'Available' if execution_result.result else 'Processing...'}

"""
        
        if execution_result.result:
            report += f"**Result Details:**\n```json\n{json.dumps(execution_result.result, indent=2)}\n```\n"
        
        if execution_result.real_data:
            report += "\n🌐 **Real Quantum Hardware Used!** This was executed on actual IBM Quantum hardware."
        else:
            report += "\n🧪 **Simulation Mode** This was executed on a quantum simulator."
        
        return report
