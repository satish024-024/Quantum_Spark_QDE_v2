// UI functions for Bloch sphere visualization
// Enhanced version with professional 3D sphere visualization

// Prevent duplicate loading
if (window.BLOCH_UI_LOADED) {
    console.log('⚠️ bloch_ui.js already loaded, skipping duplicate');
} else {
    window.BLOCH_UI_LOADED = true;

    // Global variables for Bloch sphere state
    let QMSTATEVECTOR = [];
    let BLOCHSPHERE = [];
    let PHOSPHOR = [];
    let PHOSPHOR_ENABLED = true;

    // Real quantum data integration
    let realQuantumData = null;
    let isConnectedToRealQuantum = false;
    let connectionStatus = 'simulation';

    // Store original functions to prevent memory leaks
    let originalFunctions = {};

    // Fetch quantum data from the backend (real or simulated)
    async function fetchQuantumData() {
        try {
            console.log('🔍 Fetching quantum data...');
            const response = await fetch('/api/quantum_state_data');

            if (response.ok) {
                const data = await response.json();
                if (data.quantum_state) {
                    realQuantumData = data;
                    connectionStatus = data.connection_status;
                    isConnectedToRealQuantum = data.real_data;
                    console.log(`✅ Connected to ${data.connection_status}:`, data.quantum_state);
                    return true;
                }
            } else {
                console.warn('⚠️ API endpoint not available, using simulation mode');
            }
        } catch (error) {
            console.warn('⚠️ API call failed, using simulation mode:', error.message);
        }
        return false;
    }

    // Update the UI to show connection status
    function updateConnectionStatus(status, backendName = '') {
        const statusElement = document.getElementById('quantum-data-status');
        if (statusElement) {
            if (status === 'connected') {
                statusElement.innerHTML = `
                <div class="real-data-indicator">
                    <span class="status-badge real">🔴 REAL QUANTUM DATA</span>
                    <span class="backend-name">${backendName}</span>
                </div>
            `;
                statusElement.className = 'real-data-status active';
            } else if (status === 'simulation') {
                statusElement.innerHTML = `
                <div class="simulation-indicator">
                    <span class="status-badge simulation">🟡 SIMULATION MODE</span>
                    <span class="info">No IBM Quantum connection</span>
                </div>
            `;
                statusElement.className = 'real-data-status inactive';
            } else {
                statusElement.innerHTML = `
                <div class="error-indicator">
                    <span class="status-badge error">🔴 CONNECTION ERROR</span>
                    <span class="info">Check IBM Quantum connection</span>
                </div>
            `;
                statusElement.className = 'real-data-status error';
            }
        }
    }

    // Apply quantum gate with real data integration
    async function applyQuantumGate(gateType, angle = 0, qubit = 0) {
        if (!isConnectedToRealQuantum) {
            console.log('⚠️ Not connected to real quantum, using simulation');
            return false;
        }

        try {
            console.log(`🔧 Applying ${gateType} gate to real quantum system...`);

            const response = await fetch('/api/apply_quantum_gate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gate_type: gateType,
                    angle: angle,
                    qubit: qubit
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.new_state) {
                    console.log('✅ Gate applied successfully:', result.new_state);

                    // Update the global state
                    QMSTATEVECTOR.push(result.new_state);

                    // Update the visualization
                    update_state_plot();
                    update_state_display();

                    // Update real data
                    realQuantumData = result;

                    return true;
                }
            } else {
                console.warn('⚠️ Failed to apply quantum gate, falling back to simulation:', response.statusText);
            }
        } catch (error) {
            console.warn('⚠️ Error applying quantum gate, falling back to simulation:', error.message);
        }

        return false;
    }

    // Apply quantum gate with real data integration
    async function applyRealQuantumGate(gateType, angle = 0, qubit = 0) {
        if (!isConnectedToRealQuantum) {
            console.log('⚠️ Not connected to real quantum, using simulation');
            return false;
        }

        try {
            console.log(`🔧 Applying ${gateType} gate to real quantum system...`);

            const response = await fetch('/api/apply_quantum_gate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gate_type: gateType,
                    angle: angle,
                    qubit: qubit
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.new_state) {
                    console.log('✅ Gate applied successfully:', result.new_state);

                    // Update the global state
                    QMSTATEVECTOR.push(result.new_state);

                    // Update the visualization
                    update_state_plot();
                    update_state_display();

                    // Update real data
                    realQuantumData = result;

                    return true;
                }
            } else {
                console.error('❌ Failed to apply quantum gate:', response.statusText);
            }
        } catch (error) {
            console.error('❌ Error applying quantum gate:', error);
        }

        return false;
    }

    // Initialize the Bloch sphere visualization
    async function init_bloch_sphere() {
        console.log('🚀 Initializing enhanced Bloch sphere...');

        try {
            // Check if the container exists
            const container = document.getElementById('bloch-3d-container');
            if (!container) {
                console.error('❌ Bloch sphere container not found');
                return;
            }

            // First try to get quantum data (real or simulated)
            await fetchQuantumData();

            // Check if required functions are available
            if (typeof gen_state === 'undefined') {
                console.error('❌ gen_state function not available');
                return;
            }
            if (typeof gen_bloch_sphere === 'undefined') {
                console.error('❌ gen_bloch_sphere function not available');
                return;
            }
            if (typeof update_state_plot === 'undefined') {
                console.error('❌ update_state_plot function not available');
                return;
            }

            // Initialize global variables
            if (realQuantumData && realQuantumData.quantum_state) {
                // Use quantum data (real or simulated)
                const quantumState = realQuantumData.quantum_state.bloch_vector;
                QMSTATEVECTOR = [quantumState];
                console.log(`✅ Using ${connectionStatus} quantum data:`, quantumState);
            } else {
                // Fallback to simulated data
                QMSTATEVECTOR = [gen_state(true)];
                console.log('✅ Using fallback simulated quantum data');
            }

            BLOCHSPHERE = gen_bloch_sphere();

            console.log('✅ Global variables initialized');
            console.log('QMSTATEVECTOR:', QMSTATEVECTOR);
            console.log('BLOCHSPHERE:', BLOCHSPHERE);

            // Ensure the container is visible and has proper dimensions
            container.style.display = 'block';
            container.style.width = '100%';
            container.style.height = '100%';  // Use full container height instead of fixed 300px

            // Initialize the 3D plot with the new enhanced system
            update_state_plot(true);

            // Initialize Rabi plot if available
            if (document.getElementById('rabi_div')) {
                rabi_plot();
            }

            console.log('✅ Enhanced Bloch sphere initialized in dashboard');

            // DISABLED: Set up periodic refresh of quantum data - CAUSING RAPID REFRESHING
            // setInterval(async () => {
            //     await fetchQuantumData();
            //     // Update visualization if it exists
            //     if (typeof update_state_plot === 'function') {
            //         update_state_plot();
            //     }
            // }, 30000); // Refresh every 30 seconds

        } catch (error) {
            console.error('❌ Error initializing Bloch sphere:', error);

            // Fallback: try to create a basic Bloch sphere visualization
            try {
                const container = document.getElementById('bloch-3d-container');
                if (container) {
                    console.log('🔄 Attempting fallback Bloch sphere initialization...');
                    createFallbackBlochSphere();
                }
            } catch (fallbackError) {
                console.error('❌ Fallback initialization also failed:', fallbackError);
            }
        }
    }

    // Fallback function to create a basic Bloch sphere if initialization fails
    function createFallbackBlochSphere() {
        const container = document.getElementById('bloch-3d-container');
        if (!container) return;

        // Create a simple 3D Bloch sphere using Plotly
        const data = [
            {
                type: 'surface',
                x: [[-1, 1], [-1, 1]],
                y: [[-1, 1], [-1, 1]],
                z: [[0, 0], [0, 0]],
                colorscale: [['0', '#1a237e'], ['1', '#1a237e']],
                opacity: 0.3,
                showscale: false,
                hoverinfo: 'skip'
            },
            {
                type: 'scatter3d',
                x: [0, 0, 0],
                y: [0, 0, 0],
                z: [0, 0, 0],
                mode: 'markers',
                marker: {
                    size: 8,
                    color: ['#ff0000', '#00ff00', '#0000ff'],
                    symbol: 'circle'
                },
                text: ['Origin', 'X-axis', 'Y-axis'],
                hoverinfo: 'text'
            },
            {
                type: 'scatter3d',
                x: [0, 0],
                y: [0, 0],
                z: [0, 1],
                mode: 'lines',
                line: {
                    color: '#ff6b6b',
                    width: 3
                },
                name: 'State Vector'
            }
        ];

        const layout = {
            title: '3D Bloch Sphere',
            scene: {
                xaxis: { range: [-1.1, 1.1] },
                yaxis: { range: [-1.1, 1.1] },
                zaxis: { range: [-1.1, 1.1] }
            },
            margin: { l: 0, r: 0, b: 0, t: 30 }
        };

        const config = {
            displayModeBar: false,
            responsive: true
        };

        Plotly.react(container, data, layout, config);
        console.log('✅ Fallback Bloch sphere created');
    }

    // Rotation functions (optimized for performance)
    async function rotate_state(axis, angle) {
        // Try to use real quantum data first
        if (isConnectedToRealQuantum) {
            const gateType = `r${axis.toLowerCase()}`;
            const success = await applyQuantumGate(gateType, angle);
            if (success) {
                return; // Real quantum gate was applied successfully
            }
        }

        // Fallback to simulation
        if (typeof rot === 'function' && QMSTATEVECTOR.length > 0) {
            try {
                const newState = rot(axis, angle, QMSTATEVECTOR[QMSTATEVECTOR.length - 1]);
                QMSTATEVECTOR.push(newState);
            } catch (error) {
                console.error('❌ Error in rotation:', error);
                return;
            }
        } else {
            console.error('❌ rot function not available or no quantum state');
            return;
        }

        // Generate phosphor trace for rotation (only if enabled)
        if (PHOSPHOR_ENABLED && typeof rot_phosphor === 'function' && QMSTATEVECTOR.length > 1) {
            try {
                const phosphor_trace = rot_phosphor(axis, angle, QMSTATEVECTOR[QMSTATEVECTOR.length - 2], Math.max(6, Math.round(angle / (0.5 * Math.PI) * 10)));
                PHOSPHOR.push(phosphor_trace);
            } catch (error) {
                console.error('❌ Error generating phosphor trace:', error);
            }
        }

        // Update visualization (debounced)
        if (typeof update_state_plot === 'function') {
            console.log('🔄 Updating main dashboard visualization...');
            update_state_plot();
        } else {
            console.error('❌ update_state_plot function not available');
        }

        if (typeof update_state_display === 'function') {
            update_state_display();
        }

        // Force update the main dashboard container
        const container = document.getElementById('bloch-3d-container');
        if (container) {
            console.log('✅ Main dashboard container found, forcing update...');
            // Force a re-render by temporarily hiding and showing
            container.style.display = 'none';
            setTimeout(() => {
                container.style.display = 'block';
                if (typeof update_state_plot === 'function') {
                    update_state_plot(true);
                }
            }, 10);
        } else {
            console.error('❌ Main dashboard container not found');
        }
    }

    // Pulse application with input validation
    function pulse_apply(axis) {
        const pulseInput = document.getElementById('pulselength');
        if (!pulseInput) {
            console.error('Pulse length input not found');
            return;
        }

        const time = parseFloat(pulseInput.value || 0.5);

        // Validate pulse time input
        if (isNaN(time) || time < 0 || time > 10) {
            alert('Please enter a valid pulse time between 0 and 10');
            return;
        }

        QMSTATEVECTOR.push(pulse(axis, time, QMSTATEVECTOR[QMSTATEVECTOR.length - 1]));

        // Generate phosphor trace for pulse
        if (PHOSPHOR_ENABLED) {
            const phosphor_trace = pulse_phosphor(axis, time, QMSTATEVECTOR[QMSTATEVECTOR.length - 2], Math.max(6, Math.round(time / 0.01)));
            PHOSPHOR.push(phosphor_trace);
        }

        update_state_plot();
        update_state_display();
    }

    // Fixed Hadamard gate implementation
    async function hadamard() {
        // Try to use real quantum data first
        if (isConnectedToRealQuantum) {
            const success = await applyQuantumGate('h');
            if (success) {
                return; // Real quantum gate was applied successfully
            }
        }

        // Fallback to simulation
        // Apply Hadamard gate by rotating around the axis (1, 0, 1) by π
        const axis = [1, 0, 1];
        const normalizedAxis = axis.map(val => val / Math.sqrt(2));

        // Create rotation operator around the normalized axis
        const opX = math.matrix([[0, math.complex(0.5, 0)], [math.complex(0.5, 0), 0]]);
        const opZ = math.matrix([[math.complex(0.5, 0), 0], [0, math.complex(-0.5, 0)]]);

        let rot_op = math.multiply(normalizedAxis[0], opX);
        rot_op = math.add(rot_op, math.multiply(normalizedAxis[2], opZ));

        await rotate_state(rot_op, Math.PI);
    }

    // Custom rotation around arbitrary axis with input validation
    function custom_rotate_state() {
        const opX = math.matrix([[0, math.complex(0.5, 0)], [math.complex(0.5, 0), 0]]);
        const opY = math.matrix([[0, math.complex(0, -0.5)], [math.complex(0, 0.5), 0]]);
        const opZ = math.matrix([[math.complex(0.5, 0), 0], [0, math.complex(-0.5, 0)]]);

        // Get and validate input values
        const polarInput = document.getElementById('custom_axis_polar');
        const azimuthInput = document.getElementById('custom_axis_azimuth');
        const rotationInput = document.getElementById('custom_axis_rot_angle');

        if (!polarInput || !azimuthInput || !rotationInput) {
            console.error('Required input elements not found');
            return;
        }

        const polarAngle = parseFloat(polarInput.value || 90) * Math.PI / 180;
        const azimuthAngle = parseFloat(azimuthInput.value || 0) * Math.PI / 180;
        const rotationAngle = parseFloat(rotationInput.value || 90) * Math.PI / 180;

        // Validate angles
        if (isNaN(polarAngle) || isNaN(azimuthAngle) || isNaN(rotationAngle)) {
            alert('Please enter valid numeric values for all angles');
            return;
        }

        let rot_op = math.multiply(Math.cos(polarAngle), opZ);
        rot_op = math.add(rot_op, math.multiply(Math.sin(polarAngle) * Math.cos(azimuthAngle), opX));
        rot_op = math.add(rot_op, math.multiply(Math.sin(polarAngle) * Math.sin(azimuthAngle), opY));

        rotate_state(rot_op, rotationAngle);
    }

    // Undo last action
    function undo() {
        if (QMSTATEVECTOR.length > 1) {
            QMSTATEVECTOR.pop();
            if (PHOSPHOR.length > 0) {
                PHOSPHOR.pop();
            }
            update_state_plot();
            update_state_display();
        }
    }

    // Restart/Initialize
    function restart() {
        QMSTATEVECTOR = [gen_state(true)];
        BLOCHSPHERE = gen_bloch_sphere();
        PHOSPHOR = [];
        PHOSPHOR_ENABLED = true;

        update_state_plot(true);
        update_state_display();

        // Reset input fields
        if (document.getElementById('custom_axis_polar')) document.getElementById('custom_axis_polar').value = 90;
        if (document.getElementById('custom_axis_azimuth')) document.getElementById('custom_axis_azimuth').value = 0;
        if (document.getElementById('custom_axis_rot_angle')) document.getElementById('custom_axis_rot_angle').value = 90;
        if (document.getElementById('detuning')) document.getElementById('detuning').value = 0;
        if (document.getElementById('phase')) document.getElementById('phase').value = 0;
        if (document.getElementById('amplitude')) document.getElementById('amplitude').value = 1;
        if (document.getElementById('pulselength')) document.getElementById('pulselength').value = 0.5;

        // Update Rabi plot
        if (document.getElementById('rabi_div')) {
            rabi_plot();
        }
    }

    // Export functionality with improved date formatting
    function export_png() {
        const currentdate = new Date();

        // Improved date/time formatting for better readability
        const year = currentdate.getFullYear();
        const month = String(currentdate.getMonth() + 1).padStart(2, '0');
        const day = String(currentdate.getDate()).padStart(2, '0');
        const hours = String(currentdate.getHours()).padStart(2, '0');
        const minutes = String(currentdate.getMinutes()).padStart(2, '0');
        const seconds = String(currentdate.getSeconds()).padStart(2, '0');

        const datetime = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

        const exportSize = document.getElementById('export_size')?.value || 800;

        Plotly.downloadImage('bloch-3d-container', {
            format: 'png',
            width: exportSize,
            height: exportSize,
            filename: 'bloch_sphere_' + datetime
        });
    }

    // Update state display
    function update_state_display() {
        const currentState = QMSTATEVECTOR[QMSTATEVECTOR.length - 1];
        const [u, v, w] = state2vector(currentState);

        // Update state equation
        const stateEquation = document.querySelector('.state-equation');
        if (stateEquation) {
            const alpha = Math.sqrt((1 + w) / 2);
            const beta = Math.sqrt((1 - w) / 2);
            const phase = Math.atan2(v, u);

            if (Math.abs(phase) < 0.01) {
                stateEquation.textContent = `|ψ⟩ = ${alpha.toFixed(3)}|0⟩ + ${beta.toFixed(3)}|1⟩`;
            } else {
                stateEquation.textContent = `|ψ⟩ = ${alpha.toFixed(3)}|0⟩ + ${beta.toFixed(3)}e^{i${phase.toFixed(2)}}|1⟩`;
            }
        }

        // Update spherical coordinates
        const thetaValue = document.querySelector('.detail-item .value');
        const phiValue = document.querySelectorAll('.detail-item .value')[1];

        if (thetaValue) {
            const theta = Math.acos(w);
            thetaValue.textContent = `${(theta / Math.PI).toFixed(2)}π`;
        }

        if (phiValue) {
            const phi = Math.atan2(v, u);
            phiValue.textContent = `${(phi / Math.PI).toFixed(2)}π`;
        }

        // Calculate actual fidelity instead of hardcoded value
        const fidelityValue = document.querySelectorAll('.detail-item .value')[2];
        if (fidelityValue) {
            // Calculate fidelity with respect to the target state (assuming |0⟩ as target)
            const targetState = [0, 0, 1]; // |0⟩ state
            const fidelity = (1 + u * targetState[0] + v * targetState[1] + w * targetState[2]) / 2;
            fidelityValue.textContent = `${(fidelity * 100).toFixed(1)}%`;
        }
    }

    // Enhanced rotation with custom angles and input validation
    function rotate_custom_angle(axis) {
        let angleInput;
        let angleValue = 0;

        switch (axis) {
            case 'x':
                angleInput = document.getElementById('x_angle');
                break;
            case 'y':
                angleInput = document.getElementById('y_angle');
                break;
            case 'z':
                angleInput = document.getElementById('z_angle');
                break;
            default:
                console.error('Invalid axis specified');
                return;
        }

        if (angleInput && angleInput.value) {
            angleValue = parseFloat(angleInput.value) * Math.PI / 180;

            // Validate angle input
            if (isNaN(angleValue)) {
                alert('Please enter a valid numeric value for the angle');
                return;
            }

            rotate_state(axis, angleValue);
        }
    }

    // Toggle phosphor (history trace)
    function toggle_phosphor() {
        PHOSPHOR_ENABLED = !PHOSPHOR_ENABLED;
        if (!PHOSPHOR_ENABLED) {
            PHOSPHOR = [];
        }
        update_state_plot();
    }

    // Clear history
    function clear_history() {
        PHOSPHOR = [];
        update_state_plot();
    }

    // Download state as JSON
    function download_state() {
        const currentState = QMSTATEVECTOR[QMSTATEVECTOR.length - 1];
        const [u, v, w] = state2vector(currentState);

        const stateData = {
            timestamp: new Date().toISOString(),
            stateVector: [u, v, w],
            sphericalCoordinates: {
                theta: Math.acos(w),
                phi: Math.atan2(v, u)
            },
            cartesianCoordinates: { x: u, y: v, z: w },
            history: PHOSPHOR.length,
            operations: QMSTATEVECTOR.length - 1
        };

        const blob = new Blob([JSON.stringify(stateData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bloch_state_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Full-screen Bloch sphere functionality with proper null checks
    function toggleFullscreenBloch() {
        const overlay = document.getElementById('fullscreen-bloch-overlay');

        // Add null check for overlay element
        if (!overlay) {
            console.error('Fullscreen overlay element not found');
            return;
        }

        const isVisible = overlay.style.display !== 'none';

        if (isVisible) {
            // Exit full-screen mode
            overlay.style.display = 'none';
            document.body.style.overflow = 'auto';

            // Restore original functions to prevent memory leaks
            restoreOriginalFunctions();

            // Restore the original Bloch sphere in the widget
            if (typeof update_state_plot === 'function') {
                update_state_plot(true);
            }
        } else {
            // Enter full-screen mode
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            // Initialize the full-screen Bloch sphere
            initFullscreenBloch();
        }
    }

    // Export for dashboard global use
    window.toggleFullscreenBloch = toggleFullscreenBloch;

    function initFullscreenBloch() {
        console.log('🚀 Initializing fullscreen Bloch sphere with real-time data...');

        // Debug function availability
        if (typeof window.debugQuantumFunctions === 'function') {
            window.debugQuantumFunctions();
        }

        // Ensure we have the required quantum state data
        if (!QMSTATEVECTOR || QMSTATEVECTOR.length === 0) {
            console.log('⚠️ No quantum state data, initializing with default state...');
            if (typeof gen_state === 'function') {
                QMSTATEVECTOR = [gen_state(true)];
            } else {
                QMSTATEVECTOR = [[1, 0]]; // Default |0⟩ state
            }
        }

        // Ensure we have the Bloch sphere data
        if (!BLOCHSPHERE || BLOCHSPHERE.length === 0) {
            console.log('⚠️ No Bloch sphere data, generating...');
            if (typeof gen_bloch_sphere === 'function') {
                BLOCHSPHERE = gen_bloch_sphere();
            } else {
                // Fallback: create basic sphere data
                BLOCHSPHERE = createBasicBlochSphere();
            }
        }

        // Store original plotting function
        const originalInitPlotting = window.init_plotting;

        // Create fullscreen-specific plotting function
        window.init_plotting = function (data) {
            console.log('📊 Plotting fullscreen Bloch sphere with data:', data);

            const config = {
                displayModeBar: false,
                responsive: true
            };

            var layout = {
                hovermode: 'closest',
                scene: {
                    xaxis: {
                        showspikes: false,
                        showgrid: false,
                        zeroline: false,
                        showline: false,
                        visible: false,
                        ticks: '',
                        showticklabels: false,
                        range: [-1.1, 1.1]
                    },
                    yaxis: {
                        showspikes: false,
                        showgrid: false,
                        zeroline: false,
                        showline: false,
                        visible: false,
                        ticks: '',
                        showticklabels: false,
                        range: [-1.1, 1.1]
                    },
                    zaxis: {
                        showspikes: false,
                        showgrid: false,
                        zeroline: false,
                        showline: false,
                        visible: false,
                        ticks: '',
                        showticklabels: false,
                        range: [-1.1, 1.1]
                    },
                    camera: {
                        center: {
                            x: 0, y: 0, z: 0
                        },
                        eye: {
                            x: -0.9, y: 1, z: 0.6
                        },
                        projection: 'perspective'
                    }
                },
                showlegend: false,
                margin: {
                    l: 0,
                    r: 0,
                    b: 0,
                    t: 0
                },
                annotations: [
                    {
                        showarrow: false,
                        text: 'Quantum Dashboard - Full Screen',
                        x: 1.0,
                        y: 0.0,
                        xref: 'paper',
                        yref: 'paper',
                        xanchor: 'right',
                        yanchor: 'bottom',
                        opacity: 0.4
                    }
                ]
            };

            // Plot to fullscreen container
            Plotly.react('fullscreen-bloch-3d-container', data, layout, config);
            console.log('✅ Fullscreen Bloch sphere plotted successfully');
        };

        // Generate current state vector plot
        let point_vector;
        if (typeof state2vector === 'function') {
            point_vector = state2vector(QMSTATEVECTOR[QMSTATEVECTOR.length - 1]);
        } else {
            // Fallback calculation
            const state = QMSTATEVECTOR[QMSTATEVECTOR.length - 1];
            const alpha = state[0];
            const beta = state[1];
            const norm = Math.sqrt(alpha * alpha + beta * beta);
            if (norm > 0) {
                const alpha_norm = alpha / norm;
                const beta_norm = beta / norm;
                point_vector = [
                    2 * alpha_norm * beta_norm,
                    0,
                    alpha_norm * alpha_norm - beta_norm * beta_norm
                ];
            } else {
                point_vector = [0, 0, 1];
            }
        }

        // Generate vector plot data
        let new_data;
        if (typeof gen_vector_plot === 'function') {
            new_data = gen_vector_plot(point_vector);
        } else {
            // Fallback vector plot
            new_data = [{
                type: 'scatter3d',
                x: [0, point_vector[0]],
                y: [0, point_vector[1]],
                z: [0, point_vector[2]],
                mode: 'lines+markers',
                line: { color: '#ff6b6b', width: 5 },
                marker: { size: 8, color: '#ff6b6b' },
                name: 'State Vector',
                hoverinfo: 'name'
            }];
        }

        // Add phosphor trace if enabled
        let phosphor_data = [];
        if (PHOSPHOR_ENABLED && PHOSPHOR.length > 0) {
            const phosphor_length = document.getElementById('phosphor_length')?.value || 10;
            const startidx = Math.max(0, PHOSPHOR.length - phosphor_length);
            phosphor_data = PHOSPHOR.slice(startidx);
        }

        // Combine all data and plot
        const all_data = BLOCHSPHERE.concat(new_data).concat(phosphor_data);
        window.init_plotting(all_data);

        // Update the quantum state info in the sidebar
        updateFullscreenStateInfo();

        // Setup fullscreen control event listeners
        setupFullscreenControls();

        // Restore original plotting function after a delay
        setTimeout(() => {
            window.init_plotting = originalInitPlotting;
        }, 1000);

        console.log('✅ Fullscreen Bloch sphere initialized with real-time data');
    }

    // Helper function to create basic Bloch sphere data
    function createBasicBlochSphere() {
        console.log('🔄 Creating basic Bloch sphere data...');

        // Create a simple sphere surface
        const sphere = {
            type: 'surface',
            x: [], y: [], z: [],
            colorscale: [['0', '#1a237e'], ['1', '#1a237e']],
            opacity: 0.3,
            showscale: false,
            hoverinfo: 'skip'
        };

        // Generate sphere coordinates
        const u = linspace(0, 2 * Math.PI, 20);
        const v = linspace(0, Math.PI, 20);

        for (let i = 0; i < u.length; i++) {
            sphere.x[i] = [];
            sphere.y[i] = [];
            sphere.z[i] = [];
            for (let j = 0; j < v.length; j++) {
                sphere.x[i][j] = Math.sin(v[j]) * Math.cos(u[i]);
                sphere.y[i][j] = Math.sin(v[j]) * Math.sin(u[i]);
                sphere.z[i][j] = Math.cos(v[j]);
            }
        }

        // Add axes
        const axes = [
            {
                type: 'scatter3d',
                x: [-1.1, 1.1], y: [0, 0], z: [0, 0],
                mode: 'lines',
                line: { color: '#ff0000', width: 3 },
                showlegend: false,
                hoverinfo: 'skip'
            },
            {
                type: 'scatter3d',
                x: [0, 0], y: [-1.1, 1.1], z: [0, 0],
                mode: 'lines',
                line: { color: '#00ff00', width: 3 },
                showlegend: false,
                hoverinfo: 'skip'
            },
            {
                type: 'scatter3d',
                x: [0, 0], y: [0, 0], z: [-1.1, 1.1],
                mode: 'lines',
                line: { color: '#0000ff', width: 3 },
                showlegend: false,
                hoverinfo: 'skip'
            }
        ];

        return [sphere, ...axes];
    }

    // Setup fullscreen control event listeners (with performance optimization)
    function setupFullscreenControls() {
        console.log('🔧 Setting up fullscreen control event listeners...');

        // Clear existing listeners to prevent duplicates
        const overlay = document.getElementById('fullscreen-bloch-overlay');
        if (!overlay) return;

        // Use event delegation for better performance
        overlay.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;

            // Handle rotation controls
            if (action.startsWith('rotate-')) {
                e.preventDefault();
                e.stopPropagation();

                const axis = action.split('-')[1];
                const angle = parseFloat(target.dataset.angle) || 0;
                console.log(`🔄 Fullscreen rotation: ${axis} axis, ${angle} radians`);

                // Debounce rapid clicks
                if (target.dataset.processing === 'true') return;
                target.dataset.processing = 'true';

                setTimeout(() => {
                    target.dataset.processing = 'false';
                }, 100);

                if (typeof rotate_state === 'function') {
                    rotate_state(axis, angle);
                } else {
                    console.error('❌ rotate_state function not available');
                }
            }

            // Handle custom rotation controls
            else if (action === 'custom-rotate') {
                e.preventDefault();
                e.stopPropagation();

                const axis = target.dataset.axis;
                const angleInput = document.getElementById(`${axis}_angle_fullscreen`);
                if (angleInput && typeof rotate_custom_angle === 'function') {
                    const originalInput = document.getElementById(`${axis}_angle`);
                    if (originalInput) {
                        originalInput.value = angleInput.value;
                    }
                    rotate_custom_angle(axis);
                }
            }

            // Handle quantum gates
            else if (action === 'hadamard') {
                e.preventDefault();
                e.stopPropagation();

                console.log('🔄 Fullscreen Hadamard gate');
                if (typeof hadamard === 'function') {
                    hadamard();
                }
            }

            // Handle Pauli gates
            else if (action === 'pauli-x' || action === 'pauli-y' || action === 'pauli-z') {
                e.preventDefault();
                e.stopPropagation();

                const gateType = action.split('-')[1];
                console.log(`🔄 Fullscreen Pauli ${gateType.toUpperCase()} gate`);

                if (typeof rotate_state === 'function') {
                    rotate_state(gateType, Math.PI);
                }
            }

            // Handle phase gates
            else if (action === 'phase-s' || action === 'phase-s-dagger' || action === 'phase-t' || action === 'phase-t-dagger') {
                e.preventDefault();
                e.stopPropagation();

                const gateType = action.split('-')[1];
                console.log(`🔄 Fullscreen Phase ${gateType} gate`);

                if (typeof rotate_state === 'function') {
                    const angle = gateType.includes('dagger') ? -Math.PI / 2 : Math.PI / 2;
                    rotate_state('z', angle);
                }
            }

            // Handle action buttons
            else if (['restart', 'undo', 'export-png', 'download-state', 'toggle-phosphor', 'clear-history'].includes(action)) {
                e.preventDefault();
                e.stopPropagation();

                console.log(`🔄 Fullscreen ${action}`);

                switch (action) {
                    case 'restart':
                        if (typeof restart === 'function') restart();
                        break;
                    case 'undo':
                        if (typeof undo === 'function') undo();
                        break;
                    case 'export-png':
                        if (typeof export_png === 'function') export_png();
                        break;
                    case 'download-state':
                        if (typeof download_state === 'function') download_state();
                        break;
                    case 'toggle-phosphor':
                        if (typeof toggle_phosphor === 'function') toggle_phosphor();
                        break;
                    case 'clear-history':
                        if (typeof clear_history === 'function') clear_history();
                        break;
                }
            }

            // Handle view controls
            else if (action === 'reset-bloch-view') {
                e.preventDefault();
                e.stopPropagation();

                console.log('🔄 Fullscreen reset view');
                if (typeof restart === 'function') {
                    restart();
                }
            }

            // Handle fullscreen toggle
            else if (action === 'toggle-fullscreen-bloch') {
                e.preventDefault();
                e.stopPropagation();

                console.log('🔄 Toggle fullscreen from within fullscreen');
                toggleFullscreenBloch();
            }
        });

        console.log('✅ Fullscreen control event listeners setup complete');
    }

    function updateFullscreenStateInfo() {
        // Update the state equation and details in the full-screen sidebar
        if (typeof QMSTATEVECTOR !== 'undefined' && QMSTATEVECTOR.length > 0) {
            const currentState = QMSTATEVECTOR[QMSTATEVECTOR.length - 1];
            if (!currentState) return;

            // Update state equation with proper quantum state calculation
            const stateEquation = document.querySelector('.state-equation-fullscreen');
            if (stateEquation) {
                const [u, v, w] = state2vector(currentState);
                const alpha = Math.sqrt((1 + w) / 2);
                const beta = Math.sqrt((1 - w) / 2);
                const phase = Math.atan2(v, u);

                if (Math.abs(phase) < 0.01) {
                    stateEquation.textContent = `|ψ⟩ = ${alpha.toFixed(3)}|0⟩ + ${beta.toFixed(3)}|1⟩`;
                } else {
                    stateEquation.textContent = `|ψ⟩ = ${alpha.toFixed(3)}|0⟩ + ${beta.toFixed(3)}e^{i${phase.toFixed(2)}}|1⟩`;
                }
            }

            // Update theta and phi values with proper validation
            const thetaValue = document.querySelector('.detail-item-fullscreen:nth-child(2) .value');
            const phiValue = document.querySelector('.detail-item-fullscreen:nth-child(3) .value');

            if (thetaValue && phiValue) {
                const vector = state2vector(currentState);
                if (vector && vector.length >= 3) {
                    const theta = Math.acos(vector[2]);
                    const phi = Math.atan2(vector[1], vector[0]);

                    // Handle edge cases for phase display
                    let phiDisplay = phi;
                    if (Math.abs(phi) < 0.01) phiDisplay = 0;
                    if (Math.abs(phi - Math.PI) < 0.01) phiDisplay = Math.PI;
                    if (Math.abs(phi + Math.PI) < 0.01) phiDisplay = -Math.PI;

                    thetaValue.textContent = `${(theta / Math.PI).toFixed(3)}π`;
                    phiValue.textContent = `${(phiDisplay / Math.PI).toFixed(3)}π`;
                }
            }
        }
    }

    function resetBlochView() {
        // Reset the Bloch sphere view to default
        if (typeof restart === 'function') {
            restart();
        }

        // Update the full-screen display with proper timing
        setTimeout(() => {
            updateFullscreenStateInfo();
        }, 200); // Increased timeout to prevent race conditions
    }

    // Function to store original functions
    function storeOriginalFunctions() {
        if (window.init_plotting) {
            originalFunctions.init_plotting = window.init_plotting;
        }
        if (window.update_state_plot) {
            originalFunctions.update_state_plot = window.update_state_plot;
        }
    }

    // Function to restore original functions
    function restoreOriginalFunctions() {
        if (originalFunctions.init_plotting) {
            window.init_plotting = originalFunctions.init_plotting;
        }
        if (originalFunctions.update_state_plot) {
            window.update_state_plot = originalFunctions.update_state_plot;
        }
    }

    // Test and debug functions
    function testBlochSphere() {
        console.log('🧪 Testing Bloch sphere...');

        // Check if all required functions exist
        const requiredFunctions = ['gen_state', 'gen_bloch_sphere', 'update_state_plot', 'state2vector', 'init_plotting'];
        const missingFunctions = [];

        requiredFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'undefined') {
                missingFunctions.push(funcName);
            }
        });

        if (missingFunctions.length > 0) {
            console.error('❌ Missing functions:', missingFunctions);
            alert('Missing functions: ' + missingFunctions.join(', '));
            return;
        }

        console.log('✅ All required functions available');

        // Try to initialize manually
        try {
            console.log('🔄 Manual initialization...');
            QMSTATEVECTOR = [gen_state(true)];
            BLOCHSPHERE = gen_bloch_sphere();

            console.log('QMSTATEVECTOR:', QMSTATEVECTOR);
            console.log('BLOCHSPHERE:', BLOCHSPHERE);

            update_state_plot(true);
            console.log('✅ Manual initialization successful');
        } catch (error) {
            console.error('❌ Manual initialization failed:', error);
            alert('Initialization failed: ' + error.message);
        }
    }

    function showBlochDebugInfo() {
        console.log('🐛 Bloch Sphere Debug Information:');
        console.log('math library:', typeof math);
        console.log('Plotly library:', typeof Plotly);
        console.log('QMSTATEVECTOR:', QMSTATEVECTOR);
        console.log('BLOCHSPHERE:', BLOCHSPHERE);
        console.log('Available functions:', Object.keys(window).filter(key =>
            key.includes('bloch') ||
            key.includes('Bloch') ||
            key.includes('gen_') ||
            key.includes('update_') ||
            key.includes('state2vector')
        ));

        // Check if container exists
        const container = document.getElementById('bloch-3d-container');
        console.log('Container element:', container);
        if (container) {
            console.log('Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
            console.log('Container style:', container.style.cssText);
        }
    }

    // Add event listeners for full-screen mode
    document.addEventListener('DOMContentLoaded', function () {
        // Add keyboard shortcut for full-screen toggle (ESC key)
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                const overlay = document.getElementById('fullscreen-bloch-overlay');
                if (overlay && overlay.style.display !== 'none') {
                    toggleFullscreenBloch();
                }
            }
        });

        // Update full-screen state info when quantum state changes (optimized)
        if (typeof update_state_plot === 'function') {
            const originalUpdateStatePlot = window.update_state_plot;
            let updateTimeout = null;

            // Create a debounced wrapper for better performance
            window.update_state_plot = function (full_update) {
                originalUpdateStatePlot.call(this, full_update);

                // Update full-screen visualization if in full-screen mode
                const overlay = document.getElementById('fullscreen-bloch-overlay');
                if (overlay && overlay.style.display !== 'none') {
                    // Clear previous timeout to debounce updates
                    if (updateTimeout) {
                        clearTimeout(updateTimeout);
                    }

                    // Debounce updates to prevent excessive redraws
                    updateTimeout = setTimeout(() => {
                        updateFullscreenBlochVisualization();
                        updateFullscreenStateInfo();
                    }, 16); // ~60fps
                }
            };
        }
    });

    // Function to update the fullscreen Bloch sphere visualization (optimized)
    function updateFullscreenBlochVisualization() {
        // Check if we're in fullscreen mode
        const overlay = document.getElementById('fullscreen-bloch-overlay');
        if (!overlay || overlay.style.display === 'none') {
            return;
        }

        // Ensure we have quantum state data
        if (!QMSTATEVECTOR || QMSTATEVECTOR.length === 0) {
            return;
        }

        // Get the container element
        const container = document.getElementById('fullscreen-bloch-3d-container');
        if (!container) {
            console.error('❌ Fullscreen Bloch sphere container not found');
            return;
        }

        // Generate current state vector plot
        let point_vector;
        if (typeof state2vector === 'function') {
            point_vector = state2vector(QMSTATEVECTOR[QMSTATEVECTOR.length - 1]);
        } else {
            // Fallback calculation
            const state = QMSTATEVECTOR[QMSTATEVECTOR.length - 1];
            const alpha = state[0];
            const beta = state[1];
            const norm = Math.sqrt(alpha * alpha + beta * beta);
            if (norm > 0) {
                const alpha_norm = alpha / norm;
                const beta_norm = beta / norm;
                point_vector = [
                    2 * alpha_norm * beta_norm,
                    0,
                    alpha_norm * alpha_norm - beta_norm * beta_norm
                ];
            } else {
                point_vector = [0, 0, 1];
            }
        }

        // Generate vector plot data
        let new_data;
        if (typeof gen_vector_plot === 'function') {
            new_data = gen_vector_plot(point_vector);
        } else {
            // Fallback vector plot
            new_data = [{
                type: 'scatter3d',
                x: [0, point_vector[0]],
                y: [0, point_vector[1]],
                z: [0, point_vector[2]],
                mode: 'lines+markers',
                line: { color: '#ff6b6b', width: 5 },
                marker: { size: 8, color: '#ff6b6b' },
                name: 'State Vector',
                hoverinfo: 'name'
            }];
        }

        // Add phosphor trace if enabled
        let phosphor_data = [];
        if (PHOSPHOR_ENABLED && PHOSPHOR.length > 0) {
            const phosphor_length = document.getElementById('phosphor_length')?.value || 10;
            const startidx = Math.max(0, PHOSPHOR.length - phosphor_length);
            phosphor_data = PHOSPHOR.slice(startidx);
        }

        // Combine all data and plot
        const all_data = BLOCHSPHERE.concat(new_data).concat(phosphor_data);

        // Update the fullscreen plot
        const config = {
            displayModeBar: false,
            responsive: true
        };

        var layout = {
            hovermode: 'closest',
            scene: {
                xaxis: {
                    showspikes: false,
                    showgrid: false,
                    zeroline: false,
                    showline: false,
                    visible: false,
                    ticks: '',
                    showticklabels: false,
                    range: [-1.1, 1.1]
                },
                yaxis: {
                    showspikes: false,
                    showgrid: false,
                    zeroline: false,
                    showline: false,
                    visible: false,
                    ticks: '',
                    showticklabels: false,
                    range: [-1.1, 1.1]
                },
                zaxis: {
                    showspikes: false,
                    showgrid: false,
                    zeroline: false,
                    showline: false,
                    visible: false,
                    ticks: '',
                    showticklabels: false,
                    range: [-1.1, 1.1]
                },
                camera: {
                    center: {
                        x: 0, y: 0, z: 0
                    },
                    eye: {
                        x: -0.9, y: 1, z: 0.6
                    },
                    projection: 'perspective'
                }
            },
            showlegend: false,
            margin: {
                l: 0,
                r: 0,
                b: 0,
                t: 0
            },
            annotations: [
                {
                    showarrow: false,
                    text: 'Quantum Dashboard - Full Screen',
                    x: 1.0,
                    y: 0.0,
                    xref: 'paper',
                    yref: 'paper',
                    xanchor: 'right',
                    yanchor: 'bottom',
                    opacity: 0.4
                }
            ]
        };

        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            Plotly.react('fullscreen-bloch-3d-container', all_data, layout, {
                ...config,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
                displaylogo: false
            });
        });
        console.log('✅ Fullscreen Bloch sphere visualization updated');
    }

    // Make the function globally available
    window.testBlochSphere = testBlochSphere;

    // Create a simple fallback Bloch sphere visualization
    function createSimpleBlochSphere() {
        console.log('🔄 Creating simple fallback Bloch sphere...');

        const container = document.getElementById('bloch-3d-container');
        if (!container) {
            console.error('❌ Container not found for fallback visualization');
            return;
        }

        try {
            // Create a simple 3D Bloch sphere using Plotly
            const data = [
                {
                    type: 'surface',
                    x: [[-1, 1], [-1, 1]],
                    y: [[-1, 1], [-1, 1]],
                    z: [[0, 0], [0, 0]],
                    colorscale: [['0', '#1a237e'], ['1', '#1a237e']],
                    opacity: 0.3,
                    showscale: false,
                    hoverinfo: 'skip'
                },
                {
                    type: 'scatter3d',
                    x: [0, 0, 0],
                    y: [0, 0, 0],
                    z: [0, 0, 0],
                    mode: 'markers',
                    marker: {
                        size: 8,
                        color: ['#ff0000', '#00ff00', '#0000ff'],
                        symbol: 'circle'
                    },
                    text: ['Origin', 'X-axis', 'Y-axis'],
                    hoverinfo: 'text'
                },
                {
                    type: 'scatter3d',
                    x: [0, 0],
                    y: [0, 0],
                    z: [0, 1],
                    mode: 'lines',
                    line: {
                        color: '#ff6b6b',
                        width: 3
                    },
                    name: 'State Vector',
                    hoverinfo: 'name'
                }
            ];

            const layout = {
                scene: {
                    xaxis: { range: [-1.2, 1.2], showgrid: true, zeroline: true },
                    yaxis: { range: [-1.2, 1.2], showgrid: true, zeroline: true },
                    zaxis: { range: [-1.2, 1.2], showgrid: true, zeroline: true },
                    camera: {
                        center: { x: 0, y: 0, z: 0 },
                        eye: { x: 1.5, y: 1.5, z: 1.5 }
                    }
                },
                margin: { l: 0, r: 0, b: 0, t: 0 },
                showlegend: false
            };

            const config = {
                displayModeBar: false,
                responsive: true
            };

            Plotly.newPlot(container, data, layout, config);
            console.log('✅ Simple fallback Bloch sphere created successfully');

        } catch (error) {
            console.error('❌ Error creating fallback visualization:', error);

            // Last resort - show text
            container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #ffffff; background: rgba(0,0,0,0.3); border-radius: 8px;">
                <h3>⚛️ Bloch Sphere</h3>
                <p>Quantum state visualization</p>
                <p style="font-size: 0.9em; opacity: 0.8;">Initializing...</p>
            </div>
        `;
        }
    }

    // Make the function globally available
    window.createSimpleBlochSphere = createSimpleBlochSphere;
    window.createFallbackBlochSphere = createFallbackBlochSphere;

    // Ensure all quantum functions are globally available
    window.rotate_state = rotate_state;
    window.rotate_custom_angle = rotate_custom_angle;
    window.hadamard = hadamard;
    window.restart = restart;
    window.undo = undo;
    window.export_png = export_png;
    window.download_state = download_state;
    window.toggle_phosphor = toggle_phosphor;
    window.clear_history = clear_history;
    window.pulse_apply = pulse_apply;
    window.custom_rotate_state = custom_rotate_state;

    // Debug function to check available functions
    window.debugQuantumFunctions = function () {
        console.log('🔍 Checking quantum function availability:');
        const functions = [
            'rotate_state', 'rotate_custom_angle', 'hadamard', 'restart', 'undo',
            'export_png', 'download_state', 'toggle_phosphor', 'clear_history',
            'pulse_apply', 'custom_rotate_state', 'rot', 'gen_state', 'gen_bloch_sphere',
            'update_state_plot', 'state2vector', 'rot_phosphor'
        ];

        functions.forEach(funcName => {
            const available = typeof window[funcName] === 'function';
            console.log(`${available ? '✅' : '❌'} ${funcName}: ${available ? 'Available' : 'Missing'}`);
        });

        console.log('🔍 Global variables:');
        console.log('QMSTATEVECTOR:', QMSTATEVECTOR);
        console.log('BLOCHSPHERE:', BLOCHSPHERE);
        console.log('PHOSPHOR:', PHOSPHOR);
        console.log('PHOSPHOR_ENABLED:', PHOSPHOR_ENABLED);
    };

    // Manual initialization function for debugging
    window.forceInitBlochSphere = function () {
        console.log('🔄 Force initializing Bloch sphere...');
        const container = document.getElementById('bloch-3d-container');
        if (!container) {
            console.error('❌ Container not found');
            return false;
        }

        // Try normal initialization first
        if (typeof init_bloch_sphere === 'function') {
            init_bloch_sphere();
            return true;
        }

        // Fallback to basic sphere
        if (typeof createFallbackBlochSphere === 'function') {
            createFallbackBlochSphere();
            return true;
        }

        console.error('❌ No initialization function available');
        return false;
    };

    // Test function to verify controls are working
    window.testBlochControls = function () {
        console.log('🧪 Testing Bloch sphere controls...');

        // Test if functions are available
        const functions = ['rotate_state', 'hadamard', 'restart', 'undo'];
        functions.forEach(funcName => {
            const available = typeof window[funcName] === 'function';
            console.log(`${available ? '✅' : '❌'} ${funcName}: ${available ? 'Available' : 'Missing'}`);
        });

        // Test if controls exist
        const controls = [
            '[data-action="rotate-x"]',
            '[data-action="rotate-y"]',
            '[data-action="rotate-z"]',
            '[data-action="hadamard"]',
            '[data-action="restart"]'
        ];

        controls.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            console.log(`${elements.length > 0 ? '✅' : '❌'} ${selector}: ${elements.length} elements found`);
        });

        // Test container
        const container = document.getElementById('bloch-3d-container');
        console.log(`${container ? '✅' : '❌'} Main dashboard container: ${container ? 'Found' : 'Missing'}`);
        if (container) {
            console.log('Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
            console.log('Container display:', container.style.display);
        }

        // Test a simple rotation
        if (typeof rotate_state === 'function') {
            console.log('🧪 Testing X-axis rotation...');
            try {
                rotate_state('x', Math.PI / 4);
                console.log('✅ Rotation test successful');
            } catch (error) {
                console.error('❌ Rotation test failed:', error);
            }
        }

        return true;
    };

    // Function to fix the main dashboard container
    window.fixDashboardContainer = function () {
        console.log('🔧 Fixing main dashboard container...');

        const container = document.getElementById('bloch-3d-container');
        if (!container) {
            console.error('❌ Container not found');
            return false;
        }

        // Ensure container is visible and has proper dimensions
        container.style.display = 'block';
        container.style.width = '100%';
        container.style.height = '300px';
        container.style.minHeight = '300px';

        // Force re-initialization
        if (typeof init_bloch_sphere === 'function') {
            console.log('🔄 Re-initializing Bloch sphere...');
            init_bloch_sphere();
        } else if (typeof createFallbackBlochSphere === 'function') {
            console.log('🔄 Creating fallback Bloch sphere...');
            createFallbackBlochSphere();
        }

        console.log('✅ Dashboard container fixed');
        return true;
    };

} // End of duplicate loading check
