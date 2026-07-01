/**
 * Enhanced Bloch Sphere Integration
 * Connects Bloch sphere with quantum results from dashboard
 */

class EnhancedBlochSphere {
    constructor() {
        this.isInitialized = false;
        this.currentState = null;
        this.quantumResults = null;
        this.animationId = null;
        this.isFullscreen = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.updateFromResults = this.updateFromResults.bind(this);
        this.toggleFullscreen = this.toggleFullscreen.bind(this);
        this.exportState = this.exportState.bind(this);
    }

    /**
     * Initialize the enhanced Bloch sphere
     */
    async init() {
        try {
            console.log('🚀 Initializing Enhanced Bloch Sphere...');
            
            // Wait for THREE.js to be available
            await this.waitForThreeJS();
            
            // Initialize the core Bloch sphere
            if (typeof init_bloch_sphere === 'function') {
                init_bloch_sphere();
                this.isInitialized = true;
                console.log('✅ Enhanced Bloch Sphere initialized');
                
                // Set up event listeners
                this.setupEventListeners();
                
                // Try to load quantum results
                this.loadQuantumResults();
                
            } else {
                console.warn('init_bloch_sphere function not available');
                this.showFallback();
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced Bloch Sphere:', error);
            this.showFallback();
        }
    }

    /**
     * Wait for THREE.js to be available
     */
    async waitForThreeJS() {
        return new Promise((resolve) => {
            const checkThreeJS = () => {
                if (typeof THREE !== 'undefined' && THREE.WebGLRenderer) {
                    resolve();
                } else {
                    setTimeout(checkThreeJS, 100);
                }
            };
            checkThreeJS();
        });
    }

    /**
     * Set up event listeners for integration
     */
    setupEventListeners() {
        // Listen for quantum results updates
        document.addEventListener('quantumResultsUpdated', (event) => {
            this.updateFromResults(event.detail);
        });

        // Listen for circuit execution results
        document.addEventListener('circuitExecuted', (event) => {
            this.updateFromCircuitResults(event.detail);
        });

        // Listen for job results updates
        document.addEventListener('jobResultsUpdated', (event) => {
            this.updateFromJobResults(event.detail);
        });

        // Fullscreen toggle
        const fullscreenBtn = document.querySelector('[data-action="fullscreen"]');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', this.toggleFullscreen);
        }

        // Export functionality
        const exportBtn = document.querySelector('[data-action="export"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', this.exportState);
        }
    }

    /**
     * Load quantum results from the dashboard
     */
    async loadQuantumResults() {
        try {
            const response = await fetch('/job_results');
            if (response.ok) {
                const results = await response.json();
                this.updateFromResults(results);
            }
        } catch (error) {
            console.warn('Could not load quantum results:', error);
        }
    }

    /**
     * Update Bloch sphere from quantum results
     */
    updateFromResults(results) {
        if (!this.isInitialized || !results || results.length === 0) return;

        console.log('🔄 Updating Bloch sphere from quantum results...');
        
        // Get the most recent result
        const latestResult = results[0];
        
        if (latestResult.counts && Object.keys(latestResult.counts).length > 0) {
            // Convert measurement results to quantum state
            const quantumState = this.convertCountsToState(latestResult.counts);
            this.updateBlochSphere(quantumState);
            
            // Update state display
            this.updateStateDisplay(quantumState);
            
            // Show success notification
            this.showNotification('Bloch sphere updated with quantum results!', 'success');
        }
    }

    /**
     * Update from circuit execution results
     */
    updateFromCircuitResults(results) {
        if (!results || !results.success) return;

        console.log('🔄 Updating Bloch sphere from circuit execution...');
        
        if (results.measurement_results) {
            const quantumState = this.convertCountsToState(results.measurement_results);
            this.updateBlochSphere(quantumState);
            this.updateStateDisplay(quantumState);
        }
    }

    /**
     * Update from job results
     */
    updateFromJobResults(jobResults) {
        if (!jobResults || jobResults.length === 0) return;

        const latestJob = jobResults[0];
        if (latestJob.counts && Object.keys(latestJob.counts).length > 0) {
            const quantumState = this.convertCountsToState(latestJob.counts);
            this.updateBlochSphere(quantumState);
            this.updateStateDisplay(quantumState);
        }
    }

    /**
     * Convert measurement counts to quantum state
     */
    convertCountsToState(counts) {
        const totalShots = Object.values(counts).reduce((sum, count) => sum + count, 0);
        
        if (totalShots === 0) return null;

        // Calculate probabilities
        const probabilities = {};
        for (const [state, count] of Object.entries(counts)) {
            probabilities[state] = count / totalShots;
        }

        // For single qubit, convert to Bloch sphere coordinates
        if (Object.keys(probabilities).length === 2) {
            const p0 = probabilities['0'] || 0;
            const p1 = probabilities['1'] || 0;
            
            // Calculate theta and phi for Bloch sphere
            const theta = Math.acos(2 * p0 - 1);
            const phi = 0; // For measurement results, phi is typically 0
            
            return {
                theta: theta,
                phi: phi,
                alpha: Math.sqrt(p0),
                beta: Math.sqrt(p1),
                x: Math.sin(theta) * Math.cos(phi),
                y: Math.sin(theta) * Math.sin(phi),
                z: Math.cos(theta)
            };
        }

        return null;
    }

    /**
     * Update the Bloch sphere visualization
     */
    updateBlochSphere(quantumState) {
        if (!quantumState || !window.GlobalContext) return;

        try {
            // Update the Bloch sphere state
            if (window.GlobalContext.blochSphere) {
                window.GlobalContext.blochSphere.setState(quantumState.theta, quantumState.phi);
            }

            // Update the quantum state in the context
            if (window.GlobalContext.quantumState) {
                window.GlobalContext.quantumState.setAlpha(quantumState.alpha);
                window.GlobalContext.quantumState.setBeta(quantumState.beta);
            }

            console.log('✅ Bloch sphere updated with quantum state');
        } catch (error) {
            console.error('Failed to update Bloch sphere:', error);
        }
    }

    /**
     * Update the state display
     */
    updateStateDisplay(quantumState) {
        const elements = {
            theta: document.getElementById('bloch-sphere-state-theta'),
            phi: document.getElementById('bloch-sphere-state-phi'),
            alpha: document.getElementById('bloch-sphere-state-alpha'),
            beta: document.getElementById('bloch-sphere-state-beta'),
            x: document.getElementById('bloch-sphere-state-x'),
            y: document.getElementById('bloch-sphere-state-y'),
            z: document.getElementById('bloch-sphere-state-z')
        };

        if (quantumState) {
            Object.entries(elements).forEach(([key, element]) => {
                if (element && quantumState[key] !== undefined) {
                    element.textContent = quantumState[key].toFixed(4);
                }
            });
        }
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        const blochContainer = document.getElementById('bloch-sphere');
        if (!blochContainer) return;

        if (!this.isFullscreen) {
            // Enter fullscreen
            if (blochContainer.requestFullscreen) {
                blochContainer.requestFullscreen();
            } else if (blochContainer.webkitRequestFullscreen) {
                blochContainer.webkitRequestFullscreen();
            } else if (blochContainer.msRequestFullscreen) {
                blochContainer.msRequestFullscreen();
            }
            this.isFullscreen = true;
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            this.isFullscreen = false;
        }
    }

    /**
     * Export current state
     */
    exportState() {
        if (!this.currentState) return;

        const exportData = {
            timestamp: new Date().toISOString(),
            quantumState: this.currentState,
            blochSphere: {
                theta: this.currentState.theta,
                phi: this.currentState.phi,
                coordinates: {
                    x: this.currentState.x,
                    y: this.currentState.y,
                    z: this.currentState.z
                }
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bloch-sphere-state-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Bloch sphere state exported!', 'success');
    }

    /**
     * Show fallback interface
     */
    showFallback() {
        const blochContainer = document.getElementById('bloch-sphere');
        if (blochContainer) {
            blochContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #1a1a1a; color: white; text-align: center; padding: 20px;">
                    <div>
                        <h3>Bloch Sphere Simulator</h3>
                        <p>Loading quantum visualization...</p>
                        <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #333; border-top: 4px solid #00ff88; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto;"></div>
                        <p style="font-size: 12px; color: #888;">If this persists, please refresh the page</p>
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#0088ff'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedBlochSphere = new EnhancedBlochSphere();
    window.enhancedBlochSphere.init();
});

// Global functions for integration
window.updateBlochSphereFromResults = (results) => {
    if (window.enhancedBlochSphere) {
        window.enhancedBlochSphere.updateFromResults(results);
    }
};

window.updateBlochSphereFromCircuit = (circuitResults) => {
    if (window.enhancedBlochSphere) {
        window.enhancedBlochSphere.updateFromCircuitResults(circuitResults);
    }
};