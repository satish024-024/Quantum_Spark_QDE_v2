// Quantum Spark - Modern Dashboard
// Enhanced version of HackathonDashboard with modern UI features
class ModernDashboard extends HackathonDashboard {
    constructor() {
        super();
        this.modernFeatures = {
            enhancedVisualizations: true,
            realTimeUpdates: true,
            advancedMetrics: true,
            predictiveAnalytics: true
        };
        console.log('Modern Dashboard initialized with enhanced IBM Quantum data integration');
    }

    // Override fetchDashboardData to include modern-specific enhancements
    async fetchDashboardData() {
        try {
            console.log('Modern Dashboard: Fetching comprehensive IBM Quantum data with enhanced analytics...');

            // Call parent's fetchDashboardData first to get basic data
            await super.fetchDashboardData();

            // Debug: Check what data we have after parent fetch
            console.log('Modern Dashboard: After parent fetch - backends:', this.state.backends?.length || 0, 'jobs:', this.state.jobs?.length || 0);

            // Fetch additional modern-specific APIs with proper error handling
            const [
                performanceResponse,
                realtimeResponse,
                circuitDetailsResponse,
                historicalResponse,
                calibrationResponse,
                dashboardMetricsResponse
            ] = await Promise.allSettled([
                fetch('/api/performance_metrics').catch(e => ({ ok: false, error: e })),
                fetch('/api/realtime_monitoring').catch(e => ({ ok: false, error: e })),
                fetch('/api/circuit_details').catch(e => ({ ok: false, error: e })),
                fetch('/api/historical_data').catch(e => ({ ok: false, error: e })),
                fetch('/api/calibration_data').catch(e => ({ ok: false, error: e })),
                fetch('/api/dashboard_metrics').catch(e => ({ ok: false, error: e }))
            ]);

            // Process additional responses with better error handling
            const performanceData = performanceResponse.status === 'fulfilled' && performanceResponse.value.ok
                ? await performanceResponse.value.json()
                : { real_data: false, error: 'Failed to fetch performance data' };

            const realtimeData = realtimeResponse.status === 'fulfilled' && realtimeResponse.value.ok
                ? await realtimeResponse.value.json()
                : { real_data: false, error: 'Failed to fetch realtime data' };

            const circuitDetailsData = circuitDetailsResponse.status === 'fulfilled' && circuitDetailsResponse.value.ok
                ? await circuitDetailsResponse.value.json()
                : { circuit_details: [], real_data: false };

            const historicalData = historicalResponse.status === 'fulfilled' && historicalResponse.value.ok
                ? await historicalResponse.value.json()
                : { real_data: false, error: 'Failed to fetch historical data' };

            const calibrationData = calibrationResponse.status === 'fulfilled' && calibrationResponse.value.ok
                ? await calibrationResponse.value.json()
                : { real_data: false, error: 'Failed to fetch calibration data' };

            const dashboardMetricsData = dashboardMetricsResponse.status === 'fulfilled' && dashboardMetricsResponse.value.ok
                ? await dashboardMetricsResponse.value.json()
                : { real_data: false, error: 'Failed to fetch dashboard metrics' };

            // Update state with additional modern data
            this.state = {
                ...this.state,
                performance: performanceData,
                realtime: realtimeData,
                circuitDetails: circuitDetailsData.circuit_details || [],
                historical: historicalData,
                calibration: calibrationData,
                dashboardMetrics: dashboardMetricsData
            };

            // Modern-specific logging
            console.log('Modern Dashboard: Comprehensive IBM Quantum data loaded:', {
                backendsCount: this.state.backends.length,
                jobsCount: this.state.jobs.length,
                jobResultsCount: this.state.jobResults.length,
                performanceMetrics: Object.keys(this.state.performance).length,
                realtimeMetrics: Object.keys(this.state.realtime).length,
                circuitDetailsCount: this.state.circuitDetails.length,
                historicalTrends: Object.keys(this.state.historical).length,
                calibrationStatus: Object.keys(this.state.calibration).length,
                connected: this.state.isConnected
            });

            // Update enhanced metrics with modern styling
            this.updateModernMetrics();

            // Enable modern features
            this.enableModernFeatures();

            // Force update all widgets to stop loading states
            this.updateAllWidgets();

        } catch (error) {
            console.error('Modern Dashboard: Error fetching comprehensive data:', error);
            // Still try to update widgets even if some data failed
            this.updateAllWidgets();
            throw new Error('Failed to fetch comprehensive IBM Quantum data: ' + error.message);
        }
    }

