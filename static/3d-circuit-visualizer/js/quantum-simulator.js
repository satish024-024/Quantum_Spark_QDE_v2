/**
 * Quantum Circuit Simulator
 * Handles quantum state calculations and circuit execution
 */

class QuantumSimulator {
    constructor() {
        this.qubits = 3;
        this.stateVector = this.initializeStateVector();
        this.gates = new Map();
        this.measurementResults = [];
        this.circuit = [];
        this.isRealTime = true;
        this.simulationSpeed = 1.0;
        this.initializeGates();
        
        // Real-time simulation callbacks
        this.onStateChange = null;
        this.onMeasurementUpdate = null;
    }

    initializeStateVector() {
        // Initialize |000⟩ state
        const state = new Array(Math.pow(2, this.qubits)).fill(0);
        state[0] = 1; // |000⟩ = [1, 0, 0, 0, 0, 0, 0, 0]
        return state;
    }

    initializeGates() {
        // Single qubit gates
        this.gates.set('X', this.createXGate());
        this.gates.set('Y', this.createYGate());
        this.gates.set('Z', this.createZGate());
        this.gates.set('H', this.createHGate());
        this.gates.set('S', this.createSGate());
        this.gates.set('T', this.createTGate());
        this.gates.set('I', this.createIGate());
        this.gates.set('SDG', this.createSDGGate());
        this.gates.set('TDG', this.createTDGGate());
        this.gates.set('SX', this.createSXGate());
        this.gates.set('SY', this.createSYGate());
        this.gates.set('U1', this.createU1Gate());
        this.gates.set('U2', this.createU2Gate());
        this.gates.set('U3', this.createU3Gate());
        this.gates.set('RX', this.createRXGate());
        this.gates.set('RY', this.createRYGate());
        this.gates.set('RZ', this.createRZGate());

        // Two qubit gates
        this.gates.set('CNOT', this.createCNOTGate());
        this.gates.set('CZ', this.createCZGate());
        this.gates.set('SWAP', this.createSWAPGate());
        this.gates.set('CRX', this.createCRXGate());
        this.gates.set('CRY', this.createCRYGate());
        this.gates.set('CRZ', this.createCRZGate());
        this.gates.set('CU1', this.createCRZGate()); // U1 is RZ
        this.gates.set('CU3', this.createCRXGate()); // placeholder
        this.gates.set('CCX', this.createCCXGate());
        this.gates.set('CSWAP', this.createCSWAPGate());
    }

    // Single qubit gate matrices
    createXGate() {
        return [
            [0, 1],
            [1, 0]
        ];
    }

    createYGate() {
        return [
            [0, -1],
            [1, 0]
        ];
    }

    createZGate() {
        return [
            [1, 0],
            [0, -1]
        ];
    }

    createHGate() {
        const sqrt2 = 1 / Math.sqrt(2);
        return [
            [sqrt2, sqrt2],
            [sqrt2, -sqrt2]
        ];
    }

    createSGate() {
        return [
            [1, 0],
            [0, 1]
        ];
    }

    createTGate() {
        return [
            [1, 0],
            [0, Math.cos(Math.PI/4)]
        ];
    }

    // Additional single-qubit gates (approximated with real numbers)
    createIGate(){return [[1,0],[0,1]];}
    createSDGGate(){return [[1,0],[0, -1]];} // S† ~ -i but use -1 real for demo
    createTDGGate(){return [[1,0],[0, Math.cos(-Math.PI/4)]];}
    createSXGate(){return this.createRXGate(Math.PI/2);}
    createSYGate(){return this.createRYGate(Math.PI/2);}
    createU1Gate(lambda= Math.PI/4){return this.createRZGate(lambda);} // U1 = RZ
    createU2Gate(){return this.createU3Gate();}
    createU3Gate(theta=Math.PI/2){return this.createRXGate(theta);} // placeholder

