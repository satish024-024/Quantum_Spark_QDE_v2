"""
Google Gemini AI Service for Quantum Circuit Generation
Enhanced with Intent Detection for Natural Conversations
"""
import os
import re
import json
import requests
from typing import Dict, Any, Optional, Tuple


class QuantumChatAssistant:
    """
    Enhanced AI chat with proper intent detection for natural conversations.
    Detects user intent and builds context-aware prompts for appropriate responses.
    """
    
    # Conversational patterns (greetings, thanks, casual chat)
    CONVERSATIONAL_PATTERNS = [
        r'\b(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b',
        r'\b(how are you|what\'s up|sup|how\'s it going|whats up)\b',
        r'\b(thanks|thank you|appreciated|cheers|thx)\b',
        r'\b(bye|goodbye|see you|later|take care)\b',
    ]
    
    # Explicit code request keywords
    EXPLICIT_CODE_KEYWORDS = [
        'show code', 'write code', 'give code', 'code example',
        'show me the code', 'write a program', 'code snippet',
        'implementation', 'how to code', 'code for', 'sample code',
        'give me code', 'provide code', 'create code', 'python code',
        'qiskit code', 'cirq code', 'programming example'
    ]
    
    # Question patterns that might want code
    CODE_QUESTION_PATTERNS = [
        r'how (do i|can i|to|would i)',
        r'can you (show|write|create|build)',
        r'(create|build|implement|make) (?:a |an )?(\w+)',
    ]
    
    # Dashboard data query keywords - questions about actual dashboard state
    DASHBOARD_QUERY_KEYWORDS = [
        'how many jobs', 'running jobs', 'completed jobs', 'failed jobs', 'queued jobs',
        'job status', 'my jobs', 'total jobs', 'active jobs', 'pending jobs',
        'how many backends', 'available backends', 'backend status', 'online backends',
        'success rate', 'performance', 'queue position', 'wait time', 'execution time',
        'calibration', 'fidelity', 'error rate', 'system status', 'queue status',
        'current status', 'dashboard status', 'what is running', 'show my jobs'
    ]
    
    @staticmethod
    def detect_intent(message: str) -> Dict[str, bool]:
        """
        Detect user intent from message.
        
        Returns:
            {
                'is_greeting': bool,
                'wants_code': bool,
                'wants_explanation': bool,
                'is_conversational': bool,
                'wants_dashboard_data': bool
            }
        """
        msg_lower = message.lower().strip()
        
        # Check if conversational (greetings, thanks, etc.)
        is_conversational = any(
            re.search(pattern, msg_lower) 
            for pattern in QuantumChatAssistant.CONVERSATIONAL_PATTERNS
        )
        
        # Specific greeting check (short, friendly openers)
        is_greeting = bool(re.search(r'\b(hi|hello|hey|greetings)\b', msg_lower))
        
        # Check for explicit code requests (phrase-based)
        wants_code_explicit = any(
            keyword in msg_lower 
            for keyword in QuantumChatAssistant.EXPLICIT_CODE_KEYWORDS
        )
        
        # FLEXIBLE CODE DETECTION: Match when 'code' appears with action words in ANY order
        # E.g., "bell state code give" or "give me bell state code"
        words = set(msg_lower.split())
        code_action_words = {'give', 'show', 'write', 'create', 'generate', 'make', 'provide', 'example'}
        has_code_word = 'code' in words or 'program' in words or 'script' in words
        has_action_word = bool(words & code_action_words)
        wants_code_flexible = has_code_word and has_action_word
        
        # Check for implicit code requests (questions with action verbs)
        # But only for longer, specific questions
        wants_code_implicit = (
            any(re.search(pattern, msg_lower) for pattern in QuantumChatAssistant.CODE_QUESTION_PATTERNS)
            and any(word in msg_lower for word in ['create', 'build', 'implement', 'make', 'write'])
            and len(message.split()) > 5  # Longer questions more likely to want code
        )
        
        wants_code = wants_code_explicit or wants_code_flexible or wants_code_implicit
        
        # If asking "what is" or "explain", wants explanation not code
        wants_explanation = any(phrase in msg_lower for phrase in [
            'what is', 'what are', 'explain', 'tell me about', 'describe',
            'what does', 'why is', 'why does', 'how does', 'define'
        ]) and not wants_code_explicit
        
        # Check if asking about dashboard data (jobs, backends, status, etc.)
        wants_dashboard_data = any(
            keyword in msg_lower 
            for keyword in QuantumChatAssistant.DASHBOARD_QUERY_KEYWORDS
        )
        
        return {
            'is_greeting': is_greeting,
            'wants_code': wants_code,
            'wants_explanation': wants_explanation,
            'is_conversational': is_conversational,
            'wants_dashboard_data': wants_dashboard_data
        }
    
    @staticmethod
    def build_system_prompt(intent: Dict[str, bool]) -> str:
        """
        Build context-aware system prompt based on detected intent.
        """
        
        # Base personality - friendly, helpful quantum computing expert
        base = """You are a friendly, knowledgeable Quantum Computing AI Assistant for the Quantum Spark Dashboard. 
You communicate naturally and concisely, like a helpful colleague who is an expert in quantum computing.

You can provide code in ANY programming language requested (Python, C, C++, JavaScript, etc.).
While your expertise is quantum computing, you can help with code implementation in any language."""
        
        # Conversational mode - for greetings and casual chat
        if intent['is_conversational'] or intent['is_greeting']:
            return base + """

CURRENT MODE: Conversational
- Respond warmly and briefly
- Ask how you can help with quantum computing
- Keep it natural and friendly
- NO code blocks, NO technical jargon
- Don't over-explain or lecture
- Examples of good responses:
  * "Hi! I'm here to help with quantum computing. What would you like to explore?"
  * "Hello! How can I assist you with your quantum projects today?"
  * "Hey! Great to chat. What quantum topic interests you?"
"""
        
        # Explanation mode - for concept questions
        if intent['wants_explanation']:
            return base + """

CURRENT MODE: Explanation
- Provide clear, concise explanations
- Use simple language first, then add technical details if needed
- NO code unless explicitly requested
- Use analogies when they help understanding
- Keep responses focused - don't dump everything you know
- Format suggestions:
  * Brief intro (1-2 sentences)
  * Core concept explained simply
  * Key points or implications (if relevant)
- Aim for 2-4 short paragraphs max
"""
        
        # Code mode - for explicit code requests
        if intent['wants_code']:
            return base + """


CURRENT MODE: Code Generation
- Provide working, runnable code in the requested language
- Use proper markdown code blocks: ```language (e.g., ```python, ```c, ```cpp, ```javascript)
- Detect the language from the user's request (e.g., "C code", "Python code", "JavaScript")
- Add a brief explanation (1-2 sentences) before the code
- Include helpful comments inside the code
- Keep code clean, correct, and ready to copy-paste

⚠️ CRITICAL: NEVER TRUNCATE CODE BLOCKS
- ALWAYS provide COMPLETE, FULL code examples
- Include ALL necessary imports, setup, execution, and output
- Close ALL code blocks with ``` 
- If the code is long, that's fine - provide the ENTIRE thing
- DO NOT use "..." or "# rest of code" - write it all out

- Format:
  1. Brief context (what this code does)
  2. COMPLETE code block with ```language
  3. Quick note about expected output or key parts

LANGUAGE-SPECIFIC RULES:

FOR PYTHON/QISKIT CODE:
✅ CORRECT SYNTAX:
   from qiskit import QuantumCircuit
   from qiskit_aer import AerSimulator
   simulator = AerSimulator()
   result = simulator.run(qc, shots=1024).result()
   counts = result.get_counts()

❌ WRONG (DO NOT USE):
   from qiskit import Aer  # WRONG - deprecated
   Aer.get_backend()  # WRONG - deprecated
   execute(qc, backend)  # WRONG - deprecated
   result.getcounts()  # WRONG - missing underscore
   from qiskitaer  # WRONG - missing underscore

FOR C/C++ CODE:
- Include necessary headers (#include <stdio.h>, etc.)
- Use proper memory management
- Add compilation instructions as comments

FOR OTHER LANGUAGES:
- Follow language-specific best practices
- Include necessary imports/includes
- COMPLETE all code blocks - never truncate mid-code
"""
        
        # Default mode - balanced, helpful responses
        return base + """

CURRENT MODE: Helpful Assistant
- Answer questions clearly and concisely
- Provide explanations by default
- Only include code if the question clearly implies implementation is needed
- Be conversational but informative
- Match the user's energy and formality level
"""

    @staticmethod
    def ensure_markdown_formatting(text: str) -> str:
        """
        Ensure code blocks are properly formatted with markdown.
        Fixes common issues with code block formatting.
        Detects language from context if not specified.
        """
        # Fix code blocks that might be missing language specifier
        # Try to detect language from context (e.g., "#include" = C, "def " = Python)
        def detect_language(code_content):
            if '#include' in code_content or 'printf' in code_content:
                return 'c'
            elif 'def ' in code_content or 'import ' in code_content or 'from ' in code_content:
                return 'python'
            elif 'function' in code_content or 'const ' in code_content or 'let ' in code_content:
                return 'javascript'
            else:
                return 'python'  # Default fallback
        
        # Fix code blocks without language specifier
        def add_language(match):
            code = match.group(1)
            lang = detect_language(code)
            return f'```{lang}\n{code}```'
        
        # Fix: Detect bare "python" header followed by code (Gemini artifact)
        # Matches: "python" (start of line) -> newline -> "from " or "import "
        text = re.sub(
             r'(^|\n)(python|javascript|js|c|cpp)\r?\n(from |import |#include |const |let |def |class )',
             r'\1```\2\n\3',
             text,
             flags=re.IGNORECASE
        )

        text = re.sub(
            r'```\s*\n((?:(?!```)[\s\S])*?)```',
            add_language,
            text
        )
        
        # Ensure newlines around code blocks for proper rendering
        text = re.sub(r'([^\n])```', r'\1\n```', text)
        text = re.sub(r'```([^\n])', r'```\n\1', text)
        
        # Scan for unclosed code blocks (odd number of backticks)
        if text.count('```') % 2 != 0:
            text += '\n```'
        
        return text


