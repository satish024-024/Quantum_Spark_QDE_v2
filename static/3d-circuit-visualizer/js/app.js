/**
 * Main Application Controller
 * Orchestrates all components and handles user interactions
 */

class QuantumCircuitApp {
    constructor() {
        this.visualization = null;
        this.quantumSimulator = null;
        this.circuitBuilder = null;
        this.blochSphere = null;
        this.ibmIntegration = null;
        
        this.isRunning = false;
        this.currentStep = 0;
        this.circuitSteps = [];
        
        this.initialize();
    }

    initialize() {
        try {
            console.log('🚀 Starting Quantum Circuit App initialization...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
                return;
            } else {
                this.initializeComponents();
            }
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showError('Application initialization failed: ' + error.message);
        }
    }

    initializeComponents() {
        try {
            // Check if Three.js is loaded
            if (typeof THREE === 'undefined') {
                throw new Error('Three.js library not loaded. Please check your internet connection and reload the page.');
            }
            console.log('✅ Three.js loaded (v' + THREE.REVISION + ')');

            // Check if Qiskit is loaded
            if (typeof qiskit === 'undefined') {
                console.warn('⚠️ Qiskit.js not loaded, using local simulator only');
            } else {
                console.log('✅ Qiskit.js loaded');
            }

            // Check if canvas element exists
            const canvas = document.getElementById('quantumCanvas');
            if (!canvas) {
                throw new Error('Canvas element not found. Please check the HTML structure.');
            }
            console.log('✅ Canvas element found');

            // Initialize main visualization
            console.log('Initializing visualization...');
            this.visualization = new QuantumVisualization();
            console.log('✅ Visualization created:', this.visualization);
            
            // Get references to components
            this.quantumSimulator = this.visualization.quantumSimulator;
            this.circuitBuilder = this.visualization.circuitBuilder;
            this.blochSphere = this.visualization.blochSphere;
            this.ibmIntegration = this.visualization.ibmIntegration;
            
            // Setup event listeners
            console.log('Setting up event listeners...');
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            
            // Initialize UI
            console.log('Initializing UI...');
            this.initializeUI();
            
            // Add quantum effects
            console.log('Adding quantum effects...');
            this.visualization.addQuantumParticles();
            this.visualization.addQuantumField();
            
            // Hide loading overlay
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
                console.log('✅ Loading overlay hidden');
            }
            
            console.log('🎉 Quantum Circuit Visualizer initialized successfully');
            
            // Add success indicator to canvas
            if (canvas) {
                canvas.style.border = '2px solid #00d4ff';
                console.log('✅ Canvas border updated to indicate success');
            }
        } catch (error) {
            console.error('❌ Failed to initialize Quantum Circuit App:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    showError(message) {
        // Hide loading overlay if it exists
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }

        // Show error message
        alert('Application Error: ' + message + '\n\nCheck the browser console for details.');
        
        // Also log to console
        console.error('Application Error:', message);
    }

