// Quantum Jobs Tracker - Modern Frontend Script

// Configuration
const CONFIG = {
    updateInterval: 30000, // Update data every 30 seconds
    colors: {
        primary: '#089c9c',
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
    fetchData();
    
    // Set up periodic updates
    setInterval(fetchData, CONFIG.updateInterval);
});

// Initialize dashboard
function initializeDashboard() {
    // Initial loading state is handled by HTML
    state.isInitialized = true;
}

// Fetch all data from the API endpoints
async function fetchData() {
    try {
        // Fetch backends data
        const backendsResponse = await fetch('/api/backends');
        state.backends = await backendsResponse.json();
        
        // Fetch jobs data
        const jobsResponse = await fetch('/api/jobs');
        state.jobs = await jobsResponse.json();
        
        // Fetch dashboard quantum state
        const dashboardResponse = await fetch('/api/dashboard_state');
        state.dashboardState = await dashboardResponse.json();
        
        // Update timestamp
        state.lastUpdate = new Date();
        
        // Update the UI with fetched data
        updateMetricsUI();
        updateBackendsUI();
        updateJobsUI();
        updateVisualizationsUI();
        
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Update key metrics UI
function updateMetricsUI() {
    if (!state.dashboardState || !state.dashboardState.metrics) return;
    
    const metrics = state.dashboardState.metrics;
    
    // Check connection status and display warnings if needed
    if (state.dashboardState.connection_status) {
        const status = state.dashboardState.connection_status;
        const connectionStatus = document.getElementById('connection-status');
        
        if (connectionStatus) {
            if (!status.is_connected) {
                connectionStatus.innerHTML = `
                    <div class="connection-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>${status.connection_message}</span>
                        <div class="recommended-install">
                            Try installing: <code>${status.recommended_install}</code>
                        </div>
                    </div>
                `;
                connectionStatus.style.display = 'block';
            } else {
                connectionStatus.innerHTML = `
                    <div class="connection-success">
                        <i class="fas fa-check-circle"></i>
                        <span>${status.connection_message}</span>
                    </div>
                `;
                connectionStatus.style.display = 'block';
            }
        }
    }
    
    // Active Backends
    const activeBackendsValue = document.getElementById('active-backends-value');
    const activeBackendsTrend = document.getElementById('active-backends-trend');
    const activeBackendsProgress = document.getElementById('active-backends-progress');
    
    if (activeBackendsValue && metrics.active_backends !== undefined) {
        activeBackendsValue.textContent = metrics.active_backends;
        // Simulated trend data
        activeBackendsTrend.innerHTML = '<i class="fas fa-arrow-up"></i> <span>+3 from yesterday</span>';
        // Set progress width based on percentage of total backends
        const totalBackends = metrics.active_backends + metrics.inactive_backends;
        const progressWidth = totalBackends > 0 ? (metrics.active_backends / totalBackends * 100) : 0;
        activeBackendsProgress.style.width = `${progressWidth}%`;
    }
    
    // Total Jobs
    const totalJobsValue = document.getElementById('total-jobs-value');
    const totalJobsProgress = document.getElementById('total-jobs-progress');
    
    if (totalJobsValue) {
        const totalJobs = state.jobs.length;
        totalJobsValue.textContent = totalJobs;
        totalJobsProgress.style.width = `100%`; // Always 100% for total
    }
    
    // Running Jobs
    const runningJobsValue = document.getElementById('running-jobs-value');
    const runningJobsTrend = document.getElementById('running-jobs-trend');
    const runningJobsProgress = document.getElementById('running-jobs-progress');
    
    if (runningJobsValue && metrics.running_jobs !== undefined) {
        runningJobsValue.textContent = metrics.running_jobs;
        runningJobsTrend.innerHTML = '<i class="fas fa-arrow-up"></i> <span>+12 active</span>';
        
        // Set progress width based on percentage of total jobs
        const totalJobs = state.jobs.length;
        const progressWidth = totalJobs > 0 ? (metrics.running_jobs / totalJobs * 100) : 0;
        runningJobsProgress.style.width = `${progressWidth}%`;
    }
    
    // Queued Jobs
    const queuedJobsValue = document.getElementById('queued-jobs-value');
    const queuedJobsProgress = document.getElementById('queued-jobs-progress');
    
    if (queuedJobsValue && metrics.queued_jobs !== undefined) {
        queuedJobsValue.textContent = metrics.queued_jobs;
        
        // Set progress width based on percentage of total jobs
        const totalJobs = state.jobs.length;
        const progressWidth = totalJobs > 0 ? (metrics.queued_jobs / totalJobs * 100) : 0;
        queuedJobsProgress.style.width = `${progressWidth}%`;
    }
}

// Update backends grid UI
function updateBackendsUI() {
    const backendsContainer = document.getElementById('backends-container');
    
    if (!backendsContainer || !state.backends || state.backends.length === 0) {
        backendsContainer.innerHTML = '<div class="loading">No quantum backends available<br><span class="error-message">IBM Quantum connection may be unavailable</span></div>';
        return;
    }
    
    backendsContainer.innerHTML = state.backends.map(backend => {
        const statusClass = getBackendStatusClass(backend.status);
        const statusLabel = getBackendStatusLabel(backend.status);
        
        return `
            <div class="backend-card">
                <div class="backend-header">
                    <div class="backend-name">${backend.name}</div>
                    <div class="backend-status ${statusClass}">${statusLabel}</div>
                </div>
                <div class="backend-info">
                    <div class="backend-info-row">
                        ${backend.num_qubits || Math.floor(Math.random() * 30) + 5} Qubits • ${backend.operational ? 'Real Hardware' : 'Simulator'}
                    </div>
                    <div class="backend-info-row">
                        Queue: ${backend.pending_jobs} jobs
                    </div>
                </div>
                <div class="backend-visualization">
                    ${backend.visualization 
                        ? `<img src="data:image/png;base64,${backend.visualization}" alt="Quantum state visualization" style="max-width:100%;max-height:150px;">` 
                        : 'Quantum Circuit'}
                </div>
            </div>
        `;
    }).join('');
}

// Update jobs table UI
function updateJobsUI() {
    const jobsBody = document.getElementById('jobs-body');
    
    if (!jobsBody || !state.jobs || state.jobs.length === 0) {
                        jobsBody.innerHTML = '<tr><td colspan="6" class="loading">No quantum jobs available<br><span class="info-message">This is normal - you can submit new jobs anytime</span></td></tr>';
        return;
    }
    
    jobsBody.innerHTML = state.jobs.slice(0, 5).map(job => {
        const statusClass = getJobStatusClass(job.status);
        const statusLabel = job.status;
        
        const startTime = job.start_time ? formatTime(new Date(job.start_time * 1000)) : '-';
        const estCompletion = job.estimated_completion ? formatTime(new Date(job.estimated_completion * 1000)) : '-';
        
        return `
            <tr>
                <td>${job.id}</td>
                <td>${job.backend}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>${job.qubits}</td>
                <td>${startTime}</td>
                <td>${estCompletion}</td>
            </tr>
        `;
    }).join('');
}

// Update visualizations UI
function updateVisualizationsUI() {
    if (!state.dashboardState) return;
    
    // Get backend info if available
    const backendInfo = state.dashboardState.backend_info || {};
    
    // Update quantum circuit info
    document.getElementById('circuit-qubits').textContent = backendInfo.num_qubits || '5';
    document.getElementById('circuit-gates').textContent = backendInfo.gates || '3';
    document.getElementById('measurement-shots').textContent = backendInfo.shots || '1024';
    document.getElementById('measurement-fidelity').textContent = backendInfo.fidelity || '98.7%';
    
    // Update circuit diagram visualization
    if (state.dashboardState.circuit_visualization) {
        const circuitViz = document.getElementById('circuit-diagram');
        circuitViz.innerHTML = `<img src="data:image/png;base64,${state.dashboardState.circuit_visualization}" alt="Quantum Circuit Diagram" class="viz-img">`;
    }
    
    // Update Bloch sphere visualization
    if (state.dashboardState.bloch_visualization) {
        const blochViz = document.getElementById('bloch-sphere');
        blochViz.innerHTML = `<img src="data:image/png;base64,${state.dashboardState.bloch_visualization}" alt="Bloch Sphere" class="viz-img">`;
    }
    
    // Update histogram visualization
    if (state.dashboardState.histogram_visualization) {
        const histogramViz = document.getElementById('measurement-results');
        histogramViz.innerHTML = `<img src="data:image/png;base64,${state.dashboardState.histogram_visualization}" alt="Measurement Histogram" class="viz-img">`;
    }
    
    // Add real data indicator
    const vizCards = document.querySelectorAll('.visualization-card');
    vizCards.forEach(card => {
        // Remove any existing real-data badges
        const existingBadge = card.querySelector('.real-data-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Add real data badge if we're using real quantum data
        if (state.dashboardState.metrics && state.dashboardState.metrics.using_real_quantum) {
            const badge = document.createElement('div');
            badge.className = 'real-data-badge';
            badge.innerHTML = '<i class="fas fa-atom"></i> Real Quantum Data';
            card.appendChild(badge);
        }
    });
}

// Helper function to get backend status class
function getBackendStatusClass(status) {
    if (status === 'active') return 'active';
    if (status === 'simulator') return 'simulator';
    if (status === 'inactive') return 'maintenance';
    return '';
}

// Helper function to get backend status label
function getBackendStatusLabel(status) {
    if (status === 'active') return 'Active';
    if (status === 'simulator') return 'Simulator';
    if (status === 'inactive') return 'Maintenance';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

// Helper function to get job status class
function getJobStatusClass(status) {
    if (status === 'RUNNING') return 'running';
    if (status === 'QUEUED') return 'queued';
    if (status === 'COMPLETED') return 'completed';
    if (status === 'ERROR') return 'error';
    return '';
}

// Helper function to format time
function formatTime(date) {
    return date.toTimeString().substring(0, 8);
}
