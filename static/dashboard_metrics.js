/**
 * DashboardMetrics - Industrial-quality summary cards management
 * 
 * Supports multiple provider modes:
 * - 'ibm' - IBM Quantum jobs only
 * - 'ionq' - IonQ jobs only
 * - 'local' - Local simulator jobs only
 * - 'aws_braket' - AWS Braket jobs
 * - 'azure' - Azure Quantum jobs
 * - 'rigetti' - Rigetti jobs
 * - 'google' - Google Quantum jobs
 * - 'all' / 'unified' - All providers combined
 */
class DashboardMetrics {
    constructor() {
        // Provider configurations
        this.providers = {
            ibm: {
                name: 'IBM Quantum',
                matches: (job) => {
                    const backend = (job.backend_name || job.backend || '').toLowerCase();
                    return job.real_data === true ||
                        backend.includes('ibm') ||
                        backend.includes('fez') ||
                        backend.includes('marrakesh') ||
                        backend.includes('torino') ||
                        (!this._isLocalJob(job) && !this._matchesOtherProvider(job));
                }
            },
            ionq: {
                name: 'IonQ',
                matches: (job) => {
                    const backend = (job.backend_name || job.backend || '').toLowerCase();
                    return backend.includes('ionq') || job.provider === 'ionq';
                }
            },
            local: {
                name: 'Local Simulator',
                matches: (job) => this._isLocalJob(job)
            },
            aws_braket: {
                name: 'AWS Braket',
                matches: (job) => {
                    const backend = (job.backend_name || job.backend || '').toLowerCase();
                    return backend.includes('braket') || backend.includes('aws') || job.provider === 'aws_braket';
                }
            },
            azure: {
                name: 'Azure Quantum',
                matches: (job) => {
                    const backend = (job.backend_name || job.backend || '').toLowerCase();
                    return backend.includes('azure') || job.provider === 'azure';
                }
            },
            rigetti: {
                name: 'Rigetti',
                matches: (job) => {
                    const backend = (job.backend_name || job.backend || '').toLowerCase();
                    return backend.includes('rigetti') || backend.includes('aspen') || job.provider === 'rigetti';
                }
            },
            google: {
                name: 'Google Quantum',
                matches: (job) => {
                    const backend = (job.backend_name || job.backend || '').toLowerCase();
                    return backend.includes('google') || backend.includes('sycamore') || job.provider === 'google';
                }
            },
            quantinuum: {
                name: 'Quantinuum',
                matches: (job) => {
                    const backend = (job.backend_name || job.backend || '').toLowerCase();
                    return backend.includes('quantinuum') || job.provider === 'quantinuum';
                }
            },
            dwave: {
                name: 'D-Wave',
                matches: (job) => {
                    const backend = (job.backend_name || job.backend || '').toLowerCase();
                    return backend.includes('dwave') || backend.includes('d-wave') || job.provider === 'dwave';
                }
            },
            xanadu: {
                name: 'Xanadu',
                matches: (job) => {
                    const backend = (job.backend_name || job.backend || '').toLowerCase();
                    return backend.includes('xanadu') || job.provider === 'xanadu';
                }
            }
        };

        // Current state
        this.data = {
            backends: [],
            jobs: [],
            totalCounts: {},  // Total counts per provider from API
            lastUpdated: null
        };

        // Cache configuration
        this.cache = {
            ttl: 30000,
            pendingRequest: null
        };

        // DOM element IDs
        this.elements = {
            activeBackends: 'active-backends',
            totalJobs: 'total-jobs',
            runningJobs: 'running-jobs',
            successRate: 'success-rate'
        };

        // Expose globally
        window.dashboardMetrics = this;
        console.log('📊 DashboardMetrics initialized (multi-provider support)');
    }

    /**
     * Get current mode from window
     */
    get currentMode() {
        return window.dashboardMode || 'ibm';
    }

    /**
     * Check if mode is unified (show all providers)
     */
    get isUnifiedMode() {
        const mode = this.currentMode;
        return mode === 'all' || mode === 'unified';
    }

    /**
     * Check if job is from a local simulator
     */
    _isLocalJob(job) {
        const backend = (job.backend_name || job.backend || '').toLowerCase();
        return job.local_data === true ||
            backend.includes('local') ||
            backend.includes('simulator') ||
            backend.includes('aer') ||
            backend.includes('qasm_simulator');
    }

