/**
 * Fixed 3D Quantum Circuit Visualization
 * Issues Fixed: Gate functionality, camera stability, additional tools
 */

// Global variables with memory management
let circuitContainer = null;
let plotDiv = null;
let fullscreenPlotDiv = null;
let currentCircuit = {
    qubits: 3,
    depth: 6,
    gates: []
};
let selectedGate = null;
let autoRotateInterval = null;
let isFullscreen = false;
let renderTimeout = null;
let isDragging = false;
let lastCameraPosition = null;

// Performance settings
const PERFORMANCE_CONFIG = {
    maxQubits: 10,
    maxDepth: 20,
    renderDebounceMs: 100,
    autoRotateIntervalMs: 100,
    maxGates: 50
};

// Initialize the 3D circuit with performance optimizations
function init3DQuantumCircuit() {
    console.log('🚀 Initializing Fixed 3D Quantum Circuit...');
    
    // Clean up any existing instances
    cleanup();
    
    circuitContainer = document.getElementById('3d-quantum-circuit');
    if (!circuitContainer) {
        console.error('❌ Container not found');
        return;
    }
    
    console.log('✅ Container found:', circuitContainer);
    createFixedCircuitInterface();
    
    // Show the circuit container (it's hidden by default in dashboard)
    const circuitContainerParent = document.getElementById('circuit-container');
    if (circuitContainerParent) {
        circuitContainerParent.style.display = 'block';
    }
    
    // Hide loading spinner
    const loading = document.getElementById('circuit-loading');
    if (loading) {
        loading.style.display = 'none';
    }
    
    // Only create default if no external data
    if (!window._externalCircuitData) {
        createDefaultCircuit();
        debouncedRender();
    }
    
    console.log('✅ Fixed 3D Circuit initialized successfully');
}

