/**
 * 3D Circuit Integration Manager
 * Connects the 3D Circuit Builder with the circuit state manager
 * Handles real-time updates and circuit synchronization
 */

class Circuit3DIntegration {
    constructor() {
        this.circuitApp = null;
        this.circuitBuilder = null;
        this.currentCircuitId = null;
        this.isUpdating = false;
        this.updateTimeout = null;
        
        // Circuit state management
        this.circuitState = {
            gates: [],
            num_qubits: 3,
            depth: 0,
            circuit_name: '',
            circuit_type: 'custom'
        };
        
        this.initialize();
    }
    
    initialize() {
        console.log('🔗 Initializing 3D Circuit Integration...');
        
        // Wait for the circuit app to be available
        this.waitForCircuitApp();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ 3D Circuit Integration initialized');
    }
    
    waitForCircuitApp() {
        const checkInterval = setInterval(() => {
            if (window.quantumCircuitApp && window.quantumCircuitApp.circuitBuilder) {
                this.circuitApp = window.quantumCircuitApp;
                this.circuitBuilder = window.quantumCircuitApp.circuitBuilder;
                clearInterval(checkInterval);
                this.connectToCircuitBuilder();
            }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!this.circuitApp) {
                console.warn('⚠️ Circuit app not found, integration may not work properly');
            }
        }, 10000);
    }
    
    connectToCircuitBuilder() {
        if (!this.circuitBuilder) {
            console.error('❌ Circuit builder not available');
            return;
        }
        
        console.log('🔗 Connecting to circuit builder...');
        
        // Override circuit builder methods to sync with state manager
        this.overrideCircuitBuilderMethods();
        
        // Load current circuit if available
        this.loadCurrentCircuit();
        
        console.log('✅ Connected to circuit builder');
    }
    
    overrideCircuitBuilderMethods() {
        const originalAddGate = this.circuitBuilder.addGate.bind(this.circuitBuilder);
        const originalRemoveGate = this.circuitBuilder.removeGate.bind(this.circuitBuilder);
        const originalClearCircuit = this.circuitBuilder.clearCircuit.bind(this.circuitBuilder);
        
        // Override addGate to sync with state manager
        this.circuitBuilder.addGate = (gateType, qubitIndex, depth, parameters = {}) => {
            const result = originalAddGate(gateType, qubitIndex, depth, parameters);
            if (result) {
                this.onCircuitModified();
            }
            return result;
        };
        
        // Override removeGate to sync with state manager
        this.circuitBuilder.removeGate = (gateIndex) => {
            const result = originalRemoveGate(gateIndex);
            if (result) {
                this.onCircuitModified();
            }
            return result;
        };
        
        // Override clearCircuit to sync with state manager
        this.circuitBuilder.clearCircuit = () => {
            const result = originalClearCircuit();
            if (result) {
                this.onCircuitModified();
            }
            return result;
        };
    }
    
    setupEventListeners() {
        // Listen for circuit state changes from the backend
        window.addEventListener('circuitStateChanged', (event) => {
            this.handleCircuitStateChange(event.detail);
        });
        
        // Listen for AI circuit generation
        window.addEventListener('aiCircuitGenerated', (event) => {
            this.loadCircuitFromAI(event.detail);
        });
        
        // Listen for circuit selection from history
        window.addEventListener('circuitSelected', (event) => {
            this.loadCircuitFromHistory(event.detail);
        });
    }
    
    onCircuitModified() {
        if (this.isUpdating) return;
        
        // Debounce updates to avoid too many API calls
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        this.updateTimeout = setTimeout(() => {
            this.syncCircuitToStateManager();
        }, 500);
    }
    
    syncCircuitToStateManager() {
        if (!this.circuitBuilder || !this.currentCircuitId) return;
        
        try {
            // Extract circuit data from 3D builder
            const circuitData = this.extractCircuitData();
            
            // Update circuit state
            this.circuitState = circuitData;
            
            // Send update to backend
            this.updateCircuitInBackend(circuitData);
            
            console.log('🔄 Circuit synced to state manager');
        } catch (error) {
            console.error('❌ Error syncing circuit:', error);
        }
    }
    
    extractCircuitData() {
        if (!this.circuitBuilder) return this.circuitState;
        
        const gates = [];
        const gateInstances = this.circuitBuilder.gateInstances || [];
        
        // Convert 3D gate instances to circuit data format
        gateInstances.forEach((gateInstance, index) => {
            if (gateInstance && gateInstance.gateType) {
                const gate = {
                    name: gateInstance.gateType,
                    qubits: [gateInstance.qubitIndex],
                    position: index,
                    parameters: gateInstance.parameters || {}
                };
                
                // Handle multi-qubit gates
                if (gateInstance.controlQubit !== undefined) {
                    gate.qubits = [gateInstance.controlQubit, gateInstance.qubitIndex];
                }
                
                gates.push(gate);
            }
        });
        
        return {
            gates: gates,
            num_qubits: this.circuitBuilder.qubits || 3,
            depth: gates.length,
            circuit_name: this.circuitState.circuit_name || 'Custom Circuit',
            circuit_type: this.circuitState.circuit_type || 'custom'
        };
    }
    
    async updateCircuitInBackend(circuitData) {
        try {
            const response = await fetch('/api/circuit/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    circuit_id: this.currentCircuitId,
                    circuit_data: circuitData
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log('✅ Circuit updated in backend');
                } else {
                    console.error('❌ Backend update failed:', data.error);
                }
            } else {
                console.error('❌ Backend update failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Error updating circuit in backend:', error);
        }
    }
    
    async loadCurrentCircuit() {
        try {
            const response = await fetch('/api/circuit/current');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.circuit) {
                    this.loadCircuit(data.circuit);
                } else {
                    console.log('ℹ️ No current circuit to load');
                }
            }
        } catch (error) {
            console.error('❌ Error loading current circuit:', error);
        }
    }
    
    loadCircuit(circuit) {
        if (!this.circuitBuilder) {
            console.warn('⚠️ Circuit builder not available, storing circuit for later');
            this.pendingCircuit = circuit;
            return;
        }
        
        console.log('🔄 Loading circuit into 3D builder:', circuit.circuit_name);
        
        this.isUpdating = true;
        this.currentCircuitId = circuit.circuit_id;
        this.circuitState = circuit.circuit_data;
        
        try {
            // Clear existing circuit
            this.circuitBuilder.clearCircuit();
            
            // Set number of qubits
            this.circuitBuilder.qubits = circuit.circuit_data.num_qubits;
            this.circuitBuilder.initializeQubits();
            
            // Add gates
            circuit.circuit_data.gates.forEach((gate, index) => {
                this.addGateToBuilder(gate, index);
            });
            
            // Update grid
            this.circuitBuilder.updateGrid();
            
            console.log('✅ Circuit loaded into 3D builder');
        } catch (error) {
            console.error('❌ Error loading circuit:', error);
        } finally {
            this.isUpdating = false;
        }
    }
    
    addGateToBuilder(gate, index) {
        if (!this.circuitBuilder) return;
        
        try {
            const gateType = gate.name;
            const qubitIndex = gate.qubits[0];
            const depth = index;
            const parameters = gate.parameters || {};
            
            // Add gate to builder
            const success = this.circuitBuilder.addGate(gateType, qubitIndex, depth, parameters);
            
            if (success && gate.qubits.length > 1) {
                // Handle multi-qubit gates
                const gateInstance = this.circuitBuilder.gateInstances[this.circuitBuilder.gateInstances.length - 1];
                if (gateInstance) {
                    gateInstance.controlQubit = gate.qubits[0];
                    gateInstance.qubitIndex = gate.qubits[1];
                }
            }
        } catch (error) {
            console.error('❌ Error adding gate to builder:', error);
        }
    }
    
    loadCircuitFromAI(circuitData) {
        console.log('🤖 Loading AI-generated circuit');
        this.loadCircuit(circuitData);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('circuitLoaded', {
            detail: { source: 'ai', circuit: circuitData }
        }));
    }
    
    loadCircuitFromHistory(circuit) {
        console.log('📚 Loading circuit from history');
        this.loadCircuit(circuit);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('circuitLoaded', {
            detail: { source: 'history', circuit: circuit }
        }));
    }
    
    handleCircuitStateChange(detail) {
        console.log('🔄 Circuit state changed:', detail);
        
        if (detail.circuit_id !== this.currentCircuitId) {
            this.loadCircuit(detail.circuit);
        }
    }
    
    // Public methods for external use
    getCurrentCircuit() {
        return {
            circuit_id: this.currentCircuitId,
            ...this.circuitState
        };
    }
    
    async executeCurrentCircuit(backend = 'auto') {
        if (!this.currentCircuitId) {
            throw new Error('No current circuit to execute');
        }
        
        try {
            const response = await fetch('/api/circuit/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    backend: backend
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log('🚀 Circuit execution started');
                    return data;
                } else {
                    throw new Error(data.error || 'Execution failed');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error executing circuit:', error);
            throw error;
        }
    }
    
    async getCircuitHistory() {
        try {
            const response = await fetch('/api/circuit/history?limit=20');
            if (response.ok) {
                const data = await response.json();
                return data.circuits || [];
            }
        } catch (error) {
            console.error('❌ Error getting circuit history:', error);
        }
        return [];
    }
    
    async setCurrentCircuit(circuitId) {
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
                    this.loadCircuit(data.circuit);
                    return true;
                }
            }
        } catch (error) {
            console.error('❌ Error setting current circuit:', error);
        }
        return false;
    }
}

// Initialize the integration when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.circuit3DIntegration = new Circuit3DIntegration();
});

// Make it globally available
window.Circuit3DIntegration = Circuit3DIntegration;
