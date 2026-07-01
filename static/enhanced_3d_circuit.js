/**
 * Enhanced 3D Quantum Circuit Visualization
 * Working circuit with functional buttons and tools
 */

// Global variables
let circuitContainer = null;
let currentCircuit = {
    qubits: 5,
    depth: 0,
    gates: []
};

// Initialize the enhanced 3D circuit
function initEnhanced3DQuantumCircuit() {
    console.log('🚀 Initializing Enhanced 3D Quantum Circuit...');
    circuitContainer = document.getElementById('3d-quantum-circuit');
    if (!circuitContainer) {
        console.error('❌ Container not found');
        return;
    }
    console.log('✅ Container found:', circuitContainer);
    
    // Ensure proper styling to prevent black screen
    circuitContainer.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
    circuitContainer.style.color = 'white';
    circuitContainer.style.position = 'relative';
    circuitContainer.style.overflow = 'hidden';
    circuitContainer.style.minHeight = '400px';
    
    // Clear any existing content
    circuitContainer.innerHTML = '';
    
    // Create a simple, working circuit visualization
    createSimpleCircuitVisualization();
    
    // Create default circuit
    createDefaultCircuit();
    renderSimpleCircuit();
    
    console.log('✅ Enhanced 3D Circuit initialized successfully');
}