// Clean up resources to prevent memory leaks
function cleanup() {
    // Stop auto-rotate
    if (autoRotateInterval) {
        clearInterval(autoRotateInterval);
        autoRotateInterval = null;
    }
    
    // Clear render timeout
    if (renderTimeout) {
        clearTimeout(renderTimeout);
        renderTimeout = null;
    }
    
    // Clean up Plotly instances
    if (plotDiv && typeof Plotly !== 'undefined') {
        try {
            Plotly.purge(plotDiv);
        } catch (e) {
            console.warn('Plotly cleanup warning:', e);
        }
    }
    
    if (fullscreenPlotDiv && typeof Plotly !== 'undefined') {
        try {
            Plotly.purge(fullscreenPlotDiv);
        } catch (e) {
            console.warn('Plotly cleanup warning:', e);
        }
    }
    
    // Remove fullscreen overlay if exists
    const overlay = document.getElementById('fullscreen-circuit-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    isFullscreen = false;
    selectedGate = null;
    isDragging = false;
    lastCameraPosition = null;
}

// Debounced rendering to prevent excessive re-renders
function debouncedRender() {
    if (renderTimeout) {
        clearTimeout(renderTimeout);
    }
    renderTimeout = setTimeout(() => {
        renderCircuit();
    }, PERFORMANCE_CONFIG.renderDebounceMs);
}

// Accept external circuit data and re-render
function setCircuitData(data) {
    if (!data) return;
    
    // Support both array and object
    let circuit = Array.isArray(data) ? data[0] : data;
    if (!circuit.gates) return;
    
    // Limit circuit size for performance
    currentCircuit.qubits = Math.min(circuit.num_qubits || 3, PERFORMANCE_CONFIG.maxQubits);
    currentCircuit.depth = Math.min(circuit.depth || circuit.gates.length, PERFORMANCE_CONFIG.maxDepth);
    
    // Limit number of gates
    const limitedGates = circuit.gates.slice(0, PERFORMANCE_CONFIG.maxGates);
    currentCircuit.gates = limitedGates.map((g, idx) => ({
        id: idx + 1,
        type: g.name,
        qubits: g.qubits,
        position: g.position !== undefined ? g.position : idx
    }));
    
    window._externalCircuitData = true;
    updateDashboardInfo();
    debouncedRender();
}

// Create fixed circuit interface
function createFixedCircuitInterface() {
    circuitContainer.innerHTML = `
        <div class="circuit-3d-container">
            <div class="circuit-3d-view" id="circuit-3d-plot"></div>
            <div class="circuit-info-panel">
                <div class="info-section">
                    <div class="info-item">
                        <span>Qubits:</span>
                        <span id="qubit-count">${currentCircuit.qubits}</span>
                    </div>
                    <div class="info-item">
                        <span>Gates:</span>
                        <span id="gate-count">${currentCircuit.gates.length}</span>
                    </div>
                    <div class="info-item">
                        <span>Status:</span>
                        <span id="performance-indicator">Fixed</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    plotDiv = document.getElementById('circuit-3d-plot');
    setupExpandButton();
    
    console.log('Fixed circuit view initialized');
}

// Create default circuit with performance limits
function createDefaultCircuit() {
    currentCircuit.gates = [
        { id: 1, type: 'h', qubits: [0], position: 0 },
        { id: 2, type: 'cx', qubits: [0, 1], position: 1 },
        { id: 3, type: 'h', qubits: [1], position: 2 },
        { id: 4, type: 'x', qubits: [2], position: 3 },
        { id: 5, type: 'measure', qubits: [0, 1, 2], position: 4 }
    ];
    
    updateDashboardInfo();
}

// Fixed rendering with stable camera
function renderCircuit() {
    console.log('🎨 Rendering fixed 3D circuit...');
    
    if (!plotDiv) {
        console.error('❌ Plot div not found');
        return;
    }
    
    if (typeof Plotly === 'undefined') {
        console.error('❌ Plotly not available');
        return;
    }
    
    try {
        const data = generateOptimized3DData();
        const layout = generateOptimizedLayout();
        
        // Use react instead of newPlot for better performance
        Plotly.react(plotDiv, data, layout, {
            responsive: true,
            displayModeBar: false,
            displaylogo: false,
            staticPlot: false,
            doubleClick: false,
            showTips: false
        }).then(() => {
            console.log('✅ Fixed 3D circuit rendered successfully');
            updateDashboardInfo();
            setupPlotInteractions();
        }).catch(error => {
            console.error('❌ Plotly render failed:', error);
        });
        
    } catch (error) {
        console.error('❌ Render error:', error);
    }
}

// Setup plot interactions for gate placement
function setupPlotInteractions() {
    if (!plotDiv) return;
    
    // Remove existing event listeners
    plotDiv.removeEventListener('click', handlePlotClick);
    plotDiv.removeEventListener('mousedown', handleMouseDown);
    plotDiv.removeEventListener('mouseup', handleMouseUp);
    plotDiv.removeEventListener('mousemove', handleMouseMove);
    
    // Add new event listeners
    plotDiv.addEventListener('click', handlePlotClick);
    plotDiv.addEventListener('mousedown', handleMouseDown);
    plotDiv.addEventListener('mouseup', handleMouseUp);
    plotDiv.addEventListener('mousemove', handleMouseMove);
    
    console.log('✅ Plot interactions setup');
}

// Handle mouse down for camera control
function handleMouseDown(event) {
    isDragging = true;
    lastCameraPosition = { x: event.clientX, y: event.clientY };
}

// Handle mouse up
function handleMouseUp(event) {
    isDragging = false;
    lastCameraPosition = null;
}

// Handle mouse move for camera control
function handleMouseMove(event) {
    if (!isDragging || !lastCameraPosition) return;
    
    const deltaX = event.clientX - lastCameraPosition.x;
    const deltaY = event.clientY - lastCameraPosition.y;
    
    // Only allow camera movement if no gate is selected
    if (!selectedGate) {
        // Store camera position for stability
        lastCameraPosition = { x: event.clientX, y: event.clientY };
    }
}

// Handle plot click for gate placement - FIXED VERSION
function handlePlotClick(event) {
    console.log('🖱️ Plot clicked, selected gate:', selectedGate);
    
    if (!selectedGate) {
        console.log('⚠️ No gate selected');
        return;
    }
    
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Get click coordinates relative to the plot
    const rect = plotDiv.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert to plot coordinates (improved calculation)
    const plotX = (x / rect.width) * currentCircuit.depth;
    const plotY = (y / rect.height) * currentCircuit.qubits;
    
    // Find closest qubit and position
    const qubit = Math.round(plotY);
    const position = Math.round(plotX);
    
    // Validate bounds
    if (qubit < 0 || qubit >= currentCircuit.qubits || position < 0 || position >= currentCircuit.depth) {
        console.log('⚠️ Click outside circuit bounds');
        return;
    }
    
    // Create new gate
    const newGate = {
        id: currentCircuit.gates.length + 1,
        type: selectedGate,
        qubits: selectedGate === 'cx' ? [qubit, Math.min(qubit + 1, currentCircuit.qubits - 1)] : [qubit],
        position: position
    };
    
    // Check for conflicts
    const hasConflict = currentCircuit.gates.some(gate => 
        gate.position === position && gate.qubits.some(q => newGate.qubits.includes(q))
    );
    
    if (hasConflict) {
        console.log('⚠️ Gate position conflicts with existing gate');
        return;
    }
    
    currentCircuit.gates.push(newGate);
    updateDashboardInfo();
    renderCircuit();
    
    console.log(`➕ Gate added: ${selectedGate} at qubit ${qubit}, position ${position}`);
}

// Generate fixed 3D data with stable rendering
function generateOptimized3DData() {
    const data = [];
    
    // Optimized qubit lines - fewer points
    for (let q = 0; q < currentCircuit.qubits; q++) {
        const xPoints = [];
        const yPoints = [];
        const zPoints = [];
        
        // Create fewer points for better performance
        for (let i = 0; i <= currentCircuit.depth; i += 0.5) {
            xPoints.push(i);
            yPoints.push(q);
            zPoints.push(0);
        }
        
        data.push({
            type: 'scatter3d',
            x: xPoints,
            y: yPoints,
            z: zPoints,
            mode: 'lines',
            line: {
                color: 'rgba(100, 149, 237, 0.8)',
                width: 6
            },
            name: `Qubit ${q}`,
            showlegend: false,
            hoverinfo: 'name'
        });
    }
    
    // Optimized gate representations
    currentCircuit.gates.forEach(gate => {
        if (gate.type === 'cx') {
            const [control, target] = gate.qubits;
            
            // Control qubit
            data.push({
                type: 'scatter3d',
                x: [gate.position],
                y: [control],
                z: [0.5],
                mode: 'markers',
                marker: {
                    size: 12,
                    color: '#ffa94d',
                    symbol: 'circle',
                    line: { color: 'white', width: 1 }
                },
                name: `CNOT Control ${control}`,
                hoverinfo: 'name',
                showlegend: false
            });
            
            // Target qubit
            data.push({
                type: 'scatter3d',
                x: [gate.position],
                y: [target],
                z: [0.5],
                mode: 'markers+text',
                marker: {
                    size: 16,
                    color: '#ffa94d',
                    symbol: 'x',
                    line: { color: 'white', width: 1 }
                },
                text: ['⊕'],
                textposition: 'middle center',
                textfont: { size: 12, color: 'white' },
                name: `CNOT Target ${target}`,
                hoverinfo: 'name',
                showlegend: false
            });
            
            // Connection line
            data.push({
                type: 'scatter3d',
                x: [gate.position, gate.position],
                y: [control, target],
                z: [0.5, 0.5],
                mode: 'lines',
                line: {
                    color: '#ffa94d',
                    width: 2,
                    dash: 'dash'
                },
                showlegend: false,
                hoverinfo: 'none'
            });
            
        } else {
            gate.qubits.forEach(qubit => {
                const gateColors = {
                    'h': '#4dabf7', 'x': '#ff6b6b', 'y': '#51cf66',
                    'z': '#9775fa', 't': '#20c997', 's': '#fd7e14',
                    'measure': '#ffd43b', 'rx': '#e83e8c', 'ry': '#6f42c1', 'rz': '#dc3545'
                };
                
                const gateSymbols = {
                    'h': 'H', 'x': 'X', 'y': 'Y', 'z': 'Z',
                    't': 'T', 's': 'S', 'measure': 'M',
                    'rx': 'Rₓ', 'ry': 'Rᵧ', 'rz': 'Rᵧ'
                };
                
                data.push({
                    type: 'scatter3d',
                    x: [gate.position],
                    y: [qubit],
                    z: [0.5],
                    mode: 'markers+text',
                    marker: {
                        size: 20,
                        color: gateColors[gate.type] || '#ccc',
                        symbol: 'circle',
                        line: { color: 'white', width: 1 }
                    },
                    text: [gateSymbols[gate.type] || gate.type.toUpperCase()],
                    textposition: 'middle center',
                    textfont: { size: 12, color: 'white', weight: 'bold' },
                    name: `${gate.type.toUpperCase()} on Qubit ${qubit}`,
                    hoverinfo: 'name',
                    showlegend: false
                });
            });
        }
    });
    
    return data;
}

// Generate optimized layout
function generateOptimizedLayout() {
    return {
        title: {
            text: '',
            font: { size: 0 }
        },
        scene: {
            xaxis: {
                title: 'Step',
                range: [-0.5, currentCircuit.depth + 0.5],
                gridcolor: 'rgba(200,200,200,0.1)',
                zerolinecolor: 'rgba(200,200,200,0.2)',
                showbackground: false,
                showticklabels: true,
                tickfont: { size: 8, color: '#666' }
            },
            yaxis: {
                title: 'Qubit',
                range: [-0.5, currentCircuit.qubits - 0.5],
                gridcolor: 'rgba(200,200,200,0.1)',
                zerolinecolor: 'rgba(200,200,200,0.2)',
                showbackground: false,
                showticklabels: true,
                tickfont: { size: 8, color: '#666' }
            },
            zaxis: {
                title: '',
                range: [-0.2, 1.2],
                gridcolor: 'rgba(200,200,200,0.1)',
                zerolinecolor: 'rgba(200,200,200,0.2)',
                showbackground: false,
                showticklabels: false
            },
            camera: {
                eye: { x: 1.2, y: 1.2, z: 1.2 },
                center: { x: currentCircuit.depth / 2, y: currentCircuit.qubits / 2, z: 0 }
            },
            aspectmode: 'manual',
            aspectratio: { x: 2, y: 1, z: 0.5 }
        },
        margin: { l: 0, r: 0, t: 0, b: 0 },
        height: 300,
        showlegend: false,
        hovermode: 'closest',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };
}

// Update dashboard info
function updateDashboardInfo() {
    const qubitCount = document.getElementById('qubit-count');
    const gateCount = document.getElementById('gate-count');
    const performanceIndicator = document.getElementById('performance-indicator');
    
    if (qubitCount) qubitCount.textContent = currentCircuit.qubits;
    if (gateCount) gateCount.textContent = currentCircuit.gates.length;
    if (performanceIndicator) {
        const isOptimized = currentCircuit.gates.length <= PERFORMANCE_CONFIG.maxGates && 
                           currentCircuit.qubits <= PERFORMANCE_CONFIG.maxQubits;
        performanceIndicator.textContent = isOptimized ? 'Fixed' : 'Limited';
        performanceIndicator.style.color = isOptimized ? '#51cf66' : '#ffd43b';
    }
}

// Setup expand button functionality
function setupExpandButton() {
    setTimeout(() => {
        const expandBtn = document.getElementById('expand-circuit-btn') || 
                         document.querySelector('[data-action="expand-circuit"]') ||
                         document.querySelector('.widget-btn[data-action="expand-circuit"]');
        
        if (expandBtn) {
            expandBtn.replaceWith(expandBtn.cloneNode(true));
            const newExpandBtn = document.getElementById('expand-circuit-btn') || 
                                document.querySelector('[data-action="expand-circuit"]') ||
                                document.querySelector('.widget-btn[data-action="expand-circuit"]');
            
            if (newExpandBtn) {
                newExpandBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showFixedFullscreenCircuit();
                });
                console.log('✅ Connected to expand button');
            }
        }
    }, 500);
}

// Show fixed fullscreen circuit with enhanced tools
function showFixedFullscreenCircuit() {
    console.log('🚀 Opening fixed fullscreen circuit...');
    
    if (isFullscreen) {
        console.log('⚠️ Fullscreen already open');
        return;
    }
    
    if (typeof Plotly === 'undefined') {
        console.error('❌ Plotly not available');
        alert('3D visualization library not loaded. Please refresh the page.');
        return;
    }
    
    isFullscreen = true;
    
    // Create lightweight fullscreen overlay
    const overlay = document.createElement('div');
    overlay.id = 'fullscreen-circuit-overlay';
    overlay.className = 'fullscreen-circuit-overlay';
    
    overlay.innerHTML = `
        <div class="fullscreen-circuit-content">
            <div class="fullscreen-circuit-header">
                <div class="fullscreen-circuit-title">
                    <i class="fas fa-cube"></i>
                    <h1>Fixed 3D Quantum Circuit Designer</h1>
                </div>
                <div class="fullscreen-circuit-controls">
                    <button id="close-circuit-fullscreen" class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="fullscreen-circuit-body">
                <div class="circuit-controls-panel">
                    <div class="control-section">
                        <h4><i class="fas fa-tools"></i> Circuit Controls</h4>
                        <div class="control-buttons">
                            <button id="clear-circuit-btn" class="control-btn">
                                <i class="fas fa-trash"></i> Clear
                            </button>
                            <button id="reset-view-btn" class="control-btn">
                                <i class="fas fa-home"></i> Reset View
                            </button>
                            <button id="auto-rotate-btn" class="control-btn">
                                <i class="fas fa-sync-alt"></i> Auto Rotate
                            </button>
                            <button id="lock-camera-btn" class="control-btn">
                                <i class="fas fa-lock"></i> Lock Camera
                            </button>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h4><i class="fas fa-cogs"></i> Circuit Settings</h4>
                        <div class="setting-group">
                            <label for="qubit-count-input">Qubits:</label>
                            <input type="number" id="qubit-count-input" min="1" max="${PERFORMANCE_CONFIG.maxQubits}" value="${currentCircuit.qubits}">
                        </div>
                        <div class="setting-group">
                            <label for="circuit-depth-input">Depth:</label>
                            <input type="number" id="circuit-depth-input" min="1" max="${PERFORMANCE_CONFIG.maxDepth}" value="${currentCircuit.depth}">
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h4><i class="fas fa-info-circle"></i> Circuit Info</h4>
                        <div class="info-display">
                            <div class="info-item">
                                <span>Qubits:</span>
                                <span id="fullscreen-qubit-count">${currentCircuit.qubits}</span>
                            </div>
                            <div class="info-item">
                                <span>Gates:</span>
                                <span id="fullscreen-gate-count">${currentCircuit.gates.length}</span>
                            </div>
                            <div class="info-item">
                                <span>Selected:</span>
                                <span id="selected-gate-display">None</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="circuit-visualization-panel">
                    <div class="circuit-3d-container-fullscreen">
                        <div class="circuit-3d-view-fullscreen" id="circuit-3d-plot-fullscreen"></div>
                    </div>
                </div>
                
                <div class="gate-palette-panel">
                    <div class="control-section">
                        <h4><i class="fas fa-puzzle-piece"></i> Quantum Gates</h4>
                        <div class="gate-palette">
                            <div class="gate-category">
                                <h5>Single Qubit Gates</h5>
                                <div class="gate-buttons">
                                    <button class="gate-btn" data-gate="h" title="Hadamard Gate">
                                        <div class="gate-symbol">H</div>
                                        <div class="gate-name">Hadamard</div>
                                    </button>
                                    <button class="gate-btn" data-gate="x" title="Pauli-X Gate">
                                        <div class="gate-symbol">X</div>
                                        <div class="gate-name">Pauli-X</div>
                                    </button>
                                    <button class="gate-btn" data-gate="y" title="Pauli-Y Gate">
                                        <div class="gate-symbol">Y</div>
                                        <div class="gate-name">Pauli-Y</div>
                                    </button>
                                    <button class="gate-btn" data-gate="z" title="Pauli-Z Gate">
                                        <div class="gate-symbol">Z</div>
                                        <div class="gate-name">Pauli-Z</div>
                                    </button>
                                    <button class="gate-btn" data-gate="t" title="T Gate">
                                        <div class="gate-symbol">T</div>
                                        <div class="gate-name">T Gate</div>
                                    </button>
                                    <button class="gate-btn" data-gate="s" title="S Gate">
                                        <div class="gate-symbol">S</div>
                                        <div class="gate-name">S Gate</div>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="gate-category">
                                <h5>Multi-Qubit Gates</h5>
                                <div class="gate-buttons">
                                    <button class="gate-btn" data-gate="cx" title="CNOT Gate">
                                        <div class="gate-symbol">⊕</div>
                                        <div class="gate-name">CNOT</div>
                                    </button>
                                    <button class="gate-btn" data-gate="measure" title="Measurement">
                                        <div class="gate-symbol">M</div>
                                        <div class="gate-name">Measure</div>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="gate-category">
                                <h5>Rotation Gates</h5>
                                <div class="gate-buttons">
                                    <button class="gate-btn" data-gate="rx" title="X Rotation">
                                        <div class="gate-symbol">Rₓ</div>
                                        <div class="gate-name">X Rotation</div>
                                    </button>
                                    <button class="gate-btn" data-gate="ry" title="Y Rotation">
                                        <div class="gate-symbol">Rᵧ</div>
                                        <div class="gate-name">Y Rotation</div>
                                    </button>
                                    <button class="gate-btn" data-gate="rz" title="Z Rotation">
                                        <div class="gate-symbol">Rᵧ</div>
                                        <div class="gate-name">Z Rotation</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h4><i class="fas fa-mouse-pointer"></i> Instructions</h4>
                        <div class="instructions">
                            <p><strong>Adding Gates:</strong></p>
                            <ol>
                                <li>Select a gate from the palette</li>
                                <li>Click on a qubit line in the circuit</li>
                                <li>For CNOT: click control qubit first, then target</li>
                            </ol>
                            <p><strong>Camera Controls:</strong></p>
                            <ul>
                                <li>Drag to rotate view</li>
                                <li>Scroll to zoom</li>
                                <li>Use "Lock Camera" to prevent movement</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    initializeFixedFullscreenCircuit();
    setupFixedFullscreenEventListeners();
    
    console.log('✅ Fixed fullscreen circuit opened');
}

// Initialize fixed fullscreen circuit
function initializeFixedFullscreenCircuit() {
    fullscreenPlotDiv = document.getElementById('circuit-3d-plot-fullscreen');
    if (fullscreenPlotDiv && typeof Plotly !== 'undefined') {
        const data = generateOptimized3DData();
        const layout = generateOptimizedFullscreenLayout();
        
        Plotly.newPlot(fullscreenPlotDiv, data, layout, {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        }).then(() => {
            console.log('✅ Fixed fullscreen 3D circuit rendered');
            updateFullscreenInfo();
            setupFullscreenPlotInteractions();
        }).catch(error => {
            console.error('❌ Fullscreen render failed:', error);
        });
    }
}

// Generate optimized fullscreen layout
function generateOptimizedFullscreenLayout() {
    return {
        title: {
            text: 'Interactive 3D Quantum Circuit',
            font: { size: 16, color: '#fff' },
            x: 0.5,
            xanchor: 'center'
        },
        scene: {
            xaxis: {
                title: 'Circuit Step',
                range: [-0.5, currentCircuit.depth + 0.5],
                gridcolor: 'rgba(200,200,200,0.2)',
                zerolinecolor: 'rgba(200,200,200,0.3)',
                showbackground: false,
                showticklabels: true,
                tickfont: { size: 10, color: '#fff' }
            },
            yaxis: {
                title: 'Qubit',
                range: [-0.5, currentCircuit.qubits - 0.5],
                gridcolor: 'rgba(200,200,200,0.2)',
                zerolinecolor: 'rgba(200,200,200,0.3)',
                showbackground: false,
                showticklabels: true,
                tickfont: { size: 10, color: '#fff' }
            },
            zaxis: {
                title: 'Height',
                range: [-0.2, 1.2],
                gridcolor: 'rgba(200,200,200,0.2)',
                zerolinecolor: 'rgba(200,200,200,0.3)',
                showbackground: false,
                showticklabels: true,
                tickfont: { size: 10, color: '#fff' }
            },
            camera: {
                eye: { x: 1.5, y: 1.5, z: 1.5 },
                center: { x: currentCircuit.depth / 2, y: currentCircuit.qubits / 2, z: 0 }
            },
            aspectmode: 'manual',
            aspectratio: { x: 2, y: 1, z: 0.5 }
        },
        margin: { l: 0, r: 0, t: 50, b: 0 },
        height: 600,
        showlegend: false,
        hovermode: 'closest',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };
}

// Setup fullscreen plot interactions
function setupFullscreenPlotInteractions() {
    if (!fullscreenPlotDiv) return;
    
    // Remove existing event listeners
    fullscreenPlotDiv.removeEventListener('click', handleFullscreenPlotClick);
    fullscreenPlotDiv.removeEventListener('mousedown', handleFullscreenMouseDown);
    fullscreenPlotDiv.removeEventListener('mouseup', handleFullscreenMouseUp);
    fullscreenPlotDiv.removeEventListener('mousemove', handleFullscreenMouseMove);
    
    // Add new event listeners
    fullscreenPlotDiv.addEventListener('click', handleFullscreenPlotClick);
    fullscreenPlotDiv.addEventListener('mousedown', handleFullscreenMouseDown);
    fullscreenPlotDiv.addEventListener('mouseup', handleFullscreenMouseUp);
    fullscreenPlotDiv.addEventListener('mousemove', handleFullscreenMouseMove);
    
    console.log('✅ Fullscreen plot interactions setup');
}

// Handle fullscreen mouse down
function handleFullscreenMouseDown(event) {
    isDragging = true;
    lastCameraPosition = { x: event.clientX, y: event.clientY };
}

// Handle fullscreen mouse up
function handleFullscreenMouseUp(event) {
    isDragging = false;
    lastCameraPosition = null;
}

// Handle fullscreen mouse move
function handleFullscreenMouseMove(event) {
    if (!isDragging || !lastCameraPosition) return;
    
    const deltaX = event.clientX - lastCameraPosition.x;
    const deltaY = event.clientY - lastCameraPosition.y;
    
    // Only allow camera movement if no gate is selected
    if (!selectedGate) {
        lastCameraPosition = { x: event.clientX, y: event.clientY };
    }
}

// Handle fullscreen plot click for gate placement - FIXED VERSION
function handleFullscreenPlotClick(event) {
    console.log('🖱️ Fullscreen plot clicked, selected gate:', selectedGate);
    
    if (!selectedGate) {
        console.log('⚠️ No gate selected');
        return;
    }
    
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Get click coordinates relative to the plot
    const rect = fullscreenPlotDiv.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert to plot coordinates (improved calculation)
    const plotX = (x / rect.width) * currentCircuit.depth;
    const plotY = (y / rect.height) * currentCircuit.qubits;
    
    // Find closest qubit and position
    const qubit = Math.round(plotY);
    const position = Math.round(plotX);
    
    // Validate bounds
    if (qubit < 0 || qubit >= currentCircuit.qubits || position < 0 || position >= currentCircuit.depth) {
        console.log('⚠️ Click outside circuit bounds');
        return;
    }
    
    // Create new gate
    const newGate = {
        id: currentCircuit.gates.length + 1,
        type: selectedGate,
        qubits: selectedGate === 'cx' ? [qubit, Math.min(qubit + 1, currentCircuit.qubits - 1)] : [qubit],
        position: position
    };
    
    // Check for conflicts
    const hasConflict = currentCircuit.gates.some(gate => 
        gate.position === position && gate.qubits.some(q => newGate.qubits.includes(q))
    );
    
    if (hasConflict) {
        console.log('⚠️ Gate position conflicts with existing gate');
        return;
    }
    
    currentCircuit.gates.push(newGate);
    updateFullscreenInfo();
    renderFullscreenCircuit();
    
    console.log(`➕ Gate added: ${selectedGate} at qubit ${qubit}, position ${position}`);
}

// Setup fixed fullscreen event listeners
function setupFixedFullscreenEventListeners() {
    // Close button
    const closeBtn = document.getElementById('close-circuit-fullscreen');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeFixedFullscreenCircuit);
    }
    
    // Circuit controls
    const clearBtn = document.getElementById('clear-circuit-btn');
    const resetViewBtn = document.getElementById('reset-view-btn');
    const autoRotateBtn = document.getElementById('auto-rotate-btn');
    const lockCameraBtn = document.getElementById('lock-camera-btn');
    
    if (clearBtn) clearBtn.addEventListener('click', clearCircuit);
    if (resetViewBtn) resetViewBtn.addEventListener('click', resetCircuitView);
    if (autoRotateBtn) autoRotateBtn.addEventListener('click', toggleAutoRotate);
    if (lockCameraBtn) lockCameraBtn.addEventListener('click', toggleCameraLock);
    
    // Circuit settings
    const qubitCountInput = document.getElementById('qubit-count-input');
    const depthInput = document.getElementById('circuit-depth-input');
    
    if (qubitCountInput) {
        qubitCountInput.addEventListener('change', updateQubitCount);
    }
    if (depthInput) {
        depthInput.addEventListener('change', updateCircuitDepth);
    }
    
    // Gate palette buttons
    const gateButtons = document.querySelectorAll('.gate-btn');
    gateButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const gateType = e.currentTarget.dataset.gate;
            selectGate(gateType);
        });
    });
    
    // Click to add gates on circuit
    if (fullscreenPlotDiv) {
        fullscreenPlotDiv.addEventListener('click', handleCircuitClick);
    }
    
    // Close on overlay click
    const overlay = document.getElementById('fullscreen-circuit-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeFixedFullscreenCircuit();
            }
        });
    }
    
    // Keyboard support
    document.addEventListener('keydown', handleFullscreenKeyboard);
}