class GeminiAIService:
    def __init__(self, api_key: Optional[str] = None):
        """Initialize Gemini AI Service"""
        print("🚀 Initializing Gemini AI Service (Multi-Model Version)")
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        # Updated to use gemini-1.5-flash (current model as of 2024)
        self.base_url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
        
    def generate_quantum_circuit(self, description: str, qubits: int = 2) -> Dict[str, Any]:
        """Generate quantum circuit code from natural language description"""
        if not self.api_key:
            return {
                'success': False,
                'error': 'Gemini API key not configured',
                'code': None
            }
        
        # Models to try in order of preference
        # Updated models for 2026 (preferring stable production models)
        models = [
            'gemini-3.5-flash',      # Future-proofing
            'gemini-2.5-flash',      # Stable 2026 (Highly available)
            'gemini-2.5-pro',        # Advanced 2026
            'gemini-2.0-flash-lite',  # Light 2.0
            'gemini-2.0-flash'       # Standard 2.0
        ]
        
        last_error = None
        
        for model in models:
            try:
                print(f"🔄 Trying Gemini model: {model}...")
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                
                # Create the prompt for Gemini
                prompt = f"""Generate PERFECT, RUNNABLE Qiskit Python code for: "{description}"

Requirements:
1. Use exactly {qubits} qubits.
2. Include essential imports: `import numpy as np`, `from qiskit import QuantumCircuit, transpile`, `from qiskit_aer import AerSimulator`.
3. Add a clear title comment and gate-by-gate explanations.
4. Include `qc.measure_all()` at the end.
5. Include a simulation block using `AerSimulator` to verify counts.
6. Return ONLY the Python code (raw text). No markdown ``` blocks. No conversational text.

Example Structure:
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

qc = QuantumCircuit({qubits})
# Gates...
qc.measure_all()
# Simulation...
"""
                
                # Use X-goog-api-key header for authentication (correct format)
                headers = {
                    'Content-Type': 'application/json',
                    'X-goog-api-key': self.api_key
                }
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}]
                }
                
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    if 'candidates' in result and len(result['candidates']) > 0:
                        generated_text = result['candidates'][0]['content']['parts'][0]['text']
                        
                        # Extract raw code from response (execution layer)
                        raw_code = self._extract_code_from_response(generated_text)
                        
                        # Create formatted version (presentation layer)
                        formatted_code = f"```python\n{raw_code}\n```"
                        
                        return {
                            'success': True,
                            'code': raw_code,  # Execution layer
                            'formatted_code': formatted_code,  # UI layer
                            'generated_by': 'google_gemini',
                            'provider': f'Google Gemini ({model})'
                        }
                else:
                    last_error = f"Model {model} failed: {response.status_code} - {response.text}"
                    print(f"⚠️ {last_error}")
                    
            except Exception as e:
                last_error = f"Error with {model}: {str(e)}"
                print(f"⚠️ {last_error}")
                continue
                
        return {
            'success': False,
            'error': f'All Gemini models failed. Last error: {last_error}',
            'code': None
        }
    
    def generate_circuit_json(self, description: str, qubits: int = 2) -> Dict[str, Any]:
        """Generate quantum circuit as JSON format for 3D visualizer"""
        if not self.api_key:
            return {
                'success': False,
                'error': 'Gemini API key not configured',
                'circuit_data': None
            }
        
        models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
        last_error = None
        
        for model in models:
            try:
                print(f"🔄 Trying Gemini {model} for JSON circuit...")
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                
                # Handle auto qubits
                qubit_req = f"exactly {qubits} qubits (0 to {qubits-1})" if qubits > 0 else "an appropriate number of qubits (typically 2-5)"
                
                # BULLETPROOF prompt for circuit generation (user-provided rules)
                prompt = f"""TASK: Generate a quantum circuit for: "{description}"
REQUIREMENT: Use {qubit_req}.

CRITICAL RULES (NON-NEGOTIABLE):
1. Count ONLY logical gates exactly as they appear - DO NOT decompose into basis gates
2. DO NOT count compiler-inserted or virtual gates
3. Treat RX, RY, RZ, H, X, CNOT, CZ, etc. as SINGLE logical gates
4. Circuit depth = number of discrete time steps (layers) to execute the circuit
5. All gates acting on DIFFERENT qubits at the same time = SAME depth layer
6. A 2-qubit gate occupies and blocks BOTH qubits for that entire depth layer
7. A qubit cannot participate in more than one gate in the same depth layer
8. Measurements are NOT included in gate count or depth
9. Assume ideal parallelism (no hardware connectivity constraints)

DEPTH CALCULATION EXAMPLE:
Layer 0: H(q0), H(q1), H(q2) → 3 gates, all parallel
Layer 1: CNOT(q0,q1) → blocks q0 and q1
Layer 2: CNOT(q1,q2) → blocks q1 and q2
Layer 3: RZ(q0), RZ(q1), RZ(q2) → 3 gates, all parallel
Total: 8 gates, depth = 4

GATE SET CLASSIFICATION:
- 'native': Only standard gates (H, X, Y, Z, S, T, CNOT, SWAP, RX, RY, RZ, CZ)
- 'symbolic': Uses multi-qubit blocks (CCX/Toffoli, CSWAP/Fredkin, CCZ)
- 'extended': Uses standard 2-qubit rotations/complex gates (CRZ, CRX, ISWAP, CY, CH)

FOR PHYSICS SIMULATIONS (Heisenberg/Ising/VQE):
- ZZ interaction = CNOT(i,j) → RZ(j) → CNOT(i,j) [3 gates, depth +3]
- XX interaction = H(both) → CNOT → RZ → CNOT → H(both) [7 gates]
- State as ONE Trotter step unless specified

AVAILABLE GATES:
Single-qubit: H, X, Y, Z, S, T, SDG, TDG, SX, RX, RY, RZ
Two-qubit: CNOT, CZ, CY, CH, SWAP, ISWAP, CRX, CRY, CRZ
Three-qubit: CCX, CCZ, CSWAP

Return ONLY valid JSON (no markdown, no explanation):
{{
  "name": "Circuit Name",
  "description": "{description}",
  "qubits": <number of qubits>,
  "gate_set": "native|symbolic|extended",
  "circuit_type": "textbook_correct|educational_simplified",
  "single_qubit_gates": <count>,
  "two_qubit_gates": <count>,
  "gate_count": <total_logical_gates>,
  "depth": <correctly_calculated>,
  "gates": [
    {{"gate": "H", "qubits": [0], "depth": 0}},
    {{"gate": "CNOT", "qubits": [0, 1], "depth": 1}}
  ],
  "depth_justification": "Layer 0: H(q0,q1). Layer 1: CNOT(q0,q1). Total depth = 2"
}}

Return ONLY JSON."""

                headers = {
                    'Content-Type': 'application/json',
                    'X-goog-api-key': self.api_key
                }
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}]
                }
                
                response = requests.post(url, headers=headers, json=payload, timeout=15)
                
                if response.status_code == 200:
                    result = response.json()
                    if 'candidates' in result and len(result['candidates']) > 0:
                        generated_text = result['candidates'][0]['content']['parts'][0]['text']
                        
                        # Clean up response
                        text = generated_text.strip()
                        if text.startswith('```json'): text = text[7:]
                        if text.startswith('```'): text = text[3:]
                        if text.endswith('```'): text = text[:-3]
                        text = text.strip()
                        
                        # Parse JSON
                        try:
                            circuit_data = json.loads(text)
                            
                            # Validate required fields
                            if 'gates' in circuit_data and isinstance(circuit_data['gates'], list):
                                gates = circuit_data['gates']
                                
                                # Ensure all required fields
                                circuit_data.setdefault('name', f'AI: {description[:30]}')
                                circuit_data.setdefault('qubits', qubits)
                                
                                # Calculate ACTUAL gate count (not decomposed)
                                actual_gate_count = len(gates)
                                circuit_data['gate_count'] = actual_gate_count
                                
                                # Validate/recalculate depth based on gates
                                if gates:
                                    max_depth = max([g.get('depth', 0) for g in gates])
                                    calculated_depth = max_depth + 1  # depth is 0-indexed
                                    
                                    # Use the larger of AI's depth or calculated
                                    ai_depth = circuit_data.get('depth', 0)
                                    circuit_data['depth'] = max(ai_depth, calculated_depth)
                                else:
                                    circuit_data['depth'] = 0
                                
                                print(f"✅ Gemini JSON: {circuit_data['name']}")
                                print(f"   Gates: {actual_gate_count}, Depth: {circuit_data['depth']}")
                                
                                return {
                                    'success': True,
                                    'circuit_data': circuit_data,
                                    'generated_by': f'gemini_{model}'
                                }
                        except json.JSONDecodeError as je:
                            last_error = f"JSON parse error: {je}"
                            print(f"⚠️ {last_error}")
                else:
                    last_error = f"API error: {response.status_code}"
                    print(f"⚠️ {last_error}")
                    
            except Exception as e:
                last_error = str(e)
                print(f"⚠️ Gemini exception: {e}")
                continue
                
        return {
            'success': False,
            'error': f'JSON generation failed: {last_error}',
            'circuit_data': None
        }
    
    def chat_quantum_assistant(self, question: str, dashboard_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Enhanced chat with proper intent detection (Claude-like behavior).
        
        Features:
        - Detects user intent (greeting, code request, explanation, general chat)
        - Builds context-aware system prompts
        - Adjusts temperature based on intent
        - Ensures proper markdown formatting
        - Injects dashboard context for data-related queries
        
        Args:
            question: User's message
            dashboard_context: Optional dict with current dashboard data:
                - total_jobs, running_jobs, completed_jobs, failed_jobs
                - total_backends, online_backends
                - success_rate, average_fidelity
                - queue_info, etc.
        """
        if not self.api_key:
            return {
                'success': False,
                'error': 'Gemini API key not configured',
                'response': None
            }
        
        # === INTENT DETECTION ===
        intent = QuantumChatAssistant.detect_intent(question)
        print(f"🧠 Intent detected: {intent}")
        
        # === BUILD CONTEXT-AWARE PROMPT ===
        system_prompt = QuantumChatAssistant.build_system_prompt(intent)
        
        # Adjust temperature based on intent
        # More creative for chat, more precise for code
        temperature = 0.7 if intent['is_conversational'] else 0.3
        
        # === INJECT DASHBOARD CONTEXT IF NEEDED ===
        context_section = ""
        if intent.get('wants_dashboard_data') and dashboard_context:
            context_section = f"""

CURRENT DASHBOARD DATA (Real-time from user's account):
- Total Jobs: {dashboard_context.get('total_jobs', 'Unknown')}
- Running Jobs: {dashboard_context.get('running_jobs', 0)}
- Completed Jobs: {dashboard_context.get('completed_jobs', 0)}
- Failed Jobs: {dashboard_context.get('failed_jobs', 0)}
- Queued Jobs: {dashboard_context.get('queued_jobs', 0)}
- Available Backends: {dashboard_context.get('total_backends', 'Unknown')} ({dashboard_context.get('online_backends', 0)} online)
- Success Rate: {dashboard_context.get('success_rate', 'N/A')}%
- Average Fidelity: {dashboard_context.get('average_fidelity', 'N/A')}%
- Provider: {dashboard_context.get('provider', 'Unknown')}

Use this REAL data to answer the user's question accurately. Be specific with numbers."""
            print(f"📊 Dashboard context injected: {dashboard_context}")
        
        # Combined prompt with system context and user question
        full_prompt = f"""{system_prompt}{context_section}

User Message: "{question}"

Your Response:"""
        
        # Models to try in order of preference (updated Feb 2026)
        # Gemini 3 models are newest, Gemini 2.5 Pro available until June 2026
        # Updated models for 2026
        models = [
            'gemini-3.5-flash',      # Future-proofing
            'gemini-2.5-flash',      # Stable 2026 (Highly available)
            'gemini-2.5-pro',        # Advanced 2026
            'gemini-2.0-flash-lite',  # Light 2.0
            'gemini-2.0-flash'       # Standard 2.0
        ]
        
        last_error = None
        
        last_error = "No models available"
        
        for model in models:
            try:
                print(f"🔄 Trying Gemini model: {model}...")
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                
                # Use X-goog-api-key header for authentication
                headers = {
                    'Content-Type': 'application/json',
                    'X-goog-api-key': self.api_key
                }
                
                payload = {
                    "contents": [{"parts": [{"text": full_prompt}]}],
                    "generationConfig": {
                        "temperature": temperature,
                        "topP": 0.95,
                        "topK": 40,
                        "maxOutputTokens": 8192  # Increased to 8192 for full responses
                    }
                }
                
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    if 'candidates' in result and len(result['candidates']) > 0:
                        candidate = result['candidates'][0]
                        generated_text = candidate['content']['parts'][0]['text']
                        
                        # Check if response was truncated
                        finish_reason = candidate.get('finishReason', 'STOP')
                        print(f"🔍 Gemini finish_reason: {finish_reason}, Response length: {len(generated_text)} chars")
                        if finish_reason == 'MAX_TOKENS':
                            print(f"⚠️ Warning: Response truncated due to MAX_TOKENS limit")
                        elif finish_reason != 'STOP':
                            print(f"⚠️ Warning: Unusual finish_reason: {finish_reason}")
                        
                        # === POST-PROCESS: ENSURE PROPER FORMATTING ===
                        ai_response = generated_text.strip()
                        
                        # Fix markdown code blocks if code was requested
                        if intent['wants_code']:
                            ai_response = QuantumChatAssistant.ensure_markdown_formatting(ai_response)
                        
                        return {
                            'success': True,
                            'response': ai_response,
                            'generated_by': 'google_gemini',
                            'provider': f'Google Gemini ({model})',
                            'intent_detected': intent,  # Include intent for debugging
                            'finish_reason': finish_reason
                        }
                else:
                    last_error = f"{response.status_code} - {response.text}"
                    print(f"   [Gemini] {model} failed: {last_error}")
                    
                    if response.status_code == 404:
                        continue
                    if response.status_code == 429:
                        print(f"   [Gemini] {model} rate limited (429), trying fallback models...")
                        continue
                    
            except Exception as e:
                last_error = f"Error with {model}: {str(e)}"
                print(f"⚠️ {last_error}")
                continue
                
        return {
            'success': False,
            'error': f'All Gemini models failed. Last error: {last_error}',
            'response': None
        }
    
    def _extract_code_from_response(self, text: str) -> str:
        """Extract raw Python code from AI response, handling various formats."""
        text = text.strip()
        
        # Case 1: Markdown code block with language tag
        if '```python' in text:
            start = text.find('```python') + 9
            end = text.find('```', start)
            if end > start:
                return text[start:end].strip()
        
        # Case 2: Generic markdown code block
        if text.startswith('```'):
            lines = text.split('\n')
            # Skip first line (```), take until closing ```
            code_lines = []
            for line in lines[1:]:
                if line.strip() == '```':
                    break
                code_lines.append(line)
            return '\n'.join(code_lines).strip()
        
        # Case 3: Raw code (no markdown) - check if it STARTS with code
        # If it has explanation text before code, fall through to Case 4
        clean_text = text.lstrip()
        if clean_text.startswith(('from qiskit', 'import', 'qc =', 'def ')):
             return text
        
        # Case 4: Text with code embedded - extract from first import to end of code block
        lines = text.split('\n')
        code_lines = []
        in_code = False
        blank_count = 0
        
        for line in lines:
            # Start when we hit qiskit import
            if not in_code and ('from qiskit' in line or 'import qiskit' in line):
                in_code = True
            
            if in_code:
                # Stop if we hit 2+ consecutive blank lines (end of code block)
                if not line.strip():
                    blank_count += 1
                    if blank_count >= 2:
                        break
                else:
                    blank_count = 0
                code_lines.append(line)
        
        if code_lines:
            return '\n'.join(code_lines).strip()
        
        # Fallback: return as-is
        return text
    
    def _generate_circuit_fallback(self, description: str, qubits: int = 2) -> Dict[str, Any]:
        """Fallback template-based circuit generation with layer separation."""
        description_lower = description.lower()
        
        # Bell state template (raw code only)
        if 'bell' in description_lower or 'entangl' in description_lower:
            raw_code = f"""from qiskit import QuantumCircuit

# Create Bell state (entangled pair)
qc = QuantumCircuit({min(qubits, 2)})

# Apply Hadamard to first qubit
qc.h(0)

# Apply CNOT to create entanglement
qc.cx(0, 1)

# Measure all qubits
qc.measure_all()
"""
        # Superposition template
        elif 'superposition' in description_lower or 'hadamard' in description_lower:
            raw_code = f"""from qiskit import QuantumCircuit

# Create superposition state
qc = QuantumCircuit({qubits})

# Apply Hadamard to all qubits
for i in range({qubits}):
    qc.h(i)

# Measure all qubits
qc.measure_all()
"""
        # Default template
        else:
            raw_code = f"""from qiskit import QuantumCircuit

# Quantum circuit: {description}
qc = QuantumCircuit({qubits})

# Add your gates here
qc.h(0)  # Example: Hadamard on qubit 0

# Measure all qubits
qc.measure_all()
"""
        
        # Create formatted version for UI
        formatted_code = f"```python\n{raw_code}\n```"
        
        return {
            'success': True,
            'code': raw_code,  # Execution layer
            'formatted_code': formatted_code,  # UI layer
            'generated_by': 'gemini_fallback'
        }

# Test function
if __name__ == '__main__':
    # Test with API key
    api_key = input("Enter your Gemini API key (or press Enter to skip): ").strip()
    
    if api_key:
        service = GeminiAIService(api_key)
        result = service.generate_quantum_circuit("Create a Bell state with 2 qubits", 2)
        
        if result['success']:
            print("\n✅ Successfully generated circuit:")
            print(result['code'])
        else:
            print(f"\n❌ Error: {result.get('error')}")
    else:
        print("No API key provided, testing fallback...")
        service = GeminiAIService()
        result = service._generate_circuit_fallback("Bell state", 2)
        print("\n✅ Fallback circuit:")
        print(result['code'])
