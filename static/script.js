// Quantum Jobs Tracker - Frontend JavaScript

// Configuration
const CONFIG = {
    maxQubits: 5,          // Maximum number of qubits to visualize
    colors: {
        primary: '#3498db',
        secondary: '#9b59b6',
        success: '#2ecc71',
        warning: '#f39c12',
        danger: '#e74c3c'
    }
};

// State management
const state = {
    backends: [],
    jobs: [],
    dashboardState: null,
    lastUpdate: null,
    isInitialized: false
};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    fetchData(); // Load data once on initialization
    
    // Set up manual refresh buttons instead of automatic polling
    setupManualRefresh();
});

// Initialize quantum visualization canvas
function initializeDashboard() {
    const canvas = document.getElementById('superposition-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Draw initial quantum state visualization
    drawQuantumCircuit(ctx, [], []);
    
    state.isInitialized = true;
}

// Fetch all data from the API endpoints
async function fetchData() {
    try {
        // Fetch backends data with retry
        const backendsResponse = await window.apiUtils.fetchWithRetry('/api/backends');
        const backendsData = await backendsResponse.json();
        
        // Fetch jobs data with retry
        const jobsResponse = await window.apiUtils.fetchWithRetry('/api/jobs');
        const jobsData = await jobsResponse.json();
        
        // Fetch dashboard quantum state with retry
        const dashboardResponse = await window.apiUtils.fetchWithRetry('/api/dashboard_state');
        const dashboardData = await dashboardResponse.json();
        
        // Update state with fetched data - handle new API structure
        state.backends = backendsData.backends || backendsData;
        state.jobs = jobsData.jobs || jobsData;
        state.dashboardState = dashboardData;
        state.lastUpdate = new Date();
        
        // Check for connection status - handle both old and new formats
        const connectionStatus = backendsData.connection_status || 
                                jobsData.connection_status || 
                                dashboardData.connection_status ||
                                (dashboardData.connection_status && dashboardData.connection_status.status) ||
                                'disconnected';
        
        // Update connection status indicator
        updateConnectionStatus(connectionStatus);
        
        // Update the UI with fetched data
        updateBackendsUI(state.backends);
        updateJobsUI(state.jobs);
        updateDashboardState(state.dashboardState);
        
        // Update quantum circuit visualization
        const canvas = document.getElementById('superposition-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            drawQuantumCircuit(ctx, state.backends, state.jobs);
        }
        
    } catch (error) {
        console.error('Error fetching data:', error);
        updateConnectionStatus('error');
    }
}

// Update connection status indicator
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;
    
    const indicator = statusElement.querySelector('.status-indicator');
    const textSpan = statusElement.querySelector('span');
    
    if (!indicator || !textSpan) return;
    
    // Handle both string status and object status
    let statusValue = status;
    if (typeof status === 'object' && status !== null) {
        statusValue = status.status || status.is_connected ? 'connected' : 'disconnected';
    }
    
    switch (statusValue) {
        case 'connected':
            textSpan.textContent = 'Connected to IBM Quantum';
            indicator.className = 'fas fa-circle status-indicator connected';
            statusElement.className = 'connection-status connected';
            break;
        case 'disconnected':
            textSpan.textContent = 'Disconnected from IBM Quantum';
            indicator.className = 'fas fa-circle status-indicator disconnected';
            statusElement.className = 'connection-status disconnected';
            break;
        case 'demo_mode':
            textSpan.textContent = 'Demo Mode - IBM Quantum Not Connected';
            indicator.className = 'fas fa-flask status-indicator demo';
            statusElement.className = 'connection-status demo';
            break;
        case 'error':
            textSpan.textContent = 'Connection Error';
            indicator.className = 'fas fa-exclamation-triangle status-indicator error';
            statusElement.className = 'connection-status error';
            break;
        default:
            textSpan.textContent = 'Connection Status Unknown';
            indicator.className = 'fas fa-question-circle status-indicator unknown';
            statusElement.className = 'connection-status unknown';
    }
}

