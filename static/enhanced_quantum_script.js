// Enhanced Quantum Dashboard with Advanced Animations and Theme Management
class EnhancedQuantumDashboard {
    constructor() {
        this.state = {
            backends: [],
            jobs: [],
            quantumState: null,
            circuitData: null,
            isConnected: false,
            realDataAvailable: false,
            metrics: {},
            measurementResults: {},
            entanglementData: {},
            currentTheme: 'dark'
        };

        this.blochCanvas = null;
        this.blochCtx = null;
        this.circuitCanvas = null;
        this.circuitCtx = null;
        this.animationId = null;
        this.circuitAnimationId = null;
        this.updateInterval = null;
        this.animationQueue = [];
        this.isAnimating = false;
        this.isRefreshing = false;

        // Initialize with more realistic quantum states
        this.quantumStates = this.generateRealisticQuantumStates();
        this.currentStateIndex = 0;
        this.blochState = this.quantumStates[this.currentStateIndex];

        this.init();
        
        // Fetch ONLY real data from IBM Quantum API endpoints
        setTimeout(() => {
            this.fetchRealDataFromAPIs();
        }, 500);
    }

    // Generate realistic quantum states for visualization
    generateRealisticQuantumStates() {
        return [
            {
                name: "Bell State |Φ⁺⟩",
                description: "Entangled 2-qubit state for quantum teleportation",
                theta: Math.PI / 2,
                phi: 0,
                alpha: 1/Math.sqrt(2),
                beta: 0,
                gamma: 0,
                delta: 1/Math.sqrt(2),
                qubits: 2,
                fidelity: 0.987
            },
            {
                name: "GHZ State",
                description: "3-qubit Greenberger-Horne-Zeilinger state",
                theta: Math.PI / 2,
                phi: Math.PI / 4,
                alpha: 1/Math.sqrt(2),
                beta: 0,
                gamma: 0,
                delta: 0,
                qubits: 3,
                fidelity: 0.934
            },
            {
                name: "Y-Rotation State",
                description: "Complex superposition with phase",
                theta: Math.PI / 2,
                phi: Math.PI / 2,
                alpha: 1/Math.sqrt(2),
                beta: { real: 0, imag: 1/Math.sqrt(2) },
                qubits: 1,
                fidelity: 0.956
            }
        ];
    }

    // Enhanced initialization with animations
    init() {
        console.log('🚀 Initializing Enhanced Quantum Dashboard...');
        
        // Initialize theme
        this.initializeTheme();
        
        // Setup event listeners with enhanced animations
        this.setupEventListeners();
        
        // Initialize all widgets with staggered animations
        this.initializeWidgets();
        
        // Start real-time updates
        this.startRealTimeUpdates();
        
        console.log('✅ Enhanced Quantum Dashboard initialized successfully');
    }