    updateModernMetrics() {
        console.log('Modern Dashboard: Updating enhanced metrics with modern styling...');

        // Update basic metrics with enhanced data
        const activeBackends = this.state.backends.filter(b => b.status === 'active' || b.operational).length;
        const totalJobs = this.state.dashboardMetrics.total_jobs || this.state.jobs.length;
        const runningJobs = this.state.dashboardMetrics.running_jobs || this.state.jobs.filter(j => j.status === 'running').length;

        // Update DOM elements with modern animations
        const updateElement = (id, value, fallback = '0') => {
            const element = document.getElementById(id);
            if (element) {
                // Add modern animation effect
                element.style.transition = 'all 0.3s ease';
                element.style.transform = 'scale(0.95)';
                element.textContent = value || fallback;

                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 50);
            }
        };

        updateElement('active-backends', activeBackends);
        updateElement('total-jobs', totalJobs);
        updateElement('running-jobs', runningJobs);

        // Update success rate with enhanced calculation
        const successRate = this.calculateEnhancedSuccessRate();
        updateElement('success-rate', `${successRate}%`);

        // Update additional modern metrics
        if (this.state.dashboardMetrics.success_rate !== undefined) {
            updateElement('success-rate', `${this.state.dashboardMetrics.success_rate}%`);
        }

        // Update performance metrics with modern formatting
        if (this.state.performance && Object.keys(this.state.performance).length > 0) {
            updateElement('avg-execution-time', `${this.state.performance.average_execution_time?.toFixed(1) || 'N/A'}s`);
            updateElement('avg-queue-time', `${this.state.performance.average_queue_time?.toFixed(1) || 'N/A'}s`);
            updateElement('avg-fidelity', `${(this.state.performance.average_fidelity * 100)?.toFixed(1) || 'N/A'}%`);
        }

        // Update real-time metrics with modern styling
        if (this.state.realtime && Object.keys(this.state.realtime).length > 0) {
            updateElement('queue-position', this.state.realtime.system_status?.total_pending_jobs || '0');
            updateElement('estimated-wait', `${this.state.realtime.system_status?.average_queue_time?.toFixed(0) || 'N/A'}s`);
        }

        // Update calibration status with modern indicators
        if (this.state.calibration && Object.keys(this.state.calibration).length > 0) {
            updateElement('calibration-status', this.state.calibration.calibration_status || 'Unknown');
            updateElement('system-health', this.state.calibration.system_health?.overall_status || 'Unknown');
        }

        // Update historical trends
        if (this.state.historical && Object.keys(this.state.historical).length > 0) {
            updateElement('total-jobs-analyzed', this.state.historical.total_jobs || '0');
            updateElement('success-trend', this.state.historical.success_trend?.slice(-1)[0]?.toFixed(1) || 'N/A');
        }

