// AI Integration with Google Gemini for Quantum Computing Explanations
// Provides intelligent explanations and insights for quantum concepts

class QuantumAI {
    constructor() {
        this.apiKey = null;
        this.isInitialized = false;
        this.explanationCache = new Map();
        this.isProcessing = false;
        
        this.init();
    }

    init() {
        console.log('🤖 Initializing Quantum AI Integration...');
        this.setupAIInterface();
        this.loadAPIKey();
    }

    setupAIInterface() {
        // Create AI explanation panel
        this.createAIExplanationPanel();
        
        // Add AI buttons to widgets
        this.addAIButtonsToWidgets();
        
        // Setup event listeners
        this.setupAIEventListeners();
    }

    createAIExplanationPanel() {
        const aiPanel = document.createElement('div');
        aiPanel.id = 'ai-explanation-panel';
        aiPanel.className = 'ai-explanation-panel';
        aiPanel.innerHTML = `
            <div class="ai-panel-header">
                <div class="ai-header-content">
                    <i class="fas fa-robot"></i>
                    <h3>Quantum AI Assistant</h3>
                    <span class="ai-status" id="ai-status">Ready</span>
                </div>
                <button class="close-btn" id="close-ai-panel">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="ai-panel-content">
                <div class="ai-conversation" id="ai-conversation">
                    <div class="ai-message">
                        <div class="ai-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="ai-text">
                            <p>Hello! I'm your Quantum AI Assistant. I can explain quantum concepts, analyze your circuits, and help you understand what's happening in your quantum experiments.</p>
                            <p>Try asking me about:</p>
                            <ul>
                                <li>Bloch sphere visualizations</li>
                                <li>Quantum gate operations</li>
                                <li>Entanglement phenomena</li>
                                <li>Measurement results</li>
                                <li>Quantum algorithms</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="ai-input-section">
                    <div class="ai-input-container">
                        <input type="text" id="ai-input" placeholder="Ask me about quantum computing..." />
                        <button id="ai-send-btn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                    <div class="ai-quick-actions">
                        <button class="ai-quick-btn" data-action="explain-bloch">Explain Bloch Sphere</button>
                        <button class="ai-quick-btn" data-action="explain-entanglement">Explain Entanglement</button>
                        <button class="ai-quick-btn" data-action="explain-results">Analyze Results</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(aiPanel);
    }

    addAIButtonsToWidgets() {
        // Add AI explanation buttons to relevant widgets
        const widgets = [
            { selector: '.bloch-widget .widget-header', action: 'explain-bloch' },
            { selector: '.entanglement-widget .widget-header', action: 'explain-entanglement' },
            { selector: '.results-widget .widget-header', action: 'explain-results' },
            { selector: '.circuit-widget .widget-header', action: 'explain-circuit' }
        ];

        widgets.forEach(({ selector, action }) => {
            const header = document.querySelector(selector);
            if (header) {
                const aiBtn = document.createElement('button');
                aiBtn.className = 'widget-btn ai-explain-btn';
                aiBtn.innerHTML = '<i class="fas fa-robot"></i>';
                aiBtn.title = 'Get AI Explanation';
                aiBtn.dataset.action = action;
                
                const controls = header.querySelector('.widget-controls');
                if (controls) {
                    controls.appendChild(aiBtn);
                }
            }
        });
    }

    setupAIEventListeners() {
        // AI panel controls
        const closeBtn = document.getElementById('close-ai-panel');
        const sendBtn = document.getElementById('ai-send-btn');
        const aiInput = document.getElementById('ai-input');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeAIPanel());
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendAIMessage());
        }

        if (aiInput) {
            aiInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendAIMessage();
                }
            });
        }

        // Quick action buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.ai-quick-btn')) {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            } else if (e.target.matches('.ai-explain-btn')) {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            }
        });
    }

    loadAPIKey() {
        // Try to load API key from localStorage or environment
        this.apiKey = localStorage.getItem('gemini-api-key') || 'YOUR_GEMINI_API_KEY';
        
        if (this.apiKey && this.apiKey !== 'YOUR_GEMINI_API_KEY') {
            this.isInitialized = true;
            this.updateAIStatus('Ready');
        } else {
            this.updateAIStatus('API Key Required');
            this.showAPIKeyPrompt();
        }
    }

    showAPIKeyPrompt() {
        const modal = document.createElement('div');
        modal.className = 'ai-api-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🤖 AI Assistant Setup</h3>
                <p>To use the AI assistant, you need a Google Gemini API key.</p>
                <p>Get your free API key from: <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></p>
                <div class="api-key-input">
                    <input type="password" id="api-key-input" placeholder="Enter your Gemini API key" />
                    <button id="save-api-key">Save</button>
                </div>
                <p class="note">Your API key is stored locally and never sent to our servers.</p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const saveBtn = document.getElementById('save-api-key');
        const input = document.getElementById('api-key-input');
        
        saveBtn.addEventListener('click', () => {
            const key = input.value.trim();
            if (key) {
                this.apiKey = key;
                localStorage.setItem('gemini-api-key', key);
                this.isInitialized = true;
                this.updateAIStatus('Ready');
                modal.remove();
                this.showAIMessage('AI Assistant is now ready to help!', 'ai');
            }
        });
    }

    async sendAIMessage() {
        const input = document.getElementById('ai-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        if (!this.isInitialized) {
            this.showAIMessage('Please set up your API key first.', 'error');
            return;
        }
        
        // Add user message to conversation
        this.addMessageToConversation(message, 'user');
        input.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await this.getAIResponse(message);
            this.hideTypingIndicator();
            this.addMessageToConversation(response, 'ai');
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessageToConversation('Sorry, I encountered an error. Please try again.', 'error');
            console.error('AI Error:', error);
        }
    }

    async getAIResponse(message) {
        if (this.isProcessing) {
            return 'Please wait, I\'m still processing your previous request.';
        }
        
        this.isProcessing = true;
        
        // Check cache first
        const cacheKey = message.toLowerCase();
        if (this.explanationCache.has(cacheKey)) {
            this.isProcessing = false;
            return this.explanationCache.get(cacheKey);
        }
        
        try {
            // Get current quantum state context
            const context = this.getQuantumContext();
            
            // Prepare prompt for Gemini
            const prompt = this.buildPrompt(message, context);
            
            // Call Gemini API
            const response = await this.callGeminiAPI(prompt);
            
            // Cache the response
            this.explanationCache.set(cacheKey, response);
            
            this.isProcessing = false;
            return response;
        } catch (error) {
            this.isProcessing = false;
            throw error;
        }
    }

    buildPrompt(message, context) {
        return `You are a quantum computing expert AI assistant. The user is working with a quantum dashboard that shows:

Current Context:
- Bloch Sphere State: ${context.blochState}
- Quantum State: ${context.quantumState}
- Active Jobs: ${context.activeJobs}
- Backend Status: ${context.backendStatus}
- Entanglement Data: ${context.entanglementData}

User Question: "${message}"

Please provide a clear, educational explanation that:
1. Answers the user's question directly
2. Explains quantum concepts in accessible terms
3. Relates to their current quantum state if relevant
4. Provides practical insights
5. Keeps the response concise but informative

Format your response in a friendly, conversational tone suitable for someone learning quantum computing.`;
    }

    getQuantumContext() {
        const context = {
            blochState: 'Unknown',
            quantumState: 'Unknown',
            activeJobs: 'Unknown',
            backendStatus: 'Unknown',
            entanglementData: 'Unknown'
        };
        
        // Get current Bloch sphere state
        if (window.enhancedBlochSphere) {
            context.blochState = `[${window.enhancedBlochSphere.blochState.join(', ')}]`;
            context.quantumState = `|ψ⟩ = ${window.enhancedBlochSphere.quantumState[0].toFixed(3)}|0⟩ + ${window.enhancedBlochSphere.quantumState[1].toFixed(3)}|1⟩`;
        }
        
        // Get job information
        const jobsTable = document.getElementById('jobs-body');
        if (jobsTable) {
            const jobRows = jobsTable.querySelectorAll('tr');
            context.activeJobs = `${jobRows.length} jobs active`;
        }
        
        // Get backend information
        const backendsList = document.getElementById('backends-content');
        if (backendsList) {
            const backendItems = backendsList.querySelectorAll('.backend-item');
            context.backendStatus = `${backendItems.length} backends online`;
        }
        
        return context;
    }

    async callGeminiAPI(prompt) {
        if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY') {
            throw new Error('API key not configured');
        }
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('Invalid API response format');
        }
    }

    handleQuickAction(action) {
        const actions = {
            'explain-bloch': 'Can you explain what the Bloch sphere represents and how to interpret the current quantum state?',
            'explain-entanglement': 'What is quantum entanglement and how does it work?',
            'explain-results': 'Can you analyze these measurement results and explain what they mean?',
            'explain-circuit': 'Can you explain this quantum circuit and what gates are being applied?'
        };
        
        const message = actions[action];
        if (message) {
            this.openAIPanel();
            document.getElementById('ai-input').value = message;
            this.sendAIMessage();
        }
    }

    addMessageToConversation(message, sender) {
        const conversation = document.getElementById('ai-conversation');
        if (!conversation) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message`;
        
        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-text">
                    <p>${message}</p>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="ai-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="ai-text">
                    <p>${message}</p>
                </div>
            `;
        }
        
        conversation.appendChild(messageDiv);
        conversation.scrollTop = conversation.scrollHeight;
    }

    showTypingIndicator() {
        const conversation = document.getElementById('ai-conversation');
        if (!conversation) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="ai-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-text">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        conversation.appendChild(typingDiv);
        conversation.scrollTop = conversation.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    openAIPanel() {
        const panel = document.getElementById('ai-explanation-panel');
        if (panel) {
            panel.classList.add('active');
        }
    }

    closeAIPanel() {
        const panel = document.getElementById('ai-explanation-panel');
        if (panel) {
            panel.classList.remove('active');
        }
    }

    updateAIStatus(status) {
        const statusElement = document.getElementById('ai-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `ai-status ${status.toLowerCase().replace(' ', '-')}`;
        }
    }

    showAIMessage(message, type = 'ai') {
        this.addMessageToConversation(message, type);
    }
}

// Initialize AI system
document.addEventListener('DOMContentLoaded', () => {
    window.quantumAI = new QuantumAI();
});