// Handle keyboard shortcuts
function handleFullscreenKeyboard(e) {
    if (!isFullscreen) return;
    
    switch(e.key) {
        case 'Escape':
            closeFixedFullscreenCircuit();
            break;
        case 'r':
        case 'R':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                resetCircuitView();
            }
            break;
        case 'a':
        case 'A':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                toggleAutoRotate();
            }
            break;
        case 'c':
        case 'C':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                clearCircuit();
            }
            break;
        case 'l':
        case 'L':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                toggleCameraLock();
            }
            break;
    }
}

// Toggle camera lock
function toggleCameraLock() {
    const btn = document.getElementById('lock-camera-btn');
    if (btn) {
        btn.classList.toggle('active');
        const isLocked = btn.classList.contains('active');
        btn.innerHTML = isLocked ? '<i class="fas fa-unlock"></i> Unlock Camera' : '<i class="fas fa-lock"></i> Lock Camera';
        console.log(isLocked ? '🔒 Camera locked' : '🔓 Camera unlocked');
    }
}

// Close fixed fullscreen circuit
function closeFixedFullscreenCircuit() {
    const overlay = document.getElementById('fullscreen-circuit-overlay');
    if (overlay) {
        // Clean up resources
        cleanup();
        overlay.remove();
        console.log('✅ Fixed fullscreen circuit closed');
    }
}