    setupEventListeners() {
        // Safe binder utility
        const on = (id, event, handler) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener(event, handler);
            } else {
                console.warn(`UI element '#${id}' not found; skipping ${event} binding`);
            }
        };

        // Circuit controls
        on('runCircuit', 'click', () => this.runCircuit());
        on('clearCircuit', 'click', () => this.clearCircuit());
        on('saveCircuit', 'click', () => this.saveCircuit());
        on('loadCircuit', 'click', () => this.loadCircuit());

        // Camera controls
        on('resetCamera', 'click', () => this.resetCamera());
        on('toggleAnimation', 'click', () => this.toggleAnimation());

        // Settings
        on('settingsBtn', 'click', () => this.openSettings());
        on('closeSettings', 'click', () => this.closeSettings());

        // Sidebar controls
        on('collapseGates', 'click', () => this.toggleSidebar('left'));
        on('collapseResults', 'click', () => this.toggleSidebar('right'));

        // Timeline controls
        on('stepBack', 'click', () => this.stepBack());
        on('playPause', 'click', () => this.togglePlayPause());
        on('stepForward', 'click', () => this.stepForward());
        on('timelineSlider', 'input', (e) => this.seekTimeline(e.target.value));

        // Device selection (use custom dropdown if present; otherwise skip)
        on('deviceSelect', 'change', (e) => this.changeDevice(e.target.value));

        // Settings form
        on('apiToken', 'input', (e) => this.updateAPIToken(e.target.value));
        on('animationSpeed', 'input', (e) => this.updateAnimationSpeed(e.target.value));
        on('showBlochSpheres', 'change', (e) => this.toggleBlochSpheres(e.target.checked));

        // File input for loading circuits
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', (e) => this.handleFileLoad(e));
        document.body.appendChild(fileInput);
        this.fileInput = fileInput;
    }

    setupKeyboardShortcuts() {
        // Keyboard shortcuts inspired by Quirk and other professional tools
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z for undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (this.circuitBuilder && this.circuitBuilder.undo()) {
                    console.log('Undo performed');
                    this.updateCircuitInfo();
                }
            }
            
            // Ctrl+Y or Ctrl+Shift+Z for redo
            if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                if (this.circuitBuilder && this.circuitBuilder.redo()) {
                    console.log('Redo performed');
                    this.updateCircuitInfo();
                }
            }
            
            // Delete key for removing selected gates
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                if (this.circuitBuilder && this.circuitBuilder.selectedGates) {
                    this.circuitBuilder.deleteSelectedGates();
                    this.updateCircuitInfo();
                }
            }
            
            // Ctrl+A for select all gates
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                if (this.circuitBuilder) {
                    this.circuitBuilder.selectMultipleGates(this.circuitBuilder.gateInstances);
                }
            }
            
            // Escape to clear selection
            if (e.key === 'Escape') {
                if (this.circuitBuilder && this.circuitBuilder.selectedGates) {
                    this.circuitBuilder.selectedGates = [];
                    this.circuitBuilder.highlightSelectedGates();
                }
            }
            
            // Space to run circuit
            if (e.key === ' ' && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                this.runCircuit();
            }
            
            // Ctrl+S for save circuit
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveCircuit();
            }
            
            // Ctrl+E for export circuit
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.exportCircuit();
            }
        });
    }

    initializeUI() {
        // Update initial circuit info
        this.updateCircuitInfo();
        
        // Initialize timeline
        this.updateTimeline();
        
        // Load saved settings
        this.loadSettings();
    }

    async runCircuit() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.showLoading(true);
        
        try {
            const device = document.getElementById('deviceSelect').value;
            
            if (device === 'simulator') {
                // Run on local simulator
                await this.runLocalSimulation();
            } else {
                // Run on IBM Quantum
                await this.runIBMQuantum(device);
            }
        } catch (error) {
            console.error('Circuit execution failed:', error);
            this.showError('Circuit execution failed: ' + error.message);
        } finally {
            this.isRunning = false;
            this.showLoading(false);
        }
    }

    async runLocalSimulation() {
        // Reset simulator
        this.quantumSimulator.reset();
        
        // Execute circuit step by step
        const sortedCircuit = [...this.circuitBuilder.circuit].sort((a, b) => a.depth - b.depth);
        
        for (let i = 0; i < sortedCircuit.length; i++) {
            const gate = sortedCircuit[i];
            
            // Execute gate
            this.circuitBuilder.executeGate(gate);
            
            // Update timeline
            this.currentStep = i + 1;
            this.updateTimeline();
            
            // Wait for animation
            await this.delay(500);
        }
        
        // Final measurement
        const result = this.quantumSimulator.measure();
        this.displayResults(result);
    }

    async runIBMQuantum(device) {
        if (!this.ibmIntegration || !this.ibmIntegration.isConnected) {
            throw new Error('Not connected to IBM Quantum. Please configure API token in settings.');
        }
        
        // Convert circuit to IBM format
        const circuitData = {
            qubits: this.circuitBuilder.qubits,
            gates: this.circuitBuilder.circuit.map(gate => ({
                type: gate.type,
                qubitIndex: gate.qubitIndex,
                depth: gate.depth,
                parameters: gate.parameters,
                controlQubit: gate.controlQubit,
                targetQubit: gate.targetQubit
            }))
        };
        
        // Execute on IBM Quantum
        const job = await this.ibmIntegration.executeCircuit(circuitData, device);
        
        // Monitor job progress
        this.monitorIBMJob(job);
    }

    async monitorIBMJob(job) {
        const jobId = job.job_id();
        
        try {
            // Check job status periodically
            const checkStatus = async () => {
                const status = await job.status();
                
                if (status.name === 'DONE') {
                    const result = await job.result();
                    this.displayIBMResults(result);
                } else if (status.name === 'ERROR') {
                    throw new Error('Job failed');
                } else {
                    // Still running, check again
                    setTimeout(checkStatus, 2000);
                }
            };
            
            checkStatus();
        } catch (error) {
            console.error('Job monitoring failed:', error);
            this.showError('Job monitoring failed: ' + error.message);
        }
    }

    displayResults(result) {
        // Update histogram
        this.updateHistogram(result.probabilities);
        
        // Update statistics
        this.updateStatistics(result);
        
        // Update Bloch sphere
        const blochCoords = this.quantumSimulator.getBlochCoordinates(0);
        this.blochSphere.animateToState(blochCoords, 1000);
    }

    displayIBMResults(result) {
        const counts = result.get_counts();
        
        // Convert counts to probabilities
        const totalShots = Object.values(counts).reduce((sum, count) => sum + count, 0);
        const probabilities = Object.entries(counts).map(([state, count]) => ({
            state,
            probability: count / totalShots
        }));
        
        // Update histogram
        this.updateHistogram(probabilities);
        
        // Update statistics
        this.updateStatistics({ probabilities });
    }

    updateHistogram(probabilities) {
        const canvas = document.getElementById('resultsHistogram');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw bars
        const barWidth = width / probabilities.length;
        probabilities.forEach((prob, index) => {
            const barHeight = prob.probability * height * 0.8;
            const x = index * barWidth;
            const y = height - barHeight;
            
            // Draw bar
            ctx.fillStyle = `hsl(${index * 360 / probabilities.length}, 70%, 50%)`;
            ctx.fillRect(x, y, barWidth - 2, barHeight);
            
            // Draw label
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(prob.state || index.toString(), x + barWidth / 2, height - 5);
        });
    }

    updateStatistics(result) {
        // Calculate fidelity
        const fidelity = this.quantumSimulator.calculateFidelity([1, 0, 0, 0, 0, 0, 0, 0]);
        document.getElementById('fidelity').textContent = fidelity.toFixed(3);
        
        // Calculate entanglement
        const entanglement = this.quantumSimulator.calculateEntanglement();
        document.getElementById('entanglement').textContent = entanglement.toFixed(3);
    }

    clearCircuit() {
        this.circuitBuilder.clearCircuit();
        this.currentStep = 0;
        this.updateTimeline();
        this.resetVisualizations();
    }

    resetVisualizations() {
        // Reset Bloch sphere
        this.blochSphere.updateState(0, 0, 1);
        
        // Clear histogram
        const canvas = document.getElementById('resultsHistogram');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Reset statistics
        document.getElementById('fidelity').textContent = '-';
        document.getElementById('entanglement').textContent = '-';
    }

    saveCircuit() {
        this.circuitBuilder.saveCircuit();
    }

    exportCircuit() {
        // Create export options modal
        this.showExportModal();
    }

    showExportModal() {
        // Create export modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Export Circuit</h3>
                    <button class="btn btn-ghost" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <button class="btn btn-primary" onclick="app.exportToQASM()">
                            <i class="fas fa-code"></i> Export to OpenQASM
                        </button>
                        <button class="btn btn-primary" onclick="app.exportToQiskit()">
                            <i class="fab fa-python"></i> Export to Qiskit
                        </button>
                        <button class="btn btn-primary" onclick="app.exportToCirq()">
                            <i class="fas fa-project-diagram"></i> Export to Cirq
                        </button>
                        <button class="btn btn-secondary" onclick="app.exportToJSON()">
                            <i class="fas fa-file-code"></i> Export to JSON
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    exportToQASM() {
        const qasm = this.generateQASM();
        this.downloadFile(qasm, 'circuit.qasm', 'text/plain');
        document.querySelector('.modal').remove();
    }

    exportToQiskit() {
        const qiskitCode = this.generateQiskitCode();
        this.downloadFile(qiskitCode, 'circuit.py', 'text/plain');
        document.querySelector('.modal').remove();
    }

    exportToCirq() {
        const cirqCode = this.generateCirqCode();
        this.downloadFile(cirqCode, 'circuit.py', 'text/plain');
        document.querySelector('.modal').remove();
    }

    exportToJSON() {
        this.saveCircuit();
        document.querySelector('.modal').remove();
    }

    generateQASM() {
        let qasm = 'OPENQASM 3.0;\n';
        qasm += 'include "stdgates.inc";\n\n';
        qasm += `qubit[${this.circuitBuilder.qubits}] q;\n`;
        qasm += `bit[${this.circuitBuilder.qubits}] c;\n\n`;
        
        // Sort gates by depth
        const sortedGates = [...this.circuitBuilder.gateInstances].sort((a, b) => a.depth - b.depth);
        
        sortedGates.forEach(gate => {
            const gateName = gate.name.toLowerCase();
            if (gate.type === 'single') {
                qasm += `${gateName} q[${gate.qubit}];\n`;
            } else if (gate.type === 'two') {
                if (gate.name === 'CNOT') {
                    qasm += `cx q[${gate.control}], q[${gate.target}];\n`;
                } else if (gate.name === 'CZ') {
                    qasm += `cz q[${gate.control}], q[${gate.target}];\n`;
                } else if (gate.name === 'SWAP') {
                    qasm += `swap q[${gate.control}], q[${gate.target}];\n`;
                }
            }
        });
        
        qasm += '\n// Measurements\n';
        for (let i = 0; i < this.circuitBuilder.qubits; i++) {
            qasm += `c[${i}] = measure q[${i}];\n`;
        }
        
        return qasm;
    }

    generateQiskitCode() {
        let code = 'from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister\n';
        code += 'from qiskit.visualization import plot_histogram\n\n';
        code += `# Create quantum circuit with ${this.circuitBuilder.qubits} qubits\n`;
        code += `qr = QuantumRegister(${this.circuitBuilder.qubits}, 'q')\n`;
        code += `cr = ClassicalRegister(${this.circuitBuilder.qubits}, 'c')\n`;
        code += 'qc = QuantumCircuit(qr, cr)\n\n';
        
        // Sort gates by depth
        const sortedGates = [...this.circuitBuilder.gateInstances].sort((a, b) => a.depth - b.depth);
        
        sortedGates.forEach(gate => {
            const gateName = gate.name.toLowerCase();
            if (gate.type === 'single') {
                code += `qc.${gateName}(qr[${gate.qubit}])\n`;
            } else if (gate.type === 'two') {
                if (gate.name === 'CNOT') {
                    code += `qc.cx(qr[${gate.control}], qr[${gate.target}])\n`;
                } else if (gate.name === 'CZ') {
                    code += `qc.cz(qr[${gate.control}], qr[${gate.target}])\n`;
                } else if (gate.name === 'SWAP') {
                    code += `qc.swap(qr[${gate.control}], qr[${gate.target}])\n`;
                }
            }
        });
        
        code += '\n# Add measurements\n';
        code += 'qc.measure_all()\n\n';
        code += '# Draw circuit\n';
        code += 'print(qc.draw())\n\n';
        code += '# Run on simulator\n';
        code += 'from qiskit_aer import AerSimulator\n';
        code += 'backend = AerSimulator()\n';
        code += 'job = backend.run(qc, shots=1024)\n';
        code += 'result = job.result()\n';
        code += 'counts = result.get_counts(qc)\n';
        code += 'print(counts)\n';
        
        return code;
    }

    generateCirqCode() {
        let code = 'import cirq\n\n';
        code += `# Create quantum circuit with ${this.circuitBuilder.qubits} qubits\n`;
        code += `qubits = [cirq.GridQubit(0, i) for i in range(${this.circuitBuilder.qubits})]\n`;
        code += 'circuit = cirq.Circuit()\n\n';
        
        // Sort gates by depth
        const sortedGates = [...this.circuitBuilder.gateInstances].sort((a, b) => a.depth - b.depth);
        
        sortedGates.forEach(gate => {
            const gateName = gate.name.toLowerCase();
            if (gate.type === 'single') {
                if (gateName === 'h') {
                    code += `circuit.append(cirq.H(qubits[${gate.qubit}]))\n`;
                } else if (gateName === 'x') {
                    code += `circuit.append(cirq.X(qubits[${gate.qubit}]))\n`;
                } else if (gateName === 'y') {
                    code += `circuit.append(cirq.Y(qubits[${gate.qubit}]))\n`;
                } else if (gateName === 'z') {
                    code += `circuit.append(cirq.Z(qubits[${gate.qubit}]))\n`;
                }
            } else if (gate.type === 'two') {
                if (gate.name === 'CNOT') {
                    code += `circuit.append(cirq.CNOT(qubits[${gate.control}], qubits[${gate.target}]))\n`;
                } else if (gate.name === 'CZ') {
                    code += `circuit.append(cirq.CZ(qubits[${gate.control}], qubits[${gate.target}]))\n`;
                } else if (gate.name === 'SWAP') {
                    code += `circuit.append(cirq.SWAP(qubits[${gate.control}], qubits[${gate.target}]))\n`;
                }
            }
        });
        
        code += '\n# Add measurements\n';
        code += 'circuit.append(cirq.measure(*qubits, key=\'result\'))\n\n';
        code += '# Print circuit\n';
        code += 'print(circuit)\n\n';
        code += '# Simulate circuit\n';
        code += 'simulator = cirq.Simulator()\n';
        code += 'result = simulator.run(circuit, repetitions=1000)\n';
        code += 'print(result.histogram(key=\'result\'))\n';
        
        return code;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    loadCircuit() {
        this.fileInput.click();
    }

    handleFileLoad(event) {
        const file = event.target.files[0];
        if (file) {
            this.circuitBuilder.loadCircuit(file);
            this.updateTimeline();
        }
    }

    resetCamera() {
        this.visualization.resetCamera();
    }

    toggleAnimation() {
        this.visualization.toggleAnimation();
    }

    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
        this.saveSettings();
    }

    toggleSidebar(side) {
        const sidebar = document.querySelector(`.${side}-sidebar`);
        sidebar.classList.toggle('collapsed');
    }

    stepBack() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateTimeline();
            this.seekToStep(this.currentStep);
        }
    }

    stepForward() {
        if (this.currentStep < this.circuitSteps.length) {
            this.currentStep++;
            this.updateTimeline();
            this.seekToStep(this.currentStep);
        }
    }

    togglePlayPause() {
        // Toggle circuit execution
        const button = document.getElementById('playPause');
        const icon = button.querySelector('i');
        
        if (this.isRunning) {
            this.isRunning = false;
            icon.className = 'fas fa-play';
        } else {
            this.isRunning = true;
            icon.className = 'fas fa-pause';
            this.runCircuit();
        }
    }

    seekTimeline(value) {
        const step = Math.floor((value / 100) * this.circuitSteps.length);
        this.currentStep = step;
        this.updateTimeline();
        this.seekToStep(step);
    }

    seekToStep(step) {
        // Reset simulator to initial state
        this.quantumSimulator.reset();
        
        // Execute up to the specified step
        const sortedCircuit = [...this.circuitBuilder.circuit].sort((a, b) => a.depth - b.depth);
        for (let i = 0; i < step; i++) {
            if (sortedCircuit[i]) {
                this.quantumSimulator.applyGate(
                    sortedCircuit[i].type,
                    sortedCircuit[i].qubitIndex,
                    sortedCircuit[i].parameters
                );
            }
        }
        
        // Update visualizations
        this.updateVisualizations();
    }

    updateVisualizations() {
        // Update Bloch sphere
        const blochCoords = this.quantumSimulator.getBlochCoordinates(0);
        this.blochSphere.updateState(blochCoords.x, blochCoords.y, blochCoords.z);
        
        // Update state vector
        const stateVectorString = this.quantumSimulator.getStateVectorString();
        document.getElementById('stateVectorDisplay').textContent = stateVectorString;
    }

    changeDevice(device) {
        console.log('Device changed to:', device);
        // Update UI based on device selection
    }

    updateAPIToken(token) {
        if (this.ibmIntegration) {
            this.ibmIntegration.apiToken = token;
        }
    }

    updateAnimationSpeed(speed) {
        this.visualization.setAnimationSpeed(parseFloat(speed));
    }

    toggleBlochSpheres(show) {
        const blochContainer = document.querySelector('.bloch-sphere-container');
        blochContainer.style.display = show ? 'block' : 'none';
    }

    updateCircuitInfo() {
        this.circuitBuilder.updateCircuitInfo();
    }

    updateTimeline() {
        const timeline = document.getElementById('circuitTimeline');
        const slider = document.getElementById('timelineSlider');
        
        // Clear timeline
        timeline.innerHTML = '';
        
        // Add timeline steps
        const sortedCircuit = [...this.circuitBuilder.circuit].sort((a, b) => a.depth - b.depth);
        this.circuitSteps = sortedCircuit;
        
        sortedCircuit.forEach((gate, index) => {
            const step = document.createElement('div');
            step.className = 'timeline-step';
            step.textContent = gate.type;
            step.style.background = this.getGateColor(gate.type);
            
            if (index < this.currentStep) {
                step.classList.add('completed');
            } else if (index === this.currentStep) {
                step.classList.add('current');
            }
            
            timeline.appendChild(step);
        });
        
        // Update slider
        slider.max = sortedCircuit.length;
        slider.value = this.currentStep;
    }

    getGateColor(gateType) {
        const colors = {
            'X': '#ff6b6b',
            'Y': '#4ecdc4',
            'Z': '#45b7d1',
            'H': '#96ceb4',
            'S': '#feca57',
            'T': '#ff9ff3',
            'CNOT': '#ff6348',
            'CZ': '#2ed573',
            'SWAP': '#ffa502',
            'MEASURE': '#ffd93d'
        };
        return colors[gateType] || '#00d4ff';
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.toggle('active', show);
    }

    showError(message) {
        // Simple error display - you could enhance this with a proper modal
        alert(message);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    loadSettings() {
        const settings = localStorage.getItem('quantumCircuitSettings');
        if (settings) {
            const parsed = JSON.parse(settings);
            
            if (parsed.apiToken) {
                document.getElementById('apiToken').value = parsed.apiToken;
                this.updateAPIToken(parsed.apiToken);
            }
            
            if (parsed.animationSpeed) {
                document.getElementById('animationSpeed').value = parsed.animationSpeed;
                this.updateAnimationSpeed(parsed.animationSpeed);
            }
            
            if (parsed.showBlochSpheres !== undefined) {
                document.getElementById('showBlochSpheres').checked = parsed.showBlochSpheres;
                this.toggleBlochSpheres(parsed.showBlochSpheres);
            }
        }
    }

    saveSettings() {
        const settings = {
            apiToken: document.getElementById('apiToken').value,
            animationSpeed: document.getElementById('animationSpeed').value,
            showBlochSpheres: document.getElementById('showBlochSpheres').checked
        };
        
        localStorage.setItem('quantumCircuitSettings', JSON.stringify(settings));
    }
}

// Export for global access
window.QuantumCircuitApp = QuantumCircuitApp;