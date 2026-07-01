// ==================== GLOBAL FUNCTIONS FOR HTML BUTTONS ====================
// These are called by onclick handlers in circuit_builder.html

window.increaseQubits = function () {
    console.log('increaseQubits() called');
    if (window.unifiedQuantumApp && window.unifiedQuantumApp.circuitBuilder) {
        const success = window.unifiedQuantumApp.circuitBuilder.addQubit();
        if (!success) {
            console.warn('Could not add qubit (max reached)');
        }
    } else {
        console.error('Circuit builder not initialized');
    }
};

window.decreaseQubits = function () {
    console.log('decreaseQubits() called');
    if (window.unifiedQuantumApp && window.unifiedQuantumApp.circuitBuilder) {
        const success = window.unifiedQuantumApp.circuitBuilder.removeQubit();
        if (!success) {
            console.warn('Could not remove qubit');
        }
    } else {
        console.error('Circuit builder not initialized');
    }
};

console.log('✅ Global qubit functions registered');