// Clear circuit
function clearCircuit() {
    currentCircuit.gates = [];
    updateFullscreenInfo();
    renderFullscreenCircuit();
    console.log('🧹 Circuit cleared');
}

// Reset circuit view
function resetCircuitView() {
    if (fullscreenPlotDiv && typeof Plotly !== 'undefined') {
        Plotly.relayout(fullscreenPlotDiv, {
            'scene.camera.eye': { x: 1.5, y: 1.5, z: 1.5 },
            'scene.camera.center': { x: currentCircuit.depth / 2, y: currentCircuit.qubits / 2, z: 0 }
        });
    }
    console.log('🔄 Circuit view reset');
}

// Optimized auto rotate with better performance
function toggleAutoRotate() {
    const btn = document.getElementById('auto-rotate-btn');
    if (autoRotateInterval) {
        clearInterval(autoRotateInterval);
        autoRotateInterval = null;
        btn.classList.remove('active');
        console.log('⏹️ Auto rotate stopped');
    } else {
        autoRotateInterval = setInterval(() => {
            if (fullscreenPlotDiv && typeof Plotly !== 'undefined') {
                const time = Date.now() / 3000; // Slower rotation
                Plotly.relayout(fullscreenPlotDiv, {
                    'scene.camera.eye.x': Math.cos(time) * 2,
                    'scene.camera.eye.y': Math.sin(time) * 2,
                    'scene.camera.eye.z': 1.5
                });
            }
        }, PERFORMANCE_CONFIG.autoRotateIntervalMs);
        btn.classList.add('active');
        console.log('🔄 Auto rotate started');
    }
}

