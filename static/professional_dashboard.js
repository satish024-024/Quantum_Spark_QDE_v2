// Professional Quantum Dashboard JavaScript
class ProfessionalDashboard {
    constructor() {
        this.state = {
            backends: [],
            jobs: [],
            metrics: {},
            isConnected: false,
            notifications: []
        };
        
        this.widgets = new Map();
        this.sortable = null;
        this.notificationTimeout = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeWidgets();
        this.setupDragAndDrop();
        this.loadInitialData();
        this.setupNotifications();
    }

    setupEventListeners() {
        // Customization panel
        document.getElementById('customize-btn').addEventListener('click', () => {
            this.toggleCustomizationPanel();
        });

        document.getElementById('close-customization').addEventListener('click', () => {
            this.toggleCustomizationPanel();
        });

        // Refresh all button
        document.getElementById('refresh-all-btn').addEventListener('click', () => {
            this.refreshAllWidgets();
        });

        // Widget controls
        document.addEventListener('click', (e) => {
            if (e.target.closest('.widget-btn')) {
                const button = e.target.closest('.widget-btn');
                const action = button.getAttribute('data-action');
                const widget = button.closest('.widget');
                
                this.handleWidgetAction(widget, action);
            }
        });

        // Add widget buttons in customization panel
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="add"]')) {
                const button = e.target.closest('[data-action="add"]');
                const widgetType = button.closest('.widget-item').getAttribute('data-widget');
                this.addWidget(widgetType);
            }
        });
    }

    initializeWidgets() {
        // Initialize all existing widgets
        const existingWidgets = document.querySelectorAll('.widget');
        existingWidgets.forEach(widget => {
            const widgetType = widget.getAttribute('data-widget');
            this.widgets.set(widgetType, widget);
        });
    }

    setupDragAndDrop() {
        const widgetGrid = document.getElementById('widget-grid');
        
        this.sortable = new Sortable(widgetGrid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: (evt) => {
                this.saveWidgetOrder();
            }
        });
    }

    setupNotifications() {
        // Setup Server-Sent Events for real-time notifications
        this.setupSSE();
    }

    setupSSE() {
        // Create EventSource for real-time notifications
        this.eventSource = new EventSource('/api/notifications');
        
        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleNotification(data);
            } catch (error) {
                console.error('Error parsing notification:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            // Reconnect after 5 seconds
            setTimeout(() => {
                if (this.eventSource.readyState === EventSource.CLOSED) {
                    this.setupSSE();
                }
            }, 5000);
        };
    }

    handleNotification(data) {
        switch (data.type) {
            case 'new_job':
                this.showNotification(`New job submitted: ${data.job_id}`, 'info');
                this.updateWidget('jobs');
                this.updateMetrics();
                break;
            case 'job_update':
                if (data.new_status === 'completed') {
                    this.showNotification(`Job completed: ${data.job_id}`, 'success');
                } else if (data.new_status === 'failed') {
                    this.showNotification(`Job failed: ${data.job_id}`, 'error');
                } else {
                    this.showNotification(`Job ${data.job_id} status: ${data.new_status}`, 'info');
                }
                this.updateWidget('jobs');
                this.updateMetrics();
                break;
            case 'error':
                this.showNotification(`Error: ${data.message}`, 'error');
                break;
        }
    }

    async loadInitialData() {
        try {
            await this.fetchDashboardData();
            this.updateMetrics();
            this.updateAllWidgets();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Failed to load dashboard data', 'error');
        }
    }

    async fetchDashboardData() {
        const response = await fetch('/api/dashboard_state');
        const data = await response.json();
        
        if (data.success) {
            this.state = {
                ...this.state,
                backends: data.backends || [],
                jobs: data.jobs || [],
                metrics: data.metrics || {},
                isConnected: data.connected || false
            };
            
            this.updateConnectionStatus(data.connected);
        } else {
            throw new Error(data.message || 'Failed to fetch dashboard data');
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        if (connected) {
            statusElement.className = 'connection-status';
            statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Connected to IBM Quantum</span>';
        } else {
            statusElement.className = 'connection-status disconnected';
            statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Disconnected</span>';
        }
    }

    updateMetrics() {
        const metrics = this.state.metrics;
        
        document.getElementById('active-backends').textContent = 
            this.state.backends.filter(b => b.status === 'active').length;
        document.getElementById('total-jobs').textContent = this.state.jobs.length;
        document.getElementById('running-jobs').textContent = 
            this.state.jobs.filter(j => j.status === 'running').length;
        
        const successRate = this.calculateSuccessRate();
        document.getElementById('success-rate').textContent = `${successRate}%`;
    }

    calculateSuccessRate() {
        const completedJobs = this.state.jobs.filter(j => j.status === 'completed');
        const successfulJobs = completedJobs.filter(j => j.result && !j.error);
        return completedJobs.length > 0 ? Math.round((successfulJobs.length / completedJobs.length) * 100) : 0;
    }

    async updateAllWidgets() {
        const widgets = ['backends', 'jobs', 'bloch-sphere', 'circuit', 'performance', 'entanglement'];
        
        for (const widgetType of widgets) {
            if (this.widgets.has(widgetType)) {
                await this.updateWidget(widgetType);
            }
        }
    }

    async updateWidget(widgetType) {
        const widget = this.widgets.get(widgetType);
        if (!widget) return;

        const loadingElement = widget.querySelector('.loading');
        const contentElement = widget.querySelector(`#${widgetType}-content, #${widgetType.replace('-', '-')}-content`);

        // Show loading
        if (loadingElement) loadingElement.style.display = 'flex';
        if (contentElement) contentElement.style.display = 'none';

        try {
            switch (widgetType) {
                case 'backends':
                    await this.updateBackendsWidget();
                    break;
                case 'jobs':
                    await this.updateJobsWidget();
                    break;
                case 'bloch-sphere':
                    await this.updateBlochSphereWidget();
                    break;
                case 'circuit':
                    await this.updateCircuitWidget();
                    break;
                case 'performance':
                    await this.updatePerformanceWidget();
                    break;
                case 'entanglement':
                    await this.updateEntanglementWidget();
                    break;
            }

            // Hide loading and show content
            if (loadingElement) loadingElement.style.display = 'none';
            if (contentElement) contentElement.style.display = 'block';

        } catch (error) {
            console.error(`Error updating ${widgetType} widget:`, error);
            if (loadingElement) {
                loadingElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span style="margin-left: 0.5rem;">Error loading data</span>';
            }
        }
    }

    async updateBackendsWidget() {
        const contentElement = document.getElementById('backends-content');
        if (!contentElement) return;

        const backends = this.state.backends;
        
        if (backends.length === 0) {
            contentElement.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No backends available</p>';
            return;
        }

        const backendsHtml = backends.map(backend => `
            <div style="padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--border-radius); margin-bottom: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <h4 style="margin: 0; color: var(--text-primary);">${backend.name}</h4>
                    <span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; background: ${this.getStatusColor(backend.status)}; color: white;">
                        ${backend.status}
                    </span>
                </div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">
                    <div>Qubits: ${backend.num_qubits || 'N/A'}</div>
                    <div>Queue: ${backend.queue || backend.queue_length || backend.pending_jobs || 0} jobs</div>
                </div>
            </div>
        `).join('');

        contentElement.innerHTML = backendsHtml;
    }

    async updateJobsWidget() {
        const contentElement = document.getElementById('jobs-content');
        if (!contentElement) return;

        const jobs = this.state.jobs;
        
        if (jobs.length === 0) {
            contentElement.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No jobs found</p>';
            return;
        }

        const jobsHtml = jobs.slice(0, 5).map(job => `
            <div style="padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--border-radius); margin-bottom: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <h4 style="margin: 0; color: var(--text-primary); font-size: 0.875rem;">${job.job_id || 'Unknown Job'}</h4>
                    <span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; background: ${this.getJobStatusColor(job.status)}; color: white;">
                        ${job.status}
                    </span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">
                    <div>Backend: ${job.backend || 'N/A'}</div>
                    <div>Created: ${new Date(job.creation_date || Date.now()).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');

        contentElement.innerHTML = jobsHtml;
    }

    async updateBlochSphereWidget() {
        const contentElement = document.getElementById('bloch-content');
        if (!contentElement) return;

        try {
            // Fetch real quantum state data from API
            const response = await fetch('/api/quantum_state');
            const data = await response.json();
            
            if (data.success && data.state_data) {
                const stateData = data.state_data;
                
                // Create 3D Bloch sphere using real quantum state data
                const x = stateData.x || [0];
                const y = stateData.y || [0];
                const z = stateData.z || [1];
                
                // Create sphere surface
                const sphereData = this.createBlochSphere();
                
                // Add quantum state point
                const statePoint = {
                    type: 'scatter3d',
                    mode: 'markers',
                    x: x,
                    y: y,
                    z: z,
                    marker: {
                        size: 12,
                        color: 'red',
                        symbol: 'circle',
                        line: { color: 'white', width: 2 }
                    },
                    name: 'Quantum State',
                    text: [`|ψ⟩ = ${stateData.alpha || 'α'}|0⟩ + ${stateData.beta || 'β'}|1⟩`],
                    hovertemplate: '<b>Quantum State</b><br>%{text}<br>X: %{x:.3f}<br>Y: %{y:.3f}<br>Z: %{z:.3f}<extra></extra>'
                };

                const plotData = [...sphereData, statePoint];

                const layout = {
                    title: {
                        text: '3D Bloch Sphere',
                        font: { size: 14 }
                    },
                    scene: {
                        xaxis: { 
                            title: 'X', 
                            range: [-1.2, 1.2],
                            showgrid: true,
                            gridcolor: 'rgba(128,128,128,0.3)'
                        },
                        yaxis: { 
                            title: 'Y', 
                            range: [-1.2, 1.2],
                            showgrid: true,
                            gridcolor: 'rgba(128,128,128,0.3)'
                        },
                        zaxis: { 
                            title: 'Z', 
                            range: [-1.2, 1.2],
                            showgrid: true,
                            gridcolor: 'rgba(128,128,128,0.3)'
                        },
                        aspectmode: 'cube',
                        camera: {
                            eye: { x: 1.5, y: 1.5, z: 1.5 }
                        }
                    },
                    margin: { t: 40, b: 0, l: 0, r: 0 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent'
                };

                const config = {
                    responsive: true,
                    displayModeBar: false
                };

                Plotly.newPlot(contentElement, plotData, layout, config);
            } else {
                // Show no data message
                contentElement.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No quantum state data available</p>';
            }
        } catch (error) {
            console.error('Error fetching quantum state data:', error);
            contentElement.innerHTML = '<p style="text-align: center; color: var(--danger-color);">Error loading quantum state data</p>';
        }
    }

    async updateCircuitWidget() {
        const contentElement = document.getElementById('circuit-content');
        if (!contentElement) return;

        try {
            // Fetch real circuit data from API
            const response = await fetch('/api/quantum_circuit');
            const data = await response.json();
            
            if (data.success && data.circuit_data) {
                const circuitData = data.circuit_data;
                
                const plotData = [{
                    type: 'scatter',
                    mode: 'lines+markers',
                    x: circuitData.x || [],
                    y: circuitData.y || [],
                    line: { color: 'blue', width: 2 },
                    marker: { size: 8, color: 'red' },
                    name: 'Quantum Circuit'
                }];

                const layout = {
                    title: 'Quantum Circuit Visualization',
                    xaxis: { title: 'Time Steps' },
                    yaxis: { title: 'Qubits' },
                    margin: { t: 30, b: 30, l: 30, r: 30 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent'
                };

                const config = {
                    responsive: true,
                    displayModeBar: false
                };

                Plotly.newPlot(contentElement, plotData, layout, config);
            } else {
                // Show no data message
                contentElement.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No circuit data available</p>';
            }
        } catch (error) {
            console.error('Error fetching circuit data:', error);
            contentElement.innerHTML = '<p style="text-align: center; color: var(--danger-color);">Error loading circuit data</p>';
        }
    }

    async updatePerformanceWidget() {
        const contentElement = document.getElementById('performance-content');
        if (!contentElement) return;

        try {
            // Fetch real performance data from API
            const response = await fetch('/api/performance');
            const data = await response.json();
            
            if (data.success && data.performance_data) {
                const performanceData = data.performance_data;
                
                const plotData = [{
                    type: 'scatter',
                    mode: 'lines',
                    x: performanceData.timestamps || [],
                    y: performanceData.values || [],
                    line: { color: 'green', width: 2 },
                    name: 'Performance'
                }];

                const layout = {
                    title: 'Performance Metrics',
                    xaxis: { title: 'Time' },
                    yaxis: { title: 'Value' },
                    margin: { t: 30, b: 30, l: 30, r: 30 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent'
                };

                const config = {
                    responsive: true,
                    displayModeBar: false
                };

                Plotly.newPlot(contentElement, plotData, layout, config);
            } else {
                // Show no data message
                contentElement.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No performance data available</p>';
            }
        } catch (error) {
            console.error('Error fetching performance data:', error);
            contentElement.innerHTML = '<p style="text-align: center; color: var(--danger-color);">Error loading performance data</p>';
        }
    }

    async updateEntanglementWidget() {
        const contentElement = document.getElementById('entanglement-content');
        if (!contentElement) return;

        try {
            // Fetch real entanglement data from API
            const response = await fetch('/api/entanglement');
            const data = await response.json();
            
            if (data.success && data.entanglement_data) {
                const entanglementData = data.entanglement_data;
                
                const plotData = [{
                    type: 'bar',
                    x: entanglementData.labels || [],
                    y: entanglementData.values || [],
                    marker: { color: 'purple' },
                    name: 'Entanglement'
                }];

                const layout = {
                    title: 'Entanglement Analysis',
                    xaxis: { title: 'Qubit Pairs' },
                    yaxis: { title: 'Entanglement Value' },
                    margin: { t: 30, b: 30, l: 30, r: 30 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent'
                };

                const config = {
                    responsive: true,
                    displayModeBar: false
                };

                Plotly.newPlot(contentElement, plotData, layout, config);
            } else {
                // Show no data message
                contentElement.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No entanglement data available</p>';
            }
        } catch (error) {
            console.error('Error fetching entanglement data:', error);
            contentElement.innerHTML = '<p style="text-align: center; color: var(--danger-color);">Error loading entanglement data</p>';
        }
    }

    createBlochSphere() {
        // Create a wireframe sphere for the Bloch sphere
        const phi = [];
        const theta = [];
        const x = [];
        const y = [];
        const z = [];
        
        const n = 20;
        for (let i = 0; i <= n; i++) {
            for (let j = 0; j <= n; j++) {
                const t = (i / n) * Math.PI;
                const p = (j / n) * 2 * Math.PI;
                
                phi.push(p);
                theta.push(t);
                x.push(Math.sin(t) * Math.cos(p));
                y.push(Math.sin(t) * Math.sin(p));
                z.push(Math.cos(t));
            }
        }
        
        return [{
            type: 'scatter3d',
            mode: 'markers',
            x: x,
            y: y,
            z: z,
            marker: {
                size: 1,
                color: 'rgba(100,100,100,0.3)',
                symbol: 'circle'
            },
            name: 'Bloch Sphere',
            showlegend: false,
            hoverinfo: 'skip'
        }];
    }

    handleWidgetAction(widget, action) {
        const widgetType = widget.getAttribute('data-widget');
        
        switch (action) {
            case 'refresh':
                this.updateWidget(widgetType);
                break;
            case 'expand':
                this.expandWidget(widget);
                break;
            case 'fullscreen':
                this.fullscreenWidget(widget);
                break;
            case 'remove':
                this.removeWidget(widget);
                break;
        }
    }

    expandWidget(widget) {
        widget.classList.toggle('expanded');
        
        // Re-render Plotly charts when expanded
        if (widget.classList.contains('expanded')) {
            setTimeout(() => {
                const plotlyDivs = widget.querySelectorAll('.plotly-graph-div');
                plotlyDivs.forEach(div => {
                    Plotly.Plots.resize(div);
                });
            }, 100);
        }
    }

    fullscreenWidget(widget) {
        widget.classList.toggle('fullscreen');
        
        // Re-render Plotly charts when fullscreen
        if (widget.classList.contains('fullscreen')) {
            setTimeout(() => {
                const plotlyDivs = widget.querySelectorAll('.plotly-graph-div');
                plotlyDivs.forEach(div => {
                    Plotly.Plots.resize(div);
                });
            }, 100);
        }
    }

    removeWidget(widget) {
        const widgetType = widget.getAttribute('data-widget');
        this.widgets.delete(widgetType);
        widget.remove();
        this.saveWidgetOrder();
    }

    addWidget(widgetType) {
        if (this.widgets.has(widgetType)) {
            this.showNotification('Widget already exists', 'warning');
            return;
        }

        // Create widget HTML based on type
        const widgetHtml = this.createWidgetHtml(widgetType);
        const widgetElement = document.createElement('div');
        widgetElement.innerHTML = widgetHtml;
        const widget = widgetElement.firstElementChild;

        // Add to grid
        document.getElementById('widget-grid').appendChild(widget);
        this.widgets.set(widgetType, widget);

        // Update the widget
        this.updateWidget(widgetType);
        this.saveWidgetOrder();
        
        this.showNotification(`Added ${widgetType} widget`, 'success');
    }

    createWidgetHtml(widgetType) {
        const widgetTemplates = {
            'backends': {
                title: 'Quantum Backends',
                icon: 'fas fa-server',
                contentId: 'backends-content'
            },
            'jobs': {
                title: 'Quantum Jobs',
                icon: 'fas fa-tasks',
                contentId: 'jobs-content'
            },
            'bloch-sphere': {
                title: '3D Bloch Sphere',
                icon: 'fas fa-globe',
                contentId: 'bloch-content',
                isVisualization: true
            },
            'circuit': {
                title: 'Quantum Circuit',
                icon: 'fas fa-project-diagram',
                contentId: 'circuit-content',
                isVisualization: true
            },
            'performance': {
                title: 'Performance',
                icon: 'fas fa-chart-line',
                contentId: 'performance-content',
                isVisualization: true
            },
            'entanglement': {
                title: 'Entanglement Analysis',
                icon: 'fas fa-link',
                contentId: 'entanglement-content',
                isVisualization: true
            }
        };

        const template = widgetTemplates[widgetType];
        if (!template) return '';

        const contentClass = template.isVisualization ? 'visualization-container' : '';
        
        return `
            <div class="widget" data-widget="${widgetType}">
                <div class="widget-header">
                    <h3 class="widget-title">
                        <i class="${template.icon}"></i>
                        ${template.title}
                    </h3>
                    <div class="widget-controls">
                        <button class="widget-btn" data-action="refresh" title="Refresh">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="widget-btn" data-action="expand" title="Expand">
                            <i class="fas fa-expand"></i>
                        </button>
                        <button class="widget-btn" data-action="fullscreen" title="Fullscreen">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button class="widget-btn" data-action="remove" title="Remove">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="widget-content">
                    <div class="loading" id="${widgetType}-loading">
                        <div class="spinner"></div>
                        <span style="margin-left: 0.5rem;">Loading ${template.title.toLowerCase()}...</span>
                    </div>
                    <div class="${contentClass}" id="${template.contentId}" style="display: none;">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    toggleCustomizationPanel() {
        const panel = document.getElementById('customization-panel');
        panel.classList.toggle('open');
    }

    async refreshAllWidgets() {
        this.showNotification('Refreshing all widgets...', 'info');
        await this.fetchDashboardData();
        this.updateMetrics();
        await this.updateAllWidgets();
        this.showNotification('All widgets refreshed', 'success');
    }


    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = this.getNotificationIcon(type);
        notification.innerHTML = `
            <i class="${icon}"></i>
            <div>
                <div style="font-weight: 500;">${message}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">${new Date().toLocaleTimeString()}</div>
            </div>
        `;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-circle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    getStatusColor(status) {
        const colors = {
            'active': 'var(--success-color)',
            'inactive': 'var(--secondary-color)',
            'maintenance': 'var(--warning-color)',
            'error': 'var(--danger-color)'
        };
        return colors[status] || colors.inactive;
    }

    getJobStatusColor(status) {
        const colors = {
            'completed': 'var(--success-color)',
            'running': 'var(--primary-color)',
            'queued': 'var(--warning-color)',
            'failed': 'var(--danger-color)',
            'cancelled': 'var(--secondary-color)'
        };
        return colors[status] || colors.queued;
    }

    saveWidgetOrder() {
        const widgetOrder = Array.from(document.querySelectorAll('.widget')).map(widget => 
            widget.getAttribute('data-widget')
        );
        localStorage.setItem('quantum-dashboard-widget-order', JSON.stringify(widgetOrder));
    }

    loadWidgetOrder() {
        const savedOrder = localStorage.getItem('quantum-dashboard-widget-order');
        if (savedOrder) {
            try {
                const order = JSON.parse(savedOrder);
                const widgetGrid = document.getElementById('widget-grid');
                const widgets = Array.from(widgetGrid.children);
                
                // Reorder widgets based on saved order
                order.forEach(widgetType => {
                    const widget = widgets.find(w => w.getAttribute('data-widget') === widgetType);
                    if (widget) {
                        widgetGrid.appendChild(widget);
                    }
                });
            } catch (error) {
                console.error('Error loading widget order:', error);
            }
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new ProfessionalDashboard();
});