    /**
     * Check if job matches any non-IBM provider
     */
    _matchesOtherProvider(job) {
        return this.providers.ionq.matches(job) ||
            this.providers.aws_braket.matches(job) ||
            this.providers.azure.matches(job) ||
            this.providers.rigetti.matches(job) ||
            this.providers.google.matches(job);
    }

    /**
     * Fetch all metrics from API with deduplication
     */
    async fetchAll() {
        // Deduplicate concurrent requests
        if (this.cache.pendingRequest) {
            console.log('🔄 Request in-flight, reusing...');
            return this.cache.pendingRequest;
        }

        this.cache.pendingRequest = this._doFetch();

        try {
            await this.cache.pendingRequest;
        } finally {
            this.cache.pendingRequest = null;
        }
    }

    /**
     * Internal fetch implementation with normalization
     */
    async _doFetch() {
        console.log('📥 Fetching dashboard metrics...');
        const startTime = Date.now();

        try {
            // Get user-configured job limit
            const jobLimit = window.quantumJobLimit || localStorage.getItem('quantumJobLimit') || 'all';

            const [backendsData, jobsData] = await Promise.all([
                this._fetchEndpoint('/api/backends'),
                this._fetchEndpoint(`/api/jobs?limit=${jobLimit}`)
            ]);

            // Process backends
            if (backendsData) {
                this.data.backends = Array.isArray(backendsData)
                    ? backendsData
                    : (backendsData.backends || []);
            }

            // Process jobs through normalizer
            if (jobsData) {
                let rawJobs = [];
                let apiTotalCounts = {};

                // Extract raw jobs and total counts
                if (Array.isArray(jobsData)) {
                    rawJobs = jobsData;
                } else if (typeof jobsData === 'object') {
                    rawJobs = jobsData.jobs || [];
                    // Store total counts from API (if provided)
                    apiTotalCounts = {
                        ibm: jobsData.total_ibm_jobs || 0,
                        ionq: jobsData.total_ionq_jobs || 0,
                        local: jobsData.total_local_jobs || 0,
                        all: jobsData.total_jobs || 0
                    };
                }

                // CRITICAL: Normalize jobs before using them
                if (window.JobNormalizer) {
                    const results = window.JobNormalizer.normalizeJobs(rawJobs);
                    const stats = window.JobNormalizer.getStats(results);

                    // Store displayable jobs (ok + inferred) for migration period
                    // TODO: Switch to getValidJobs() only after backend provides v1 fields
                    const displayable = window.JobNormalizer.getDisplayableJobs(results);
                    this.data.jobs = displayable.map(d => d.job); // Extract job from wrapper

                    // Store total counts (prefer API counts, fallback to normalized count)
                    this.data.totalCounts = {
                        ibm: apiTotalCounts.ibm || this.data.jobs.filter(j => j.provider === 'ibm').length,
                        ionq: apiTotalCounts.ionq || this.data.jobs.filter(j => j.provider === 'ionq').length,
                        local: apiTotalCounts.local || this.data.jobs.filter(j => j.provider === 'local').length,
                        all: apiTotalCounts.all || this.data.jobs.length
                    };

                    // Log normalization stats (for developers only)
                    console.log('📊 Job normalization stats:', stats);

                    // Log warnings for inferred jobs
                    results.filter(r => r.kind === 'inferred').forEach(r => {
                        console.warn(`⚠️ Job ${r.job.job_id} using inferred data:`, r.warnings);
                    });

                    // Log errors for invalid jobs
                    results.filter(r => r.kind === 'invalid').forEach(r => {
                        console.error(`❌ Invalid job rejected:`, r.error);
                    });

                } else {
                    // Fallback if normalizer not loaded
                    console.warn('⚠️ JobNormalizer not available, using raw data');
                    this.data.jobs = rawJobs;
                    this.data.totalCounts = apiTotalCounts;
                }
            }

            this.data.lastUpdated = new Date();

            console.log(`✅ Metrics fetched in ${Date.now() - startTime}ms:`, {
                backends: this.data.backends.length,
                validJobs: this.data.jobs.length,
                totalCounts: this.data.totalCounts
            });

            this.updateDOM();

        } catch (error) {
            console.error('❌ Failed to fetch metrics:', error);
            this.updateDOM();
        }
    }