// Update backends grid in the UI
function updateBackendsUI(backends) {
    const backendsContainer = document.getElementById('backends-container');
    
    if (!backends || backends.length === 0) {
        backendsContainer.innerHTML = '<div class="loading">No quantum backends available</div>';
        return;
    }
    
    backendsContainer.innerHTML = backends.map(backend => {
        const statusClass = backend.status === 'active' ? 'active' : 'inactive';
        
        return `
            <div class="quantum-card ${backend.operational ? 'glow' : ''}">
                <div class="header">
                    <span class="name">${backend.name}</span>
                    <span class="status ${statusClass}">${backend.status}</span>
                </div>
                <div class="info">
                    <div>
                        <span class="label">Pending Jobs:</span>
                        <span class="value">${backend.pending_jobs}</span>
                    </div>
                    <div>
                        <span class="label">Operational:</span>
                        <span class="value">${backend.operational ? 'Yes' : 'No'}</span>
                    </div>
                </div>
                ${backend.visualization ? `
                <div class="visualization">
                    <img src="data:image/png;base64,${backend.visualization}" alt="Quantum state visualization">
                </div>` : ''}
            </div>
        `;
    }).join('');
}

// Update jobs table in the UI
function updateJobsUI(jobs) {
    const jobsBody = document.getElementById('jobs-body');
    
    if (!jobs || jobs.length === 0) {
        jobsBody.innerHTML = '<tr><td colspan="6" class="loading">No quantum jobs available</td></tr>';
        return;
    }
    
    jobsBody.innerHTML = jobs.map(job => {
        const statusClass = job.status === 'RUNNING' ? 'running' : 
                            job.status === 'QUEUED' ? 'queued' : 
                            job.status === 'COMPLETED' ? 'completed' : 'error';
        
        const startTime = new Date(job.start_time * 1000).toLocaleString();
        const estCompletion = job.estimated_completion ? 
                              new Date(job.estimated_completion * 1000).toLocaleString() : 'N/A';
        
        return `
            <tr>
                <td>${job.id}</td>
                <td>${job.backend}</td>
                <td><span class="job-status ${statusClass}">${job.status}</span></td>
                <td>${job.qubits}</td>
                <td>${startTime}</td>
                <td>${estCompletion}</td>
            </tr>
        `;
    }).join('');
}

// Update quantum dashboard state visualizations and statistics
function updateDashboardState(dashboardState) {
    if (!dashboardState) return;
    
    // Update visualizations
    if (dashboardState.histogram_visualization) {
        document.getElementById('histogram-visualization').innerHTML = 
            `<img src="data:image/png;base64,${dashboardState.histogram_visualization}" alt="State histogram">`;
    }
    
    if (dashboardState.bloch_visualization) {
        document.getElementById('bloch-visualization').innerHTML = 
            `<img src="data:image/png;base64,${dashboardState.bloch_visualization}" alt="Bloch sphere">`;
    }
    
    // Update statistics
    if (dashboardState.metrics) {
        const metrics = dashboardState.metrics;
        
        document.getElementById('total-backends').textContent = 
            metrics.active_backends + metrics.inactive_backends || 0;
            
        document.getElementById('active-backends').textContent = 
            metrics.active_backends || 0;
            
        document.getElementById('running-jobs').textContent = 
            metrics.running_jobs || 0;
            
        document.getElementById('queued-jobs').textContent = 
            metrics.queued_jobs || 0;
    }
}

// Draw quantum circuit visualization
function drawQuantumCircuit(ctx, backends, jobs) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#1a252f';
    ctx.fillRect(0, 0, width, height);
    
    // If we have no data yet, draw placeholder
    if ((!backends || backends.length === 0) && (!jobs || jobs.length === 0)) {
        drawPlaceholder(ctx, width, height);
        return;
    }
    
    // Extract active backends for visualization
    const activeBackends = backends.filter(b => b.status === 'active' && b.operational);
    
    // Draw quantum circuit representation
    drawQuantumCircuitDiagram(ctx, width, height, activeBackends, jobs);
}

// Draw placeholder visualization
function drawPlaceholder(ctx, width, height) {
    ctx.fillStyle = CONFIG.colors.secondary;
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for quantum data...', width / 2, height / 2);
    
    // Draw pulsing circle
    const time = new Date().getTime() * 0.001;
    const radius = 50 + Math.sin(time * 2) * 10;
    
    ctx.strokeStyle = CONFIG.colors.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2 - 40, radius, 0, Math.PI * 2);
    ctx.stroke();
}

