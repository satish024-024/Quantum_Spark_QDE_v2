// Quantum AI Enhancement - Offline LLM Integration
// Adds powerful offline AI capabilities to the existing dashboard

class QuantumAIEnhancement {
    constructor(existingAI) {
        this.existingAI = existingAI;
        this.isInitialized = false;
        this.models = {};
        this.apiEndpoints = {
            generateCircuit: '/api/ai/generate_circuit',
            quantumChat: '/api/ai/quantum_chat',
            similarConcepts: '/api/ai/similar_concepts',
            aiStatus: '/api/ai/status'
        };

        this.init();
    }

    async init() {
        console.log('🚀 Initializing Quantum AI Enhancement...');

        // Check Cloud-First AI status
        await this.checkCloudFirstAIStatus();

        // Enhance existing AI with offline capabilities
        this.enhanceExistingAI();

        // Add new AI features to UI
        this.addAIFeaturesToUI();

        this.isInitialized = true;
        console.log('✅ Quantum AI Enhancement initialized');

        // Add dashboard data access methods
        this.addDashboardDataAccess();
    }

    addDashboardDataAccess() {
        // Add global function for AI to access dashboard data
        window.getDashboardData = () => this.getAllDashboardData();
        window.getWidgetData = (widgetType) => this.getWidgetData(widgetType);
        window.getQuantumBackends = () => this.getQuantumBackendsData();
        window.getCurrentCircuit = () => this.getCurrentCircuitData();
        window.getJobHistory = () => this.getJobHistoryData();
        window.getSystemStatus = () => this.getSystemStatusData();
        window.getIBMQuantumData = () => this.getIBMQuantumData();
        window.getJobResults = (jobId) => this.getJobResults(jobId);
        window.getBackendStatus = (backendName) => this.getBackendStatus(backendName);
    }

    getAllDashboardData() {
        return {
            backends: this.getQuantumBackendsData(),
            currentCircuit: this.getCurrentCircuitData(),
            jobHistory: this.getJobHistoryData(),
            systemStatus: this.getSystemStatusData(),
            widgets: this.getAllWidgetData(),
            timestamp: new Date().toISOString()
        };
    }

    getQuantumBackendsData() {
        try {
            // Try to get data from various sources
            if (window.dashboard && window.dashboard.backendData) {
                return window.dashboard.backendData;
            }

            // Try to extract from DOM elements
            const backendElements = document.querySelectorAll('[data-backend], .backend-item, .quantum-backend');
            const backends = [];

            backendElements.forEach(el => {
                const backendName = el.dataset.backend || el.textContent.trim();
                const status = el.classList.contains('operational') ? 'operational' :
                              el.classList.contains('maintenance') ? 'maintenance' : 'unknown';
                const queue = el.dataset.queue || 'N/A';
                const qubits = el.dataset.qubits || 'N/A';

                backends.push({
                    name: backendName,
                    status: status,
                    queue: queue,
                    qubits: qubits
                });
            });

            return backends.length > 0 ? backends : 'No backend data available';
        } catch (error) {
            console.error('Error getting backend data:', error);
            return 'Error accessing backend data';
        }
    }

    getCurrentCircuitData() {
        try {
            // Try to get circuit data from various sources
            if (window.currentCircuit) {
                return window.currentCircuit;
            }

            if (window.circuitVisualizer && window.circuitVisualizer.getCurrentCircuit) {
                return window.circuitVisualizer.getCurrentCircuit();
            }

            // Try to extract from DOM
            const circuitInfo = {
                qubits: document.getElementById('qubit-count-simple')?.textContent || 'Unknown',
                gates: document.getElementById('gate-count-simple')?.textContent || 'Unknown',
                depth: document.getElementById('depth-count-simple')?.textContent || 'Unknown'
            };

            return circuitInfo;
        } catch (error) {
            console.error('Error getting circuit data:', error);
            return 'Error accessing circuit data';
        }
    }

    getJobHistoryData() {
        try {
            // Try to get job data from dashboard
            if (window.dashboard && window.dashboard.jobHistory) {
                return window.dashboard.jobHistory;
            }

            // Try to extract from DOM
            const jobElements = document.querySelectorAll('.job-item, [data-job-id]');
            const jobs = [];

            jobElements.forEach(el => {
                jobs.push({
                    id: el.dataset.jobId || el.id || 'Unknown',
                    status: el.dataset.status || 'Unknown',
                    backend: el.dataset.backend || 'Unknown',
                    submitted: el.dataset.submitted || 'Unknown'
                });
            });

            return jobs.length > 0 ? jobs : 'No job history available';
        } catch (error) {
            console.error('Error getting job history:', error);
            return 'Error accessing job history';
        }
    }

