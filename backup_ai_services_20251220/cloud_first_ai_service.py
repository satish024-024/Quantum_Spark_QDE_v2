"""
Cloud-First AI Service - All Quantum AI Through Cloud APIs
No local model downloads required. All AI functionality through cloud providers.
"""

import os
import json
import logging
import requests
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import time
import threading
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CloudFirstAIService:
    """
    Cloud-first AI service that provides all quantum AI functionality through APIs.
    No local models required - perfect for web deployment.
    """

    def __init__(self):
        self.api_keys = self._load_api_keys()
        self.providers = {
            'huggingface': self._init_huggingface(),
            'openai': self._init_openai(),
            'anthropic': self._init_anthropic(),
            'together': self._init_together(),
            'replicate': self._init_replicate()
        }

        # Provider priority: Try in this order for reliability
        # Start with HuggingFace since it's free and configured, then fallbacks
        self.provider_priority = ['huggingface', 'together', 'openai', 'anthropic', 'replicate']

        # Quantum datasets available on Hugging Face
        self.quantum_datasets = {
            'quantum_llm_instruct': 'BoltzmannEntropy/QuantumLLMInstruct',  # Quantum algorithm instructions
            'quantum_texts': 'wesley7137/quantum',
            'quantum_qa': 'CoAILab/qna-quantum-information',
            'quantum_ml': 'shwetha729/quantum-machine-learning',
            'quantum_stackexchange': 'mlfoundations-dev/stackexchange_quantumcomputing',
            'quantum_field_theory': 'RaagulQB/quantum-field-theory-instruct',
            'quantum_physics': 'quantum-physics/quantum-datasets'  # General quantum physics
        }

        # Rate limiting and caching
        self.cache = {}
        self.cache_timeout = 1800  # 30 minutes cache
        self.rate_limits = {}
        self.executor = ThreadPoolExecutor(max_workers=4)

        # Quantum knowledge base for fallbacks
        self.quantum_knowledge = self._initialize_quantum_knowledge()

        logger.info("Cloud-First AI Service initialized - No local models needed!")

    def _load_api_keys(self) -> Dict[str, str]:
        """Load API keys from environment or config files."""
        keys = {}

        # Try environment variables first
        keys['huggingface'] = os.environ.get('HUGGINGFACE_API_KEY', '')
        keys['openai'] = os.environ.get('OPENAI_API_KEY', '')
        keys['anthropic'] = os.environ.get('ANTHROPIC_API_KEY', '')
        keys['together'] = os.environ.get('TOGETHER_API_KEY', '')
        keys['replicate'] = os.environ.get('REPLICATE_API_KEY', '')

        # Try to load from config file
        config_file = os.path.join(os.path.dirname(__file__), 'cloud_ai_config.json')
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    config_keys = json.load(f)
                    keys.update(config_keys)
            except Exception as e:
                logger.warning(f"Could not load config file: {e}")

        return keys

    def _init_huggingface(self) -> Dict[str, Any]:
        """Initialize Hugging Face Inference API - FREE option with Quantum Models."""
        return {
            'available': bool(self.api_keys.get('huggingface')),
            'name': 'Hugging Face Quantum',
            'cost': 'Free',
            'rate_limit': 3000,  # requests per hour
            'models': {
                'circuit_gen': 'gpt2',  # Primary: Reliable text generation
                'chat': 'microsoft/DialoGPT-medium',  # Primary: Conversational model
                'reasoning': 'google/flan-t5-small',  # Primary: Instruction-following (smaller model)
                'fallback_chat': 'gpt2',  # Fallback: Always available
                'fallback_gen': 'distilgpt2'  # Fallback: Lightweight generation
            }
        }

    def _init_openai(self) -> Dict[str, Any]:
        """Initialize OpenAI API."""
        return {
            'available': bool(self.api_keys.get('openai')),
            'name': 'OpenAI GPT',
            'cost': 'Pay per use',
            'rate_limit': 10000,
            'models': {
                'circuit_gen': 'gpt-4-turbo-preview',
                'chat': 'gpt-4',
                'reasoning': 'gpt-4-turbo-preview'
            }
        }

    def _init_anthropic(self) -> Dict[str, Any]:
        """Initialize Anthropic Claude API."""
        return {
            'available': bool(self.api_keys.get('anthropic')),
            'name': 'Anthropic Claude',
            'cost': 'Pay per use',
            'rate_limit': 1000,
            'models': {
                'circuit_gen': 'claude-3-5-sonnet-20241022',
                'chat': 'claude-3-5-haiku-20241022',
                'reasoning': 'claude-3-5-sonnet-20241022'
            }
        }

    def _init_together(self) -> Dict[str, Any]:
        """Initialize Together AI - Affordable open-source models."""
        return {
            'available': bool(self.api_keys.get('together')),
            'name': 'Together AI',
            'cost': 'Low cost',
            'rate_limit': 1000,
            'models': {
                'circuit_gen': 'codellama/CodeLlama-34b-Instruct-hf',
                'chat': 'mistralai/Mixtral-8x7B-Instruct-v0.1',
                'reasoning': 'mistralai/Mixtral-8x7B-Instruct-v0.1'
            }
        }

    def _init_replicate(self) -> Dict[str, Any]:
        """Initialize Replicate - Runs models in cloud."""
        return {
            'available': bool(self.api_keys.get('replicate')),
            'name': 'Replicate',
            'cost': 'Pay per use',
            'rate_limit': 1000,
            'models': {
                'circuit_gen': 'codellama/codellama-34b-instruct:1bebd464eee7e47c6c3794b3ba4b71a5262a73210bbefb1fcab1914f2f21b7',
                'chat': 'mistralai/mistral-7b-instruct-v0.1:83b6a56e7c828e667f21fd596c338fd4f0039b46bcfa18d973e8e70e'
            }
        }

    def _initialize_quantum_knowledge(self) -> Dict[str, Any]:
        """Initialize comprehensive quantum knowledge base for fallbacks."""
        return {
            'basics': {
                'superposition': 'Quantum superposition allows qubits to exist in multiple states simultaneously, enabling parallel computation across 2^n states for n qubits',
                'entanglement': 'Quantum entanglement creates non-local correlations between qubits that persist over distance, enabling quantum communication and teleportation',
                'measurement': 'Quantum measurement collapses superposition to a classical state with probabilities determined by the Born rule |ψ|²',
                'interference': 'Quantum states can constructively or destructively interfere, enabling quantum algorithms to amplify correct answers',
                'decoherence': 'Quantum decoherence causes loss of quantum properties due to environmental interaction, limiting quantum computation time',
                'no_cloning': 'The no-cloning theorem states that arbitrary quantum states cannot be perfectly copied'
            },
            'gates': {
                'h': 'Hadamard gate creates superposition: |0⟩ → (|0⟩ + |1⟩)/√2, |1⟩ → (|0⟩ - |1⟩)/√2',
                'cx': 'CNOT gate creates entanglement between qubits: |00⟩ → |00⟩, |01⟩ → |01⟩, |10⟩ → |11⟩, |11⟩ → |10⟩',
                'x': 'Pauli-X gate flips qubit state: |0⟩ ↔ |1⟩ (quantum NOT gate)',
                'y': 'Pauli-Y gate: |0⟩ → i|1⟩, |1⟩ → -i|0⟩ (rotation around Y-axis)',
                'z': 'Pauli-Z gate adds phase: |0⟩ → |0⟩, |1⟩ → -|1⟩',
                'rx': 'Rotation around X-axis by angle θ: RX(θ) = cos(θ/2)I - i sin(θ/2)X',
                'ry': 'Rotation around Y-axis by angle θ: RY(θ) = cos(θ/2)I - i sin(θ/2)Y',
                'rz': 'Rotation around Z-axis by angle θ: RZ(θ) = cos(θ/2)I - i sin(θ/2)Z',
                's': 'S gate adds π/2 phase: |0⟩ → |0⟩, |1⟩ → i|1⟩',
                't': 'T gate adds π/4 phase: |0⟩ → |0⟩, |1⟩ → e^(iπ/4)|1⟩',
                'ccx': 'Toffoli gate (CCX): 3-qubit controlled-controlled-X gate, universal for classical computation'
            },
            'algorithms': {
                'grover': 'Grover search provides quadratic speedup O(√N) for unstructured search in database of N items',
                'shor': 'Shor algorithm factors integers exponentially faster than classical methods using quantum period finding',
                'qft': 'Quantum Fourier Transform maps |j⟩ → (1/√N) Σ e^(2πijk/N)|k⟩, fundamental to many quantum algorithms',
                'vqe': 'Variational Quantum Eigensolver finds ground state energies using quantum-classical hybrid optimization',
                'qaoa': 'Quantum Approximate Optimization Algorithm solves combinatorial optimization problems',
                'hhl': 'HHL algorithm solves linear systems Ax=b exponentially faster for sparse matrices',
                'deutsch_jozsa': 'Deutsch-Jozsa algorithm determines if function is constant or balanced with single query',
                'bernstein_vazirani': 'Bernstein-Vazirani algorithm finds hidden bit string with single quantum query',
                'simons': 'Simon algorithm finds hidden period in function with exponential speedup over classical methods'
            },
            'quantum_ml': {
                'qsvm': 'Quantum Support Vector Machine uses quantum feature maps for classification',
                'qnn': 'Quantum Neural Networks use parameterized quantum circuits for machine learning',
                'qgan': 'Quantum Generative Adversarial Networks for quantum data generation',
                'qpca': 'Quantum Principal Component Analysis for dimensionality reduction',
                'qkmeans': 'Quantum K-means clustering algorithm using quantum distance estimation'
            },
            'error_correction': {
                'surface_code': 'Surface code is a topological quantum error correction code with high threshold',
                'stabilizer': 'Stabilizer codes detect and correct quantum errors using stabilizer generators',
                'shor_code': 'Shor code corrects arbitrary single-qubit errors using 9 qubits',
                'steane_code': 'Steane code is a 7-qubit CSS code that corrects single-qubit errors'
            },
            'quantum_hardware': {
                'superconducting': 'Superconducting qubits use Josephson junctions, fast gates but require dilution refrigeration',
                'trapped_ion': 'Trapped ion qubits use laser-controlled ions, high fidelity but slower gates',
                'photonic': 'Photonic qubits use light particles, room temperature operation but probabilistic gates',
                'topological': 'Topological qubits use anyons, theoretically error-resistant but experimental',
                'neutral_atom': 'Neutral atom qubits use laser-trapped atoms, scalable with reconfigurable connectivity'
            }
        }

    def general_chat(self, message: str) -> str:
        """
        General chat using cloud AI for any type of question.
        This handles all types of questions, not just quantum computing.
        """
        try:
            cache_key = f"general_chat_{message}"
            cached_result = self._get_cached_result(cache_key)
            if cached_result:
                logger.info("Returning cached general chat response")
                return cached_result

            # General purpose prompt for any type of question
            prompt = f"""You are a helpful and knowledgeable AI assistant. Answer this question clearly and accurately.

Question: {message}

Provide a helpful, informative response. Be friendly and engaging."""

            # Try providers in priority order
            for provider_name in self.provider_priority:
                provider = self.providers[provider_name]
                if not provider['available']:
                    logger.info(f"Skipping {provider_name} - not available")
                    continue

                try:
                    logger.info(f"Trying {provider_name} for general chat")
                    response = self._call_provider(provider_name, 'chat', prompt)
                    if response and len(response.strip()) > 10:  # Valid response
                        self._cache_result(cache_key, response)
                        logger.info(f"General chat response from {provider_name}")
                        return response
                    else:
                        logger.warning(f"{provider_name} returned empty or short response")
                except Exception as e:
                    logger.warning(f"{provider_name} general chat failed: {e}")
                    continue

            # Ultimate fallback for general questions
            logger.info("All providers failed, using fallback")
            return self._basic_general_fallback(message)
            
        except Exception as e:
            logger.error(f"Critical error in general_chat: {e}")
            return f"I apologize, but I'm experiencing technical difficulties. Error: {str(e)[:100]}. Please try again in a moment."

    def chat_about_quantum(self, message: str) -> str:
        """
        Chat about quantum computing using cloud AI.
        This is the primary interface for quantum conversations.
        """
        cache_key = f"quantum_chat_{message}"
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result

        # Create enhanced prompt with quantum context
        context = self._get_quantum_context(message)
        prompt = f"""You are an expert quantum computing AI assistant. Answer this question helpfully and accurately about quantum computing.

Question: {message}

Relevant quantum context: {context}

Provide a clear, accurate answer. If explaining concepts, use analogies when helpful. Be encouraging and educational."""

        # Try providers in priority order
        for provider_name in self.provider_priority:
            provider = self.providers[provider_name]
            if not provider['available']:
                continue

            try:
                response = self._call_provider(provider_name, 'chat', prompt)
                if response and len(response.strip()) > 10:  # Valid response
                    self._cache_result(cache_key, response)
                    logger.info(f"Quantum chat response from {provider_name}")
                    return response
            except Exception as e:
                logger.warning(f"{provider_name} quantum chat failed: {e}")
                continue

        # Ultimate fallback
        return self._basic_quantum_fallback(message)

    def generate_quantum_circuit(self, description: str, qubits: int = 2) -> Dict[str, Any]:
        """
        Generate quantum circuit from natural language description using cloud AI.
        """
        cache_key = f"circuit_{description}_{qubits}"
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result

        prompt = f"""Create executable Qiskit code for: {description}

IMPORTANT: Return ONLY Python code, no explanations or markdown.

from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister
import numpy as np

# Create {qubits}-qubit circuit for {description}
qr = QuantumRegister({qubits}, 'q')
cr = ClassicalRegister({qubits}, 'c')
qc = QuantumCircuit(qr, cr)

# Add gates for {description}
# [GENERATE APPROPRIATE GATES HERE]

# Measure all qubits
qc.measure_all()

print(f"Circuit: {description}")
print(qc.draw())"""

        # Try providers in priority order
        for provider_name in self.provider_priority:
            provider = self.providers[provider_name]
            if not provider['available']:
                continue

            try:
                response = self._call_provider(provider_name, 'circuit_gen', prompt)
                if response:
                    circuit_code = self._extract_code_from_response(response)
                    if circuit_code and self._validate_circuit_code(circuit_code):
                        result = {
                            'success': True,
                            'code': circuit_code,
                            'description': description,
                            'qubits': qubits,
                            'provider': provider_name,
                            'generated_by': f'cloud_{provider_name}'
                        }
                        self._cache_result(cache_key, result)
                        logger.info(f"Circuit generated by {provider_name}")
                        return result
            except Exception as e:
                logger.warning(f"{provider_name} circuit generation failed: {e}")
                continue

        # Fallback to template-based generation
        return self._generate_circuit_fallback(description, qubits)

    def find_similar_concepts(self, query: str, top_k: int = 3) -> List[str]:
        """
        Find similar quantum concepts using cloud AI.
        """
        cache_key = f"concepts_{query}_{top_k}"
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result

        prompt = f"""Given the quantum computing concept "{query}", list {top_k} closely related quantum concepts or terms.

Return only a comma-separated list of related concepts, no explanations:
"""

        # Try providers for concept similarity
        for provider_name in ['openai', 'anthropic', 'together', 'huggingface']:
            provider = self.providers[provider_name]
            if not provider['available']:
                continue

            try:
                response = self._call_provider(provider_name, 'chat', prompt)
                if response:
                    concepts = [c.strip() for c in response.split(',') if c.strip()]
                    if len(concepts) >= top_k:
                        result = concepts[:top_k]
                        self._cache_result(cache_key, result)
                        return result
            except Exception as e:
                logger.warning(f"{provider_name} concept search failed: {e}")
                continue

        # Fallback to local knowledge base
        return self._basic_concept_similarity(query, top_k)

    def generate_response(self, prompt: str, task_type: str = 'chat') -> str:
        """
        Generate a response using cloud AI for any task type.
        This is a unified method for all AI generation tasks.
        """
        cache_key = f"generate_{task_type}_{prompt[:50]}"
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result

        # Map task types to appropriate methods
        if task_type == 'circuit_gen':
            # For circuit generation, use the specialized method
            result = self.generate_quantum_circuit(prompt)
            if result and result.get('success'):
                response = result.get('code', '')
            else:
                response = "Failed to generate circuit code."
        elif task_type == 'analysis':
            # For analysis tasks, use quantum chat
            response = self.chat_about_quantum(prompt)
        else:
            # For general tasks, use general chat
            response = self.general_chat(prompt)

        # Cache and return the response
        if response:
            self._cache_result(cache_key, response)
            return response
        else:
            return "I'm sorry, I couldn't generate a response at the moment. Please try again."

    def _call_provider(self, provider_name: str, task: str, prompt: str) -> Optional[str]:
        """Call a specific cloud AI provider."""
        provider = self.providers[provider_name]

        if provider_name == 'huggingface':
            return self._call_huggingface(provider, task, prompt)
        elif provider_name == 'openai':
            return self._call_openai(provider, task, prompt)
        elif provider_name == 'anthropic':
            return self._call_anthropic(provider, task, prompt)
        elif provider_name == 'together':
            return self._call_together(provider, task, prompt)
        elif provider_name == 'replicate':
            return self._call_replicate(provider, task, prompt)

        return None

    def _call_huggingface(self, provider: Dict, task: str, prompt: str) -> Optional[str]:
        """Call Hugging Face Inference API with quantum models and fallbacks."""
        # Try quantum-specific models first, then fallback models
        models_to_try = []
        
        # Primary quantum model
        if task in provider['models']:
            models_to_try.append(provider['models'][task])
        
        # Fallback models for different tasks
        if task == 'chat' and 'fallback_chat' in provider['models']:
            models_to_try.append(provider['models']['fallback_chat'])
        elif task in ['circuit_gen', 'reasoning'] and 'fallback_gen' in provider['models']:
            models_to_try.append(provider['models']['fallback_gen'])
        
        # Try each model in sequence
        for model in models_to_try:
            try:
                logger.info(f"Trying Hugging Face model: {model} for task: {task}")
                result = self._try_single_hf_model(model, prompt)
                if result:
                    logger.info(f"Success with model: {model}")
                    return result
                else:
                    logger.warning(f"Model {model} returned empty result, trying next...")
            except Exception as e:
                logger.warning(f"Model {model} failed: {e}, trying next...")
                continue
        
        return None
    
    def _try_single_hf_model(self, model: str, prompt: str) -> Optional[str]:
        """Try a single Hugging Face model using correct API format."""
        try:
            url = f"https://api-inference.huggingface.co/models/{model}"

            headers = {
                'Authorization': f'Bearer {self.api_keys["huggingface"]}',
                'Content-Type': 'application/json'
            }

            # Use the correct Hugging Face API format based on documentation
            # Different models require different input formats
            
            if 'dialogpt' in model.lower():
                # DialoGPT expects conversational format
                data = {
                    'inputs': {
                        'past_user_inputs': [],
                        'generated_responses': [],
                        'text': prompt
                    },
                    'parameters': {
                        'temperature': 0.7,
                        'max_length': 200,
                        'do_sample': True
                    },
                    'options': {
                        'wait_for_model': True,
                        'use_cache': True
                    }
                }
            elif 'flan-t5' in model.lower():
                # T5 models expect text-to-text format
                data = {
                    'inputs': f"Answer this question: {prompt}",
                    'parameters': {
                        'max_new_tokens': 150,
                        'temperature': 0.6,
                        'do_sample': True,
                        'top_p': 0.9
                    },
                    'options': {
                        'wait_for_model': True,
                        'use_cache': True
                    }
                }
            elif 'blenderbot' in model.lower():
                # BlenderBot expects simple text input
                data = {
                    'inputs': prompt,
                    'parameters': {
                        'max_length': 200,
                        'temperature': 0.7,
                        'do_sample': True
                    },
                    'options': {
                        'wait_for_model': True,
                        'use_cache': True
                    }
                }
            else:
                # Generic text generation format (for GPT-2, DistilGPT-2, etc.)
                data = {
                    'inputs': prompt,
                    'parameters': {
                        'max_new_tokens': 100,
                        'temperature': 0.7,
                        'do_sample': True,
                        'top_p': 0.9,
                        'return_full_text': False
                    },
                    'options': {
                        'wait_for_model': True,
                        'use_cache': True
                    }
                }

            response = requests.post(url, headers=headers, json=data, timeout=60)
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    logger.info(f"HuggingFace API response received: {type(result)}")
                    
                    # Handle different response formats
                    if isinstance(result, list) and result:
                        if isinstance(result[0], dict):
                            generated_text = result[0].get('generated_text', '').strip()
                        else:
                            generated_text = str(result[0]).strip()
                    elif isinstance(result, dict):
                        generated_text = result.get('generated_text', result.get('text', '')).strip()
                    elif isinstance(result, str):
                        generated_text = result.strip()
                    else:
                        logger.warning(f"Unexpected response format: {type(result)}")
                        generated_text = str(result).strip()
                    
                    if generated_text and len(generated_text) > 5:
                        logger.info(f"Generated text: {generated_text[:100]}...")
                        return generated_text
                    else:
                        logger.warning("Empty or very short response from HuggingFace")
                        return None
                        
                except json.JSONDecodeError as e:
                    logger.error(f"JSON decode error: {e}")
                    # Try to return raw text if JSON parsing fails
                    if response.text and len(response.text.strip()) > 5:
                        return response.text.strip()
                    return None
                    
            elif response.status_code == 503:
                logger.warning("HuggingFace model is loading")
                return "The AI model is currently loading. Please try your question again in a moment."
            elif response.status_code == 429:
                logger.warning("HuggingFace rate limit exceeded")
                return "AI service is temporarily busy. Please try again in a few moments."
            elif response.status_code == 401:
                logger.error("HuggingFace authentication failed - check API key")
                return "🔑 AI service authentication failed. Please add a valid Hugging Face API key to cloud_ai_config.json. Get a free key at https://huggingface.co/settings/tokens"
            elif response.status_code == 400:
                logger.error(f"HuggingFace bad request: {response.text}")
                return "AI service received an invalid request. Please try rephrasing your question."
            else:
                logger.warning(f"HuggingFace API error: HTTP {response.status_code} - {response.text}")
                return None

        except requests.exceptions.Timeout:
            logger.warning("HuggingFace API timeout")
            return "AI service is taking too long to respond. Please try a simpler question."
        except requests.exceptions.ConnectionError:
            logger.error("HuggingFace API connection error")
            return "Unable to connect to AI service. Please check your internet connection."
        except Exception as e:
            logger.error(f"HuggingFace API unexpected error: {e}")
            return None

    def _call_openai(self, provider: Dict, task: str, prompt: str) -> Optional[str]:
        """Call OpenAI API."""
        model = provider['models'][task]
        url = "https://api.openai.com/v1/chat/completions"

        headers = {
            'Authorization': f'Bearer {self.api_keys["openai"]}',
            'Content-Type': 'application/json'
        }

        data = {
            'model': model,
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 1024,
            'temperature': 0.7
        }

        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content'].strip()
            return None
        except Exception as e:
            logger.warning(f"OpenAI API error: {e}")
            return None

    def _call_anthropic(self, provider: Dict, task: str, prompt: str) -> Optional[str]:
        """Call Anthropic Claude API."""
        model = provider['models'][task]
        url = "https://api.anthropic.com/v1/messages"

        headers = {
            'x-api-key': self.api_keys["anthropic"],
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        }

        data = {
            'model': model,
            'max_tokens': 1024,
            'messages': [{'role': 'user', 'content': prompt}]
        }

        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            if response.status_code == 200:
                result = response.json()
                return result['content'][0]['text'].strip()
            return None
        except Exception as e:
            logger.warning(f"Anthropic API error: {e}")
            return None

    def _call_together(self, provider: Dict, task: str, prompt: str) -> Optional[str]:
        """Call Together AI API."""
        model = provider['models'][task]
        url = "https://api.together.xyz/v1/chat/completions"

        headers = {
            'Authorization': f'Bearer {self.api_keys["together"]}',
            'Content-Type': 'application/json'
        }

        data = {
            'model': model,
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 1024,
            'temperature': 0.7
        }

        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content'].strip()
            return None
        except Exception as e:
            logger.warning(f"Together AI error: {e}")
            return None

    def _call_replicate(self, provider: Dict, task: str, prompt: str) -> Optional[str]:
        """Call Replicate API."""
        model = provider['models'][task]
        url = "https://api.replicate.com/v1/predictions"

        headers = {
            'Authorization': f'Bearer {self.api_keys["replicate"]}',
            'Content-Type': 'application/json'
        }

        data = {
            'version': model.split(':')[1],
            'input': {
                'prompt': prompt,
                'max_new_tokens': 1024,
                'temperature': 0.7
            }
        }

        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            if response.status_code == 201:
                prediction = response.json()
                prediction_url = prediction['urls']['get']

                # Wait for result
                for _ in range(60):  # Max 60 attempts (30 seconds)
                    time.sleep(0.5)
                    result_response = requests.get(prediction_url, headers=headers)
                    if result_response.status_code == 200:
                        result_data = result_response.json()
                        if result_data['status'] == 'succeeded':
                            return result_data['output'].strip()
                        elif result_data['status'] == 'failed':
                            break
            return None
        except Exception as e:
            logger.warning(f"Replicate API error: {e}")
            return None

    def _extract_code_from_response(self, response: str) -> Optional[str]:
        """Extract Python code from AI response."""
        # Look for code blocks first
        if '```python' in response:
            start = response.find('```python') + 9
            end = response.find('```', start)
            if end > start:
                code = response[start:end].strip()
                return self._clean_code(code)
        elif '```' in response:
            start = response.find('```') + 3
            end = response.find('```', start)
            if end > start:
                code = response[start:end].strip()
                # Check if it looks like Python
                if 'from qiskit' in code or 'QuantumCircuit' in code:
                    return self._clean_code(code)

        # If no code blocks, try to extract code-like content
        lines = response.split('\n')
        code_lines = []
        in_code = False

        for line in lines:
            stripped = line.strip()
            if stripped.startswith(('from qiskit', 'import numpy', 'import', 'qr =', 'cr =', 'qc =', '# Create')):
                in_code = True
                code_lines.append(line)
            elif in_code and (stripped.startswith(('qc.', 'print(', '#')) or 'qubits' in stripped):
                code_lines.append(line)
            elif in_code and not stripped:
                # Allow empty lines within code
                code_lines.append(line)
            elif in_code and not any(keyword in stripped.lower() for keyword in ['qiskit', 'quantum', 'circuit', 'qubit', 'gate', 'measure']):
                # Stop if we hit non-quantum related content
                break

        if code_lines:
            code = '\n'.join(code_lines)
            return self._clean_code(code)

        # Last resort: if response looks like code, return it
        if 'from qiskit' in response and 'QuantumCircuit' in response:
            return self._clean_code(response)

        return None

    def _clean_code(self, code: str) -> str:
        """Clean and format the extracted code."""
        # Remove common AI response artifacts
        code = code.replace('```python', '').replace('```', '')
        
        # Remove leading/trailing whitespace
        code = code.strip()
        
        # Ensure proper imports are at the top
        lines = code.split('\n')
        import_lines = []
        other_lines = []
        
        for line in lines:
            stripped = line.strip()
            if stripped.startswith(('from qiskit', 'import numpy', 'import')):
                import_lines.append(line)
            elif stripped:  # Skip empty lines for now
                other_lines.append(line)
        
        # Reconstruct with imports first
        if import_lines and other_lines:
            return '\n'.join(import_lines) + '\n\n' + '\n'.join(other_lines)
        
        return code

    def _validate_circuit_code(self, code: str) -> bool:
        """Basic validation of generated circuit code."""
        # Must have basic quantum circuit elements
        has_circuit = 'QuantumCircuit' in code
        has_qiskit_import = 'from qiskit' in code or 'import qiskit' in code
        has_quantum_operations = any(op in code for op in ['qc.', '.h(', '.x(', '.cnot(', '.measure'])
        
        return has_circuit and has_qiskit_import and has_quantum_operations

    def _generate_circuit_fallback(self, description: str, qubits: int) -> Dict[str, Any]:
        """Generate circuit using templates when AI fails."""
        description_lower = description.lower()

        if 'bell' in description_lower or 'entangl' in description_lower:
            code = f'''from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister

# Bell state preparation circuit
qr = QuantumRegister({qubits}, 'q')
cr = ClassicalRegister({qubits}, 'c')
qc = QuantumCircuit(qr, cr)

# Create superposition on first qubit
qc.h(0)

# Entangle all qubits
for i in range({qubits-1}):
    qc.cx(i, i+1)

# Measure all qubits
qc.measure_all()

print("Bell state circuit created")
print(qc)'''
        elif 'random' in description_lower or 'rng' in description_lower:
            code = f'''from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister

# Quantum Random Number Generator
qr = QuantumRegister({qubits}, 'q')
cr = ClassicalRegister({qubits}, 'c')
qc = QuantumCircuit(qr, cr)

# Put all qubits in superposition
for i in range({qubits}):
    qc.h(i)

# Measure all qubits
qc.measure_all()

print("Quantum Random Number Generator")
print(qc)'''
        else:
            # Generic circuit
            code = f'''from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister

# Custom quantum circuit: {description}
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

        return {
            'success': True,
            'code': code,
            'description': description,
            'qubits': qubits,
            'provider': 'fallback',
            'generated_by': 'template_fallback'
        }

    def _get_quantum_context(self, message: str) -> str:
        """Get relevant quantum context for better AI responses."""
        message_lower = message.lower()
        contexts = []

        # Add relevant context based on keywords
        if any(word in message_lower for word in ['qubit', 'superposition', 'state']):
            contexts.append(self.quantum_knowledge['basics']['superposition'])

        if 'entangl' in message_lower:
            contexts.append(self.quantum_knowledge['basics']['entanglement'])

        if 'grover' in message_lower:
            contexts.append(self.quantum_knowledge['algorithms']['grover'])

        if 'shor' in message_lower:
            contexts.append(self.quantum_knowledge['algorithms']['shor'])

        if any(word in message_lower for word in ['gate', 'h ', 'x ', 'z ', 'cx']):
            gate_info = [f"{k}: {v}" for k, v in self.quantum_knowledge['gates'].items() if k in message_lower]
            contexts.extend(gate_info)

        return " ".join(contexts[:2]) if contexts else "Quantum computing fundamentals"

    def _basic_quantum_fallback(self, message: str) -> str:
        """Basic quantum response when all APIs fail."""
        message_lower = message.lower()

        responses = {
            'hello': "Hello! I'm your quantum computing AI assistant. I can help you understand quantum concepts, generate circuits, and answer questions about quantum algorithms. What would you like to know?",
            'what is quantum': "Quantum computing uses quantum mechanics to perform calculations. Unlike classical computers that use bits (0 or 1), quantum computers use qubits that can exist in multiple states simultaneously, enabling powerful parallel computation!",
            'entanglement': "Quantum entanglement is when two qubits become linked such that the state of one instantly affects the other, no matter the distance. This property enables quantum communication and teleportation.",
            'superposition': "Superposition means a qubit can be in multiple states at once. A quantum computer with n qubits can represent 2^n states simultaneously, giving quantum computers their incredible parallel processing power!",
            'grover': "Grover's algorithm provides a quadratic speedup for searching unsorted databases. It can find an item in an unsorted database of N items in roughly √N steps, compared to N/2 steps classically.",
            'shor': "Shor's algorithm can factor large numbers exponentially faster than classical computers. This breakthrough could break current encryption methods like RSA.",
            'bell': "A Bell state is a specific type of entangled quantum state that demonstrates quantum correlation. The most famous is |Φ+⟩ = (|00⟩ + |11⟩)/√2, where measuring one qubit instantly determines the other's state.",
            'hadamard': "The Hadamard gate creates superposition. It transforms |0⟩ into (|0⟩ + |1⟩)/√2 and |1⟩ into (|0⟩ - |1⟩)/√2, putting qubits into equal superposition.",
            'cnot': "The CNOT (Controlled-NOT) gate creates entanglement between two qubits. It flips the target qubit only if the control qubit is in state |1⟩.",
            'help': "I can help you with:\n• Explaining quantum concepts (superposition, entanglement, etc.)\n• Describing quantum gates and algorithms\n• Generating quantum circuits from descriptions\n• Finding related quantum concepts\n\nJust ask me anything quantum-related!"
        }

        # Find matching response
        for key, response in responses.items():
            if key in message_lower:
                return response

        # Default response
        return "That's an interesting quantum question! I'm here to help you understand quantum computing concepts, algorithms, and circuits. Could you be more specific about what you'd like to know?"

    def _basic_general_fallback(self, message: str) -> str:
        """Basic general response when all APIs fail for general questions."""
        message_lower = message.lower()

        responses = {
            'hello': "Hello! I'm your AI assistant. I can help with a wide variety of topics including quantum computing, programming, science, and general knowledge. 🔑 Note: For enhanced AI features, add a free Hugging Face API key to cloud_ai_config.json",
            'hi': "Hi there! I'm here to help with any questions you have. What can I assist you with today?",
            'how are you': "I'm doing well, thank you for asking! I'm here and ready to help with any questions you might have.",
            'what is your name': "I'm your AI assistant, powered by cloud-based AI services. I'm designed to help with a wide range of topics and questions.",
            'what can you do': "I can help with:\n• General knowledge and questions\n• Quantum computing explanations\n• Programming help\n• Science and technology topics\n• Creative tasks\n• Problem solving\n\n🔑 For enhanced AI responses, add a Hugging Face API key to cloud_ai_config.json (free at https://huggingface.co/settings/tokens)",
            'help': "I can help with:\n• General knowledge and questions\n• Quantum computing explanations\n• Programming help\n• Science and technology topics\n• Creative tasks\n• Problem solving\n\n🔑 For enhanced AI responses, add a Hugging Face API key to cloud_ai_config.json"
        }

        # Find matching response
        for key, response in responses.items():
            if key in message_lower:
                return response

        # Default general response
        return f"I understand you're asking about '{message}'. I'm here to help with any questions you might have. 🔑 For enhanced AI responses, please add a free Hugging Face API key to cloud_ai_config.json (get one at https://huggingface.co/settings/tokens)"

    def _basic_concept_similarity(self, query: str, top_k: int) -> List[str]:
        """Basic concept similarity using local knowledge."""
        query_lower = query.lower()

        all_concepts = []
        for category in self.quantum_knowledge.values():
            if isinstance(category, dict):
                all_concepts.extend(list(category.keys()))

        # Simple keyword matching
        matches = []
        for concept in all_concepts:
            concept_words = concept.lower().split()
            if any(word in query_lower for word in concept_words):
                matches.append(concept)

        # Return top matches or some defaults
        if matches:
            return matches[:top_k]
        else:
            return ['superposition', 'entanglement', 'quantum gates', 'algorithms'][:top_k]

    def _get_cached_result(self, key: str) -> Optional[Any]:
        """Get cached result if still valid."""
        if key in self.cache:
            cached_time, result = self.cache[key]
            if datetime.now() - cached_time < timedelta(seconds=self.cache_timeout):
                return result
            else:
                del self.cache[key]
        return None

    def _cache_result(self, key: str, result: Any):
        """Cache a result."""
        self.cache[key] = (datetime.now(), result)

        # Clean old cache entries (keep cache size reasonable)
        if len(self.cache) > 100:
            current_time = datetime.now()
            keys_to_delete = []
            for cache_key, (timestamp, _) in self.cache.items():
                if current_time - timestamp > timedelta(seconds=self.cache_timeout):
                    keys_to_delete.append(cache_key)

            for key in keys_to_delete:
                del self.cache[key]

    def fetch_quantum_dataset_info(self, dataset_name: str) -> Dict[str, Any]:
        """
        Fetch information about a quantum dataset from Hugging Face.
        """
        cache_key = f"dataset_info_{dataset_name}"
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result

        url = f"https://huggingface.co/api/datasets/{dataset_name}"
        headers = {}
        if self.api_keys.get('huggingface'):
            headers['Authorization'] = f"Bearer {self.api_keys['huggingface']}"

        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                result = {
                    'name': data.get('id'),
                    'description': data.get('description', ''),
                    'downloads': data.get('downloads', 0),
                    'likes': data.get('likes', 0),
                    'tags': data.get('tags', []),
                    'size': data.get('size', 'unknown'),
                    'last_modified': data.get('lastModified')
                }
                self._cache_result(cache_key, result)
                return result
        except Exception as e:
            logger.warning(f"Failed to fetch dataset info for {dataset_name}: {e}")

        return {}

    def search_quantum_datasets(self, query: str = "quantum", limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for quantum datasets on Hugging Face.
        """
        cache_key = f"dataset_search_{query}_{limit}"
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result

        url = f"https://huggingface.co/api/datasets?search={query}&limit={limit}"
        headers = {}
        if self.api_keys.get('huggingface'):
            headers['Authorization'] = f"Bearer {self.api_keys['huggingface']}"

        try:
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code == 200:
                datasets = response.json()
                result = []
                for dataset in datasets:
                    result.append({
                        'id': dataset.get('id'),
                        'description': dataset.get('description', ''),
                        'downloads': dataset.get('downloads', 0),
                        'tags': dataset.get('tags', [])[:5]  # Limit tags
                    })
                self._cache_result(cache_key, result)
                return result
        except Exception as e:
            logger.warning(f"Failed to search datasets: {e}")

        return []

    def get_quantum_data_sample(self, dataset_name: str) -> Dict[str, Any]:
        """
        Get a sample of quantum data from a Hugging Face dataset.
        Note: This requires the datasets library and may not work through API alone.
        """
        try:
            # This would require the datasets library
            # For now, return mock data based on dataset type
            if 'quantum' in dataset_name.lower():
                return {
                    'dataset': dataset_name,
                    'sample_type': 'quantum_text',
                    'sample_data': {
                        'text': 'Quantum computing uses quantum mechanics principles like superposition and entanglement to perform computations.',
                        'source': 'quantum physics corpus',
                        'tokens': 15
                    }
                }
        except Exception as e:
            logger.warning(f"Failed to get dataset sample: {e}")

        return {}

    def enhance_knowledge_with_hf_data(self) -> Dict[str, Any]:
        """
        Enhance the AI knowledge base with data from Hugging Face quantum datasets.
        """
        hf_data = {
            'datasets_info': {},
            'quantum_concepts': [],
            'circuit_examples': [],
            'educational_content': []
        }

        # Fetch info about quantum datasets
        for dataset_key, dataset_id in self.quantum_datasets.items():
            info = self.fetch_quantum_dataset_info(dataset_id)
            if info:
                hf_data['datasets_info'][dataset_key] = info

                # Add to knowledge based on dataset type
                if 'qna' in dataset_key:
                    hf_data['quantum_concepts'].append({
                        'source': 'huggingface_qa_dataset',
                        'content': f'Quantum information Q&A dataset with {info.get("downloads", 0)} downloads',
                        'dataset_id': dataset_id
                    })

        return hf_data

    def get_provider_status(self) -> Dict[str, Any]:
        """Get status of all AI providers."""
        status = {}
        for provider_name, provider in self.providers.items():
            status[provider_name] = {
                'available': provider['available'],
                'name': provider['name'],
                'cost': provider['cost']
            }
        return status

    def set_api_key(self, provider: str, key: str):
        """Set API key for a provider."""
        if provider in self.providers:
            self.api_keys[provider] = key
            self.providers[provider]['available'] = bool(key)

            # Save to config file
            config_file = os.path.join(os.path.dirname(__file__), 'cloud_ai_config.json')
            try:
                with open(config_file, 'w') as f:
                    json.dump(self.api_keys, f, indent=2)
            except Exception as e:
                logger.warning(f"Could not save API keys: {e}")

    def get_available_providers(self) -> List[str]:
        """Get list of available (configured) providers."""
        return [name for name, provider in self.providers.items() if provider['available']]

    def test_provider(self, provider_name: str) -> bool:
        """Test if a provider is working."""
        if provider_name not in self.providers or not self.providers[provider_name]['available']:
            return False

        try:
            # Simple test prompt
            test_prompt = "What is quantum computing in one sentence?"
            response = self._call_provider(provider_name, 'chat', test_prompt)
            return bool(response and len(response.strip()) > 10)
        except Exception as e:
            logger.warning(f"Provider test failed for {provider_name}: {e}")
            return False

# Global instance for the application
cloud_first_ai = CloudFirstAIService()
