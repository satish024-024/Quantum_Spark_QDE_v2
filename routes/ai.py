from flask import Blueprint, jsonify, request, session
import json
import time
import re
from qiskit import QuantumCircuit
from helpers import get_user_quantum_credentials, gemini_ai, GEMINI_AI_AVAILABLE, quantum_manager_singleton

ai_bp = Blueprint('ai', __name__)

class QuantumCircuitGenerator:
    """Generate quantum circuits for AI assistant integration"""
    def __init__(self):
        self.circuit_templates = self._initialize_circuit_templates()
    
    def _initialize_circuit_templates(self):
        return {
            'random_number_generator': {
                'name': 'Quantum Random Number Generator',
                'description': 'Generates truly random numbers using quantum superposition',
                'qubits': 2,
                'gates': ['h', 'measure'],
                'shots': 1024
            },
            'bell_state': {
                'name': 'Bell State Preparation',
                'description': 'Creates maximally entangled Bell state |F+>',
                'qubits': 2,
                'gates': ['h', 'cx'],
                'shots': 1024
            },
            'grover_search': {
                'name': 'Grover Search Algorithm',
                'description': 'Quantum search algorithm for finding marked items',
                'qubits': 3,
                'gates': ['h', 'x', 'z', 'cx', 'h'],
                'shots': 1024
            },
            'quantum_teleportation': {
                'name': 'Quantum Teleportation',
                'description': 'Teleports quantum state from one qubit to another',
                'qubits': 3,
                'gates': ['h', 'cx', 'measure', 'cx', 'h', 'measure'],
                'shots': 1024
            },
            'deutsch_jozsa': {
                'name': 'Deutsch-Jozsa Algorithm',
                'description': 'Determines if function is constant or balanced',
                'qubits': 3,
                'gates': ['h', 'cx', 'h'],
                'shots': 1024
            },
            'pca': {
                'name': 'Quantum Principal Component Analysis',
                'description': 'Extracts eigenvalues/eigenvectors of density matrices',
                'qubits': 4,
                'gates': ['h', 'swap', 'h'],
                'shots': 1024
            }
        }
    
    def generate_circuit(self, circuit_type, custom_params=None):
        if circuit_type not in self.circuit_templates:
            raise ValueError(f"Unknown circuit type: {circuit_type}")
        
        template = self.circuit_templates[circuit_type]
        params = custom_params or {}
        num_qubits = params.get('qubits', template['qubits'])
        shots = params.get('shots', template['shots'])
        
        qc = QuantumCircuit(num_qubits, num_qubits)
        
        if circuit_type == 'random_number_generator':
            for i in range(num_qubits):
                qc.h(i)
            qc.measure_all()
        elif circuit_type == 'bell_state':
            qc.h(0)
            qc.cx(0, 1)
            qc.measure_all()
        elif circuit_type == 'grover_search':
            for i in range(num_qubits):
                qc.h(i)
            qc.x(0)
            qc.x(1)
            qc.x(2)
            qc.ccx(0, 1, 2)
            qc.x(0)
            qc.x(1)
            qc.x(2)
            for i in range(num_qubits):
                qc.h(i)
                qc.x(i)
            qc.ccx(0, 1, 2)
            for i in range(num_qubits):
                qc.x(i)
                qc.h(i)
            qc.measure_all()
        elif circuit_type == 'quantum_teleportation':
            qc.h(0)
            qc.z(0)
            qc.h(1)
            qc.cx(1, 2)
            qc.cx(0, 1)
            qc.h(0)
            qc.measure(0, 0)
            qc.measure(1, 1)
            qc.cx(1, 2)
            qc.cz(0, 2)
            qc.measure(2, 2)
        elif circuit_type == 'deutsch_jozsa':
            qc.x(num_qubits - 1)
            for i in range(num_qubits):
                qc.h(i)
            qc.cx(0, num_qubits - 1)
            qc.cx(1, num_qubits - 1)
            for i in range(num_qubits - 1):
                qc.h(i)
            qc.measure_all()
        elif circuit_type == 'pca':
            for i in range(num_qubits):
                qc.h(i)
            if num_qubits >= 3:
                qc.ccx(0, 1, 2)
            qc.measure_all()
            
        code = f"""import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

qc = QuantumCircuit({num_qubits})
"""
        if circuit_type == 'random_number_generator':
            code += "for i in range(qc.num_qubits):\n    qc.h(i)\n"
        elif circuit_type == 'bell_state':
            code += "qc.h(0)\nqc.cx(0, 1)\n"
        elif circuit_type == 'grover_search':
            code += "# Grover implementation\nfor i in range(qc.num_qubits): qc.h(i)\nqc.ccx(0, 1, 2)\n"
        elif circuit_type == 'quantum_teleportation':
            code += "qc.h(0); qc.z(0); qc.h(1)\nqc.cx(1, 2); qc.cx(0, 1); qc.h(0)\n"
        elif circuit_type == 'deutsch_jozsa':
            code += "qc.x(qc.num_qubits - 1)\nfor i in range(qc.num_qubits): qc.h(i)\nqc.cx(0, qc.num_qubits - 1)\n"
        elif circuit_type == 'pca':
            code += "# Quantum PCA\nfor i in range(qc.num_qubits): qc.h(i)\nqc.ccx(0, 1, 2)\n"
            
        code += """
qc.measure_all()
sim = AerSimulator()
job = sim.run(transpile(qc, sim), shots=1024)
print(job.result().get_counts())
"""
        return {
            'circuit': qc,
            'code': code,
            'name': template['name'],
            'description': template['description'],
            'qubits': num_qubits,
            'shots': shots,
            'type': circuit_type
        }
    
    def parse_natural_language(self, query):
        query_lower = query.lower()
        if any(word in query_lower for word in ['random', 'number', 'generator', 'qrng']):
            circuit_type = 'random_number_generator'
        elif any(word in query_lower for word in ['bell', 'state', 'entangled', 'entanglement']):
            circuit_type = 'bell_state'
        elif any(word in query_lower for word in ['grover', 'search', 'find']):
            circuit_type = 'grover_search'
        elif any(word in query_lower for word in ['teleport', 'teleportation']):
            circuit_type = 'quantum_teleportation'
        elif any(word in query_lower for word in ['deutsch', 'jozsa', 'constant', 'balanced']):
            circuit_type = 'deutsch_jozsa'
        elif any(word in query_lower for word in ['pca', 'principal', 'component']):
            circuit_type = 'pca'
        else:
            circuit_type = 'random_number_generator'
            
        params = {}
        qubit_match = re.search(r'(\d+)\s*qubit', query_lower)
        if qubit_match:
            params['qubits'] = int(qubit_match.group(1))
            
        shots_match = re.search(r'(\d+)\s*shot', query_lower)
        if shots_match:
            params['shots'] = int(shots_match.group(1))
            
        return circuit_type, params
    
    def convert_to_3d_circuit(self, circuit_data):
        circuit = circuit_data['circuit']
        gates = []
        for depth, instruction in enumerate(circuit.data):
            gate_name = instruction.operation.name.lower()
            qubits = [circuit.find_bit(q).index for q in instruction.qubits]
            gate_mapping = {
                'h': 'H', 'x': 'X', 'y': 'Y', 'z': 'Z', 'cx': 'CNOT', 'ccx': 'CCX',
                'cz': 'CZ', 'rx': 'RX', 'ry': 'RY', 'rz': 'RZ', 's': 'S', 't': 'T'
            }
            gate_type = gate_mapping.get(gate_name, gate_name.upper())
            gates.append({
                'gate': gate_type, 'qubits': qubits, 'depth': depth
            })
        return {
            'name': circuit_data['name'],
            'description': circuit_data['description'],
            'qubits': circuit_data['qubits'],
            'gates': gates,
            'depth': circuit.depth(),
            'ai_generated': True,
            'circuit_type': 'quantum',
            'visualization_ready': True
        }