    getSystemStatusData() {
        try {
            return {
                timestamp: new Date().toISOString(),
                connectionStatus: document.querySelector('.connection-status')?.textContent || 'Unknown',
                lastRefresh: document.querySelector('.countdown-display')?.textContent || 'Unknown',
                version: 'Quantum Spark v2.0',
                userAgent: navigator.userAgent
            };
        } catch (error) {
            console.error('Error getting system status:', error);
            return 'Error accessing system status';
        }
    }

    getWidgetData(widgetType) {
        try {
            const widget = document.querySelector(`[data-widget="${widgetType}"]`);
            if (!widget) return null;

            const widgetData = {
                type: widgetType,
                isVisible: widget.style.display !== 'none',
                content: widget.querySelector('.widget-content')?.textContent || '',
                status: widget.querySelector('.loading') ? 'loading' : 'loaded'
            };

            // Widget-specific data extraction
            switch (widgetType) {
                case 'quantum-backends':
                    widgetData.backends = this.getQuantumBackendsData();
                    break;
                case 'quantum-jobs':
                    widgetData.jobs = this.getJobHistoryData();
                    break;
                case '3d-quantum-circuit':
                    widgetData.circuit = this.getCurrentCircuitData();
                    break;
                case 'ai-chat':
                    widgetData.messages = this.getChatMessages();
                    break;
            }

            return widgetData;
        } catch (error) {
            console.error(`Error getting widget data for ${widgetType}:`, error);
            return null;
        }
    }

    getAllWidgetData() {
        const widgets = ['quantum-backends', 'quantum-jobs', '3d-quantum-circuit', 'ai-chat', 'historical-data', 'backend-comparison'];
        const widgetData = {};

        widgets.forEach(widgetType => {
            widgetData[widgetType] = this.getWidgetData(widgetType);
        });

        return widgetData;
    }

    getChatMessages() {
        try {
            const messages = [];
            const messageElements = document.querySelectorAll('#chat-messages .message');

            messageElements.forEach(el => {
                const isAI = el.classList.contains('ai-message');
                const content = el.querySelector('.message-content')?.textContent || '';
                messages.push({
                    type: isAI ? 'ai' : 'user',
                    content: content,
                    timestamp: new Date().toISOString()
                });
            });

            return messages;
        } catch (error) {
            console.error('Error getting chat messages:', error);
            return [];
        }
    }