// Draw quantum circuit diagram
function drawQuantumCircuitDiagram(ctx, width, height, backends, jobs) {
    // Calculate how many qubits to represent
    const numQubits = Math.min(
        CONFIG.maxQubits, 
        Math.max(1, backends.length > 0 ? backends.length : 3)
    );
    
    const lineSpacing = height / (numQubits + 1);
    const startX = 50;
    const endX = width - 50;
    const lineWidth = endX - startX;
    
    // Draw qubit lines
    for (let i = 0; i < numQubits; i++) {
        const y = (i + 1) * lineSpacing;
        
        // Draw quantum wire
        ctx.strokeStyle = CONFIG.colors.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
        
        // Draw qubit label
        ctx.fillStyle = CONFIG.colors.secondary;
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`q${i}:`, startX - 10, y + 5);
        
        // Draw |0⟩ state
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('|0⟩', startX - 30, y + 5);
    }
    
    // Map jobs to gates on the circuit
    const runningJobs = jobs.filter(job => job.status === 'RUNNING');
    const queuedJobs = jobs.filter(job => job.status === 'QUEUED');
    
    // Draw gates for running jobs
    runningJobs.forEach((job, idx) => {
        if (idx < numQubits * 3) { // Limit the number of gates to draw
            const qubitIdx = idx % numQubits;
            const gateIdx = Math.floor(idx / numQubits);
            const gateX = startX + 80 + gateIdx * 70;
            const gateY = (qubitIdx + 1) * lineSpacing;
            
            drawQuantumGate(ctx, gateX, gateY, job);
        }
    });
    
    // Draw gates for queued jobs (with different style)
    queuedJobs.forEach((job, idx) => {
        if (idx < numQubits * 2) { // Limit the number of gates to draw
            const qubitIdx = idx % numQubits;
            const gateIdx = Math.floor(idx / numQubits) + 3; // Start after running jobs
            const gateX = startX + 80 + gateIdx * 70;
            const gateY = (qubitIdx + 1) * lineSpacing;
            
            drawQuantumGate(ctx, gateX, gateY, job, true);
        }
    });
    
    // Draw Hadamard gates at the beginning
    for (let i = 0; i < numQubits; i++) {
        const y = (i + 1) * lineSpacing;
        drawHadamardGate(ctx, startX + 40, y);
    }
    
    // Draw measurement at the end for each qubit
    for (let i = 0; i < numQubits; i++) {
        const y = (i + 1) * lineSpacing;
        drawMeasurement(ctx, endX - 30, y);
    }
    
    // Draw entanglement (CNOT gates) between qubits
    if (numQubits >= 2) {
        drawCNOTGate(ctx, startX + 120, lineSpacing, 2 * lineSpacing);
    }
    if (numQubits >= 3) {
        drawCNOTGate(ctx, startX + 180, 2 * lineSpacing, 3 * lineSpacing);
    }
}

// Draw a Hadamard gate
function drawHadamardGate(ctx, x, y) {
    const gateSize = 30;
    const halfSize = gateSize / 2;
    
    // Draw gate box
    ctx.fillStyle = CONFIG.colors.primary;
    ctx.fillRect(x - halfSize, y - halfSize, gateSize, gateSize);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - halfSize, y - halfSize, gateSize, gateSize);
    
    // Draw 'H' symbol
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', x, y);
}

// Draw a CNOT gate (controlled-X)
function drawCNOTGate(ctx, x, controlY, targetY) {
    // Draw vertical line connecting control and target
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, controlY);
    ctx.lineTo(x, targetY);
    ctx.stroke();
    
    // Draw control point (filled circle)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, controlY, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw target (circle with plus)
    ctx.beginPath();
    ctx.arc(x, targetY, 15, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw plus in the target
    ctx.beginPath();
    ctx.moveTo(x - 10, targetY);
    ctx.lineTo(x + 10, targetY);
    ctx.moveTo(x, targetY - 10);
    ctx.lineTo(x, targetY + 10);
    ctx.stroke();
}

