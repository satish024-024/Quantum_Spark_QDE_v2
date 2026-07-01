// Enhanced AI Assistant for Quantum Jobs Tracker
// Comprehensive quantum computing knowledge and dashboard integration
class EnhancedQuantumAI {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.quantumKnowledge = this.initializeQuantumKnowledge();
        this.projectInfo = this.initializeProjectInfo();
        this.apiEndpoints = this.initializeAPIEndpoints();
        this.widgetCapabilities = this.initializeWidgetCapabilities();
        this.conversationHistory = [];
        this.maxHistoryLength = 50;
        this.geminiClient = null;
        this.initializeGemini();
        this.initializeDashboardIntegration();
    }

    initializeDashboardIntegration() {
        // Ensure AI assistant works with all dashboard types
        if (this.dashboard) {
            // Set up theme-specific responses
            this.dashboardTheme = this.dashboard.dashboardTheme || 'Hackathon';

            // Add AI assistant methods to dashboard if not present
            if (!this.dashboard.aiAssistant) {
                this.dashboard.aiAssistant = this;
            }

            // Ensure widget interaction methods exist
            if (!this.dashboard.openWidget) {
                this.dashboard.openWidget = (widgetKey) => {
                    console.log(`Opening ${widgetKey} widget...`);
                    return `Opening ${widgetKey} widget`;
                };
            }

            if (!this.dashboard.refreshWidget) {
                this.dashboard.refreshWidget = (widgetKey) => {
                    console.log(`Refreshing ${widgetKey} widget...`);
                    return `Refreshing ${widgetKey} widget`;
                };
            }

            console.log(`🤖 AI Assistant integrated with ${this.dashboardTheme} dashboard`);
        }
    }

    initializeGemini() {
        try {
            // Initialize Google Gemini AI as fallback
            if (typeof GoogleGenerativeAI !== 'undefined') {
                // Use a demo API key for testing (in production, this should be from environment)
                const API_KEY = 'demo_key'; // This will be replaced with real key
                this.geminiClient = new GoogleGenerativeAI(API_KEY);
                console.log('🤖 Google Gemini AI initialized as fallback');
            } else {
                console.log('⚠️ Google Gemini AI not available, using local responses only');
            }
        } catch (error) {
            console.log('⚠️ Failed to initialize Gemini AI:', error);
        }
    }

    initializeQuantumKnowledge() {
        return {
            fundamental: {
                superposition: "A quantum state can exist in multiple states simultaneously until measured. |ψ⟩ = α|0⟩ + β|1⟩ where α and β are complex amplitudes.",
                entanglement: "Quantum particles can be correlated such that the state of one instantly affects the other, regardless of distance. Enables quantum teleportation and superdense coding.",
                interference: "Quantum amplitudes can interfere constructively or destructively, enabling quantum algorithms like Grover's search.",
                measurement: "Observing a quantum system collapses its superposition to a classical outcome, following the Born rule |α|²."
            },

            gates: {
                hadamard: "H gate creates superposition: H|0⟩ = (|0⟩ + |1⟩)/√2, H|1⟩ = (|0⟩ - |1⟩)/√2",
                pauli_x: "X gate (NOT): X|0⟩ = |1⟩, X|1⟩ = |0⟩. Flips qubit state.",
                pauli_y: "Y gate: Y|0⟩ = i|1⟩, Y|1⟩ = -i|0⟩. Rotation around Y-axis by π.",
                pauli_z: "Z gate: Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩. Phase flip gate.",
                cnot: "Controlled-NOT: Flips target qubit if control is |1⟩. Creates entanglement.",
                rotation: "Rx(θ), Ry(θ), Rz(θ): Rotate qubit state by angle θ around respective axes.",
                phase: "S gate: Z^(1/2), T gate: Z^(1/4). Add phases to |1⟩ state."
            },

            algorithms: {
                shor: "Factorizes large numbers exponentially faster than classical computers using quantum Fourier transform.",
                grover: "Searches unsorted databases quadratically faster using amplitude amplification.",
                deutsch_jozsa: "Determines if a function is constant or balanced with single evaluation.",
                quantum_walk: "Quantum version of random walk, useful for search algorithms.",
                hhl: "Solves linear systems of equations exponentially faster than classical methods."
            },

            hardware: {
                qubits: "Basic quantum information units. Can be implemented as superconducting circuits, trapped ions, photons, etc.",
                coherence: "T1 (amplitude damping) and T2 (phase damping) times determine how long quantum information persists.",
                gate_errors: "Imperfections in quantum gate operations, measured as infidelity from ideal unitary.",
                readout_errors: "Errors in measuring qubit states, affect measurement accuracy.",
                crosstalk: "Unwanted interactions between qubits, can cause correlated errors."
            },

            noise_models: {
                depolarizing: "Each qubit has probability p of being replaced by completely mixed state.",
                amplitude_damping: "Energy relaxation: |1⟩ → |0⟩ with rate γ.",
                phase_damping: "Loss of quantum phase information without energy loss.",
                coherent_errors: "Systematic errors that preserve quantum coherence.",
                incoherent_errors: "Random errors that destroy quantum coherence."
            },

            quantum_advantage: {
                simulation: "Quantum systems can efficiently simulate other quantum systems (quantum supremacy achieved 2019).",
                optimization: "Quantum algorithms for optimization problems (QAOA, VQE).",
                machine_learning: "Quantum machine learning algorithms with potential exponential speedup.",
                cryptography: "Quantum-resistant cryptography and quantum key distribution.",
                chemistry: "Molecular simulation for drug discovery and materials science."
            }
        };
    }

    initializeProjectInfo() {
        return {
            name: "Quantum Jobs Tracker",
            version: "2.0.0",
            description: "Advanced quantum computing job monitoring and analysis platform",
            features: [
                "Real-time IBM Quantum backend monitoring",
                "Comprehensive job tracking and analysis",
                "Performance metrics and optimization",
                "Calibration status monitoring",
                "Circuit visualization and analysis",
                "Historical data analysis",
                "Multi-theme dashboard interface",
                "AI-powered quantum assistant"
            ],
            technologies: [
                "Flask (Python backend)",
                "IBM Quantum Runtime Service",
                "Three.js (3D visualizations)",
                "Chart.js (data visualization)",
                "WebSocket/SSE (real-time updates)",
                "Google Gemini AI integration"
            ],
            apis: [
                "IBM Quantum Runtime API",
                "IBM Quantum Backend Properties API",
                "IBM Quantum Jobs API",
                "IBM Quantum Calibration API",
                "IBM Quantum Performance API"
            ],
            dashboards: [
                "Hackathon Dashboard - Educational quantum learning",
                "Modern Dashboard - Clean predictive analytics",
                "Professional Dashboard - Enterprise-grade monitoring",
                "Advanced Dashboard - Technical scientific interface"
            ],
            capabilities: [
                "Monitor 100+ quantum backends worldwide",
                "Track millions of quantum jobs",
                "Analyze quantum circuit performance",
                "Predict execution times and queue positions",
                "Monitor calibration quality and system health",
                "Provide quantum computing education",
                "Optimize quantum job scheduling"
            ]
        };
    }

    initializeAPIEndpoints() {
        return {
            backends: {
                endpoint: '/api/backends',
                description: 'Get detailed information about all available IBM Quantum backends',
                data: ['name', 'status', 'qubits', 'gate_errors', 'readout_errors', 't1_times', 't2_times', 'coupling_map', 'basis_gates']
            },
            jobs: {
                endpoint: '/api/jobs',
                description: 'Retrieve quantum job information and status',
                data: ['job_id', 'backend', 'status', 'shots', 'created_time']
            },
            job_results: {
                endpoint: '/api/job_results',
                description: 'Get actual quantum measurement results and execution data',
                data: ['measurements', 'fidelity', 'execution_time', 'circuits']
            },
            performance: {
                endpoint: '/api/performance_metrics',
                description: 'Comprehensive performance analytics and metrics',
                data: ['success_rate', 'execution_times', 'queue_times', 'fidelity_scores', 'backend_performance']
            },
            realtime: {
                endpoint: '/api/realtime_monitoring',
                description: 'Live queue positions and system status',
                data: ['queue_status', 'system_status', 'estimated_wait_times']
            },
            calibration: {
                endpoint: '/api/calibration_data',
                description: 'Backend calibration status and system health',
                data: ['calibration_status', 'calibration_quality', 'system_health', 'backend_calibrations']
            },
            historical: {
                endpoint: '/api/historical_data',
                description: 'Historical performance trends and usage patterns',
                data: ['success_trend', 'performance_trend', 'backend_usage', 'error_patterns']
            },
            circuit_details: {
                endpoint: '/api/circuit_details',
                description: 'Quantum circuit analysis and gate information',
                data: ['gates', 'depth', 'qubit_mapping', 'transpilation_info']
            },
            dashboard_metrics: {
                endpoint: '/api/dashboard_metrics',
                description: 'Aggregated dashboard metrics for overview',
                data: ['active_backends', 'total_jobs', 'running_jobs', 'success_rate']
            }
        };
    }

    initializeWidgetCapabilities() {
        return {
            backends: {
                name: 'Quantum Backends',
                capabilities: ['View backend status', 'Compare performance', 'Monitor calibration', 'Analyze gate errors'],
                interactions: ['Refresh data', 'Filter backends', 'Sort by metrics', 'View detailed properties']
            },
            jobs: {
                name: 'Active Jobs',
                capabilities: ['Monitor job status', 'View execution progress', 'Track queue positions', 'Analyze completion rates'],
                interactions: ['Cancel jobs', 'View job details', 'Export results', 'Filter by status']
            },
            bloch_sphere: {
                name: '3D Bloch Sphere',
                capabilities: ['Visualize quantum states', 'Interactive rotation', 'State evolution', 'Measurement simulation'],
                interactions: ['Apply quantum gates', 'Reset state', 'Export visualization', 'Toggle history']
            },
            circuit: {
                name: '3D Quantum Circuit',
                capabilities: ['Circuit visualization', 'Gate sequence', 'Qubit mapping', 'Step-by-step execution'],
                interactions: ['Play/pause animation', 'Step through gates', 'Reset circuit', 'Expand view']
            },
            performance: {
                name: 'Performance Analytics',
                capabilities: ['Execution time analysis', 'Success rate tracking', 'Fidelity monitoring', 'Trend analysis'],
                interactions: ['Filter time range', 'Compare backends', 'Export metrics', 'View detailed charts']
            },
            entanglement: {
                name: 'Entanglement Analysis',
                capabilities: ['Correlation analysis', 'Bell state visualization', 'Entanglement entropy', 'Measurement correlations'],
                interactions: ['Generate entangled states', 'Measure correlations', 'Calculate entropy', 'Export data']
            },
            results: {
                name: 'Measurement Results',
                capabilities: ['View quantum measurements', 'Probability distributions', 'Error analysis', 'Statistical analysis'],
                interactions: ['Filter results', 'Export data', 'Compare experiments', 'Statistical tests']
            },
            quantum_state: {
                name: 'Quantum State',
                capabilities: ['State vector display', 'Density matrix', 'Purity calculation', 'State tomography'],
                interactions: ['Apply operations', 'Calculate observables', 'Export state', 'Reset to |0⟩']
            },
            ai_chat: {
                name: 'AI Quantum Assistant',
                capabilities: ['Quantum education', 'Code generation', 'Problem solving', 'System analysis'],
                interactions: ['Ask questions', 'Get explanations', 'Request code', 'System recommendations']
            }
        };
    }

    async processQuery(query) {
        const lowerQuery = query.toLowerCase();
        this.addToHistory(query, 'user');

        // Check for AI-powered circuit generation requests first
        if (this.isCircuitGenerationRequest(query)) {
            const circuitResponse = await this.handleCircuitGeneration(query);
            this.addToHistory(circuitResponse, 'assistant');
            return circuitResponse;
        }

        // Check for AI-powered circuit execution requests
        if (this.isCircuitExecutionRequest(query)) {
            const executionResponse = await this.handleCircuitExecution(query);
            this.addToHistory(executionResponse, 'assistant');
            return executionResponse;
        }

        // Try AI quantum chat API first
        const aiChatResponse = await this.tryAIQuantumChat(query);
        if (aiChatResponse) {
            this.addToHistory(aiChatResponse, 'assistant');
            return aiChatResponse;
        }

        // Check for widget interactions
        const widgetInteraction = this.checkWidgetInteraction(lowerQuery);
        if (widgetInteraction) {
            return widgetInteraction;
        }

        // Check for API queries
        const apiQuery = this.checkAPIQuery(lowerQuery);
        if (apiQuery) {
            return apiQuery;
        }

        // Check for quantum knowledge queries
        const knowledgeQuery = this.checkQuantumKnowledge(lowerQuery);
        if (knowledgeQuery) {
            return knowledgeQuery;
        }

        // Check for project information queries
        const projectQuery = this.checkProjectInfo(lowerQuery);
        if (projectQuery) {
            return projectQuery;
        }

        // Check for system analysis queries
        const systemQuery = this.checkSystemAnalysis(lowerQuery);
        if (systemQuery) {
            return systemQuery;
        }

        // Check for quantum circuit generation queries
        const circuitQuery = this.checkCircuitGeneration(lowerQuery);
        if (circuitQuery) {
            return circuitQuery;
        }

        // Try Gemini AI as fallback for complex queries
        const geminiResponse = await this.tryGeminiResponse(query);
        if (geminiResponse) {
            return geminiResponse;
        }

        // Default response with comprehensive help
        return this.generateHelpfulResponse(lowerQuery);
    }

    checkWidgetInteraction(query) {
        const widgets = this.widgetCapabilities;

        // Check for specific widget requests
        for (const [widgetKey, widgetInfo] of Object.entries(widgets)) {
            if (query.includes(widgetKey) || query.includes(widgetInfo.name.toLowerCase())) {
                if (query.includes('show') || query.includes('open') || query.includes('view')) {
                    // Actually open the widget
                    if (this.dashboard && typeof this.dashboard.openWidget === 'function') {
                        const result = this.dashboard.openWidget(widgetKey);
                        return `${result} ${widgetInfo.capabilities.join('. ')}`;
                    }
                    return `Opening ${widgetInfo.name} widget. ${widgetInfo.capabilities.join('. ')}`;
                }
                if (query.includes('help') || query.includes('what can')) {
                    return `${widgetInfo.name} can: ${widgetInfo.capabilities.join(', ')}. Interactions: ${widgetInfo.interactions.join(', ')}.`;
                }
                if (query.includes('refresh') || query.includes('update')) {
                    // Actually refresh the widget
                    if (this.dashboard && typeof this.dashboard.refreshWidget === 'function') {
                        const result = this.dashboard.refreshWidget(widgetKey);
                        return result;
                    }
                    return `Refreshing ${widgetInfo.name} with latest data...`;
                }
                if (query.includes('reset') || query.includes('clear')) {
                    return `Resetting ${widgetInfo.name} to default state...`;
                }
            }
        }

        // Check for general widget operations
        if (query.includes('refresh') || query.includes('update')) {
            return 'Refreshing all widgets with latest IBM Quantum data...';
        }

        if (query.includes('reset') || query.includes('clear')) {
            return 'Resetting widgets to default state...';
        }

        return null;
    }

    checkAPIQuery(query) {
        const apis = this.apiEndpoints;

        for (const [apiKey, apiInfo] of Object.entries(apis)) {
            if (query.includes(apiKey) || query.includes(apiInfo.endpoint.split('/').pop())) {
                if (query.includes('data') || query.includes('info') || query.includes('get')) {
                    return `API ${apiInfo.endpoint}: ${apiInfo.description}. Provides: ${apiInfo.data.join(', ')}.`;
                }
                if (query.includes('status') || query.includes('health')) {
                    return `API ${apiInfo.endpoint} is active and providing real-time IBM Quantum data.`;
                }
            }
        }

        if (query.includes('api') && query.includes('list')) {
            const apiList = Object.entries(apis).map(([key, info]) =>
                `${key}: ${info.endpoint} - ${info.description}`
            ).join('\n');
            return `Available APIs:\n${apiList}`;
        }

        return null;
    }

    checkQuantumKnowledge(query) {
        const knowledge = this.quantumKnowledge;

        // Check fundamental concepts
        for (const [concept, explanation] of Object.entries(knowledge.fundamental)) {
            if (query.includes(concept)) {
                return `${concept.charAt(0).toUpperCase() + concept.slice(1)}: ${explanation}`;
            }
        }

        // Check quantum gates
        for (const [gate, explanation] of Object.entries(knowledge.gates)) {
            if (query.includes(gate) || query.includes(gate.replace('_', ' '))) {
                return `${gate.toUpperCase()} Gate: ${explanation}`;
            }
        }

        // Check algorithms
        for (const [algorithm, explanation] of Object.entries(knowledge.algorithms)) {
            if (query.includes(algorithm)) {
                return `${algorithm.toUpperCase()}: ${explanation}`;
            }
        }

        // Check hardware concepts
        for (const [topic, explanation] of Object.entries(knowledge.hardware)) {
            if (query.includes(topic)) {
                return `${topic.charAt(0).toUpperCase() + topic.slice(1)}: ${explanation}`;
            }
        }

        // Check noise models
        for (const [model, explanation] of Object.entries(knowledge.noise_models)) {
            if (query.includes(model) || query.includes('noise')) {
                return `${model.charAt(0).toUpperCase() + model.slice(1)} Noise: ${explanation}`;
            }
        }

        // Check quantum advantage
        for (const [area, explanation] of Object.entries(knowledge.quantum_advantage)) {
            if (query.includes(area) || query.includes('advantage')) {
                return `Quantum Advantage in ${area.charAt(0).toUpperCase() + area.slice(1)}: ${explanation}`;
            }
        }

        return null;
    }

    checkProjectInfo(query) {
        const project = this.projectInfo;

        if (query.includes('project') || query.includes('system')) {
            if (query.includes('name') || query.includes('what is')) {
                return `${project.name} v${project.version}: ${project.description}`;
            }
            if (query.includes('features') || query.includes('capabilities')) {
                return `Key Features: ${project.features.join(', ')}`;
            }
            if (query.includes('technologies') || query.includes('tech')) {
                return `Technologies: ${project.technologies.join(', ')}`;
            }
            if (query.includes('apis') || query.includes('endpoints')) {
                return `APIs: ${project.apis.join(', ')}`;
            }
            if (query.includes('dashboards') || query.includes('themes')) {
                return `Dashboards: ${project.dashboards.join(', ')}`;
            }
        }

        if (query.includes('version') || query.includes('v2')) {
            return `Current version: ${project.version}. This includes enhanced IBM Quantum integration, comprehensive AI capabilities, and multi-theme dashboards.`;
        }

        return null;
    }

    checkSystemAnalysis(query) {
        if (!this.dashboard?.state) return null;

        const state = this.dashboard.state;

        if (query.includes('status') || query.includes('health')) {
            return `System Status: ${state.isConnected ? 'Connected' : 'Disconnected'} to IBM Quantum. ` +
                `${state.backends?.length || 0} backends available, ` +
                `${state.jobs?.length || 0} jobs tracked. ` +
                `Success rate: ${this.dashboard.calculateEnhancedSuccessRate()}%.`;
        }

        if (query.includes('performance') || query.includes('metrics')) {
            const perf = state.performance;
            if (perf) {
                return `Performance Metrics: Avg execution time ${perf.average_execution_time?.toFixed(2)}s, ` +
                    `Success rate ${(perf.success_rate * 100)?.toFixed(1)}%, ` +
                    `Fidelity ${(perf.average_fidelity * 100)?.toFixed(1)}%. ` +
                    `Total jobs analyzed: ${state.historical?.total_jobs || 0}.`;
            }
        }

        if (query.includes('backends') || query.includes('backend')) {
            const backends = state.backends || [];
            const operational = backends.filter(b => b.operational).length;
            return `Backend Analysis: ${operational}/${backends.length} backends operational. ` +
                `Total qubits: ${backends.reduce((sum, b) => sum + (b.num_qubits || 0), 0)}. ` +
                `Calibration status: ${state.calibration?.calibration_status || 'Unknown'}.`;
        }

        if (query.includes('jobs') || query.includes('queue')) {
            const realtime = state.realtime;
            if (realtime) {
                return `Queue Status: ${realtime.system_status?.total_pending_jobs || 0} jobs pending, ` +
                    `Average wait time: ${realtime.system_status?.average_queue_time?.toFixed(0) || 'N/A'}s. ` +
                    `System load: ${realtime.system_status?.total_active_backends || 0} active backends.`;
            }
        }

        if (query.includes('calibration') || query.includes('quality')) {
            const calib = state.calibration;
            if (calib) {
                return `Calibration Status: ${calib.calibration_status}, ` +
                    `System health: ${calib.system_health?.overall_status}, ` +
                    `Quality score: ${(Object.values(calib.backend_calibrations || {}).reduce((sum, b) => sum + (b.calibration_quality || 0), 0) / Object.keys(calib.backend_calibrations || {}).length)?.toFixed(1) || 'N/A'}%.`;
            }
        }

        return null;
    }

    checkCircuitGeneration(query) {
        const circuitKeywords = [
            'generate', 'create', 'make', 'build', 'circuit', 'quantum circuit',
            'random number', 'bell state', 'grover', 'teleport', 'deutsch',
            'entangled', 'superposition', 'quantum algorithm'
        ];

        const hasCircuitKeyword = circuitKeywords.some(keyword => query.includes(keyword));

        if (hasCircuitKeyword) {
            return this.handleCircuitGeneration(query);
        }

        return null;
    }

    async handleCircuitGeneration(query) {
        try {
            console.log('🤖 Processing quantum circuit generation request:', query);

            // Get API key from localStorage
            const apiKey = localStorage.getItem('quantum_ai_key');
            const aiProvider = localStorage.getItem('quantum_ai_provider');

            // Generate circuit using AI
            const response = await fetch('/api/ai/quantum_chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: query,
                    api_key: apiKey,
                    ai_provider: aiProvider
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                const circuit = data.circuit;

                // Create circuit generation response
                let response = `🎯 **${circuit.name}**\n\n`;
                response += `📝 **Description:** ${circuit.description}\n\n`;
                response += `⚙️ **Specifications:**\n`;
                response += `• Qubits: ${circuit.qubits}\n`;
                response += `• Shots: ${circuit.shots}\n`;
                response += `• Gates: ${circuit.gates}\n`;
                response += `• Depth: ${circuit.depth}\n\n`;
                response += `🚀 **Ready to submit to IBM Quantum!**\n\n`;
                response += `Would you like me to submit this circuit to a quantum backend? I can run it on IBM Quantum and show you the results in the Measurement Results widget.`;

                // Store circuit data for potential submission
                this.lastGeneratedCircuit = {
                    type: circuit.type,
                    params: {
                        qubits: circuit.qubits,
                        shots: circuit.shots
                    }
                };

                return {
                    type: 'circuit_generation',
                    content: response,
                    circuit: circuit,
                    actions: [
                        {
                            text: 'Submit to IBM Quantum',
                            action: 'submit_circuit',
                            circuit: circuit
                        },
                        {
                            text: 'View in 3D Circuit Builder',
                            action: 'view_3d_circuit',
                            circuit: circuit
                        },
                        {
                            text: 'View Circuit Details',
                            action: 'view_circuit',
                            circuit: circuit
                        }
                    ]
                };
            } else {
                return `❌ **Circuit Generation Failed**\n\nError: ${data.error}\n\nPlease try rephrasing your request or ask for a specific quantum algorithm.`;
            }

        } catch (error) {
            console.error('❌ Circuit generation error:', error);
            return `❌ **Circuit Generation Error**\n\nI encountered an error while generating the quantum circuit: ${error.message}\n\nPlease try again or ask for help with a specific quantum algorithm.`;
        }
    }

    async submitCircuitToIBM(circuit, backend = 'ibm_brisbane') {
        try {
            console.log('🚀 Submitting circuit to IBM Quantum:', circuit);

            const response = await fetch('/api/ai-submit-circuit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: circuit.type,
                    params: circuit.params,
                    backend: backend
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                // Update all relevant widgets with new data
                if (this.dashboard) {
                    // Update jobs widget
                    if (this.dashboard.updateJobsWidget) {
                        this.dashboard.updateJobsWidget();
                    }

                    // Update backends widget
                    if (this.dashboard.updateBackendsWidget) {
                        this.dashboard.updateBackendsWidget();
                    }

                    // Update performance widget
                    if (this.dashboard.updatePerformanceWidget) {
                        this.dashboard.updatePerformanceWidget();
                    }

                    // If demo mode, update results widget immediately
                    if (data.demo_mode && data.results) {
                        if (this.dashboard.updateResultsWidget) {
                            this.dashboard.updateResultsWidget();
                        }
                        if (this.dashboard.updateQuantumStateWidget) {
                            this.dashboard.updateQuantumStateWidget();
                        }
                        if (this.dashboard.updateEntanglementWidget) {
                            this.dashboard.updateEntanglementWidget();
                        }
                    }
                }

                let response = `✅ **Circuit Submitted Successfully!**\n\n`;
                response += `🆔 **Job ID:** ${data.job_id}\n`;
                response += `🖥️ **Backend:** ${backend}\n`;
                response += `📊 **Status:** ${data.demo_mode ? 'Completed (Demo)' : 'Queued'}\n\n`;

                if (data.demo_mode) {
                    response += `🎭 **Demo Mode**: This is a simulated execution with realistic results.\n`;
                    response += `📈 **Results**: Check the Measurement Results widget for quantum measurements!\n`;
                    response += `🔬 **Analysis**: View quantum state and entanglement analysis in their respective widgets.\n\n`;
                    response += `💡 **To run on real IBM Quantum**: Add your IBM Quantum credentials in the settings.`;
                } else {
                    response += `The results will appear in the Measurement Results widget once the job completes. You can track the progress in the Quantum Jobs widget.`;
                }

                return response;
            } else {
                return `❌ **Submission Failed**\n\nError: ${data.error}\n\nPlease check your IBM Quantum connection and try again.`;
            }

        } catch (error) {
            console.error('❌ Circuit submission error:', error);
            return `❌ **Submission Error**\n\nI encountered an error while submitting the circuit: ${error.message}\n\nPlease try again or check your IBM Quantum connection.`;
        }
    }

    async viewCircuitIn3D(circuit) {
        try {
            console.log('🎨 Loading circuit in 3D visualizer:', circuit);

            // Get 3D circuit data
            const response = await fetch('/api/ai-circuit-3d', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: circuit.type,
                    params: circuit.params
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                const circuit_3d = data.circuit_3d;

                // Store circuit data for 3D visualization
                if (this.dashboard && this.dashboard.loadCircuitIn3D) {
                    this.dashboard.loadCircuitIn3D(circuit_3d);
                }

                let response = `🎨 **Circuit Loaded in 3D Visualizer!**\n\n`;
                response += `📊 **Circuit:** ${circuit_3d.name}\n`;
                response += `🔧 **Gates:** ${circuit_3d.gates.length}\n`;
                response += `📏 **Depth:** ${circuit_3d.depth}\n`;
                response += `⚡ **Qubits:** ${circuit_3d.qubits}\n\n`;
                response += `The circuit is now visible in the 3D Circuit Builder widget. You can interact with it, modify gates, and see the quantum state evolution in real-time!`;

                return response;
            } else {
                return `❌ **3D Loading Failed**\n\nError: ${data.error}\n\nPlease try again or check the 3D circuit visualizer.`;
            }

        } catch (error) {
            console.error('❌ 3D circuit loading error:', error);
            return `❌ **3D Loading Error**\n\nI encountered an error while loading the circuit in 3D: ${error.message}\n\nPlease try again or check the 3D circuit visualizer.`;
        }
    }

    async tryGeminiResponse(query) {
        try {
            if (!this.geminiClient) {
                return null;
            }

            // Create a context-aware prompt for Gemini
            const context = await this.getDashboardContext();
            const prompt = `You are a Quantum AI Assistant for a quantum computing dashboard. 

Context: ${JSON.stringify(context, null, 2)}

User Query: "${query}"

Please provide a helpful response. If the user is asking about quantum circuits, suggest specific circuits they can create like:
- "Create a Bell state circuit"
- "Generate a quantum random number generator"
- "Make a Grover search algorithm"
- "Build a quantum teleportation circuit"

Always be encouraging and suggest actionable next steps.`;

            const model = this.geminiClient.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return `🤖 **AI Response:**\n\n${text}\n\n*Powered by Google Gemini AI*`;

        } catch (error) {
            console.log('⚠️ Gemini AI fallback failed:', error);
            return null;
        }
    }

    async getDashboardContext() {
        try {
            const context = {
                availableCircuits: [
                    'Random Number Generator',
                    'Bell State Preparation',
                    'Grover Search Algorithm',
                    'Quantum Teleportation',
                    'Deutsch-Jozsa Algorithm'
                ],
                dashboardWidgets: [
                    'Backends Monitor',
                    'Quantum Jobs Tracker',
                    '3D Circuit Builder',
                    'Measurement Results',
                    'Performance Metrics'
                ],
                capabilities: [
                    'Generate quantum circuits from natural language',
                    'Submit circuits to IBM Quantum hardware',
                    '3D circuit visualization',
                    'Real-time quantum data monitoring',
                    'Quantum algorithm explanations'
                ]
            };

            return context;
        } catch (error) {
            console.error('Error getting dashboard context:', error);
            return {};
        }
    }

    getThemeSpecificInfo(theme) {
        const themeInfo = {
            'Hackathon': {
                description: 'I specialize in educational quantum computing with interactive learning features.',
                features: '🎓 **Educational Focus**: Perfect for learning quantum concepts with guided tutorials and step-by-step explanations.',
                capabilities: ['Interactive quantum tutorials', 'Step-by-step algorithm explanations', 'Educational circuit examples', 'Learning progress tracking']
            },
            'Modern': {
                description: 'I provide clean, predictive analytics with modern UI and advanced visualizations.',
                features: '🎨 **Modern Interface**: Clean design with predictive analytics and advanced data visualization.',
                capabilities: ['Predictive analytics', 'Advanced visualizations', 'Clean modern UI', 'Real-time data insights']
            },
            'Professional': {
                description: 'I offer enterprise-grade monitoring and comprehensive business intelligence.',
                features: '🏢 **Enterprise Features**: Professional monitoring, detailed reporting, and business intelligence.',
                capabilities: ['Enterprise monitoring', 'Detailed reporting', 'Business intelligence', 'Professional analytics']
            },
            'Advanced': {
                description: 'I provide technical scientific interface with deep quantum computing analysis.',
                features: '🔬 **Scientific Interface**: Technical analysis with deep quantum computing insights and research tools.',
                capabilities: ['Scientific analysis', 'Research tools', 'Technical insights', 'Advanced quantum metrics']
            },
            'Production': {
                description: 'I focus on real-time production monitoring and operational excellence.',
                features: '⚡ **Production Ready**: Real-time monitoring, operational insights, and production optimization.',
                capabilities: ['Real-time monitoring', 'Operational insights', 'Production optimization', 'System reliability']
            }
        };

        return themeInfo[theme] || themeInfo['Hackathon'];
    }

    generateHelpfulResponse(query) {
        const theme = this.dashboard?.dashboardTheme || 'Quantum';
        const themeInfo = this.getThemeSpecificInfo(theme);

        // Check for greetings
        if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
            return `Hello! I'm your ${theme} Quantum AI Assistant. ${themeInfo.description}

🎯 **Quick Actions I can help with:**
• **Generate Circuits**: "Create a Bell state circuit", "Make a random number generator"
• **Run on Quantum Hardware**: "Submit this circuit to IBM Quantum"
• **3D Visualization**: "Show this circuit in 3D"
• **Quantum Algorithms**: "Explain Grover's algorithm", "What is quantum teleportation?"
• **Dashboard Control**: "Show backends", "Refresh jobs", "Open circuit builder"

${themeInfo.features}

What would you like to explore?`;
        }

        // Check for help requests
        if (query.includes('help') || query.includes('what can you') || query.includes('commands')) {
            return `I can help you with:
• 📊 **System Analysis**: Check backend status, performance metrics, queue positions
• 🎯 **Circuit Generation**: Create quantum circuits from natural language
• 🚀 **Quantum Execution**: Submit circuits to IBM Quantum hardware
• 🎨 **3D Visualization**: View circuits in interactive 3D builder
• 📚 **Quantum Education**: Explain algorithms, gates, and concepts

**Try these commands:**
• "Create a Bell state circuit" → I'll generate and show it in 3D
• "Make a random number generator" → I'll create a QRNG circuit
• "Submit to IBM Quantum" → I'll run your circuit on real hardware
• "Show backends" → I'll display available quantum computers
• "Explain Grover's algorithm" → I'll teach you quantum search`;
        }

        // Check for general questions about capabilities
        if (query.includes('can you') || query.includes('do you')) {
            return `Yes, I can:
• Access and analyze all IBM Quantum backend data
• Control and interact with all dashboard widgets
• Provide detailed quantum computing explanations
• Monitor system performance and calibration status
• Generate insights from historical data
• Help optimize quantum job scheduling
• Answer questions about the Quantum Jobs Tracker project

What specific task would you like me to help with?`;
        }

        // Default fallback with context
        const capabilities = [
            'analyze quantum backends and their performance',
            'explain quantum computing concepts and algorithms',
            'monitor job queues and execution times',
            'provide system health and calibration status',
            'control dashboard widgets and visualizations',
            'access real-time IBM Quantum data',
            'generate quantum circuit insights',
            'optimize quantum job scheduling'
        ];

        return `I'm your advanced ${theme} Quantum AI Assistant with comprehensive capabilities. I can ${capabilities.slice(0, 4).join(', ')}, and ${capabilities.slice(4).join(', ')}.

Try asking me about:
• "What's the current system status?"
• "Explain quantum superposition"
• "Show me backend performance data"
• "Open the Bloch sphere widget"
• "What are the latest job results?"

How can I assist you with quantum computing today?`;
    }

    addToHistory(message, type) {
        this.conversationHistory.push({
            message,
            type,
            timestamp: Date.now()
        });

        // Keep only recent history
        if (this.conversationHistory.length > this.maxHistoryLength) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
        }
    }

    getConversationHistory() {
        return this.conversationHistory;
    }

    clearHistory() {
        this.conversationHistory = [];
        return 'Conversation history cleared.';
    }

    // Method to get comprehensive system overview
    getSystemOverview() {
        if (!this.dashboard?.state) return 'Dashboard not initialized.';

        const state = this.dashboard.state;
        const backends = state.backends || [];
        const jobs = state.jobs || [];

        return {
            connection: state.isConnected ? 'Connected to IBM Quantum' : 'Disconnected',
            backends: {
                total: backends.length,
                operational: backends.filter(b => b.operational).length,
                totalQubits: backends.reduce((sum, b) => sum + (b.num_qubits || 0), 0)
            },
            jobs: {
                total: jobs.length,
                running: jobs.filter(j => j.status === 'running').length,
                completed: jobs.filter(j => j.status === 'completed').length
            },
            performance: {
                successRate: this.dashboard.calculateEnhancedSuccessRate(),
                avgExecutionTime: state.performance?.average_execution_time,
                avgFidelity: state.performance?.average_fidelity
            },
            calibration: {
                status: state.calibration?.calibration_status,
                health: state.calibration?.system_health?.overall_status
            }
        };
    }

    // Method to generate quantum code examples
    generateQuantumCode(request) {
        if (request.includes('bell') || request.includes('entanglement')) {
            return `Bell State Circuit (Qiskit):
\`\`\`python
from qiskit import QuantumCircuit

# Create Bell state (entangled qubits)
qc = QuantumCircuit(2, 2)
qc.h(0)        # Put first qubit in superposition
qc.cx(0, 1)    # Entangle qubits with CNOT gate
qc.measure_all() # Measure both qubits

print("Bell State Circuit:")
print(qc.draw())
\`\`\`

This creates the maximally entangled Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2`;
        }

        if (request.includes('grover') || request.includes('search')) {
            return `Grover's Search Algorithm (Qiskit):
\`\`\`python
from qiskit import QuantumCircuit

# Grover's algorithm for searching marked items
def grover_search():
    qc = QuantumCircuit(4)  # 2^4 = 16 possible values
    
    # Initialize superposition
    qc.h(range(4))
    
    # Oracle (marks the search value)
    # This would be customized based on the search problem
    
    # Diffuser (amplitude amplification)
    qc.h(range(4))
    qc.x(range(4))
    qc.h(3)
    qc.mct([0,1,2], 3)  # Multi-controlled Toffoli
    qc.h(3)
    qc.x(range(4))
    qc.h(range(4))
    
    return qc
\`\`\`

This provides quadratic speedup for searching unsorted databases`;
        }

        if (request.includes('teleportation')) {
            return `Quantum Teleportation Protocol (Qiskit):
\`\`\`python
from qiskit import QuantumCircuit

# Quantum Teleportation Protocol
def quantum_teleportation():
    qc = QuantumCircuit(3, 3)
    
    # Step 1: Create entangled pair (Bell state)
    qc.h(1)
    qc.cx(1, 2)
    
    # Step 2: Prepare qubit to teleport
    qc.h(0)  # Example: put qubit 0 in superposition
    
    # Step 3: Bell measurement on qubits 0 and 1
    qc.cx(0, 1)
    qc.h(0)
    qc.measure([0, 1], [0, 1])
    
    # Step 4: Classical communication and conditional operations
    qc.x(2).c_if(1, 1)  # Apply X if classical bit 1 is 1
    qc.z(2).c_if(0, 1)  # Apply Z if classical bit 0 is 1
    
    qc.measure(2, 2)  # Measure teleported qubit
    
    return qc
\`\`\`

This teleports quantum state from qubit 0 to qubit 2`;
        }

        return `I can generate quantum code examples! Try asking for:
• "Generate Bell state code"
• "Show Grover search algorithm"  
• "Create quantum teleportation circuit"
• "Generate VQE algorithm code"`;
    }

    // AI-Powered Quantum Circuit Generation Methods
    isCircuitGenerationRequest(message) {
        const lowerMessage = message.toLowerCase();
        const circuitKeywords = ['create', 'generate', 'make', 'build', 'design'];
        const quantumKeywords = ['circuit', 'algorithm', 'quantum', 'bell', 'grover', 'teleportation', 'random'];

        return circuitKeywords.some(keyword => lowerMessage.includes(keyword)) &&
            quantumKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    isCircuitExecutionRequest(message) {
        const lowerMessage = message.toLowerCase();
        const executionKeywords = ['execute', 'run', 'submit', 'launch', 'start', 'quantum computer', 'ibm quantum', 'real hardware'];
        const quantumKeywords = ['circuit', 'algorithm', 'quantum', 'ibm', 'backend', 'computer'];

        // Check for explicit job submission requests
        const jobKeywords = ['job', 'submit job', 'run on ibm', 'execute on hardware'];
        const hasJobKeyword = jobKeywords.some(keyword => lowerMessage.includes(keyword));

        return (executionKeywords.some(keyword => lowerMessage.includes(keyword)) &&
            quantumKeywords.some(keyword => lowerMessage.includes(keyword))) ||
            hasJobKeyword;
    }

    async handleCircuitGeneration(message) {
        try {
            console.log('🤖 Processing circuit generation request:', message);

            // Use the quantum chat endpoint for circuit generation
            const response = await fetch('/api/ai/quantum_chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.ai_response) {
                // Store circuit data for potential 3D visualization if it was generated
                if (data.circuit_generated && data.circuit_data && this.dashboard) {
                    this.dashboard.currentCircuit = data.circuit_data;

                    // Add button to open in 3D circuit builder
                    if (typeof openCircuitIn3D === 'function') {
                        setTimeout(() => {
                            const lastMessage = document.querySelector('.ai-message:last-child, .message:last-child');
                            if (lastMessage && lastMessage.textContent.includes('generated')) {
                                const view3DButton = document.createElement('div');
                                view3DButton.style.cssText = `
                                    margin-top: 10px;
                                    padding: 8px 12px;
                                    background: linear-gradient(135deg, #06b6d4, #0891b2);
                                    color: white;
                                    border: none;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 0.9rem;
                                    display: inline-block;
                                    transition: all 0.2s ease;
                                `;
                                view3DButton.innerHTML = '<i class="fas fa-cube"></i> Open in 3D Circuit Builder';
                                view3DButton.onmouseover = () => view3DButton.style.transform = 'translateY(-1px)';
                                view3DButton.onmouseout = () => view3DButton.style.transform = 'translateY(0)';
                                view3DButton.onclick = () => {
                                    openCircuitIn3D(data.circuit_data);
                                    view3DButton.innerHTML = '<i class="fas fa-check"></i> Opened!';
                                    view3DButton.style.background = '#10b981';
                                };

                                lastMessage.appendChild(view3DButton);
                            }
                        }, 1000);
                    }
                }

                // Dispatch event for 3D integration
                if (data.circuit_generated && window.circuit3DIntegration) {
                    window.dispatchEvent(new CustomEvent('aiCircuitGenerated', {
                        detail: data
                    }));
                }

                return data.ai_response;
            } else {
                return `❌ **Circuit Generation Failed**\n\nI couldn't generate a circuit from your request. Please try rephrasing it or ask for help with specific circuit types like:\n\n• "Create a Bell state circuit"\n• "Make a quantum random number generator"\n• "Generate a Grover search algorithm"`;
            }

        } catch (error) {
            console.error('❌ Circuit generation error:', error);
            return `❌ **Circuit Generation Error**\n\nI encountered an error while processing your request: ${error.message}\n\nPlease try again with a simpler request or check your internet connection.`;
        }
    }

    async handleCircuitExecution(message) {
        try {
            console.log('🚀 Processing quantum job submission request:', message);

            // First, check if user has a circuit ready or needs to generate one
            let circuitAvailable = false;
            if (this.dashboard && this.dashboard.currentCircuit) {
                circuitAvailable = true;
            }

            // If no circuit available, suggest generating one first
            if (!circuitAvailable) {
                const lowerMessage = message.toLowerCase();
                const hasCircuitReference = ['this circuit', 'the circuit', 'my circuit', 'circuit'].some(phrase => lowerMessage.includes(phrase));

                if (!hasCircuitReference) {
                    return `🤔 **No Circuit Available for Execution**\n\nTo submit a job to IBM Quantum, I need a quantum circuit first. You can:\n\n• **Generate a circuit** by asking: "Create a Bell state circuit"\n• **Use the Circuit Library** in the Circuits tab\n• **Design your own** in the 3D Circuit Builder\n\nOnce you have a circuit, ask me to "submit this to IBM Quantum" or "run this on real hardware".\n\nWhat kind of quantum circuit would you like to create?`;
                }
            }

            // Show pre-submission warning and confirmation
            const preSubmissionWarning = await this.showJobSubmissionWarning();
            if (!preSubmissionWarning) {
                return `❌ **Job Submission Cancelled**\n\nJob submission was cancelled. No charges were incurred.`;
            }

            const response = await fetch('/api/ai/execute_circuit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: message,
                    backend: 'auto', // Let the system choose the best available backend
                    shots: 1024,
                    priority: 'normal'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return this.handleJobSubmissionError(response.status, errorData);
            }

            const data = await response.json();

            if (data.success && data.job_result) {
                // Job submitted successfully - provide comprehensive feedback
                return this.formatJobSubmissionSuccess(data.job_result, data.ai_response);
            } else {
                return `❌ **Job Submission Failed**\n\n${data.error || 'Unknown error occurred'}\n\nPlease check your IBM Quantum account status and try again.`;
            }

        } catch (error) {
            console.error('❌ Circuit execution error:', error);
            return this.handleJobSubmissionError('NETWORK_ERROR', { message: error.message });
        }
    }

    async showJobSubmissionWarning() {
        // This would show a modal/dialog in a real implementation
        // For now, we'll provide informational response
        return true; // Assume user acknowledges
    }

    handleJobSubmissionError(statusCode, errorData) {
        const errorMessages = {
            400: "❌ **Invalid Request**\n\nThe circuit parameters are invalid. Please check your circuit configuration.",
            401: "🔐 **Authentication Required**\n\nYou need to log in with valid IBM Quantum credentials to submit jobs.",
            402: "💰 **Insufficient Credits**\n\nYour IBM Quantum account doesn't have enough credits. Please check your account balance.",
            403: "🚫 **Access Denied**\n\nYour IBM Quantum account doesn't have permission to submit jobs on the selected backend.",
            429: "⏱️ **Rate Limit Exceeded**\n\nToo many job submissions. Please wait before submitting another job.",
            500: "🔧 **Server Error**\n\nIBM Quantum services are temporarily unavailable. Please try again later.",
            503: "🔄 **Service Unavailable**\n\nThe quantum backend is currently unavailable. Please try a different backend.",
            'NETWORK_ERROR': "🌐 **Network Error**\n\nUnable to connect to IBM Quantum. Please check your internet connection."
        };

        const message = errorMessages[statusCode] || `❌ **Unexpected Error**\n\nAn unexpected error occurred (${statusCode}). Please try again.`;

        if (errorData.details) {
            return `${message}\n\n**Details:** ${errorData.details}`;
        }

        return message;
    }

    formatJobSubmissionSuccess(jobResult, aiResponse) {
        const job = jobResult;

        let response = `✅ **Job Submitted Successfully to IBM Quantum!**\n\n`;
        response += `🆔 **Job ID:** \`${job.job_id}\`\n`;
        response += `🖥️ **Backend:** ${job.backend || 'Auto-selected'}\n`;
        response += `📊 **Status:** ${job.status || 'Queued'}\n`;
        response += `🎯 **Shots:** ${job.shots || 1024}\n`;

        if (job.estimated_queue_time) {
            response += `⏱️ **Est. Queue Time:** ${this.formatTime(job.estimated_queue_time)}\n`;
        }

        if (job.estimated_cost) {
            response += `💰 **Estimated Cost:** ${job.estimated_cost} credits\n`;
        }

        response += `\n📋 **What happens next:**\n`;
        response += `• Your job is now in the IBM Quantum queue\n`;
        response += `• Check the Jobs widget for real-time status updates\n`;
        response += `• Results will appear automatically when complete\n`;
        response += `• You can cancel the job if needed\n\n`;

        response += `💡 **Tips:**\n`;
        response += `• Monitor your job in the Active Jobs widget\n`;
        response += `• Jobs typically complete within 5-30 minutes\n`;
        response += `• You'll receive a notification when results are ready\n\n`;

        response += `🔄 **Track Progress:** The job status will update automatically in the dashboard.\n\n`;

        if (aiResponse) {
            response += `🤖 **AI Analysis:** ${aiResponse}`;
        }

        // Trigger comprehensive dashboard updates
        if (this.dashboard) {
            console.log('🔄 Updating all widgets with new job data...');

            // Immediate comprehensive updates
            setTimeout(() => {
                // Update jobs widget (primary)
                if (this.dashboard.updateJobsWidget) {
                    this.dashboard.updateJobsWidget();
                }

                // Update backends widget (queue status may have changed)
                if (this.dashboard.updateBackendsWidget) {
                    this.dashboard.updateBackendsWidget();
                }

                // Update performance metrics
                if (this.dashboard.updatePerformanceWidget) {
                    this.dashboard.updatePerformanceWidget();
                }

                // Update main dashboard metrics
                if (this.dashboard.updateDashboard) {
                    this.dashboard.updateDashboard();
                }

                // Update circuit widget if needed
                if (this.updateCircuitWidget) {
                    this.updateCircuitWidget();
                }

                // Update results widget for any completed jobs
                if (this.dashboard.updateResultsWidget) {
                    this.dashboard.updateResultsWidget();
                }
            }, 1000);

            // Set up comprehensive job monitoring
            this.startJobMonitoring(job.job_id);
        }

        return response;
    }

    formatTime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    }

    startJobMonitoring(jobId) {
        console.log(`👀 Starting comprehensive job monitoring for job: ${jobId}`);

        // Monitor job status with intelligent intervals
        let checkInterval = 15000; // Start with 15 seconds
        let checks = 0;
        const maxChecks = 80; // ~20 minutes total monitoring
        let lastStatus = null;
        let completedNotified = false;

        const monitorJob = async () => {
            if (checks >= maxChecks) {
                console.log(`⏰ Job monitoring ended for ${jobId} (timeout)`);
                return;
            }

            checks++;

            // Increase interval over time (more frequent at start)
            if (checks > 4) checkInterval = 30000;    // 30s after 1 minute
            if (checks > 12) checkInterval = 60000;   // 1min after 6 minutes
            if (checks > 30) checkInterval = 120000;  // 2min after 15 minutes

            try {
                // Check job status via API
                const response = await fetch('/api/jobs');
                if (response.ok) {
                    const data = await response.json();
                    const jobs = Array.isArray(data) ? data : (data.jobs || []);

                    // Find our job
                    const ourJob = jobs.find(job => job.job_id === jobId);
                    if (ourJob) {
                        const currentStatus = ourJob.status;
                        console.log(`📊 Job ${jobId} status: ${currentStatus} (check #${checks})`);

                        // Status changed?
                        if (lastStatus && lastStatus !== currentStatus) {
                            console.log(`🔄 Job ${jobId} status changed: ${lastStatus} → ${currentStatus}`);

                            // Notify user of important status changes
                            if (currentStatus === 'completed' || currentStatus === 'done') {
                                this.notifyJobCompletion(jobId, ourJob);
                                completedNotified = true;
                                return; // Stop monitoring completed jobs
                            } else if (currentStatus === 'error' || currentStatus === 'failed') {
                                this.notifyJobError(jobId, ourJob);
                                return; // Stop monitoring failed jobs
                            }
                        }

                        lastStatus = currentStatus;

                        // Update all relevant widgets
                        if (this.dashboard) {
                            if (this.dashboard.updateJobsWidget) this.dashboard.updateJobsWidget();
                            if (this.dashboard.updateDashboard) this.dashboard.updateDashboard();
                            if (currentStatus === 'running' && this.dashboard.updateResultsWidget) {
                                this.dashboard.updateResultsWidget(); // Update results for running jobs too
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ Error monitoring job ${jobId}:`, error);
            }

            // Continue monitoring if not completed and not timed out
            if (!completedNotified) {
                setTimeout(monitorJob, checkInterval);
            }
        };

        // Start monitoring immediately
        monitorJob();
    }

    notifyJobCompletion(jobId, jobData) {
        console.log(`✅ Job ${jobId} completed successfully!`);

        // Show completion notification in AI chat if side panel is open
        const sidePanel = document.getElementById('ai-assistant-side-panel');
        if (sidePanel) {
            const completionMessage = `\n\n🎉 **Job Completed Successfully!**\n\n**Job ID:** \`${jobId}\`\n**Status:** ✅ Completed\n**Backend:** ${jobData.backend || 'IBM Quantum'}\n\n📊 **Results Available:**\n• Check the Measurement Results widget\n• View detailed results in the Jobs widget\n• Performance metrics have been updated\n\nYour quantum circuit has been successfully executed on real IBM Quantum hardware!`;

            this.addAIMessage(sidePanel, completionMessage, 'assistant');

            // Switch to chat tab to show the message
            const chatTabBtn = sidePanel.querySelector('[data-tab="chat"]');
            if (chatTabBtn) chatTabBtn.click();
        }

        // Trigger final comprehensive update
        if (this.dashboard) {
            setTimeout(() => {
                // Update all widgets one final time
                if (this.dashboard.updateJobsWidget) this.dashboard.updateJobsWidget();
                if (this.dashboard.updateResultsWidget) this.dashboard.updateResultsWidget();
                if (this.dashboard.updatePerformanceWidget) this.dashboard.updatePerformanceWidget();
                if (this.dashboard.updateDashboard) this.dashboard.updateDashboard();
            }, 2000);
        }
    }

    notifyJobError(jobId, jobData) {
        console.error(`❌ Job ${jobId} failed!`);

        // Show error notification
        const sidePanel = document.getElementById('ai-assistant-side-panel');
        if (sidePanel) {
            const errorMessage = `\n\n❌ **Job Failed**\n\n**Job ID:** \`${jobId}\`\n**Status:** ❌ Failed\n\nThe job encountered an error during execution. Check the Jobs widget for detailed error information. You may want to try submitting again with different parameters.`;

            this.addAIMessage(sidePanel, errorMessage, 'assistant');

            const chatTabBtn = sidePanel.querySelector('[data-tab="chat"]');
            if (chatTabBtn) chatTabBtn.click();
        }
    }

    async tryAIQuantumChat(message) {
        try {
            console.log('🤖 Processing AI quantum chat:', message);

            // Get API key from localStorage
            const apiKey = localStorage.getItem('quantum_ai_key');
            const aiProvider = localStorage.getItem('quantum_ai_provider');

            const response = await fetch('/api/ai/quantum_chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    api_key: apiKey,
                    ai_provider: aiProvider
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                // If a circuit was generated, store it for potential use
                if (data.circuit_generated && data.circuit_data && this.dashboard) {
                    this.dashboard.currentCircuit = data.circuit_data;

                    // Add button to open in 3D circuit builder
                    if (typeof openCircuitIn3D === 'function') {
                        setTimeout(() => {
                            const lastMessage = document.querySelector('.ai-message:last-child, .assistant-message:last-child, .message:last-child');
                            if (lastMessage && (lastMessage.textContent.includes('generated') || lastMessage.textContent.includes('created'))) {
                                const view3DButton = document.createElement('div');
                                view3DButton.style.cssText = `
                                    margin-top: 10px;
                                    padding: 8px 12px;
                                    background: linear-gradient(135deg, #06b6d4, #0891b2);
                                    color: white;
                                    border: none;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 0.9rem;
                                    display: inline-block;
                                    transition: all 0.2s ease;
                                `;
                                view3DButton.innerHTML = '<i class="fas fa-cube"></i> Open in 3D Circuit Builder';
                                view3DButton.onmouseover = () => view3DButton.style.transform = 'translateY(-1px)';
                                view3DButton.onmouseout = () => view3DButton.style.transform = 'translateY(0)';
                                view3DButton.onclick = () => {
                                    openCircuitIn3D(data.circuit_data);
                                    view3DButton.innerHTML = '<i class="fas fa-check"></i> Opened!';
                                    view3DButton.style.background = '#10b981';
                                };

                                lastMessage.appendChild(view3DButton);
                            }
                        }, 1000);
                    }
                }

                return data.ai_response;
            } else {
                return null; // Fall back to other methods
            }

        } catch (error) {
            console.log('⚠️ AI quantum chat failed, using fallback:', error);
            return null; // Fall back to other methods
        }
    }

    // Enhanced circuit generation with 3D visualization
    async generateCircuitWith3D(circuitType, parameters = {}) {
        try {
            const response = await fetch('/api/generate_circuit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    circuit_type: circuitType,
                    parameters: parameters
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                // Load circuit in 3D visualizer if available
                if (this.dashboard && this.dashboard.loadCircuitIn3D) {
                    this.dashboard.loadCircuitIn3D(data.circuit_data);
                }

                return data;
            } else {
                throw new Error(data.error || 'Circuit generation failed');
            }

        } catch (error) {
            console.error('❌ Circuit generation with 3D error:', error);
            throw error;
        }
    }

    // Submit circuit to IBM Quantum
    async submitCircuitToIBM(circuitData, backendName = 'auto') {
        try {
            const response = await fetch('/api/execute_circuit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    circuit_type: circuitData.type,
                    parameters: circuitData.params || {},
                    backend: backendName
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                // Refresh jobs widget to show new job
                if (this.dashboard && this.dashboard.updateJobsWidget) {
                    this.dashboard.updateJobsWidget();
                }

                return `🚀 **Circuit Submitted to IBM Quantum!**\n\nJob ID: ${data.job_id}\nBackend: ${data.backend}\nStatus: Submitted\n\nYour circuit is now in the quantum queue. You can monitor its progress in the Jobs widget.`;
            } else {
                throw new Error(data.error || 'Circuit submission failed');
            }

        } catch (error) {
            console.error('❌ IBM Quantum submission error:', error);
            throw error;
        }
    }
}

// Make EnhancedQuantumAI globally available
window.EnhancedQuantumAI = EnhancedQuantumAI;
