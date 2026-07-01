/**
 * Multi-Provider Job Submission Module (v3)
 * 
 * NEW: Separate module for multi-provider support.
 * Does NOT modify existing IBM runCircuit functionality.
 * 
 * Usage: Call MultiProviderSubmission.init() to add UI elements
 */

const MultiProviderSubmission = {
    // State
    currentProvider: null,
    currentBackend: null,
    backends: {},
    isLoading: false,
    panelCreated: false,

    /**
     * Initialize the multi-provider submission panel
     * ONLY shows when 3D Circuit Builder is visible
     */
    init() {
        console.log('🚀 MultiProviderSubmission v3 initializing...');

        // Only show when circuit builder is active
        this.checkVisibility();

        // Watch for circuit builder visibility changes
        this.setupVisibilityObserver();

        console.log('✅ MultiProviderSubmission ready (hidden until circuit builder opens)');
    },

    /**
     * Check if 3D circuit builder is visible and show/hide panel accordingly
     */
    checkVisibility() {
        // Look for circuit builder container or modal
        const circuitBuilder = document.getElementById('circuit-builder-modal') ||
            document.getElementById('circuit-builder-container') ||
            document.getElementById('circuit-3d-container') ||
            document.querySelector('.circuit-builder-active') ||
            document.querySelector('[data-widget="3d-circuit"]');

        const isCircuitBuilderVisible = circuitBuilder &&
            (circuitBuilder.style.display !== 'none' &&
                circuitBuilder.offsetParent !== null);

        const panel = document.getElementById('multiProviderPanel');

        if (isCircuitBuilderVisible) {
            if (!this.panelCreated) {
                this.loadBackends();
                this.createUI();
                this.panelCreated = true;
            }
            if (panel) panel.style.display = 'block';
        } else {
            if (panel) panel.style.display = 'none';
        }
    },

    /**
     * Setup observer to watch for circuit builder visibility
     */
    setupVisibilityObserver() {
        // Check periodically for circuit builder visibility
        setInterval(() => this.checkVisibility(), 1000);

        // Also listen for custom events that might indicate circuit builder opened
        document.addEventListener('circuitBuilderOpened', () => {
            if (!this.panelCreated) {
                this.loadBackends();
                this.createUI();
                this.panelCreated = true;
            }
            const panel = document.getElementById('multiProviderPanel');
            if (panel) panel.style.display = 'block';
        });

        document.addEventListener('circuitBuilderClosed', () => {
            const panel = document.getElementById('multiProviderPanel');
            if (panel) panel.style.display = 'none';
        });
    },

    /**
     * Load all backends from v3 API
     */
    async loadBackends() {
        try {
            const response = await fetch('/api/v3/backends/metadata');
            const data = await response.json();

            if (data.success) {
                this.backends = data.providers;
                console.log('📡 Loaded backends:', Object.keys(this.backends));
                this.updateProviderDropdown();
            }
        } catch (error) {
            console.error('Failed to load backends:', error);
        }
    },

    /**
     * Create the multi-provider submission UI panel
     */
    createUI() {
        // Check if already exists
        if (document.getElementById('multiProviderPanel')) return;

        const panel = document.createElement('div');
        panel.id = 'multiProviderPanel';
        panel.className = 'multi-provider-panel';
        panel.innerHTML = `
            <style>
                .multi-provider-panel {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: linear-gradient(145deg, rgba(30, 30, 50, 0.95), rgba(20, 20, 40, 0.98));
                    border: 1px solid rgba(100, 100, 255, 0.3);
                    border-radius: 12px;
                    padding: 16px;
                    min-width: 300px;
                    max-width: 400px;
                    z-index: 10000;
                    font-family: 'Inter', sans-serif;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                    color: #e0e0e0;
                }
                .multi-provider-panel h4 {
                    margin: 0 0 12px 0;
                    font-size: 14px;
                    color: #a0a0ff;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .multi-provider-panel .provider-row {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 10px;
                }
                .multi-provider-panel select {
                    flex: 1;
                    padding: 8px 12px;
                    background: rgba(40, 40, 60, 0.9);
                    border: 1px solid rgba(100, 100, 200, 0.4);
                    border-radius: 6px;
                    color: #fff;
                    font-size: 13px;
                    cursor: pointer;
                }
                .multi-provider-panel select:focus {
                    outline: none;
                    border-color: rgba(100, 150, 255, 0.8);
                }
                .multi-provider-panel .cost-display {
                    background: rgba(50, 50, 80, 0.6);
                    border-radius: 8px;
                    padding: 10px;
                    margin-bottom: 10px;
                    font-size: 12px;
                }
                .multi-provider-panel .cost-amount {
                    font-size: 18px;
                    font-weight: 600;
                    color: #4ade80;
                }
                .multi-provider-panel .cost-amount.paid {
                    color: #fbbf24;
                }
                .multi-provider-panel .tier-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    margin-left: 8px;
                }
                .multi-provider-panel .tier-badge.free {
                    background: rgba(74, 222, 128, 0.2);
                    color: #4ade80;
                }
                .multi-provider-panel .tier-badge.paid {
                    background: rgba(251, 191, 36, 0.2);
                    color: #fbbf24;
                }
                .multi-provider-panel .submit-btn {
                    width: 100%;
                    padding: 10px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    border: none;
                    border-radius: 6px;
                    color: #fff;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                .multi-provider-panel .submit-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
                }
                .multi-provider-panel .submit-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .multi-provider-panel .toggle-btn {
                    position: absolute;
                    top: -10px;
                    right: -10px;
                    width: 24px;
                    height: 24px;
                    background: #6366f1;
                    border: none;
                    border-radius: 50%;
                    color: #fff;
                    cursor: pointer;
                    font-size: 12px;
                }
                .multi-provider-panel.collapsed {
                    min-width: auto;
                    padding: 8px 12px;
                }
                .multi-provider-panel.collapsed .panel-content {
                    display: none;
                }
            </style>
            
            <button class="toggle-btn" onclick="MultiProviderSubmission.toggle()">−</button>
            <h4>⚛️ Multi-Provider Submit</h4>
            
            <div class="panel-content">
                <div class="provider-row">
                    <select id="mpProviderSelect" onchange="MultiProviderSubmission.onProviderChange()">
                        <option value="">Select Provider</option>
                    </select>
                </div>
                
                <div class="provider-row">
                    <select id="mpBackendSelect" onchange="MultiProviderSubmission.onBackendChange()">
                        <option value="">Select Backend</option>
                    </select>
                </div>
                
                <div class="provider-row">
                    <label style="font-size: 12px; margin-right: 8px;">Shots:</label>
                    <input type="number" id="mpShotsInput" value="1024" min="1" max="10000" 
                           style="flex: 1; padding: 6px; background: rgba(40,40,60,0.9); 
                                  border: 1px solid rgba(100,100,200,0.4); border-radius: 4px; color: #fff;">
                </div>
                
                <div class="cost-display" id="mpCostDisplay">
                    <div>
                        <span>Estimated Cost:</span>
                        <span class="tier-badge free" id="mpTierBadge">FREE</span>
                    </div>
                    <div class="cost-amount" id="mpCostAmount">$0.00</div>
                    <div id="mpCostBreakdown" style="font-size: 11px; color: #888; margin-top: 4px;"></div>
                </div>
                
                <button class="submit-btn" id="mpSubmitBtn" onclick="MultiProviderSubmission.submitJob()">
                    🚀 Submit to Provider
                </button>
            </div>
        `;

        document.body.appendChild(panel);
    },

    /**
     * Update provider dropdown with loaded data
     */
    updateProviderDropdown() {
        const select = document.getElementById('mpProviderSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Select Provider</option>';

        for (const provider of Object.keys(this.backends)) {
            const option = document.createElement('option');
            option.value = provider;
            option.textContent = provider.toUpperCase();
            select.appendChild(option);
        }
    },

    /**
     * Handle provider change
     */
    onProviderChange() {
        const providerSelect = document.getElementById('mpProviderSelect');
        const backendSelect = document.getElementById('mpBackendSelect');

        this.currentProvider = providerSelect.value;
        backendSelect.innerHTML = '<option value="">Select Backend</option>';

        if (!this.currentProvider) return;

        const backends = this.backends[this.currentProvider] || [];

        for (const backend of backends) {
            const option = document.createElement('option');
            option.value = backend.id;

            const tierIcon = backend.pricing.tier === 'free' ? '✅' :
                backend.pricing.tier === 'free_tier_eligible' ? '⚠️' : '💰';

            option.textContent = `${tierIcon} ${backend.name} (${backend.qubits}Q) - ${backend.pricing.display}`;
            option.dataset.canonical = backend.canonical_id;
            option.dataset.tier = backend.pricing.tier;
            option.dataset.pricing = JSON.stringify(backend.pricing);

            backendSelect.appendChild(option);
        }
    },

    /**
     * Handle backend change - update cost display
     */
    async onBackendChange() {
        const backendSelect = document.getElementById('mpBackendSelect');
        const shotsInput = document.getElementById('mpShotsInput');

        this.currentBackend = backendSelect.value;

        if (!this.currentProvider || !this.currentBackend) {
            this.updateCostDisplay(null);
            return;
        }

        const shots = parseInt(shotsInput.value) || 1024;

        // Fetch cost estimate from API
        try {
            const response = await fetch('/api/v3/cost-estimate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: this.currentProvider,
                    backend: this.currentBackend,
                    shots: shots
                })
            });

            const data = await response.json();
            if (data.success) {
                this.updateCostDisplay(data);
            }
        } catch (error) {
            console.error('Cost estimate failed:', error);
        }
    },

    /**
     * Update cost display panel
     */
    updateCostDisplay(costInfo) {
        const costAmount = document.getElementById('mpCostAmount');
        const tierBadge = document.getElementById('mpTierBadge');
        const breakdown = document.getElementById('mpCostBreakdown');

        if (!costInfo) {
            costAmount.textContent = '$0.00';
            costAmount.className = 'cost-amount';
            tierBadge.textContent = 'FREE';
            tierBadge.className = 'tier-badge free';
            breakdown.textContent = '';
            return;
        }

        const cost = costInfo.estimated_cost || 0;
        costAmount.textContent = `~$${cost.toFixed(2)}`;
        costAmount.className = 'cost-amount' + (cost > 0 ? ' paid' : '');

        if (costInfo.is_free) {
            tierBadge.textContent = 'FREE';
            tierBadge.className = 'tier-badge free';
        } else if (costInfo.is_free_tier) {
            tierBadge.textContent = 'FREE TIER*';
            tierBadge.className = 'tier-badge paid';
        } else {
            tierBadge.textContent = 'PAID';
            tierBadge.className = 'tier-badge paid';
        }

        breakdown.textContent = costInfo.breakdown || '';
    },

    /**
     * Submit job to selected provider
     */
    async submitJob() {
        if (!this.currentProvider || !this.currentBackend) {
            alert('Please select a provider and backend');
            return;
        }

        const shotsInput = document.getElementById('mpShotsInput');
        const shots = parseInt(shotsInput.value) || 1024;
        const submitBtn = document.getElementById('mpSubmitBtn');

        // Get circuit data from existing visualizer
        let circuitData = null;
        if (window.unifiedQuantumApp && window.unifiedQuantumApp.visualization) {
            const gates = window.unifiedQuantumApp.visualization.getCircuit?.() || [];
            const numQubits = window.unifiedQuantumApp.visualization.numQubits || 2;
            circuitData = { gates, qubits: numQubits };
        }

        if (!circuitData || circuitData.gates.length === 0) {
            alert('No circuit to submit. Build a circuit first.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Submitting...';

        try {
            const response = await fetch('/api/v3/submit-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: this.currentProvider,
                    backend: this.currentBackend,
                    shots: shots,
                    circuit_data: circuitData
                })
            });

            const data = await response.json();

            if (data.requires_confirmation) {
                // Show confirmation dialog for paid job
                const confirmed = await this.showCostConfirmation(data);
                if (confirmed) {
                    // Retry with confirmation token
                    await this.submitWithConfirmation(data.confirmation_token, shots, circuitData);
                }
            } else if (data.success) {
                this.showSuccess(data);
            } else {
                alert(`Submission failed: ${data.error}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Submit to Provider';
        }
    },

    /**
     * Show cost confirmation dialog for paid backends
     */
    showCostConfirmation(data) {
        return new Promise((resolve) => {
            const cost = data.estimated_cost || 0;
            const message = `
⚠️ PAID BACKEND

Backend: ${data.backend_name}
Shots: ${data.shots}
Estimated Cost: ~$${cost.toFixed(2)} USD

${data.breakdown || ''}
${data.notes || ''}

Do you want to proceed?
            `.trim();

            if (confirm(message)) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    },

    /**
     * Submit with confirmation token
     */
    async submitWithConfirmation(token, shots, circuitData) {
        const submitBtn = document.getElementById('mpSubmitBtn');
        submitBtn.textContent = '⏳ Confirming...';

        try {
            const response = await fetch('/api/v3/submit-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: this.currentProvider,
                    backend: this.currentBackend,
                    shots: shots,
                    circuit_data: circuitData,
                    confirmation_token: token
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(data);
            } else {
                alert(`Submission failed: ${data.error}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    },

    /**
     * Show success message
     */
    showSuccess(data) {
        const cost = data.estimated_cost || 0;
        alert(`
✅ Job Submitted Successfully!

Job ID: ${data.job_id || 'N/A'}
Provider: ${data.provider}
Backend: ${data.backend}
Status: ${data.lifecycle_state}
${cost > 0 ? `Estimated Cost: ~$${cost.toFixed(2)}` : 'Cost: FREE'}

Check the Jobs widget for status updates.
        `.trim());
    },

    /**
     * Toggle panel visibility
     */
    toggle() {
        const panel = document.getElementById('multiProviderPanel');
        const toggleBtn = panel.querySelector('.toggle-btn');

        panel.classList.toggle('collapsed');
        toggleBtn.textContent = panel.classList.contains('collapsed') ? '+' : '−';
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MultiProviderSubmission.init());
} else {
    // DOM already loaded, wait a bit for other scripts
    setTimeout(() => MultiProviderSubmission.init(), 1000);
}

// Export for external access
window.MultiProviderSubmission = MultiProviderSubmission;