    async getIBMQuantumData() {
        try {
            // Try to fetch real IBM Quantum data from API
            const response = await fetch('/api/backends');
            if (response.ok) {
                const data = await response.json();
                return {
                    backends: data.backends || data,
                    totalBackends: data.total_backends || (data.backends ? data.backends.length : 0),
                    lastUpdated: data.timestamp || new Date().toISOString(),
                    source: 'IBM Quantum API'
                };
            }

            // Fallback to cached/dashboard data
            const fallbackData = this.getQuantumBackendsData();
            return {
                backends: fallbackData,
                totalBackends: Array.isArray(fallbackData) ? fallbackData.length : 0,
                lastUpdated: new Date().toISOString(),
                source: 'Dashboard Cache',
                note: 'Real IBM Quantum data not available'
            };
        } catch (error) {
            console.error('Error fetching IBM Quantum data:', error);
            return {
                error: 'Failed to fetch IBM Quantum data',
                details: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async getJobResults(jobId) {
        try {
            if (!jobId) {
                return { error: 'Job ID is required' };
            }

            // Try to fetch job results from API
            const response = await fetch(`/api/job/${jobId}`);
            if (response.ok) {
                const data = await response.json();
                return {
                    jobId: jobId,
                    status: data.status || 'unknown',
                    results: data.results || null,
                    executionTime: data.execution_time || null,
                    backend: data.backend || null,
                    submitted: data.submitted_at || null,
                    completed: data.completed_at || null,
                    source: 'IBM Quantum API'
                };
            }

            // Fallback to dashboard job data
            const jobHistory = this.getJobHistoryData();
            if (Array.isArray(jobHistory)) {
                const job = jobHistory.find(j => j.id === jobId || j.jobId === jobId);
                if (job) {
                    return {
                        jobId: jobId,
                        status: job.status || 'unknown',
                        results: job.results || null,
                        backend: job.backend || null,
                        submitted: job.submitted || null,
                        source: 'Dashboard Cache',
                        note: 'Real job results not available'
                    };
                }
            }

            return {
                jobId: jobId,
                status: 'not_found',
                error: 'Job not found',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching job results:', error);
            return {
                jobId: jobId,
                error: 'Failed to fetch job results',
                details: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async getBackendStatus(backendName) {
        try {
            if (!backendName) {
                return { error: 'Backend name is required' };
            }

            // Try to fetch backend status from API
            const response = await fetch(`/api/backend/${backendName}`);
            if (response.ok) {
                const data = await response.json();
                return {
                    name: backendName,
                    status: data.status || 'unknown',
                    qubits: data.qubits || 0,
                    queueLength: data.queue_length || 0,
                    pendingJobs: data.pending_jobs || 0,
                    lastCalibration: data.last_calibration || null,
                    t1Time: data.t1_time || null,
                    t2Time: data.t2_time || null,
                    gateError: data.gate_error || null,
                    readoutError: data.readout_error || null,
                    connectivity: data.connectivity || null,
                    source: 'IBM Quantum API'
                };
            }

            // Fallback to dashboard backend data
            const backends = this.getQuantumBackendsData();
            if (Array.isArray(backends)) {
                const backend = backends.find(b => b.name === backendName || b.backend_name === backendName);
                if (backend) {
                    return {
                        name: backendName,
                        status: backend.status || 'unknown',
                        qubits: backend.qubits || backend.num_qubits || 0,
                        queueLength: backend.queue_length || backend.queue || 0,
                        source: 'Dashboard Cache',
                        note: 'Detailed backend metrics not available'
                    };
                }
            }

            return {
                name: backendName,
                status: 'not_found',
                error: 'Backend not found',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching backend status:', error);
            return {
                name: backendName,
                error: 'Failed to fetch backend status',
                details: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async checkCloudFirstAIStatus() {
        try {
            const response = await fetch(this.apiEndpoints.aiStatus);
            const data = await response.json();

            if (data.success) {
                this.cloudFirstAIAvailable = data.ai_status.cloud_first_ai_available;
                this.localModelsAvailable = data.ai_status.local_models_available || false;
                this.cloudProviders = data.ai_status.cloud_providers || {};
                this.availableProviders = data.ai_status.available_providers || [];

                console.log('☁️ Cloud-First AI Status:', {
                    cloudFirstAI: this.cloudFirstAIAvailable,
                    availableProviders: this.availableProviders,
                    cloudProviders: this.cloudProviders,
                    message: data.message
                });
            }
        } catch (error) {
            console.warn('⚠️ Could not check Cloud-First AI status:', error);
            this.cloudFirstAIAvailable = false;
            this.availableProviders = [];
        }
    }

    enhanceExistingAI() {
        if (!this.existingAI) return;

        // Enhance the existing AI chat function
        const originalProcessMessage = this.existingAI.processMessage?.bind(this.existingAI);
        if (originalProcessMessage) {
            this.existingAI.processMessage = async (message, context) => {
                // Try quantum AI first if available
                if (this.quantumAIAvailable && this.models.chat_assistant === 'ready') {
                    try {
                        const quantumResponse = await this.quantumChat(message);
                        if (quantumResponse) {
                            console.log('🧠 Using Quantum AI LLM for response');
                            return quantumResponse;
                        }
                    } catch (error) {
                        console.warn('⚠️ Quantum AI failed, falling back to existing AI:', error);
                    }
                }

                // Fall back to original AI
                return originalProcessMessage(message, context);
            };
        }

        // Add circuit generation capability
        this.existingAI.generateCircuitFromText = (description, qubits = 2) => {
            return this.generateCircuit(description, qubits);
        };

        console.log('🔄 Enhanced existing AI with quantum capabilities');
    }

    addAIFeaturesToUI() {
        // Add AI status indicator
        this.addAIStatusIndicator();

        // Add circuit generation UI (Disabled for QDE Workspace v2)
        // this.addCircuitGenerationUI();

        // Add concept similarity search (Disabled for QDE Workspace v2)
        // this.addConceptSimilarityUI();

        // Add cloud AI configuration (Disabled for QDE Workspace v2)
        // this.addCloudAIConfigUI();

        // Enhance existing chat interface
        this.enhanceChatInterface();
    }

    addAIStatusIndicator() {
        // Disabled for QDE Workspace v2 — the floating status bar conflicts with the clean workspace layout.
        // AI status is shown inside the AI Copilot widget instead.
        return;
    }

    updateAIStatusDisplay() {
        const statusText = document.getElementById('ai-status-text');
        const modelsList = document.getElementById('ai-models-list');

        if (!statusText || !modelsList) return;

        let statusMessage = '';
        let statusColor = '#FF9800'; // Orange for limited
        let modelBadges = [];

        if (this.cloudFirstAIAvailable) {
            const providerCount = this.availableProviders.length;
            if (providerCount > 0) {
                statusMessage = `Cloud AI Ready (${providerCount} providers)`;
                statusColor = '#4CAF50'; // Green
                modelBadges = this.availableProviders.map(provider =>
                    `<span class="ai-model-badge cloud">${provider}</span>`
                );
            } else {
                statusMessage = 'Cloud AI Available (Configure API keys)';
                statusColor = '#2196F3'; // Blue
                modelBadges = ['<span class="ai-model-badge">API Config Needed</span>'];
            }
        } else {
            statusMessage = 'Cloud AI Offline - Using Fallback';
            statusColor = '#FF9800'; // Orange
            modelBadges = ['<span class="ai-model-badge">Basic Mode</span>'];
        }

        statusText.textContent = statusMessage;
        statusText.style.color = statusColor;
        modelsList.innerHTML = modelBadges.join('');
    }

    addCircuitGenerationUI() {
        const circuitGenUI = document.createElement('div');
        circuitGenUI.id = 'ai-circuit-generator';
        circuitGenUI.className = 'ai-circuit-generator';
        circuitGenUI.innerHTML = `
            <div class="circuit-gen-header">
                <h4><i class="fas fa-magic"></i> AI Circuit Generator</h4>
                <button class="close-btn" onclick="this.parentElement.parentElement.style.display='none'">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="circuit-gen-content">
                <div class="input-group">
                    <label for="circuit-description">Describe your circuit:</label>
                    <textarea id="circuit-description" placeholder="e.g., Create a quantum teleportation circuit with 3 qubits"
                        rows="3"></textarea>
                </div>
                <div class="input-group">
                    <label for="circuit-qubits">Number of qubits:</label>
                    <input type="number" id="circuit-qubits" value="2" min="1" max="10">
                </div>
                <button id="generate-circuit-btn" class="generate-btn">
                    <i class="fas fa-cogs"></i> Generate Circuit
                </button>
                <div id="circuit-result" class="circuit-result" style="display:none;">
                    <h5>Generated Circuit:</h5>
                    <pre id="circuit-code"></pre>
                    <button id="copy-circuit-btn" class="copy-btn">
                        <i class="fas fa-copy"></i> Copy Code
                    </button>
                    <button id="execute-circuit-btn" class="execute-btn">
                        <i class="fas fa-play"></i> Execute Circuit
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(circuitGenUI);

        // Add event listeners
        document.getElementById('generate-circuit-btn').addEventListener('click', () => {
            this.generateCircuitFromUI();
        });

        document.getElementById('copy-circuit-btn').addEventListener('click', () => {
            this.copyCircuitCode();
        });

        document.getElementById('execute-circuit-btn').addEventListener('click', () => {
            this.executeGeneratedCircuit();
        });
    }

    addConceptSimilarityUI() {
        const conceptUI = document.createElement('div');
        conceptUI.id = 'ai-concept-similarity';
        conceptUI.className = 'ai-concept-similarity';
        conceptUI.innerHTML = `
            <div class="concept-header">
                <h4><i class="fas fa-search"></i> Find Related Concepts</h4>
                <button class="close-btn" onclick="this.parentElement.parentElement.style.display='none'">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="concept-content">
                <div class="input-group">
                    <label for="concept-query">Enter a quantum concept:</label>
                    <input type="text" id="concept-query" placeholder="e.g., entanglement">
                </div>
                <button id="find-concepts-btn" class="find-btn">
                    <i class="fas fa-search"></i> Find Similar
                </button>
                <div id="concept-results" class="concept-results" style="display:none;">
                    <h5>Related Concepts:</h5>
                    <ul id="concept-list"></ul>
                </div>
            </div>
        `;

        document.body.appendChild(conceptUI);

        // Add event listener
        document.getElementById('find-concepts-btn').addEventListener('click', () => {
            this.findSimilarConcepts();
        });
    }

    addCloudAIConfigUI() {
        const cloudConfigUI = document.createElement('div');
        cloudConfigUI.id = 'ai-cloud-config';
        cloudConfigUI.className = 'ai-cloud-config';
        cloudConfigUI.innerHTML = `
            <div class="cloud-config-header">
                <h4><i class="fas fa-cloud"></i> Cloud AI Configuration</h4>
                <button class="close-btn" onclick="this.parentElement.parentElement.style.display='none'">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="cloud-config-content">
                <div class="config-info">
                    <p><strong>🚀 Cloud-First AI</strong> - No downloads required! All AI runs through cloud APIs.</p>
                    <p>Get API keys from these providers (start with free ones):</p>
                    <ul>
                        <li><a href="https://huggingface.co/settings/tokens" target="_blank">🤗 Hugging Face</a> <strong>(FREE)</strong></li>
                        <li><a href="https://api.together.xyz/" target="_blank">🚀 Together AI</a> (Very low cost)</li>
                        <li><a href="https://platform.openai.com/api-keys" target="_blank">💰 OpenAI</a> (Pay per use)</li>
                        <li><a href="https://console.anthropic.com/" target="_blank">🧠 Anthropic Claude</a> (Pay per use)</li>
                    </ul>
                    <p><em>Your website users will get full AI features instantly - no waiting for downloads!</em></p>
                </div>
                <div class="provider-config">
                    <label for="ai-provider-select">AI Provider:</label>
                    <select id="ai-provider-select">
                        <option value="huggingface">🤗 Hugging Face (FREE)</option>
                        <option value="together">🚀 Together AI (Low cost)</option>
                        <option value="openai">💰 OpenAI GPT-4</option>
                        <option value="anthropic">🧠 Anthropic Claude</option>
                    </select>
                </div>
                <div class="api-key-input">
                    <label for="api-key-input">API Key:</label>
                    <input type="password" id="api-key-input" placeholder="Enter your API key">
                    <button id="configure-ai-btn" class="configure-btn">
                        <i class="fas fa-save"></i> Configure
                    </button>
                </div>
                <div id="config-status" class="config-status" style="display:none;"></div>
            </div>
        `;

        document.body.appendChild(cloudConfigUI);

        // Add event listener
        document.getElementById('configure-ai-btn').addEventListener('click', () => {
            this.configureCloudAI();
        });
    }

    async configureCloudAI() {
        const provider = document.getElementById('ai-provider-select').value;
        const apiKey = document.getElementById('api-key-input').value.trim();
        const statusDiv = document.getElementById('config-status');
        const configureBtn = document.getElementById('configure-ai-btn');

        if (!apiKey) {
            this.showConfigStatus('Please enter an API key', 'error');
            return;
        }

        // Show loading
        configureBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Configuring...';
        configureBtn.disabled = true;

        try {
            const response = await fetch('/api/ai/configure', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    provider: provider,
                    api_key: apiKey
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showConfigStatus(data.message, 'success');
                // Refresh AI status
                await this.checkAIStatus();
                this.updateAIStatusDisplay();
                // Clear the input
                document.getElementById('api-key-input').value = '';
            } else {
                this.showConfigStatus(data.error || 'Configuration failed', 'error');
            }
        } catch (error) {
            this.showConfigStatus('Network error: ' + error.message, 'error');
        } finally {
            configureBtn.innerHTML = '<i class="fas fa-save"></i> Configure';
            configureBtn.disabled = false;
        }
    }

    showConfigStatus(message, type) {
        const statusDiv = document.getElementById('config-status');
        statusDiv.textContent = message;
        statusDiv.className = `config-status ${type}`;
        statusDiv.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }

    enhanceChatInterface() {
        // Add AI enhancement indicators to existing chat
        const chatInterface = document.querySelector('.ai-conversation, #ai-conversation');
        if (chatInterface) {
            const enhancement = document.createElement('div');
            enhancement.className = 'ai-enhancement-notice';
            enhancement.innerHTML = `
                <small class="ai-notice">
                    <i class="fas fa-brain"></i>
                    Enhanced with Cloud-First Quantum AI - Circuits automatically route to 3D builder
                </small>
            `;
            chatInterface.appendChild(enhancement);
        }

        // Enhance the chat message processing to detect circuit requests
        this.enhanceChatMessageProcessing();
    }

    enhanceChatMessageProcessing() {
        // Intercept chat messages to detect circuit requests
        const originalProcessAIQuery = window.dashboard?.processAIQuery?.bind(window.dashboard);

        if (window.dashboard && originalProcessAIQuery) {
            window.dashboard.processAIQuery = async (message) => {
                // Check if this is a circuit request
                const circuitKeywords = ['create', 'generate', 'make', 'build', 'design', 'circuit', 'bell', 'entangle', 'superposition', 'teleport'];
                const isCircuitRequest = circuitKeywords.some(keyword =>
                    message.toLowerCase().includes(keyword)
                );

                if (isCircuitRequest) {
                    // Handle circuit request
                    await this.handleCircuitRequestInChat(message);
                } else {
                    // Use original AI processing for other queries
                    const result = await originalProcessAIQuery(message);
                    this.addAIResponseToChat(result);
                }
            };
        }
    }

    async handleCircuitRequestInChat(message) {
        // Add a processing message to chat
        this.addMessageToChat('ai', 'Generating quantum circuit...', 'processing');

        try {
            // Generate circuit using our AI
            const circuitResult = await this.generateCircuitForChat(message);

            if (circuitResult && circuitResult.success) {
                // Add success message
                this.addMessageToChat('ai', `Circuit generated! Opening 3D Circuit Visualizer...`, 'success');

                // Open circuit widget and load circuit
                this.openCircuitWidget();
                setTimeout(() => {
                    this.loadCircuitIntoVisualizer(circuitResult.code);
                }, 1000);

            } else {
                this.addMessageToChat('ai', 'Sorry, I couldn\'t generate that circuit. Try being more specific about what you want to create.', 'error');
            }
        } catch (error) {
            console.error('Circuit generation error:', error);
            this.addMessageToChat('ai', 'Error generating circuit. Please try again.', 'error');
        }
    }

    async generateCircuitForChat(description) {
        // Extract qubits from description or default to 2
        const qubitsMatch = description.match(/(\d+)\s*(?:qubits?|qbits?)/i);
        const qubits = qubitsMatch ? parseInt(qubitsMatch[1]) : 2;

        return await this.generateCircuit(description, qubits);
    }

    addMessageToChat(type, message, status = 'normal') {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message ${status}`;

        const icon = type === 'ai' ? 'fas fa-robot' : 'fas fa-user';
        const statusClass = status === 'processing' ? 'processing' :
                           status === 'success' ? 'success' :
                           status === 'error' ? 'error' : '';

        messageDiv.innerHTML = `
            <div class="message-content ${statusClass}">
                <i class="${icon}"></i>
                ${message}
            </div>
        `;

        chatMessages.appendChild(messageDiv);

        // Auto-scroll to bottom with multiple fallback methods and force scrolling
        const scrollToBottom = () => {
            // Force scroll to bottom - multiple methods for maximum compatibility
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Also try the modern scrollTo method
            try {
                chatMessages.scrollTo({
                    top: chatMessages.scrollHeight,
                    behavior: 'auto' // Use 'auto' for immediate scrolling
                });
            } catch (e) {
                // Fallback for browsers that don't support scrollTo options
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        };

        // Initial scroll attempt
        setTimeout(scrollToBottom, 10);

        // Additional scroll attempts to handle dynamic content loading
        setTimeout(scrollToBottom, 50);
        setTimeout(scrollToBottom, 100);

        // Final scroll to ensure it's at the bottom
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 200);
    }

    addAIResponseToChat(response) {
        if (typeof response === 'string') {
            this.addMessageToChat('ai', response);
        } else if (response && response.message) {
            this.addMessageToChat('ai', response.message);
        }
    }

    loadCircuitIntoVisualizer(code) {
        try {
            console.log('🔄 Loading circuit into 3D visualizer...');

            // Try the dashboard's circuit loading functions first
            if (window.loadCircuitFromAI && typeof window.loadCircuitFromAI === 'function') {
                window.loadCircuitFromAI(code);
                console.log('✅ Loaded circuit using dashboard function');
                return true;
            }

            // Try the 3D circuit specific functions
            if (window.init3DQuantumCircuit && typeof window.init3DQuantumCircuit === 'function') {
                // Store the circuit code for the visualizer to use
                window.aiGeneratedCircuitCode = code;
                window.init3DQuantumCircuit();
                console.log('✅ Initialized 3D circuit with AI code');
                return true;
            }

            // Try direct circuit loading functions
            if (window.loadCircuitFromCode && typeof window.loadCircuitFromCode === 'function') {
                window.loadCircuitFromCode(code);
                console.log('✅ Loaded circuit using direct function');
                return true;
            }

            // Try to set circuit data for existing visualizers
            if (window.setCircuitData && typeof window.setCircuitData === 'function') {
                const circuitData = this.convertCodeToCircuitData(code);
                window.setCircuitData(circuitData);
                console.log('✅ Set circuit data for visualizer');
                return true;
            }

            // Try to find and update the circuit display
            const circuitDisplay = document.getElementById('3d-quantum-circuit') ||
                                 document.querySelector('.circuit-3d-view') ||
                                 document.querySelector('.circuit-visualization');

            if (circuitDisplay) {
                // Show a message in the circuit area
                circuitDisplay.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #00d4ff; background: rgba(0,0,0,0.8); border-radius: 10px;">
                        <h3>🤖 AI Generated Circuit</h3>
                        <p>Circuit code generated successfully!</p>
                        <div style="background: #1a1a1a; padding: 10px; border-radius: 5px; margin: 10px 0; text-align: left; font-family: monospace; font-size: 12px; color: #00ff88; max-height: 200px; overflow-y: auto;">
                            <pre>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                        </div>
                        <button onclick="navigator.clipboard.writeText(\`${code.replace(/`/g, '\\`')}\`)" style="background: #00d4ff; color: black; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">
                            📋 Copy Code
                        </button>
                    </div>
                `;
                console.log('✅ Displayed circuit code in visualizer area');
                return true;
            }

            // Final fallback: show in console and alert
            console.log('Circuit code generated:', code);
            alert(`Circuit generated! Code:\n\n${code}\n\nCopy from browser console for manual use.`);
            return false;

        } catch (error) {
            console.error('❌ Error loading circuit into visualizer:', error);
            alert('Error loading circuit into visualizer. Check console for details.');
            return false;
        }
    }

    convertCodeToCircuitData(code) {
        // Basic conversion of Qiskit code to circuit data format
        // This is a simplified conversion - the 3D visualizer should handle the full parsing
        try {
            const lines = code.split('\n').filter(line => line.trim());
            const circuitData = {
                qubits: 2, // Default
                gates: [],
                measurements: []
            };

            // Extract qubit count
            const qrMatch = code.match(/QuantumRegister\((\d+)/);
            if (qrMatch) {
                circuitData.qubits = parseInt(qrMatch[1]);
            }

            // Extract basic gates (simplified)
            const gatePatterns = [
                { pattern: /\.h\((\d+)\)/g, gate: 'H', name: 'Hadamard' },
                { pattern: /\.x\((\d+)\)/g, gate: 'X', name: 'Pauli-X' },
                { pattern: /\.y\((\d+)\)/g, gate: 'Y', name: 'Pauli-Y' },
                { pattern: /\.z\((\d+)\)/g, gate: 'Z', name: 'Pauli-Z' },
                { pattern: /\.cx\((\d+),\s*(\d+)\)/g, gate: 'CX', name: 'CNOT' },
                { pattern: /\.measure_all\(\)/g, gate: 'MEASURE', name: 'Measure All' }
            ];

            lines.forEach((line, index) => {
                gatePatterns.forEach(({ pattern, gate, name }) => {
                    let match;
                    while ((match = pattern.exec(line)) !== null) {
                        if (gate === 'CX') {
                            circuitData.gates.push({
                                type: gate,
                                name: name,
                                qubits: [parseInt(match[1]), parseInt(match[2])],
                                position: index
                            });
                        } else if (gate === 'MEASURE') {
                            circuitData.measurements.push({
                                type: 'measure_all',
                                position: index
                            });
                        } else {
                            circuitData.gates.push({
                                type: gate,
                                name: name,
                                qubit: parseInt(match[1]),
                                position: index
                            });
                        }
                    }
                });
            });

            return circuitData;

        } catch (error) {
            console.error('Error converting code to circuit data:', error);
            return {
                qubits: 2,
                gates: [],
                measurements: [],
                error: 'Failed to parse circuit code'
            };
        }
    }

    async generateCircuit(description, qubits = 2) {
        try {
            const response = await fetch(this.apiEndpoints.generateCircuit, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: description,
                    qubits: qubits
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log('🎯 Circuit generated:', data.generated_by);
                return {
                    code: data.circuit_code,
                    description: data.description,
                    qubits: data.qubits,
                    generatedBy: data.generated_by
                };
            } else {
                throw new Error(data.error || 'Circuit generation failed');
            }
        } catch (error) {
            console.error('❌ Circuit generation error:', error);
            return null;
        }
    }

    async generateCircuitFromUI() {
        const description = document.getElementById('circuit-description').value.trim();
        const qubits = parseInt(document.getElementById('circuit-qubits').value);

        if (!description) {
            alert('Please enter a circuit description');
            return;
        }

        const generateBtn = document.getElementById('generate-circuit-btn');
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;

        try {
            const result = await this.generateCircuit(description, qubits);

            if (result) {
                document.getElementById('circuit-code').textContent = result.code;
                document.getElementById('circuit-result').style.display = 'block';

                // Show generation method
                const methodBadge = document.createElement('div');
                methodBadge.className = 'generation-method';
                methodBadge.innerHTML = `<small>Generated by: ${result.generatedBy}</small>`;
                document.getElementById('circuit-result').appendChild(methodBadge);
            } else {
                alert('Circuit generation failed. Please try again.');
            }
        } catch (error) {
            alert('Error generating circuit: ' + error.message);
        } finally {
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    }

    copyCircuitCode() {
        const codeElement = document.getElementById('circuit-code');
        const code = codeElement.textContent;

        navigator.clipboard.writeText(code).then(() => {
            const copyBtn = document.getElementById('copy-circuit-btn');
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code:', err);
            alert('Failed to copy code to clipboard');
        });
    }

    executeGeneratedCircuit() {
        const code = document.getElementById('circuit-code').textContent;

        // Try to execute the circuit using the 3D circuit visualizer
        if (window.circuitVisualizer && window.circuitVisualizer.loadCircuitFromCode) {
            // Open the circuit widget first
            this.openCircuitWidget();
            // Then load the circuit code
            setTimeout(() => {
                window.circuitVisualizer.loadCircuitFromCode(code);
            }, 500);
        } else if (window.executeQuantumCircuit) {
            window.executeQuantumCircuit(code);
        } else if (this.existingAI && this.existingAI.executeCircuit) {
            this.existingAI.executeCircuit(code);
        } else {
            // Fallback: try to open circuit widget and show code
            this.openCircuitWidget();
            alert('Circuit code generated! Check the 3D Circuit widget to visualize it.');
        }
    }

    openCircuitWidget() {
        // Try to open the circuit widget using dashboard functions
        if (window.dashboard && window.dashboard.showWidget) {
            window.dashboard.showWidget('circuit');
        } else if (window.dashboardInstance && window.dashboardInstance.showWidget) {
            window.dashboardInstance.showWidget('circuit');
        } else {
            // Fallback: manually show the circuit widget
            const circuitWidget = document.querySelector('[data-widget="circuit"]');
            if (circuitWidget) {
                circuitWidget.style.display = 'block';
                // Scroll to it
                circuitWidget.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    async findSimilarConcepts() {
        const query = document.getElementById('concept-query').value.trim();

        if (!query) {
            alert('Please enter a concept to search for');
            return;
        }

        const findBtn = document.getElementById('find-concepts-btn');
        const originalText = findBtn.innerHTML;
        findBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
        findBtn.disabled = true;

        try {
            const response = await fetch(this.apiEndpoints.similarConcepts, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    top_k: 5
                })
            });

            const data = await response.json();

            if (data.success) {
                const resultsList = document.getElementById('concept-list');
                resultsList.innerHTML = data.similar_concepts.map(concept =>
                    `<li class="concept-item">${concept}</li>`
                ).join('');

                document.getElementById('concept-results').style.display = 'block';
            } else {
                throw new Error(data.error || 'Concept search failed');
            }
        } catch (error) {
            alert('Error finding similar concepts: ' + error.message);
        } finally {
            findBtn.innerHTML = originalText;
            findBtn.disabled = false;
        }
    }

    async quantumChat(message) {
        try {
            const response = await fetch(this.apiEndpoints.quantumChat, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message
                })
            });

            const data = await response.json();

            if (data.success) {
                return data.ai_response;
            } else {
                console.warn('Quantum chat failed:', data.error);
                return null;
            }
        } catch (error) {
            console.warn('Quantum chat error:', error);
            return null;
        }
    }

    // Public methods for external access
    showCircuitGenerator() {
        const ui = document.getElementById('ai-circuit-generator');
        if (ui) ui.style.display = 'block';
    }

    showConceptSimilarity() {
        const ui = document.getElementById('ai-concept-similarity');
        if (ui) ui.style.display = 'block';
    }

    showCloudConfig() {
        const ui = document.getElementById('ai-cloud-config');
        if (ui) ui.style.display = 'block';
    }

    getAIStatus() {
        return {
            available: this.quantumAIAvailable,
            models: this.models,
            readyModels: this.availableModels
        };
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for existing AI to initialize, then enhance it
    setTimeout(() => {
        // Find existing AI instance
        let existingAI = null;

        if (window.quantumAI) existingAI = window.quantumAI;
        if (window.enhancedQuantumAI) existingAI = window.enhancedQuantumAI;
        if (window.QuantumAI) existingAI = new window.QuantumAI();
        if (window.EnhancedQuantumAI) existingAI = new window.EnhancedQuantumAI();

        // Create enhancement
        window.quantumAIEnhancement = new QuantumAIEnhancement(existingAI);

        console.log('🚀 Quantum AI Enhancement loaded and ready!');
    }, 2000);
});

// Add to window for global access
window.QuantumAIEnhancement = QuantumAIEnhancement;