        console.log('  Modern Dashboard: Enhanced metrics updated with modern styling');
    }

    enableModernFeatures() {
        // Enable modern-specific features
        this.enableRealTimeUpdates();
        this.enablePredictiveAnalytics();
        this.enableAdvancedVisualizations();

        console.log('  Modern Dashboard: Enhanced features enabled');
    }

    enableRealTimeUpdates() {
        // Set up more frequent updates for modern dashboard
        if (this.modernFeatures.realTimeUpdates) {
            this.refreshIntervalMs = 15000; // 15 seconds for modern dashboard
            this.restartAutoRefresh();
        }
    }

    enablePredictiveAnalytics() {
        if (this.modernFeatures.predictiveAnalytics) {
            // Add predictive analytics based on historical data
            this.predictJobCompletionTimes();
            this.predictBackendAvailability();
        }
    }

    enableAdvancedVisualizations() {
        if (this.modernFeatures.enhancedVisualizations) {
            // Enhance visualizations with modern styling
            this.enhanceWidgetVisualizations();
        }
    }

    predictJobCompletionTimes() {
        // Use historical data to predict job completion times
        if (this.state.historical && this.state.performance) {
            const historicalExecutionTimes = this.state.performance.execution_times || [];
            const avgExecutionTime = this.state.performance.average_execution_time;

            if (avgExecutionTime && historicalExecutionTimes.length > 0) {
                // Simple prediction based on moving average
                const predictedTime = this.calculateMovingAverage(historicalExecutionTimes.slice(-5));
                console.log(`  Predicted job completion time: ${predictedTime.toFixed(1)}s`);

                // Update prediction display if element exists
                const predictionElement = document.getElementById('predicted-completion-time');
                if (predictionElement) {
                    predictionElement.textContent = `${predictedTime.toFixed(1)}s`;
                }
            }
        }
    }

    predictBackendAvailability() {
        // Predict backend availability based on queue patterns
        if (this.state.realtime && this.state.historical) {
            const queueTimes = this.state.realtime.system_status?.average_queue_time || 0;
            const backendUsage = this.state.historical.backend_usage || {};

            // Simple availability prediction
            const totalBackends = Object.keys(backendUsage).length;
            const busyBackends = Object.values(backendUsage).filter(usage => usage > 5).length;

            const availability = totalBackends > 0 ? ((totalBackends - busyBackends) / totalBackends) * 100 : 0;
            console.log(`  Predicted backend availability: ${availability.toFixed(1)}%`);

            // Update availability display if element exists
            const availabilityElement = document.getElementById('backend-availability');
            if (availabilityElement) {
                availabilityElement.textContent = `${availability.toFixed(1)}%`;
            }
        }
    }

    calculateMovingAverage(data) {
        if (data.length === 0) return 0;
        const sum = data.reduce((a, b) => a + b, 0);
        return sum / data.length;
    }

    enhanceWidgetVisualizations() {
        // Add modern styling to widgets
        const widgets = document.querySelectorAll('.widget');
        widgets.forEach((widget, index) => {
            // Add modern gradient backgrounds
            widget.style.background = 'var(--surface-gradient)';
            widget.style.backdropFilter = 'blur(20px)';
            widget.style.border = '1px solid var(--glass-border)';

            // Add hover effects
            widget.addEventListener('mouseenter', () => {
                widget.style.transform = 'translateY(-2px)';
                widget.style.boxShadow = 'var(--shadow-glow)';
            });

            widget.addEventListener('mouseleave', () => {
                widget.style.transform = 'translateY(0)';
                widget.style.boxShadow = 'var(--shadow-deep)';
            });
        });
    }

    restartAutoRefresh() {
        // Clear existing timer
        if (this.countdownTimerId) {
            clearInterval(this.countdownTimerId);
        }

        // Restart with new interval
        this.startAutoRefresh();
    }

    // Override loadInitialData to ensure proper initialization
    async loadInitialData() {
        try {
            console.log('  Modern Dashboard: Starting initialization with enhanced features...');

            // Call parent's loadInitialData to handle basic initialization and loading screen
            await super.loadInitialData();

            // Additional modern-specific initialization
            this.enableModernFeatures();

            // Force load data if not already loaded
            await this.forceLoadData();

            // Force update all widgets to stop loading states
            this.updateAllWidgets();

            // Ensure loading screen is hidden
            this.hideLoadingScreen();
            this.hideAllLoadingStates();

            console.log('  Modern Dashboard: Initialization completed with enhanced features');
        } catch (error) {
            console.error('  Modern Dashboard: Error during initialization:', error);
            // Ensure loading screen is hidden even on error
            this.hideLoadingScreen();
            this.hideAllLoadingStates();
            // Still try to update widgets
            this.updateAllWidgets();
        }
    }

    // Override updateAllWidgets to ensure loading states are properly handled
    async updateAllWidgets() {
        console.log('  Modern Dashboard: Updating all widgets with real data...');

        try {
            // Call parent's updateAllWidgets first
            await super.updateAllWidgets();

            // Update modern-specific widgets
            this.updateModernWidgets();

            // Hide all loading states
            this.hideAllLoadingStates();

            console.log('  Modern Dashboard: All widgets updated successfully');
        } catch (error) {
            console.error('  Modern Dashboard: Error updating widgets:', error);
            // Still try to hide loading states
            this.hideAllLoadingStates();
        }
    }

    updateModernWidgets() {
        // Update backends widget
        this.updateBackendsWidget();

        // Update jobs widget
        this.updateJobsWidget();

        // Update performance widget
        this.updatePerformanceWidget();

        // Update other modern widgets
        this.updateEntanglementWidget();
        this.updateResultsWidget();
        this.updateQuantumStateWidget();
        this.updateAIChatWidget();
    }

    updateBackendsWidget() {
        const loadingElement = document.getElementById('backends-loading');
        const contentElement = document.getElementById('backends-content');

        if (loadingElement && contentElement) {
            loadingElement.style.display = 'none';
            contentElement.style.display = 'block';

            // Update content with real backend data
            const backends = this.state.backends || [];
            console.log('  Modern Dashboard: Updating backends widget with', backends.length, 'backends');

            if (backends.length > 0) {
                contentElement.innerHTML = `
                    <div class="widget-content">
                        <h4>Available Backends (${backends.length})</h4>
                        <div class="backend-list">
                            ${backends.map(backend => `
                                <div class="backend-item">
                                    <div class="backend-name">${backend.name || 'Unknown'}</div>
                                    <div class="backend-status ${backend.operational ? 'operational' : 'offline'}">
                                        ${backend.operational ? 'Operational' : 'Offline'}
                                    </div>
                                    <div class="backend-qubits">${backend.num_qubits || 0} qubits</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                // Show message if no backends available
                contentElement.innerHTML = `
                    <div class="widget-content">
                        <h4>Available Backends (0)</h4>
                        <div class="no-data-message">
                            <p>No backends available. Please check your IBM Quantum connection.</p>
                            <button class="btn btn-primary" onclick="window.dashboard.refreshData()">Refresh</button>
                        </div>
                    </div>
                `;
            }
        }
    }

    updateJobsWidget() {
        const loadingElement = document.getElementById('jobs-loading');
        const contentElement = document.getElementById('jobs-content');

        if (loadingElement && contentElement) {
            loadingElement.style.display = 'none';
            contentElement.style.display = 'block';

            // Update content with real job data
            const jobs = this.state.jobs || [];
            const runningJobs = jobs.filter(j => j.status === 'RUNNING');
            const doneJobs = jobs.filter(j => j.status === 'DONE');

            console.log('  Modern Dashboard: Updating jobs widget with', jobs.length, 'jobs');

            if (jobs.length > 0) {
                contentElement.innerHTML = `
                    <div class="widget-content">
                        <h4>Job Status (${jobs.length} total)</h4>
                        <div class="job-stats">
                            <div class="job-stat">
                                <span class="stat-label">Running:</span>
                                <span class="stat-value">${runningJobs.length}</span>
                            </div>
                            <div class="job-stat">
                                <span class="stat-label">Completed:</span>
                                <span class="stat-value">${doneJobs.length}</span>
                            </div>
                        </div>
                        <div class="recent-jobs">
                            ${jobs.slice(0, 5).map(job => `
                                <div class="job-item">
                                    <div class="job-id">${job.id || 'Unknown'}</div>
                                    <div class="job-status ${job.status?.toLowerCase()}">${job.status || 'Unknown'}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                // Show message if no jobs available
                contentElement.innerHTML = `
                    <div class="widget-content">
                        <h4>Job Status (0 total)</h4>
                        <div class="no-data-message">
                            <p>No jobs found. Submit a quantum job to see results here.</p>
                            <button class="btn btn-primary" onclick="window.dashboard.refreshData()">Refresh</button>
                        </div>
                    </div>
                `;
            }
        }
    }

    updatePerformanceWidget() {
        const loadingElement = document.getElementById('performance-loading');
        const contentElement = document.getElementById('performance-content');

        if (loadingElement && contentElement) {
            loadingElement.style.display = 'none';
            contentElement.style.display = 'block';

            // Fallback to manual rendering if global function not available
            const performance = this.state.performance || {};
            const successRate = performance.success_rate || 0;
            const avgExecutionTime = performance.avg_execution_time || 0;

            contentElement.innerHTML = `
                <div class="widget-content">
                    <h4>Performance Metrics</h4>
                    <div class="performance-stats">
                        <div class="perf-stat">
                            <span class="stat-label">Success Rate:</span>
                            <span class="stat-value">${successRate}%</span>
                        </div>
                        <div class="perf-stat">
                            <span class="stat-label">Avg Execution:</span>
                            <span class="stat-value">${avgExecutionTime}s</span>
                        </div>
                        <div class="perf-stat">
                            <span class="stat-label">Total Jobs:</span>
                            <span class="stat-value">${performance.quantum_volume || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    updateEntanglementWidget() {
        const loadingElement = document.getElementById('entanglement-loading');
        const contentElement = document.getElementById('entanglement-content');

        if (loadingElement && contentElement) {
            loadingElement.style.display = 'none';
            contentElement.style.display = 'block';

            contentElement.innerHTML = `
                <div class="widget-content">
                    <h4>Entanglement Analysis</h4>
                    <div class="entanglement-info">
                        <p>Quantum entanglement analysis tools are available for circuit analysis.</p>
                        <div class="entanglement-controls">
                            <button class="btn btn-primary">Analyze Circuit</button>
                            <button class="btn btn-secondary">View Correlations</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    updateResultsWidget() {
        const loadingElement = document.getElementById('results-loading');
        const contentElement = document.getElementById('results-content');

        if (loadingElement && contentElement) {
            loadingElement.style.display = 'none';
            contentElement.style.display = 'block';

            const jobResults = this.state.jobResults || [];

            contentElement.innerHTML = `
                <div class="widget-content">
                    <h4>Measurement Results</h4>
                    <div class="results-info">
                        <p>${jobResults.length} measurement results available</p>
                        <div class="results-controls">
                            <button class="btn btn-primary">View Results</button>
                            <button class="btn btn-secondary">Export Data</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    updateQuantumStateWidget() {
        const loadingElement = document.getElementById('quantum-state-loading');
        const contentElement = document.getElementById('quantum-state-content');

        if (loadingElement && contentElement) {
            loadingElement.style.display = 'none';
            contentElement.style.display = 'block';

            contentElement.innerHTML = `
                <div class="widget-content">
                    <h4>Quantum State</h4>
                    <div class="quantum-state-info">
                        <p>Current quantum state visualization</p>
                        <div class="state-controls">
                            <button class="btn btn-primary">Reset to |0⟩</button>
                            <button class="btn btn-secondary">Apply Gate</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    updateAIChatWidget() {
        const loadingElement = document.getElementById('ai-chat-loading');
        const contentElement = document.getElementById('ai-chat-content');

        if (loadingElement && contentElement) {
            loadingElement.style.display = 'none';
            contentElement.style.display = 'block';
        }
    }

    hideAllLoadingStates() {
        // Hide all loading states
        const loadingElements = [
            'backends-loading', 'jobs-loading', 'bloch-loading', 'circuit-loading',
            'entanglement-loading', 'results-loading', 'quantum-state-loading',
            'performance-loading', 'ai-chat-loading'
        ];

        loadingElements.forEach(id => {
            const loadingElement = document.getElementById(id);
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        });

        // Show all content elements
        const contentElements = [
            'backends-content', 'jobs-content', 'bloch-content', 'circuit-content',
            'entanglement-content', 'results-content', 'quantum-state-content',
            'performance-content', 'ai-chat-content'
        ];

        contentElements.forEach(id => {
            const contentElement = document.getElementById(id);
            if (contentElement) {
                contentElement.style.display = 'block';
            }
        });
    }

    // Add refresh method for manual data refresh
    async refreshData() {
        console.log('  Modern Dashboard: Manual data refresh requested...');
        try {
            // Force refresh all data
            await this.fetchDashboardData();
            this.updateAllWidgets();
            console.log('  Modern Dashboard: Data refresh completed');
        } catch (error) {
            console.error('  Modern Dashboard: Error during data refresh:', error);
        }
    }

    // Force load data if not already loaded
    async forceLoadData() {
        console.log('  Modern Dashboard: Force loading data...');
        try {
            // Check if we have data
            if (!this.state.backends || this.state.backends.length === 0) {
                console.log('📡 No backend data found, fetching...');
                const response = await fetch('/api/backends');
                if (response.ok) {
                    const data = await response.json();
                    this.state.backends = data.backends || data;
                    console.log('  Loaded backends:', this.state.backends.length);
                }
            }

            if (!this.state.jobs || this.state.jobs.length === 0) {
                console.log('📡 No job data found, fetching...');
                const response = await fetch('/api/jobs');
                if (response.ok) {
                    const data = await response.json();
                    this.state.jobs = data.jobs || data;
                    console.log('  Loaded jobs:', this.state.jobs.length);
                }
            }

            // Update widgets with loaded data
            this.updateAllWidgets();
            console.log('  Modern Dashboard: Force data load completed');
        } catch (error) {
            console.error('  Modern Dashboard: Error during force data load:', error);
        }
    }

    // Override AI response for modern context
    async simulateAIResponse(query) {
        // Enhanced AI responses for modern dashboard
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('performance') || lowerQuery.includes('metrics')) {
            const successRate = this.calculateEnhancedSuccessRate();
            const avgExecutionTime = this.state.performance?.average_execution_time?.toFixed(1) || 'N/A';
            return `Based on the current IBM Quantum data, your system shows a ${successRate}% success rate with an average execution time of ${avgExecutionTime} seconds. The calibration status is ${this.state.calibration?.calibration_status || 'unknown'} and system health is ${this.state.calibration?.system_health?.overall_status || 'unknown'}.`;
        } else if (lowerQuery.includes('prediction') || lowerQuery.includes('forecast')) {
            return "Using historical trends and current queue data, I can predict job completion times and backend availability. The system analyzes patterns from recent job executions to provide accurate forecasts for optimal quantum computing scheduling.";
        } else if (lowerQuery.includes('real') || lowerQuery.includes('live')) {
            return "This modern dashboard provides real-time data from IBM Quantum APIs, including live backend status, queue positions, calibration data, and performance metrics. All data is fetched directly from IBM Quantum services for maximum accuracy.";
        } else {
            return "The modern dashboard integrates comprehensive IBM Quantum data including performance metrics, real-time monitoring, calibration status, and predictive analytics. What specific aspect would you like to explore?";
        }
    }
}

// Initialize Modern Dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('  Initializing Modern Dashboard with enhanced IBM Quantum integration...');
    window.dashboard = new ModernDashboard();

    // Ensure loading screen is hidden after a timeout
    setTimeout(() => {
        console.log('  Modern Dashboard: Timeout - forcing loading screen to hide...');
        if (window.dashboard) {
            window.dashboard.hideLoadingScreen();
            window.dashboard.hideAllLoadingStates();
        }
    }, 10000); // 10 second timeout
});