circuit_generator = QuantumCircuitGenerator()

def generate_basic_internal_response(message):
    message_lower = message.lower()
    if 'bell' in message_lower:
        return "A Bell state is a maximally entangled quantum state of two qubits. To create a Bell state, apply a Hadamard (H) gate to the first qubit to create superposition, followed by a Controlled-NOT (CNOT) gate with the first qubit as control and the second as target. This creates the state (|00> + |11>)/sqrt(2)."
    elif 'superposition' in message_lower:
        return "Quantum superposition is a fundamental principle of quantum mechanics. It states that a physical system—such as an electron or qubit—can exist in multiple states or configurations simultaneously. Measurement forces the qubit to collapse into a single classical state."
    return "I am your AI Quantum Assistant. Ask me about quantum circuits, superposition, entanglement, or code generation!"

@ai_bp.route('/api/ai-assistant', methods=['POST'])
@ai_bp.route('/api/ai/chat', methods=['POST'])
def api_ai_assistant():
    try:
        data = request.json or {}
        message = data.get('message', '')
        response_text = generate_basic_internal_response(message)
        return jsonify({
            'response': response_text,
            'success': True
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/api/ai/quantum_chat', methods=['POST'])
def ai_quantum_chat():
    try:
        data = request.get_json() or {}
        message = data.get('message', '').strip()
        user_api_key = data.get('api_key')
        
        if not message:
            return jsonify({'success': False, 'error': 'No message provided'}), 400
            
        # Reload dotenv just in case key was updated during session
        active_gemini_ai = gemini_ai if GEMINI_AI_AVAILABLE else None
        try:
            from dotenv import load_dotenv
            load_dotenv()
            if active_gemini_ai:
                active_gemini_ai.api_key = os.getenv('GEMINI_API_KEY')
        except:
            pass

        ai_response = None
        
        # Phase 1: Live Gemini (Google API) - HIGH PRIORITY
        if active_gemini_ai and active_gemini_ai.api_key:
            try:
                gemini_response = active_gemini_ai.chat_quantum_assistant(message, None)
                if gemini_response and gemini_response.get('success'):
                    ai_response = gemini_response.get('response')
            except Exception as e:
                print(f"Gemini failed: {e}")
                
        # Phase 2: Internal Knowledge Base (Fallback)
        if ai_response is None:
            try:
                from ai_knowledge_base import QuantumAIKnowledgeBase
                internal_ai = QuantumAIKnowledgeBase()
                ai_response = internal_ai.generate_ai_response(message)
            except Exception as e:
                print(f"Internal KB failed: {e}")
                
        # Phase 3: Generic Fallback
        if ai_response is None:
            ai_response = generate_basic_internal_response(message)
            
        # Generate circuit if requested
        circuit_generated = False
        circuit_data = None
        if any(word in message.lower() for word in ['create', 'generate', 'make', 'build', 'design', 'circuit']):
            try:
                circuit_type, params = circuit_generator.parse_natural_language(message)
                circuit_result = circuit_generator.generate_circuit(circuit_type, params)
                circuit_generated = True
                circuit_data = circuit_generator.convert_to_3d_circuit(circuit_result)
                ai_response += f"\n\nCircuit generated! I've created a {circuit_type} circuit for you! Check the 3D Circuit widget to view it."
            except Exception as e:
                print(f"Circuit gen failed: {e}")
                
        response_payload = {
            'success': True,
            'ai_response': ai_response,
            'circuit_generated': circuit_generated,
            'circuit_data': circuit_data
        }
        
        try:
            # Clean emojis or non-utf-8 chars to prevent Vercel encoding issues
            response_payload['ai_response'] = response_payload['ai_response'].encode('utf-8', errors='ignore').decode('utf-8')
        except:
            pass
            
        return jsonify(response_payload)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