    // Controlled Y,Z rotations
    createCRYGate(angle=Math.PI/2){
        const cos=Math.cos(angle/2), sin=Math.sin(angle/2);
        return [[1,0,0,0],[0,1,0,0],[0,0,cos,-sin],[0,0,sin,cos]];
    }
    createCRZGate(angle=Math.PI/2){
        return [[1,0,0,0],[0,1,0,0],[0,0,Math.exp(-angle/2),0],[0,0,0,Math.exp(angle/2)]];}

    // Toffoli and Fredkin placeholders (identity matrix of size 8)
    createCCXGate(){return Array.from({length:8},(_,i)=>Array.from({length:8},(__,j)=> i===j?1:0));}
    createCSWAPGate(){return this.createCCXGate();}

    createRXGate(angle = Math.PI / 2) {
        const cos = Math.cos(angle / 2);
        const sin = Math.sin(angle / 2);
        return [
            [cos, -sin],
            [-sin, cos]
        ];
    }

    createRYGate(angle = Math.PI / 2) {
        const cos = Math.cos(angle / 2);
        const sin = Math.sin(angle / 2);
        return [
            [cos, -sin],
            [sin, cos]
        ];
    }

    createRZGate(angle = Math.PI / 2) {
        return [
            [Math.exp(-1 * angle / 2), 0],
            [0, Math.exp(1 * angle / 2)]
        ];
    }