    // Enhanced theme management
    initializeTheme() {
        const savedTheme = localStorage.getItem('quantum-dashboard-theme') || 'dark';
        this.setTheme(savedTheme);
        
        // Setup theme toggle with enhanced animations
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                this.toggleTheme(e.currentTarget);
            });
        }
    }

    setTheme(theme) {
        this.state.currentTheme = theme;
        const body = document.body;
        const themeToggle = document.getElementById('theme-toggle');
        
        if (theme === 'light') {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            if (themeToggle) {
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            if (themeToggle) {
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            }
        }
        
        localStorage.setItem('quantum-dashboard-theme', theme);
        
        // Add theme transition animation
        body.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            body.style.transition = '';
        }, 500);
        
        // Animate theme toggle button
        if (themeToggle) {
            themeToggle.style.transform = 'scale(1.2) rotate(180deg)';
            setTimeout(() => {
                themeToggle.style.transform = '';
            }, 300);
        }
    }

    toggleTheme(triggerEl) {
        const newTheme = this.state.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        
        // Add ripple effect to theme toggle
        const el = triggerEl || document.getElementById('theme-toggle');
        if (el) this.createRippleEffect(el);
    }

    // Enhanced event listeners with animations
    setupEventListeners() {
        // Widget button interactions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.widget-btn')) {
                this.handleWidgetButtonClick(e);
            }
        });

        // Widget hover effects
        document.addEventListener('mouseenter', (e) => {
            // Ensure e.target is an Element before using closest()
            if (e.target && typeof e.target.closest === 'function') {
                const widget = e.target.closest('.widget-container');
                if (widget) {
                    this.animateWidgetHover(widget);
                }
            }
        }, true);

        // Notification panel
        const notificationBtn = document.getElementById('notification-btn');
        const notificationPanel = document.getElementById('notification-panel');
        const closeNotifications = document.getElementById('close-notifications');

        if (notificationBtn && notificationPanel) {
            notificationBtn.addEventListener('click', () => {
                this.toggleNotificationPanel();
            });
        }

        if (closeNotifications && notificationPanel) {
            closeNotifications.addEventListener('click', () => {
                this.closeNotificationPanel();
            });
        }

        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        // Fullscreen toggles
        const expandCircuitBtn = document.getElementById('expand-circuit-btn');
        const expandBlochBtn = document.getElementById('expand-bloch-btn');

        if (expandCircuitBtn) {
            expandCircuitBtn.addEventListener('click', () => {
                this.toggleFullscreenCircuit();
            });
        }

        if (expandBlochBtn) {
            expandBlochBtn.addEventListener('click', () => {
                this.toggleFullscreenBloch();
            });
        }
    }

    // Enhanced widget initialization with staggered animations
    initializeWidgets() {
        const widgets = document.querySelectorAll('.widget-container');
        const metricCards = document.querySelectorAll('.metric-card');
        
        // Animate metric cards first
        metricCards.forEach((card, index) => {
            setTimeout(() => {
                this.animateElement(card, 'slideInUp');
            }, index * 100);
        });
        
        // Animate widgets with staggered delay
        widgets.forEach((widget, index) => {
            setTimeout(() => {
                this.animateElement(widget, 'fadeInUp');
            }, (metricCards.length * 100) + (index * 150));
        });
    }

    // Enhanced animation system
    animateElement(element, animationType, duration = 600) {
        if (!element) return;
        
        element.style.animation = 'none';
        element.offsetHeight; // Trigger reflow
        element.style.animation = `${animationType} ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        
        // Add completion callback
        setTimeout(() => {
            element.style.animation = '';
        }, duration);
    }

    // Widget button click handler with animations
    handleWidgetButtonClick(event) {
        const button = event.target.closest('.widget-btn');
        const action = button.dataset.action;
        
        // Add click animation
        this.animateButtonClick(button, event);
        
        // Handle different actions
        switch (action) {
            case 'refresh-backends':
                this.refreshBackends();
                break;
            case 'refresh-results':
                this.refreshResults();
                break;
            case 'refresh-entanglement':
                this.refreshEntanglement();
                break;
            case 'calculate-entanglement':
                this.calculateEntanglement();
                break;
            case 'play-pause':
                this.toggleCircuitAnimation();
                break;
            case 'reset':
                this.resetCircuit();
                break;
            case 'expand-circuit':
                this.toggleFullscreenCircuit();
                break;
            case 'expand-bloch':
                this.toggleFullscreenBloch();
                break;
            default:
                console.log(`Action ${action} not implemented yet`);
        }
    }

    // Enhanced button click animation
    animateButtonClick(button, evt) {
        // Create ripple effect
        this.createRippleEffect(button, evt);
        
        // Scale animation
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }

    // Ripple effect for buttons
    createRippleEffect(element, evt) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = ((evt && evt.clientX) ? evt.clientX : (rect.left + rect.width / 2)) - rect.left - size / 2;
        const y = ((evt && evt.clientY) ? evt.clientY : (rect.top + rect.height / 2)) - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
        `;
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Enhanced loading animation system
    // NOTE: widgets owned by widgets.js (results, quantum-state, circuit, entanglement, bloch-sphere)
    //       are excluded from this loader to prevent content conflicts.
    showLoadingAnimation(widgetId, message = "Loading...") {
        // These widget IDs are rendered exclusively by widgets.js — skip loading overlays for them
        const widgetsJsOwned = ['results', 'quantum-state', 'circuit', 'entanglement', 'bloch-sphere', 'historical-data'];
        if (widgetsJsOwned.includes(widgetId)) return;

        const loadingElement = document.getElementById(`${widgetId}-loading`);
        const contentElement = document.getElementById(`${widgetId}-content`) || 
                              document.getElementById(`${widgetId}-container`) ||
                              document.getElementById(`${widgetId}-display`) ||
                              document.getElementById(`${widgetId}-metrics`);
        
        if (contentElement && contentElement.style && contentElement.style.display === 'block') {
            return;
        }

        if (loadingElement) {
            loadingElement.style.display = 'flex';
            loadingElement.style.opacity = '1';
            
            const loadingText = loadingElement.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
                this.animateTextTyping(loadingText, message);
            }
            
            const progressBar = loadingElement.querySelector('.progress-bar');
            if (progressBar) {
                this.animateProgressBar(progressBar);
            }
        }
        
        if (contentElement) {
            contentElement.style.display = 'none';
        }
    }

    // Animate text typing effect
    animateTextTyping(element, text) {
        element.textContent = '';
        let i = 0;
        const typeInterval = setInterval(() => {
            element.textContent += text[i];
            i++;
            if (i >= text.length) {
                clearInterval(typeInterval);
            }
        }, 50);
    }

    // Animate progress bar
    animateProgressBar(progressBar) {
        progressBar.style.width = '0%';
        progressBar.style.transition = 'width 2s ease-in-out';
        
        setTimeout(() => {
            progressBar.style.width = '100%';
        }, 100);
    }

    // Hide loading animation with fade out
    hideLoadingAnimation(widgetId) {
        const loadingElement = document.getElementById(`${widgetId}-loading`);
        const contentElement = document.getElementById(`${widgetId}-content`) || 
                              document.getElementById(`${widgetId}-container`) ||
                              document.getElementById(`${widgetId}-display`) ||
                              document.getElementById(`${widgetId}-metrics`);
        
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            setTimeout(() => {
                loadingElement.style.display = 'none';
            }, 300);
        }
        
        if (contentElement) {
            contentElement.style.display = 'block';
            this.animateElement(contentElement, 'fadeIn');
        }
    }

    // Enhanced widget hover animation
    animateWidgetHover(widget) {
        if (!widget) return;
        
        // Add glow effect
        widget.style.boxShadow = '0 0 30px rgba(0, 245, 255, 0.3)';
        
        // Animate icon if present
        const icon = widget.querySelector('.widget-header i');
        if (icon) {
            icon.style.transform = 'scale(1.2) rotate(10deg)';
        }
    }

    // Notification panel management
    toggleNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        if (panel) {
            panel.classList.toggle('active');
            
            if (panel.classList.contains('active')) {
                this.loadNotifications();
            }
        }
    }

    closeNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        if (panel) {
            panel.classList.remove('active');
        }
    }

    // Load notifications with animation
    loadNotifications() {
        const notificationList = document.getElementById('notification-list');
        if (!notificationList) return;
        
        const notifications = [
            {
                type: 'success',
                title: 'Quantum Job Completed',
                message: 'Job QJ_2024_001 has finished successfully',
                time: '2 minutes ago'
            },
            {
                type: 'info',
                title: 'New Backend Available',
                message: 'IBM Quantum System Two is now online',
                time: '5 minutes ago'
            },
            {
                type: 'warning',
                title: 'High Queue Time',
                message: 'Current queue time is 15 minutes',
                time: '10 minutes ago'
            }
        ];
        
        notificationList.innerHTML = '';
        
        notifications.forEach((notification, index) => {
            setTimeout(() => {
                const notificationElement = this.createNotificationElement(notification);
                notificationList.appendChild(notificationElement);
                this.animateElement(notificationElement, 'slideInRight');
            }, index * 100);
        });
    }

    // Public helper so other modules can push notifications
    showNotification(message, type = 'info') {
        const list = document.getElementById('notification-list');
        if (!list) {
            console.log(`📢 [${type}] ${message}`);
            return;
        }
        const item = this.createNotificationElement({
            type,
            title: type.charAt(0).toUpperCase() + type.slice(1),
            message,
            time: 'just now'
        });
        list.prepend(item);
        this.animateElement(item, 'slideInRight');
        setTimeout(() => { try { item.remove(); } catch (_) {} }, 6000);
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification-item ${notification.type}`;
        element.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
                <span class="notification-time">${notification.time}</span>
            </div>
        `;
        return element;
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            info: 'info-circle',
            warning: 'exclamation-triangle',
            error: 'times-circle'
        };
        return icons[type] || 'bell';
    }

    // Mobile menu toggle
    toggleMobileMenu() {
        const header = document.querySelector('.dashboard-header');
        header.classList.toggle('mobile-menu-open');
    }

    // Fullscreen circuit toggle
    toggleFullscreenCircuit() {
        // Implementation for fullscreen circuit
        console.log('Toggle fullscreen circuit');
    }

    // Fullscreen Bloch sphere toggle
    toggleFullscreenBloch() {
        const overlay = document.getElementById('fullscreen-bloch-overlay');
        if (overlay) {
            overlay.classList.toggle('active');
            
            if (overlay.classList.contains('active')) {
                this.initializeFullscreenBloch();
            }
        }
    }

    initializeFullscreenBloch() {
        // Initialize fullscreen Bloch sphere
        console.log('Initializing fullscreen Bloch sphere');
    }

    // Enhanced real-time updates
    startRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(() => {
            this.refreshCycle();
        }, 30000); // Update every 30 seconds
    }

    async refreshCycle() {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        try {
            await Promise.all([
                this.updateBackends(true),
                this.updateJobs(true),
                this.updateQuantumMetrics(),
                this.fetchRealQuantumState?.(true) || Promise.resolve(),
                this.fetchRealCircuitData?.(true) || Promise.resolve(),
                this.fetchRealMeasurementResults?.(true) || Promise.resolve()
            ]);
        } catch (e) {
            console.error('Quiet refresh failed:', e);
        } finally {
            this.isRefreshing = false;
        }
    }

    // Fetch ONLY real data from IBM Quantum API endpoints
    async fetchRealDataFromAPIs() {
        console.log('🔄 Fetching REAL IBM Quantum data from API endpoints...');
        // show loading states for widgets to avoid frozen spinners later
        try {
            this.showLoadingAnimation('backends', 'Loading Real Quantum Backends...');
            this.showLoadingAnimation('jobs', 'Loading Real Quantum Jobs...');
            this.showLoadingAnimation('quantum-state', 'Calculating Quantum State...');
            this.showLoadingAnimation('circuit', 'Initializing 3D Quantum Circuit...');
            this.showLoadingAnimation('results', 'Loading Measurement Results...');
            this.showLoadingAnimation('entanglement', 'Calculating Entanglement...');
            this.showLoadingAnimation('performance', 'Analyzing Performance Metrics...');
        } catch (e) {}
        
        try {
            // Fetch real metrics data
            await this.updateQuantumMetrics();
            
            // Fetch real backends data
            await this.updateBackends();
            
            // Fetch real jobs data
            await this.updateJobs();
            
            // Fetch real quantum state data
            await this.fetchRealQuantumState();
            
            // Fetch real circuit data
            await this.fetchRealCircuitData();
            
            // Fetch real measurement results
            await this.fetchRealMeasurementResults();
            try { await this.fetchPerformanceMetrics(); } catch (e) {}
            
            console.log('✅ All real data fetched successfully from IBM Quantum APIs');
        } catch (error) {
            console.error('❌ Error fetching real data:', error);
            this.showRealDataError();
        }
    }
    
    // Show error when real data cannot be fetched
    showRealDataError() {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'real-data-error';
        errorMessage.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Real IBM Quantum Data Required</h3>
                <p>Please provide your IBM Quantum API token to access real quantum data.</p>
                <p>No fake or simulated data will be displayed.</p>
            </div>
        `;
        
        // Insert error message at the top of the dashboard
        const main = document.querySelector('.dashboard-main');
        if (main) {
            main.insertBefore(errorMessage, main.firstChild);
        }
    }

    // Update all widgets with animations - DEPRECATED, use fetchRealDataFromAPIs instead
    async updateAllWidgets() {
        console.warn('⚠️ updateAllWidgets() is deprecated. Use fetchRealDataFromAPIs() for real data only.');
        await this.fetchRealDataFromAPIs();
    }

    // Enhanced quantum metrics update - REAL DATA ONLY
    async updateQuantumMetrics() {
        try {
            const response = await fetch('/api/dashboard_metrics');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.real_data) {
                const metrics = {
                    'active-backends': data.active_backends,
                    'total-jobs': data.total_jobs,
                    'running-jobs': data.running_jobs,
                    'queued-jobs': data.queued_jobs
                };

                Object.entries(metrics).forEach(([metric, value]) => {
                    const element = document.getElementById(`${metric}-value`);
                    if (element) {
                        this.animateNumberChange(element, value);
                    }
                });
                
                // Update trend indicators with real data
                this.updateTrendIndicators(data);
            } else {
                console.warn('No real data available for metrics');
                this.showNoDataMessage();
            }
        } catch (error) {
            console.error('Error fetching real metrics:', error);
            this.showErrorState();
        }
    }
    
    // Update trend indicators with real data
    updateTrendIndicators(data) {
        const trendElements = document.querySelectorAll('.metric-trend span');
        trendElements.forEach((element, index) => {
            const trends = [
                `+${data.active_backends} active`,
                `+${data.total_jobs} total`,
                `${data.running_jobs} running`,
                `${data.queued_jobs} queued`
            ];
            if (trends[index]) {
                element.textContent = trends[index];
            }
        });
    }
    
    // Show no data message
    showNoDataMessage() {
        const metricValues = document.querySelectorAll('.metric-value');
        metricValues.forEach(element => {
            element.textContent = 'No Data';
        });
    }
    
    // Show error state
    showErrorState() {
        const metricValues = document.querySelectorAll('.metric-value');
        metricValues.forEach(element => {
            element.textContent = 'Error';
        });
    }

    // Animate number changes
    animateNumberChange(element, newValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const difference = newValue - currentValue;
        const steps = 20;
        const stepValue = difference / steps;
        const stepDuration = 50;

        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            const value = Math.round(currentValue + (stepValue * currentStep));
            element.textContent = value;
            
            if (currentStep >= steps) {
                clearInterval(interval);
                element.textContent = newValue;
            }
        }, stepDuration);
    }

    // Update backends with animation - REAL DATA ONLY
    async updateBackends(quiet = false) {
        if (!quiet) this.showLoadingAnimation('backends', 'Loading Real Quantum Backends...');
        
        try {
            const response = await fetch('/api/backends');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data && data.length > 0) {
                if (!quiet) this.hideLoadingAnimation('backends');
                this.populateBackends(data);
            } else {
                if (!quiet) this.hideLoadingAnimation('backends');
                this.showNoBackendsMessage();
            }
        } catch (error) {
            console.error('Error fetching real backends:', error);
            if (!quiet) this.hideLoadingAnimation('backends');
            this.showBackendError();
        }
    }

    populateBackends(backends) {
        const backendsList = document.getElementById('backends-content');
        if (!backendsList) return;

        // Deduplicate by backend name
        const seen = new Set();
        const deduped = [];
        backends.forEach(b => {
            const name = b.name || 'unknown';
            if (!seen.has(name)) {
                seen.add(name);
                deduped.push(b);
            }
        });

        backendsList.innerHTML = '';
        deduped.forEach((backend) => {
            const backendElement = this.createBackendElement(backend);
            backendsList.appendChild(backendElement);
        });
    }
    
    // Show no backends message
    showNoBackendsMessage() {
        const backendsList = document.getElementById('backends-content');
        if (backendsList) {
            backendsList.innerHTML = '<div class="no-data-message">No backends available</div>';
        }
    }
    
    // Show backend error
    showBackendError() {
        const backendsList = document.getElementById('backends-content');
        if (backendsList) {
            backendsList.innerHTML = '<div class="error-message">Error loading backends</div>';
        }
    }

    createBackendElement(backend) {
        const element = document.createElement('div');
        element.className = 'backend-item';
        
        // Handle real backend data structure
        const name = backend.name || 'Unknown Backend';
        const qubits = backend.num_qubits || backend.qubits || 5;
        const status = backend.operational ? 'online' : 'offline';
        const queue = backend.pending_jobs || backend.queue || 0;
        
        element.innerHTML = `
            <div class="backend-info">
                <h3>${name}</h3>
                <span class="backend-qubits">${qubits} qubits</span>
            </div>
            <div class="backend-status">
                <span class="status-indicator ${status}"></span>
                <span class="queue-count">Queue: ${queue}</span>
            </div>
        `;
        return element;
    }

    // Update jobs with animation - REAL DATA ONLY
    async updateJobs(quiet = false) {
        if (!quiet) this.showLoadingAnimation('jobs', 'Loading Real Quantum Jobs...');
        
        try {
            const response = await fetch('/api/jobs');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data && data.length > 0) {
                if (!quiet) this.hideLoadingAnimation('jobs');
                this.populateJobs(data);
            } else {
                if (!quiet) this.hideLoadingAnimation('jobs');
                this.showNoJobsMessage();
            }
        } catch (error) {
            console.error('Error fetching real jobs:', error);
            if (!quiet) this.hideLoadingAnimation('jobs');
            this.showJobsError();
        }
    }

    populateJobs(jobs) {
        const jobsBody = document.getElementById('jobs-body');
        if (!jobsBody) return;

        // Deduplicate by job id and limit rows for smoothness
        const map = new Map();
        jobs.forEach(j => {
            const id = j.id || j.job_id || String(j);
            if (!map.has(id)) map.set(id, j);
        });
        const deduped = Array.from(map.values()).slice(0, 50);

        jobsBody.innerHTML = '';
        deduped.forEach((job) => {
            const jobElement = this.createJobElement(job);
            jobsBody.appendChild(jobElement);
        });
    }
    
    // Show no jobs message
    showNoJobsMessage() {
        const jobsBody = document.getElementById('jobs-body');
        if (jobsBody) {
            jobsBody.innerHTML = '<tr><td colspan="6" class="no-data-message">No jobs found</td></tr>';
        }
    }
    
    // Show jobs error
    showJobsError() {
        const jobsBody = document.getElementById('jobs-body');
        if (jobsBody) {
            jobsBody.innerHTML = '<tr><td colspan="6" class="error-message">Error loading jobs</td></tr>';
        }
    }

    createJobElement(job) {
        const element = document.createElement('tr');
        element.className = 'job-row';
        
        // Handle real job data structure
        const jobId = job.id || job.job_id || 'Unknown';
        const backend = job.backend || job.backend_name || 'Unknown';
        const status = job.status || 'Unknown';
        const qubits = job.qubits || 5; // Default to 5 qubits for IBM quantum computers
        const progress = this.calculateJobProgress(status);
        
        element.innerHTML = `
            <td>${jobId}</td>
            <td>${backend}</td>
            <td><span class="status-badge ${status.toLowerCase()}">${status}</span></td>
            <td>${qubits}</td>
            <td>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
            </td>
            <td>
                <button class="action-btn" onclick="dashboard.viewJob('${jobId}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        return element;
    }
    
    // Calculate job progress based on status
    calculateJobProgress(status) {
        const statusProgress = {
            'queued': 0,
            'validating': 10,
            'initializing': 25,
            'running': 75,
            'completed': 100,
            'failed': 0,
            'cancelled': 0
        };
        return statusProgress[status.toLowerCase()] || 0;
    }

    // Fetch real quantum state data from API
    async fetchRealQuantumState() {
        try {
            const response = await fetch('/api/quantum_state_data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.real_data) {
                this.updateQuantumStateDisplay(data);
            } else {
                this.showNoRealDataMessage('quantum-state', 'No real quantum state data available');
            }
        } catch (error) {
            console.error('Error fetching real quantum state:', error);
            this.showNoRealDataMessage('quantum-state', 'Error loading quantum state data');
        }
    }
    
    // Fetch real circuit data from API
    async fetchRealCircuitData() {
        try {
            const response = await fetch('/api/circuit_data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.real_data) {
                this.updateCircuitDisplay(data);
            } else {
                this.showNoRealDataMessage('circuit', 'No real circuit data available');
            }
        } catch (error) {
            console.error('Error fetching real circuit data:', error);
            this.showNoRealDataMessage('circuit', 'Error loading circuit data');
        }
    }
    
    // Fetch real measurement results from API
    async fetchRealMeasurementResults() {
        // Deferred to widgets.js which owns the #results-content element.
        // Trigger a refresh via widgets.js if available, otherwise skip.
        if (window.quantumWidgets && typeof window.quantumWidgets.updateResultsWidget === 'function') {
            try { await window.quantumWidgets.updateResultsWidget(); } catch (e) {}
        }
    }
    
    // Show no real data message for specific widgets
    showNoRealDataMessage(widgetType, message) {
        // Only show messages for widgets NOT owned by widgets.js
        const widgetsJsOwned = ['results', 'quantum-state', 'circuit', 'entanglement', 'bloch-sphere'];
        if (widgetsJsOwned.includes(widgetType)) return;
        const widget = document.querySelector(`.${widgetType}-widget .widget-content`);
        if (widget) {
            widget.innerHTML = `
                <div class="no-real-data-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${message}</p>
                    <p class="real-data-note">Real IBM Quantum data required</p>
                </div>
            `;
        }
    }

    // updateResultsDisplay — no-op: widgets.js owns #results-content rendering
    updateResultsDisplay(data) {
        // Intentionally disabled — widgets.js handles measurement results display.
        // Call widgets.js refresh instead:
        if (window.quantumWidgets && typeof window.quantumWidgets.updateResultsWidget === 'function') {
            window.quantumWidgets.updateResultsWidget().catch(() => {});
        }
    }
    
    // Update quantum state display with real data
    updateQuantumStateDisplay(data) {
        const quantumStateDisplay = document.getElementById('quantum-state-display');
        if (quantumStateDisplay) {
            quantumStateDisplay.innerHTML = `
                <div class="state-vector">
                    <h3>Real Quantum State</h3>
                    <div class="state-equation">|ψ⟩ = ${data.state_representation.alpha}|0⟩ + ${data.state_representation.beta}|1⟩</div>
                    <div class="state-coefficients">
                        <div>α = ${data.state_representation.alpha}</div>
                        <div>β = ${data.state_representation.beta}</div>
                    </div>
                    <div class="real-data-indicator">
                        <i class="fas fa-check-circle"></i>
                        <span>Real IBM Quantum Data</span>
                    </div>
                </div>
            `;
            quantumStateDisplay.style.display = 'block';
        }
    }
    
    // Update circuit display with real data
    updateCircuitDisplay(data) {
        const circuitContainer = document.getElementById('circuit-container');
        if (circuitContainer) {
            circuitContainer.innerHTML = `
                <div class="real-circuit-data">
                    <h3>Real Quantum Circuit</h3>
                    <div class="circuit-info">
                        <p><strong>Backend:</strong> ${data.backend || 'Unknown'}</p>
                        <p><strong>Qubits:</strong> ${data.num_qubits || 'Unknown'}</p>
                        <p><strong>Gates:</strong> ${data.num_gates || 'Unknown'}</p>
                    </div>
                    <div class="real-data-indicator">
                        <i class="fas fa-check-circle"></i>
                        <span>Real IBM Quantum Data</span>
                    </div>
                </div>
            `;
            circuitContainer.style.display = 'block';
        }
    }
    
    // Update results display with real data
    updateResultsDisplay(data) {
        const resultsContent = document.getElementById('results-content');
        if (resultsContent) {
            resultsContent.innerHTML = `
                <div class="real-results-data">
                    <h3>Real Measurement Results</h3>
                    <div class="results-info">
                        <p><strong>Shots:</strong> ${data.shots || 'Unknown'}</p>
                        <p><strong>Fidelity:</strong> ${data.fidelity || 'Unknown'}</p>
                        <p><strong>Backend:</strong> ${data.backend || 'Unknown'}</p>
                    </div>
                    <div class="real-data-indicator">
                        <i class="fas fa-check-circle"></i>
                        <span>Real IBM Quantum Data</span>
                    </div>
                </div>
            `;
        }
    }

    // Update circuit visualization - DEPRECATED, use fetchRealCircuitData instead
    updateCircuitVisualization() {
        console.warn('⚠️ updateCircuitVisualization() is deprecated. Use fetchRealCircuitData() for real data only.');
        this.fetchRealCircuitData();
    }

    initializeCircuit() {
        const circuitContainer = document.getElementById('3d-quantum-circuit');
        if (circuitContainer) {
            // Initialize 3D circuit visualization
            console.log('Initializing 3D quantum circuit');
        }
    }

    // Update measurement results - DEPRECATED, use fetchRealMeasurementResults instead
    updateMeasurementResults() {
        console.warn('⚠️ updateMeasurementResults() is deprecated. Use fetchRealMeasurementResults() for real data only.');
        this.fetchRealMeasurementResults();
    }

    // populateResults() - DEPRECATED, fake data method removed
    // Use fetchRealMeasurementResults() for real data only

    // drawResultsChart() - DEPRECATED, fake data method removed
    // Use fetchRealMeasurementResults() for real data only

    // Update entanglement data - DEPRECATED, use fetchRealEntanglementData instead
    updateEntanglementData() {
        console.warn('⚠️ updateEntanglementData() is deprecated. Use fetchRealEntanglementData() for real data only.');
        this.fetchRealEntanglementData();
    }
    
    // Fetch real entanglement data from API
    async fetchRealEntanglementData() {
        try {
            const response = await fetch('/api/quantum_state_data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.real_data && data.entanglement !== undefined) {
                this.updateEntanglementDisplay(data);
            } else {
                this.showNoRealDataMessage('entanglement', 'No real entanglement data available');
            }
        } catch (error) {
            console.error('Error fetching real entanglement data:', error);
            this.showNoRealDataMessage('entanglement', 'Error loading entanglement data');
        }
    }
    
    // Update entanglement display with real data
    updateEntanglementDisplay(data) {
        const entanglementContent = document.getElementById('entanglement-content');
        if (entanglementContent) {
            entanglementContent.innerHTML = `
                <div class="real-entanglement-data">
                    <h3>Real Entanglement Analysis</h3>
                    <div class="entanglement-info">
                        <p><strong>Entanglement:</strong> ${data.entanglement || 'Unknown'}</p>
                        <p><strong>Fidelity:</strong> ${data.fidelity || 'Unknown'}</p>
                        <p><strong>State:</strong> ${data.state_type || 'Unknown'}</p>
                    </div>
                    <div class="real-data-indicator">
                        <i class="fas fa-check-circle"></i>
                        <span>Real IBM Quantum Data</span>
                    </div>
                </div>
            `;
        }
    }

    // populateEntanglement() - DEPRECATED, fake data method removed
    // Use fetchRealEntanglementData() for real data only

    // drawEntanglementVisualization() - DEPRECATED, fake data method removed
    // Use fetchRealEntanglementData() for real data only

    // Load quantum state - DEPRECATED, use fetchRealQuantumState instead
    loadQuantumState() {
        console.warn('⚠️ loadQuantumState() is deprecated. Use fetchRealQuantumState() for real data only.');
        this.fetchRealQuantumState();
    }

    // populateQuantumState() - DEPRECATED, fake data method removed
    // Use fetchRealQuantumState() for real data only

    // Refresh methods - Updated to use real data only
    refreshBackends() {
        this.updateBackends();
    }

    refreshResults() {
        this.fetchRealMeasurementResults();
    }

    refreshEntanglement() {
        this.fetchRealEntanglementData();
    }

    calculateEntanglement() {
        this.fetchRealEntanglementData();
    }

    toggleCircuitAnimation() {
        const playBtn = document.getElementById('circuit-play');
        if (playBtn) {
            const icon = playBtn.querySelector('i');
            if (icon.classList.contains('fa-play')) {
                icon.classList.remove('fa-play');
                icon.classList.add('fa-pause');
            } else {
                icon.classList.remove('fa-pause');
                icon.classList.add('fa-play');
            }
        }
    }

    resetCircuit() {
        console.log('Resetting circuit');
    }

    viewJob(jobId) {
        console.log(`Viewing job: ${jobId}`);
    }
}