// Draw a quantum gate
function drawQuantumGate(ctx, x, y, job, isQueued = false) {
    const gateSize = 30;
    const halfSize = gateSize / 2;
    
    // Choose gate color based on job status
    let gateColor;
    if (isQueued) {
        gateColor = CONFIG.colors.warning;
        ctx.globalAlpha = 0.7; // Semi-transparent for queued jobs
    } else {
        gateColor = CONFIG.colors.success;
        ctx.globalAlpha = 1.0;
    }
    
    // Draw gate box
    ctx.fillStyle = gateColor;
    ctx.fillRect(x - halfSize, y - halfSize, gateSize, gateSize);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(x - halfSize, y - halfSize, gateSize, gateSize);
    
    // Draw gate label
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Use first letter of backend as the gate symbol
    const gateSymbol = job.backend.charAt(job.backend.indexOf('_') + 1).toUpperCase();
    ctx.fillText(gateSymbol, x, y);
    
    // Reset alpha
    ctx.globalAlpha = 1.0;
}

// Draw a measurement symbol
function drawMeasurement(ctx, x, y) {
    const size = 30;
    const halfSize = size / 2;
    
    // Draw measurement symbol (simplified meter)
    ctx.strokeStyle = CONFIG.colors.secondary;
    ctx.fillStyle = 'rgba(155, 89, 182, 0.3)';
    ctx.lineWidth = 2;
    
    // Draw meter body
    ctx.beginPath();
    ctx.arc(x, y, halfSize, Math.PI * 0.75, Math.PI * 0.25, true);
    ctx.lineTo(x - halfSize * 0.7, y + halfSize * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw meter needle
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + halfSize * 0.6, y - halfSize * 0.2);
    ctx.stroke();
    
    // Draw vertical line to classical bit
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, y + halfSize);
    ctx.lineTo(x, y + size);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Setup manual refresh functionality
function setupManualRefresh() {
    // Add refresh functionality to all refresh buttons
    document.querySelectorAll('[data-action*="refresh"]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const action = button.getAttribute('data-action');
            handleRefreshAction(action);
        });
    });
    
    // Add global refresh button if it exists
    const globalRefreshBtn = document.getElementById('global-refresh');
    if (globalRefreshBtn) {
        globalRefreshBtn.addEventListener('click', () => {
            fetchData();
        });
    }
}

// Handle refresh actions
function handleRefreshAction(action) {
    switch (action) {
        case 'refresh-backends':
            fetchBackends();
            break;
        case 'refresh-jobs':
            fetchJobs();
            break;
        case 'refresh-results':
            fetchResults();
            break;
        case 'refresh-entanglement':
            fetchEntanglement();
            break;
        case 'refresh-quantum-state':
            fetchQuantumState();
            break;
        case 'refresh-performance':
            fetchPerformance();
            break;
        default:
            fetchData(); // Full refresh
    }
}

// Individual fetch functions for specific data
async function fetchBackends() {
    try {
        const response = await fetch('/api/backends');
        const data = await response.json();
        if (data.success) {
            updateBackendsUI(data.backends);
        }
    } catch (error) {
        console.error('Error fetching backends:', error);
    }
}

async function fetchJobs() {
    try {
        const response = await fetch('/api/jobs');
        const data = await response.json();
        if (data.success) {
            updateJobsUI(data.jobs);
        }
    } catch (error) {
        console.error('Error fetching jobs:', error);
    }
}

async function fetchResults() {
    try {
        const response = await fetch('/api/results');
        const data = await response.json();
        if (data.success) {
            updateResultsUI(data.results);
        }
    } catch (error) {
        console.error('Error fetching results:', error);
    }
}

async function fetchEntanglement() {
    try {
        const response = await fetch('/api/entanglement');
        const data = await response.json();
        if (data.success) {
            updateEntanglementUI(data);
        }
    } catch (error) {
        console.error('Error fetching entanglement:', error);
    }
}

async function fetchQuantumState() {
    try {
        const response = await fetch('/api/quantum_state');
        const data = await response.json();
        if (data.success) {
            updateQuantumStateUI(data);
        }
    } catch (error) {
        console.error('Error fetching quantum state:', error);
    }
}

async function fetchPerformance() {
    try {
        const response = await fetch('/api/performance');
        const data = await response.json();
        if (data.success) {
            updatePerformanceUI(data);
        }
    } catch (error) {
        console.error('Error fetching performance:', error);
    }
}