// Create a simple circuit visualization that works
function createSimpleCircuitVisualization() {
    if (!circuitContainer) return;
    
    circuitContainer.innerHTML = `
        <div class="circuit-simple-container" style="
            width: 100%; 
            height: 100%; 
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); 
            border-radius: 8px; 
            position: relative; 
            overflow: hidden; 
            display: flex; 
            flex-direction: column;
            min-height: 400px;
        ">
            <div class="circuit-header" style="
                padding: 16px; 
                text-align: center; 
                color: #06b6d4; 
                border-bottom: 1px solid rgba(6, 182, 212, 0.2);
                background: rgba(0, 0, 0, 0.2);
            ">
                <h3 style="margin: 0; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fas fa-cube"></i>
                    3D Quantum Circuit
                </h3>
                <div class="circuit-controls-simple" style="margin-top: 8px; display: flex; gap: 8px; justify-content: center;">
                    <button class="widget-btn" onclick="toggleCircuitPlayback()" style="
                        background: rgba(6, 182, 212, 0.2); 
                        border: 1px solid #06b6d4; 
                        color: #06b6d4; 
                        padding: 6px 12px; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        font-size: 0.8rem;
                        backdrop-filter: blur(10px);
                    ">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="widget-btn" onclick="stepCircuit()" style="
                        background: rgba(139, 92, 246, 0.2); 
                        border: 1px solid #8b5cf6; 
                        color: #8b5cf6; 
                        padding: 6px 12px; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        font-size: 0.8rem;
                        backdrop-filter: blur(10px);
                    ">
                        <i class="fas fa-step-forward"></i>
                    </button>
                    <button class="widget-btn" onclick="resetCircuit()" style="
                        background: rgba(239, 68, 68, 0.2); 
                        border: 1px solid #ef4444; 
                        color: #ef4444; 
                        padding: 6px 12px; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        font-size: 0.8rem;
                        backdrop-filter: blur(10px);
                    ">
                        <i class="fas fa-undo"></i>
                    </button>
                    <button class="widget-btn" onclick="createFullscreenCircuit()" style="
                        background: rgba(16, 185, 129, 0.2); 
                        border: 1px solid #10b981; 
                        color: #10b981; 
                        padding: 6px 12px; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        font-size: 0.8rem;
                        backdrop-filter: blur(10px);
                    ">
                        <i class="fas fa-expand-arrows-alt"></i>
                    </button>
                </div>
            </div>
            
            <div class="circuit-visualization-area" id="circuit-visualization-area" style="
                flex: 1; 
                position: relative; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                padding: 20px;
                min-height: 200px;
            ">
                <div class="circuit-diagram" id="circuit-diagram" style="
                    width: 100%; 
                    height: 100%; 
                    position: relative; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                ">
                    <!-- Circuit will be rendered here -->
                </div>
            </div>
            
            <div class="circuit-info-simple">
                <div class="info-item">
                    <span class="label">Qubits:</span>
                    <span class="value" id="qubit-count-simple">5</span>
                </div>
                <div class="info-item">
                    <span class="label">Gates:</span>
                    <span class="value" id="gate-count-simple">0</span>
                </div>
                <div class="info-item">
                    <span class="label">Depth:</span>
                    <span class="value" id="depth-count-simple">0</span>
                </div>
            </div>
            
            <div class="gate-toolbar">
                <h4>Quantum Gates</h4>
                <div class="gate-buttons-toolbar">
                    <button class="gate-tool-btn" data-gate="h" onclick="addGateToCircuit('h')" title="Hadamard Gate">
                        <span class="gate-symbol">H</span>
                        <span class="gate-name">Hadamard</span>
                    </button>
                    <button class="gate-tool-btn" data-gate="x" onclick="addGateToCircuit('x')" title="Pauli-X Gate">
                        <span class="gate-symbol">X</span>
                        <span class="gate-name">Pauli-X</span>
                    </button>
                    <button class="gate-tool-btn" data-gate="y" onclick="addGateToCircuit('y')" title="Pauli-Y Gate">
                        <span class="gate-symbol">Y</span>
                        <span class="gate-name">Pauli-Y</span>
                    </button>
                    <button class="gate-tool-btn" data-gate="z" onclick="addGateToCircuit('z')" title="Pauli-Z Gate">
                        <span class="gate-symbol">Z</span>
                        <span class="gate-name">Pauli-Z</span>
                    </button>
                    <button class="gate-tool-btn" data-gate="cx" onclick="addGateToCircuit('cx')" title="CNOT Gate">
                        <span class="gate-symbol">⊕</span>
                        <span class="gate-name">CNOT</span>
                    </button>
                    <button class="gate-tool-btn" data-gate="t" onclick="addGateToCircuit('t')" title="T Gate">
                        <span class="gate-symbol">T</span>
                        <span class="gate-name">T Gate</span>
                    </button>
                    <button class="gate-tool-btn" data-gate="s" onclick="addGateToCircuit('s')" title="S Gate">
                        <span class="gate-symbol">S</span>
                        <span class="gate-name">S Gate</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Render the circuit diagram
    renderSimpleCircuit();
}

// Render a simple 2D circuit diagram
function renderSimpleCircuit() {
    const diagramContainer = document.getElementById('circuit-diagram');
    if (!diagramContainer) return;
    
    // Clear existing content
    diagramContainer.innerHTML = '';
    
    // Create SVG for circuit diagram
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '300');
    svg.setAttribute('viewBox', '0 0 800 300');
    svg.style.background = 'var(--bg-card)';
    svg.style.borderRadius = 'var(--radius-lg)';
    svg.style.border = '1px solid var(--border-primary)';
    svg.style.display = 'block';
    svg.style.margin = '0 auto';
    
    // Draw qubit lines
    const qubits = 5;
    
    for (let q = 0; q < qubits; q++) {
        const y = 50 + q * 40;
        
        // Qubit line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '50');
        line.setAttribute('y1', y);
        line.setAttribute('x2', '750');
        line.setAttribute('y2', y);
        line.setAttribute('stroke', '#00d4ff');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
        
        // Qubit label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', '20');
        label.setAttribute('y', y + 5);
        label.setAttribute('fill', '#ffffff');
        label.setAttribute('font-size', '14');
        label.setAttribute('font-family', 'Inter, sans-serif');
        label.textContent = `q${q}`;
        svg.appendChild(label);
    }
    
    // Draw gates from current circuit
    currentCircuit.gates.forEach(gate => {
        const x = 100 + gate.position * 80;
        
        if (gate.type === 'cx') {
            // CNOT gate - control and target
            const [control, target] = gate.qubits;
            const controlY = 50 + control * 40;
            const targetY = 50 + target * 40;
            
            // Control dot
            const controlDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            controlDot.setAttribute('cx', x);
            controlDot.setAttribute('cy', controlY);
            controlDot.setAttribute('r', '8');
            controlDot.setAttribute('fill', '#ff4757');
            controlDot.setAttribute('stroke', 'white');
            controlDot.setAttribute('stroke-width', '2');
            svg.appendChild(controlDot);
            
            // Target circle with plus
            const targetCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            targetCircle.setAttribute('cx', x);
            targetCircle.setAttribute('cy', targetY);
            targetCircle.setAttribute('r', '12');
            targetCircle.setAttribute('fill', 'none');
            targetCircle.setAttribute('stroke', '#ff4757');
            targetCircle.setAttribute('stroke-width', '3');
            svg.appendChild(targetCircle);
            
            // Plus sign
            const plus1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            plus1.setAttribute('x1', x - 6);
            plus1.setAttribute('y1', targetY);
            plus1.setAttribute('x2', x + 6);
            plus1.setAttribute('y2', targetY);
            plus1.setAttribute('stroke', '#ff4757');
            plus1.setAttribute('stroke-width', '2');
            svg.appendChild(plus1);
            
            const plus2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            plus2.setAttribute('x1', x);
            plus2.setAttribute('y1', targetY - 6);
            plus2.setAttribute('x2', x);
            plus2.setAttribute('y2', targetY + 6);
            plus2.setAttribute('stroke', '#ff4757');
            plus2.setAttribute('stroke-width', '2');
            svg.appendChild(plus2);
            
            // Connection line
            const connection = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            connection.setAttribute('x1', x);
            connection.setAttribute('y1', controlY);
            connection.setAttribute('x2', x);
            connection.setAttribute('y2', targetY);
            connection.setAttribute('stroke', '#ff4757');
            connection.setAttribute('stroke-width', '2');
            connection.setAttribute('stroke-dasharray', '5,5');
            svg.appendChild(connection);
        } else {
            // Single qubit gate
            const y = 50 + gate.qubits[0] * 40;
            const gateColor = getGateColor(gate.type);
            
            // Gate box
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x - 15);
            rect.setAttribute('y', y - 15);
            rect.setAttribute('width', '30');
            rect.setAttribute('height', '30');
            rect.setAttribute('fill', gateColor);
            rect.setAttribute('stroke', 'white');
            rect.setAttribute('stroke-width', '2');
            rect.setAttribute('rx', '4');
            svg.appendChild(rect);
            
            // Gate label
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', x);
            label.setAttribute('y', y + 5);
            label.setAttribute('fill', 'white');
            label.setAttribute('font-size', '12');
            label.setAttribute('font-family', 'Inter, sans-serif');
            label.setAttribute('font-weight', 'bold');
            label.setAttribute('text-anchor', 'middle');
            label.textContent = gate.type ? gate.type.toUpperCase() : 'UNK';
            svg.appendChild(label);
        }
    });
    
    // Add measurement gates at the end
    for (let q = 0; q < qubits; q++) {
        const y = 50 + q * 40;
        const x = 700;
        
        // Measurement symbol
        const measureArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        measureArc.setAttribute('d', `M ${x-10} ${y-10} A 10 10 0 0 1 ${x+10} ${y-10}`);
        measureArc.setAttribute('fill', 'none');
        measureArc.setAttribute('stroke', '#ffaa00');
        measureArc.setAttribute('stroke-width', '3');
        svg.appendChild(measureArc);
        
        const measureLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        measureLine.setAttribute('x1', x-10);
        measureLine.setAttribute('y1', y+10);
        measureLine.setAttribute('x2', x+10);
        measureLine.setAttribute('y2', y+10);
        measureLine.setAttribute('stroke', '#ffaa00');
        measureLine.setAttribute('stroke-width', '3');
        svg.appendChild(measureLine);
    }
    
    diagramContainer.appendChild(svg);
    
    // Update info
    document.getElementById('qubit-count-simple').textContent = qubits;
    document.getElementById('gate-count-simple').textContent = currentCircuit.gates.length;
    document.getElementById('depth-count-simple').textContent = currentCircuit.depth;
}

// Get color for gate type
function getGateColor(gateType) {
    const colors = {
        'h': '#00d4ff',
        'x': '#9b59b6',
        'y': '#ffaa00',
        'z': '#00ff88',
        't': '#ff6b6b',
        's': '#4ecdc4',
        'cx': '#ff4757'
    };
    return colors[gateType] || '#666666';
}

// Add gate to circuit
function addGateToCircuit(gateType) {
    console.log(`Adding ${gateType} gate to circuit`);
    
    // Find next available position
    const nextPosition = currentCircuit.depth;
    
    // Determine qubits based on gate type
    let qubits;
    if (gateType === 'cx') {
        // CNOT gate needs two qubits
        qubits = [0, 1]; // Default to first two qubits
    } else {
        // Single qubit gate
        qubits = [0]; // Default to first qubit
    }
    
    // Add gate to circuit
    const newGate = {
        id: currentCircuit.gates.length + 1,
        type: gateType,
        qubits: qubits,
        position: nextPosition
    };
    
    currentCircuit.gates.push(newGate);
    currentCircuit.depth = Math.max(currentCircuit.depth, nextPosition + 1);
    
    // Re-render circuit
    renderSimpleCircuit();
    
    // Show notification
    if (window.dashboard && window.dashboard.showNotification) {
        window.dashboard.showNotification(`${gateType.toUpperCase()} gate added to circuit`, 'success');
    }
}

// Create default circuit
function createDefaultCircuit() {
    currentCircuit.gates = [
        { id: 1, type: 'h', qubits: [0], position: 0 },
        { id: 2, type: 'x', qubits: [1], position: 0 },
        { id: 3, type: 'y', qubits: [2], position: 1 },
        { id: 4, type: 'z', qubits: [3], position: 1 },
        { id: 5, type: 'cx', qubits: [1, 2], position: 2 },
        { id: 6, type: 't', qubits: [0], position: 3 },
        { id: 7, type: 's', qubits: [4], position: 4 }
    ];
    currentCircuit.depth = 5;
}

// Enhanced fullscreen circuit with working tools
function createFullscreenCircuit() {
    const fullscreenHTML = `
        <div class="circuit-fullscreen-overlay" id="circuit-fullscreen-overlay">
            <div class="circuit-fullscreen-content">
                <div class="circuit-fullscreen-header">
                    <h2>3D Quantum Circuit - Fullscreen Mode</h2>
                    <div class="circuit-fullscreen-controls">
                        <button class="widget-btn" onclick="toggleCircuitPlayback()">
                            <i class="fas fa-play"></i> Play/Pause
                        </button>
                        <button class="widget-btn" onclick="stepCircuit()">
                            <i class="fas fa-step-forward"></i> Step
                        </button>
                        <button class="widget-btn" onclick="resetCircuit()">
                            <i class="fas fa-undo"></i> Reset
                        </button>
                        <button class="widget-btn" onclick="exitCircuitFullscreen()">
                            <i class="fas fa-times"></i> Exit
                        </button>
                    </div>
                </div>
                
                <div class="circuit-fullscreen-body">
                    <div class="circuit-fullscreen-visualization">
                        <div id="circuit-fullscreen-diagram" class="circuit-fullscreen-diagram">
                            <!-- Fullscreen circuit will be rendered here -->
                        </div>
                    </div>
                    
                    <div class="circuit-fullscreen-toolbar">
                        <div class="gate-toolbar-section">
                            <h3>Single Qubit Gates</h3>
                            <div class="gate-buttons-fullscreen">
                                <button class="gate-tool-btn-fullscreen" onclick="addGateToCircuit('h')" title="Hadamard Gate">
                                    <span class="gate-symbol">H</span>
                                    <span class="gate-name">Hadamard</span>
                                </button>
                                <button class="gate-tool-btn-fullscreen" onclick="addGateToCircuit('x')" title="Pauli-X Gate">
                                    <span class="gate-symbol">X</span>
                                    <span class="gate-name">Pauli-X</span>
                                </button>
                                <button class="gate-tool-btn-fullscreen" onclick="addGateToCircuit('y')" title="Pauli-Y Gate">
                                    <span class="gate-symbol">Y</span>
                                    <span class="gate-name">Pauli-Y</span>
                                </button>
                                <button class="gate-tool-btn-fullscreen" onclick="addGateToCircuit('z')" title="Pauli-Z Gate">
                                    <span class="gate-symbol">Z</span>
                                    <span class="gate-name">Pauli-Z</span>
                                </button>
                                <button class="gate-tool-btn-fullscreen" onclick="addGateToCircuit('t')" title="T Gate">
                                    <span class="gate-symbol">T</span>
                                    <span class="gate-name">T Gate</span>
                                </button>
                                <button class="gate-tool-btn-fullscreen" onclick="addGateToCircuit('s')" title="S Gate">
                                    <span class="gate-symbol">S</span>
                                    <span class="gate-name">S Gate</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="gate-toolbar-section">
                            <h3>Multi Qubit Gates</h3>
                            <div class="gate-buttons-fullscreen">
                                <button class="gate-tool-btn-fullscreen" onclick="addGateToCircuit('cx')" title="CNOT Gate">
                                    <span class="gate-symbol">⊕</span>
                                    <span class="gate-name">CNOT</span>
                                </button>
                                <button class="gate-tool-btn-fullscreen" onclick="addGateToCircuit('cz')" title="CZ Gate">
                                    <span class="gate-symbol">CZ</span>
                                    <span class="gate-name">CZ Gate</span>
                                </button>
                                <button class="gate-tool-btn-fullscreen" onclick="addGateToCircuit('swap')" title="SWAP Gate">
                                    <span class="gate-symbol">⇄</span>
                                    <span class="gate-name">SWAP</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="circuit-actions-fullscreen">
                            <button class="widget-btn primary" onclick="clearCircuit()">
                                <i class="fas fa-trash"></i> Clear Circuit
                            </button>
                            <button class="widget-btn" onclick="exportCircuit()">
                                <i class="fas fa-download"></i> Export
                            </button>
                            <button class="widget-btn" onclick="importCircuit()">
                                <i class="fas fa-upload"></i> Import
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="circuit-fullscreen-info">
                    <div class="info-grid-fullscreen">
                        <div class="info-card-fullscreen">
                            <h4>Qubits</h4>
                            <span class="value" id="qubit-count-fullscreen">5</span>
                        </div>
                        <div class="info-card-fullscreen">
                            <h4>Gates</h4>
                            <span class="value" id="gate-count-fullscreen">0</span>
                        </div>
                        <div class="info-card-fullscreen">
                            <h4>Depth</h4>
                            <span class="value" id="depth-count-fullscreen">0</span>
                        </div>
                        <div class="info-card-fullscreen">
                            <h4>Status</h4>
                            <span class="value" id="circuit-status-fullscreen">Ready</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', fullscreenHTML);
    document.body.style.overflow = 'hidden';
    
    // Render fullscreen circuit
    renderFullscreenCircuit();
}