    // Two qubit gate matrices
    createCNOTGate() {
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1],
            [0, 0, 1, 0]
        ];
    }

    createCZGate() {
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, -1]
        ];
    }

    createSWAPGate() {
        return [
            [1, 0, 0, 0],
            [0, 0, 1, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1]
        ];
    }

    createCRXGate(angle = Math.PI / 2) {
        const cos = Math.cos(angle / 2);
        const sin = Math.sin(angle / 2);
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, cos, -sin],
            [0, 0, -sin, cos]
        ];
    }

    // Apply gate to quantum state
    applyGate(gateName, qubitIndex, parameters = {}) {
        const gate = this.gates.get(gateName);
        if (!gate) {
            throw new Error(`Unknown gate: ${gateName}`);
        }

        if (gateName.includes('R') && parameters.angle) {
            // For rotation gates, create matrix with specific angle
            const angle = parameters.angle;
            if (gateName === 'RX') {
                this.applyGateMatrix(this.createRXGate(angle), qubitIndex);
            } else if (gateName === 'RY') {
                this.applyGateMatrix(this.createRYGate(angle), qubitIndex);
            } else if (gateName === 'RZ') {
                this.applyGateMatrix(this.createRZGate(angle), qubitIndex);
            } else if (gateName === 'CRX') {
                this.applyTwoQubitGate(this.createCRXGate(angle), qubitIndex, parameters.controlQubit);
            }
        } else if (['CNOT','CZ','SWAP','CRX','CRY','CRZ','CU1','CU3'].includes(gateName)) {
            this.applyTwoQubitGate(gate, qubitIndex, parameters.controlQubit);
        } else if (gateName === 'CCX') {
            this.applyCCX(parameters.controlQubit1, parameters.controlQubit2, qubitIndex);
        } else if (gateName === 'CSWAP') {
            this.applyCSWAP(parameters.controlQubit, parameters.targetQubit1, parameters.targetQubit2);
        } else if (['CCX','CSWAP'].includes(gateName)) {
            // Not fully simulated – skip for now
            return;
        } else {
            this.applyGateMatrix(gate, qubitIndex);
        }
    }

    applyGateMatrix(gateMatrix, qubitIndex) {
        const newState = new Array(this.stateVector.length).fill(0);
        
        for (let i = 0; i < this.stateVector.length; i++) {
            if (Math.abs(this.stateVector[i]) > 1e-10) {
                const binary = i.toString(2).padStart(this.qubits, '0');
                const targetBit = binary[this.qubits - 1 - qubitIndex];
                
                for (let j = 0; j < gateMatrix.length; j++) {
                    const newBinary = binary.split('');
                    newBinary[this.qubits - 1 - qubitIndex] = j.toString();
                    const newIndex = parseInt(newBinary.join(''), 2);
                    
                    newState[newIndex] += this.stateVector[i] * gateMatrix[j][parseInt(targetBit)];
                }
            }
        }
        
        this.stateVector = newState;
    }

    applyTwoQubitGate(gateMatrix, targetQubit, controlQubit) {
        const newState = new Array(this.stateVector.length).fill(0);
        
        for (let i = 0; i < this.stateVector.length; i++) {
            if (Math.abs(this.stateVector[i]) > 1e-10) {
                const binary = i.toString(2).padStart(this.qubits, '0');
                const controlBit = binary[this.qubits - 1 - controlQubit];
                const targetBit = binary[this.qubits - 1 - targetQubit];
                
                if (controlBit === '1') {
                    // Apply gate when control qubit is |1⟩
                    for (let j = 0; j < gateMatrix.length; j++) {
                        const newBinary = binary.split('');
                        newBinary[this.qubits - 1 - targetQubit] = (j % 2).toString();
                        const newIndex = parseInt(newBinary.join(''), 2);
                        
                        newState[newIndex] += this.stateVector[i] * gateMatrix[j][parseInt(targetBit)];
                    }
                } else {
                    // Control qubit is |0⟩, state unchanged
                    newState[i] += this.stateVector[i];
                }
            }
        }
        
        this.stateVector = newState;
    }

    // ------ three-qubit helpers ------
    applyCCX(ctrl1, ctrl2, target) {
        const newState = [...this.stateVector];
        for (let i=0;i<this.stateVector.length;i++){
            if (Math.abs(this.stateVector[i])<1e-12) continue;
            const bit1=(i>>ctrl1)&1;
            const bit2=(i>>ctrl2)&1;
            if(bit1===1 && bit2===1){
                const tgtBit=(i>>target)&1;
                const j = tgtBit===0 ? i | (1<<target) : i & ~(1<<target);
                newState[j] += this.stateVector[i];
                newState[i]   -= this.stateVector[i];
            }
        }
        this.stateVector = newState;
    }

    applyCSWAP(ctrl, t1, t2){
        const newState=[...this.stateVector];
        for(let i=0;i<this.stateVector.length;i++){
            const c=(i>>ctrl)&1;
            if(c===1){
                const b1=(i>>t1)&1;
                const b2=(i>>t2)&1;
                if(b1!==b2){
                    const j = i ^ (1<<t1) ^ (1<<t2);
                    newState[j]=this.stateVector[i];
                    newState[i]=this.stateVector[j];
                }
            }
        }
        this.stateVector=newState;
    }

    // Measure quantum state
    measure() {
        const probabilities = this.stateVector.map(amplitude => 
            Math.pow(Math.abs(amplitude), 2)
        );
        
        const random = Math.random();
        let cumulative = 0;
        let result = 0;
        
        for (let i = 0; i < probabilities.length; i++) {
            cumulative += probabilities[i];
            if (random <= cumulative) {
                result = i;
                break;
            }
        }
        
        // Collapse state vector
        this.stateVector = new Array(this.stateVector.length).fill(0);
        this.stateVector[result] = 1;

        const bitstring = result.toString(2).padStart(this.qubits, '0');
        this.measurementResults.push(bitstring);

        return {
            result: bitstring,
            probabilities: probabilities
        };
    }

    /**
     * Measure just one qubit and collapse state.
     * @param {number} qubitIndex index starting 0 (LSB)
     * @returns {0|1}
     */
    measureSingle(qubitIndex = 0) {
        const probabilities = [0, 0];
        // Sum probabilities where bit is 0 / 1
        this.stateVector.forEach((amp, idx) => {
            const bit = (idx >> qubitIndex) & 1;
            const p = Math.pow(Math.abs(amp), 2);
            probabilities[bit] += p;
        });

        // Random collapse
        const rnd = Math.random();
        const resultBit = rnd <= probabilities[0] ? 0 : 1;

        // Build new collapsed state
        const newState = new Array(this.stateVector.length).fill(0);
        this.stateVector.forEach((amp, idx) => {
            const bit = (idx >> qubitIndex) & 1;
            if (bit === resultBit) newState[idx] = amp / Math.sqrt(probabilities[resultBit]);
        });
        this.stateVector = newState;

        const bitstring = resultBit.toString();
        this.measurementResults.push(bitstring);
        return resultBit;
    }

    // Get Bloch sphere coordinates for a qubit
    getBlochCoordinates(qubitIndex) {
        if (this.qubits === 1) {
            // Single qubit case
            const alpha = this.stateVector[0];
            const beta = this.stateVector[1];
            
            const x = 2 * (alpha.real * beta.real + alpha.imag * beta.imag);
            const y = 2 * (alpha.imag * beta.real - alpha.real * beta.imag);
            const z = Math.pow(Math.abs(alpha), 2) - Math.pow(Math.abs(beta), 2);
            
            return { x, y, z };
        } else {
            // Multi-qubit case - trace out other qubits
            const tracedState = this.traceOutQubits(qubitIndex);
            const alpha = tracedState[0];
            const beta  = tracedState[1];

            const alphaReal = alpha.real !== undefined ? alpha.real : alpha;
            const alphaImag = alpha.imag !== undefined ? alpha.imag : 0;
            const betaReal  = beta.real  !== undefined ? beta.real  : beta;
            const betaImag  = beta.imag  !== undefined ? beta.imag  : 0;

            const x = 2 * (alphaReal * betaReal + alphaImag * betaImag);
            const y = 2 * (alphaImag * betaReal - alphaReal * betaImag);
            const z = Math.pow(Math.abs(alpha), 2) - Math.pow(Math.abs(beta), 2);
            return { x, y, z };
        }
    }

    traceOutQubits(keepQubit) {
        // Simplified tracing - in practice, this would be more complex
        const tracedState = [0, 0];
        
        for (let i = 0; i < this.stateVector.length; i++) {
            const binary = i.toString(2).padStart(this.qubits, '0');
            const keepBit = binary[this.qubits - 1 - keepQubit];
            const index = parseInt(keepBit);
            
            tracedState[index] += this.stateVector[i];
        }
        
        return tracedState;
    }

    // Calculate entanglement measure
    calculateEntanglement() {
        // Simplified entanglement calculation
        const probabilities = this.stateVector.map(amp => Math.pow(Math.abs(amp), 2));
        const entropy = -probabilities.reduce((sum, p) => {
            return sum + (p > 1e-10 ? p * Math.log2(p) : 0);
        }, 0);
        
        return Math.min(entropy, this.qubits);
    }

    // Calculate fidelity with target state
    calculateFidelity(targetState) {
        let fidelity = 0;
        for (let i = 0; i < this.stateVector.length; i++) {
            fidelity += this.stateVector[i] * Math.conj(targetState[i]);
        }
        return Math.pow(Math.abs(fidelity), 2);
    }

    // Reset to initial state
    reset() {
        this.stateVector = this.initializeStateVector();
        this.measurementResults = [];
    }

    // Add qubit
    addQubit() {
        this.qubits++;
        const newState = new Array(Math.pow(2, this.qubits)).fill(0);
        
        // Copy existing state to new state
        for (let i = 0; i < this.stateVector.length; i++) {
            newState[i] = this.stateVector[i];
        }
        
        this.stateVector = newState;
    }

    // Remove qubit
    removeQubit() {
        if (this.qubits > 1) {
            this.qubits--;
            const newState = new Array(Math.pow(2, this.qubits)).fill(0);
            
            // Trace out the last qubit
            for (let i = 0; i < newState.length; i++) {
                newState[i] = this.stateVector[i] + this.stateVector[i + newState.length];
            }
            
            this.stateVector = newState;
        }
    }

    // Get state vector as string
    getStateVectorString() {
        let result = '';
        for (let i = 0; i < this.stateVector.length; i++) {
            const amplitude = this.stateVector[i];
            const binary = i.toString(2).padStart(this.qubits, '0');
            const real = amplitude.real || amplitude;
            const imag = amplitude.imag || 0;
            
            if (Math.abs(real) > 1e-6 || Math.abs(imag) > 1e-6) {
                let term = '';
                if (Math.abs(real) > 1e-6) {
                    term += real.toFixed(3);
                }
                if (Math.abs(imag) > 1e-6) {
                    if (term && imag > 0) term += '+';
                    term += imag.toFixed(3) + 'i';
                }
                result += `(${term})|${binary}⟩ + `;
            }
        }
        
        return result.slice(0, -3) || '0';
    }

    // Real-time circuit execution methods inspired by Q.js
    runCircuit() {
        // Reset state vector
        this.stateVector = this.initializeStateVector();
        
        // Apply gates in sequence with real-time updates
        for (let i = 0; i < this.circuit.length; i++) {
            const gate = this.circuit[i];
            this.applyGate(gate);
            
            // Real-time state update
            if (this.isRealTime && this.onStateChange) {
                this.onStateChange({
                    step: i + 1,
                    totalSteps: this.circuit.length,
                    stateVector: [...this.stateVector],
                    currentGate: gate
                });
            }
        }
        
        // Perform measurements
        this.performMeasurements();
        
        // Final state update
        if (this.onStateChange) {
            this.onStateChange({
                step: this.circuit.length,
                totalSteps: this.circuit.length,
                stateVector: [...this.stateVector],
                isComplete: true
            });
        }
        
        return {
            stateVector: this.stateVector,
            measurementResults: this.measurementResults
        };
    }

    // Step-by-step circuit execution with animation
    async runCircuitStepByStep() {
        this.stateVector = this.initializeStateVector();
        
        for (let i = 0; i < this.circuit.length; i++) {
            const gate = this.circuit[i];
            this.applyGate(gate);
            
            // Emit state change event
            if (this.onStateChange) {
                this.onStateChange({
                    step: i + 1,
                    totalSteps: this.circuit.length,
                    stateVector: [...this.stateVector],
                    currentGate: gate,
                    isComplete: i === this.circuit.length - 1
                });
            }
            
            // Wait for animation/simulation speed
            await new Promise(resolve => setTimeout(resolve, 1000 / this.simulationSpeed));
        }
        
        this.performMeasurements();
        return {
            stateVector: this.stateVector,
            measurementResults: this.measurementResults
        };
    }

    // Add gate to circuit with real-time update
    addGate(gate) {
        this.circuit.push(gate);
        
        // Real-time execution if enabled
        if (this.isRealTime) {
            this.applyGate(gate);
            
            if (this.onStateChange) {
                this.onStateChange({
                    step: this.circuit.length,
                    totalSteps: this.circuit.length,
                    stateVector: [...this.stateVector],
                    currentGate: gate,
                    isRealTime: true
                });
            }
        }
    }

    // Remove gate from circuit
    removeGate(index) {
        if (index >= 0 && index < this.circuit.length) {
            this.circuit.splice(index, 1);
            
            // Re-run circuit if real-time is enabled
            if (this.isRealTime) {
                this.runCircuit();
            }
        }
    }

    // Apply a single gate to the state vector
    applyGate(gate) {
        if (gate.type === 'single') {
            this.applySingleQubitGate(gate.name, gate.qubit, gate.parameters);
        } else if (gate.type === 'two') {
            this.applyTwoQubitGate(gate.name, gate.control, gate.target, gate.parameters);
        }
    }

    // Apply single qubit gate
    applySingleQubitGate(gateName, qubit, parameters = {}) {
        const gateMatrix = this.gates.get(gateName);
        if (!gateMatrix) return;

        // Create full matrix for the circuit
        const fullMatrix = this.createFullMatrix(gateMatrix, qubit);
        
        // Apply matrix to state vector
        this.stateVector = this.multiplyMatrixVector(fullMatrix, this.stateVector);
    }

    // Apply two qubit gate
    applyTwoQubitGate(gateName, control, target, parameters = {}) {
        const gateMatrix = this.gates.get(gateName);
        if (!gateMatrix) return;

        // Create full matrix for the circuit
        const fullMatrix = this.createFullTwoQubitMatrix(gateMatrix, control, target);
        
        // Apply matrix to state vector
        this.stateVector = this.multiplyMatrixVector(fullMatrix, this.stateVector);
    }
}

// Export for use in other modules
window.QuantumSimulator = QuantumSimulator;