    /**
     * Fetch endpoint via RemoteDataService for consistent caching
     */
    async _fetchEndpoint(url) {
        try {
            // Use RemoteDataService (aligned with widgets.js)
            if (window.remoteDataService) {
                return await window.remoteDataService.get(url);
            }

            // Fallback for initialization race conditions
            console.warn(`⚠️ RemoteDataService not ready for ${url}, using fetch`);
            const response = await fetch(url, { credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();

        } catch (error) {
            console.error(`❌ Failed to fetch ${url}:`, error.message);
            return null;
        }
    }

    /**
     * Filter jobs by provider
     */
    filterJobsByProvider(provider) {
        if (provider === 'all' || provider === 'unified') {
            return this.data.jobs;
        }

        const config = this.providers[provider];
        if (!config) {
            console.warn(`Unknown provider: ${provider}`);
            return this.data.jobs;
        }

        return this.data.jobs.filter(job => config.matches(job));
    }

    /**
     * Get computed metrics for current or specified mode
     */
    getMetrics(mode = null) {
        const targetMode = mode || this.currentMode;
        const isUnified = targetMode === 'all' || targetMode === 'unified';

        // Filter jobs by mode
        const filteredJobs = isUnified
            ? this.data.jobs
            : this.filterJobsByProvider(targetMode);

        // Active backends
        const activeBackends = this.data.backends.filter(b => this._isActiveBackend(b)).length;

        // Total jobs - use API count if available, else count filtered
        let totalJobs;
        if (isUnified) {
            totalJobs = this.data.totalCounts.all || this.data.jobs.length;
        } else if (this.data.totalCounts[targetMode]) {
            totalJobs = this.data.totalCounts[targetMode];
        } else {
            totalJobs = filteredJobs.length;
        }

        // Running and completed jobs
        const runningJobs = filteredJobs.filter(j => this._isRunningJob(j)).length;
        const completedJobs = filteredJobs.filter(j => this._isCompletedJob(j)).length;
        const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

        return {
            mode: targetMode,
            isUnified,
            activeBackends,
            totalJobs,
            runningJobs,
            completedJobs,
            successRate,
            filteredJobCount: filteredJobs.length,
            lastUpdated: this.data.lastUpdated
        };
    }

    /**
     * Update DOM elements
     */
    updateDOM() {
        const metrics = this.getMetrics();

        this._setElement(this.elements.activeBackends, metrics.activeBackends);
        this._setElement(this.elements.totalJobs, metrics.totalJobs);
        this._setElement(this.elements.runningJobs, metrics.runningJobs);
        this._setElement(this.elements.successRate, `${metrics.successRate}%`);

        console.log('📊 Summary cards updated:', metrics);
    }

    _setElement(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // Status helpers
    _isRunningJob(job) {
        const status = (job.status || '').toLowerCase();
        return ['running', 'pending', 'queued', 'executing', 'in_progress',
            'active', 'submitted', 'waiting', 'processing', 'validating'].includes(status);
    }

    _isCompletedJob(job) {
        const status = (job.status || '').toLowerCase();
        return ['done', 'completed', 'finished', 'success'].includes(status);
    }

    _isActiveBackend(backend) {
        const status = (backend.status || '').toLowerCase();
        return ['active', 'operational', 'online', 'available', 'ready'].includes(status) ||
            backend.operational === true;
    }

    /**
     * Handle mode change - call this when provider changes
     */
    onModeChange(newMode = null) {
        if (newMode) window.dashboardMode = newMode;
        console.log(`🔄 Mode changed to: ${this.currentMode}`);
        this.updateDOM();
    }

    /**
     * Force refresh
     */
    async refresh() {
        console.log('🔃 Force refresh...');
        await this.fetchAll();
    }
}

// Create singleton
const dashboardMetrics = new DashboardMetrics();

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => dashboardMetrics.fetchAll());
} else {
    dashboardMetrics.fetchAll();
}

// Auto-refresh every 30s when visible
setInterval(() => {
    if (document.visibilityState === 'visible') {
        dashboardMetrics.fetchAll();
    }
}, 30000);

// Listen for mode changes
window.addEventListener('dashboardModeChanged', (e) => {
    dashboardMetrics.onModeChange(e.detail?.mode);
});

// Export
window.DashboardMetrics = DashboardMetrics;
window.dashboardMetrics = dashboardMetrics;