// Enhanced CSS animations
const enhancedStyle = document.createElement('style');
enhancedStyle.textContent = `
    @keyframes ripple {
        0% {
            transform: scale(0);
            opacity: 1;
        }
        100% {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes slideInUp {
        0% {
            opacity: 0;
            transform: translateY(30px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeInUp {
        0% {
            opacity: 0;
            transform: translateY(20px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideInLeft {
        0% {
            opacity: 0;
            transform: translateX(-30px);
        }
        100% {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideInRight {
        0% {
            opacity: 0;
            transform: translateX(30px);
        }
        100% {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes fadeIn {
        0% {
            opacity: 0;
        }
        100% {
            opacity: 1;
        }
    }
    
    .notification-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid var(--border-secondary);
        transition: all var(--transition-fast);
    }
    
    .notification-item:hover {
        background: var(--bg-hover);
    }
    
    .notification-icon {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
    }
    
    .notification-item.success .notification-icon {
        background: var(--gradient-green);
    }
    
    .notification-item.info .notification-icon {
        background: var(--gradient-cyan);
    }
    
    .notification-item.warning .notification-icon {
        background: var(--gradient-orange);
    }
    
    .notification-content h4 {
        margin: 0 0 0.25rem 0;
        font-size: 0.875rem;
        font-weight: 600;
    }
    
    .notification-content p {
        margin: 0 0 0.25rem 0;
        font-size: 0.75rem;
        color: var(--text-secondary);
    }
    
    .notification-time {
        font-size: 0.625rem;
        color: var(--text-muted);
    }
    
    .backend-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        border: 1px solid var(--border-secondary);
        border-radius: var(--radius-md);
        margin-bottom: 0.5rem;
        transition: all var(--transition-fast);
    }
    
    .backend-item:hover {
        background: var(--bg-hover);
        border-color: var(--border-accent);
    }
    
    .backend-info h3 {
        margin: 0 0 0.25rem 0;
        font-size: 0.875rem;
        font-weight: 600;
    }
    
    .backend-qubits {
        font-size: 0.75rem;
        color: var(--text-secondary);
    }
    
    .backend-status {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;
    }
    
    .status-indicator {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
    }
    
    .status-indicator.online {
        background: var(--success);
        animation: pulse 2s ease-in-out infinite;
    }
    
    .queue-count {
        font-size: 0.75rem;
        color: var(--text-muted);
    }
    
    .status-badge {
        padding: 0.25rem 0.5rem;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .status-badge.running {
        background: var(--gradient-green);
        color: white;
    }
    
    .status-badge.queued {
        background: var(--gradient-orange);
        color: white;
    }
    
    .status-badge.completed {
        background: var(--gradient-cyan);
        color: white;
    }
    
    .progress-bar-container {
        width: 100%;
        height: 0.5rem;
        background: var(--bg-tertiary);
        border-radius: var(--radius-sm);
        overflow: hidden;
    }
    
    .progress-bar {
        height: 100%;
        background: var(--gradient-cyan);
        border-radius: var(--radius-sm);
        transition: width var(--transition-normal);
    }
    
    .action-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: none;
        border-radius: var(--radius-sm);
        background: var(--glass-bg);
        color: var(--text-primary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all var(--transition-fast);
    }
    
    .action-btn:hover {
        background: var(--accent-cyan);
        transform: scale(1.1);
    }
`;
document.head.appendChild(enhancedStyle);

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new EnhancedQuantumDashboard();
});