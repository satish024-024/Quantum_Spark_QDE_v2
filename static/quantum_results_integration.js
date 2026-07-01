/**
 * Quantum Results Integration
 * Connects dashboard results with Bloch sphere and other visualizations
 */

class QuantumResultsIntegration {
    constructor() {
        this.lastResults = null;
        this.updateInterval = null;
        this.isActive = false;
    }

    /**
     * Start monitoring quantum results
     */
    start() {
        if (this.isActive) return;
        
        console.log('🔄 Starting quantum results integration...');
        this.isActive = true;
        
        // Initial load only - no independent polling
        // Updates will be triggered by dashboard auto-refresh timer
        this.loadQuantumResults();
        
        // Listen for manual updates
        this.setupEventListeners();
    }

    /**
     * Stop monitoring
     */
    stop() {
        // No intervals to clear - using centralized refresh control
        this.isActive = false;
        console.log('⏹️ Stopped quantum results integration');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for job execution events
        document.addEventListener('jobExecuted', (event) => {
            this.handleJobExecution(event.detail);
        });

        // Listen for circuit execution events
        document.addEventListener('circuitExecuted', (event) => {
            this.handleCircuitExecution(event.detail);
        });

        // Listen for dashboard refresh
        document.addEventListener('dashboardRefreshed', () => {
            this.loadQuantumResults();
        });
    }

    /**
     * Load quantum results from API
     */
    async loadQuantumResults() {
        try {
            const response = await fetch('/job_results');
            if (response.ok) {
                const results = await response.json();
                this.processResults(results);
            }
        } catch (error) {
            console.warn('Could not load quantum results:', error);
        }
    }

    /**
     * Process quantum results
     */
    processResults(results) {
        if (!results || results.length === 0) return;

        console.log('📊 Processing quantum results...', results.length, 'jobs');

        // Update Bloch sphere
        this.updateBlochSphere(results);

        // Update other visualizations
        this.updateVisualizations(results);

        // Store for comparison
        this.lastResults = results;

        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('quantumResultsUpdated', {
            detail: results
        }));
    }

    /**
     * Update Bloch sphere with results
     */
    updateBlochSphere(results) {
        if (window.updateBlochSphereFromResults) {
            window.updateBlochSphereFromResults(results);
        }
    }

    /**
     * Update other visualizations
     */
    updateVisualizations(results) {
        // Update quantum state displays
        this.updateQuantumStateDisplays(results);

        // Update measurement displays
        this.updateMeasurementDisplays(results);

        // Update fidelity displays
        this.updateFidelityDisplays(results);
    }

    /**
     * Update quantum state displays
     */
    updateQuantumStateDisplays(results) {
        const latestResult = results[0];
        if (!latestResult) return;

        // Update state parameters
        const stateElements = {
            'quantum-state-theta': latestResult.theta || 0,
            'quantum-state-phi': latestResult.phi || 0,
            'quantum-state-alpha': latestResult.alpha || 1,
            'quantum-state-beta': latestResult.beta || 0
        };

        Object.entries(stateElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value.toFixed(4);
            }
        });
    }

    /**
     * Update measurement displays
     */
    updateMeasurementDisplays(results) {
        const latestResult = results[0];
        if (!latestResult || !latestResult.counts) return;

        // Update counts display
        const countsElement = document.getElementById('measurement-counts');
        if (countsElement) {
            countsElement.innerHTML = Object.entries(latestResult.counts)
                .map(([state, count]) => `<div>|${state}⟩: ${count}</div>`)
                .join('');
        }

        // Update probabilities display
        const probabilitiesElement = document.getElementById('measurement-probabilities');
        if (probabilitiesElement && latestResult.probabilities) {
            probabilitiesElement.innerHTML = Object.entries(latestResult.probabilities)
                .map(([state, prob]) => `<div>P(|${state}⟩): ${(prob * 100).toFixed(2)}%</div>`)
                .join('');
        }
    }

    /**
     * Update fidelity displays
     */
    updateFidelityDisplays(results) {
        const latestResult = results[0];
        if (!latestResult) return;

        const fidelityElement = document.getElementById('quantum-fidelity');
        if (fidelityElement && latestResult.fidelity !== undefined) {
            fidelityElement.textContent = (latestResult.fidelity * 100).toFixed(2) + '%';
            
            // Color code based on fidelity
            if (latestResult.fidelity > 0.9) {
                fidelityElement.style.color = '#00ff88';
            } else if (latestResult.fidelity > 0.7) {
                fidelityElement.style.color = '#ffaa00';
            } else {
                fidelityElement.style.color = '#ff4444';
            }
        }
    }

    /**
     * Handle job execution
     */
    handleJobExecution(jobData) {
        console.log('🔄 Job executed:', jobData);
        
        // Update displays immediately
        if (jobData.results) {
            this.updateBlochSphere([jobData]);
            this.updateVisualizations([jobData]);
        }
    }

    /**
     * Handle circuit execution
     */
    handleCircuitExecution(circuitData) {
        console.log('🔄 Circuit executed:', circuitData);
        
        // Update Bloch sphere with circuit results
        if (window.updateBlochSphereFromCircuit) {
            window.updateBlochSphereFromCircuit(circuitData);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.quantumResultsIntegration = new QuantumResultsIntegration();
    
    // Start integration when dashboard is ready
    setTimeout(() => {
        window.quantumResultsIntegration.start();
    }, 2000);
});

// Global functions for manual updates
window.refreshQuantumResults = () => {
    if (window.quantumResultsIntegration) {
        window.quantumResultsIntegration.loadQuantumResults();
    }
};

window.updateQuantumVisualizations = (results) => {
    if (window.quantumResultsIntegration) {
        window.quantumResultsIntegration.processResults(results);
    }
};
