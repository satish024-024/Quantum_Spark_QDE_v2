"""
Quantum AI Service - Offline LLM Integration for Quantum Dashboard
Downloads and manages the best free AI models for quantum circuit generation and chat.
"""

import os
import json
import logging
import torch
from pathlib import Path
from typing import Dict, List, Any, Optional
import threading
import time
from concurrent.futures import ThreadPoolExecutor
import requests
from transformers import (
    AutoTokenizer, AutoModelForCausalLM,
    pipeline, BitsAndBytesConfig,
    AutoModelForSeq2SeqLM
)
from langchain.llms import HuggingFacePipeline
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
import sentence_transformers
from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QuantumAIService:
    """
    Comprehensive AI service for quantum computing applications.
    Downloads and manages offline LLMs optimized for quantum tasks.
    """

    def __init__(self, models_dir: str = "quantum_models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)

        # Best free models for quantum tasks
        self.quantum_models = {
            'circuit_generator': {
                'name': 'codellama/CodeLlama-7b-Instruct-hf',
                'description': 'Best for quantum circuit code generation',
                'size': '7B parameters',
                'specialization': 'code_generation'
            },
            'chat_assistant': {
                'name': 'microsoft/Phi-2',
                'description': 'Excellent balance of quality and speed for chat',
                'size': '2.7B parameters',
                'specialization': 'conversational'
            },
            'quantum_reasoning': {
                'name': 'mistralai/Mistral-7B-Instruct-v0.1',
                'description': 'Strong reasoning for quantum physics explanations',
                'size': '7B parameters',
                'specialization': 'reasoning'
            },
            'embedding_model': {
                'name': 'sentence-transformers/all-MiniLM-L6-v2',
                'description': 'Fast embeddings for quantum document similarity',
                'size': '22M parameters',
                'specialization': 'embeddings'
            }
        }

        # Model instances
        self.models = {}
        self.tokenizers = {}
        self.pipelines = {}

        # Download status
        self.download_status = {model: 'not_downloaded' for model in self.quantum_models.keys()}

        # Quantum knowledge base
        self.quantum_knowledge = self._initialize_quantum_knowledge()

        # Thread pool for async operations
        self.executor = ThreadPoolExecutor(max_workers=2)

    def _initialize_quantum_knowledge(self) -> Dict[str, Any]:
        """Initialize quantum computing knowledge base."""
        return {
            'quantum_basics': [
                "Quantum computing uses quantum mechanics principles like superposition and entanglement",
                "Qubits can exist in multiple states simultaneously unlike classical bits",
                "Quantum gates manipulate qubits through unitary transformations",
                "Measurement collapses quantum states to classical outcomes"
            ],
            'algorithms': {
                'grover': "Grover's algorithm provides quadratic speedup for unstructured search",
                'shor': "Shor's algorithm can factor large numbers exponentially faster than classical methods",
                'qft': "Quantum Fourier Transform is fundamental to many quantum algorithms",
                'vqe': "Variational Quantum Eigensolver combines quantum and classical optimization"
            },
            'gates': {
                'h': "Hadamard gate creates superposition",
                'cx': "CNOT gate creates entanglement between qubits",
                'rx': "Rotation around X-axis for parameterized circuits",
                'ry': "Rotation around Y-axis for variational algorithms"
            },
            'terminology': {
                'superposition': "A qubit can be in multiple states simultaneously",
                'entanglement': "Quantum particles linked such that one affects the other instantly",
                'interference': "Quantum states can constructively or destructively interfere",
                'decoherence': "Loss of quantum properties due to interaction with environment"
            }
        }

    def download_model(self, model_key: str) -> bool:
        """
        Download a specific quantum model.
        Returns True if successful, False otherwise.
        """
        if model_key not in self.quantum_models:
            logger.error(f"Unknown model: {model_key}")
            return False

        try:
            logger.info(f"Downloading {model_key}: {self.quantum_models[model_key]['name']}")
            self.download_status[model_key] = 'downloading'

            model_info = self.quantum_models[model_key]
            model_name = model_info['name']

            # Configure quantization for efficiency
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4"
            )

            # Download and cache model
            if model_key == 'embedding_model':
                # Embedding model doesn't need quantization
                model = SentenceTransformer(model_name)
                self.models[model_key] = model
            else:
                # Download tokenizer
                tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir=str(self.models_dir))
                self.tokenizers[model_key] = tokenizer

                # Download model with quantization
                model = AutoModelForCausalLM.from_pretrained(
                    model_name,
                    quantization_config=quantization_config,
                    device_map="auto",
                    cache_dir=str(self.models_dir),
                    torch_dtype=torch.float16
                )
                self.models[model_key] = model

                # Create pipeline for LangChain integration
                pipe = pipeline(
                    "text-generation",
                    model=model,
                    tokenizer=tokenizer,
                    max_new_tokens=512,
                    temperature=0.7,
                    do_sample=True,
                    top_p=0.95,
                    repetition_penalty=1.15
                )
                self.pipelines[model_key] = pipe

            self.download_status[model_key] = 'ready'
            logger.info(f"Successfully downloaded {model_key}")
            return True

        except Exception as e:
            logger.error(f"Failed to download {model_key}: {e}")
            self.download_status[model_key] = 'failed'
            return False

    def download_all_models(self) -> Dict[str, bool]:
        """Download all quantum models asynchronously."""
        logger.info("Starting download of all quantum AI models...")

        results = {}
        for model_key in self.quantum_models.keys():
            results[model_key] = self.download_model(model_key)

        successful = sum(1 for result in results.values() if result)
        logger.info(f"Downloaded {successful}/{len(results)} models successfully")
        return results

    def generate_quantum_circuit(self, description: str, qubits: int = 2) -> str:
        """
        Generate quantum circuit code from natural language description.
        """
        if 'circuit_generator' not in self.models or self.download_status['circuit_generator'] != 'ready':
            return self._fallback_circuit_generation(description, qubits)

        try:
            prompt = f"""You are an expert quantum programmer. Generate a Qiskit quantum circuit based on this description: "{description}"

Requirements:
- Use {qubits} qubits
- Include necessary imports
- Add measurements
- Make it executable Qiskit code
- Include comments explaining each step

Generate the complete, working Python code:

```python
from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister
import numpy as np

# Create quantum circuit
qr = QuantumRegister({qubits}, 'q')
cr = ClassicalRegister({qubits}, 'c')
qc = QuantumCircuit(qr, cr)

# Your circuit implementation here

# Measure all qubits
qc.measure_all()

# Print circuit
print(qc)
```"""

            # Generate circuit code
            pipeline = self.pipelines['circuit_generator']
            outputs = pipeline(prompt, max_new_tokens=800, num_return_sequences=1)

            generated_code = outputs[0]['generated_text'].replace(prompt, '').strip()

            # Extract code block if present
            if '```python' in generated_code:
                code_start = generated_code.find('```python') + 9
                code_end = generated_code.find('```', code_start)
                if code_end > code_start:
                    generated_code = generated_code[code_start:code_end].strip()

            return generated_code

        except Exception as e:
            logger.error(f"Error generating circuit: {e}")
            return self._fallback_circuit_generation(description, qubits)

    def _fallback_circuit_generation(self, description: str, qubits: int) -> str:
        """Fallback circuit generation when AI model is not available."""
        description_lower = description.lower()

        if 'bell' in description_lower or 'entangl' in description_lower:
            return f'''from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister

# Create Bell state circuit
qr = QuantumRegister({qubits}, 'q')
cr = ClassicalRegister({qubits}, 'c')
qc = QuantumCircuit(qr, cr)

# Create superposition on first qubit
qc.h(0)

# Entangle qubits
for i in range({qubits-1}):
    qc.cx(i, i+1)

# Measure all qubits
qc.measure_all()

print("Bell state circuit created")
print(qc)'''

        elif 'random' in description_lower or 'rng' in description_lower:
            return f'''from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister

# Quantum Random Number Generator
qr = QuantumRegister({qubits}, 'q')
cr = ClassicalRegister({qubits}, 'c')
qc = QuantumCircuit(qr, cr)

# Put all qubits in superposition
for i in range({qubits}):
    qc.h(i)

# Measure all qubits
qc.measure_all()

print("Quantum Random Number Generator created")
print(qc)'''

        else:
            # Generic circuit
            return f'''from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister

# Generic quantum circuit
qr = QuantumRegister({qubits}, 'q')
cr = ClassicalRegister({qubits}, 'c')
qc = QuantumCircuit(qr, cr)

# Apply Hadamard gates to create superposition
for i in range({qubits}):
    qc.h(i)

# Add some entanglement
if {qubits} > 1:
    for i in range({qubits-1}):
        qc.cx(i, i+1)

# Measure all qubits
qc.measure_all()

print("Quantum circuit created")
print(qc)'''

    def chat_about_quantum(self, user_message: str) -> str:
        """
        Provide human-like responses about quantum computing.
        """
        if 'chat_assistant' not in self.models or self.download_status['chat_assistant'] != 'ready':
            return self._fallback_quantum_chat(user_message)

        try:
            context = self._get_quantum_context(user_message)

            prompt = f"""You are a quantum computing expert having a natural conversation. Answer this question helpfully and accurately: "{user_message}"

Context: {context}

Keep your response conversational but technically accurate. If explaining concepts, use analogies when helpful. Be encouraging and clear."""

            pipeline = self.pipelines['chat_assistant']
            outputs = pipeline(prompt, max_new_tokens=300, num_return_sequences=1)

            response = outputs[0]['generated_text'].replace(prompt, '').strip()

            # Clean up response
            if response.startswith('"') and response.endswith('"'):
                response = response[1:-1]

            return response

        except Exception as e:
            logger.error(f"Error in quantum chat: {e}")
            return self._fallback_quantum_chat(user_message)

    def _get_quantum_context(self, message: str) -> str:
        """Get relevant quantum context for the message."""
        message_lower = message.lower()

        contexts = []

        # Check for keywords and add relevant context
        if any(word in message_lower for word in ['qubit', 'superposition', 'entangl']):
            contexts.extend(self.quantum_knowledge['quantum_basics'])

        if 'grover' in message_lower:
            contexts.append(self.quantum_knowledge['algorithms']['grover'])
        if 'shor' in message_lower:
            contexts.append(self.quantum_knowledge['algorithms']['shor'])
        if 'fourier' in message_lower or 'qft' in message_lower:
            contexts.append(self.quantum_knowledge['algorithms']['qft'])

        if any(gate in message_lower for gate in ['hadamard', 'cnot', 'pauli']):
            gate_info = [f"{k}: {v}" for k, v in self.quantum_knowledge['gates'].items()]
            contexts.extend(gate_info)

        return " ".join(contexts[:3])  # Limit context length

    def _fallback_quantum_chat(self, message: str) -> str:
        """Fallback chat responses when AI model is not available."""
        message_lower = message.lower()

        responses = {
            'hello': "Hello! I'm your quantum computing assistant. I can help you understand quantum concepts, generate circuits, or answer questions about quantum algorithms. What would you like to know?",
            'what is quantum': "Quantum computing uses quantum mechanics to perform calculations. Unlike classical computers that use bits (0 or 1), quantum computers use qubits that can be both 0 and 1 simultaneously through superposition!",
            'entanglement': "Entanglement is when two qubits become linked such that the state of one instantly affects the other, no matter the distance. It's one of the key principles that makes quantum computing powerful.",
            'superposition': "Superposition means a qubit can exist in multiple states at once. A quantum computer with n qubits can represent 2^n states simultaneously!",
            'grover': "Grover's algorithm provides a quadratic speedup for searching unsorted databases. For a database of N items, it finds the answer in roughly sqrtN steps instead of N/2.",
            'shor': "Shor's algorithm can factor large numbers exponentially faster than classical computers. This could break current encryption methods like RSA.",
            'help': "I can help you with:\n• Explaining quantum concepts\n• Generating quantum circuits\n• Answering questions about algorithms\n• Understanding quantum gates\n\nJust ask me anything quantum-related!"
        }

        # Find matching response
        for key, response in responses.items():
            if key in message_lower:
                return response

        # Default response
        return "That's an interesting quantum question! I'm here to help you understand quantum computing concepts, generate circuits, or explain algorithms. Could you be more specific about what you'd like to know?"

    def get_similar_quantum_concepts(self, query: str, top_k: int = 3) -> List[str]:
        """
        Find similar quantum concepts using embeddings.
        """
        if 'embedding_model' not in self.models or self.download_status['embedding_model'] != 'ready':
            return []

        try:
            # Get all quantum concepts
            all_concepts = []
            all_concepts.extend(self.quantum_knowledge['quantum_basics'])
            all_concepts.extend([f"{k}: {v}" for k, v in self.quantum_knowledge['algorithms'].items()])
            all_concepts.extend([f"{k}: {v}" for k, v in self.quantum_knowledge['gates'].items()])
            all_concepts.extend([f"{k}: {v}" for k, v in self.quantum_knowledge['terminology'].items()])

            # Encode query and concepts
            model = self.models['embedding_model']
            query_embedding = model.encode([query])[0]
            concept_embeddings = model.encode(all_concepts)

            # Calculate similarities
            similarities = []
            for i, concept in enumerate(all_concepts):
                similarity = torch.cosine_similarity(
                    torch.tensor(query_embedding),
                    torch.tensor(concept_embeddings[i]),
                    dim=0
                ).item()
                similarities.append((concept, similarity))

            # Sort by similarity and return top_k
            similarities.sort(key=lambda x: x[1], reverse=True)
            return [concept for concept, _ in similarities[:top_k]]

        except Exception as e:
            logger.error(f"Error finding similar concepts: {e}")
            return []

    def get_model_status(self) -> Dict[str, str]:
        """Get the status of all models."""
        return self.download_status.copy()

    def is_model_ready(self, model_key: str) -> bool:
        """Check if a specific model is ready to use."""
        return self.download_status.get(model_key) == 'ready'

    def get_available_models(self) -> List[str]:
        """Get list of available (downloaded and ready) models."""
        return [model for model, status in self.download_status.items() if status == 'ready']

    def optimize_for_quantum_tasks(self):
        """Apply quantum-specific optimizations to models."""
        # This could include fine-tuning prompts, adding quantum context, etc.
        logger.info("Applying quantum-specific optimizations...")

        # Custom quantum prompts and templates
        self.quantum_prompts = {
            'circuit_explanation': """
You are explaining a quantum circuit to a student. Break down each gate and its purpose clearly.
Circuit: {{circuit}}
Explanation:""",

            'algorithm_choice': """
Given this problem: {{problem}}
Which quantum algorithm would be most appropriate? Explain why.
Recommendation:""",

            'debug_quantum': """
This quantum circuit has an issue: {{circuit}}
What's wrong and how to fix it?
Analysis:"""
        }

        logger.info("Quantum optimizations applied")

# Global instance for the application
quantum_ai = QuantumAIService()

def initialize_quantum_ai():
    """Initialize and download quantum AI models."""
    logger.info("Initializing Quantum AI Service...")

    # Start downloading models in background
    def download_worker():
        try:
            results = quantum_ai.download_all_models()
            successful = sum(1 for result in results.values() if result)
            logger.info(f"Quantum AI initialization complete: {successful}/{len(results)} models downloaded")
        except Exception as e:
            logger.error(f"Error during quantum AI initialization: {e}")

    thread = threading.Thread(target=download_worker, daemon=True)
    thread.start()

    return quantum_ai

if __name__ == "__main__":
    # Test the service
    print("Testing Quantum AI Service...")

    ai_service = QuantumAIService()

    # Test basic functionality
    print("Testing fallback responses...")
    response = ai_service.chat_about_quantum("What is superposition?")
    print(f"Response: {response}")

    print("Testing circuit generation...")
    circuit = ai_service.generate_quantum_circuit("Create a Bell state", 2)
    print(f"Circuit: {circuit[:200]}...")

    print("Quantum AI Service test complete!")