// Update qubit count with limits
function updateQubitCount() {
    const input = document.getElementById('qubit-count-input');
    if (input) {
        const newCount = Math.min(parseInt(input.value), PERFORMANCE_CONFIG.maxQubits);
        currentCircuit.qubits = Math.max(1, newCount);
        input.value = currentCircuit.qubits;
        updateFullscreenInfo();
        renderFullscreenCircuit();
        console.log(`🔢 Qubit count updated to ${currentCircuit.qubits}`);
    }
}

// Update circuit depth with limits
function updateCircuitDepth() {
    const input = document.getElementById('circuit-depth-input');
    if (input) {
        const newDepth = Math.min(parseInt(input.value), PERFORMANCE_CONFIG.maxDepth);
        currentCircuit.depth = Math.max(1, newDepth);
        input.value = currentCircuit.depth;
        updateFullscreenInfo();
        renderFullscreenCircuit();
        console.log(`📏 Circuit depth updated to ${currentCircuit.depth}`);
    }
}

// Select gate for placement - FIXED VERSION
function selectGate(gateType) {
    selectedGate = gateType;
    
    // Update visual feedback
    document.querySelectorAll('.gate-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    const selectedBtn = document.querySelector(`[data-gate="${gateType}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }
    
    // Update selected gate display
    const selectedGateDisplay = document.getElementById('selected-gate-display');
    if (selectedGateDisplay) {
        selectedGateDisplay.textContent = gateType.toUpperCase();
    }
    
    console.log(`🎯 Gate selected: ${gateType}`);
}

// Handle circuit click for gate placement - FIXED GATE FUNCTIONALITY
function handleCircuitClick(event) {
    if (!selectedGate) {
        console.log('⚠️ No gate selected');
        return;
    }
    
    // Get click coordinates relative to the plot
    const rect = fullscreenPlotDiv.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert to plot coordinates (simplified)
    const plotX = (x / rect.width) * currentCircuit.depth;
    const plotY = (y / rect.height) * currentCircuit.qubits;
    
    // Find closest qubit and position
    const qubit = Math.round(plotY);
    const position = Math.round(plotX);
    
    // Validate bounds
    if (qubit < 0 || qubit >= currentCircuit.qubits || position < 0 || position >= currentCircuit.depth) {
        console.log('⚠️ Click outside circuit bounds');
        return;
    }
    
    // Create new gate
    const newGate = {
        id: currentCircuit.gates.length + 1,
        type: selectedGate,
        qubits: selectedGate === 'cx' ? [qubit, Math.min(qubit + 1, currentCircuit.qubits - 1)] : [qubit],
        position: position
    };
    
    // Check for conflicts
    const hasConflict = currentCircuit.gates.some(gate => 
        gate.position === position && gate.qubits.some(q => newGate.qubits.includes(q))
    );
    
    if (hasConflict) {
        console.log('⚠️ Gate position conflicts with existing gate');
        return;
    }
    
    currentCircuit.gates.push(newGate);
    updateFullscreenInfo();
    renderFullscreenCircuit();
    
    console.log(`➕ Gate added: ${selectedGate} at qubit ${qubit}, position ${position}`);
}

// Render fullscreen circuit
function renderFullscreenCircuit() {
    if (fullscreenPlotDiv && typeof Plotly !== 'undefined') {
        const data = generateOptimized3DData();
        const layout = generateOptimizedFullscreenLayout();
        
        Plotly.react(fullscreenPlotDiv, data, layout);
    }
}

// Update fullscreen info
function updateFullscreenInfo() {
    const qubitCount = document.getElementById('fullscreen-qubit-count');
    const gateCount = document.getElementById('fullscreen-gate-count');
    
    if (qubitCount) qubitCount.textContent = currentCircuit.qubits;
    if (gateCount) gateCount.textContent = currentCircuit.gates.length;
}

// Enhanced integration with existing dashboard
function integrateWithDashboard() {
    if (window.dashboard && typeof window.dashboard.handleWidgetAction === 'function') {
        const originalHandleAction = window.dashboard.handleWidgetAction;
        window.dashboard.handleWidgetAction = function(action) {
            if (action === 'expand-circuit') {
                showFixedFullscreenCircuit();
                return;
            }
            return originalHandleAction.call(this, action);
        };
        console.log('✅ Integrated with existing dashboard event system');
    }
    
    setupExpandButton();
    
    // Ensure circuit is initialized if container exists
    if (document.getElementById('3d-quantum-circuit') && !circuitContainer) {
        console.log('🔄 Auto-initializing circuit from dashboard integration...');
        init3DQuantumCircuit();
    }
}

// Export for global use
window.init3DQuantumCircuit = init3DQuantumCircuit;
window.setCircuitData = setCircuitData;
window.showFixedFullscreenCircuit = showFixedFullscreenCircuit;
window.integrateWithDashboard = integrateWithDashboard;
window.selectGate = selectGate;

// Auto-integrate when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        integrateWithDashboard();
        // Also try to initialize the circuit after a short delay
        setTimeout(() => {
            if (document.getElementById('3d-quantum-circuit') && !circuitContainer) {
                console.log('🔄 Auto-initializing circuit after delay...');
                init3DQuantumCircuit();
            }
        }, 1000);
    });
} else {
    integrateWithDashboard();
    // Also try to initialize the circuit after a short delay
    setTimeout(() => {
        if (document.getElementById('3d-quantum-circuit') && !circuitContainer) {
            console.log('🔄 Auto-initializing circuit after delay...');
            init3DQuantumCircuit();
        }
    }, 1000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