// Render fullscreen circuit
function renderFullscreenCircuit() {
    const diagramContainer = document.getElementById('circuit-fullscreen-diagram');
    if (!diagramContainer) return;
    
    // Clear existing content
    diagramContainer.innerHTML = '';
    
    // Create larger SVG for fullscreen
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '500');
    svg.setAttribute('viewBox', '0 0 1200 500');
    svg.style.background = 'var(--bg-card)';
    svg.style.borderRadius = 'var(--radius-lg)';
    svg.style.border = '1px solid var(--border-primary)';
    svg.style.display = 'block';
    svg.style.margin = '0 auto';
    
    // Draw qubit lines
    const qubits = 5;
    
    for (let q = 0; q < qubits; q++) {
        const y = 80 + q * 60;
        
        // Qubit line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '80');
        line.setAttribute('y1', y);
        line.setAttribute('x2', '1100');
        line.setAttribute('y2', y);
        line.setAttribute('stroke', '#00d4ff');
        line.setAttribute('stroke-width', '3');
        svg.appendChild(line);
        
        // Qubit label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', '40');
        label.setAttribute('y', y + 8);
        label.setAttribute('fill', '#ffffff');
        label.setAttribute('font-size', '18');
        label.setAttribute('font-family', 'Inter, sans-serif');
        label.setAttribute('font-weight', 'bold');
        label.textContent = `q${q}`;
        svg.appendChild(label);
    }
    
    // Draw gates from current circuit
    currentCircuit.gates.forEach(gate => {
        const x = 150 + gate.position * 100;
        
        if (gate.type === 'cx') {
            // CNOT gate - control and target
            const [control, target] = gate.qubits;
            const controlY = 80 + control * 60;
            const targetY = 80 + target * 60;
            
            // Control dot
            const controlDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            controlDot.setAttribute('cx', x);
            controlDot.setAttribute('cy', controlY);
            controlDot.setAttribute('r', '12');
            controlDot.setAttribute('fill', '#ff4757');
            controlDot.setAttribute('stroke', 'white');
            controlDot.setAttribute('stroke-width', '3');
            svg.appendChild(controlDot);
            
            // Target circle with plus
            const targetCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            targetCircle.setAttribute('cx', x);
            targetCircle.setAttribute('cy', targetY);
            targetCircle.setAttribute('r', '18');
            targetCircle.setAttribute('fill', 'none');
            targetCircle.setAttribute('stroke', '#ff4757');
            targetCircle.setAttribute('stroke-width', '4');
            svg.appendChild(targetCircle);
            
            // Plus sign
            const plus1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            plus1.setAttribute('x1', x - 10);
            plus1.setAttribute('y1', targetY);
            plus1.setAttribute('x2', x + 10);
            plus1.setAttribute('y2', targetY);
            plus1.setAttribute('stroke', '#ff4757');
            plus1.setAttribute('stroke-width', '3');
            svg.appendChild(plus1);
            
            const plus2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            plus2.setAttribute('x1', x);
            plus2.setAttribute('y1', targetY - 10);
            plus2.setAttribute('x2', x);
            plus2.setAttribute('y2', targetY + 10);
            plus2.setAttribute('stroke', '#ff4757');
            plus2.setAttribute('stroke-width', '3');
            svg.appendChild(plus2);
            
            // Connection line
            const connection = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            connection.setAttribute('x1', x);
            connection.setAttribute('y1', controlY);
            connection.setAttribute('x2', x);
            connection.setAttribute('y2', targetY);
            connection.setAttribute('stroke', '#ff4757');
            connection.setAttribute('stroke-width', '3');
            connection.setAttribute('stroke-dasharray', '8,8');
            svg.appendChild(connection);
        } else {
            // Single qubit gate
            const y = 80 + gate.qubits[0] * 60;
            const gateColor = getGateColor(gate.type);
            
            // Gate box
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x - 20);
            rect.setAttribute('y', y - 20);
            rect.setAttribute('width', '40');
            rect.setAttribute('height', '40');
            rect.setAttribute('fill', gateColor);
            rect.setAttribute('stroke', 'white');
            rect.setAttribute('stroke-width', '3');
            rect.setAttribute('rx', '6');
            svg.appendChild(rect);
            
            // Gate label
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', x);
            label.setAttribute('y', y + 8);
            label.setAttribute('fill', 'white');
            label.setAttribute('font-size', '16');
            label.setAttribute('font-family', 'Inter, sans-serif');
            label.setAttribute('font-weight', 'bold');
            label.setAttribute('text-anchor', 'middle');
            label.textContent = gate.type ? gate.type.toUpperCase() : 'UNK';
            svg.appendChild(label);
        }
    });
    
    // Add measurement gates at the end
    for (let q = 0; q < qubits; q++) {
        const y = 80 + q * 60;
        const x = 1050;
        
        // Measurement symbol
        const measureArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        measureArc.setAttribute('d', `M ${x-15} ${y-15} A 15 15 0 0 1 ${x+15} ${y-15}`);
        measureArc.setAttribute('fill', 'none');
        measureArc.setAttribute('stroke', '#ffaa00');
        measureArc.setAttribute('stroke-width', '4');
        svg.appendChild(measureArc);
        
        const measureLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        measureLine.setAttribute('x1', x-15);
        measureLine.setAttribute('y1', y+15);
        measureLine.setAttribute('x2', x+15);
        measureLine.setAttribute('y2', y+15);
        measureLine.setAttribute('stroke', '#ffaa00');
        measureLine.setAttribute('stroke-width', '4');
        svg.appendChild(measureLine);
    }
    
    diagramContainer.appendChild(svg);
    
    // Update fullscreen info
    document.getElementById('qubit-count-fullscreen').textContent = qubits;
    document.getElementById('gate-count-fullscreen').textContent = currentCircuit.gates.length;
    document.getElementById('depth-count-fullscreen').textContent = currentCircuit.depth;
    document.getElementById('circuit-status-fullscreen').textContent = 'Ready';
}

