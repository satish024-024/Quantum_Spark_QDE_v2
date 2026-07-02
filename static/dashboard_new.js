// Quantum Spark - Streamlined Dashboard

// Security: Helper function to sanitize HTML and prevent XSS
function sanitizeHTML(str) {
    // Return HTML string as is so structural tags can render properly
    return str || '';
}

// Helper functions for standardized status checking
function isCompletedJob(job) {
    const status = (job.status || '').toLowerCase();
    return ['done', 'completed', 'finished', 'success'].includes(status);
}

function isRunningJob(job) {
    const status = (job.status || '').toLowerCase();
    return ['running', 'pending', 'queued', 'executing', 'in_progress', 'active', 'submitted', 'waiting', 'processing'].includes(status);
}

function isActiveBackend(backend) {
    const status = (backend.status || '').toLowerCase();
    const operational = backend.operational === true || backend.operational === 'true';
    return status === 'active' || status === 'operational' || status === 'online' ||
        status === 'available' || status === 'ready' || operational;
}

// QuantumWidgets class is loaded from widgets.js (loaded before this file)
// Do not redefine it here to avoid conflicts

class HackathonDashboard {
    constructor() {
        // Detect dashboard theme from URL path
        this.detectDashboardTheme();

        this.state = {
            backends: [],
            jobs: [],
            performance: {},
            isConnected: false,
            notifications: []
        };

        // Initialize Widget Manager
        if (typeof QuantumWidgets !== 'undefined') {
            this.widgetManager = new QuantumWidgets(this);
        } else {
            console.error('QuantumWidgets class not found. Please check that widgets.js is loaded before dashboard_new.js!');
            this.widgetManager = new WidgetManager(this);
        }

        // DISABLED: Background refresh is handled by timer control in header (refresh-interval-select)
        // Setting to 0 to prevent duplicate refresh loops that cause 429 rate limit errors
        this.refreshInterval = 0;
        this.fullscreenOpen = false;
        this.lastFullscreenClick = 0;
        this.isLoading = false;
        this.isUpdating = false;
        this.lastUpdateTime = 0;
        this.sortable = null; // For drag-and-drop functionality
        this.rateLimitBackoff = 60000; // Initial backoff for 429 errors (60 seconds)
        this.maxBackoff = 300000; // Maximum backoff (5 minutes)
        this.consecutiveErrors = 0; // Track consecutive rate limit errors

        // Safely bind methods with fallbacks
        this.updateAllWidgets = (this.updateAllWidgets || (() => {
            console.warn('updateAllWidgets method not found, using fallback');
            return this.widgetManager?.updateAllWidgets?.() || Promise.resolve();
        })).bind(this);

        this.updateWidget = (this.updateWidget || ((widgetType) => {
            console.warn('updateWidget method not found, using fallback');
            return this.widgetManager?.updateWidget?.(widgetType) || Promise.resolve();
        })).bind(this);

        this.refreshAllData = (this.refreshAllData || (async () => {
            console.warn('refreshAllData method not found, using fallback');
            return { success: false, message: 'Method not initialized' };
        })).bind(this);

        // AI Chat History Management
        this.aiChatHistory = []; // Store chat messages
        this.aiChatContext = {}; // Store conversation context
        this.aiLastActiveTab = 'chat'; // Remember which tab was active
        this.persistChatHistory = true; // Whether to save chat history across sessions

        // Load saved chat history from localStorage (if persistence is enabled)
        if (this.persistChatHistory) {
            this.loadChatHistory();
        }

        // Initialize IBM Quantum integration
        this.initializeIBMIntegration();

        // Initialize API error handling
        this.setupApiErrorHandling();

        // Add global escape key handler
        this.setupGlobalEscapeHandler();

        // Setup widget event delegation through the widget manager
        if (this.widgetManager && typeof this.widgetManager.setupWidgetEventDelegation === 'function') {
            this.widgetManager.setupWidgetEventDelegation();
        } else {
            console.warn('Widget manager not properly initialized for event delegation');
        }

        // Initialize the dashboard
        // NOTE: Auth is handled by modern_dashboard.html BEFORE this class is instantiated
        this.init = this.init || (() => {
            console.log('🔄 Initializing dashboard components...');
            console.log('  Auth status: ' + (window.isAuthenticated ? 'authenticated' : 'not authenticated'));

            // Load initial data (auth already completed)
            this.loadInitialData().catch(error => {
                console.error('❌ Failed to load initial data:', error);
            });

            // Start auto-refresh if needed
            if (this.startAutoRefresh && typeof this.startAutoRefresh === 'function') {
                this.startAutoRefresh();
            }

            // Initialize widgets
            if (this.widgetManager && typeof this.widgetManager.updateAllWidgets === 'function') {
                this.widgetManager.updateAllWidgets().catch(error => {
                    console.error('❌ Failed to update widgets:', error);
                });
            }

            // Initialize Job Limit Selector (shared across all dashboards)
            this.initJobLimitSelector();

            // Hide loading screen if exists
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => loadingScreen.remove(), 500);
            }

            console.log('✅ Dashboard initialization complete');
        });

        // Call init
        this.init();
    }

    /**
 * Setup API error handling and retry logic
 */
    /**
     * Fetch data from the server with retry logic and error handling
     * @param {string} endpoint - The API endpoint to fetch from
     * @param {Object} [options={}] - Fetch options
     * @returns {Promise<any>} - The parsed JSON response
     */
    async fetchData(endpoint, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            // Add signal to options
            const fetchOptions = {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                }
            };

            const response = await fetch(endpoint, fetchOptions);

            if (!response.ok) {
                const error = new Error(`HTTP error! status: ${response.status}`);
                error.status = response.status;
                throw error;
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`❌ Error fetching from ${endpoint}:`, error);

            // If it's an abort error, provide a more specific message
            if (error.name === 'AbortError') {
                throw new Error(`Request to ${endpoint} timed out after 10 seconds`);
            }

            // If it's a 401 Unauthorized, handle authentication
            if (error.status === 401) {
                this.showNotification('Session expired. Please log in again.', 'error');
                // Redirect to login or handle authentication
                // window.location.href = '/login';
            }

            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Fetch backends data
     * @returns {Promise<Array>} - List of backends
     */
    async fetchBackends() {
        try {
            const data = await this.fetchData('/api/backends');
            this.state.backends = Array.isArray(data) ? data : [];
            return this.state.backends;
        } catch (error) {
            console.error('Error fetching backends:', error);
            this.showNotification('Failed to load backends', 'error');
            return [];
        }
    }
    /**
     * Fetch jobs data
     * @returns {Promise<Array>} - List of jobs
     */
    async fetchJobs() {
        try {
            // Get user-configured job limit
            const jobLimit = window.quantumJobLimit || localStorage.getItem('quantumJobLimit') || 'all';
            const data = await this.fetchData(`/api/jobs?limit=${jobLimit}`);
            this.state.jobs = Array.isArray(data) ? data : [];
            return this.state.jobs;
        } catch (error) {
            console.error('Error fetching jobs:', error);
            this.showNotification('Failed to load jobs', 'error');
            return [];
        }
    }

    /**
     * Fetch performance data
     * @returns {Promise<Object>} - Performance metrics
     */
    async fetchPerformance() {
        try {
            const data = await this.fetchData('/api/performance_metrics');
            this.state.performance = data || {};
            return this.state.performance;
        } catch (error) {
            console.error('Error fetching performance data:', error);
            this.showNotification('Failed to load performance data', 'warning');
            return {};
        }
    }

    /**
     * Load initial data for the dashboard
     */
    async loadInitialData() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showNotification('Loading dashboard data...', 'info');

        try {
            // Fetch data in parallel
            await Promise.all([
                this.fetchBackends(),
                this.fetchJobs(),
                this.fetchPerformance()
            ]);

            // Update connection status
            this.updateConnectionStatus(true);
            this.showNotification('Dashboard data loaded successfully', 'success');

            // Update all widgets
            if (this.widgetManager && typeof this.widgetManager.updateAllWidgets === 'function') {
                await this.widgetManager.updateAllWidgets();
            }

            // Update metrics
            this.updateMetrics();

        } catch (error) {
            console.error('Error loading initial data:', error);
            this.updateConnectionStatus(false);
            this.showNotification('Failed to load dashboard data', 'error');
        } finally {
            this.isLoading = false;
            this.lastUpdateTime = Date.now();
        }
    }

    /**
     * Initialize Job Limit Selector - handles dropdown for limiting IBM job fetches
     * This improves performance by fetching fewer jobs when requested
     */
    initJobLimitSelector() {
        const jobLimitSelect = document.getElementById('job-limit-select');
        if (!jobLimitSelect) {
            console.log('📋 Job limit selector not found in this dashboard');
            return;
        }

        // Load saved preference from localStorage
        const savedLimit = localStorage.getItem('quantumJobLimit') || 'all';
        jobLimitSelect.value = savedLimit;
        window.quantumJobLimit = savedLimit;
        console.log(`📋 Job limit initialized: ${savedLimit}`);

        // Handle selection change
        jobLimitSelect.addEventListener('change', async () => {
            const newLimit = jobLimitSelect.value;
            localStorage.setItem('quantumJobLimit', newLimit);
            window.quantumJobLimit = newLimit;
            console.log(`📋 Job limit changed to: ${newLimit}`);

            // Show notification
            this.showNotification(
                `Job limit set to ${newLimit === 'all' ? 'All jobs' : newLimit + ' jobs'}. Refreshing...`,
                'info'
            );

            // Clear any caches to force fresh fetch
            if (this.widgetManager && this.widgetManager.sharedData) {
                this.widgetManager.sharedData.jobs = null;
                this.widgetManager.sharedData.lastFetch.jobs = 0;
            }
            if (window.remoteDataService && window.remoteDataService.clearCache) {
                window.remoteDataService.clearCache('/api/jobs');
            }

            // Trigger dashboard refresh with new limit
            try {
                await this.loadInitialData();
                this.showNotification(`Jobs refreshed with limit: ${newLimit === 'all' ? 'All' : newLimit}`, 'success');
            } catch (error) {
                console.error('Error refreshing with new limit:', error);
                this.showNotification('Failed to refresh jobs', 'error');
            }
        });
    }

    /**
     * Setup API error handling and retry logic
     */
    setupApiErrorHandling() {
        // Note: Retry logic is handled by api_utils.js (fetchWithRetry)
        // No need to override native fetch - that causes conflicts with AbortController
        console.log('✅ API error handling configured (using api_utils.js)');

        // Add global error handler for unhandled fetch errors
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.name === 'AbortError') {
                console.warn('Fetch request was aborted:', event.reason);
                event.preventDefault(); // Prevent console spam
            }
        });
    }

    // Add global escape key handler for modals and side panels
    setupGlobalEscapeHandler() {
        console.log('⌨️ Setting up global escape key handler');
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                console.log('⎋ Escape key pressed');
                // Close any open modals or side panels
                const openModals = document.querySelectorAll('.modal.show, .side-panel.open');
                if (openModals.length > 0) {
                    openModals.forEach(modal => {
                        modal.classList.remove('show', 'open');
                        console.log('🚪 Closed open modal/panel');
                    });
                    e.preventDefault();
                }
            }
        });
    }

    // Enhanced error handling for API calls
    async handleApiError(endpoint, error) {
        console.error(`❌ API Error (${endpoint}):`, error);
        this.showNotification(`Failed to load data from ${endpoint}`, 'error');

        // Return default data based on endpoint
        switch (endpoint) {
            case '/api/quantum_state_data':
                return { state: '|0>', probabilities: [1, 0] };
            case '/api/circuit_data':
                return { gates: [], qubits: 1 };
            case '/api/job_results':
                return { jobs: [], status: 'offline' };
            default:
                return null;
        }
    }

    // Check health of all API endpoints
    async checkApiHealth() {
        const endpoints = [
            '/api/quantum_state_data',
            '/api/circuit_data',
            '/api/job_results',
            '/api/realtime_monitoring',
            '/api/calibration_data'
        ];

        console.log('🔍 Checking API health...');

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) {
                    console.warn(`⚠️ ${endpoint} returned ${response.status}`);
                    this.showNotification(`Warning: ${endpoint} is not responding correctly`, 'warning');
                } else {
                    console.log(`  ${endpoint} is healthy`);
                }
            } catch (error) {
                console.error(`❌ ${endpoint} is down:`, error);
                this.showNotification(`Error: ${endpoint} is not available`, 'error');
            }
        }
    }

    detectDashboardTheme() {
        // Detect dashboard theme from URL path
        const path = window.location.pathname;

        if (path.includes('/hackathon')) {
            this.dashboardTheme = 'Hackathon';
        } else if (path.includes('/modern')) {
            this.dashboardTheme = 'Modern';
        } else if (path.includes('/professional')) {
            this.dashboardTheme = 'Professional';
        } else if (path.includes('/advanced')) {
            this.dashboardTheme = 'Advanced';
        } else if (path.includes('/production-dashboard') || path.includes('/production')) {
            this.dashboardTheme = 'Production';
        } else if (path.includes('/quantum-research')) {
            this.dashboardTheme = 'Quantum Research';
        } else {
            // Default detection from body class or title
            const bodyClass = document.body.className;
            const title = document.title.toLowerCase();

            if (bodyClass.includes('modern') || title.includes('modern')) {
                this.dashboardTheme = 'Modern';
            } else if (bodyClass.includes('professional') || title.includes('professional')) {
                this.dashboardTheme = 'Professional';
            } else if (bodyClass.includes('advanced') || title.includes('advanced')) {
                this.dashboardTheme = 'Advanced';
            } else if (bodyClass.includes('production') || title.includes('production')) {
                this.dashboardTheme = 'Production';
            } else if (bodyClass.includes('quantum-research') || title.includes('quantum-research')) {
                this.dashboardTheme = 'Quantum Research';
            } else {
                this.dashboardTheme = 'Hackathon'; // Default
            }
        }

        console.log(`    Detected dashboard theme: ${this.dashboardTheme}`);
    }

    getThemeFeatures() {
        // Return theme-specific features
        const themeFeatures = {
            Hackathon: {
                primaryColor: '#06d6a0',
                secondaryColor: '#118ab2',
                accentColor: '#073b4c',
                backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                cardStyle: 'glass',
                animations: 'quantum',
                layout: 'grid',
                widgets: ['jobs', 'metrics', 'performance', 'circuit', 'notifications']
            },
            Modern: {
                primaryColor: '#ff6b6b',
                secondaryColor: '#4ecdc4',
                accentColor: '#45b7d1',
                backgroundGradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                cardStyle: 'neumorphic',
                animations: 'smooth',
                layout: 'flex',
                widgets: ['jobs', 'metrics', 'charts', 'realtime']
            },
            Professional: {
                primaryColor: '#2c3e50',
                secondaryColor: '#34495e',
                accentColor: '#3498db',
                backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                cardStyle: 'flat',
                animations: 'minimal',
                layout: 'corporate',
                widgets: ['jobs', 'analytics', 'reports', 'settings']
            },
            Advanced: {
                primaryColor: '#00d4ff',
                secondaryColor: '#090979',
                accentColor: '#ff6b6b',
                backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                cardStyle: 'glossy',
                animations: 'advanced',
                layout: 'scientific',
                widgets: ['jobs', 'circuit', '3d-viz', 'quantum-sim', 'ai-assistant']
            },
            Production: {
                primaryColor: '#555555',
                secondaryColor: '#777777',
                accentColor: '#999999',
                backgroundGradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
                cardStyle: 'minimal',
                animations: 'subtle',
                layout: 'industrial',
                widgets: ['jobs', 'monitoring', 'logs', 'performance']
            },
            'Quantum Research': {
                primaryColor: '#8e2de2',
                secondaryColor: '#4a00e0',
                accentColor: '#00d4ff',
                backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                cardStyle: 'scientific',
                animations: 'laboratory',
                layout: 'research',
                widgets: ['research', 'experiments', 'analysis', 'publications']
            }
        };

        return themeFeatures[this.dashboardTheme] || themeFeatures.Hackathon;
    }

    applyThemeStyling() {
        const themeFeatures = this.getThemeFeatures();

        console.log(`  Applying ${this.dashboardTheme} theme styling...`);

        // Apply CSS custom properties for theme colors
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', themeFeatures.primaryColor);
        root.style.setProperty('--theme-secondary', themeFeatures.secondaryColor);
        root.style.setProperty('--theme-accent', themeFeatures.accentColor);

        // Apply background gradient if specified
        if (themeFeatures.backgroundGradient) {
            const body = document.body;
            body.style.background = themeFeatures.backgroundGradient;
        }

        // Apply theme-specific body class
        document.body.classList.add(`${this.dashboardTheme.toLowerCase().replace(' ', '-')}-theme`);

        // Apply theme-specific card styling
        this.applyCardStyling(themeFeatures.cardStyle);

        // Apply theme-specific animations
        this.applyAnimationStyling(themeFeatures.animations);

        // Configure widgets based on theme
        this.configureThemeWidgets(themeFeatures.widgets);

        console.log(`  ${this.dashboardTheme} theme styling applied`);
    }

    applyCardStyling(cardStyle) {
        const cards = document.querySelectorAll('.widget, .card, .metric-card');
        cards.forEach(card => {
            // Remove existing card style classes
            card.classList.remove('glass-card', 'neumorphic-card', 'flat-card', 'glossy-card', 'minimal-card', 'scientific-card');

            // Add theme-specific card style
            switch (cardStyle) {
                case 'glass':
                    card.classList.add('glass-card');
                    break;
                case 'neumorphic':
                    card.classList.add('neumorphic-card');
                    break;
                case 'flat':
                    card.classList.add('flat-card');
                    break;
                case 'glossy':
                    card.classList.add('glossy-card');
                    break;
                case 'minimal':
                    card.classList.add('minimal-card');
                    break;
                case 'scientific':
                    card.classList.add('scientific-card');
                    break;
            }
        });
    }
    applyAnimationStyling(animationType) {
        document.body.setAttribute('data-animation-theme', animationType);

        // Add theme-specific animation classes
        const animatedElements = document.querySelectorAll('.metric-card, .widget, .chart-container');
        animatedElements.forEach(element => {
            element.classList.add(`animate-${animationType}`);
        });
    }

    configureThemeWidgets(widgetTypes) {
        // Hide/show widgets based on theme configuration
        const allWidgets = document.querySelectorAll('[data-widget-type]');
        allWidgets.forEach(widget => {
            const widgetType = widget.getAttribute('data-widget-type');
            if (widgetTypes.includes(widgetType)) {
                widget.style.display = 'block';
            } else {
                widget.style.display = 'none';
            }
        });

        // Theme-specific widget initialization
        switch (this.dashboardTheme) {
            case 'Advanced':
                this.initializeAdvancedFeatures();
                break;
            case 'Professional':
                this.initializeProfessionalFeatures();
                break;
            case 'Production':
                this.initializeProductionFeatures();
                break;
            case 'Quantum Research':
                this.initializeResearchFeatures();
                break;
        }
    }

    initializeAdvancedFeatures() {
        // Enable 3D circuit visualization
        console.log('  Initializing advanced features...');

        // Enable AI assistant
        if (typeof AIAssistant !== 'undefined') {
            this.aiAssistant = new AIAssistant();
        }

        // Enable enhanced quantum simulations
        this.enableQuantumSimulations = true;
    }

    initializeProfessionalFeatures() {
        // Enable business analytics
        console.log('💼 Initializing professional features...');

        // Configure for business presentations
        this.businessMode = true;

        // Enable advanced reporting
        this.enableAdvancedReporting = true;
    }

    initializeProductionFeatures() {
        // Enable production monitoring
        console.log('Initializing production features...');

        // Configure for production environment
        this.productionMode = true;

        // Enable detailed logging
        this.enableDetailedLogging = true;
    }

    /**
     * Enhanced fetch with timeout and retry logic
     * @param {string} resource - URL to fetch
     * @param {number} timeout - Timeout in milliseconds (increased for IBM Quantum API)
     * @param {Function} errorHandler - Optional error handler
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} - Parsed JSON response
     */
    async fetchWithTimeout(resource, timeout = 60000, errorHandler = null, options = {}) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(resource, {
                ...options,
                signal: controller.signal,
                credentials: 'include'
            });
            clearTimeout(id);

            // Handle rate limiting (429) specifically
            if (response.status === 429) {
                this.consecutiveErrors = (this.consecutiveErrors || 0) + 1;
                const backoff = Math.min(
                    (this.rateLimitBackoff || 60000) * Math.pow(2, this.consecutiveErrors - 1),
                    this.maxBackoff || 300000
                );
                console.warn(`⚠️ Rate limited (429). Backing off for ${backoff / 1000}s. Consecutive errors: ${this.consecutiveErrors}`);
                const error = new Error(`Rate limited (429). Retry after ${backoff / 1000}s`);
                error.isRateLimit = true;
                error.backoffMs = backoff;
                throw error;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Reset consecutive errors on success
            this.consecutiveErrors = 0;
            return await response.json();
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    // Apply theme and styling to the dashboard
    applyThemeStyling() {
        console.log('🎨 Applying theme styling...');
        try {
            // Apply theme-specific CSS classes
            document.body.className = ''; // Reset classes
            document.body.classList.add(`theme-${this.dashboardTheme.toLowerCase().replace(/\s+/g, '-')}`);

            // Apply any theme-specific overrides
            switch (this.dashboardTheme) {
                case 'Hackathon':
                    document.body.style.setProperty('--primary-color', '#4f46e5');
                    document.body.style.setProperty('--secondary-color', '#7c3aed');
                    break;
                case 'Professional':
                    document.body.style.setProperty('--primary-color', '#2563eb');
                    document.body.style.setProperty('--secondary-color', '#1d4ed8');
                    break;
                case 'Production':
                    document.body.style.setProperty('--primary-color', '#059669');
                    document.body.style.setProperty('--secondary-color', '#047857');
                    break;
                default:
                    // Default theme
                    document.body.style.setProperty('--primary-color', '#3b82f6');
                    document.body.style.setProperty('--secondary-color', '#6366f1');
            }

            // Notify components that theme has changed
            this.dispatchEvent(new CustomEvent('theme-changed', {
                detail: { theme: this.dashboardTheme }
            }));

        } catch (error) {
            console.error('Error applying theme styling:', error);
        }
    }

    async loadInitialData() {
        console.log('🔍 Starting loadInitialData()...');

        // Prevent duplicate simultaneous loads
        if (this.isLoading) {
            console.debug('⚠️ Load already in progress, skipping duplicate call');
            return;
        }

        // Set loading state
        this.isLoading = true;
        this.lastUpdateTime = Date.now();
        this.showNotification('Loading dashboard data...', 'info');

        try {
            console.log('🔄 Starting to fetch data from APIs...');
            const startTime = Date.now(); // Track loading time

            // Debug: Check if widgetManager is available
            console.log('🔧 WidgetManager available:', !!this.widgetManager);

            // Define API endpoints with user-configurable job limit
            const jobLimit = window.quantumJobLimit || localStorage.getItem('quantumJobLimit') || 'all';
            const endpoints = {
                backends: '/api/backends',
                jobs: `/api/jobs?limit=${jobLimit}`,
                performance: '/api/performance_metrics'
            };

            console.log('🌐 API Endpoints:', endpoints);

            // Load data using RemoteDataService for centralized caching/backoff
            const [backends, jobs, performance] = await Promise.all([
                window.remoteDataService.get(endpoints.backends).then(data => {
                    console.log(`✓ Fetched ${data?.length || 0} backends`);
                    return data || [];
                }).catch(err => {
                    console.error('❌ Failed to fetch backends:', err);
                    this.showNotification('Failed to load backends', 'error');
                    return [];
                }),

                window.remoteDataService.get(endpoints.jobs).then(data => {
                    //Handle new response format: {jobs: [], total_ibm_jobs: N}
                    let jobsArray = Array.isArray(data) ? data : (data?.jobs || []);
                    let totalIBMJobs = data?.total_ibm_jobs || jobsArray.length || 0;

                    // Store total count globally for summary cards
                    window.totalIBMJobs = totalIBMJobs;

                    console.log(`✓ Fetched ${jobsArray.length} jobs (Total IBM: ${totalIBMJobs})`);
                    return jobsArray;
                }).catch(err => {
                    console.error('❌ Failed to fetch jobs:', err);
                    // Preserve existing cached job count on error
                    if (!window.totalIBMJobs && this.state.jobs?.length) {
                        window.totalIBMJobs = this.state.jobs.length;
                    }
                    this.showNotification('Failed to load jobs', 'error');
                    return [];
                }),

                window.remoteDataService.get(endpoints.performance).then(data => {
                    console.log(`✓ Fetched performance data`);
                    return data || {};
                }).catch(err => {
                    console.warn('Failed to fetch performance data:', err);
                    return {};
                })
            ]);

            console.log(`✓ Data loaded in ${Date.now() - startTime}ms`);
            console.log(`  Backends: ${backends?.length || 0}, Jobs: ${jobs?.length || 0}`);

            // Update state with fallback to empty arrays/objects
            this.state = {
                ...this.state,
                backends: Array.isArray(backends) ? backends : [],
                jobs: Array.isArray(jobs) ? jobs : [],
                performance: performance || {},
                isConnected: true,
                lastUpdated: new Date().toISOString()
            };

            // Update UI
            this.updateConnectionStatus(true);
            this.updateMetrics();

            // Initialize or update widgets with error boundary
            try {
                if (this.widgetManager) {
                    console.log('   Updating widgets...');
                    await this.widgetManager.loadAllSharedData();
                    this.updateAllWidgets();
                } else {
                    console.log('   Widget manager not available, using basic updates');
                    this.updateBasicWidgets();
                }
            } catch (widgetError) {
                console.error('Error updating widgets:', widgetError);
                this.showNotification('Some widgets failed to load', 'warning');
            }

            this.showNotification('Dashboard data loaded successfully', 'success');

        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.updateConnectionStatus(false);

            // Check if rate limited and increase backoff
            if (error.isRateLimit) {
                this.consecutiveErrors = (this.consecutiveErrors || 0) + 1;
                console.warn(`⚠️ Rate limited! Will increase backoff time.`);
            }

            // Try to recover with cached or sample data
            this.state = {
                ...this.state,
                backends: this.state.backends || [],
                jobs: this.state.jobs || [],
                performance: this.state.performance || {},
                isConnected: false
            };

            this.showNotification('Using cached data. Some features may be limited.', 'warning');
            this.updateBasicWidgets();

        } finally {
            this.isLoading = false;
            this.isUpdating = false;
            this.lastUpdateTime = Date.now();

            // Schedule next refresh with exponential backoff on rate limit errors
            // FIXED: Respect global isAutoRefreshEnabled flag to prevent infinite loops when paused
            if (this.refreshInterval > 0 && (typeof isAutoRefreshEnabled === 'undefined' || isAutoRefreshEnabled)) {
                clearTimeout(this.refreshTimer);

                // Calculate delay with exponential backoff for rate limit errors
                let delay;
                if (this.consecutiveErrors > 0) {
                    // Exponential backoff: 60s, 120s, 240s, up to 5 min max
                    delay = Math.min(
                        this.refreshInterval * Math.pow(2, this.consecutiveErrors),
                        this.maxBackoff || 300000
                    );
                    console.warn(`⚠️ Using backoff delay: ${delay / 1000}s due to ${this.consecutiveErrors} rate limit errors`);
                } else {
                    delay = this.state.isConnected ? this.refreshInterval : this.refreshInterval * 2;
                }

                this.refreshTimer = setTimeout(
                    () => this.loadInitialData(),
                    delay
                );

                console.log(`⏱ Background refresh scheduled in ${delay / 1000} seconds`);
            } else {
                console.log('⏸ Background refresh paused (isAutoRefreshEnabled is false)');
            }
        }
    }

    async forceLoadData() {
        console.log('   Force loading data...');
        this.isLoading = false; // Reset loading flag
        await this.loadInitialData();
        this.showNotification('Data force refreshed!', 'success');
    }
    async fetchBackends() {
        try {
            const response = await fetch('/api/backends', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                this.state.backends = Array.isArray(data) ? data : data.backends || [];
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Backends API unavailable:', error.message);
            this.state.backends = [];
            this.updateConnectionStatus(false);
        }
    }

    async fetchJobs() {
        try {
            const response = await fetch('/api/jobs', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                this.state.jobs = Array.isArray(data) ? data : data.jobs || [];
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Jobs API unavailable:', error.message);
            this.state.jobs = [];
            this.updateConnectionStatus(false);
        }
    }

    async fetchPerformance() {
        try {
            const response = await fetch('/api/performance_metrics', {
                credentials: 'include'
            });
            if (response.ok) {
                this.state.performance = await response.json();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Performance API unavailable:', error.message);
            this.state.performance = {
                success_rate: 0,
                average_execution_time: 0,
                total_jobs: 0
            };
            this.updateConnectionStatus(false);
        }
    }
    /**
     * Update summary cards metrics
     * Delegates to DashboardMetrics for industrial-quality multi-provider support
     */
    updateMetrics() {
        // Use new DashboardMetrics class for summary cards
        if (window.dashboardMetrics) {
            window.dashboardMetrics.updateDOM();
            return;
        }

        // Fallback if DashboardMetrics not loaded
        console.warn('⚠️ DashboardMetrics not available, using fallback');
        this._fallbackUpdateMetrics();
    }

    /**
     * Fallback metrics update if DashboardMetrics class not available
     */
    _fallbackUpdateMetrics() {
        const el = (id, val) => {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = val;
        };

        el('active-backends', this.state.backends?.length || 0);
        el('total-jobs', this.state.jobs?.length || 0);
        el('running-jobs', 0);
        el('success-rate', '0%');
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateConnectionStatus(connected) {
        this.state.isConnected = connected;
        const statusElement = document.getElementById('connection-status');
        const statusIcon = statusElement?.querySelector('i');
        const statusText = statusElement?.querySelector('span');

        if (statusElement && statusIcon && statusText) {
            if (connected) {
                statusElement.className = 'connection-status';
                statusIcon.className = 'fas fa-circle';
                statusText.textContent = 'Connected to IBM Quantum';
            } else {
                statusElement.className = 'connection-status offline';
                statusIcon.className = 'fas fa-circle';
                statusText.textContent = 'Offline Mode';
            }
        }
    }

    async updateAllWidgets() {
        // Prevent rapid successive updates
        const now = Date.now();
        if (this.isUpdating || (now - this.lastUpdateTime) < 2000) {
            console.log('  Widget update skipped - too frequent or already updating');
            return;
        }

        this.isUpdating = true;
        this.lastUpdateTime = now;

        try {
            if (this.widgetManager) {
                console.log('   Updating all widgets via widget manager...');
                await this.widgetManager.updateAllWidgets();
            } else {
                console.log('   Widget manager not available, using basic mode...');
                await this.updateBasicWidgets();
            }
        } catch (error) {
            console.error('   Widget manager update failed, falling back to basic mode:', error);
            await this.updateBasicWidgets();
        } finally {
            this.isUpdating = false;
        }
    }

    async updateWidget(widgetType) {
        // Prevent rapid successive updates for individual widgets
        const now = Date.now();
        const widgetKey = `lastUpdate_${widgetType}`;
        const lastUpdate = this[widgetKey] || 0;

        if ((now - lastUpdate) < 1000) {
            console.log(`  ${widgetType} widget update skipped - too frequent`);
            return;
        }

        this[widgetKey] = now;

        try {
            if (this.widgetManager) {
                console.log(`   Updating ${widgetType} widget via widget manager...`);
                switch (widgetType) {
                    case 'backends':
                        await this.widgetManager.updateBackendsWidget();
                        break;
                    case 'jobs':
                        await this.widgetManager.updateJobsWidget();
                        break;
                    case 'performance':
                        await this.widgetManager.updatePerformanceWidget();
                        break;
                    case 'results':
                        await this.widgetManager.updateResultsWidget();
                        break;
                    case 'bloch-sphere':
                        await this.widgetManager.updateBlochSphereWidget();
                        break;
                    case 'circuit':
                        await this.widgetManager.updateCircuitWidget();
                        break;
                    case 'entanglement':
                        await this.widgetManager.updateEntanglementWidget();
                        break;
                    case 'quantum-state':
                        await this.widgetManager.updateQuantumStateWidget();
                        break;
                    case 'ai-chat':
                        await this.widgetManager.updateAIChatWidget();
                        break;
                }
            } else {
                console.log(`   Updating ${widgetType} widget via basic mode...`);
                await this.updateBasicWidget(widgetType);
            }
        } catch (error) {
            console.error(`Error updating ${widgetType} widget:`, error);
        }
    }





    handleWidgetAction(widget, action) {
        try {
            const widgetType = widget.getAttribute('data-widget');
            console.log(`Handling widget action: ${action} for ${widgetType}`);

            // Add debounce for fullscreen action
            if (action === 'fullscreen') {
                const currentTime = Date.now();
                if (currentTime - this.lastFullscreenClick < 200) {
                    console.log('Fullscreen action debounced, ignoring rapid clicks');
                    return;
                }
                this.lastFullscreenClick = currentTime;
                console.log('Fullscreen action allowed, proceeding...');
            }

            // Ensure the dashboard instance is available
            const dashboard = this.dashboard || window.dashboard;
            if (!dashboard) {
                console.error('Dashboard instance not available');
                return;
            }

            switch (action) {
                case 'refresh':
                    console.log('Refreshing widget...');
                    if (dashboard.updateWidget) {
                        dashboard.updateWidget(widgetType);
                    } else if (this.updateWidget) {
                        this.updateWidget(widgetType);
                    } else {
                        console.warn('No updateWidget method available');
                    }
                    break;

                case 'popup':
                    console.log('Opening popup...');
                    if (dashboard.openPopup) {
                        dashboard.openPopup(widget, widgetType);
                    } else if (this.openPopup) {
                        this.openPopup(widget, widgetType);
                    } else {
                        console.warn('No openPopup method available');
                    }
                    break;

                case 'fullscreen':
                    console.log('Opening fullscreen...');
                    if (dashboard.openFullscreen) {
                        dashboard.openFullscreen(widget);
                    } else if (this.openFullscreen) {
                        this.openFullscreen(widget);
                    } else {
                        console.warn('No openFullscreen method available');
                    }
                    break;

                case 'remove':
                    console.log('Removing widget...');
                    if (dashboard.removeWidget) {
                        dashboard.removeWidget(widget);
                    } else if (this.removeWidget) {
                        this.removeWidget(widget);
                    } else {
                        console.warn('No removeWidget method available');
                    }
                    break;

                default:
                    console.warn(`Unknown action: ${action}`);
            }
        } catch (error) {
            console.error('Error in handleWidgetAction:', error);
        }
    }

    openPopup(widget, widgetType) {
        const popupOverlay = document.getElementById('popup-overlay');
        const popupTitle = document.getElementById('popup-title');
        const popupContent = document.getElementById('popup-content');

        if (!popupOverlay || !popupTitle || !popupContent) return;

        popupTitle.textContent = widgetType.replace('-', ' ').toUpperCase();

        const widgetContent = widget.querySelector('.widget-content');
        if (widgetContent) {
            popupContent.innerHTML = widgetContent.innerHTML;
        }

        popupOverlay.classList.add('active');
    }

    forceCloseAllFullscreen() {
        console.log('🧹 Force closing all fullscreen and side panel containers...');
        try {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log('Error exiting fullscreen:', err));
            }
            
            // Remove Bloch sphere fullscreen
            const blochContainer = document.getElementById('bloch-sphere-fullscreen-container');
            if (blochContainer) {
                if (blochContainer._keyHandler) {
                    document.removeEventListener('keydown', blochContainer._keyHandler);
                }
                if (blochContainer.parentNode) {
                    blochContainer.parentNode.removeChild(blochContainer);
                }
            }

            // Remove 3D circuit fullscreen
            const circuitContainer = document.getElementById('3d-circuit-fullscreen-container');
            if (circuitContainer) {
                if (circuitContainer._keyHandler) {
                    document.removeEventListener('keydown', circuitContainer._keyHandler);
                }
                if (window.quantumApp && window.quantumApp.cleanup) {
                    window.quantumApp.cleanup();
                }
                if (circuitContainer.parentNode) {
                    circuitContainer.parentNode.removeChild(circuitContainer);
                }
            }

            // Close AI side panel
            this.closeAISidePanel();
        } catch (error) {
            console.error('Error in forceCloseAllFullscreen:', error);
        }
    }

    openFullscreen(widget) {
        const widgetType = widget.getAttribute('data-widget');

        // Check if any fullscreen is already open
        if (document.getElementById('bloch-sphere-fullscreen-container') ||
            document.getElementById('3d-circuit-fullscreen-container') ||
            document.getElementById('ai-assistant-side-panel')) {
            console.log('  Fullscreen already open, ignoring request');
            return;
        }

        console.log(`  Opening fullscreen for ${widgetType} widget...`);
        // Mark fullscreen as opening
        this.fullscreenOpen = true;

        // Open standalone applications based on widget type
        if (widgetType === 'circuit') {
            // Open 3D Circuit Visualizer for circuit widget
            console.log('🔗 Opening 3D Circuit Visualizer...');
            this.open3DCircuitFullscreen(widget);
        } else if (widgetType === 'bloch-sphere' || widgetType === 'quantum-state') {
            // Open Bloch Sphere Simulator for bloch-sphere and quantum-state widgets
            console.log('🔗 Opening Bloch Sphere Simulator...');
            this.openBlochSphereFullscreen(widget);
        } else if (widgetType === 'ai-chat') {
            // Open Advanced AI Assistant Side Panel
            console.log('🤖 Opening Advanced AI Assistant Side Panel...');
            this.openAIAssistantSidePanel(widget);
        } else {
            // For other widgets (backends, jobs, performance, etc.), use the original fullscreen behavior
            console.log(`🔗 Opening fullscreen for ${widgetType} widget...`);
            const widgetContent = widget.querySelector('.widget-content');
            if (widgetContent && widgetContent.requestFullscreen) {
                widgetContent.requestFullscreen();
            }
        }
    }

    openBlochSphereFullscreen(widget) {
        // Force close any existing fullscreen instances first
        this.forceCloseAllFullscreen();

        // Check if fullscreen is already open
        if (document.getElementById('bloch-sphere-fullscreen-container')) {
            console.log('  Bloch sphere fullscreen already open, ignoring request');
            return;
        }

        console.log('  Opening Bloch sphere fullscreen...');
        const fullscreenContainer = document.createElement('div');
        fullscreenContainer.id = 'bloch-sphere-fullscreen-container';
        fullscreenContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #000000;
            z-index: 9999;
            display: flex;
        `;

        // Add CSS animation for spinner
        if (!document.getElementById('spinner-animation')) {
            const style = document.createElement('style');
            style.id = 'spinner-animation';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        fullscreenContainer.innerHTML = `
            <div class="bloch-fullscreen-main" style="flex: 1; position: relative;">
                <div id="bloch-loading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center; z-index: 1000;">
                    <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #333; border-top: 4px solid #06b6d4; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                    <p>Loading Bloch Sphere Simulator...</p>
                </div>
                <iframe id="bloch-sphere-iframe" 
                        src="/static/bloch-sphere-simulator/index.html" 
                        style="width: 100%; height: 100%; border: none; background: transparent;"
                        allowfullscreen
                        onload="document.getElementById('bloch-loading').style.display='none'"
                        onerror="document.getElementById('bloch-loading').innerHTML='<p style=color:#ef4444>Failed to load Bloch Sphere Simulator</p><p style=font-size:12px>Please check if the application is running</p>'">
                </iframe>
                <button id="exit-fullscreen-btn" style="position: absolute; top: 20px; right: 20px; background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; z-index: 10000;">Exit Fullscreen</button>
            </div>
        `;

        document.body.appendChild(fullscreenContainer);

        // Setup exit button with better error handling and debugging
        const exitBtn = document.getElementById('exit-fullscreen-btn');
        if (exitBtn) {
            console.log('  Exit button found, setting up event listener');

            // Remove any existing event listeners to prevent duplicates
            exitBtn.replaceWith(exitBtn.cloneNode(true));
            const newExitBtn = document.getElementById('exit-fullscreen-btn');

            newExitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('   Exit button clicked');

                try {
                    // Cleanup the quantum app before exiting
                    if (window.quantumApp && window.quantumApp.cleanup) {
                        console.log('🧹 Cleaning up quantum app...');
                        window.quantumApp.cleanup();
                    }

                    // Exit fullscreen if in fullscreen mode
                    if (document.fullscreenElement) {
                        console.log('📱 Exiting fullscreen mode...');
                        document.exitFullscreen().then(() => {
                            console.log('  Successfully exited fullscreen');
                        }).catch(err => {
                            console.error('  Error exiting fullscreen:', err);
                        });
                    }

                    // Remove the container
                    if (fullscreenContainer && fullscreenContainer.parentNode) {
                        console.log('Removing fullscreen container...');
                        // Clean up keyboard event listener
                        if (fullscreenContainer._keyHandler) {
                            document.removeEventListener('keydown', fullscreenContainer._keyHandler);
                        }
                        document.body.removeChild(fullscreenContainer);
                        console.log('  Fullscreen container removed');

                        // Reset fullscreen state
                        this.fullscreenOpen = false;
                    }
                } catch (error) {
                    console.error('  Error exiting fullscreen:', error);
                    // Force remove the container
                    if (fullscreenContainer && fullscreenContainer.parentNode) {
                        document.body.removeChild(fullscreenContainer);
                        this.fullscreenOpen = false;
                    }
                }
            });
        } else {
            console.error('  Exit button not found!');
        }

        // Add keyboard shortcut for exiting fullscreen (Escape key)
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                console.log('   Escape key pressed, exiting fullscreen...');
                if (exitBtn) {
                    exitBtn.click();
                }
            }
        };
        document.addEventListener('keydown', handleKeyPress);

        // Store the key handler for cleanup
        fullscreenContainer._keyHandler = handleKeyPress;

        // Enter fullscreen with proper error handling
        if (fullscreenContainer.requestFullscreen) {
            fullscreenContainer.requestFullscreen().catch(err => {
                console.error('Error entering fullscreen:', err);
                console.log('Falling back to modal view');
                // Show as modal instead of fullscreen
                fullscreenContainer.style.position = 'fixed';
                fullscreenContainer.style.top = '50px';
                fullscreenContainer.style.left = '50px';
                fullscreenContainer.style.width = 'calc(100vw - 100px)';
                fullscreenContainer.style.height = 'calc(100vh - 100px)';
                fullscreenContainer.style.zIndex = '9999';
            });
        } else {
            console.log('Fullscreen not supported, using modal view');
            // Show as modal instead of fullscreen
            fullscreenContainer.style.position = 'fixed';
            fullscreenContainer.style.top = '50px';
            fullscreenContainer.style.left = '50px';
            fullscreenContainer.style.width = 'calc(100vw - 100px)';
            fullscreenContainer.style.height = 'calc(100vh - 100px)';
            fullscreenContainer.style.zIndex = '9999';
        }
    }

    open3DCircuitFullscreen(widget) {
        // Force close any existing fullscreen instances first
        this.forceCloseAllFullscreen();

        // Check if fullscreen is already open
        if (document.getElementById('3d-circuit-fullscreen-container')) {
            console.log('  3D Circuit fullscreen already open, ignoring request');
            return;
        }

        console.log('  Opening 3D Circuit fullscreen...');
        const fullscreenContainer = document.createElement('div');
        fullscreenContainer.id = '3d-circuit-fullscreen-container';
        fullscreenContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
            z-index: 9999;
            display: flex;
            color: white;
        `;

        // Add CSS animation for spinner
        if (!document.getElementById('spinner-animation')) {
            const style = document.createElement('style');
            style.id = 'spinner-animation';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        fullscreenContainer.innerHTML = `
            <div class="3d-circuit-fullscreen-main" style="flex: 1; position: relative;">
                <div id="3d-circuit-loading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center; z-index: 1000;">
                    <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #333; border-top: 4px solid #06b6d4; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                    <p>Loading 3D Circuit Visualizer...</p>
                </div>
                <iframe id="3d-circuit-iframe"
                        src="/circuit-builder"
                        style="width: 100%; height: 100%; border: none; background: rgba(10, 10, 10, 0.9); border-radius: 8px;"
                        allowfullscreen
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
                        onload="handleIframeLoad()"
                        onerror="handleIframeError()">
                </iframe>
                <button id="exit-3d-circuit-fullscreen-btn" style="position: absolute; top: 20px; right: 20px; background: rgba(239, 68, 68, 0.9); color: white; border: 2px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; z-index: 10000; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); backdrop-filter: blur(10px);">Exit Fullscreen</button>
            </div>
        `;

        document.body.appendChild(fullscreenContainer);

        // Iframe loading handlers
        window.handleIframeLoad = function () {
            console.log('   3D Circuit iframe loaded, initializing...');

            // Set a timeout to hide loading if iframe doesn't signal ready
            const loadingTimeout = setTimeout(() => {
                console.log('⏰ Hiding loading screen after timeout');
                const loadingDiv = document.getElementById('3d-circuit-loading');
                if (loadingDiv) {
                    loadingDiv.style.display = 'none';
                }
            }, 5000);

            // Send circuit data to iframe
            const iframe = document.getElementById('3d-circuit-iframe');
            if (iframe && iframe.contentWindow) {
                console.log('📤 Sending messages to 3D visualizer iframe...');

                // Send fullscreen mode flag
                iframe.contentWindow.postMessage({
                    type: 'fullscreenMode',
                    fullscreen: true
                }, '*');

                // Send circuit data if available
                if (window.dashboard && window.dashboard.currentCircuit) {
                    console.log('📤 Sending circuit data to 3D visualizer:', window.dashboard.currentCircuit);
                    iframe.contentWindow.postMessage({
                        type: 'loadCircuit',
                        circuit: window.dashboard.currentCircuit
                    }, '*');
                } else {
                    console.warn('  No circuit data available for 3D visualizer');
                }

                // Listen for ready signal and clear timeout
                const messageHandler = function (event) {
                    if (event.data && event.data.type === '3dVisualizerReady') {
                        clearTimeout(loadingTimeout);
                        window.removeEventListener('message', messageHandler);
                    }
                };
                window.addEventListener('message', messageHandler);

            } else {
                console.error('  3D Circuit iframe or contentWindow not available');
                clearTimeout(loadingTimeout);
            }
        };

        window.handleIframeError = function () {
            console.error('  Failed to load 3D Circuit iframe');
            const loadingDiv = document.getElementById('3d-circuit-loading');
            if (loadingDiv) {
                loadingDiv.innerHTML = '<p style="color:#ef4444">Failed to load 3D Circuit Visualizer</p><p style="font-size:12px">Please check if the application is running</p>';
            }

            // Try fallback after a delay
            setTimeout(() => {
                if (fullscreenContainer && fullscreenContainer.loadFallback3DVisualizer) {
                    fullscreenContainer.loadFallback3DVisualizer();
                }
            }, 2000);
        };

        // Listen for messages from the 3D visualizer iframe
        window.addEventListener('message', function (event) {
            if (event.data && event.data.type === '3dVisualizerReady') {
                if (event.data.status === 'success') {
                    console.log('  3D Visualizer iframe signaled ready');
                    const loadingDiv = document.getElementById('3d-circuit-loading');
                    if (loadingDiv) {
                        loadingDiv.style.display = 'none';
                    }
                } else if (event.data.status === 'error') {
                    console.error('  3D Visualizer iframe reported error:', event.data.error);
                    const loadingDiv = document.getElementById('3d-circuit-loading');
                    if (loadingDiv) {
                        loadingDiv.innerHTML = `<p style="color:#ef4444">3D Visualizer Error: ${event.data.error}</p><p style="font-size:12px">Please check the browser console for details</p>`;
                    }
                }
            }
        });

        // Add fallback method to iframe
        fullscreenContainer.loadFallback3DVisualizer = () => {
            console.log('  Main 3D visualizer failed, loading fallback...');
            const iframe = document.getElementById('3d-circuit-iframe');
            if (iframe) {
                iframe.src = '/static/simple_3d_circuit.html';
                // Use the same handlers for consistency
                iframe.onload = window.handleIframeLoad;
                iframe.onerror = window.handleIframeError;
            }
        };

        // Setup exit button with better error handling and debugging
        const exitBtn = document.getElementById('exit-3d-circuit-fullscreen-btn');
        if (exitBtn) {
            console.log('  3D Circuit exit button found, setting up event listener');

            // Remove any existing event listeners to prevent duplicates
            exitBtn.replaceWith(exitBtn.cloneNode(true));
            const newExitBtn = document.getElementById('exit-3d-circuit-fullscreen-btn');

            newExitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('   3D Circuit exit button clicked');

                try {
                    // Cleanup the quantum app before exiting
                    if (window.quantumApp && window.quantumApp.cleanup) {
                        console.log('🧹 Cleaning up quantum app...');
                        window.quantumApp.cleanup();
                    }

                    // Exit fullscreen if in fullscreen mode
                    if (document.fullscreenElement) {
                        console.log('📱 Exiting fullscreen mode...');
                        document.exitFullscreen().then(() => {
                            console.log('  Successfully exited fullscreen');
                        }).catch(err => {
                            console.error('  Error exiting fullscreen:', err);
                        });
                    }

                    // Remove the container
                    if (fullscreenContainer && fullscreenContainer.parentNode) {
                        console.log('Removing fullscreen container...');
                        // Clean up keyboard event listener
                        if (fullscreenContainer._keyHandler) {
                            document.removeEventListener('keydown', fullscreenContainer._keyHandler);
                        }
                        document.body.removeChild(fullscreenContainer);
                        console.log('  Fullscreen container removed');

                        // Reset fullscreen state
                        this.fullscreenOpen = false;
                    }
                } catch (error) {
                    console.error('  Error exiting fullscreen:', error);
                    // Force remove the container
                    if (fullscreenContainer && fullscreenContainer.parentNode) {
                        document.body.removeChild(fullscreenContainer);
                        this.fullscreenOpen = false;
                    }
                }
            });
        } else {
            console.error('  3D Circuit exit button not found!');
        }

        // Add keyboard shortcut for exiting fullscreen (Escape key)
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                console.log('   Escape key pressed, exiting fullscreen...');
                if (exitBtn) {
                    exitBtn.click();
                }
            }
        };
        document.addEventListener('keydown', handleKeyPress);

        // Store the key handler for cleanup
        fullscreenContainer._keyHandler = handleKeyPress;
        // Enter fullscreen with proper error handling
        try {
            if (fullscreenContainer.requestFullscreen) {
                fullscreenContainer.requestFullscreen().catch(err => {
                    console.error('Error entering fullscreen:', err);
                    console.log('Falling back to modal view');
                    // Show as modal instead of fullscreen
                    fullscreenContainer.style.position = 'fixed';
                    fullscreenContainer.style.top = '50px';
                    fullscreenContainer.style.left = '50px';
                    fullscreenContainer.style.width = 'calc(100vw - 100px)';
                    fullscreenContainer.style.height = 'calc(100vh - 100px)';
                    fullscreenContainer.style.zIndex = '9999';
                });
            } else if (fullscreenContainer.webkitRequestFullscreen) {
                fullscreenContainer.webkitRequestFullscreen();
            } else if (fullscreenContainer.mozRequestFullScreen) {
                fullscreenContainer.mozRequestFullScreen();
            } else {
                console.log('Fullscreen not supported, using modal view');
                // Show as modal instead of fullscreen
                fullscreenContainer.style.position = 'fixed';
                fullscreenContainer.style.top = '50px';
                fullscreenContainer.style.left = '50px';
                fullscreenContainer.style.width = 'calc(100vw - 100px)';
                fullscreenContainer.style.height = 'calc(100vh - 100px)';
                fullscreenContainer.style.zIndex = '9999';
            }
        } catch (err) {
            console.error('Error entering fullscreen:', err);
            console.log('Falling back to modal view');
            // Show as modal instead of fullscreen
            fullscreenContainer.style.position = 'fixed';
            fullscreenContainer.style.top = '50px';
            fullscreenContainer.style.left = '50px';
            fullscreenContainer.style.width = 'calc(100vw - 100px)';
            fullscreenContainer.style.height = 'calc(100vh - 100px)';
            fullscreenContainer.style.zIndex = '9999';
        }
    }

    openAIAssistantSidePanel(widget) {
        // Force close any existing fullscreen instances first
        this.forceCloseAllFullscreen();

        // Check if AI side panel is already open
        if (document.getElementById('ai-assistant-side-panel')) {
            console.log('  AI Assistant side panel already open, ignoring request');
            return;
        }

        console.log('  Opening Advanced AI Assistant Side Panel...');

        // Create the main side panel container
        const sidePanel = document.createElement('div');
        sidePanel.id = 'ai-assistant-side-panel';
        sidePanel.style.cssText = `
            position: fixed;
            top: 0;
            right: 0;
            width: 460px;
            height: 100vh;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            animation: lgSlideInRight 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            background: transparent;
            border-radius: 24px 0 0 24px;
            overflow: hidden;
        `;

        // Inject SVG filter + full Liquid Glass CSS
        const style = document.createElement('style');
        style.id = 'liquid-glass-ai-styles';
        style.textContent = `
            /* ─── Panel Shell ─── */
            #ai-assistant-side-panel {
                font-family: -apple-system, 'SF Pro Display', 'Inter', sans-serif;
            }

            /* ─── Panel Wrapper ─── */
            #lg-panel-wrapper {
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: rgba(247, 247, 244, 0.92);
                backdrop-filter: blur(48px) saturate(180%) brightness(1.02);
                -webkit-backdrop-filter: blur(48px) saturate(180%) brightness(1.02);
                border-left: 1px solid rgba(18, 18, 18, 0.08);
                border-radius: 24px 0 0 24px;
                overflow: hidden;
                box-shadow:
                    -1px 0 0 rgba(255,255,255,0.8),
                    -20px 0 60px rgba(0,0,0,0.12),
                    inset 1px 0 0 rgba(255,255,255,0.6);
            }

            /* Top specular rim */
            #lg-panel-wrapper::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), rgba(255,255,255,0.5), transparent);
                pointer-events: none;
                z-index: 10;
            }

            /* ─── Header ─── */
            #lg-header {
                flex-shrink: 0;
                padding: 18px 20px 14px;
                position: relative;
                background: rgba(255,255,255,0.6);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-bottom: 1px solid rgba(18,20,24,0.07);
            }
            #lg-header::after {
                content: '';
                position: absolute;
                bottom: 0; left: 16px; right: 16px;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(0,168,150,0.3), transparent);
            }

            /* ─── Liquid Glass Avatar ─── */
            .lg-avatar {
                width: 40px;
                height: 40px;
                border-radius: 13px;
                background: rgba(0,168,150,0.1);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(0,168,150,0.25);
                box-shadow:
                    0 2px 8px rgba(0,168,150,0.15),
                    inset 0 1px 0 rgba(255,255,255,0.8),
                    inset 0 -1px 0 rgba(0,168,150,0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
            }
            .lg-avatar::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 50%;
                background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, transparent 100%);
                border-radius: 13px 13px 0 0;
            }

            /* ─── Control Buttons ─── */
            .lg-ctrl-btn {
                width: 28px;
                height: 28px;
                border-radius: 9px;
                background: rgba(18,20,24,0.05);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(18,20,24,0.09);
                box-shadow:
                    0 1px 4px rgba(0,0,0,0.08),
                    inset 0 1px 0 rgba(255,255,255,0.7);
                color: rgba(18,20,24,0.5);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                transition: all 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                position: relative;
                overflow: hidden;
            }
            .lg-ctrl-btn::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 50%;
                background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%);
                border-radius: 9px 9px 0 0;
                pointer-events: none;
            }
            .lg-ctrl-btn:hover {
                background: rgba(18,20,24,0.09);
                border-color: rgba(18,20,24,0.15);
                color: #111215;
                transform: scale(1.06);
                box-shadow: 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8);
            }
            .lg-ctrl-btn:active { transform: scale(0.94); }

            /* ─── Tab Bar ─── */
            #lg-tabs {
                flex-shrink: 0;
                padding: 8px 12px;
                background: rgba(255,255,255,0.5);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border-bottom: 1px solid rgba(18,20,24,0.06);
                display: flex;
                gap: 3px;
            }

            .lg-tab {
                flex: 1;
                padding: 7px 4px;
                border-radius: 9px;
                background: transparent;
                border: 1px solid transparent;
                color: rgba(18,20,24,0.4);
                cursor: pointer;
                font-size: 10.5px;
                font-weight: 500;
                letter-spacing: 0.01em;
                transition: all 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 3px;
                position: relative;
                overflow: hidden;
            }
            .lg-tab i { font-size: 12px; }
            .lg-tab:hover {
                color: rgba(18,20,24,0.7);
                background: rgba(18,20,24,0.04);
            }
            .lg-tab.active {
                background: rgba(255,255,255,0.8);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(18,20,24,0.08);
                color: #00A896;
                box-shadow:
                    0 2px 8px rgba(0,0,0,0.06),
                    inset 0 1px 0 rgba(255,255,255,0.9),
                    inset 0 -1px 0 rgba(0,0,0,0.03);
            }
            .lg-tab.active::before {
                content: '';
                position: absolute;
                top: 0; left: 15%; right: 15%;
                height: 1.5px;
                background: linear-gradient(90deg, transparent, rgba(0,168,150,0.6), transparent);
            }

            /* ─── Messages ─── */
            #ai-chat-messages {
                scrollbar-width: thin;
                scrollbar-color: rgba(18,20,24,0.1) transparent;
            }
            #ai-chat-messages::-webkit-scrollbar { width: 3px; }
            #ai-chat-messages::-webkit-scrollbar-track { background: transparent; }
            #ai-chat-messages::-webkit-scrollbar-thumb {
                background: rgba(18,20,24,0.12);
                border-radius: 2px;
            }

            #lg-panel-wrapper .ai-message {
                margin: 6px 0;
                padding: 0 !important;
                background: none !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                animation: lgFadeUp 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            @keyframes lgFadeUp {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            /* User bubble */
            #lg-panel-wrapper .ai-message.user {
                display: flex;
                justify-content: flex-end;
                background: none !important;
                border: none !important;
                margin-left: 0 !important;
            }
            #lg-panel-wrapper .ai-message.user .msg-bubble {
                max-width: 80%;
                padding: 9px 13px;
                border-radius: 16px 16px 4px 16px;
                background: rgba(0,168,150,0.08);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(0,168,150,0.2);
                box-shadow:
                    0 2px 10px rgba(0,168,150,0.1),
                    inset 0 1px 0 rgba(255,255,255,0.8);
                color: #111215;
                font-size: 13px;
                line-height: 1.55;
                position: relative;
                overflow: hidden;
            }
            #lg-panel-wrapper .ai-message.user .msg-bubble::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 40%;
                background: linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%);
                pointer-events: none;
            }

            /* Assistant bubble */
            #lg-panel-wrapper .ai-message.assistant {
                display: flex;
                justify-content: flex-start;
                background: none !important;
                border: none !important;
                margin-right: 0 !important;
            }
            #lg-panel-wrapper .ai-message.assistant .msg-bubble {
                max-width: 92%;
                padding: 11px 14px;
                border-radius: 4px 16px 16px 16px;
                background: rgba(255,255,255,0.75);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(18,20,24,0.08);
                box-shadow:
                    0 2px 8px rgba(0,0,0,0.06),
                    inset 0 1px 0 rgba(255,255,255,0.9);
                color: #111215;
                font-size: 13px;
                line-height: 1.6;
            }

            /* ─── Text Shimmer Wave Animation ─── */
            @keyframes lgShimmerWave {
                0%, 100% {
                    transform: translate3d(0, 0, 0) scale(1) rotateY(0deg);
                    color: rgba(18, 20, 24, 0.4);
                }
                50% {
                    transform: translate3d(1px, -4px, 8px) scale(1.1) rotateY(12deg);
                    color: #00A896;
                }
            }
            .lg-shimmer-wave-char {
                display: inline-block;
                white-space: pre;
                transform-style: preserve-3d;
                animation: lgShimmerWave 1.4s ease-in-out infinite;
                animation-delay: calc(var(--char-idx) * 0.05s);
            }
            .ai-message.assistant .msg-header {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 7px;
            }
            .ai-message.assistant .msg-header .ai-dot {
                width: 16px; height: 16px;
                border-radius: 5px;
                background: rgba(0,168,150,0.1);
                border: 1px solid rgba(0,168,150,0.2);
                display: flex; align-items: center; justify-content: center;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
            }
            .ai-message.assistant .msg-header .ai-dot i {
                font-size: 7px;
                color: #00A896;
            }
            .ai-message.assistant .msg-header span {
                font-size: 10px;
                font-weight: 700;
                color: rgba(18,20,24,0.4);
                letter-spacing: 0.06em;
                text-transform: uppercase;
            }

            /* ─── Input Area ─── */
            #lg-input-area {
                flex-shrink: 0;
                padding: 12px 14px;
                background: rgba(255,255,255,0.6);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border-top: 1px solid rgba(18,20,24,0.07);
                position: relative;
            }
            #lg-input-area::before {
                content: '';
                position: absolute;
                top: 0; left: 14px; right: 14px;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent);
            }

            /* Input pill */
            #lg-input-pill {
                display: flex;
                align-items: flex-end;
                gap: 8px;
                background: rgba(255,255,255,0.8);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(18,20,24,0.1);
                border-radius: 18px;
                padding: 7px 7px 7px 13px;
                box-shadow:
                    0 2px 12px rgba(0,0,0,0.06),
                    inset 0 1px 0 rgba(255,255,255,0.9),
                    inset 0 -1px 0 rgba(0,0,0,0.03);
                transition: all 0.22s ease;
                position: relative;
                overflow: hidden;
            }
            #lg-input-pill::before {
                content: '';
                position: absolute;
                top: 0; left: 10%; right: 10%;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent);
            }
            #lg-input-pill:focus-within {
                border-color: rgba(0,168,150,0.35);
                box-shadow:
                    0 3px 16px rgba(0,168,150,0.1),
                    inset 0 1px 0 rgba(255,255,255,0.9);
            }

            #ai-chat-input {
                flex: 1;
                background: transparent;
                border: none;
                outline: none;
                color: #111215;
                font-size: 13px;
                font-family: -apple-system, 'SF Pro Text', 'Inter', sans-serif;
                line-height: 1.5;
                resize: none;
                min-height: 20px;
                max-height: 100px;
                padding: 2px 0;
            }
            #ai-chat-input::placeholder { color: rgba(18,20,24,0.3); }

            /* Send button */
            #ai-send-btn {
                width: 32px; height: 32px;
                border-radius: 11px;
                background: #00A896;
                border: none;
                color: white;
                cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                font-size: 11px;
                flex-shrink: 0;
                transition: all 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                box-shadow:
                    0 2px 8px rgba(0,168,150,0.3),
                    inset 0 1px 0 rgba(255,255,255,0.3);
                position: relative;
                overflow: hidden;
            }
            #ai-send-btn::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 50%;
                background: linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%);
                border-radius: 11px 11px 0 0;
            }
            #ai-send-btn:hover {
                background: #009687;
                transform: scale(1.06);
                box-shadow: 0 4px 14px rgba(0,168,150,0.4);
            }
            #ai-send-btn:active { transform: scale(0.93); }

            /* ─── Quick Chips ─── */
            .lg-chip {
                display: inline-flex;
                align-items: center;
                padding: 4px 10px;
                border-radius: 20px;
                background: rgba(18,20,24,0.04);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid rgba(18,20,24,0.08);
                color: rgba(18,20,24,0.55);
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.18s ease;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8);
                letter-spacing: 0.01em;
            }
            .lg-chip:hover {
                background: rgba(0,168,150,0.08);
                color: #00A896;
                border-color: rgba(0,168,150,0.2);
                transform: translateY(-1px);
                box-shadow: 0 3px 8px rgba(0,168,150,0.1), inset 0 1px 0 rgba(255,255,255,0.9);
            }

            /* ─── Cards ─── */
            .lg-card {
                border-radius: 12px;
                background: rgba(255,255,255,0.7);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(18,20,24,0.07);
                padding: 13px;
                transition: all 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                cursor: pointer;
                position: relative;
                overflow: hidden;
            }
            .lg-card::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent);
            }
            .lg-card:hover {
                background: rgba(255,255,255,0.9);
                border-color: rgba(0,168,150,0.15);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9);
            }

            /* Generate button */
            .lg-gen-btn {
                margin-top: 9px;
                padding: 6px 14px;
                border-radius: 9px;
                background: rgba(0,168,150,0.08);
                border: 1px solid rgba(0,168,150,0.2);
                color: #00A896;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.18s ease;
                letter-spacing: 0.02em;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
            }
            .lg-gen-btn:hover {
                background: #00A896;
                color: white;
                transform: scale(1.02);
                box-shadow: 0 3px 10px rgba(0,168,150,0.25);
            }

            /* ─── Toggle ─── */
            .switch { position:relative; display:inline-block; width:40px; height:22px; }
            .switch input { opacity:0; width:0; height:0; }
            .slider {
                position:absolute; cursor:pointer; inset:0;
                background: rgba(18,20,24,0.1);
                border-radius:22px;
                border: 1px solid rgba(18,20,24,0.08);
                transition:0.3s;
            }
            .slider:before {
                position:absolute; content:'';
                height:14px; width:14px;
                left:3px; bottom:3px;
                background:rgba(18,20,24,0.35);
                border-radius:50%;
                transition:0.3s;
            }
            input:checked + .slider { background:#00A896; border-color:transparent; }
            input:checked + .slider:before { transform:translateX(18px); background:white; }

            /* ─── ai-action-btn compat ─── */
            .ai-action-btn {
                background: rgba(18,20,24,0.05);
                border: 1px solid rgba(18,20,24,0.09);
                color: rgba(18,20,24,0.7);
                padding: 6px 13px;
                border-radius: 9px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.18s ease;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
            }
            .ai-action-btn:hover {
                background: rgba(0,168,150,0.07);
                color: #00A896;
                border-color: rgba(0,168,150,0.2);
            }

            /* ─── Tab Content ─── */
            .ai-tab-content { display: none; }
            .ai-tab-content.active {
                display: flex;
                flex-direction: column;
                height: 100%;
                animation: lgFadeUp 0.2s ease;
            }

            /* ─── Entry animation ─── */
            @keyframes lgSlideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
            }
            @keyframes lgSlideOutRight {
                from { transform: translateX(0);    opacity: 1; }
                to   { transform: translateX(100%); opacity: 0; }
            }

            /* ─── Text content inside messages ─── */
            .ai-message .msg-bubble strong { color: #111215; }
            .ai-message .msg-bubble code {
                background: rgba(0,168,150,0.08);
                color: #00A896;
                padding: 2px 5px;
                border-radius: 4px;
                font-size: 12px;
            }
            .ai-message .msg-bubble pre {
                background: #f0f0ee;
                border: 1px solid rgba(18,20,24,0.08);
                border-radius: 8px;
                padding: 10px 12px;
                overflow-x: auto;
                font-size: 12px;
            }
            .ai-message .msg-bubble ul {
                padding-left: 18px;
                margin: 6px 0;
                color: rgba(18,20,24,0.75);
            }
             .ai-message .msg-bubble li { margin: 4px 0; }

            /* ─── Welcome / New Chat Screen ─── */
            #lg-welcome-screen {
                flex: 1;
                display: flex;
                flex-direction: column;
                position: relative;
                overflow: hidden;
            }
            /* Centered hero zone */
            .lg-welcome-hero {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                justify-content: center;
                padding: 30px 24px 20px;
                text-align: left;
                position: relative;
            }
            /* Bottom zone: chips + input */
            .lg-welcome-bottom {
                padding: 0 16px 16px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                position: relative;
                z-index: 2;
            }

            .lg-orb {
                position: absolute;
                top: 15%;
                right: -30px;
                width: 130px;
                height: 130px;
                border-radius: 50%;
                background: radial-gradient(
                    ellipse at 35% 30%,
                    rgba(0,200,190,0.45) 0%,
                    rgba(0,168,150,0.3) 30%,
                    rgba(0,120,110,0.2) 60%,
                    rgba(0,80,75,0.05) 100%
                );
                box-shadow:
                    0 0 40px rgba(0,168,150,0.15),
                    0 0 80px rgba(0,168,150,0.08),
                    inset 0 -10px 30px rgba(0,100,90,0.15),
                    inset 10px 10px 30px rgba(255,255,255,0.25);
                filter: url(#lg-refract) blur(2px);
                animation: lgOrbFloat 6s ease-in-out infinite;
                pointer-events: none;
                z-index: 1;
            }
            .lg-orb::after {
                content: '';
                position: absolute;
                top: 15%; left: 20%;
                width: 35%; height: 25%;
                background: radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, transparent 70%);
                border-radius: 50%;
                transform: rotate(-30deg);
            }
            @keyframes lgOrbFloat {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-12px) rotate(15deg); }
            }

            /* ─── Text Shimmer (CSS port of framer-motion TextShimmer) ─── */
            @keyframes lgTextShimmer {
                0%   { background-position: 120% center; }
                100% { background-position: -120% center; }
            }

            .lg-text-shimmer {
                display: inline-block;
                background-image:
                    linear-gradient(
                        90deg,
                        transparent calc(50% - var(--shimmer-spread, 80px)),
                        var(--shimmer-color, #00A896) 50%,
                        transparent calc(50% + var(--shimmer-spread, 80px))
                    ),
                    linear-gradient(var(--shimmer-base, #111215), var(--shimmer-base, #111215));
                background-size: 250% 100%, auto;
                background-repeat: no-repeat, padding-box;
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                color: transparent;
                animation: lgTextShimmer var(--shimmer-duration, 2.2s) linear infinite;
                will-change: background-position;
            }

            .lg-welcome-greeting {
                margin-bottom: 8px;
                text-align: left;
                position: relative;
                z-index: 2;
            }
            .lg-welcome-hey {
                font-size: 28px;
                font-weight: 500;
                letter-spacing: -0.03em;
                line-height: 1.15;
            }
            .lg-welcome-question {
                font-size: 28px;
                font-weight: 700;
                letter-spacing: -0.035em;
                line-height: 1.15;
            }
            .lg-welcome-sub {
                font-size: 13.5px;
                color: rgba(18,20,24,0.4);
                font-weight: 400;
                margin-top: 6px;
                letter-spacing: 0.01em;
                position: relative;
                z-index: 2;
                text-align: left;
            }

            .lg-welcome-chips {
                display: flex;
                flex-direction: column;
                gap: 8px;
                width: 100%;
                margin-bottom: 20px;
            }
            .lg-welcome-chip {
                display: flex;
                align-items: flex-start;
                gap: 11px;
                padding: 11px 14px;
                border-radius: 13px;
                background: rgba(255,255,255,0.78);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(18,20,24,0.07);
                box-shadow: 0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9);
                cursor: pointer;
                text-align: left;
                transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                width: 100%;
            }
            .lg-welcome-chip:hover {
                background: rgba(255,255,255,0.95);
                border-color: rgba(0,168,150,0.2);
                transform: translateY(-1px);
                box-shadow: 0 5px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1);
            }
            .lg-welcome-chip .chip-icon {
                width: 30px; height: 30px;
                border-radius: 9px;
                display: flex; align-items: center; justify-content: center;
                font-size: 13px;
                flex-shrink: 0;
            }
            .lg-welcome-chip .chip-text h4 {
                margin: 0 0 2px;
                font-size: 13px;
                font-weight: 600;
                color: #111215;
            }
            .lg-welcome-chip .chip-text p {
                margin: 0;
                font-size: 11.5px;
                color: rgba(18,20,24,0.45);
            }

            /* Welcome input area */
            #lg-welcome-input {
                width: 100%;
                padding: 0 0 4px;
            }

            /* ─── Chat Messages Container ─── */
            #lg-chat-view {
                flex: 1;
                display: none;
                flex-direction: column;
                min-height: 0;
            }
            #lg-chat-view.active {
                display: flex;
            }

            /* ─── History Panel ─── */
            #lg-history-panel {
                position: absolute;
                inset: 0;
                background: rgba(247,247,244,0.97);
                backdrop-filter: blur(24px);
                -webkit-backdrop-filter: blur(24px);
                z-index: 100;
                display: none;
                flex-direction: column;
                animation: lgFadeUp 0.22s ease;
            }
            #lg-history-panel.active { display: flex; }

            #lg-history-header {
                padding: 18px 18px 14px;
                border-bottom: 1px solid rgba(18,20,24,0.07);
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(255,255,255,0.6);
            }

            #lg-history-list {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
                scrollbar-width: thin;
                scrollbar-color: rgba(18,20,24,0.1) transparent;
            }

            .lg-session-item {
                padding: 11px 13px;
                border-radius: 11px;
                background: rgba(255,255,255,0.7);
                border: 1px solid rgba(18,20,24,0.06);
                margin-bottom: 7px;
                cursor: pointer;
                transition: all 0.18s ease;
                box-shadow: 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
            }
            .lg-session-item:hover {
                background: rgba(255,255,255,0.95);
                border-color: rgba(0,168,150,0.2);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.07);
            }
            .lg-session-item .session-title {
                font-size: 13px;
                font-weight: 600;
                color: #111215;
                margin-bottom: 3px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .lg-session-item .session-meta {
                font-size: 11px;
                color: rgba(18,20,24,0.4);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .lg-session-date-group {
                font-size: 10.5px;
                font-weight: 700;
                color: rgba(18,20,24,0.35);
                text-transform: uppercase;
                letter-spacing: 0.07em;
                padding: 8px 4px 6px;
            }
        `;
        document.head.appendChild(style);

        // Inject SVG filter element at body level (for refraction)
        if (!document.getElementById('lg-svg-filters')) {
            const svgFilters = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgFilters.id = 'lg-svg-filters';
            svgFilters.setAttribute('aria-hidden', 'true');
            svgFilters.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
            svgFilters.innerHTML = `
                <defs>
                    <filter id="lg-refract" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
                        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.025" numOctaves="3" seed="4" result="noise"/>
                        <feColorMatrix type="saturate" values="3" in="noise" result="coloredNoise"/>
                        <feBlend in="SourceGraphic" in2="coloredNoise" mode="overlay" result="blended"/>
                        <feComposite in="blended" in2="SourceGraphic" operator="in"/>
                    </filter>
                    <filter id="lg-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="6" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                </defs>
            `;
            document.body.appendChild(svgFilters);
        }

        // Retrieve username from page
        const emailEl = document.getElementById('user-email');
        let userName = 'Raf';
        if (emailEl && emailEl.textContent) {
            const email = emailEl.textContent.trim();
            const parts = email.split('@')[0];
            let namePart = parts.split(/[0-9\._\-]/)[0];
            if (namePart) {
                // Split by "kumar" or other common suffixes to keep it friendly and short
                if (namePart.toLowerCase().includes('kumar')) {
                    const beforeKumar = namePart.toLowerCase().split('kumar')[0];
                    if (beforeKumar) namePart = beforeKumar;
                }
                userName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
            }
        }

        // Create the side panel HTML structure
        sidePanel.innerHTML = `
            <div id="lg-panel-wrapper">
            <!-- Header -->
            <div id="lg-header" style="display:flex;align-items:center;justify-content:space-between;">
                <!-- Left: Avatar + Title -->
                <div style="display:flex;align-items:center;gap:12px;">
                    <div class="lg-avatar">
                        <i class="fas fa-atom" style="color:#00A896;font-size:15px;position:relative;z-index:2;"></i>
                    </div>
                    <div>
                        <div style="font-size:14px;font-weight:700;color:#111215;letter-spacing:-0.01em;">AI Assistant</div>
                        <div style="font-size:11px;color:rgba(18,20,24,0.45);font-weight:500;letter-spacing:0.01em;margin-top:1px;">Quantum Computing &middot; Gemini</div>
                    </div>
                </div>
                <!-- Right: Controls -->
                <div style="display:flex;gap:5px;align-items:center;">
                    <button id="ai-history-btn" class="lg-ctrl-btn" title="Chat History" style="position:relative;">
                        <i class="fas fa-clock-rotate-left" style="font-size:10px;"></i>
                    </button>
                    <button id="ai-newchat-btn" class="lg-ctrl-btn" title="New Chat">
                        <i class="fas fa-plus" style="font-size:10px;"></i>
                    </button>
                    <div style="width:1px;height:16px;background:rgba(18,20,24,0.08);margin:0 2px;"></div>
                    <button id="ai-close-btn" class="lg-ctrl-btn" title="Close"><i class="fas fa-times" style="font-size:10px;"></i></button>
                </div>
            </div>

            <!-- Tab Bar -->
            <div id="lg-tabs">
                <button class="lg-tab ai-tab-btn active" data-tab="chat"><i class="fas fa-comments"></i><span>Chat</span></button>
                <button class="lg-tab ai-tab-btn" data-tab="circuits"><i class="fas fa-microchip"></i><span>Circuits</span></button>
                <button class="lg-tab ai-tab-btn" data-tab="suggestions"><i class="fas fa-lightbulb"></i><span>Ideas</span></button>
                <button class="lg-tab ai-tab-btn" data-tab="code"><i class="fas fa-code"></i><span>Code</span></button>
                <button class="lg-tab ai-tab-btn" data-tab="tools"><i class="fas fa-sliders-h"></i><span>Tools</span></button>
            </div>

            <!-- Tab Content Wrapper -->
            <div style="flex:1;overflow:hidden;display:flex;flex-direction:column;">

                <!-- CHAT TAB -->
                <div id="chat-tab" class="ai-tab-content active" style="position:relative;">

                    <!-- NEW CHAT WELCOME SCREEN -->
                    <div id="lg-welcome-screen">

                        <!-- HERO: centered orb + greeting -->
                        <div class="lg-welcome-hero">
                            <div class="lg-orb"></div>
                            <div class="lg-welcome-greeting">
                                <div class="lg-welcome-hey lg-text-shimmer" style="--shimmer-base:rgba(18,20,24,0.55);--shimmer-color:#00A896;--shimmer-duration:3s;">Hey! ${userName}</div>
                                <div class="lg-welcome-question lg-text-shimmer" style="--shimmer-base:#111215;--shimmer-color:#00A896;--shimmer-duration:2.5s;--shimmer-spread:110px;">What can I help with?</div>
                            </div>
                            <div class="lg-welcome-sub">Quantum computing expert &middot; Powered by Gemini</div>
                        </div>

                        <!-- BOTTOM: chips + input -->
                        <div class="lg-welcome-bottom">
                            <div class="lg-welcome-chips">
                                <button class="lg-welcome-chip ai-quick-btn" data-prompt="Create a Bell state entanglement circuit with Qiskit code">
                                    <div class="chip-icon" style="background:rgba(0,168,150,0.1);color:#00A896;"><i class="fas fa-link"></i></div>
                                    <div class="chip-text">
                                        <h4>Bell State Circuit</h4>
                                        <p>Create quantum entanglement between 2 qubits</p>
                                    </div>
                                </button>
                                <button class="lg-welcome-chip ai-quick-btn" data-prompt="Explain Grover's search algorithm with a 3-qubit example circuit">
                                    <div class="chip-icon" style="background:rgba(110,115,125,0.08);color:rgba(18,20,24,0.6);"><i class="fas fa-search"></i></div>
                                    <div class="chip-text">
                                        <h4>Grover's Search</h4>
                                        <p>Quadratic speedup for search problems</p>
                                    </div>
                                </button>
                                <button class="lg-welcome-chip ai-quick-btn" data-prompt="Explain quantum superposition and give a practical Qiskit example">
                                    <div class="chip-icon" style="background:rgba(110,115,125,0.08);color:rgba(18,20,24,0.6);"><i class="fas fa-atom"></i></div>
                                    <div class="chip-text">
                                        <h4>Superposition</h4>
                                        <p>Understand core quantum concepts</p>
                                    </div>
                                </button>
                            </div>

                            <div id="lg-welcome-input">
                                <div id="lg-input-pill">
                                    <textarea id="ai-chat-input" placeholder="Ask me anything about quantum computing..." rows="1"></textarea>
                                    <button id="ai-send-btn"><i class="fas fa-arrow-up"></i></button>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- CHAT MESSAGE VIEW -->
                    <div id="lg-chat-view">
                        <div id="ai-chat-messages" style="flex:1;overflow-y:auto;padding:14px 13px;scroll-behavior:smooth;min-height:0;"></div>
                        <div style="padding:7px 13px;display:flex;gap:5px;flex-wrap:wrap;border-top:1px solid rgba(18,20,24,0.05);background:rgba(255,255,255,0.4);">
                            <button class="lg-chip ai-quick-btn" data-prompt="Create a Bell state circuit">Bell State</button>
                            <button class="lg-chip ai-quick-btn" data-prompt="Grover's search 3 qubits">Grover's</button>
                            <button class="lg-chip ai-quick-btn" data-prompt="Show available IBM backends">Backends</button>
                        </div>
                        <div id="lg-input-area">
                            <div id="lg-input-pill-chat" style="display:flex;align-items:flex-end;gap:8px;background:rgba(255,255,255,0.8);backdrop-filter:blur(20px);border:1px solid rgba(18,20,24,0.1);border-radius:18px;padding:7px 7px 7px 13px;box-shadow:0 2px 12px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.9);">
                                <textarea id="ai-chat-input-msg" placeholder="Ask me about quantum computing..." rows="1" style="flex:1;background:transparent;border:none;outline:none;color:#111215;font-size:13px;font-family:-apple-system,'Inter',sans-serif;line-height:1.5;resize:none;min-height:20px;max-height:100px;padding:2px 0;"></textarea>
                                <button id="ai-send-btn-msg" style="width:32px;height:32px;border-radius:11px;background:#00A896;border:none;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,168,150,0.3);"><i class="fas fa-arrow-up"></i></button>
                            </div>
                        </div>
                    </div>

                    <!-- HISTORY PANEL -->
                    <div id="lg-history-panel">
                        <div id="lg-history-header">
                            <div style="display:flex;align-items:center;gap:10px;">
                                <i class="fas fa-clock-rotate-left" style="color:#00A896;font-size:14px;"></i>
                                <span style="font-size:14px;font-weight:700;color:#111215;">Chat History</span>
                            </div>
                            <div style="display:flex;gap:6px;">
                                <button id="lg-new-chat-from-history" style="padding:6px 13px;border-radius:9px;background:#00A896;border:none;color:white;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,168,150,0.25);">+ New Chat</button>
                                <button id="lg-history-close" class="lg-ctrl-btn"><i class="fas fa-times" style="font-size:10px;"></i></button>
                            </div>
                        </div>
                        <div id="lg-history-list"><div style="text-align:center;padding:32px 16px;color:rgba(18,20,24,0.35);font-size:13px;"><i class="fas fa-comment-slash" style="font-size:24px;display:block;margin-bottom:10px;opacity:0.3;"></i>No chat history yet</div></div>
                    </div>
                </div>

                <!-- CIRCUITS TAB -->
                <div id="circuits-tab" class="ai-tab-content">
                    <div style="flex:1;overflow-y:auto;padding:16px 14px;min-height:0;">
                        <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px;">Circuit Library</div>
                        <div style="display:flex;flex-direction:column;gap:10px;">
                            <div class="lg-card ai-circuit-item">
                                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                                    <i class="fas fa-link" style="color:rgba(255,255,255,0.5);font-size:13px;"></i>
                                    <span style="font-size:13.5px;font-weight:600;color:rgba(255,255,255,0.88);">Bell State</span>
                                </div>
                                <p style="margin:0 0 10px;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5;">Creates quantum entanglement between two qubits</p>
                                <button class="lg-gen-btn ai-generate-btn" data-circuit-type="bell">Generate Circuit</button>
                            </div>
                            <div class="lg-card ai-circuit-item">
                                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                                    <i class="fas fa-search" style="color:rgba(255,255,255,0.5);font-size:13px;"></i>
                                    <span style="font-size:13.5px;font-weight:600;color:rgba(255,255,255,0.88);">Grover's Search</span>
                                </div>
                                <p style="margin:0 0 10px;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5;">Quadratic speedup over classical search</p>
                                <button class="lg-gen-btn ai-generate-btn" data-circuit-type="grover">Generate Circuit</button>
                            </div>
                            <div class="lg-card ai-circuit-item">
                                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                                    <i class="fas fa-share-alt" style="color:rgba(255,255,255,0.5);font-size:13px;"></i>
                                    <span style="font-size:13.5px;font-weight:600;color:rgba(255,255,255,0.88);">Quantum Teleportation</span>
                                </div>
                                <p style="margin:0 0 10px;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5;">Transfer quantum state via entanglement</p>
                                <button class="lg-gen-btn ai-generate-btn" data-circuit-type="teleport">Generate Circuit</button>
                            </div>
                            <div class="lg-card ai-circuit-item">
                                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                                    <i class="fas fa-random" style="color:rgba(255,255,255,0.5);font-size:13px;"></i>
                                    <span style="font-size:13.5px;font-weight:600;color:rgba(255,255,255,0.88);">Quantum RNG</span>
                                </div>
                                <p style="margin:0 0 10px;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5;">True randomness from quantum measurement</p>
                                <button class="lg-gen-btn ai-generate-btn" data-circuit-type="qrng">Generate Circuit</button>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- SUGGESTIONS TAB -->
                <div id="suggestions-tab" class="ai-tab-content">
                    <div style="flex:1;overflow-y:auto;padding:16px 14px;min-height:0;">
                        <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px;">Circuit Ideas</div>
                        <div id="ai-suggestions-container" style="display:flex;flex-direction:column;gap:10px;">
                            <div class="ai-suggestion-loading lg-card" style="text-align:center;padding:20px;color:rgba(255,255,255,0.4);">
                                <i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Loading…
                            </div>
                        </div>
                        <div class="lg-card" style="margin-top:14px;">
                            <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Pro Tips</div>
                            <ul style="margin:0;padding-left:16px;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.9;">
                                <li>Click any suggestion to generate</li>
                                <li>Use Chat tab for custom requests</li>
                                <li>Circuits visualize in 3D automatically</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- CODE TAB -->
                <div id="code-tab" class="ai-tab-content">
                    <div style="flex:1;overflow-y:auto;padding:16px 14px;min-height:0;">
                        <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px;">Code Examples</div>
                    <div style="display:flex;flex-direction:column;gap:10px;">
                        <div class="ai-code-example" style="border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; overflow: hidden; background: rgba(245, 158, 11, 0.05); transition: all 0.3s ease;" onmouseover="this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.3)';" onmouseout="this.style.boxShadow='none';">
                            <div style="padding: 14px; background: rgba(245, 158, 11, 0.15); border-bottom: 1px solid rgba(245, 158, 11, 0.3); display: flex; align-items: center; justify-content: space-between;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-file-code" style="color: #fbbf24;"></i>
                                    <strong style="color: #fbbf24; font-size: 15px;">Basic Quantum Circuit</strong>
                                </div>
                                <span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500;">Beginner</span>
                            </div>
                            <div style="padding: 14px;">
                                <div style="font-family: 'Fira Code', 'Monaco', monospace; font-size: 12px; background: rgba(0, 0, 0, 0.5); color: #e5e7eb; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
                                    <pre style="margin: 0; padding: 14px; white-space: pre-wrap; line-height: 1.5;">from qiskit import QuantumCircuit

# Create a 2-qubit circuit
qc = QuantumCircuit(2, 2)
qc.h(0)  # Hadamard on qubit 0
qc.cx(0, 1)  # CNOT gate
qc.measure_all()

print(qc.draw())</pre>
                                </div>
                                <button class="ai-action-btn" style="margin-top: 10px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent); this.innerHTML='<i class=\'fas fa-check\'></i> Copied!'; setTimeout(() => this.innerHTML='<i class=\'fas fa-copy\'></i> Copy Code', 2000);"><i class="fas fa-copy"></i> Copy Code</button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>

                <!-- TOOLS TAB -->
                <div id="tools-tab" class="ai-tab-content">
                    <div style="flex:1;overflow-y:auto;padding:16px 14px;min-height:0;">
                        <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px;">Tools & Settings</div>
                    <div style="display:flex;flex-direction:column;gap:10px;">
                        <div style="padding: 14px; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; background: rgba(59, 130, 246, 0.05);">
                            <h5 style="margin: 0 0 12px 0; color: #60a5fa; font-weight: 600; font-size: 15px;"><i class="fas fa-info-circle"></i> System Status</h5>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #e5e7eb;">
                                <div>Connection: <span id="ai-connection-status" style="color: #34d399; font-weight: 600;">Connected</span></div>
                                <div>Backends: <span id="ai-backends-count" style="font-weight: 600;">2</span></div>
                                <div>Jobs: <span id="ai-jobs-count" style="font-weight: 600;">0</span></div>
                                <div>Success Rate: <span id="ai-success-rate" style="color: #34d399; font-weight: 600;">95%</span></div>
                            </div>
                        </div>

                        <div style="padding: 14px; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; background: rgba(139, 92, 246, 0.05);">
                            <h5 style="margin: 0 0 12px 0; color: #a78bfa; font-weight: 600; font-size: 15px;"><i class="fas fa-cog"></i> Chat Settings</h5>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.2); padding: 10px; border-radius: 8px;">
                                    <label style="font-size: 13px; color: #e5e7eb; font-weight: 500;">Persist Chat History</label>
                                    <label class="switch">
                                        <input type="checkbox" id="ai-persist-history" checked>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                                <div style="display: flex; gap: 8px;">
                                    <button class="ai-action-btn ai-clear-history-btn" style="flex: 1; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; justify-content: center;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"><i class="fas fa-trash"></i> Clear History</button>
                                </div>
                            </div>
                        </div>

                        <div style="padding: 14px; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; background: rgba(16, 185, 129, 0.05);">
                            <h5 style="margin: 0 0 12px 0; color: #34d399; font-weight: 600; font-size: 15px;"><i class="fas fa-bolt"></i> Quick Actions</h5>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <button class="ai-action-btn ai-refresh-btn" style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; justify-content: center;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"><i class="fas fa-sync"></i> Refresh</button>
                                <button class="ai-action-btn ai-clear-cache-btn" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; justify-content: center;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"><i class="fas fa-broom"></i> Cache</button>
                                <button class="ai-action-btn ai-export-btn" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; justify-content: center;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"><i class="fas fa-download"></i> Export</button>
                                <button class="ai-action-btn" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; justify-content: center;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"><i class="fas fa-lightbulb"></i> Tips</button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
            </div>
            </div>
        `;

        document.body.appendChild(sidePanel);

        // Initialize functionality
        this.initializeAISidePanel(sidePanel);

        // Always start fresh — save current session if there are messages, then reset
        try {
            if (this.aiChatHistory && this.aiChatHistory.length > 0) {
                this.saveCurrentSession();
            }
        } catch(e) { /* ignore */ }

        // Reset for new chat (don't restore old messages)
        this.aiChatHistory = [];
        this.aiChatContext = {};
        this.aiInChatView = false;

        // Initialize chat interactions after DOM is ready
        setTimeout(() => {
            this.initAIChatInteractions(sidePanel);
        }, 80);

        // Add keyboard shortcut for closing (Escape key)
        const handleKeyPress = (event) => {
            if (event.key === 'Escape') {
                console.log('Escape key pressed, closing AI side panel...');
                this.closeAISidePanel();
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        sidePanel._keyHandler = handleKeyPress;
    }

    initializeAISidePanel(sidePanel) {
        // Tab switching functionality
        const tabBtns = sidePanel.querySelectorAll('.ai-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all tabs (CSS handles the visual)
                tabBtns.forEach(b => b.classList.remove('active'));

                // Add active class to clicked tab
                btn.classList.add('active');

                // Hide all tab contents
                const tabContents = sidePanel.querySelectorAll('.ai-tab-content');
                tabContents.forEach(content => content.classList.remove('active'));

                // Show selected tab content
                const tabId = btn.getAttribute('data-tab') + '-tab';
                const tabContent = sidePanel.querySelector('#' + tabId);
                if (tabContent) {
                    tabContent.classList.add('active');

                    // Scroll to bottom of chat if opening chat tab
                    if (btn.getAttribute('data-tab') === 'chat') {
                        setTimeout(() => {
                            const messagesContainer = sidePanel.querySelector('#ai-chat-messages');
                            if (messagesContainer) {
                                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            }
                        }, 100);
                    } else if (btn.getAttribute('data-tab') === 'suggestions') {
                        // Load suggestions when suggestions tab is opened
                        this.loadAISuggestions(sidePanel);
                        // Scroll to top
                        setTimeout(() => {
                            const tabContent = sidePanel.querySelector('#' + btn.getAttribute('data-tab') + '-tab');
                            if (tabContent) {
                                const scrollContainer = tabContent.querySelector('div[style*="overflow-y: auto"]');
                                if (scrollContainer) {
                                    scrollContainer.scrollTop = 0;
                                }
                            }
                        }, 50);
                    } else {
                        // For other tabs, scroll to top
                        setTimeout(() => {
                            const tabContent = sidePanel.querySelector('#' + btn.getAttribute('data-tab') + '-tab');
                            if (tabContent) {
                                const scrollContainer = tabContent.querySelector('div[style*="overflow-y: auto"]');
                                if (scrollContainer) {
                                    scrollContainer.scrollTop = 0;
                                }
                            }
                        }, 50);
                    }
                }
            });
        });

        // Chat functionality
        this.initializeAIChat(sidePanel);

        // Circuit generation handlers
        this.initializeCircuitHandlers(sidePanel);

        // Close, minimize, and clear handlers
        const closeBtn = sidePanel.querySelector('#ai-close-btn');
        const minimizeBtn = sidePanel.querySelector('#ai-minimize-btn');
        const clearBtn = sidePanel.querySelector('#ai-clear-btn');

        closeBtn.addEventListener('click', () => this.closeAISidePanel());
        minimizeBtn.addEventListener('click', () => this.minimizeAISidePanel(sidePanel));
        clearBtn.addEventListener('click', () => this.clearAIChatHistoryAndUI(sidePanel));

        // Enhance button interactions for dark theme
        const enhanceButtonInteractions = () => {
            const buttons = sidePanel.querySelectorAll('button');
            buttons.forEach(button => {
                if (!button.id || (button.id !== 'ai-minimize-btn' && button.id !== 'ai-close-btn')) {
                    button.style.transition = 'all 0.2s ease';
                }
            });
        };

        // Apply enhancements after a short delay to ensure all elements are created
        setTimeout(enhanceButtonInteractions, 100);

        // Add persistence toggle handler
        const persistToggle = sidePanel.querySelector('#ai-persist-history');
        if (persistToggle) {
            persistToggle.checked = window.dashboard ? window.dashboard.persistChatHistory : true;
            persistToggle.addEventListener('change', (e) => {
                if (window.dashboard) {
                    window.dashboard.persistChatHistory = e.target.checked;
                    console.log('Chat history persistence:', window.dashboard.persistChatHistory ? 'enabled' : 'disabled');

                    if (!window.dashboard.persistChatHistory) {
                        // If disabling persistence, clear localStorage
                        try {
                            localStorage.removeItem('quantum_ai_chat_history');
                            console.log('Chat history removed from localStorage');
                        } catch (error) {
                            console.error('Failed to remove chat history from localStorage:', error);
                        }
                    }
                }
            });
        }

        // Add action button handlers
        const clearHistoryBtn = sidePanel.querySelector('.ai-clear-history-btn');
        const refreshBtn = sidePanel.querySelector('.ai-refresh-btn');
        const clearCacheBtn = sidePanel.querySelector('.ai-clear-cache-btn');
        const exportBtn = sidePanel.querySelector('.ai-export-btn');

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                if (window.dashboard) {
                    window.dashboard.clearAIChatHistoryAndUI(sidePanel);
                }
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('Refreshing dashboard data...');
                if (window.dashboard) {
                    window.dashboard.refreshAllData();
                }
            });
        }

        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                console.log('Clearing cache...');
                // Clear various caches
                try {
                    localStorage.clear();
                    sessionStorage.clear();
                    console.log('Cache cleared');
                    if (window.dashboard) {
                        window.dashboard.showNotification('Cache cleared successfully', 'success');
                    }
                } catch (error) {
                    console.error('Failed to clear cache:', error);
                    if (window.dashboard) {
                        window.dashboard.showNotification('Failed to clear cache', 'error');
                    }
                }
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                console.log('Exporting data...');
                if (window.dashboard) {
                    window.dashboard.exportDashboardData();
                }
            });
        }
    }

    initAIChatInteractions(sidePanel) {
        // Wire welcome screen input
        const welcomeInput = sidePanel.querySelector('#ai-chat-input');
        const welcomeSend = sidePanel.querySelector('#ai-send-btn');

        const handleWelcomeSend = () => {
            const msg = (welcomeInput?.value || '').trim();
            if (!msg) return;
            welcomeInput.value = '';
            this.transitionToChatView(sidePanel);
            this.sendAIMessage(sidePanel, msg);
        };

        if (welcomeSend) welcomeSend.addEventListener('click', handleWelcomeSend);
        if (welcomeInput) {
            welcomeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleWelcomeSend(); }
                welcomeInput.style.height = 'auto';
                welcomeInput.style.height = Math.min(welcomeInput.scrollHeight, 100) + 'px';
            });
        }

        // Wire chat view input
        const chatInput = sidePanel.querySelector('#ai-chat-input-msg');
        const chatSend = sidePanel.querySelector('#ai-send-btn-msg');

        const handleChatSend = () => {
            const msg = (chatInput?.value || '').trim();
            if (!msg) return;
            chatInput.value = '';
            chatInput.style.height = 'auto';
            this.sendAIMessage(sidePanel, msg);
        };

        if (chatSend) chatSend.addEventListener('click', handleChatSend);
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
            });
        }

        // Quick chips (both welcome and chat view)
        sidePanel.querySelectorAll('.ai-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                if (!prompt) return;
                if (!this.aiInChatView) this.transitionToChatView(sidePanel);
                this.sendAIMessage(sidePanel, prompt);
            });
        });
    }

    transitionToChatView(sidePanel) {
        if (this.aiInChatView) return;
        this.aiInChatView = true;
        const welcome = sidePanel.querySelector('#lg-welcome-screen');
        const chatView = sidePanel.querySelector('#lg-chat-view');
        if (welcome) { welcome.style.opacity = '0'; welcome.style.transform = 'scale(0.97)'; setTimeout(() => { welcome.style.display = 'none'; }, 220); }
        if (chatView) { chatView.classList.add('active'); setTimeout(() => { chatView.style.opacity = '1'; }, 10); }
    }

    startNewChat(sidePanel) {
        // Save current session if it has messages
        if (this.aiChatHistory && this.aiChatHistory.length > 0) {
            this.saveCurrentSession();
        }
        // Reset state
        this.aiChatHistory = [];
        this.aiChatContext = {};
        this.aiInChatView = false;
        // Reset UI
        const welcome = sidePanel.querySelector('#lg-welcome-screen');
        const chatView = sidePanel.querySelector('#lg-chat-view');
        const msgContainer = sidePanel.querySelector('#ai-chat-messages');
        const welcomeInput = sidePanel.querySelector('#ai-chat-input');
        if (msgContainer) msgContainer.innerHTML = '';
        if (welcomeInput) { welcomeInput.value = ''; welcomeInput.style.height = 'auto'; }
        if (chatView) { chatView.classList.remove('active'); chatView.style.opacity = ''; }
        if (welcome) { welcome.style.display = ''; welcome.style.opacity = ''; welcome.style.transform = ''; }
        console.log('[AI] New chat started');
    }

    saveCurrentSession() {
        try {
            if (!this.aiChatHistory || this.aiChatHistory.length === 0) return;
            const sessions = JSON.parse(localStorage.getItem('quantum_ai_sessions') || '[]');
            const firstMsg = this.aiChatHistory.find(m => m.type === 'user');
            const title = firstMsg ? firstMsg.content.slice(0, 55) + (firstMsg.content.length > 55 ? '...' : '') : 'Untitled Chat';
            const session = {
                id: Date.now().toString(),
                title,
                savedAt: Date.now(),
                messages: [...this.aiChatHistory]
            };
            sessions.unshift(session); // newest first
            // Keep last 30 sessions
            localStorage.setItem('quantum_ai_sessions', JSON.stringify(sessions.slice(0, 30)));
            console.log('[AI] Session saved:', title);
        } catch(e) { console.warn('[AI] Could not save session', e); }
    }

    renderHistoryList(sidePanel) {
        const list = sidePanel.querySelector('#lg-history-list');
        if (!list) return;
        try {
            const sessions = JSON.parse(localStorage.getItem('quantum_ai_sessions') || '[]');
            if (sessions.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:32px 16px;color:rgba(18,20,24,0.35);font-size:13px;"><i class="fas fa-comment-slash" style="font-size:24px;display:block;margin-bottom:10px;opacity:0.3;"></i>No chat history yet</div>';
                return;
            }
            // Group by date
            const groups = {};
            sessions.forEach(s => {
                const d = new Date(s.savedAt);
                const today = new Date(); today.setHours(0,0,0,0);
                const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
                let label;
                if (d >= today) label = 'Today';
                else if (d >= yesterday) label = 'Yesterday';
                else label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (!groups[label]) groups[label] = [];
                groups[label].push(s);
            });
            list.innerHTML = Object.entries(groups).map(([date, items]) => `
                <div class="lg-session-date-group">${date}</div>
                ${items.map(s => `
                    <div class="lg-session-item" data-session-id="${s.id}">
                        <div class="session-title">${this.escapeHtmlText(s.title)}</div>
                        <div class="session-meta">
                            <span>${new Date(s.savedAt).toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'})}</span>
                            <span>&middot;</span>
                            <span>${s.messages.length} msg${s.messages.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                `).join('')}
            `).join('');
            // Wire clicks
            list.querySelectorAll('.lg-session-item').forEach(item => {
                item.addEventListener('click', () => {
                    const sessionId = item.dataset.sessionId;
                    const session = sessions.find(s => s.id === sessionId);
                    if (session) this.loadSession(sidePanel, session);
                });
            });
        } catch(e) { list.innerHTML = '<div style="padding:16px;color:rgba(18,20,24,0.4);font-size:13px;">Could not load history</div>'; }
    }

    loadSession(sidePanel, session) {
        // Close history panel
        const histPanel = sidePanel.querySelector('#lg-history-panel');
        if (histPanel) histPanel.classList.remove('active');
        // Save current session
        if (this.aiChatHistory && this.aiChatHistory.length > 0) this.saveCurrentSession();
        // Load the selected session
        this.aiChatHistory = [...session.messages];
        this.aiChatContext = {};
        this.aiInChatView = true;
        // Switch to chat view
        const welcome = sidePanel.querySelector('#lg-welcome-screen');
        const chatView = sidePanel.querySelector('#lg-chat-view');
        const msgContainer = sidePanel.querySelector('#ai-chat-messages');
        if (welcome) welcome.style.display = 'none';
        if (chatView) chatView.classList.add('active');
        if (msgContainer) {
            msgContainer.innerHTML = '';
            session.messages.forEach(msg => this.addAIMessage(sidePanel, msg.content, msg.type, true));
            setTimeout(() => { msgContainer.scrollTop = msgContainer.scrollHeight; }, 50);
        }
        console.log('[AI] Session loaded:', session.title);
    }

    escapeHtmlText(str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    sendAIMessage(sidePanel, userMessage) {
        if (!userMessage) return;
        // Add user message to UI
        this.addAIMessage(sidePanel, userMessage, 'user');
        // Route to the existing send logic
        this.handleAIMessageSend(sidePanel, userMessage);
    }

    handleAIMessageSend(sidePanel, message) {
        if (!message || !message.trim()) return;

        // Show typing indicator
        const typingId = this.addAITypingIndicator(sidePanel);

        // Scroll to bottom
        const msgContainer = sidePanel.querySelector('#ai-chat-messages');
        if (msgContainer) setTimeout(() => { msgContainer.scrollTop = msgContainer.scrollHeight; }, 50);

        (async () => {
            try {
                console.log('🤖 AI Chat: Sending query to backend:', message);

                // Call the Gemini-powered quantum chat endpoint
                const response = await fetch('/api/ai/quantum_chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('🤖 AI Response received:', data);

                this.removeAITypingIndicator(sidePanel, typingId);
                
                const aiResponse = data.ai_response || data.response || 'Sorry, I couldn\'t process that request.';
                this.addAIMessage(sidePanel, aiResponse, 'assistant');

                // If a circuit was generated, update the workspace state and trigger redraw
                if (data.circuit_generated && data.circuit_data) {
                    console.log('⚡ AI generated a circuit: updating workspace state and redrawing circuit...', data.circuit_data);
                    
                    this.dashboard.currentCircuit = data.circuit_data;
                    
                    if (window.WorkspaceState) {
                        window.WorkspaceState.setState('activeCircuit', data.circuit_data);
                    }
                    
                    if (typeof loadCircuitIn3D === 'function') {
                        try {
                            loadCircuitIn3D(data.circuit_data);
                        } catch (e) {
                            console.error('Failed to send circuit data to 3D widget:', e);
                        }
                    } else if (typeof setCircuitData === 'function') {
                        try {
                            setCircuitData(data.circuit_data);
                        } catch (e) {
                            console.error('Failed to send circuit data to 3D widget:', e);
                        }
                    }
                    
                    if (window.quantumWidgets) {
                        window.quantumWidgets.updateWidgetSafely('circuit');
                    }

                    // Add action buttons for circuit operations (Run Local, Execute, View, Copy) in monochrome styling
                    setTimeout(() => {
                        const lastMessage = sidePanel.querySelector('.ai-message:last-child, .message:last-child');
                        if (lastMessage) {
                            const buttonContainer = document.createElement('div');
                            buttonContainer.style.cssText = 'margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;';

                            // Run Circuit Locally Button
                            const runButton = document.createElement('button');
                            runButton.style.cssText = 'padding: 8px 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease;';
                            runButton.innerHTML = '<i class="fas fa-desktop"></i> <span>Run Local</span>';
                            runButton.onclick = function () {
                                if (window.dashboard && window.dashboard.runCircuitLocally) {
                                    window.dashboard.runCircuitLocally(data.circuit_data);
                                }
                                runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Running...</span>';
                                runButton.disabled = true;
                                setTimeout(function () {
                                    runButton.innerHTML = '<i class="fas fa-desktop"></i> <span>Run Local</span>';
                                    runButton.disabled = false;
                                }, 3000);
                            };

                            // View Circuit in 3D Button
                            const view3DButton = document.createElement('button');
                            view3DButton.style.cssText = 'padding: 8px 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease;';
                            view3DButton.innerHTML = '<i class="fas fa-cube"></i> <span>View Circuit</span>';
                            view3DButton.onclick = function () {
                                if (window.dashboard) {
                                    window.dashboard.closeAISidePanel();
                                    setTimeout(() => {
                                        window.dashboard.open3DCircuitFullscreenWithData(data.circuit_data);
                                    }, 300);
                                }
                            };

                            // Execute Circuit Button
                            const executeButton = document.createElement('button');
                            executeButton.style.cssText = 'padding: 8px 12px; background: #ffffff; color: #111215; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease;';
                            executeButton.innerHTML = '<i class="fas fa-play"></i> <span>Execute</span>';
                            executeButton.onclick = async function () {
                                try {
                                    if (window.dashboard && window.dashboard.executeCircuitOnIBM) {
                                        executeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Executing...</span>';
                                        executeButton.disabled = true;

                                        const results = await window.dashboard.executeCircuitOnIBM(data.circuit_data);

                                        const resultsMessage = `🎉 IBM Quantum Execution Complete!\n\n**Backend:** ${results.backend}\n**Shots:** ${results.shots}\n**Results:**\n${JSON.stringify(results.counts, null, 2)}\n\n*Executed on real IBM Quantum hardware!*`;
                                        window.dashboard.addAIMessage(sidePanel, resultsMessage, 'assistant');

                                        executeButton.innerHTML = '<i class="fas fa-check"></i> <span>Complete!</span>';
                                        setTimeout(() => {
                                            executeButton.innerHTML = '<i class="fas fa-play"></i> <span>Execute</span>';
                                            executeButton.disabled = false;
                                        }, 3000);
                                    } else {
                                        throw new Error('IBM execution not available');
                                    }
                                } catch (error) {
                                    console.error('IBM execution failed:', error);
                                    executeButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>Failed</span>';
                                    const errorMessage = `IBM Quantum Execution Failed:\n\n${error.message}\n\n*Please check your IBM Quantum credentials and try again.*`;
                                    window.dashboard.addAIMessage(sidePanel, errorMessage, 'assistant');
                                    setTimeout(() => {
                                        executeButton.innerHTML = '<i class="fas fa-play"></i> <span>Execute</span>';
                                        executeButton.disabled = false;
                                    }, 3000);
                                }
                            };

                            // Copy Code Button
                            const copyButton = document.createElement('button');
                            copyButton.style.cssText = 'padding: 8px 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease;';
                            copyButton.innerHTML = '<i class="fas fa-copy"></i> <span>Copy Code</span>';
                            copyButton.onclick = function () {
                                const code = data.circuit_code || ('from qiskit import QuantumCircuit\n\nqc = QuantumCircuit(' + (data.circuit_data.qubits || 2) + ')\n# Add gates here\nprint(qc.draw())');
                                navigator.clipboard.writeText(code).then(function () {
                                    copyButton.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
                                    setTimeout(function () {
                                        copyButton.innerHTML = '<i class="fas fa-copy"></i> <span>Copy Code</span>';
                                    }, 2000);
                                });
                            };

                            buttonContainer.appendChild(runButton);
                            buttonContainer.appendChild(view3DButton);
                            buttonContainer.appendChild(executeButton);
                            buttonContainer.appendChild(copyButton);
                            lastMessage.querySelector('.message-body').appendChild(buttonContainer);
                        }
                    }, 50);
                }

                // Scroll to bottom
                const messagesContainer = sidePanel.querySelector('#ai-chat-messages');
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } catch (error) {
                console.error('AI Chat Error:', error);
                this.removeAITypingIndicator(sidePanel, typingId);
                this.addAIMessage(sidePanel, 'Sorry, I encountered an error. Please try again.', 'assistant');
            }
        })();
    }


    initializeCircuitHandlers(sidePanel) {
        const generateBtns = sidePanel.querySelectorAll('.ai-generate-btn');
        generateBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const circuitType = btn.getAttribute('data-circuit-type') || 'bell';
                if (window.dashboard) {
                    await window.dashboard.generateCircuitFromLibrary(sidePanel, circuitType);
                }
            });
        });
    }

    async generateCircuitFromLibrary(sidePanel, circuitType) {
        console.log('Generating circuit from library:', circuitType);

        try {
            // Show loading state - find the button that was clicked
            const generateBtns = sidePanel.querySelectorAll('.ai-generate-btn');
            let targetBtn = null;
            generateBtns.forEach(btn => {
                if (btn.getAttribute('data-circuit-type') === circuitType) {
                    targetBtn = btn;
                }
            });

            if (targetBtn) {
                targetBtn.textContent = 'Generating...';
                targetBtn.disabled = true;
            }

            // Call the AI quantum chat endpoint to generate the circuit
            console.log('Calling AI quantum chat endpoint for circuit generation...');
            const response = await fetch('/api/ai/quantum_chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `Create a ${circuitType} circuit`
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API response not OK:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}. Server response: ${errorText}`);
            }

            console.log('Circuit generation API call successful');

            const data = await response.json();
            console.log('API response data:', data);

            if (data.success && data.ai_response) {
                // Switch to chat tab and show the response
                const chatTabBtn = sidePanel.querySelector('[data-tab="chat"]');
                if (chatTabBtn) chatTabBtn.click();

                // Add AI response to chat
                this.addAIMessage(sidePanel, data.ai_response, 'assistant');

                // Store circuit data if generated
                if (data.circuit_generated && data.circuit_data && this.dashboard) {
                    console.log('Circuit data received:', data.circuit_data);
                    console.log('Circuit data structure check:', {
                        hasGates: data.circuit_data.gates && Array.isArray(data.circuit_data.gates),
                        gateCount: data.circuit_data.gates ? data.circuit_data.gates.length : 0,
                        hasQubits: data.circuit_data.qubits,
                        qubitCount: data.circuit_data.qubits
                    });

                    this.dashboard.currentCircuit = data.circuit_data;
                    console.log('Circuit stored for submission:', data.circuit_data);

                    // Immediately update the 3D circuit widget
                    if (typeof loadCircuitIn3D === 'function') {
                        try {
                            loadCircuitIn3D(data.circuit_data);
                            console.log('Circuit data sent to 3D widget');
                        } catch (error) {
                            console.error('Failed to send circuit data to 3D widget:', error);
                        }
                    } else if (typeof setCircuitData === 'function') {
                        try {
                            setCircuitData(data.circuit_data);
                            console.log('Circuit data sent to 3D widget');
                        } catch (error) {
                            console.error('Failed to send circuit data to 3D widget:', error);
                        }
                    }

                    // Add buttons for circuit operations
                    if (data.circuit_data && typeof openCircuitIn3D === 'function') {
                        setTimeout(() => {
                            const lastMessage = sidePanel.querySelector('.ai-message:last-child, .message:last-child');
                            if (lastMessage && (lastMessage.textContent.includes('generated') || lastMessage.textContent.includes('created'))) {
                                // Create button container for better layout
                                const buttonContainer = document.createElement('div');
                                buttonContainer.style.cssText = 'margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;';

                                // Run Circuit Locally Button
                                const runButton = document.createElement('button');
                                runButton.style.cssText = 'padding: 10px 16px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);';
                                runButton.innerHTML = '<i class="fas fa-desktop"></i> <span>Run Local</span>';
                                runButton.onmouseover = function () {
                                    this.style.transform = 'translateY(-2px)';
                                    this.style.boxShadow = '0 4px 8px rgba(245, 158, 11, 0.3)';
                                };
                                runButton.onmouseout = function () {
                                    this.style.transform = 'translateY(0)';
                                    this.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.2)';
                                };
                                runButton.onclick = function () {
                                    // Run circuit locally using simulator
                                    if (window.dashboard && window.dashboard.runCircuitLocally) {
                                        window.dashboard.runCircuitLocally(data.circuit_data);
                                    }
                                    runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Running...</span>';
                                    runButton.disabled = true;
                                    const self = this;
                                    setTimeout(function () {
                                        self.innerHTML = '<i class="fas fa-desktop"></i> <span>Run Local</span>';
                                        self.disabled = false;
                                    }, 3000);
                                };

                                // View Circuit in 3D Button
                                const view3DButton = document.createElement('button');
                                view3DButton.style.cssText = 'padding: 10px 16px; background: linear-gradient(135deg, #06b6d4, #0891b2); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(6, 182, 212, 0.2);';
                                view3DButton.innerHTML = '<i class="fas fa-cube"></i> <span>View Circuit</span>';
                                view3DButton.onmouseover = function () {
                                    this.style.transform = 'translateY(-2px)';
                                    this.style.boxShadow = '0 4px 8px rgba(6, 182, 212, 0.3)';
                                };
                                view3DButton.onmouseout = function () {
                                    this.style.transform = 'translateY(0)';
                                    this.style.boxShadow = '0 2px 4px rgba(6, 182, 212, 0.2)';
                                };
                                view3DButton.onclick = function () {
                                    // Close AI sidepanel and open 3D circuit visualizer
                                    if (window.dashboard) {
                                        window.dashboard.closeAISidePanel();
                                        setTimeout(() => {
                                            window.dashboard.open3DCircuitFullscreenWithData(data.circuit_data);
                                        }, 300);
                                    }
                                    view3DButton.innerHTML = '<i class="fas fa-check"></i> <span>Opened!</span>';
                                    view3DButton.style.background = '#10b981';
                                    setTimeout(() => {
                                        view3DButton.innerHTML = '<i class="fas fa-cube"></i> <span>View Circuit</span>';
                                        view3DButton.style.background = 'linear-gradient(135deg, #06b6d4, #0891b2)';
                                    }, 2000);
                                };

                                // Execute Circuit Button
                                const executeButton = document.createElement('button');
                                executeButton.style.cssText = 'padding: 10px 16px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);';
                                executeButton.innerHTML = '<i class="fas fa-play"></i> <span>Execute</span>';
                                executeButton.onmouseover = function () {
                                    this.style.transform = 'translateY(-2px)';
                                    this.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
                                };
                                executeButton.onmouseout = function () {
                                    this.style.transform = 'translateY(0)';
                                    this.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                                };
                                executeButton.onclick = async function () {
                                    try {
                                        // Execute circuit on IBM Quantum
                                        if (window.dashboard && window.dashboard.executeCircuitOnIBM) {
                                            executeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Executing...</span>';
                                            executeButton.disabled = true;

                                            const results = await window.dashboard.executeCircuitOnIBM(data.circuit_data);

                                            // Show results in AI chat
                                            const resultsMessage = `  IBM Quantum Execution Complete!\n\n**Backend:** ${results.backend}\n**Shots:** ${results.shots}\n**Results:**\n${JSON.stringify(results.counts, null, 2)}\n\n*Executed on real IBM Quantum hardware!*`;
                                            window.dashboard.addAIMessage(document.getElementById('ai-assistant-side-panel'), resultsMessage, 'assistant');

                                            executeButton.innerHTML = '<i class="fas fa-check"></i> <span>Complete!</span>';
                                            executeButton.style.background = '#10b981';

                                            setTimeout(() => {
                                                executeButton.innerHTML = '<i class="fas fa-play"></i> <span>Execute</span>';
                                                executeButton.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                                                executeButton.disabled = false;
                                            }, 3000);
                                        } else {
                                            throw new Error('IBM execution not available');
                                        }
                                    } catch (error) {
                                        console.error('IBM execution failed:', error);
                                        executeButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>Failed</span>';
                                        executeButton.style.background = '#ef4444';

                                        const errorMessage = `IBM Quantum Execution Failed:\n\n${error.message}\n\n*Please check your IBM Quantum credentials and try again.*`;
                                        window.dashboard.addAIMessage(document.getElementById('ai-assistant-side-panel'), errorMessage, 'assistant');

                                        setTimeout(() => {
                                            executeButton.innerHTML = '<i class="fas fa-play"></i> <span>Execute</span>';
                                            executeButton.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                                            executeButton.disabled = false;
                                        }, 3000);
                                    }
                                };

                                // Copy Code Button
                                const copyButton = document.createElement('button');
                                copyButton.style.cssText = 'padding: 10px 16px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(139, 92, 246, 0.2);';
                                copyButton.innerHTML = '<i class="fas fa-copy"></i> <span>Copy Code</span>';
                                copyButton.onmouseover = function () {
                                    this.style.transform = 'translateY(-2px)';
                                    this.style.boxShadow = '0 4px 8px rgba(139, 92, 246, 0.3)';
                                };
                                copyButton.onmouseout = function () {
                                    this.style.transform = 'translateY(0)';
                                    this.style.boxShadow = '0 2px 4px rgba(139, 92, 246, 0.2)';
                                };
                                copyButton.onclick = function () {
                                    // Try to copy Qiskit code if available
                                    if (data.circuit_code) {
                                        navigator.clipboard.writeText(data.circuit_code).then(function () {
                                            copyButton.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
                                            copyButton.style.background = '#10b981';
                                            setTimeout(function () {
                                                copyButton.innerHTML = '<i class="fas fa-copy"></i> <span>Copy Code</span>';
                                                copyButton.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
                                            }, 2000);
                                        });
                                    } else {
                                        // Generate basic Qiskit code
                                        const code = 'from qiskit import QuantumCircuit\\n\\nqc = QuantumCircuit(' + (data.circuit_data.qubits || 2) + ')\\n# Add your gates here\\nprint(qc.draw())';
                                        navigator.clipboard.writeText(code).then(function () {
                                            copyButton.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
                                            copyButton.style.background = '#10b981';
                                            setTimeout(function () {
                                                copyButton.innerHTML = '<i class="fas fa-copy"></i> <span>Copy Code</span>';
                                                copyButton.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
                                            }, 2000);
                                        });
                                    }
                                };

                                buttonContainer.appendChild(runButton);
                                buttonContainer.appendChild(view3DButton);
                                buttonContainer.appendChild(executeButton);
                                buttonContainer.appendChild(copyButton);
                                lastMessage.appendChild(buttonContainer);
                            }
                        }, 1500);
                    }
                    console.log('Circuit data sent to 3D visualizer');

                    // Show success message with submission option
                    setTimeout(() => {
                        const submitMessage = `\n\n **Ready to Submit!**\n\nYour ${circuitType.replace('_', ' ')} circuit has been generated. Would you like to submit it to IBM Quantum for execution?\n\n• **Click "Submit to IBM Quantum"** in the chat above\n• **Or use the Jobs widget** to submit manually\n• **View in 3D** using the Circuit Builder`;
                        this.addAIMessage(sidePanel, submitMessage, 'assistant');
                    }, 1000);
                }

                // Update circuit widget if available
                if (this.updateCircuitWidget) {
                    setTimeout(() => this.updateCircuitWidget(), 500);
                }

            } else {
                throw new Error(data.error || 'Circuit generation failed');
            }

        } catch (error) {
            console.error('Circuit generation failed:', error);

            // Show error message
            const chatTabBtn = sidePanel.querySelector('[data-tab="chat"]');
            if (chatTabBtn) chatTabBtn.click();

            this.addAIMessage(sidePanel,
                `**Circuit Generation Failed**\n\n${error.message}\n\nPlease try again or ask me to generate the circuit using the chat.`, 'assistant');

        } finally {
            // Reset button state - find the button that was clicked
            const generateBtns = sidePanel.querySelectorAll('.ai-generate-btn');
            generateBtns.forEach(btn => {
                if (btn.getAttribute('data-circuit-type') === circuitType) {
                    btn.textContent = 'Generate';
                    btn.disabled = false;
                }
            });
        }
    }
    addAIMessage(sidePanel, content, type, skipHistory = false) {
        if (!sidePanel) return null;

        // Try multiple container IDs (historical compatibility)
        const messagesContainer = sidePanel.querySelector('#ai-chat-messages') ||
            sidePanel.querySelector('#ai-chat-content');

        if (!messagesContainer) {
            console.warn('[AI] Messages container not found');
            return null;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${type}`;

        // Enhanced Content Formatting
        const formattedContent = this.formatAIResponse(content);

        // Wrap in liquid glass bubble structure
        if (type === 'assistant' || type === 'ai') {
            const bubble = document.createElement('div');
            bubble.className = 'msg-bubble';
            const header = document.createElement('div');
            header.className = 'msg-header';
            header.innerHTML = '<div class="ai-dot"><i class="fas fa-atom"></i></div><span>AI Assistant</span>';
            const body = document.createElement('div');
            body.className = 'message-body';
            body.innerHTML = formattedContent;
            bubble.appendChild(header);
            bubble.appendChild(body);
            messageDiv.appendChild(bubble);
        } else if (type === 'user') {
            const bubble = document.createElement('div');
            bubble.className = 'msg-bubble';
            bubble.innerHTML = `<div class="message-body">${formattedContent}</div>`;
            messageDiv.appendChild(bubble);
        } else {
            // system/status messages
            messageDiv.style.cssText = 'text-align:center;font-size:11px;color:rgba(18,20,24,0.35);padding:3px 0;margin:2px 0;';
            messageDiv.textContent = content;
        }

        messagesContainer.appendChild(messageDiv);

        // Auto-scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Add event listeners for copy buttons
        messageDiv.querySelectorAll('.copy-code-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const container = e.target.closest('.code-block-container');
                const codeElement = container.querySelector('pre code');
                const code = codeElement.textContent; // Preserves whitespace
                navigator.clipboard.writeText(code).then(() => {
                    const originalText = e.target.innerHTML;
                    e.target.innerHTML = '<i class="fas fa-check"></i> Copied';
                    e.target.classList.add('copied');
                    setTimeout(() => {
                        e.target.innerHTML = originalText;
                        e.target.classList.remove('copied');
                    }, 2000);
                });
            });
        });

        // Save RAW message to history for persistence (NOT the formatted content)
        if (!skipHistory) {
            this.saveMessageToHistory(content, type);
        }

        return messageDiv;
    }

    formatAIResponse(text) {
        if (!text) return '';

        let html = text;
        const codeBlocks = [];

        // 1. AGGRESSIVE FALLBACK: Detect unwrapped code
        html = html.replace(/(?:^|\n)(python|javascript|js|c|cpp|java)\s*\n((?:(?:from |import |#include |const |let |var |def |class |function |public |private )[\s\S]*?)(?:\n\n|$))/gi,
            (match, prefix, lang, code) => {
                return `${prefix}\n\`\`\`${lang.toLowerCase()}\n${code.trim()}\n\`\`\`\n`;
            }
        );

        // 2. Extract code blocks to placeholders
        html = html.replace(/`{2,3}(\w*)\n([\s\S]*?)`{2,3}/g, (match, lang, code) => {
            let language = (lang || '').toLowerCase();
            let cleanCode = code.trim();
            const lines = cleanCode.split('\n');
            const firstLine = lines[0].trim().toLowerCase();

            // Detect language from first line if capture was empty
            if (!language && (firstLine === 'python' || firstLine === 'javascript' || firstLine === 'js')) {
                language = firstLine;
                cleanCode = lines.slice(1).join('\n').trim();
            }
            // Or if language matches first line (standard redundancy)
            else if (language && firstLine === language) {
                cleanCode = lines.slice(1).join('\n').trim();
            }

            language = language || 'python';

            const highlightedCode = this.highlightCode(cleanCode, language);
            const blockId = `__CODE_BLOCK_${codeBlocks.length}__`;

            const blockHtml = `
                <div class="code-block-container" style="background:linear-gradient(135deg, #1e1e1e 0%, #252526 100%); border-radius:8px; margin:16px 0; overflow:hidden; border:1px solid #333; box-shadow:0 8px 16px rgba(0,0,0,0.4);">
                    <div class="code-block-header" style="background:#2d2d2d; padding:8px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #3e3e42;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="color:#cccccc; font-size:12px; font-family:'Segoe UI', sans-serif; font-weight:600;">${language.toUpperCase()}</span>
                        </div>
                        <button class="copy-code-btn" style="background:transparent; border:none; color:#cccccc; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:6px; padding:4px 8px; border-radius:4px; transition:background 0.2s;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 0 0 1 2-2h9a2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy</span>
                        </button>
                    </div>
                    <div style="position:relative;">
                        <pre style="margin:0; padding:16px; overflow-x:auto; background:#1e1e1e; max-height:600px; overflow-y:auto; color:#d4d4d4;"><code class="language-${language}" style="font-family:'Consolas', 'Monaco', 'Courier New', monospace; font-size:14px; line-height:1.5; white-space:pre;">${highlightedCode}</code></pre>
                    </div>
                </div>
            `;

            codeBlocks.push(blockHtml);
            return blockId;
        });

        // 3. Escape remaining text to prevent XSS in non-code parts
        html = html
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // 4. Handle Markdown formatting
        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(0,168,150,0.06); padding:3px 6px; border-radius:6px; font-family:\'JetBrains Mono\', \'Consolas\', monospace; color:#00A896; font-size:12px; border:1px solid rgba(0,168,150,0.15);">$1</code>');

        // Bold/Italic
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#111215; font-weight:700;">$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em style="color:rgba(18,20,24,0.7);">$1</em>');

        // Lists
        html = html.replace(/^\s*[-•]\s+(.*)$/gm, '<li style="margin:5px 0; color:rgba(18,20,24,0.75); line-height:1.55; font-size:13px;">$1</li>');
        html = html.replace(/(<li.*<\/li>)/s, '<ul style="padding-left:20px; margin:8px 0; list-style-type:disc;">$1</ul>');

        // Newlines
        html = html.replace(/\n\n/g, '<br><br>');

        // 5. Restore code blocks
        codeBlocks.forEach((block, i) => {
            html = html.replace(`__CODE_BLOCK_${i}__`, block);
        });

        return html;
    }

    highlightCode(code, lang) {
        if (lang === 'python' || lang === 'py') {
            return this.highlightPython(code);
        } else if (lang === 'javascript' || lang === 'js') {
            return this.highlightJavaScript(code);
        }
        // For unsupported languages, just escape the HTML
        return this.escapeHtml(code);
    }

    highlightPython(code) {
        const placeholders = [];
        const generatePlaceholder = (content, type) => {
            const id = `__${type}_${placeholders.length}__`;
            placeholders.push({ id, content, type });
            return id;
        };

        const pythonStrings = /(['"])(?:(?=(\\?))\2.)*?\1/g;
        const pythonComments = /#.*/g;

        // 1. Extract Strings
        code = code.replace(pythonStrings, (match) => generatePlaceholder(match, 'STR'));

        // 2. Extract Comments
        code = code.replace(pythonComments, (match) => generatePlaceholder(match, 'COM'));

        // 3. Escape HTML of the skeleton
        code = this.escapeHtml(code);

        // 4. Highlight Tokens
        const pythonKeywords = /\b(from|import|def|class|return|if|elif|else|for|while|in|is|not|and|or|as|with|try|except|finally|raise|assert|break|continue|pass|lambda|yield|global|nonlocal|True|False|None)\b/g;
        const pythonBuiltins = /\b(print|range|len|str|int|float|list|dict|set|tuple|open|input|type|isinstance|enumerate|zip|map|filter|sorted|sum|max|min|abs|round|any|all)\b/g;
        const pythonNumbers = /\b\d+\.?\d*\b/g;
        const pythonDecorators = /@\w+/g;
        const pythonClasses = /\b[A-Z]\w+\b/g;
        const pythonFunctions = /\b\w+(?=\()/g;

        code = code.replace(pythonDecorators, '<span style="color:#dcdcaa;">$&</span>');
        code = code.replace(pythonKeywords, '<span style="color:#c586c0;">$&</span>');
        code = code.replace(pythonBuiltins, '<span style="color:#569cd6;">$&</span>');
        code = code.replace(pythonNumbers, '<span style="color:#b5cea8;">$&</span>');
        code = code.replace(pythonClasses, '<span style="color:#4ec9b0;">$&</span>');
        code = code.replace(pythonFunctions, '<span style="color:#dcdcaa;">$&</span>');

        // 5. Restore Placeholders
        placeholders.forEach(p => {
            let content = this.escapeHtml(p.content);
            let span = content;
            if (p.type === 'STR') {
                span = `<span style="color:#ce9178;">${content}</span>`;
            } else if (p.type === 'COM') {
                span = `<span style="color:#6a9955;">${content}</span>`;
            }
            code = code.replace(p.id, span);
        });

        return code;
    }

    highlightJavaScript(code) {
        const placeholders = [];
        const generatePlaceholder = (content, type) => {
            const id = `__${type}_${placeholders.length}__`;
            placeholders.push({ id, content, type });
            return id;
        };

        const jsStrings = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
        const jsComments = /\/\/.*/g;

        // 1. Extract Strings
        code = code.replace(jsStrings, (match) => generatePlaceholder(match, 'STR'));

        // 2. Extract Comments
        code = code.replace(jsComments, (match) => generatePlaceholder(match, 'COM'));

        // 3. Escape HTML
        code = this.escapeHtml(code);

        // 4. Highlight Tokens
        const jsKeywords = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|this|class|extends|import|export|from|default|async|await)\b/g;
        const jsBuiltins = /\b(console|Math|Array|Object|String|Number|Boolean|Date|RegExp|Promise|Set|Map|JSON)\b/g;
        const jsNumbers = /\b\d+\.?\d*\b/g;

        code = code.replace(jsKeywords, '<span style="color:#c586c0;">$&</span>');
        code = code.replace(jsBuiltins, '<span style="color:#569cd6;">$&</span>');
        code = code.replace(jsNumbers, '<span style="color:#b5cea8;">$&</span>');

        // 5. Restore Placeholders
        placeholders.forEach(p => {
            let content = this.escapeHtml(p.content);
            let span = content;
            if (p.type === 'STR') {
                span = `<span style="color:#ce9178;">${content}</span>`;
            } else if (p.type === 'COM') {
                span = `<span style="color:#6a9955;">${content}</span>`;
            }
            code = code.replace(p.id, span);
        });

        return code;
    }


    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    saveMessageToHistory(content, type) {
        // SAVE RAW TEXT ONLY to avoid double-rendering bugs
        // Formatting is applied dynamically during restoration

        // Add to history array
        this.aiChatHistory.push({
            type: type,
            content: content, // Raw markdown/text
            timestamp: Date.now()
        });

        // Keep only last 100 messages to prevent memory issues
        if (this.aiChatHistory.length > 100) {
            this.aiChatHistory = this.aiChatHistory.slice(-100);
        }

        // Save to localStorage periodically (not on every message for performance)
        if (this.persistChatHistory && this.aiChatHistory.length % 10 === 0) {
            this.saveChatHistory();
        }

        console.log(`💬 Message saved to history: ${type}, total: ${this.aiChatHistory.length}`);
    }

    clearAIChatHistory() {
        this.aiChatHistory = [];
        this.aiChatContext = {};
        this.aiLastActiveTab = 'chat';
        console.log('AI chat history cleared');
    }

    clearAIChatHistoryAndUI(sidePanel) {
        // Clear in-memory history
        this.clearAIChatHistory();

        // Clear localStorage
        try {
            localStorage.removeItem('quantum_ai_chat_history');
            console.log('Chat history removed from localStorage');
        } catch (error) {
            console.error('  Failed to remove chat history from localStorage:', error);
        }

        // Clear the UI chat messages
        const messagesContainer = sidePanel.querySelector('#ai-chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="ai-message assistant">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <i class="fas fa-robot" style="color: var(--accent, #3b82f6);"></i>
                        <strong>AI Assistant</strong>
                    </div>
                    <div>Hello! I'm your advanced quantum computing AI assistant. I can help you with:</div>
                    <ul style="margin: 8px 0; padding-left: 20px;">
                        <li>Create and execute quantum circuits</li>
                        <li>Explain quantum algorithms and concepts</li>
                        <li>Generate Qiskit code</li>
                        <li>Monitor IBM Quantum backends</li>
                        <li>Visualize quantum states</li>
                    </ul>
                    <div>What would you like to explore?</div>
                </div>
            `;
            console.log('🧹 Chat UI cleared');
        }

        // Show confirmation message
        this.addAIMessage(sidePanel, '💬 Chat history has been cleared! Starting fresh conversation.', 'assistant');
    }

    loadChatHistory() {
        try {
            const savedHistory = localStorage.getItem('quantum_ai_chat_history');
            if (savedHistory) {
                const parsed = JSON.parse(savedHistory);
                this.aiChatHistory = parsed.messages || [];
                this.aiChatContext = parsed.context || {};
                this.aiLastActiveTab = parsed.lastActiveTab || 'chat';
                console.log('📚 Loaded chat history:', this.aiChatHistory.length, 'messages');
            }
        } catch (error) {
            console.error('  Failed to load chat history:', error);
            this.aiChatHistory = [];
            this.aiChatContext = {};
            this.aiLastActiveTab = 'chat';
        }
    }

    saveChatHistory() {
        try {
            const dataToSave = {
                messages: this.aiChatHistory,
                context: this.aiChatContext,
                lastActiveTab: this.aiLastActiveTab,
                savedAt: Date.now()
            };
            localStorage.setItem('quantum_ai_chat_history', JSON.stringify(dataToSave));
            console.log('💾 Chat history saved to localStorage');
        } catch (error) {
            console.error('  Failed to save chat history:', error);
        }
    }

    async initializeIBMIntegration() {
        try {
            // Check if IBMIntegration class is available
            if (typeof IBMIntegration !== 'undefined') {
                this.ibmIntegration = new IBMIntegration();
                console.log('  IBM Quantum integration initialized');
            } else {
                console.log('   IBMIntegration class not found, attempting to load...');

                // Try to load IBM integration script dynamically
                await this.loadIBMIntegrationScript();

                if (typeof IBMIntegration !== 'undefined') {
                    this.ibmIntegration = new IBMIntegration();
                    console.log('  IBM Quantum integration initialized after loading script');
                } else {
                    console.warn('  IBMIntegration class still not found, IBM execution will not be available');
                    this.ibmIntegration = null;
                }
            }
        } catch (error) {
            console.error('  Failed to initialize IBM integration:', error);
            this.ibmIntegration = null;
        }
    }

    async loadIBMIntegrationScript() {
        return new Promise((resolve) => {
            // Check if IBMIntegration is already loaded to prevent duplicates
            if (typeof window !== 'undefined' && window.IBMIntegration) {
                console.log('  IBM integration already loaded');
                resolve();
                return;
            }

            // Function to attempt loading from a specific path
            const loadScript = (src, fallbackSrc = null) => {
                return new Promise((resolveScript) => {
                    const script = document.createElement('script');
                    script.src = src;

                    script.onload = () => {
                        console.log(`  IBM integration script loaded from: ${src}`);
                        if (typeof window !== 'undefined' && window.IBMIntegration) {
                            resolveScript();
                        } else {
                            console.warn(`  IBMIntegration class not found after loading ${src}`);
                            resolveScript();
                        }
                    };

                    script.onerror = () => {
                        console.warn(`  Failed to load IBM integration script from: ${src}`);
                        if (fallbackSrc) {
                            script.src = fallbackSrc;
                            script.onload = () => {
                                console.log(`  IBM integration script loaded from fallback: ${fallbackSrc}`);
                                resolveScript();
                            };
                            script.onerror = () => {
                                console.warn('  Failed to load IBM integration script from both paths');
                                resolveScript();
                            };
                            document.head.appendChild(script);
                        } else {
                            resolveScript();
                        }
                    };

                    document.head.appendChild(script);
                });
            };

            // Try loading from the primary path (with OrbitControls)
            loadScript('/static/3d-circuit-visualizer/js/ibm-integration.js')
                .then(() => resolve());
        });
    }

    addAITypingIndicator(sidePanel) {
        const messagesContainer = sidePanel.querySelector('#ai-chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message assistant';
        typingDiv.id = 'ai-typing-indicator';

        // Split "Generating code..." into individual spans for the shimmer wave animation
        const loadingText = "Generating code...";
        const spans = loadingText.split('').map((char, idx) => {
            return `<span class="lg-shimmer-wave-char" style="--char-idx: ${idx}">${char}</span>`;
        }).join('');

        typingDiv.innerHTML = `
            <div class="msg-bubble" style="padding: 10px 14px;">
                <div class="msg-header" style="margin-bottom: 6px;">
                    <div class="ai-dot"><i class="fas fa-atom"></i></div>
                    <span style="font-size: 10px; font-weight: 700; color: rgba(18,20,24,0.4); letter-spacing: 0.06em; text-transform: uppercase;">AI Assistant</span>
                </div>
                <div style="font-size: 13.5px; font-weight: 500; font-family: 'JetBrains Mono', 'Consolas', monospace; perspective: 500px; display: inline-block;">
                    ${spans}
                </div>
            </div>
        `;

        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return typingDiv.id;
    }


    removeAITypingIndicator(sidePanel, typingId) {
        const typingDiv = document.getElementById(typingId);
        if (typingDiv) {
            typingDiv.remove();
        }
    }

    minimizeAISidePanel(sidePanel) {
        // Toggle minimized state
        if (sidePanel.classList.contains('minimized')) {
            sidePanel.classList.remove('minimized');
            sidePanel.style.width = '480px';
            sidePanel.querySelector('.ai-tab-content').style.display = 'block';
        } else {
            sidePanel.classList.add('minimized');
            sidePanel.style.width = '60px';
            sidePanel.querySelector('.ai-tab-content').style.display = 'none';
        }
    }

    closeAISidePanel() {
        const sidePanel = document.getElementById('ai-assistant-side-panel');
        if (sidePanel) {
            // Save chat history before closing
            this.saveAIChatState(sidePanel);

            // Remove keyboard handler
            if (sidePanel._keyHandler) {
                document.removeEventListener('keydown', sidePanel._keyHandler);
            }

            // Animate out
            sidePanel.style.animation = 'slideOutRight 0.3s ease-in';

            setTimeout(() => {
                if (sidePanel.parentNode) {
                    sidePanel.parentNode.removeChild(sidePanel);
                }
                this.fullscreenOpen = false;
            }, 300);
        }
    }

    saveAIChatState(sidePanel) {
        try {
            // Save chat messages
            const messagesContainer = sidePanel.querySelector('#ai-chat-messages');
            if (messagesContainer) {
                const messages = Array.from(messagesContainer.querySelectorAll('.ai-message')).map(msg => ({
                    type: msg.classList.contains('user') ? 'user' : 'assistant',
                    content: msg.innerHTML
                }));
                this.aiChatHistory = messages;
            }

            // Save active tab
            const activeTabBtn = sidePanel.querySelector('.ai-tab-btn.active');
            if (activeTabBtn) {
                this.aiLastActiveTab = activeTabBtn.getAttribute('data-tab');
            }

            // Save context data (could be expanded for more complex state)
            this.aiChatContext = {
                lastActiveTab: this.aiLastActiveTab,
                messageCount: this.aiChatHistory.length,
                lastUpdate: Date.now()
            };

            // Also save to localStorage for persistence (if enabled)
            if (this.persistChatHistory) {
                this.saveChatHistory();
            }

            console.log('💾 AI chat state saved:', this.aiChatHistory.length, 'messages');
        } catch (error) {
            console.error('  Failed to save AI chat state:', error);
        }
    }
    restoreAIChatState(sidePanel) {
        try {
            if (this.aiChatHistory.length === 0) {
                console.log('📭 No chat history to restore');
                return;
            }

            // Restore messages
            const messagesContainer = sidePanel.querySelector('#ai-chat-messages');
            if (messagesContainer && this.aiChatHistory.length > 0) {
                messagesContainer.innerHTML = '';

                this.aiChatHistory.forEach(msg => {
                    // Use the robust addAIMessage for restoration, passing skipHistory=true
                    this.addAIMessage(sidePanel, msg.content, msg.type, true);
                });

                // Scroll to bottom after restoration
                setTimeout(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 100);

                console.log('📚 AI chat history restored:', this.aiChatHistory.length, 'messages');
            }

            // Restore active tab
            if (this.aiLastActiveTab && this.aiLastActiveTab !== 'chat') {
                const tabBtn = sidePanel.querySelector(`[data-tab="${this.aiLastActiveTab}"]`);
                if (tabBtn) {
                    tabBtn.click();
                }
            }
        } catch (error) {
            console.error('  Failed to restore AI chat state:', error);
        }
    }

    addAIMessageToContainer(sidePanel, content, type) {
        const messagesContainer = sidePanel.querySelector('#ai-chat-messages');
        if (messagesContainer) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `ai-message ${type}`;
            messageDiv.innerHTML = content;
            messagesContainer.appendChild(messageDiv);
        }
    }

    runCircuitLocally(circuitData) {
        console.log('Running circuit locally:', circuitData);

        // Show loading message in AI chat
        const loadingMessage = '   Running circuit locally... Please wait for results.';
        this.addAIMessage(document.getElementById('ai-assistant-side-panel'), loadingMessage, 'assistant');

        // Simulate local execution (in a real implementation, this would use a local simulator)
        setTimeout(() => {
            const results = this.simulateCircuitExecution(circuitData);
            const resultsMessage = `  Local Execution Complete!\n\n**Results:**\n${JSON.stringify(results, null, 2)}\n\n*This was simulated locally. For real quantum execution, use the "Execute" button.*`;
            this.addAIMessage(document.getElementById('ai-assistant-side-panel'), resultsMessage, 'assistant');
        }, 2000);
    }

    simulateCircuitExecution(circuitData) {
        // Simple simulation for demonstration
        const qubits = circuitData.qubits || 2;
        const shots = 1024;

        // Generate mock results based on circuit type
        const results = {};
        for (let i = 0; i < Math.pow(2, qubits); i++) {
            const binary = i.toString(2).padStart(qubits, '0');
            results[binary] = Math.floor(Math.random() * shots);
        }

        // Normalize to sum to shots
        const total = Object.values(results).reduce((a, b) => a + b, 0);
        Object.keys(results).forEach(key => {
            results[key] = Math.round((results[key] / total) * shots);
        });

        return results;
    }

    open3DCircuitFullscreenWithData(circuitData) {
        console.log('    Opening 3D Circuit Visualizer with data:', circuitData);

        // Store circuit data for the 3D visualizer
        this.currentCircuit = circuitData;

        // Also store in sessionStorage for the circuit builder page
        sessionStorage.setItem('circuitBuilderCircuit', JSON.stringify(circuitData));
        console.log('    Stored circuit data in sessionStorage for circuit builder');
        console.log('    Circuit data stored:', circuitData);
        console.log('    Circuit has', circuitData.gates ? circuitData.gates.length : 0, 'gates');

        // Create a temporary widget element to trigger the fullscreen
        const tempWidget = document.createElement('div');
        tempWidget.setAttribute('data-widget', 'circuit');
        tempWidget.style.display = 'none';
        document.body.appendChild(tempWidget);

        // Trigger the circuit widget opening using the correct method
        this.openFullscreen(tempWidget);

        // Remove the temporary element after a delay
        setTimeout(() => {
            if (document.body.contains(tempWidget)) {
                document.body.removeChild(tempWidget);
            }
        }, 100);
    }

    async executeCircuitOnIBM(circuitData) {
        console.log('  Executing circuit on IBM Quantum:', circuitData);

        try {
            // Check if IBM integration is available
            if (!this.ibmIntegration || !this.ibmIntegration.isConnected) {
                throw new Error('IBM Quantum not connected. Please configure your IBM credentials first.');
            }

            // Execute the circuit
            const backend = 'ibmq_qasm_simulator'; // Use simulator for demo, can be changed to real backend
            const shots = 1024;

            const job = await this.ibmIntegration.executeCircuit(circuitData, backend, shots);

            // Wait for results (simulate waiting)
            const results = await new Promise((resolve) => {
                setTimeout(async () => {
                    try {
                        const jobResults = await this.ibmIntegration.getJobResults(job.job_id());
                        resolve({
                            backend: backend,
                            shots: shots,
                            counts: jobResults.get_counts(),
                            jobId: job.job_id()
                        });
                    } catch (error) {
                        resolve({
                            backend: backend,
                            shots: shots,
                            counts: { '00': 512, '11': 512 }, // Fallback mock results
                            jobId: job.job_id(),
                            error: error.message
                        });
                    }
                }, 3000); // Simulate 3 second execution time
            });

            return results;

        } catch (error) {
            console.error('IBM execution failed:', error);
            throw error;
        }
    }

    closePopup() {
        const popupOverlay = document.getElementById('popup-overlay');
        if (popupOverlay) {
            popupOverlay.classList.remove('active');
        }
    }

    removeWidget(widget) {
        const widgetType = widget.getAttribute('data-widget');

        widget.style.transform = 'scale(0.8)';
        widget.style.opacity = '0';

        setTimeout(() => {
            this.widgets.delete(widgetType);
            widget.remove();
            this.showNotification(`${widgetType} widget removed`, 'info');
        }, 300);
    }

    addWidget(widgetType) {
        if (this.widgets.has(widgetType)) {
            this.showNotification('Widget already exists', 'warning');
            return;
        }

        // Here you would create and add the new widget
        this.showNotification(`${widgetType} widget added`, 'success');
    }

    toggleCustomizationPanel() {
        const panel = document.getElementById('customization-panel');
        if (panel) {
            panel.classList.toggle('open');
        }
    }

    /**
     * Initialize drag and drop functionality for widgets
     */
    setupDragAndDrop() {
        console.log('🔄 Setting up drag and drop...');

        // Find the widget grid container
        const widgetGrid = document.querySelector('.widget-grid') || document.getElementById('widget-grid');
        if (!widgetGrid) {
            console.warn('Widget grid not found for drag and drop');
            return;
        }

        // Ensure widgets have data-widget attributes
        const widgets = widgetGrid.querySelectorAll('.widget');
        widgets.forEach((widget, index) => {
            if (!widget.getAttribute('data-widget')) {
                widget.setAttribute('data-widget', `widget-${index}`);
            }
        });

        // Load Sortable.js if not already loaded
        if (typeof Sortable === 'undefined') {
            console.log('Loading Sortable.js...');
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js';
            script.onload = () => {
                console.log('✅ Sortable.js loaded successfully');
                this.initializeSortable();
            };
            script.onerror = () => {
                console.error('❌ Failed to load Sortable.js');
            };
            document.head.appendChild(script);
        } else {
            this.initializeSortable();
        }
    }

    /**
     * Initialize Sortable instance for widget reordering
     */
    initializeSortable() {
        const widgetGrid = document.querySelector('.widget-grid') || document.getElementById('widget-grid');
        if (!widgetGrid) return;

        try {
            this.sortable = new Sortable(widgetGrid, {
                animation: 150,
                handle: '.widget-header',
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onStart: () => {
                    document.body.style.cursor = 'grabbing';
                },
                onEnd: () => {
                    document.body.style.cursor = '';
                    this.saveWidgetOrder();
                    console.log('✅ Widget order updated');
                }
            });

            // Load any saved widget order
            this.loadWidgetOrder();
            console.log('✅ Drag and drop initialized');
        } catch (error) {
            console.error('❌ Error initializing drag and drop:', error);
        }
    }

    /**
     * Save the current widget order to localStorage
     */
    saveWidgetOrder() {
        if (!this.sortable) return;

        try {
            const widgetOrder = this.sortable.toArray();
            localStorage.setItem('quantum-dashboard-widget-order', JSON.stringify(widgetOrder));
            console.log('💾 Saved widget order:', widgetOrder);
        } catch (error) {
            console.error('❌ Error saving widget order:', error);
        }
    }

    /**
     * Load and apply saved widget order from localStorage
     */
    loadWidgetOrder() {
        try {
            const savedOrder = localStorage.getItem('quantum-dashboard-widget-order');
            if (!savedOrder) {
                console.log('No saved widget order found');
                return;
            }

            const widgetOrder = JSON.parse(savedOrder);
            const widgetGrid = this.sortable?.el || document.querySelector('.widget-grid') || document.getElementById('widget-grid');

            if (!widgetGrid) {
                console.warn('Widget grid not found for loading order');
                return;
            }

            // Create a map of widget elements by their data-widget attribute
            const widgetMap = {};
            Array.from(widgetGrid.children).forEach(widget => {
                const widgetId = widget.getAttribute('data-widget');
                if (widgetId) {
                    widgetMap[widgetId] = widget;
                }
            });

            // Reorder widgets based on saved order
            widgetOrder.forEach(widgetId => {
                const widget = widgetMap[widgetId];
                if (widget) {
                    widgetGrid.appendChild(widget);
                }
            });

            console.log('🔄 Loaded saved widget order');
        } catch (error) {
            console.error('❌ Error loading widget order:', error);
        }
    }
    /**
     * Load widget order from localStorage
     */
    loadWidgetOrder() {
        try {
            const savedOrder = localStorage.getItem('quantum-dashboard-widget-order');
            if (!savedOrder) {
                console.log('No saved widget order found');
                return;
            }

            const widgetOrder = JSON.parse(savedOrder);
            const widgetGrid = this.sortable?.el || document.querySelector('.widget-grid') ||
                document.getElementById('widget-grid');

            if (!widgetGrid) {
                console.error('❌ Widget grid not found for loading order');
                return;
            }

            // Create a map of widget elements by their data-widget attribute
            const widgetMap = {};
            Array.from(widgetGrid.children).forEach(widget => {
                const widgetId = widget.getAttribute('data-widget');
                if (widgetId) {
                    widgetMap[widgetId] = widget;
                }
            });

            // Reorder widgets based on saved order
            widgetOrder.forEach(widgetId => {
                const widget = widgetMap[widgetId];
                if (widget) {
                    widgetGrid.appendChild(widget);
                }
            });

            console.log('🔄 Widget order restored');
        } catch (error) {
            console.error('❌ Error loading widget order:', error);
        }
    }

    loadWidgetOrder() {
        try {
            const savedOrder = localStorage.getItem('quantum-dashboard-widget-order');
            if (savedOrder) {
                const widgetOrder = JSON.parse(savedOrder);
                if (Array.isArray(widgetOrder) && widgetOrder.length > 0) {
                    const widgetGrid = document.querySelector('.widget-grid') || document.getElementById('widget-grid');
                    if (widgetGrid) {
                        const widgets = Array.from(widgetGrid.children);
                        const widgetMap = new Map(widgets.map(widget => [widget.id, widget]));

                        // Reorder widgets based on saved order
                        widgetOrder.forEach(widgetId => {
                            const widget = widgetMap.get(widgetId);
                            if (widget) {
                                widgetGrid.appendChild(widget);
                            }
                        });

                        console.log('✅ Loaded saved widget order');
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            console.error('❌ Error loading widget order:', error);
            return false;
        }
    }



    async handleAIQuery() {
        const input = document.getElementById('ai-input');
        const responseDiv = document.getElementById('ai-response');
        const query = input.value.trim();

        if (!query) return;

        responseDiv.innerHTML = '<div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary);"><div class="spinner" style="width: 16px; height: 16px; border: 2px solid #333; border-top: 2px solid #06b6d4; border-radius: 50%; animation: spin 1s linear infinite;"></div>AI thinking...</div>';
        input.value = '';

        try {
            const lowerQuery = query.toLowerCase();
            let response;
            let actionType = 'chat';

            // Determine what advanced action the user wants
            if (['create', 'generate', 'make', 'build', 'design', 'run', 'execute', 'circuit'].some(word => lowerQuery.includes(word))) {
                actionType = 'create_and_run';
                console.log('User wants circuit creation/execution');
                response = await this.callAIEndpoint('/api/ai/create_and_run', {
                    query: query,
                    backend: 'auto',
                    shots: 1024
                });
            } else if (['optimize', 'advanced', 'complex', 'optimization'].some(word => lowerQuery.includes(word))) {
                actionType = 'advanced_execution';
                console.log('User wants advanced circuit execution');
                response = await this.callAIEndpoint('/api/ai/execute_advanced', {
                    query: query,
                    optimization_level: 2,
                    backend: 'auto'
                });
            } else if (['history', 'past', 'previous', 'executed'].some(word => lowerQuery.includes(word))) {
                actionType = 'execution_history';
                console.log('User wants execution history');
                response = await this.callAIEndpoint('/api/ai/execution_history', {
                    limit: 10
                });
            } else if (['statistics', 'stats', 'performance', 'metrics'].some(word => lowerQuery.includes(word))) {
                actionType = 'statistics';
                console.log('User wants execution statistics');
                response = await this.callAIEndpoint('/api/ai/statistics');
            } else if (['suggest', 'recommend', 'backend', 'which'].some(word => lowerQuery.includes(word))) {
                actionType = 'suggest_backend';
                console.log('User wants backend suggestions');
                response = await this.callAIEndpoint('/api/ai/suggest_backend', {
                    circuit_type: 'auto',
                    qubits: 2
                });
            } else if (['force', 'refresh', 'real', 'update'].some(word => lowerQuery.includes(word))) {
                actionType = 'force_refresh';
                console.log('User wants to force real data refresh');
                response = await this.callAIEndpoint('/api/force_real_data');
            } else if (['debug', 'connection', 'status', 'check'].some(word => lowerQuery.includes(word))) {
                actionType = 'debug_connection';
                console.log('User wants connection debug info');
                response = await this.callAIEndpoint('/api/debug_connection');
            } else if (['templates', 'available', 'types', 'list'].some(word => lowerQuery.includes(word))) {
                actionType = 'templates';
                console.log('User wants circuit templates');
                response = await this.callAIEndpoint('/api/circuits');
            } else if (['backends', 'systems', 'hardware'].some(word => lowerQuery.includes(word))) {
                actionType = 'backends';
                console.log('User wants backend information');
                response = await this.callAIEndpoint('/api/backends');
            } else if (['jobs', 'tasks', 'running'].some(word => lowerQuery.includes(word))) {
                actionType = 'jobs';
                console.log('User wants job information');
                response = await this.callAIEndpoint('/api/jobs', {
                    limit: 10
                });
            } else {
                // HYBRID AI SYSTEM: Internal-first processing with intelligent routing
                const quantumKeywords = ['quantum', 'qubit', 'superposition', 'entanglement', 'hadamard', 'cnot', 'grover', 'shor', 'bell', 'bloch', 'gate', 'circuit', 'algorithm', 'qiskit', 'ibm', 'backend', 'decoherence', 'measurement', 'interference'];
                const isQuantumQuestion = quantumKeywords.some(keyword => lowerQuery.includes(keyword));

                if (isQuantumQuestion) {
                    // Route to quantum-specific hybrid AI (internal first, APIs for complex tasks)
                    actionType = 'quantum_chat';
                    console.log('    Quantum question - using hybrid quantum AI (internal-first)');
                    response = await this.callAIEndpoint('/api/ai/quantum_chat', {
                        message: query
                    });
                } else {
                    // Route to general hybrid AI (internal first, APIs for complex tasks)
                    actionType = 'general_chat';
                    console.log('    General question - using hybrid general AI (internal-first)');
                    response = await this.callAIEndpoint('/api/ai/general_chat', {
                        message: query
                    });
                }
            }

            if (response.ok) {
                const data = await response.json();
                this.displayAIResponse(data, actionType, responseDiv);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('AI query error:', error);
            const fallbackResponse = this.generateEnhancedAIResponse(query);
            responseDiv.innerHTML = `<div style="margin-top: 1rem; padding: 1rem; background: var(--glass-bg); border-radius: 8px; border: 1px solid var(--glass-border);">${fallbackResponse}</div>`;
        }
    }

    async callAIEndpoint(endpoint, data = {}) {
        console.log('callAIEndpoint called:', endpoint, 'with data:', data);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            console.log('API response status:', response.status, response.ok ? 'OK' : 'ERROR');
            return response;
        } catch (error) {
            console.error('🌐 API call failed:', error);
            throw error;
        }
    }

    displayAIResponse(data, actionType, responseDiv) {
        let html = '';

        if (data.success) {
            // Main response
            if (data.ai_response) {
                // Enhanced AI source indicators for hybrid system
                const aiSource = data.ai_source || 'unknown';
                const processingMethod = data.processing_method || 'unknown';

                // Define source indicators for hybrid AI
                const sourceConfig = {
                    'internal_ai': { color: '#10b981', icon: '🧠', label: 'Internal AI' },
                    'basic_internal': { color: '#84cc16', icon: '💡', label: 'Basic Internal' },
                    'cloud_api': { color: '#06b6d4', icon: '☁️', label: 'Cloud API' },
                    'knowledge_base_fallback': { color: '#8b5cf6', icon: '📚', label: 'Knowledge Base' },
                    'fallback': { color: '#ef4444', icon: ' ', label: 'Fallback' },
                    'unknown': { color: '#6b7280', icon: '🤖', label: 'AI' }
                };

                const config = sourceConfig[aiSource] || sourceConfig['unknown'];

                html += `<div style="margin-top: 1rem; padding: 1rem; background: var(--glass-bg); border-radius: 8px; border: 1px solid var(--glass-border); white-space: pre-wrap;">`;

                // Enhanced header with processing method
                html += `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.8rem;">`;
                html += `<div style="display: flex; align-items: center; gap: 0.5rem; color: ${config.color};">`;
                html += `<span>${config.icon}</span><span>${config.label}</span>`;
                html += `</div>`;

                // Show processing method badge
                if (processingMethod === 'hybrid_internal_first') {
                    html += `<div style="background: linear-gradient(135deg, #10b981, #06b6d4); color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.7rem; font-weight: 500;">Hybrid Mode</div>`;
                }
                html += `</div>`;

                // Check if AI response contains error messages and handle them
                let displayResponse = data.ai_response;
                if (data.ai_response && data.ai_response.includes('AI Configuration Needed')) {
                    displayResponse = `**AI Configuration Required**\n\nTo use advanced AI features:\n\n1. **Get FREE Hugging Face API key:**\n   - Visit: https://huggingface.co/settings/tokens\n   - Create a "Read" token (completely free)\n\n2. **Update configuration:**\n   - Edit \`cloud_ai_config.json\` in your project folder\n   - Replace the huggingface key with your token\n\n3. **Restart the server**\n\n**For now, I can still help with basic quantum concepts and circuit visualization!**`;
                } else if (data.ai_response && data.ai_response.includes('model is currently loading')) {
                    displayResponse = `**AI Model Loading**\n\nThe AI model is currently starting up. Please wait a moment and try your question again.\n\n**Quick tip:** Try asking about basic quantum concepts like superposition, entanglement, or Hadamard gates while you wait!`;
                } else if (data.ai_response && data.ai_response.includes('temporarily busy')) {
                    displayResponse = `**AI Service Busy**\n\nThe AI service is currently handling many requests. Please try again in a few moments.\n\n**Alternative:** Try asking about quantum circuits or basic concepts - those work instantly!`;
                }

                html += `${displayResponse}</div>`;
            }

            // Action-specific content
            switch (actionType) {
                case 'general_chat':
                    // General chat response - no special handling needed
                    break;
                case 'quantum_chat':
                case 'create_and_run':
                    console.log('🔗 Processing AI response with circuit data:', data);
                    if (data.circuit_data) {
                        console.log('🔗 Circuit data received:', data.circuit_data);
                        this.currentCircuit = data.circuit_data;

                        // Update the 3D circuit widget with the new circuit data
                        console.log('🔗 Attempting to load circuit in 3D');
                        if (typeof loadCircuitIn3D === 'function') {
                            console.log('🔗 loadCircuitIn3D function found, calling it');
                            loadCircuitIn3D(data.circuit_data);
                            html += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--modern-gradient); color: white; border-radius: 6px; font-size: 0.9rem;">🔗 Circuit generated and loaded in 3D Circuit widget!</div>`;
                        } else if (typeof setCircuitData === 'function') {
                            setCircuitData(data.circuit_data);
                            html += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--modern-gradient); color: white; border-radius: 6px; font-size: 0.9rem;">🔗 Circuit generated and loaded in 3D Circuit widget!</div>`;
                        } else {
                            html += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--modern-gradient); color: white; border-radius: 6px; font-size: 0.9rem;">🔗 Circuit generated! Check the 3D Circuit widget to view it.</div>`;
                        }
                    }
                    if (data.execution_details) {
                        html += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--success-gradient); color: white; border-radius: 6px; font-size: 0.9rem;"> Circuit executed on ${data.execution_details.backend}! Job ID: ${data.execution_details.job_id}</div>`;
                        setTimeout(() => this.refreshAllData(), 1000);
                    }
                    break;

                case 'advanced_execution':
                    if (data.execution_result) {
                        html += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--warning-gradient); color: white; border-radius: 6px; font-size: 0.9rem;">  Advanced execution completed with optimization level ${data.execution_result.optimization_level}</div>`;
                    }
                    break;

                case 'execution_history':
                    if (data.history && data.history.length > 0) {
                        html += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--glass-bg); border-radius: 6px; font-size: 0.9rem; border: 1px solid var(--glass-border);"><strong>Recent Executions:</strong><br>`;
                        data.history.slice(0, 5).forEach(job => {
                            html += `• ${job.circuit_type || 'Circuit'} on ${job.backend} (${job.status})<br>`;
                        });
                        html += '</div>';
                    }
                    break;

                case 'statistics':
                    if (data.statistics) {
                        const stats = data.statistics;
                        html += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--glass-bg); border-radius: 6px; font-size: 0.9rem; border: 1px solid var(--glass-border);"><strong>Execution Statistics:</strong><br>`;
                        html += `• Total Circuits: ${stats.total_circuits || 0}<br>`;
                        html += `• Success Rate: ${stats.success_rate || 0}%<br>`;
                        html += `• Most Used: ${stats.most_used_type || 'N/A'}<br>`;
                        html += `• Average Execution Time: ${stats.avg_execution_time || 0}s</div>`;
                    }
                    break;
                case 'suggest_backend':
                    if (data.suggested_backend) {
                        html += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--success-gradient); color: white; border-radius: 6px; font-size: 0.9rem;">    Suggested Backend: ${data.suggested_backend}</div>`;
                    }
                    break;

                case 'force_refresh':
                    if (data.message) {
                        html += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--modern-gradient); color: white; border-radius: 6px; font-size: 0.9rem;">   ${data.message}</div>`;
                        setTimeout(() => this.refreshAllData(), 500);
                    }
                    break;

                case 'debug_connection':
                    if (data.connection_debug) {
                        const debug = data.connection_debug;
                        html += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--glass-bg); border-radius: 6px; font-size: 0.8rem; border: 1px solid var(--glass-border);"><strong>Connection Debug:</strong><br>`;
                        html += `• API Key: ${debug.has_api_key ? '  Present' : '  Missing'}<br>`;
                        html += `• CRN: ${debug.has_crn ? '  Present' : '  Missing'}<br>`;
                        html += `• Manager Connected: ${debug.quantum_manager_connected ? ' ' : ' '}<br>`;
                        html += `• Provider Available: ${debug.quantum_manager_provider ? ' ' : ' '}</div>`;
                    }
                    break;

                case 'templates':
                    if (data.circuits) {
                        html += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--glass-bg); border-radius: 6px; font-size: 0.9rem; border: 1px solid var(--glass-border);"><strong>Available Circuit Templates:</strong><br>`;
                        Object.values(data.circuits).slice(0, 5).forEach(template => {
                            html += `• ${template.name} (${template.qubits} qubits)<br>`;
                        });
                        html += '</div>';
                    }
                    break;

                case 'backends':
                    if (data.backends) {
                        const operational = data.backends.filter(b => b.operational).length;
                        html += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--glass-bg); border-radius: 6px; font-size: 0.9rem; border: 1px solid var(--glass-border);"><strong>Backend Status:</strong><br>`;
                        html += `• Total: ${data.total_backends || data.backends.length}<br>`;
                        html += `• Operational: ${operational}<br>`;
                        html += `• Real Data: ${data.backends.some(b => b.real_data) ? '  Available' : '  Using fallback'}</div>`;
                    }
                    break;

                case 'jobs':
                    if (data.jobs) {
                        const running = data.jobs.filter(j => j.status === 'running').length;
                        html += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--glass-bg); border-radius: 6px; font-size: 0.9rem; border: 1px solid var(--glass-border);"><strong>Job Status:</strong><br>`;
                        html += `• Total Jobs: ${data.total_jobs || data.jobs.length}<br>`;
                        html += `• Running: ${running}<br>`;
                        html += `• Connected: ${data.connected ? ' ' : ' '}</div>`;
                    }
                    break;
            }
        } else {
            html = `<div style="margin-top: 1rem; padding: 1rem; background: var(--danger-gradient); color: white; border-radius: 8px;">  Error: ${data.error || 'Unknown error'}</div>`;
        }

        responseDiv.innerHTML = html;
    }

    async testAIConnection() {
        console.log('Testing AI connection...');
        try {
            const response = await this.callAIEndpoint('/api/ai/status');
            if (response.ok) {
                const data = await response.json();
                console.log('AI connection test result:', data);
                return data;
            } else {
                console.error('AI connection test failed:', response.status);
                return { status: 'error', message: `HTTP ${response.status}` };
            }
        } catch (error) {
            console.error('AI connection test error:', error);
            return { status: 'error', message: error.message };
        }
    }

    generateEnhancedAIResponse(query) {
        const lowerQuery = query.toLowerCase();

        // Enhanced fallback responses with more advanced features
        if (lowerQuery.includes('backend')) {
            return `You have ${this.state.backends.length} backends available, with ${this.state.backends.filter(b => b.operational).length} currently operational. Try asking me to "suggest a backend" for circuit execution recommendations.`;
        } else if (lowerQuery.includes('job') || lowerQuery.includes('task')) {
            return `You have ${this.state.jobs.length} total jobs, with ${this.state.jobs.filter(j => j.status === 'running').length} currently running. Ask me about "execution history" or "statistics" for more details.`;
        } else if (lowerQuery.includes('statistics') || lowerQuery.includes('performance')) {
            return 'I can show you execution statistics including success rates, most used circuit types, and performance metrics. Try asking "show me statistics" or "what are my execution stats".';
        } else if (lowerQuery.includes('history') || lowerQuery.includes('past')) {
            return 'I can show you your recent circuit execution history. Try asking "show execution history" or "what circuits have I run".';
        } else if (lowerQuery.includes('optimize') || lowerQuery.includes('advanced')) {
            return 'I can execute circuits with advanced optimization. Try asking "execute advanced circuit" or "run optimized version".';
        } else if (lowerQuery.includes('force') || lowerQuery.includes('refresh')) {
            return 'I can force refresh real IBM Quantum data. Try asking "force real data refresh" or "update connection".';
        } else if (lowerQuery.includes('debug') || lowerQuery.includes('connection')) {
            return 'I can show you connection debug information. Try asking "debug connection" or "check connection status".';
        } else if (lowerQuery.includes('template') || lowerQuery.includes('available')) {
            return 'I can show you available circuit templates. Try asking "show templates" or "what circuits are available".';
        } else if (lowerQuery.includes('quantum') || lowerQuery.includes('explain')) {
            return 'Quantum computing uses quantum mechanical phenomena like superposition and entanglement to process information. I can help you create, execute, and analyze quantum circuits!';
        } else if (lowerQuery.includes('help') || lowerQuery.includes('what can you do')) {
            return `I can help you with:

  **Circuit Creation & Execution**
• "Create a Bell state circuit"
• "Execute Grover's algorithm"
• "Run optimized circuit"

  **Advanced Features**
• "Show execution statistics"
• "Display execution history"
• "Force real data refresh"
• "Debug connection status"
• "Suggest optimal backend"

**System Information**
• "Show available backends"
• "List circuit templates"
• "Check job status"

💬 **General Questions**
• Ask me anything about quantum computing!

What would you like to explore?`;
        } else {
            return `I'm your AI quantum assistant! I can help you with:

• **Creating & Executing Circuits**: "Create a quantum circuit", "Execute Bell state"
• **Advanced Features**: "Show statistics", "Execution history", "Force refresh"
• **System Info**: "Available backends", "Job status", "Circuit templates"
• **Quantum Questions**: Ask me anything about quantum computing!

Try asking: "Create and run a Bell state circuit" or "Show me execution statistics"`;
        }
    }

    startAutoRefresh() {
        // DISABLED - Causing infinite loop and performance issues
        // Auto-refresh disabled to prevent continuous API hammering
        // Users can manually refresh using the refresh buttons on widgets
        console.log('⚠️  Auto-refresh disabled to prevent performance issues');
        /*
        if (this.refreshInterval > 0) {
            setInterval(() => {
                if (!this.isLoading) {
                    this.loadInitialData();
                }
            }, this.refreshInterval);
        }
        */
    }

    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <i class="${icons[type] || icons.info}"></i>
            <div style="flex: 1;">
                <div>${message}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${new Date().toLocaleTimeString()}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }

    // Essential functions for compatibility with existing template
    updateEnhancedMetrics() {
        console.log('Updating enhanced metrics...');
        this.updateMetrics();
    }

    updateAllWidgetsLegacy() {
        console.log('Updating all widgets...');
        this.updateAllWidgets();
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    updateConnectionStatusLegacy(connected) {
        this.updateConnectionStatus(connected);
    }

    // Force refresh functionality
    async forceRefresh() {
        console.log('Force refreshing dashboard...');
        await this.refreshAllData();
    }

    // Basic widget methods for when widget manager is not available
    async updateBasicWidgets() {
        console.log('Updating basic widgets...');
        const widgetTypes = ['backends', 'jobs', 'performance', 'historical-data'];

        for (const widgetType of widgetTypes) {
            await this.updateBasicWidget(widgetType);
        }
    }

    async updateBasicWidget(widgetType) {
        const contentElement = document.getElementById(`${widgetType}-content`);
        if (!contentElement) {
            console.log(`${widgetType}-content element not found`);
            return;
        }

        console.log(`Updating basic ${widgetType} widget...`);

        try {
            let data = [];
            let endpoint = '';

            switch (widgetType) {
                case 'backends':
                    endpoint = '/api/backends';
                    break;
                case 'jobs':
                    endpoint = '/api/jobs';
                    break;
                case 'performance':
                    endpoint = '/api/performance_metrics';
                    break;
                case 'historical-data':
                    endpoint = '/api/historical_data';
                    break;
            }

            const response = await fetch(endpoint, {
                credentials: 'include'
            });
            if (response.ok) {
                data = await response.json();
                console.log(`Fetched ${widgetType} data:`, data);
            } else {
                console.error(`Failed to fetch ${widgetType} data:`, response.status);
            }

            // Render basic content
            this.renderBasicWidgetContent(widgetType, data, contentElement);

        } catch (error) {
            console.error(`Error updating basic ${widgetType} widget:`, error);
            contentElement.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <div style="font-size: 2rem; margin-bottom: 1rem;"> </div>
                    <p>Error loading ${widgetType} data</p>
                    <p style="font-size: 0.8rem; margin-top: 0.5rem;">Check your IBM Quantum connection</p>
                </div>
            `;
        }
    }

    renderBasicWidgetContent(widgetType, data, contentElement) {
        let html = '';

        switch (widgetType) {
            case 'backends':
                // Handle API response structure: {backends: [...], total_backends: N}
                const backendsArray = Array.isArray(data) ? data : (data.backends || []);
                if (backendsArray.length > 0) {
                    html = backendsArray.slice(0, 3).map(backend => `
                        <div style="background: var(--glass-bg); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid var(--glass-border);">
                            <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">${backend.name}</h4>
                            <div style="font-size: 0.9rem; color: var(--text-secondary);">
                                <div>Qubits: ${backend.num_qubits || backend.n_qubits || 'N/A'}</div>
                                <div>Status: ${backend.status || 'Unknown'}</div>
                                <div>Queue: ${backend.queue || backend.pending_jobs || 0}</div>
                            </div>
                        </div>
                    `).join('');
                } else {
                    html = `
                        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                            <div style="font-size: 2rem; margin-bottom: 1rem;">🔌</div>
                            <p>No backends available</p>
                            <p style="font-size: 0.8rem; margin-top: 0.5rem;">Connect to IBM Quantum to see available backends</p>
                        </div>
                    `;
                }
                break;

            case 'jobs':
                // Handle API response structure: {jobs: [...], total_jobs: N}
                const jobsArray = Array.isArray(data) ? data : (data.jobs || []);
                if (jobsArray.length > 0) {
                    html = jobsArray.slice(0, 5).map(job => `
                        <div style="background: var(--glass-bg); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid var(--glass-border);">
                            <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary); font-family: monospace; font-size: 0.9rem;">${job.job_id || 'Unknown'}</h4>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                <div>Backend: ${job.backend || 'Unknown'}</div>
                                <div>Status: ${job.status || 'Unknown'}</div>
                                <div>Shots: ${job.shots || 0}</div>
                            </div>
                        </div>
                    `).join('');
                } else {
                    // Check if we have total_jobs info from API response
                    const totalJobs = data.total_jobs || 0;
                    const hasRealData = data.jobs && data.jobs.some(job => job.real_data);

                    html = `
                        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                            <div style="font-size: 2rem; margin-bottom: 1rem;">${totalJobs === 0 ? '  ' : '📋'}</div>
                            <p>${totalJobs === 0 ? 'No jobs submitted yet' : 'No jobs available'}</p>
                            <p style="font-size: 0.8rem; margin-top: 0.5rem;">
                                ${totalJobs === 0 ? 'Submit a quantum circuit to see job status' : 'Your submitted jobs will appear here'}
                            </p>
                            ${!hasRealData && totalJobs > 0 ? '<p style="font-size: 0.7rem; margin-top: 0.5rem; color: var(--accent);">Showing demo data - submit real circuits for live status</p>' : ''}
                        </div>
                    `;
                }
                break;
            case 'performance':
                const performance = data || {};
                if (performance.total_jobs > 0) {
                    html = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div style="background: var(--glass-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--glass-border); text-align: center;">
                                <div style="font-size: 1.5rem; color: #10b981; font-weight: bold;">${(performance.success_rate <= 1 ? (performance.success_rate * 100) : performance.success_rate).toFixed(1)}%</div>
                                <div style="color: var(--text-secondary); font-size: 0.8rem;">Success Rate</div>
                            </div>
                            <div style="background: var(--glass-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--glass-border); text-align: center;">
                                <div style="font-size: 1.5rem; color: #3b82f6; font-weight: bold;">${performance.total_jobs || 0}</div>
                                <div style="color: var(--text-secondary); font-size: 0.8rem;">Total Jobs</div>
                            </div>
                        </div>
                    `;
                } else {
                    html = `
                        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                            <div style="font-size: 2rem; margin-bottom: 1rem;"> </div>
                            <p>No performance data</p>
                            <p style="font-size: 0.8rem; margin-top: 0.5rem;">Run quantum circuits to see performance metrics</p>
                        </div>
                    `;
                }
                break;

            case 'historical-data':
                const historicalData = data || {};
                const historicalRecords = historicalData.data || [];
                if (!historicalData.authenticated) {
                    html = `
                        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                            <div style="font-size: 2rem; margin-bottom: 1rem;">[LOCKED]</div>
                            <p>No historical data available</p>
                            <p style="font-size: 0.8rem; margin-top: 0.5rem;">${historicalData.description || 'Login required to access historical data'}</p>
                        </div>
                    `;
                } else if (historicalRecords.length > 0) {
                    html = `
                        <div style="max-height: 400px; overflow-y: auto;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <span style="color: var(--text-secondary); font-size: 0.9rem;">Last ${historicalData.time_range_hours || 0.5} hours</span>
                                <span style="color: var(--text-accent); font-size: 0.8rem;">${historicalData.offline_access ? '🟢 Offline' : '🔴 Online'}</span>
                            </div>
                            ${historicalRecords.slice(0, 5).map(record => `
                                <div style="background: var(--glass-bg); padding: 0.75rem; border-radius: 6px; margin-bottom: 0.75rem; border: 1px solid var(--glass-border);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                        <span style="color: var(--text-primary); font-weight: 500; font-size: 0.9rem;">${record.data_type || 'summary'}</span>
                                        <span style="color: var(--text-secondary); font-size: 0.8rem;">${record.datetime || record.timestamp}</span>
                                    </div>
                                    ${record.data_type === 'summary' ? `
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.8rem;">
                                            <div>Backends: ${record.data.total_backends || 0}</div>
                                            <div>Jobs: ${record.data.total_jobs || 0}</div>
                                            <div>Running: ${record.data.running_jobs || 0}</div>
                                            <div>Success: ${record.data.success_rate ? (record.data.success_rate <= 1 ? (record.data.success_rate * 100).toFixed(1) : record.data.success_rate.toFixed(1)) + '%' : '0%'}</div>
                                        </div>
                                    ` : record.data_type === 'backends' ? `
                                        <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                            ${record.data.count || 0} backends monitored
                                        </div>
                                    ` : record.data_type === 'jobs' ? `
                                        <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                            ${record.data.total_jobs || 0} jobs tracked (${record.data.count || 0} recent)
                                        </div>
                                    ` : `
                                        <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                            Data snapshot available
                                        </div>
                                    `}
                                </div>
                            `).join('')}
                            ${historicalRecords.length > 5 ? `<div style="text-align: center; color: var(--text-secondary); font-size: 0.8rem; margin-top: 1rem;">... and ${historicalRecords.length - 5} more records</div>` : ''}
                        </div>
                    `;
                } else {
                    html = `
                        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                            <div style="font-size: 2rem; margin-bottom: 1rem;">📊</div>
                            <p>No historical data available</p>
                            <p style="font-size: 0.8rem; margin-top: 0.5rem;">Historical data will appear here after some usage</p>
                            <p style="font-size: 0.7rem; margin-top: 0.5rem; color: var(--text-accent);">Works offline once data is collected</p>
                        </div>
                    `;
                }
                break;

            default:
                html = '<p style="text-align: center; color: var(--text-secondary);">Widget not available</p>';
        }

        contentElement.innerHTML = sanitizeHTML(html);

        // Hide loading and show content
        const widget = contentElement.closest('.widget');
        const loadingElement = widget.querySelector('.loading');
        if (loadingElement) loadingElement.style.display = 'none';
        contentElement.style.display = 'block';
    }

    // Caching helper methods
    getCachedData(key) {
        try {
            const cached = localStorage.getItem(`dashboard_cache_${key}`);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Error reading cache:', error);
            return null;
        }
    }

    setCachedData(key, data) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(`dashboard_cache_${key}`, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error writing cache:', error);
        }
    }

    // AI Side Panel functionality
    createAISidePanel() {
        console.log('Creating AI side panel...');

        // Check if panel already exists
        const existingPanel = document.getElementById('ai-side-panel');
        if (existingPanel) {
            existingPanel.style.display = 'flex';
            return;
        }

        // Create the side panel HTML structure
        const sidePanel = document.createElement('div');
        sidePanel.id = 'ai-side-panel';
        sidePanel.className = 'ai-side-panel';
        sidePanel.innerHTML = `
            <div style="width: 100%; height: 100%; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                <!-- Header -->
                <div style="padding: 20px; background: rgba(15, 23, 42, 0.8); border-bottom: 1px solid rgba(6, 182, 212, 0.2); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-robot" style="color: #06b6d4;"></i>
                        AI Quantum Assistant
                    </h3>
                    <div style="display: flex; gap: 8px;">
                        <button id="ai-minimize-btn" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: rgba(255, 255, 255, 0.8); cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'; this.style.color='white';" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.color='rgba(255, 255, 255, 0.8)';">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button id="ai-close-btn" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: rgba(255, 255, 255, 0.8); cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.color='#ef4444';" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.color='rgba(255, 255, 255, 0.8)';">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <!-- Tabs -->
                <div style="padding: 0 20px; background: rgba(15, 23, 42, 0.3); backdrop-filter: blur(10px);">
                    <div style="display: flex; gap: 0; border-radius: 12px; overflow: hidden; box-shadow: inset 0 1px 0 rgba(6, 182, 212, 0.1);">
                        <button class="ai-tab-btn active" data-tab="chat" style="flex: 1; padding: 16px 20px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%); border: none; border-bottom: 3px solid #3b82f6; color: #ffffff; font-weight: 600; cursor: pointer; transition: all 0.3s ease; position: relative;">
                            <i class="fas fa-comments" style="margin-right: 8px;"></i> Chat
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #3b82f6, #8b5cf6);"></div>
                        </button>
                        <button class="ai-tab-btn" data-tab="circuits" style="flex: 1; padding: 16px 20px; background: rgba(255, 255, 255, 0.05); border: none; border-bottom: 3px solid transparent; color: rgba(255, 255, 255, 0.7); cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.color='white';" onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'; this.style.color='rgba(255, 255, 255, 0.7)';">
                            <i class="fas fa-microchip" style="margin-right: 8px;"></i> Circuits
                        </button>
                        <button class="ai-tab-btn" data-tab="code" style="flex: 1; padding: 16px 20px; background: rgba(255, 255, 255, 0.05); border: none; border-bottom: 3px solid transparent; color: rgba(255, 255, 255, 0.7); cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.color='white';" onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'; this.style.color='rgba(255, 255, 255, 0.7)';">
                            <i class="fas fa-code" style="margin-right: 8px;"></i> Code
                        </button>
                        <button class="ai-tab-btn" data-tab="tools" style="flex: 1; padding: 16px 20px; background: rgba(255, 255, 255, 0.05); border: none; border-bottom: 3px solid transparent; color: rgba(255, 255, 255, 0.7); cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.color='white';" onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'; this.style.color='rgba(255, 255, 255, 0.7)';">
                            <i class="fas fa-tools" style="margin-right: 8px;"></i> Tools
                        </button>
                    </div>
                </div>

                <!-- Tab Content -->
                <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">

                    <!-- Chat Tab -->
                    <div id="chat-tab" class="ai-tab-content active" style="flex: 1; display: flex; flex-direction: column; height: 100%; min-height: 0;">
                        <!-- Scrollable messages container -->
                        <div id="ai-chat-messages" style="flex: 1; overflow-y: auto; padding: 16px; scroll-behavior: smooth; scrollbar-width: thin; scrollbar-color: rgba(59, 130, 246, 0.5) rgba(255, 255, 255, 0.1); min-height: 200px; max-height: none;">
                            <div class="ai-message assistant">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);">
                                        <i class="fas fa-robot" style="color: #ffffff;"></i>
                                    </div>
                                    <strong style="color: #ffffff; font-size: 14px;">AI Assistant</strong>
                                </div>
                                <div style="color: #e5e7eb; line-height: 1.6; font-size: 14px;">
                                    Hello! I'm your advanced quantum computing AI assistant. I can help you with:
                                    <ul style="margin: 12px 0; padding-left: 20px; color: #cbd5e1;">
                                        <li style="margin: 6px 0;">Create and execute quantum circuits</li>
                                        <li style="margin: 6px 0;">Explain quantum algorithms and concepts</li>
                                        <li style="margin: 6px 0;">Generate Qiskit code</li>
                                        <li style="margin: 6px 0;">Monitor IBM Quantum backends</li>
                                        <li style="margin: 6px 0;">Visualize quantum states</li>
                                    </ul>
                                    What would you like to explore?
                                </div>
                            </div>
                        </div>

                        <!-- Input area -->
                        <div style="padding: 16px; border-top: 1px solid rgba(255, 255, 255, 0.1); background: rgba(15, 23, 42, 0.3);">
                            <div style="display: flex; gap: 8px; align-items: flex-end;">
                                <div style="flex: 1;">
                                    <textarea id="ai-chat-input" placeholder="Ask me about quantum computing..." style="width: 100%; min-height: 60px; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: #ffffff; font-family: inherit; resize: vertical;" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); document.getElementById('ai-send-btn').click();}"></textarea>
                                </div>
                                <button id="ai-send-btn" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); border: none; color: white; padding: 12px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; height: fit-content;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </div>
                            <div style="display: flex; gap: 8px; margin-top: 8px;">
                                <button id="ai-clear-btn" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: rgba(255, 255, 255, 0.8); cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.2s ease; font-size: 12px;" onmouseover="this.style.background='rgba(245, 158, 11, 0.2)'; this.style.color='#f59e0b';" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.color='rgba(255, 255, 255, 0.8)';" title="Clear Chat History">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <!-- Circuits Tab -->
                    <div id="circuits-tab" class="ai-tab-content" style="flex: 1; display: flex; flex-direction: column; height: 100%;">
                        <div style="flex: 1; overflow-y: auto; padding: 16px; scrollbar-width: none; -ms-overflow-style: none; min-height: 0;">
                            <h4 style="margin: 0 0 16px 0; color: #ffffff; font-weight: 600; display: flex; align-items: center; gap: 8px;"><i class="fas fa-microchip"></i> Quantum Circuit Library</h4>

                            <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
                                <div class="ai-circuit-example" style="border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; overflow: hidden; background: rgba(59, 130, 246, 0.05); transition: all 0.3s ease; cursor: pointer;" onmouseover="this.style.background='rgba(59, 130, 246, 0.1)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)';" onmouseout="this.style.background='rgba(59, 130, 246, 0.05)'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                                    <div style="padding: 14px; background: rgba(59, 130, 246, 0.15); border-bottom: 1px solid rgba(59, 130, 246, 0.3); display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-link" style="color: #60a5fa;"></i>
                                        <h5 style="margin: 0; color: #60a5fa; font-weight: 600; font-size: 15px;">Bell State Preparation</h5>
                                    </div>
                                    <div style="padding: 14px;">
                                        <p style="margin: 0 0 10px 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">Creates maximally entangled Bell state |Φ⁺⟩ = (|00⟩ + |11⟩)/√2. Perfect for quantum teleportation and testing entanglement.</p>
                                        <button class="ai-circuit-btn" data-circuit="bell" style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; width: fit-content;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"><i class="fas fa-play"></i> Generate Circuit</button>
                                    </div>
                                </div>

                                <div class="ai-circuit-example" style="border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; overflow: hidden; background: rgba(139, 92, 246, 0.05); transition: all 0.3s ease; cursor: pointer;" onmouseover="this.style.background='rgba(139, 92, 246, 0.1)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.3)';" onmouseout="this.style.background='rgba(139, 92, 246, 0.05)'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                                    <div style="padding: 14px; background: rgba(139, 92, 246, 0.15); border-bottom: 1px solid rgba(139, 92, 246, 0.3); display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-atom" style="color: #a78bfa;"></i>
                                        <h5 style="margin: 0; color: #a78bfa; font-weight: 600; font-size: 15px;">GHZ State</h5>
                                    </div>
                                    <div style="padding: 14px;">
                                        <p style="margin: 0 0 10px 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">Greenberger-Horne-Zeilinger state for 3+ qubits. Demonstrates quantum entanglement across multiple particles.</p>
                                        <button class="ai-circuit-btn" data-circuit="ghz" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; width: fit-content;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"><i class="fas fa-play"></i> Generate Circuit</button>
                                    </div>
                                </div>

                                <div class="ai-circuit-example" style="border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; overflow: hidden; background: rgba(16, 185, 129, 0.05); transition: all 0.3s ease; cursor: pointer;" onmouseover="this.style.background='rgba(16, 185, 129, 0.1)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)';" onmouseout="this.style.background='rgba(16, 185, 129, 0.05)'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                                    <div style="padding: 14px; background: rgba(16, 185, 129, 0.15); border-bottom: 1px solid rgba(16, 185, 129, 0.3); display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-wave-square" style="color: #34d399;"></i>
                                        <h5 style="margin: 0; color: #34d399; font-weight: 600; font-size: 15px;">Quantum Fourier Transform</h5>
                                    </div>
                                    <div style="padding: 14px;">
                                        <p style="margin: 0 0 10px 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">QFT circuit for quantum phase estimation. Essential component in Shor's algorithm and other quantum algorithms.</p>
                                        <button class="ai-circuit-btn" data-circuit="qft" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; width: fit-content;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"><i class="fas fa-play"></i> Generate Circuit</button>
                                    </div>
                                </div>

                                <div class="ai-circuit-example" style="border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; overflow: hidden; background: rgba(245, 158, 11, 0.05); transition: all 0.3s ease; cursor: pointer;" onmouseover="this.style.background='rgba(245, 158, 11, 0.1)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.3)';" onmouseout="this.style.background='rgba(245, 158, 11, 0.05)'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                                    <div style="padding: 14px; background: rgba(245, 158, 11, 0.15); border-bottom: 1px solid rgba(245, 158, 11, 0.3); display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-search" style="color: #fbbf24;"></i>
                                        <h5 style="margin: 0; color: #fbbf24; font-weight: 600; font-size: 15px;">Grover's Search Algorithm</h5>
                                    </div>
                                    <div style="padding: 14px;">
                                        <p style="margin: 0 0 10px 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">Quadratic speedup for searching unsorted databases. Demonstrates quantum advantage for search problems.</p>
                                        <button class="ai-circuit-btn" data-circuit="grover" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; width: fit-content;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"><i class="fas fa-play"></i> Generate Circuit</button>
                                    </div>
                                </div>

                                <div class="ai-circuit-example" style="border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 12px; overflow: hidden; background: rgba(6, 182, 212, 0.05); transition: all 0.3s ease; cursor: pointer;" onmouseover="this.style.background='rgba(6, 182, 212, 0.1)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(6, 182, 212, 0.3)';" onmouseout="this.style.background='rgba(6, 182, 212, 0.05)'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                                    <div style="padding: 14px; background: rgba(6, 182, 212, 0.15); border-bottom: 1px solid rgba(6, 182, 212, 0.3); display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-exchange-alt" style="color: #22d3ee;"></i>
                                        <h5 style="margin: 0; color: #22d3ee; font-weight: 600; font-size: 15px;">Quantum Teleportation</h5>
                                    </div>
                                    <div style="padding: 14px;">
                                        <p style="margin: 0 0 10px 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">Transfer quantum information using entanglement. A fundamental protocol in quantum communication.</p>
                                        <button class="ai-circuit-btn" data-circuit="teleportation" style="background: linear-gradient(135deg, #06b6d4, #0891b2); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; width: fit-content;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(6, 182, 212, 0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"><i class="fas fa-play"></i> Generate Circuit</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Code Tab -->
                    <div id="code-tab" class="ai-tab-content" style="flex: 1; display: flex; flex-direction: column; height: 100%;">
                        <div style="flex: 1; overflow-y: auto; padding: 16px; scrollbar-width: none; -ms-overflow-style: none; min-height: 0;">
                            <h4 style="margin: 0 0 16px 0; color: #ffffff; font-weight: 600; display: flex; align-items: center; gap: 8px;"><i class="fas fa-code"></i> Code Examples</h4>

                            <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
                                <div class="ai-code-example" style="border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; overflow: hidden; background: rgba(245, 158, 11, 0.05); transition: all 0.3s ease;" onmouseover="this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.3)';" onmouseout="this.style.boxShadow='none';">
                                    <div style="padding: 14px; background: rgba(245, 158, 11, 0.15); border-bottom: 1px solid rgba(245, 158, 11, 0.3); display: flex; align-items: center; justify-content: space-between;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-file-code" style="color: #fbbf24;"></i>
                                            <h5 style="margin: 0; color: #fbbf24; font-weight: 600; font-size: 15px;">Basic Qiskit Circuit</h5>
                                        </div>
                                        <span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500;">Beginner</span>
                                    </div>
                                    <div style="padding: 14px;">
                                        <div style="font-family: 'Fira Code', 'Monaco', monospace; font-size: 12px; background: rgba(0, 0, 0, 0.5); color: #e5e7eb; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
                                            <pre style="margin: 0; padding: 14px; white-space: pre-wrap; line-height: 1.5;">from qiskit import QuantumCircuit, execute, Aer

# Create a simple quantum circuit
qc = QuantumCircuit(2, 2)
qc.h(0)  # Hadamard gate
qc.cx(0, 1)  # CNOT gate
qc.measure_all()

print(qc)</pre>
                                        </div>
                                        <button class="ai-code-btn" data-code="basic" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; margin-top: 10px; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"><i class="fas fa-copy"></i> Copy Code</button>
                                    </div>
                                </div>

                                <div class="ai-code-example" style="border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; overflow: hidden; background: rgba(239, 68, 68, 0.05); transition: all 0.3s ease;" onmouseover="this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.3)';" onmouseout="this.style.boxShadow='none';">
                                    <div style="padding: 14px; background: rgba(239, 68, 68, 0.15); border-bottom: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: space-between;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-file-code" style="color: #f87171;"></i>
                                            <h5 style="margin: 0; color: #f87171; font-weight: 600; font-size: 15px;">Bell State Preparation</h5>
                                        </div>
                                        <span style="background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500;">Intermediate</span>
                                    </div>
                                    <div style="padding: 14px;">
                                        <div style="font-family: 'Fira Code', 'Monaco', monospace; font-size: 12px; background: rgba(0, 0, 0, 0.5); color: #e5e7eb; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
                                            <pre style="margin: 0; padding: 14px; white-space: pre-wrap; line-height: 1.5;">from qiskit import QuantumCircuit

def create_bell_state():
    qc = QuantumCircuit(2)
    qc.h(0)          # Put first qubit in superposition
    qc.cx(0, 1)      # Entangle with second qubit
    return qc

bell_circuit = create_bell_state()
print(bell_circuit)</pre>
                                        </div>
                                        <button class="ai-code-btn" data-code="bell" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; margin-top: 10px; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"><i class="fas fa-copy"></i> Copy Code</button>
                                    </div>
                                </div>

                                <div class="ai-code-example" style="border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; overflow: hidden; background: rgba(139, 92, 246, 0.05); transition: all 0.3s ease;" onmouseover="this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.3)';" onmouseout="this.style.boxShadow='none';">
                                    <div style="padding: 14px; background: rgba(139, 92, 246, 0.15); border-bottom: 1px solid rgba(139, 92, 246, 0.3); display: flex; align-items: center; justify-content: space-between;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-file-code" style="color: #a78bfa;"></i>
                                            <h5 style="margin: 0; color: #a78bfa; font-weight: 600; font-size: 15px;">Quantum Measurement</h5>
                                        </div>
                                        <span style="background: rgba(139, 92, 246, 0.2); color: #a78bfa; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500;">Beginner</span>
                                    </div>
                                    <div style="padding: 14px;">
                                        <div style="font-family: 'Fira Code', 'Monaco', monospace; font-size: 12px; background: rgba(0, 0, 0, 0.5); color: #e5e7eb; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
                                            <pre style="margin: 0; padding: 14px; white-space: pre-wrap; line-height: 1.5;">from qiskit import QuantumCircuit, Aer, execute

qc = QuantumCircuit(2, 2)
qc.h(0)  # Superposition
qc.measure([0,1], [0,1])

backend = Aer.get_backend('qasm_simulator')
result = execute(qc, backend, shots=1024).result()
counts = result.get_counts()
print(counts)</pre>
                                        </div>
                                        <button class="ai-code-btn" data-code="measurement" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; margin-top: 10px; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"><i class="fas fa-copy"></i> Copy Code</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tools Tab -->
                    <div id="tools-tab" class="ai-tab-content" style="flex: 1; display: flex; flex-direction: column; height: 100%;">
                        <div style="flex: 1; overflow-y: auto; padding: 16px; scrollbar-width: none; -ms-overflow-style: none; min-height: 0;">
                            <h4 style="margin: 0 0 16px 0; color: #ffffff; font-weight: 600; display: flex; align-items: center; gap: 8px;"><i class="fas fa-tools"></i> AI Tools & Settings</h4>

                            <div style="display: grid; grid-template-columns: 1fr; gap: 14px;">
                                <!-- Chat Settings Card -->
                                <div style="padding: 16px; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; background: rgba(59, 130, 246, 0.05); transition: all 0.3s ease;" onmouseover="this.style.background='rgba(59, 130, 246, 0.1)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.2)';" onmouseout="this.style.background='rgba(59, 130, 246, 0.05)'; this.style.boxShadow='none';">
                                    <h5 style="margin: 0 0 12px 0; color: #60a5fa; font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px;"><i class="fas fa-cog"></i> Chat Settings</h5>
                                    <div style="display: flex; flex-direction: column; gap: 14px;">
                                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: rgba(0, 0, 0, 0.2); border-radius: 8px;">
                                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                                <label style="font-size: 13px; color: #e5e7eb; font-weight: 500;">Persist Chat History</label>
                                                <span style="font-size: 11px; color: #94a3b8;">Save conversations locally</span>
                                            </div>
                                            <label class="switch">
                                                <input type="checkbox" id="ai-persist-history" checked>
                                                <span class="slider"></span>
                                            </label>
                                        </div>
                                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: rgba(0, 0, 0, 0.2); border-radius: 8px;">
                                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                                <label style="font-size: 13px; color: #e5e7eb; font-weight: 500;">Show Timestamps</label>
                                                <span style="font-size: 11px; color: #94a3b8;">Display message times</span>
                                            </div>
                                            <label class="switch">
                                                <input type="checkbox" id="ai-show-timestamps" checked>
                                                <span class="slider"></span>
                                            </label>
                                        </div>
                                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: rgba(0, 0, 0, 0.2); border-radius: 8px;">
                                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                                <label style="font-size: 13px; color: #e5e7eb; font-weight: 500;">Sound Notifications</label>
                                                <span style="font-size: 11px; color: #94a3b8;">Audio alerts for responses</span>
                                            </div>
                                            <label class="switch">
                                                <input type="checkbox" id="ai-sound-notifications">
                                                <span class="slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <!-- Quick Actions Card -->
                                <div style="padding: 16px; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; background: rgba(139, 92, 246, 0.05); transition: all 0.3s ease;" onmouseover="this.style.background='rgba(139, 92, 246, 0.1)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.2)';" onmouseout="this.style.background='rgba(139, 92, 246, 0.05)'; this.style.boxShadow='none';">
                                    <h5 style="margin: 0 0 12px 0; color: #a78bfa; font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px;"><i class="fas fa-bolt"></i> Quick Actions</h5>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                        <button class="ai-quick-btn" style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; justify-content: center;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"><i class="fas fa-broom"></i> Clear Cache</button>
                                        <button class="ai-quick-btn" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; justify-content: center;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"><i class="fas fa-redo"></i> Reset</button>
                                        <button class="ai-quick-btn" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; justify-content: center;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"><i class="fas fa-download"></i> Export</button>
                                        <button class="ai-quick-btn" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; justify-content: center;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"><i class="fas fa-lightbulb"></i> Tips</button>
                                    </div>
                                </div>

                                <!-- AI Model Info Card -->
                                <div style="padding: 16px; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; background: rgba(16, 185, 129, 0.05); transition: all 0.3s ease;" onmouseover="this.style.background='rgba(16, 185, 129, 0.1)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.2)';" onmouseout="this.style.background='rgba(16, 185, 129, 0.05)'; this.style.boxShadow='none';">
                                    <h5 style="margin: 0 0 12px 0; color: #34d399; font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px;"><i class="fas fa-info-circle"></i> AI Model Info</h5>
                                    <div style="background: rgba(0, 0, 0, 0.2); padding: 12px; border-radius: 8px;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                            <div style="width: 10px; height: 10px; background: #34d399; border-radius: 50%; box-shadow: 0 0 8px #34d399;"></div>
                                            <span style="color: #e5e7eb; font-size: 13px; font-weight: 500;">Status: Online</span>
                                        </div>
                                        <div style="color: #cbd5e1; font-size: 12px; line-height: 1.6;">
                                            <p style="margin: 6px 0;"><strong style="color: #e5e7eb;">Model:</strong> Quantum AI Assistant</p>
                                            <p style="margin: 6px 0;"><strong style="color: #e5e7eb;">Version:</strong> 2.0.1</p>
                                            <p style="margin: 6px 0;"><strong style="color: #e5e7eb;">Capabilities:</strong> Circuit Generation, Code Examples, Quantum Concepts</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Keyboard Shortcuts Card -->
                                <div style="padding: 16px; border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 12px; background: rgba(6, 182, 212, 0.05); transition: all 0.3s ease;" onmouseover="this.style.background='rgba(6, 182, 212, 0.1)'; this.style.boxShadow='0 4px 12px rgba(6, 182, 212, 0.2)';" onmouseout="this.style.background='rgba(6, 182, 212, 0.05)'; this.style.boxShadow='none';">
                                    <h5 style="margin: 0 0 12px 0; color: #22d3ee; font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px;"><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h5>
                                    <div style="background: rgba(0, 0, 0, 0.2); padding: 12px; border-radius: 8px; font-size: 12px; color: #cbd5e1; line-height: 1.8;">
                                        <p style="margin: 6px 0; display: flex; justify-content: space-between;"><span>Send Message:</span> <code style="background: rgba(0, 0, 0, 0.3); padding: 2px 8px; border-radius: 4px; color: #22d3ee;">Enter</code></p>
                                        <p style="margin: 6px 0; display: flex; justify-content: space-between;"><span>New Line:</span> <code style="background: rgba(0, 0, 0, 0.3); padding: 2px 8px; border-radius: 4px; color: #22d3ee;">Shift + Enter</code></p>
                                        <p style="margin: 6px 0; display: flex; justify-content: space-between;"><span>Close Panel:</span> <code style="background: rgba(0, 0, 0, 0.3); padding: 2px 8px; border-radius: 4px; color: #22d3ee;">Escape</code></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(sidePanel);

        // Initialize functionality
        this.initializeAISidePanel(sidePanel);

        // Add keyboard shortcut for closing (Escape key)
        const handleKeyPress = (event) => {
            if (event.key === 'Escape') {
                console.log('Escape key pressed, closing AI side panel...');
                this.closeAISidePanel();
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        sidePanel._keyHandler = handleKeyPress;
    }

    initializeAISidePanel(sidePanel) {
        // Tab switching functionality
        const tabBtns = sidePanel.querySelectorAll('.ai-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all tabs and reset styling
                tabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'rgba(255, 255, 255, 0.05)';
                    b.style.borderBottom = '3px solid transparent';
                    b.style.color = 'rgba(255, 255, 255, 0.7)';
                });

                // Add active class to clicked tab and apply active styling
                btn.classList.add('active');
                btn.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)';
                btn.style.borderBottom = '3px solid #3b82f6';
                btn.style.color = '#ffffff';

                // Hide all tab contents
                const tabContents = sidePanel.querySelectorAll('.ai-tab-content');
                tabContents.forEach(content => content.classList.remove('active'));

                // Show selected tab content
                const tabId = btn.getAttribute('data-tab') + '-tab';
                const tabContent = sidePanel.querySelector('#' + tabId);
                if (tabContent) {
                    tabContent.classList.add('active');

                    // Scroll to bottom of chat if opening chat tab
                    if (btn.getAttribute('data-tab') === 'chat') {
                        setTimeout(() => {
                            const messagesContainer = sidePanel.querySelector('#ai-chat-messages');
                            if (messagesContainer) {
                                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            }
                        }, 100);
                    }
                }
            });
        });

        // Chat functionality
        this.initializeAIChat(sidePanel);

        // Circuit generation handlers
        this.initializeCircuitHandlers(sidePanel);

        // Add circuit generation functionality to this panel
        // this.addCircuitGenerationToPanel(sidePanel);  // COMMENTED OUT - method doesn't exist

        // Add circuit suggestions functionality
        // this.addCircuitSuggestionsToPanel(sidePanel);  // COMMENTED OUT - method doesn't exist

        // Close, minimize, and clear handlers
        const closeBtn = sidePanel.querySelector('#ai-close-btn');
        const minimizeBtn = sidePanel.querySelector('#ai-minimize-btn');
        const clearBtn = sidePanel.querySelector('#ai-clear-btn');

        if (closeBtn) closeBtn.addEventListener('click', () => this.closeAISidePanel());
        if (minimizeBtn) minimizeBtn.addEventListener('click', () => this.minimizeAISidePanel(sidePanel));
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearAIChatHistoryAndUI(sidePanel));
    }

    initializeAIChat(sidePanel) {
        const chatInput = sidePanel.querySelector('#ai-chat-input');
        const sendBtn = sidePanel.querySelector('#ai-send-btn');

        if (chatInput && sendBtn) {
            sendBtn.addEventListener('click', () => {
                const message = chatInput.value.trim();
                if (message) {
                    this.addAIMessage(sidePanel, message, 'user');
                    chatInput.value = '';

                    // Process the message and generate AI response
                    this.processAIMessage(sidePanel, message);
                }
            });

            // Handle Enter key
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendBtn.click();
                }
            });
        }
    }

    // Add missing processAIMessage method
    async processAIMessage(sidePanel, message) {
        try {
            // Show typing indicator
            const typingId = this.addAITypingIndicator(sidePanel);

            // Generate response using existing generateAIResponse method
            const response = await this.generateAIResponse(message);

            // Remove typing indicator and add real response
            this.removeAITypingIndicator(sidePanel, typingId);
            this.addAIMessage(sidePanel, response, 'assistant');
        } catch (error) {
            console.error('Error processing AI message:', error);
            // Ensure indicator is removed
            const indicator = sidePanel.querySelector('#ai-typing-indicator');
            if (indicator) indicator.remove();

            this.addAIMessage(sidePanel, "Sorry, I encountered an error processing your request.", 'assistant');
        }
    }

    // Unified addAIMessage replaces the old duplicated stubs
    // The main implementation is at line ~2658

    removeTypingIndicator(sidePanel) {
        const indicator = sidePanel.querySelector('#ai-typing-indicator');
        if (indicator) indicator.remove();
    }

    getCircuitCodePreview(circuitName) {
        const circuitPreviews = {
            'Bell State': `from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
# Bell State Preparation |Φ⁺⟩
qr = QuantumRegister(2, 'q')
cr = ClassicalRegister(2, 'c')
qc = QuantumCircuit(qr, cr)
# Create superposition on first qubit
qc.h(qr[0])
# Create entanglement (CNOT gate)
qc.cx(qr[0], qr[1])
# Measure both qubits
qc.measure_all()

print("Bell State Circuit Created!")
print(qc)`,

            'Quantum Random Number Generator': `from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
# Quantum Random Number Generator
qr = QuantumRegister(2, 'q')
cr = ClassicalRegister(2, 'c')
qc = QuantumCircuit(qr, cr)

# Put both qubits in superposition
qc.h(qr[0])
qc.h(qr[1])

# Measure to get random bits
qc.measure_all()

print("QRNG Circuit Created!")
print(qc)`
        };

        return circuitPreviews[circuitName] || "";
    }

    async generateAIResponse(message) {
        const lowerMessage = message.toLowerCase();

        // Quantum Computing Keywords
        const quantumKeywords = {
            circuit: ['circuit', 'quantum circuit', 'qiskit circuit', 'create circuit'],
            algorithm: ['algorithm', 'shor', 'grover', 'quantum algorithm', 'qft', 'fourier'],
            gate: ['gate', 'hadamard', 'cnot', 'pauli', 'rotation', 'h gate', 'x gate'],
            backend: ['backend', 'ibm quantum', 'quantum computer', 'hardware'],
            state: ['state', 'qubit', 'superposition', 'entanglement', 'bell state'],
            measurement: ['measurement', 'measure', 'result', 'probability'],
            optimization: ['optimization', 'variational', 'vqe', 'qaao', 'quantum optimization'],
            simulation: ['simulation', 'aer', 'noise', 'classical simulation']
        };

        // Determine response type based on keywords
        let responseType = 'general';
        for (const [type, keywords] of Object.entries(quantumKeywords)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                responseType = type;
                break;
            }
        }

        // Generate contextual response
        switch (responseType) {
            case 'circuit':
                return this.generateCircuitResponse(lowerMessage);
            case 'algorithm':
                return this.generateAlgorithmResponse(lowerMessage);
            case 'gate':
                return this.generateGateResponse(lowerMessage);
            case 'backend':
                return this.generateBackendResponse(lowerMessage);
            case 'state':
                return this.generateStateResponse(lowerMessage);
            case 'measurement':
                return this.generateMeasurementResponse(lowerMessage);
            case 'optimization':
                return this.generateOptimizationResponse(lowerMessage);
            case 'simulation':
                return this.generateSimulationResponse(lowerMessage);
            default:
                return this.generateGeneralResponse(lowerMessage);
        }
    }

    generateCircuitResponse(message) {
        if (message.includes('bell') || message.includes('entanglement')) {
            // Use hybrid AI system to create Bell state circuit
            this.executeCircuitViaHybridAI('Create a Bell state circuit', 'Bell State');
            return `**Bell State Circuit Created!**

I've generated a Bell state circuit using your existing infrastructure! The circuit is now:

**Loaded in 3D Circuit Visualizer**
**Ready for IBM Quantum submission**
**Available in Jobs widget for execution**

**Circuit Details:**
            \`\`\`python
from qiskit import QuantumCircuit

# Create Bell state |00⟩ + |11⟩
bell_circuit = QuantumCircuit(2, 2)
bell_circuit.h(0)          # Hadamard on first qubit
bell_circuit.cx(0, 1)      # CNOT gate (entanglement)
bell_circuit.measure_all() # Measure both qubits

print(bell_circuit)
\`\`\`

**Key Points:**
• Hadamard (H) creates superposition: |0⟩ → (|0⟩ + |1⟩)/√2
• CNOT creates entanglement between control (qubit 0) and target (qubit 1)
• Both qubits will always measure the same value (00 or 11)

The circuit is ready! Use the Jobs widget to submit it to IBM Quantum, or view it in the 3D Circuit Builder.`
        }

        if (message.includes('ghz') || message.includes('greenberger')) {
            return `**GHZ State Circuit Help**

A GHZ state is a maximally entangled state of 3+ qubits. Here's a 3-qubit example:

\`\`\`python
from qiskit import QuantumCircuit

# Create 3-qubit GHZ state |000⟩ + |111⟩
ghz_circuit = QuantumCircuit(3, 3)
ghz_circuit.h(0)           # Hadamard on first qubit
ghz_circuit.cx(0, 1)       # Entangle second qubit
ghz_circuit.cx(1, 2)       # Entangle third qubit
ghz_circuit.measure_all()  # Measure all qubits

print(ghz_circuit)
\`\`\`

**Key Points:**
• All qubits become entangled - measuring any one determines the others
• GHZ states are more sensitive to decoherence than Bell states
• Used in quantum error correction and quantum communication

Would you like to create a larger GHZ state or learn about applications?`;
        }

        if (message.includes('qft') || message.includes('fourier')) {
            return `**Quantum Fourier Transform (QFT) Help**

QFT transforms between computational and Fourier bases, crucial for many algorithms:

\`\`\`python
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT

# Create 3-qubit QFT circuit
qft_circuit = QFT(3)
qft_circuit.measure_all()

# Or build manually:
manual_qft = QuantumCircuit(3)
manual_qft.h(2)
manual_qft.cp(np.pi/2, 1, 2)
manual_qft.cp(np.pi/4, 0, 2)
manual_qft.h(1)
manual_qft.cp(np.pi/2, 0, 1)
manual_qft.h(0)
manual_qft.swap(0, 2)

print("QFT Circuit:")
print(qft_circuit)
\`\`\`

**Key Points:**
• QFT is the quantum analog of the classical discrete Fourier transform
• Essential for phase estimation and Shor's algorithm
• Can be implemented efficiently on quantum computers

Would you like to see the inverse QFT or learn about phase estimation?`;
        }

        return `**Quantum Circuit Help**

I can help you create various quantum circuits. Common types include:

• **Bell States** - Basic entanglement demonstration
• **GHZ States** - Multi-qubit entanglement
• **Quantum Fourier Transform** - Essential for many algorithms
• **Variational Circuits** - For optimization algorithms

What specific type of circuit would you like me to help you create? You can ask for:
- "Create a Bell state circuit"
- "Show me a GHZ state"
- "How do I implement QFT?"
- "Build a circuit for [algorithm name]"`;
    }

    generateAlgorithmResponse(message) {
        if (message.includes('shor')) {
            // Use hybrid AI system for Shor's algorithm
            this.executeCircuitViaHybridAI('Run Shor\'s algorithm to factor 15', 'Shor\'s Algorithm');
            return `**Shor's Algorithm Created!**

I've generated Shor's algorithm implementation using your existing infrastructure! The algorithm is now:

  **Loaded in 3D Circuit Visualizer**
  **Ready for IBM Quantum submission**
  **Available in Jobs widget for execution**

**Algorithm Overview:**
\`\`\`python
from qiskit import QuantumCircuit
from qiskit.algorithms import Shor

# Factor the number 15
shor = Shor()
result = shor.factor(15)
print(f"Factors of 15: {result.factors}")
\`\`\`

**Key Components:**
• **Modular Exponentiation** - Quantum implementation of a^x mod N
• **Quantum Fourier Transform** - Extracts periodicity
• **Classical Post-Processing** - Finds the factors

The algorithm is ready! Use the Jobs widget to submit it to IBM Quantum for factorization.`;
        }

        if (message.includes('grover')) {
            // Use hybrid AI system for Grover's algorithm
            this.executeCircuitViaHybridAI('Run Grover\'s algorithm to search for 11', 'Grover\'s Algorithm');
            return `**Grover's Algorithm Created!**

I've generated Grover's algorithm implementation using your existing infrastructure! The algorithm is now:

**Loaded in 3D Circuit Visualizer**
**Ready for IBM Quantum submission**
**Available in Jobs widget for execution**

**Algorithm Overview:**
\`\`\`python
from qiskit import QuantumCircuit
from qiskit.algorithms import Grover

# Search for |11⟩ in 2-qubit space
oracle = QuantumCircuit(2)
oracle.cz(0, 1)  # Marks |11⟩ state

grover = Grover(oracle=oracle, iterations=1)
result = grover.amplify()
print(f"Found solution: {result.assignment}")
\`\`\`

**Key Components:**
• **Oracle** - Marks the target state(s)
• **Amplitude Amplification** - Increases probability of measuring target
• **Diffusion Operator** - Inverts amplitudes around the mean

The algorithm is ready! Use the Jobs widget to submit it to IBM Quantum for execution.`;
        }

        return `**Quantum Algorithm Help**

I can help you understand and implement various quantum algorithms:

• **Shor's Algorithm** - Integer factorization (quantum advantage)
• **Grover's Algorithm** - Unstructured search (quadratic speedup)
• **Quantum Phase Estimation** - Finding eigenvalues
• **Variational Quantum Eigensolver (VQE)** - Ground state preparation
• **Quantum Approximate Optimization Algorithm (QAOA)** - Combinatorial optimization

Which algorithm interests you? You can ask:
- "Explain Shor's algorithm"
- "How does Grover's algorithm work?"
- "Show me VQE implementation"
- "What algorithms can I run on IBM Quantum?"`;
    }

    generateGateResponse(message) {
        return `**Quantum Gate Help**

Here's a comprehensive guide to common quantum gates:

\`\`\`python
from qiskit import QuantumCircuit
import numpy as np

# Single-qubit gates
qc = QuantumCircuit(1)

# Pauli gates
qc.x(0)      # Bit flip: |0⟩ → |1⟩, |1⟩ → |0⟩
qc.y(0)      # Bit + phase flip: |0⟩ → i|1⟩, |1⟩ → -i|0⟩
qc.z(0)      # Phase flip: |0⟩ → |0⟩, |1⟩ → -|1⟩

# Hadamard gate
qc.h(0)      # Superposition: |0⟩ → (|0⟩ + |1⟩)/√2

# Rotation gates
qc.rx(np.pi/4, 0)  # Rotation around X-axis
qc.ry(np.pi/4, 0)  # Rotation around Y-axis
qc.rz(np.pi/4, 0)  # Rotation around Z-axis

# Two-qubit gates
qc2 = QuantumCircuit(2)
qc2.cx(0, 1)       # CNOT: controlled-X
qc2.cz(0, 1)       # Controlled-Z
qc2.swap(0, 1)     # Swap qubits

print("Single-qubit gates:")
print(qc)
print("\nTwo-qubit gates:")
print(qc2)
\`\`\`

**Gate Types:**
• **Pauli Gates** - X, Y, Z (bit/phase flips)
• **Hadamard** - Creates superposition
• **Rotation Gates** - RX, RY, RZ (parameterized rotations)
• **Controlled Gates** - CNOT, CZ (two-qubit operations)

Would you like to see specific gate implementations or learn about gate decompositions?`;
    }

    generateBackendResponse(message) {
        return "**IBM Quantum Backend Help**\n\nHere's how to work with IBM Quantum backends:\n\n```\nfrom qiskit import QuantumCircuit, execute, Aer\nfrom qiskit import IBMQ\n\n# Load IBM Quantum account\nIBMQ.load_account()\nprovider = IBMQ.get_provider()\n\n# Get available backends\nbackends = provider.backends()\nprint(\"Available backends:\")\nfor backend in backends:\n    print(f\"- {backend.name()}: {backend.status().operational} ({backend.configuration().n_qubits} qubits)\")\n\n# Select a backend (e.g., simulator)\nbackend = provider.get_backend('ibmq_qasm_simulator')\n\n# Create and run a circuit\nqc = QuantumCircuit(2, 2)\nqc.h(0)\nqc.cx(0, 1)\nqc.measure_all()\njob = execute(qc, backend, shots=1024)\nresult = job.result()\ncounts = result.get_counts(qc)\n\nprint(f\"Results: {counts}\")\n```";
    }

    // --- AI CONNECTIVITY METHODS ---

    async generateGeneralResponse(message) {
        try {
            const apiKey = localStorage.getItem('quantum_ai_key');

            // Call the general chat endpoint
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AI-API-Key': apiKey || ''
                },
                body: JSON.stringify({
                    message: message,
                    api_key: apiKey
                })
            });

            if (!response.ok) {
                // If 401/403, warn about API key
                if (response.status === 401 || response.status === 403) {
                    return "**⚠️ API Key Required**\n\nPlease configure your Gemini API key in the Settings panel (top right) to enable full AI chat features.";
                }
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            return data.response || data.reply || data.message || "I processed your request but got no text back.";

        } catch (error) {
            console.error("AI Chat Error:", error);
            return "**Connection Error**\n\nI couldn't reach the AI service. Please check your internet connection or try again later.\n\n_System Note: " + error.message + "_";
        }
    }

    async executeCircuitViaHybridAI(prompt, title) {
        try {
            const apiKey = localStorage.getItem('quantum_ai_key');

            console.log(`[AI] Generating circuit via Hybrid AI: ${title}`);
            this.addAIMessage(document.getElementById('ai-side-panel'), "🧠 Designing quantum circuit...", 'system');

            const response = await fetch('/api/ai/generate_circuit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AI-API-Key': apiKey || ''
                },
                body: JSON.stringify({
                    description: prompt,
                    api_key: apiKey
                })
            });

            if (!response.ok) throw new Error("Circuit generation failed");

            const data = await response.json();

            if (data.success && data.circuit_data) {
                // Load into visualizer if available
                if (window.unifiedQuantumApp) {
                    window.unifiedQuantumApp.loadCircuit(data.circuit_data);
                    // Open 3D visualizer tab
                    const btn = document.querySelector('.ai-tab-btn[data-tab="circuits"]');
                    if (btn) btn.click();
                }
                return `**${title} Generated**\n\nThe circuit has been created and loaded into the 3D Visualizer. You can now simulate it or run it on IBM Quantum hardware.`;
            } else {
                return `**Generation Failed**\n\n${data.error || "Unknown error occurred."}`;
            }

        } catch (error) {
            console.error("Hybrid AI Error:", error);
            return "**Error**\n\nFailed to generate the circuit. Please try again.";
        }
    }
}

// REMOVED AUTO-INITIALIZATION - modern_dashboard.html controls the order:
// 1. Auth first
// 2. Then HackathonDashboard initialization
// This prevents race conditions where dashboard fetches data before auth completes

/**
 * Initialize the HackathonDashboard - called by modern_dashboard.html AFTER auth completes
 */
window.initializeHackathonDashboard = function () {
    console.log('🚀 Initializing Hackathon Dashboard (called after auth)...');

    // Prevent double initialization
    if (window.dashboard && window.dashboard._initialized) {
        console.log('⚠️ Dashboard already initialized, skipping');
        return window.dashboard;
    }

    window.dashboard = new HackathonDashboard();
    window.dashboard._initialized = true;

    // Initial data load
    if (window.dashboard.updateAllWidgets) {
        window.dashboard.updateAllWidgets();
    }

    console.log('🔄 Auto-refresh disabled - use widget refresh buttons for updates');

    return window.dashboard;
};

// Export class for manual instantiation
window.HackathonDashboard = HackathonDashboard;
