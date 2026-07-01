/**
 * Circuit Execution Widget
 * Shows circuit execution status, results, and IBM Quantum job monitoring
 */

class CircuitExecutionWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.executions = [];
        this.currentExecution = null;
        this.isMonitoring = false;
        this.monitoringInterval = null;
        
        this.initialize();
    }
    
    initialize() {
        if (!this.container) {
            console.error('❌ Circuit execution container not found');
            return;
        }
        
        console.log('🚀 Initializing Circuit Execution Widget...');
        
        this.createWidget();
        this.setupEventListeners();
        this.loadExecutions();
        
        console.log('✅ Circuit Execution Widget initialized');
    }
    
    createWidget() {
        this.container.innerHTML = `
            <div class="circuit-execution-widget">
                <div class="widget-header">
                    <h3>🚀 Circuit Executions</h3>
                    <div class="widget-controls">
                        <button id="refresh-executions" class="btn btn-sm btn-outline">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                        <button id="monitor-executions" class="btn btn-sm btn-outline">
                            <i class="fas fa-eye"></i> Monitor
                        </button>
                    </div>
                </div>
                
                <div class="execution-list-container">
                    <div id="execution-list" class="execution-list">
                        <div class="loading-executions">
                            <i class="fas fa-spinner fa-spin"></i> Loading executions...
                        </div>
                    </div>
                </div>
                
                <div class="execution-details">
                    <div id="execution-details" class="execution-details-content">
                        <div class="no-execution-selected">
                            <i class="fas fa-info-circle"></i>
                            <div>Select an execution to view details</div>
                        </div>
                    </div>
                </div>
                
                <div class="execution-actions">
                    <button id="view-results" class="btn btn-primary" disabled>
                        <i class="fas fa-chart-bar"></i> View Results
                    </button>
                    <button id="download-results" class="btn btn-secondary" disabled>
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `;
        
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .circuit-execution-widget {
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
            
            .execution-list-container {
                max-height: 300px;
                overflow-y: auto;
                margin-bottom: 20px;
            }
            
            .execution-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .execution-item {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
            }
            
            .execution-item:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(0, 212, 255, 0.5);
                transform: translateX(5px);
            }
            
            .execution-item.active {
                background: rgba(0, 212, 255, 0.1);
                border-color: #00d4ff;
                box-shadow: 0 0 20px rgba(0, 212, 255, 0.2);
            }
            
            .execution-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .execution-name {
                font-weight: 600;
                color: #00d4ff;
                font-size: 1.1em;
            }
            
            .execution-status {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.8em;
                font-weight: 500;
            }
            
            .status-submitted {
                background: rgba(255, 193, 7, 0.2);
                color: #ffc107;
            }
            
            .status-running {
                background: rgba(0, 123, 255, 0.2);
                color: #007bff;
            }
            
            .status-completed {
                background: rgba(40, 167, 69, 0.2);
                color: #28a745;
            }
            
            .status-failed {
                background: rgba(220, 53, 69, 0.2);
                color: #dc3545;
            }
            
            .execution-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                font-size: 0.9em;
                color: rgba(255, 255, 255, 0.7);
            }
            
            .execution-detail {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .execution-detail i {
                color: #00d4ff;
                width: 16px;
            }
            
            .execution-details-content {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                padding: 15px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                min-height: 200px;
            }
            
            .no-execution-selected {
                text-align: center;
                color: rgba(255, 255, 255, 0.6);
                padding: 40px;
            }
            
            .no-execution-selected i {
                font-size: 3em;
                color: rgba(255, 255, 255, 0.3);
                margin-bottom: 15px;
            }
            
            .execution-actions {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }
            
            .loading-executions {
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
            
            .results-display {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                padding: 15px;
                margin-top: 15px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                overflow-x: auto;
            }
            
            .monitoring-indicator {
                position: absolute;
                top: 10px;
                right: 10px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.7em;
                font-weight: 600;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Refresh executions
        document.getElementById('refresh-executions').addEventListener('click', () => {
            this.loadExecutions();
        });
        
        // Monitor executions
        document.getElementById('monitor-executions').addEventListener('click', () => {
            this.toggleMonitoring();
        });
        
        // View results
        document.getElementById('view-results').addEventListener('click', () => {
            this.viewResults();
        });
        
        // Download results
        document.getElementById('download-results').addEventListener('click', () => {
            this.downloadResults();
        });
        
        // Listen for circuit execution events
        window.addEventListener('circuitExecuted', (event) => {
            this.loadExecutions();
        });
    }
    
    async loadExecutions() {
        try {
            const response = await fetch('/api/circuit/executions?limit=20');
            if (response.ok) {
                const data = await response.json();
                this.executions = data.executions || [];
                this.renderExecutionList();
            } else {
                this.showError('Failed to load executions');
            }
        } catch (error) {
            console.error('❌ Error loading executions:', error);
            this.showError('Error loading executions');
        }
    }
    
    renderExecutionList() {
        const executionList = document.getElementById('execution-list');
        
        if (this.executions.length === 0) {
            executionList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-rocket"></i>
                    <div>No executions found</div>
                    <div style="font-size: 0.8em; margin-top: 10px;">
                        Execute a circuit to see results here
                    </div>
                </div>
            `;
            return;
        }
        
        executionList.innerHTML = this.executions.map(execution => `
            <div class="execution-item ${execution.execution_id === this.currentExecution?.execution_id ? 'active' : ''}" 
                 data-execution-id="${execution.execution_id}">
                ${this.isMonitoring ? '<div class="monitoring-indicator">MONITORING</div>' : ''}
                <div class="execution-item-header">
                    <div class="execution-name">${execution.circuit_name || 'Unknown Circuit'}</div>
                    <div class="execution-status status-${execution.status}">${execution.status}</div>
                </div>
                <div class="execution-details">
                    <div class="execution-detail">
                        <i class="fas fa-server"></i>
                        <span>${execution.backend_name || 'Unknown'}</span>
                    </div>
                    <div class="execution-detail">
                        <i class="fas fa-clock"></i>
                        <span>${this.formatDate(execution.created_at)}</span>
                    </div>
                    <div class="execution-detail">
                        <i class="fas fa-tag"></i>
                        <span>${execution.circuit_type || 'Unknown'}</span>
                    </div>
                    <div class="execution-detail">
                        <i class="fas fa-id-badge"></i>
                        <span>${execution.job_id || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click listeners to execution items
        executionList.querySelectorAll('.execution-item').forEach(item => {
            item.addEventListener('click', () => {
                const executionId = item.dataset.executionId;
                this.selectExecution(executionId);
            });
        });
    }
    
    selectExecution(executionId) {
        this.currentExecution = this.executions.find(exec => exec.execution_id === executionId);
        this.updateExecutionDetails();
        this.updateExecutionListSelection();
        this.updateActionButtons();
    }
    
    updateExecutionDetails() {
        const detailsElement = document.getElementById('execution-details');
        
        if (!this.currentExecution) {
            detailsElement.innerHTML = `
                <div class="no-execution-selected">
                    <i class="fas fa-info-circle"></i>
                    <div>Select an execution to view details</div>
                </div>
            `;
            return;
        }
        
        const execution = this.currentExecution;
        const results = execution.results_data || {};
        
        detailsElement.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h4 style="color: #00d4ff; margin: 0 0 10px 0;">${execution.circuit_name || 'Unknown Circuit'}</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
                    <div><strong>Status:</strong> <span class="execution-status status-${execution.status}">${execution.status}</span></div>
                    <div><strong>Backend:</strong> ${execution.backend_name || 'Unknown'}</div>
                    <div><strong>Job ID:</strong> ${execution.job_id || 'N/A'}</div>
                    <div><strong>Created:</strong> ${this.formatDate(execution.created_at)}</div>
                </div>
            </div>
            
            ${execution.status === 'completed' && results.counts ? `
                <div class="results-display">
                    <h5 style="color: #00d4ff; margin: 0 0 10px 0;">Measurement Results:</h5>
                    <pre>${JSON.stringify(results.counts, null, 2)}</pre>
                </div>
            ` : ''}
            
            ${execution.status === 'failed' ? `
                <div style="color: #dc3545; background: rgba(220, 53, 69, 0.1); padding: 10px; border-radius: 6px; margin-top: 15px;">
                    <i class="fas fa-exclamation-triangle"></i> Execution failed
                </div>
            ` : ''}
            
            ${execution.status === 'running' ? `
                <div style="color: #007bff; background: rgba(0, 123, 255, 0.1); padding: 10px; border-radius: 6px; margin-top: 15px;">
                    <i class="fas fa-spinner fa-spin"></i> Execution in progress...
                </div>
            ` : ''}
        `;
    }
    
    updateExecutionListSelection() {
        document.querySelectorAll('.execution-item').forEach(item => {
            item.classList.toggle('active', item.dataset.executionId === this.currentExecution?.execution_id);
        });
    }
    
    updateActionButtons() {
        const viewBtn = document.getElementById('view-results');
        const downloadBtn = document.getElementById('download-results');
        
        const hasCurrentExecution = !!this.currentExecution;
        const hasResults = hasCurrentExecution && this.currentExecution.status === 'completed';
        
        viewBtn.disabled = !hasResults;
        downloadBtn.disabled = !hasResults;
    }
    
    viewResults() {
        if (!this.currentExecution || this.currentExecution.status !== 'completed') return;
        
        // Dispatch event for results visualization
        window.dispatchEvent(new CustomEvent('viewExecutionResults', {
            detail: { execution: this.currentExecution }
        }));
        
        this.showSuccess('Results displayed');
    }
    
    downloadResults() {
        if (!this.currentExecution || this.currentExecution.status !== 'completed') return;
        
        const results = this.currentExecution.results_data || {};
        const dataStr = JSON.stringify(results, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `circuit_results_${this.currentExecution.execution_id}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showSuccess('Results downloaded');
    }
    
    toggleMonitoring() {
        if (this.isMonitoring) {
            this.stopMonitoring();
        } else {
            this.startMonitoring();
        }
    }
    
    startMonitoring() {
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.loadExecutions();
        }, 5000); // Check every 5 seconds
        
        document.getElementById('monitor-executions').innerHTML = '<i class="fas fa-eye-slash"></i> Stop Monitor';
        this.showSuccess('Started monitoring executions');
    }
    
    stopMonitoring() {
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        document.getElementById('monitor-executions').innerHTML = '<i class="fas fa-eye"></i> Monitor';
        this.showSuccess('Stopped monitoring executions');
    }
    
    showError(message) {
        console.error('❌ Circuit Execution Widget Error:', message);
    }
    
    showSuccess(message) {
        console.log('✅ Circuit Execution Widget Success:', message);
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
}

// Make it globally available
window.CircuitExecutionWidget = CircuitExecutionWidget;