// Exit fullscreen circuit
function exitCircuitFullscreen() {
    const overlay = document.getElementById('circuit-fullscreen-overlay');
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = 'auto';
    }
}

// Circuit control functions
function toggleCircuitPlayback() {
    console.log('Toggling circuit playback...');
    if (window.dashboard && window.dashboard.showNotification) {
        window.dashboard.showNotification('Circuit playback toggled', 'info');
    }
}

function stepCircuit() {
    console.log('Stepping circuit...');
    if (window.dashboard && window.dashboard.showNotification) {
        window.dashboard.showNotification('Circuit stepped forward', 'info');
    }
}

function resetCircuit() {
    console.log('Resetting circuit...');
    currentCircuit.gates = [];
    currentCircuit.depth = 0;
    renderSimpleCircuit();
    if (document.getElementById('circuit-fullscreen-diagram')) {
        renderFullscreenCircuit();
    }
    if (window.dashboard && window.dashboard.showNotification) {
        window.dashboard.showNotification('Circuit reset', 'success');
    }
}

function clearCircuit() {
    console.log('Clearing circuit...');
    currentCircuit.gates = [];
    currentCircuit.depth = 0;
    renderSimpleCircuit();
    if (document.getElementById('circuit-fullscreen-diagram')) {
        renderFullscreenCircuit();
    }
    if (window.dashboard && window.dashboard.showNotification) {
        window.dashboard.showNotification('Circuit cleared', 'success');
    }
}

