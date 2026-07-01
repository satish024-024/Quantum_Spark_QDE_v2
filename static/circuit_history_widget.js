/**
 * Circuit History Widget
 * Displays circuit history and allows circuit selection
 * Integrates with 3D Circuit Builder and circuit state manager
 */

class CircuitHistoryWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.circuits = [];
        this.currentCircuitId = null;
        this.isLoading = false;
        
        this.initialize();
    }
    
    initialize() {
        if (!this.container) {
            console.error('❌ Circuit history container not found');
            return;
        }
        
        console.log('📚 Initializing Circuit History Widget...');
        
        this.createWidget();
        this.setupEventListeners();
        this.loadCircuitHistory();
        
        console.log('✅ Circuit History Widget initialized');
    }
    
    createWidget() {
        this.container.innerHTML = `
            <div class="circuit-history-widget">
                <div class="widget-header">
                    <h3>📚 Circuit History</h3>
                    <div class="widget-controls">
                        <button id="refresh-circuits" class="btn btn-sm btn-outline">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                        <button id="clear-circuits" class="btn btn-sm btn-outline">
                            <i class="fas fa-trash"></i> Clear
                        </button>
                    </div>
                </div>
                
                <div class="circuit-list-container">
                    <div id="circuit-list" class="circuit-list">
                        <div class="loading-circuits">
                            <i class="fas fa-spinner fa-spin"></i> Loading circuits...
                        </div>
                    </div>
                </div>
                
                <div class="circuit-actions">
                    <button id="execute-current-circuit" class="btn btn-primary" disabled>
                        <i class="fas fa-play"></i> Execute Current Circuit
                    </button>
                    <button id="view-3d-circuit" class="btn btn-secondary" disabled>
                        <i class="fas fa-cube"></i> View in 3D
                    </button>
                </div>
                
                <div class="circuit-info">
                    <div id="current-circuit-info" class="current-circuit-info">
                        No circuit selected
                    </div>
                </div>
            </div>
        `;
        
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .circuit-history-widget {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 12px;
                padding: 20px;
                color: white;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .widget-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .widget-header h3 {
                margin: 0;
                color: #00d4ff;
                font-size: 1.2em;
                font-weight: 600;
            }
            
            .widget-controls {
                display: flex;
                gap: 10px;
            }
            
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
                color: white;
            }
            
            .btn-primary:hover:not(:disabled) {
                background: linear-gradient(135deg, #0099cc 0%, #0077aa 100%);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
            }
            
            .btn-secondary {
                background: linear-gradient(135deg, #6c5ce7 0%, #5f3dc4 100%);
                color: white;
            }
            
            .btn-secondary:hover:not(:disabled) {
                background: linear-gradient(135deg, #5f3dc4 0%, #4c63d2 100%);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
            }
            
            .btn-outline {
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: rgba(255, 255, 255, 0.8);
            }
            
            .btn-outline:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.5);
                color: white;
            }
            
            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .circuit-list-container {
                max-height: 400px;
                overflow-y: auto;
                margin-bottom: 20px;
            }
            
            .circuit-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .circuit-item {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
            }
            
            .circuit-item:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(0, 212, 255, 0.5);
                transform: translateX(5px);
            }
            
            .circuit-item.active {
                background: rgba(0, 212, 255, 0.1);
                border-color: #00d4ff;
                box-shadow: 0 0 20px rgba(0, 212, 255, 0.2);
            }
            
            .circuit-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .circuit-name {
                font-weight: 600;
                color: #00d4ff;
                font-size: 1.1em;
            }
            
            .circuit-type {
                background: rgba(0, 212, 255, 0.2);
                color: #00d4ff;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.8em;
                font-weight: 500;
            }
            
            .circuit-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                font-size: 0.9em;
                color: rgba(255, 255, 255, 0.7);
            }
            
            .circuit-detail {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .circuit-detail i {
                color: #00d4ff;
                width: 16px;
            }
            
            .circuit-actions {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .circuit-info {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                padding: 15px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .current-circuit-info {
                color: rgba(255, 255, 255, 0.8);
                font-size: 0.9em;
            }
            
            .loading-circuits {
                text-align: center;
                padding: 40px;
                color: rgba(255, 255, 255, 0.6);
            }
            
            .empty-state {
                text-align: center;
                padding: 40px;
                color: rgba(255, 255, 255, 0.6);
            }
            
            .empty-state i {
                font-size: 3em;
                color: rgba(255, 255, 255, 0.3);
                margin-bottom: 15px;
            }
            
            .ai-generated {
                position: absolute;
                top: 10px;
                right: 10px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.7em;
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Refresh circuits
        document.getElementById('refresh-circuits').addEventListener('click', () => {
            this.loadCircuitHistory();
        });
        
        // Clear circuits
        document.getElementById('clear-circuits').addEventListener('click', () => {
            this.clearCircuits();
        });
        
        // Execute current circuit
        document.getElementById('execute-current-circuit').addEventListener('click', () => {
            this.executeCurrentCircuit();
        });
        
        // View in 3D
        document.getElementById('view-3d-circuit').addEventListener('click', () => {
            this.viewIn3D();
        });
        
        // Listen for circuit updates
        window.addEventListener('circuitLoaded', (event) => {
            this.updateCurrentCircuitInfo(event.detail.circuit);
        });
        
        // Listen for AI circuit generation
        window.addEventListener('aiCircuitGenerated', (event) => {
            this.loadCircuitHistory();
        });
    }
    
    async loadCircuitHistory() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            const response = await fetch('/api/circuit/history?limit=20');
            if (response.ok) {
                const data = await response.json();
                this.circuits = data.circuits || [];
                this.renderCircuitList();
            } else {
                this.showError('Failed to load circuit history');
            }
        } catch (error) {
            console.error('❌ Error loading circuit history:', error);
            this.showError('Error loading circuit history');
        } finally {
            this.isLoading = false;
        }
    }
    
    renderCircuitList() {
        const circuitList = document.getElementById('circuit-list');
        
        if (this.circuits.length === 0) {
            circuitList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cube"></i>
                    <div>No circuits found</div>
                    <div style="font-size: 0.8em; margin-top: 10px;">
                        Generate a circuit using the AI assistant or create one manually
                    </div>
                </div>
            `;
            return;
        }
        
        circuitList.innerHTML = this.circuits.map(circuit => `
            <div class="circuit-item ${circuit.circuit_id === this.currentCircuitId ? 'active' : ''}" 
                 data-circuit-id="${circuit.circuit_id}">
                ${circuit.is_ai_generated ? '<div class="ai-generated">AI</div>' : ''}
                <div class="circuit-item-header">
                    <div class="circuit-name">${circuit.circuit_name}</div>
                    <div class="circuit-type">${circuit.circuit_type.replace('_', ' ')}</div>
                </div>
                <div class="circuit-details">
                    <div class="circuit-detail">
                        <i class="fas fa-microchip"></i>
                        <span>${circuit.circuit_data.num_qubits} qubits</span>
                    </div>
                    <div class="circuit-detail">
                        <i class="fas fa-layer-group"></i>
                        <span>${circuit.circuit_data.depth} gates</span>
                    </div>
                    <div class="circuit-detail">
                        <i class="fas fa-clock"></i>
                        <span>${this.formatDate(circuit.created_at)}</span>
                    </div>
                    <div class="circuit-detail">
                        <i class="fas fa-edit"></i>
                        <span>${this.formatDate(circuit.modified_at)}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click listeners to circuit items
        circuitList.querySelectorAll('.circuit-item').forEach(item => {
            item.addEventListener('click', () => {
                const circuitId = item.dataset.circuitId;
                this.selectCircuit(circuitId);
            });
        });
    }
    
    async selectCircuit(circuitId) {
        try {
            const response = await fetch('/api/circuit/set_current', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    circuit_id: circuitId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.currentCircuitId = circuitId;
                    this.updateCurrentCircuitInfo(data.circuit);
                    this.updateCircuitListSelection();
                    this.updateActionButtons();
                    
                    // Dispatch event for 3D integration
                    window.dispatchEvent(new CustomEvent('circuitSelected', {
                        detail: data.circuit
                    }));
                }
            }
        } catch (error) {
            console.error('❌ Error selecting circuit:', error);
        }
    }
    
    updateCurrentCircuitInfo(circuit) {
        const infoElement = document.getElementById('current-circuit-info');
        
        if (circuit) {
            this.currentCircuitId = circuit.circuit_id;
            infoElement.innerHTML = `
                <div style="font-weight: 600; color: #00d4ff; margin-bottom: 8px;">
                    ${circuit.circuit_name}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
                    <div><i class="fas fa-microchip" style="color: #00d4ff;"></i> ${circuit.circuit_data.num_qubits} qubits</div>
                    <div><i class="fas fa-layer-group" style="color: #00d4ff;"></i> ${circuit.circuit_data.depth} gates</div>
                    <div><i class="fas fa-tag" style="color: #00d4ff;"></i> ${circuit.circuit_type.replace('_', ' ')}</div>
                    <div><i class="fas fa-clock" style="color: #00d4ff;"></i> ${this.formatDate(circuit.modified_at)}</div>
                </div>
            `;
        } else {
            infoElement.innerHTML = 'No circuit selected';
        }
    }
    
    updateCircuitListSelection() {
        document.querySelectorAll('.circuit-item').forEach(item => {
            item.classList.toggle('active', item.dataset.circuitId === this.currentCircuitId);
        });
    }
    
    updateActionButtons() {
        const executeBtn = document.getElementById('execute-current-circuit');
        const view3DBtn = document.getElementById('view-3d-circuit');
        
        const hasCurrentCircuit = !!this.currentCircuitId;
        
        executeBtn.disabled = !hasCurrentCircuit;
        view3DBtn.disabled = !hasCurrentCircuit;
    }
    
    async executeCurrentCircuit() {
        if (!this.currentCircuitId) return;
        
        try {
            const executeBtn = document.getElementById('execute-current-circuit');
            executeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executing...';
            executeBtn.disabled = true;
            
            const response = await fetch('/api/circuit/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    backend: 'auto'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showSuccess('Circuit execution started!');
                    
                    // Refresh jobs widget if available
                    if (window.dashboard && window.dashboard.updateJobsWidget) {
                        window.dashboard.updateJobsWidget();
                    }
                } else {
                    this.showError(data.error || 'Execution failed');
                }
            } else {
                this.showError('Failed to execute circuit');
            }
        } catch (error) {
            console.error('❌ Error executing circuit:', error);
            this.showError('Error executing circuit');
        } finally {
            const executeBtn = document.getElementById('execute-current-circuit');
            executeBtn.innerHTML = '<i class="fas fa-play"></i> Execute Current Circuit';
            executeBtn.disabled = false;
        }
    }
    
    viewIn3D() {
        if (!this.currentCircuitId) return;
        
        // Dispatch event for 3D integration
        window.dispatchEvent(new CustomEvent('viewCircuitIn3D', {
            detail: { circuitId: this.currentCircuitId }
        }));
        
        this.showSuccess('Circuit loaded in 3D visualizer');
    }
    
    async clearCircuits() {
        if (!confirm('Are you sure you want to clear all circuits? This action cannot be undone.')) {
            return;
        }
        
        try {
            // This would need to be implemented in the backend
            this.showError('Clear circuits not implemented yet');
        } catch (error) {
            console.error('❌ Error clearing circuits:', error);
            this.showError('Error clearing circuits');
        }
    }
    
    showLoading() {
        const circuitList = document.getElementById('circuit-list');
        circuitList.innerHTML = `
            <div class="loading-circuits">
                <i class="fas fa-spinner fa-spin"></i> Loading circuits...
            </div>
        `;
    }
    
    showError(message) {
        console.error('❌ Circuit History Widget Error:', message);
        // You could add a toast notification here
    }
    
    showSuccess(message) {
        console.log('✅ Circuit History Widget Success:', message);
        // You could add a toast notification here
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
}

// Make it globally available
window.CircuitHistoryWidget = CircuitHistoryWidget;
