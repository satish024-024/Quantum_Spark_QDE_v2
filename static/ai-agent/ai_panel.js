/**
 * AI Agent Panel - VS Code Copilot-Style Controller
 * 
 * A standalone, IDE-grade AI execution surface for the Quantum Spark dashboard.
 * 
 * CORE RULES:
 * - Single source of truth (one panel, one controller, one state machine)
 * - Chat and commands are separated internally
 * - Fail loud - no silent failures
 * - No AI overreach - explicit intent required
 * 
 * @author Quantum Spark Team
 * @version 1.0.0
 */

(function () {
    'use strict';

    // ==========================================================================
    // CONSTANTS
    // ==========================================================================

    const VALID_CONTEXTS = ['chat', 'circuit', 'execution', 'widget'];

    const CONTEXT_FLOW = {
        chat: ['circuit', 'widget'],
        circuit: ['execution', 'chat'],
        execution: ['widget', 'chat'],
        widget: ['chat', 'circuit']
    };

    const COMMAND_POLICY = {
        chat: ['LOAD_CIRCUIT'],  // Allow circuit creation from chat
        circuit: ['LOAD_CIRCUIT', 'RUN_CIRCUIT'],
        execution: ['RUN_CIRCUIT', 'SHOW_CHART'],
        widget: ['FOCUS_WIDGET', 'EXPLAIN_RESULT', 'LOAD_CIRCUIT']
    };

    const SUPPORTED_COMMANDS = [
        'LOAD_CIRCUIT',
        'RUN_CIRCUIT',
        'SHOW_CHART',
        'FOCUS_WIDGET',
        'EXPLAIN_RESULT'
    ];

    // ==========================================================================
    // AI AGENT PANEL CLASS
    // ==========================================================================

    class AIAgentPanel {
        constructor() {
            // State machine
            this.state = {
                context: 'chat',
                currentCircuit: null,
                isLoadingCircuit: false,
                isRunning: false,
                lastResults: null
            };

            // Execution lock
            this.isExecuting = false;

            // DOM references
            this.panel = null;
            this.chatArea = null;
            this.inputField = null;

            // Initialization flag
            this.isInitialized = false;
        }

        // ======================================================================
        // LIFECYCLE METHODS
        // ======================================================================

        /**
         * Initialize the AI Agent Panel.
         * Creates the DOM structure and attaches event listeners.
         */
        init() {
            if (this.isInitialized) {
                console.warn('[AIAgentPanel] Already initialized.');
                return;
            }

            console.log('[AIAgentPanel] Initializing...');

            this._createPanelDOM();
            this._attachEventListeners();
            this._attachGlobalListeners();

            this.isInitialized = true;
            console.log('[AIAgentPanel] Initialized successfully.');
        }

        /**
         * Open the AI Agent Panel with slide-in animation.
         */
        open() {
            if (!this.isInitialized) {
                this.init();
            }

            if (!this.panel) {
                this.showError('Panel not initialized.');
                return;
            }

            this.panel.classList.add('open');
            this.panel.setAttribute('aria-hidden', 'false');

            // Focus input field
            if (this.inputField) {
                setTimeout(() => this.inputField.focus(), 300);
            }

            console.log('[AIAgentPanel] Opened.');
        }

        /**
         * Close the AI Agent Panel with slide-out animation.
         */
        close() {
            if (!this.panel) return;

            this.panel.classList.remove('open');
            this.panel.setAttribute('aria-hidden', 'true');

            console.log('[AIAgentPanel] Closed.');
        }

        /**
         * Toggle panel open/close state.
         */
        toggle() {
            if (this.panel?.classList.contains('open')) {
                this.close();
            } else {
                this.open();
            }
        }

        // ======================================================================
        // STATE MACHINE
        // ======================================================================

        /**
         * Get the current context.
         * @returns {string} Current context
         */
        getContext() {
            return this.state.context;
        }

        /**
         * Set context with validation.
         * @param {string} next - The next context to transition to
         * @returns {boolean} Whether the transition was successful
         */
        setContext(next) {
            // Validate context
            if (!VALID_CONTEXTS.includes(next)) {
                this.showError(`Invalid context: ${next}`);
                return false;
            }

            // Validate transition
            const allowed = CONTEXT_FLOW[this.state.context];
            if (!allowed?.includes(next)) {
                this.showError(`Invalid transition: ${this.state.context} → ${next}`);
                return false;
            }

            const previous = this.state.context;
            this.state.context = next;

            this.appendSystemMessage(`Context: ${previous} → ${next}`);
            console.log(`[AIAgentPanel] Context: ${previous} → ${next}`);

            return true;
        }

        /**
         * Hard reset context to 'chat' (safe fallback).
         */
        resetContext() {
            this.state.context = 'chat';
            this.state.currentCircuit = null;
            this.state.isLoadingCircuit = false;
            this.state.isRunning = false;
            this.appendSystemMessage('Context reset to chat.');
        }

        // ======================================================================
        // MESSAGING
        // ======================================================================

        /**
         * Send a user message to the AI.
         * @param {string} text - The user's message
         */
        async sendMessage(text) {
            if (!text || typeof text !== 'string') return;

            const trimmed = text.trim();
            if (!trimmed) return;

            // Append user message
            this.appendUserMessage(trimmed);

            // Clear input
            if (this.inputField) {
                this.inputField.value = '';
            }

            // Show typing indicator
            this._showTypingIndicator();

            try {
                // Call backend
                const response = await this._callBackend(trimmed);

                // Remove typing indicator
                this._removeTypingIndicator();

                // Process response
                this.processAIResponse(response);

            } catch (error) {
                this._removeTypingIndicator();
                this.showError(`Failed to get AI response: ${error.message}`);
            }
        }

        /**
         * Process the AI response.
         * @param {object} response - The AI response object
         */
        processAIResponse(response) {
            // Validate response format
            if (!response || typeof response !== 'object') {
                this.showError('Invalid AI response format.');
                return;
            }

            // Display reply
            if (response.reply) {
                this.appendAIMessage(response.reply);
            }

            // Execute commands
            if (Array.isArray(response.commands) && response.commands.length > 0) {
                for (const cmd of response.commands) {
                    this.executeCommand(cmd);
                }
            }
        }

        // ======================================================================
        // COMMAND EXECUTION
        // ======================================================================

        /**
         * Execute a command with context validation.
         * @param {object} command - The command object { type, payload }
         */
        executeCommand(command) {
            if (!command || !command.type) {
                this.showError('Invalid command: missing type.');
                return;
            }

            const { type, payload } = command;

            // Validate command is supported
            if (!SUPPORTED_COMMANDS.includes(type)) {
                this.showError(`Unknown command: ${type}`);
                return;
            }

            // Validate command is allowed in current context
            const allowedCommands = COMMAND_POLICY[this.state.context] || [];
            if (!allowedCommands.includes(type)) {
                this.showError(`Command "${type}" not allowed in context "${this.state.context}".`);
                return;
            }

            // Execution lock
            if (this.isExecuting) {
                this.showError('Another command is executing. Please wait.');
                return;
            }

            this.isExecuting = true;
            this.appendSystemMessage(`Executing: ${type}`);

            try {
                // Delegate to command handlers
                if (window.AIAgentCommands && typeof window.AIAgentCommands[type] === 'function') {
                    window.AIAgentCommands[type](payload, this);
                } else {
                    this.showError(`Handler not implemented: ${type}`);
                }
            } catch (error) {
                this.showError(`Command failed: ${error.message}`);
            } finally {
                this.isExecuting = false;
            }
        }

        // ======================================================================
        // MESSAGE RENDERING
        // ======================================================================

        /**
         * Append a user message to the chat area.
         * @param {string} text - The message text
         */
        appendUserMessage(text) {
            this._appendMessage(text, 'user');
        }

        /**
         * Append an AI message to the chat area.
         * @param {string} text - The message text
         */
        appendAIMessage(text) {
            this._appendMessage(text, 'ai');
        }

        /**
         * Append a system message to the chat area.
         * @param {string} text - The message text
         */
        appendSystemMessage(text) {
            this._appendMessage(text, 'system');
        }

        /**
         * Show an error message.
         * @param {string} message - The error message
         */
        showError(message) {
            console.error(`[AIAgentPanel] ${message}`);
            this._appendMessage(message, 'error');
        }

        /**
         * Internal message appender with markdown support.
         * @param {string} text - The message text (supports markdown)
         * @param {string} type - Message type: 'user' | 'ai' | 'system' | 'error'
         */
        _appendMessage(text, type) {
            if (!this.chatArea) return;

            const msgDiv = document.createElement('div');
            msgDiv.className = `ai-agent-message ai-agent-message--${type}`;

            const bubble = document.createElement('div');
            bubble.className = 'ai-agent-message__bubble';

            // Render markdown for AI messages
            if (type === 'ai') {
                bubble.innerHTML = this._renderMarkdown(text);
                // Add copy buttons to code blocks
                this._addCopyButtons(bubble);
            } else {
                bubble.textContent = text;
            }

            const time = document.createElement('div');
            time.className = 'ai-agent-message__time';
            time.textContent = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            msgDiv.appendChild(bubble);
            msgDiv.appendChild(time);
            this.chatArea.appendChild(msgDiv);

            // Scroll to bottom
            this.chatArea.scrollTop = this.chatArea.scrollHeight;
        }

        /**
         * Simple markdown renderer for AI responses.
         * Handles code blocks, bold, italic, lists.
         */
        _renderMarkdown(text) {
            if (!text) return '';

            let html = text;
            const codeBlocks = [];

            // STEP 1: AGGRESSIVE FALLBACK - Detect unwrapped code BEFORE escaping
            // This must happen first while we can still see raw < and > characters
            html = html.replace(/(?:^|\n)(python|javascript|js|qiskit|qasm)\s*\n((?:(?:from|import|#|const|let|var|def|class|function|qc|@|qc\.)[\\s\\S]+?)(?=\n\n\s*[A-Z][a-z]|\n\n$|$))/gi,
                (match, lang, code) => {
                    return `\n\`\`\`${lang.toLowerCase()}\n${code.trim()}\n\`\`\`\n`;
                }
            );

            // STEP 2: Extract code blocks into "Safe Zones" BEFORE escaping HTML
            html = html.replace(/`{2,3}(\w+)?\s*\n?([\s\S]*?)`{2,3}/g, (match, lang, code) => {
                let language = (lang || '').toLowerCase();
                let cleanCode = code.trim();
                const lines = cleanCode.split('\n');
                const firstLine = lines[0].trim().toLowerCase();

                // Detect language from first line if capture was empty
                if (!language && (firstLine === 'python' || firstLine === 'javascript' || firstLine === 'js')) {
                    language = firstLine;
                    cleanCode = lines.slice(1).join('\n').trim();
                }
                else if (language && firstLine === language) {
                    cleanCode = lines.slice(1).join('\n').trim();
                }

                language = language || 'python';

                // Highlight the code (this will escape it internally)
                const highlighted = this._highlightCode(cleanCode, language);
                const blockId = `__CODE_BLOCK_${codeBlocks.length}__`;

                const blockHtml = `
                    <div class="ai-code-block" data-lang="${language}" style="background:linear-gradient(135deg, #1e1e1e 0%, #252526 100%); border-radius:12px; margin:20px 0; overflow:hidden; border:1px solid #333; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
                        <div class="ai-code-header" style="background:#2d2d2d; padding:12px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #3e3e42;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2">
                                    <polyline points="16 18 22 12 16 6"></polyline>
                                    <polyline points="8 6 2 12 8 18"></polyline>
                                </svg>
                                <span style="color:#cccccc; font-size:12px; font-family:'Segoe UI', monospace; text-transform:uppercase; font-weight:700; letter-spacing:1px;">${language}</span>
                            </div>
                            <button class="ai-code-copy" title="Copy code" style="background:transparent; border:none; color:#cccccc; cursor:pointer; font-size:11px; display:flex; align-items:center; gap:6px; padding:6px 14px; border-radius:6px; transition:background 0.3s; font-family:inherit; font-weight:500;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span>Copy</span>
                            </button>
                        </div>
                        <pre style="margin:0; padding:24px; overflow-x:auto; background:#1e1e1e; max-height:650px; overflow-y:auto; white-space:pre; color:#d4d4d4;"><code class="language-${language}" style="font-family:'Consolas', 'Monaco', monospace; font-size:13px; line-height:1.7; white-space:pre;">${highlighted}</code></pre>
                    </div>`;

                codeBlocks.push(blockHtml);
                return blockId;
            });

            // STEP 3: NOW escape HTML in the remaining text (not in code blocks)
            html = html.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            // STEP 4: Format the text around the blocks (Markdown)
            // Inline code
            html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(167,139,250,0.15); padding:2px 6px; border-radius:4px; font-family:\'IBM Plex Mono\', monospace; color:#c084fc; border:1px solid rgba(167,139,250,0.2);">$1</code>');

            // Bold/Italic
            html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#a78bfa; font-weight:700;">$1</strong>');
            html = html.replace(/\*([^*]+)\*/g, '<em style="color:#c4b5fd;">$1</em>');

            // Lists
            html = html.replace(/^[•\-]\s+(.+)$/gm, '<li style="margin:8px 0; color:#e0e7ff; line-height:1.6; display:list-item; margin-left:8px;">$1</li>');
            html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul style="padding-left:24px; margin:16px 0; list-style-type:disc;">$&</ul>');

            // STEP 5: Re-inject safe code blocks
            codeBlocks.forEach((block, i) => {
                html = html.replace(`__CODE_BLOCK_${i}__`, block);
            });

            // Final wrap with proper spacing and text flow
            return `<div class="ai-text-flow" style="white-space: pre-wrap; word-break: break-word; color: #e0e7ff; line-height:1.6; font-size:14px;">${html}</div>`;
        }


        _highlightCode(code, lang) {
            if (lang === 'python' || lang === 'py') {
                return this._highlightPython(code);
            } else if (lang === 'javascript' || lang === 'js') {
                return this._highlightJavaScript(code);
            }
            // For unsupported languages, escape HTML
            return this._escapeHtml(code);
        }

        _escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        _highlightPython(code) {
            const placeholders = [];
            const generatePlaceholder = (content, type) => {
                const id = `__${type}_${placeholders.length}__`;
                placeholders.push({ id, content, type });
                return id;
            };

            const strings = /(['"])(?:(?=(\\?))\2.)*?\1/g;
            const comments = /#.*/g;

            // 1. Extract Strings
            code = code.replace(strings, (match) => generatePlaceholder(match, 'STR'));

            // 2. Extract Comments
            code = code.replace(comments, (match) => generatePlaceholder(match, 'COM'));

            // 3. Escape HTML of the skeleton
            code = this._escapeHtml(code);

            // 4. Highlight Tokens
            const keywords = /\b(from|import|def|class|return|if|elif|else|for|while|in|is|not|and|or|as|with|try|except|finally|raise|assert|break|continue|pass|lambda|yield|True|False|None)\b/g;
            const builtins = /\b(print|range|len|str|int|float|list|dict|set|tuple|open|input|type|isinstance|enumerate|zip|map|filter|sorted|sum|max|min|abs|round|any|all)\b/g;
            const numbers = /\b\d+\.?\d*\b/g;
            const classes = /\b[A-Z]\w+\b/g;
            const functions = /\b\w+(?=\()/g;

            code = code.replace(keywords, '<span style="color:#c586c0;">$&</span>');
            code = code.replace(builtins, '<span style="color:#569cd6;">$&</span>');
            code = code.replace(numbers, '<span style="color:#b5cea8;">$&</span>');
            code = code.replace(classes, '<span style="color:#4ec9b0;">$&</span>');
            code = code.replace(functions, '<span style="color:#dcdcaa;">$&</span>');

            // 5. Restore Placeholders
            placeholders.forEach(p => {
                let content = this._escapeHtml(p.content);
                let span = content;
                if (p.type === 'STR') {
                    span = `<span style="color:#ce9178;">${content}</span>`;
                } else if (p.type === 'COM') {
                    span = `<span style="color:#6a9955;">${content}</span>`;
                }
                code = code.replace(p.id, span);
            });

            return code;
        }

        _highlightJavaScript(code) {
            const placeholders = [];
            const generatePlaceholder = (content, type) => {
                const id = `__${type}_${placeholders.length}__`;
                placeholders.push({ id, content, type });
                return id;
            };

            const strings = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
            const comments = /\/\/.*/g;

            // 1. Extract Strings
            code = code.replace(strings, (match) => generatePlaceholder(match, 'STR'));

            // 2. Extract Comments
            code = code.replace(comments, (match) => generatePlaceholder(match, 'COM'));

            // 3. Escape HTML
            code = this._escapeHtml(code);

            // 4. Highlight Tokens
            const keywords = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|this|class|extends|import|export|from|default|async|await)\b/g;
            const builtins = /\b(console|Math|Array|Object|String|Number|Boolean|Date|RegExp|Promise|Set|Map|JSON)\b/g;
            const numbers = /\b\d+\.?\d*\b/g;

            code = code.replace(keywords, '<span style="color:#c586c0;">$&</span>');
            code = code.replace(builtins, '<span style="color:#569cd6;">$&</span>');
            code = code.replace(numbers, '<span style="color:#b5cea8;">$&</span>');

            // 5. Restore Placeholders
            placeholders.forEach(p => {
                let content = this._escapeHtml(p.content);
                let span = content;
                if (p.type === 'STR') {
                    span = `<span style="color:#ce9178;">${content}</span>`;
                } else if (p.type === 'COM') {
                    span = `<span style="color:#6a9955;">${content}</span>`;
                }
                code = code.replace(p.id, span);
            });

            return code;
        }


        /**
         * Add copy functionality to code blocks.
         */
        _addCopyButtons(container) {
            const copyButtons = container.querySelectorAll('.ai-code-copy');
            copyButtons.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const codeBlock = btn.closest('.ai-code-block');
                    const code = codeBlock.querySelector('code').textContent;

                    try {
                        await navigator.clipboard.writeText(code);
                        const span = btn.querySelector('span');
                        const originalText = span.textContent;
                        span.textContent = 'Copied!';
                        btn.classList.add('copied');

                        setTimeout(() => {
                            span.textContent = originalText;
                            btn.classList.remove('copied');
                        }, 2000);
                    } catch (err) {
                        console.error('Failed to copy:', err);
                    }
                });
            });
        }

        /**
         * Show typing indicator.
         */
        _showTypingIndicator() {
            if (!this.chatArea) return;

            const existing = this.chatArea.querySelector('.ai-agent-typing');
            if (existing) return;

            const indicator = document.createElement('div');
            indicator.className = 'ai-agent-typing';
            indicator.innerHTML = `
                <div class="ai-agent-typing__dot"></div>
                <div class="ai-agent-typing__dot"></div>
                <div class="ai-agent-typing__dot"></div>
            `;
            this.chatArea.appendChild(indicator);
            this.chatArea.scrollTop = this.chatArea.scrollHeight;
        }

        /**
         * Remove typing indicator.
         */
        _removeTypingIndicator() {
            if (!this.chatArea) return;
            const indicator = this.chatArea.querySelector('.ai-agent-typing');
            if (indicator) indicator.remove();
        }

        // ======================================================================
        // BACKEND COMMUNICATION
        // ======================================================================

        /**
         * Call the backend AI endpoint.
         * @param {string} message - The user's message
         * @returns {Promise<object>} The AI response
         */
        async _callBackend(message) {
            const endpoint = '/api/ai/agent_chat';

            // Get API key from localStorage (stored by ai_key_manager.js from header modal)
            const apiKey = localStorage.getItem('quantum_ai_key');
            const aiProvider = localStorage.getItem('quantum_ai_provider');

            const payload = {
                message: message,
                context: this.state.context,
                state: {
                    currentCircuit: this.state.currentCircuit,
                    lastResults: this.state.lastResults
                },
                // Include API key from localStorage for AI service
                api_key: apiKey,
                ai_provider: aiProvider
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Validate response structure
            if (typeof data.reply !== 'string') {
                // Fallback for malformed responses
                return {
                    reply: typeof data === 'string' ? data : 'No response.',
                    commands: []
                };
            }

            return data;
        }

        // ======================================================================
        // DOM CREATION
        // ======================================================================

        /**
         * Create the panel DOM structure.
         */
        _createPanelDOM() {
            // Remove existing panel if any
            const existing = document.getElementById('ai-agent-panel');
            if (existing) existing.remove();

            // Create panel container
            this.panel = document.createElement('div');
            this.panel.id = 'ai-agent-panel';
            this.panel.className = 'ai-agent-panel';
            this.panel.setAttribute('role', 'dialog');
            this.panel.setAttribute('aria-label', 'AI Agent Panel');
            this.panel.setAttribute('aria-hidden', 'true');

            this.panel.innerHTML = `
                <div class="ai-agent-panel__header">
                    <div class="ai-agent-panel__title">
                        <svg class="ai-agent-panel__icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                        <span>AI Agent</span>
                    </div>
                    <div class="ai-agent-panel__controls">
                        <button class="ai-agent-panel__btn ai-agent-panel__btn--minimize" title="Minimize" aria-label="Minimize panel">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
                        </button>
                        <button class="ai-agent-panel__btn ai-agent-panel__btn--close" title="Close (ESC)" aria-label="Close panel">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                        </button>
                    </div>
                </div>
                <div class="ai-agent-panel__chat" id="ai-agent-chat"></div>
                <div class="ai-agent-panel__input-area">
                    <textarea 
                        class="ai-agent-panel__input" 
                        id="ai-agent-input" 
                        placeholder="Ask about quantum computing... (Enter to send, Shift+Enter for newline)"
                        rows="2"
                    ></textarea>
                    <button class="ai-agent-panel__send" id="ai-agent-send" title="Send message" aria-label="Send message">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            `;

            document.body.appendChild(this.panel);

            // Cache DOM references
            this.chatArea = this.panel.querySelector('#ai-agent-chat');
            this.inputField = this.panel.querySelector('#ai-agent-input');

            // Show welcome message
            this.appendAIMessage("I'm your Quantum AI Agent. I can help you create circuits, run simulations, and explain quantum concepts. What would you like to explore?");
        }

        /**
         * Attach event listeners to panel elements.
         */
        _attachEventListeners() {
            // Close button
            const closeBtn = this.panel.querySelector('.ai-agent-panel__btn--close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.close());
            }

            // Minimize button (same as close for now)
            const minimizeBtn = this.panel.querySelector('.ai-agent-panel__btn--minimize');
            if (minimizeBtn) {
                minimizeBtn.addEventListener('click', () => this.close());
            }

            // Send button
            const sendBtn = this.panel.querySelector('#ai-agent-send');
            if (sendBtn) {
                sendBtn.addEventListener('click', () => {
                    this.sendMessage(this.inputField?.value);
                });
            }

            // Input field keyboard handling
            if (this.inputField) {
                this.inputField.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage(this.inputField.value);
                    }
                });
            }
        }

        /**
         * Attach global event listeners (ESC key).
         */
        _attachGlobalListeners() {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.panel?.classList.contains('open')) {
                    this.close();
                }
            });
        }
    }

    // ==========================================================================
    // GLOBAL EXPORT
    // ==========================================================================

    // Create singleton instance
    const instance = new AIAgentPanel();

    // Expose to global scope
    window.AIAgentPanel = {
        init: () => instance.init(),
        open: () => instance.open(),
        close: () => instance.close(),
        toggle: () => instance.toggle(),
        sendMessage: (text) => instance.sendMessage(text),
        processAIResponse: (response) => instance.processAIResponse(response),
        executeCommand: (command) => instance.executeCommand(command),
        showError: (message) => instance.showError(message),
        appendUserMessage: (text) => instance.appendUserMessage(text),
        appendAIMessage: (text) => instance.appendAIMessage(text),
        appendSystemMessage: (text) => instance.appendSystemMessage(text),
        getContext: () => instance.getContext(),
        setContext: (next) => instance.setContext(next),
        resetContext: () => instance.resetContext(),
        getState: () => ({ ...instance.state })
    };

    console.log('[AIAgentPanel] Module loaded. Call window.AIAgentPanel.init() to initialize.');

})();