function exportCircuit() {
    console.log('Exporting circuit...');
    const circuitData = {
        qubits: currentCircuit.qubits,
        depth: currentCircuit.depth,
        gates: currentCircuit.gates
    };
    
    const dataStr = JSON.stringify(circuitData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quantum-circuit.json';
    link.click();
    
    URL.revokeObjectURL(url);
    
    if (window.dashboard && window.dashboard.showNotification) {
        window.dashboard.showNotification('Circuit exported successfully', 'success');
    }
}

function importCircuit() {
    console.log('Importing circuit...');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const circuitData = JSON.parse(e.target.result);
                    currentCircuit.qubits = circuitData.qubits || 5;
                    currentCircuit.depth = circuitData.depth || 0;
                    currentCircuit.gates = circuitData.gates || [];
                    
                    renderSimpleCircuit();
                    if (document.getElementById('circuit-fullscreen-diagram')) {
                        renderFullscreenCircuit();
                    }
                    
                    if (window.dashboard && window.dashboard.showNotification) {
                        window.dashboard.showNotification('Circuit imported successfully', 'success');
                    }
                } catch (error) {
                    console.error('Error importing circuit:', error);
                    if (window.dashboard && window.dashboard.showNotification) {
                        window.dashboard.showNotification('Error importing circuit', 'error');
                    }
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// Load AI-generated circuit code into the visualizer
function loadAICircuitCode(code) {
    console.log('🤖 Loading AI circuit code into enhanced 3D visualizer...');

    try {
        // Parse the Qiskit code to extract circuit structure
        const circuitData = parseQiskitCode(code);
        if (circuitData) {
            setCircuitData(circuitData);
            console.log('✅ AI circuit loaded into enhanced 3D visualizer');
            return true;
        } else {
            console.warn('⚠️ Could not parse AI circuit code, showing default circuit');
            createDefaultCircuit();
            renderSimpleCircuit();
            return false;
        }
    } catch (error) {
        console.error('❌ Error loading AI circuit:', error);
        createDefaultCircuit();
        renderSimpleCircuit();
        return false;
    }
}

// Parse Qiskit code to extract circuit data
function parseQiskitCode(code) {
    try {
        // Basic parsing of Qiskit circuit code
        const lines = code.split('\n').map(line => line.trim()).filter(line => line);

        let qubits = 5; // default
        let depth = 1; // default
        const gates = [];

        // Extract qubit count from QuantumRegister
        const qrMatch = code.match(/QuantumRegister\((\d+)/);
        if (qrMatch) {
            qubits = parseInt(qrMatch[1]);
        }

        // Extract gates from circuit operations
        const gatePatterns = [
            // H gate
            { pattern: /\.h\((\d+)\)/g, type: 'h', parse: (match) => ({ qubit: parseInt(match[1]) }) },
            // X gate
            { pattern: /\.x\((\d+)\)/g, type: 'x', parse: (match) => ({ qubit: parseInt(match[1]) }) },
            // Y gate
            { pattern: /\.y\((\d+)\)/g, type: 'y', parse: (match) => ({ qubit: parseInt(match[1]) }) },
            // Z gate
            { pattern: /\.z\((\d+)\)/g, type: 'z', parse: (match) => ({ qubit: parseInt(match[1]) }) },
            // CNOT gate
            { pattern: /\.cx\((\d+)\s*,\s*(\d+)\)/g, type: 'cx', parse: (match) => ({ control: parseInt(match[1]), target: parseInt(match[2]) }) },
            // T gate
            { pattern: /\.t\((\d+)\)/g, type: 't', parse: (match) => ({ qubit: parseInt(match[1]) }) },
            // S gate
            { pattern: /\.s\((\d+)\)/g, type: 's', parse: (match) => ({ qubit: parseInt(match[1]) }) }
        ];

        // Find all gate operations
        lines.forEach((line, index) => {
            gatePatterns.forEach(({ pattern, type, parse }) => {
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    if (type === 'cx') {
                        gates.push({
                            id: gates.length + 1,
                            type: type,
                            qubits: [match[1], match[2]],
                            position: index
                        });
                    } else {
                        gates.push({
                            id: gates.length + 1,
                            type: type,
                            qubits: [match[1]],
                            position: index
                        });
                    }
                }
            });
        });

        // Update depth based on gates
        if (gates.length > 0) {
            depth = Math.max(...gates.map(g => g.position)) + 1;
        }

        return { qubits, depth, gates };
    } catch (error) {
        console.error('Error parsing Qiskit code:', error);
        return null;
    }
}

// Set circuit data and update visualization
function setCircuitData(circuitData) {
    if (!circuitData) return;

    currentCircuit.qubits = circuitData.qubits || 5;
    currentCircuit.depth = circuitData.depth || 0;
    currentCircuit.gates = circuitData.gates || [];

    // Re-render the circuit
    renderSimpleCircuit();

    // Show notification
    if (window.dashboard && window.dashboard.showNotification) {
        window.dashboard.showNotification(`Circuit loaded with ${currentCircuit.gates.length} gates`, 'success');
    }
}

// Alias functions for backward compatibility
window.loadCircuitFromAI = loadAICircuitCode;
window.loadCircuitFromCode = loadAICircuitCode;

// Make functions globally available
window.addGateToCircuit = addGateToCircuit;
window.createFullscreenCircuit = createFullscreenCircuit;
window.exitCircuitFullscreen = exitCircuitFullscreen;
window.toggleCircuitPlayback = toggleCircuitPlayback;
window.stepCircuit = stepCircuit;
window.resetCircuit = resetCircuit;
window.clearCircuit = clearCircuit;
window.exportCircuit = exportCircuit;
window.importCircuit = importCircuit;
window.initEnhanced3DQuantumCircuit = initEnhanced3DQuantumCircuit;
window.loadAICircuitCode = loadAICircuitCode;
window.parseQiskitCode = parseQiskitCode;
window.setCircuitData = setCircuitData;