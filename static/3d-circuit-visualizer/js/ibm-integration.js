/**
 * IBM Quantum Integration
 * Handles connection to IBM Quantum services and job management
 */

// Guard against redeclaration
if (typeof window !== 'undefined' && window.IBMIntegration) {
    console.log('IBMIntegration already loaded, skipping...');
} else {

class IBMIntegration {
    constructor() {
        this.apiToken = null;
        this.hub = 'ibm-q';
        this.group = 'open';
        this.project = 'main';
        this.provider = null;
        this.backend = null;
        this.jobs = new Map();
        this.isConnected = false;

        // Dynamically resolve Qiskit global (window.Qiskit vs window.qiskit)
        this.Q = window.Qiskit || window.qiskit || null;
        
        // Only initialize if Qiskit is available
        if (this.Q) {
            // Kick off async initialisation (non-blocking)
            this.initializeQiskit();

            // Attempt auto-load saved credentials
            const saved = localStorage.getItem('ibmCredsX');
            if (saved) {
                try {
                    const parsed = JSON.parse(this._xorDecode(saved));
                    if (parsed.token) {
                        this.connect(parsed.token, parsed.hub, parsed.group, parsed.project);
                    }
                } catch (e) { console.warn('Stored IBM creds invalid', e); }
            } else {
                // Fallback: check for plain stored token
                const rawToken = localStorage.getItem('ibmq_token');
                if (rawToken) {
                    this.connect(rawToken, this.hub, this.group, this.project);
                }
            }
        } else {
            console.warn('⚠️ Qiskit.js not available - IBM integration disabled');
            this.updateJobStatus('IBM Quantum integration not available', 'warning');
        }

        // Setup histogram resize observer
        this.setupHistogramResize();

        // Cache for last counts so we can redraw on resize
        this._lastCounts = null;
    }

    setupHistogramResize() {
        const canvas = document.getElementById('resultsHistogram');
        if (!canvas || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => {
            if (this._lastCounts) this.updateResultsHistogram(this._lastCounts);
        });
        observer.observe(canvas);
    }

    async initializeQiskit() {
        try {
            if (!this.Q) {
                console.warn('Qiskit SDK not detected');
                this.updateJobStatus('Qiskit SDK not available', 'error');
                return;
            }

            // Ensure credentials are loaded/valid; use the correct Qiskit.js API
            if (this.Q.IBMQ && this.Q.IBMQ.load_account) {
                // Try to load existing account first
                try {
                    this.provider = await this.Q.IBMQ.load_account();
                } catch (loadError) {
                    console.log('No saved account found, will need to save credentials');
                    // If no saved account, we'll need to save credentials first
                    this.provider = null;
                }
            } else if (this.Q.IBMQ && this.Q.IBMQ.save_account) {
                // If only save_account is available, we need credentials first
                console.log('Qiskit.js IBMQ available but no saved account');
                this.provider = null;
            } else {
                throw new Error('IBMQ not available in Qiskit.js');
            }
            if (this.provider) {
                this.isConnected = true;
                this.updateJobStatus('Connected to IBM Quantum', 'success');
                this.loadAvailableBackends();
            } else {
                this.isConnected = false;
                this.updateJobStatus('IBM Quantum available - credentials needed', 'warning');
                console.log('IBM Quantum integration ready but requires credentials');
            }
        } catch (error) {
            console.error('Failed to initialize IBM Quantum:', error);
            this.updateJobStatus('Connection failed', 'error');
        }
    }

    async connect(apiToken, hub = 'ibm-q', group = 'open', project = 'main') {
        try {
            this.apiToken = apiToken;
            this.hub = hub;
            this.group = group;
            this.project = project;
            
            if (this.Q) {
                // Save credentials
                await this.Q.IBMQ.save_account(apiToken, hub, group, project);
                
                // Load account
                this.provider = await this.Q.IBMQ.load_account();
                this.isConnected = true;
                
                this.updateJobStatus('Connected to IBM Quantum', 'success');
                this.loadAvailableBackends();
                
                // Persist credentials (basic base64 encoding)
                localStorage.setItem('ibmCredsX', this._xorEncode(JSON.stringify({ token: apiToken, hub, group, project })));
                
                return true;
            } else {
                throw new Error('Qiskit.js not available');
            }
        } catch (error) {
            console.error('IBM Quantum connection failed:', error);
            this.updateJobStatus('Connection failed: ' + error.message, 'error');
            return false;
        }
    }

    async loadAvailableBackends() {
        try {
            if (!this.provider) return;
            
            const backends = await this.provider.backends();
            this.updateBackendSelector(backends);
        } catch (error) {
            console.error('Failed to load backends:', error);
        }
    }

    updateBackendSelector(backends) {
        const selector = document.getElementById('deviceSelect');
        if (!selector) return;
        
        // Clear existing options
        selector.innerHTML = '<option value="simulator">Local Simulator</option>';
        
        // Add IBM backends
        backends.forEach(backend => {
            const option = document.createElement('option');
            option.value = backend.name;
            option.textContent = `${backend.name} (${backend.configuration().n_qubits} qubits)`;
            selector.appendChild(option);
        });
    }

    async executeCircuit(circuit, backendName = 'ibmq_qasm_simulator', shots = 1024) {
        try {
            if (!this.isConnected) {
                throw new Error('Not connected to IBM Quantum');
            }
            
            this.updateJobStatus('Submitting job...', 'running');
            
            // Get backend
            this.backend = await this.provider.get_backend(backendName);
            
            // Create Qiskit circuit
            const qiskitCircuit = this.convertToQiskitCircuit(circuit);
            
            // Add measurements if not present
            if (!this.hasMeasurements(qiskitCircuit)) {
                qiskitCircuit.measure_all();
            }
            
            // Submit job
            const job = await this.Q.execute(qiskitCircuit, this.backend, {
                shots: shots,
                memory: true
            });
            
            // Store job
            const jobId = job.job_id();
            this.jobs.set(jobId, job);
            
            this.updateJobStatus(`Job submitted: ${jobId}`, 'running');
            
            // Monitor job
            this.monitorJob(job);
            
            return job;
        } catch (error) {
            console.error('Circuit execution failed:', error);
            this.updateJobStatus('Execution failed: ' + error.message, 'error');
            throw error;
        }
    }

    convertToQiskitCircuit(circuit) {
        const qiskitCircuit = new Qiskit.QuantumCircuit(circuit.qubits);
        
        // Sort gates by depth
        const sortedGates = circuit.gates.sort((a, b) => a.depth - b.depth);
        
        sortedGates.forEach(gate => {
            this.addGateToQiskitCircuit(qiskitCircuit, gate);
        });
        
        return qiskitCircuit;
    }

    addGateToQiskitCircuit(qiskitCircuit, gate) {
        const qubitIndex = gate.qubitIndex;
        const parameters = gate.parameters || {};
        
        switch (gate.type) {
            case 'X':
                qiskitCircuit.x(qubitIndex);
                break;
            case 'Y':
                qiskitCircuit.y(qubitIndex);
                break;
            case 'Z':
                qiskitCircuit.z(qubitIndex);
                break;
            case 'H':
                qiskitCircuit.h(qubitIndex);
                break;
            case 'S':
                qiskitCircuit.s(qubitIndex);
                break;
            case 'T':
                qiskitCircuit.t(qubitIndex);
                break;
            case 'RX':
                qiskitCircuit.rx(parameters.angle || Math.PI / 2, qubitIndex);
                break;
            case 'RY':
                qiskitCircuit.ry(parameters.angle || Math.PI / 2, qubitIndex);
                break;
            case 'RZ':
                qiskitCircuit.rz(parameters.angle || Math.PI / 2, qubitIndex);
                break;
            case 'CNOT':
                qiskitCircuit.cx(gate.controlQubit, gate.targetQubit);
                break;
            case 'CZ':
                qiskitCircuit.cz(gate.controlQubit, gate.targetQubit);
                break;
            case 'SWAP':
                qiskitCircuit.swap(gate.controlQubit, gate.targetQubit);
                break;
            case 'CRX':
                qiskitCircuit.crx(parameters.angle || Math.PI / 2, gate.controlQubit, gate.targetQubit);
                break;
            case 'MEASURE':
                qiskitCircuit.measure(qubitIndex, qubitIndex);
                break;
            case 'BARRIER':
                qiskitCircuit.barrier();
                break;
            case 'CU1':
                qiskitCircuit.cu1(parameters.angle||Math.PI/2, gate.controlQubit, gate.targetQubit);
                break;
            case 'CU3':
                qiskitCircuit.cu3(parameters.theta||Math.PI/2, parameters.phi||0, parameters.lambda||Math.PI/2, gate.controlQubit, gate.targetQubit);
                break;
            case 'CCX':
                qiskitCircuit.ccx(gate.controlQubit1, gate.controlQubit2, gate.targetQubit);
                break;
            case 'CSWAP':
                qiskitCircuit.cswap(gate.controlQubit, gate.targetQubit1, gate.targetQubit2);
                break;
        }
    }

    hasMeasurements(circuit) {
        // Check if circuit has measurement gates
        return circuit.data.some(instruction => 
            instruction[0].name === 'measure'
        );
    }

    async monitorJob(job) {
        const jobId = job.job_id();
        
        try {
            // Check job status
            const status = await job.status();
            this.updateJobStatus(`Job ${jobId}: ${status.name}`, 'running');
            
            if (status.name === 'DONE') {
                // Job completed
                const result = await job.result();
                this.processJobResult(result);
                this.updateJobStatus(`Job ${jobId}: Completed`, 'success');
            } else if (status.name === 'ERROR') {
                // Job failed
                this.updateJobStatus(`Job ${jobId}: Failed`, 'error');
            } else {
                // Job still running, check again in 2 seconds
                setTimeout(() => this.monitorJob(job), 2000);
            }
        } catch (error) {
            console.error('Job monitoring error:', error);
            this.updateJobStatus(`Job ${jobId}: Monitoring failed`, 'error');
        }
    }

    processJobResult(result) {
        try {
            // Get measurement results
            const counts = result.get_counts();
            
            // Update histogram
            this.updateResultsHistogram(counts);
            
            // Calculate statistics
            this.calculateStatistics(counts);
            
            // Store results
            this.lastResults = counts;
            
        } catch (error) {
            console.error('Error processing job result:', error);
        }
    }

    updateResultsHistogram(counts) {
        this._lastCounts = counts;
        const canvas = document.getElementById('resultsHistogram');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Auto-adjust canvas resolution to display size
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Get results
        const results = Object.entries(counts);
        const maxCount = Math.max(...results.map(([_, count]) => count));
        
        // Draw bars
        const barWidth = width / results.length;
        results.forEach(([state, count], index) => {
            const barHeight = (count / maxCount) * height * 0.8;
            const x = index * barWidth;
            const y = height - barHeight;
            
            // Draw bar
            ctx.fillStyle = `hsl(${index * 360 / results.length}, 70%, 50%)`;
            ctx.fillRect(x, y, barWidth - 2, barHeight);
            
            // Draw label
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(state, x + barWidth / 2, height - 5);
        });
    }

    calculateStatistics(counts) {
        const totalShots = Object.values(counts).reduce((sum, count) => sum + count, 0);
        const states = Object.keys(counts);
        
        // Calculate entropy
        let entropy = 0;
        Object.values(counts).forEach(count => {
            const probability = count / totalShots;
            if (probability > 0) {
                entropy -= probability * Math.log2(probability);
            }
        });
        
        // Update statistics display
        const fidelityElement = document.getElementById('fidelity');
        if (fidelityElement) {
            fidelityElement.textContent = entropy.toFixed(3);
        }
    }

    updateJobStatus(message, status) {
        const statusElement = document.getElementById('jobStatus');
        const detailsElement = document.getElementById('jobDetails');
        
        if (statusElement && detailsElement) {
            const indicator = statusElement.querySelector('.status-indicator i');
            const statusText = statusElement.querySelector('.status-indicator span');
            
            // Update status indicator
            indicator.className = 'fas fa-circle';
            switch (status) {
                case 'success':
                    indicator.style.color = '#00ff88';
                    break;
                case 'error':
                    indicator.style.color = '#ff6b6b';
                    break;
                case 'running':
                    indicator.style.color = '#ffd93d';
                    indicator.classList.add('fa-spin');
                    break;
                default:
                    indicator.style.color = '#00d4ff';
            }
            
            statusText.textContent = status;
            detailsElement.textContent = message;
        }
    }

    // Get device information
    async getDeviceInfo(backendName) {
        try {
            if (!this.provider) return null;
            
            const backend = await this.provider.get_backend(backendName);
            const config = backend.configuration();
            const properties = backend.properties();
            
            return {
                name: backendName,
                n_qubits: config.n_qubits,
                basis_gates: config.basis_gates,
                coupling_map: config.coupling_map,
                quantum_volume: properties.quantum_volume,
                t1: properties.t1,
                t2: properties.t2,
                readout_error: properties.readout_error,
                gate_error: properties.gate_error
            };
        } catch (error) {
            console.error('Failed to get device info:', error);
            return null;
        }
    }

    // Get queue information
    async getQueueInfo(backendName) {
        try {
            if (!this.provider) return null;
            
            const backend = await this.provider.get_backend(backendName);
            const status = await backend.status();
            
            return {
                operational: status.operational,
                pending_jobs: status.pending_jobs,
                queue_position: status.queue_position
            };
        } catch (error) {
            console.error('Failed to get queue info:', error);
            return null;
        }
    }

    // Cancel job
    async cancelJob(jobId) {
        try {
            const job = this.jobs.get(jobId);
            if (job) {
                await job.cancel();
                this.jobs.delete(jobId);
                this.updateJobStatus(`Job ${jobId} cancelled`, 'success');
            }
        } catch (error) {
            console.error('Failed to cancel job:', error);
            this.updateJobStatus(`Failed to cancel job ${jobId}`, 'error');
        }
    }

    // Get job results
    async getJobResults(jobId) {
        try {
            const job = this.jobs.get(jobId);
            if (job) {
                const result = await job.result();
                return result;
            }
        } catch (error) {
            console.error('Failed to get job results:', error);
        }
        return null;
    }

    // Disconnect from IBM Quantum
    disconnect() {
        this.provider = null;
        this.isConnected = false;
        this.jobs.clear();
        this.updateJobStatus('Disconnected', 'error');
    }

    // --- Simple XOR cipher helpers ---
    _xorEncode(str) {
        const key = 133; // simple constant key
        return btoa(Array.from(str).map(ch => String.fromCharCode(ch.charCodeAt(0) ^ key)).join(''));
    }
    _xorDecode(encoded) {
        const key = 133;
        const decoded = atob(encoded);
        return Array.from(decoded).map(ch => String.fromCharCode(ch.charCodeAt(0) ^ key)).join('');
    }
}

    // Export for use in other modules
    window.IBMIntegration = IBMIntegration;
}