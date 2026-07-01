// Backend Comparison and Queue Management System
// Provides detailed comparison of quantum backends and queue optimization

class BackendComparisonSystem {
    constructor() {
        this.backends = new Map();
        this.queueHistory = new Map();
        this.comparisonData = null;
        this.updateInterval = null;
        
        this.init();
    }

    init() {
        console.log('  Initializing Backend Comparison System...');
        this.injectComparisonStyles();
        this.setupComparisonInterface();
        this.startDataCollection();
        this.createComparisonWidget();
    }

    setupComparisonInterface() {
        // Add comparison button to backends widget (supports multiple dashboard templates)
        const backendsWidget = document.querySelector('.backends-widget .widget-controls')
            || document.querySelector('[data-widget="backends"] .widget-controls');
        if (backendsWidget && !backendsWidget.querySelector('.compare-btn')) {
            const compareBtn = document.createElement('button');
            compareBtn.className = 'widget-btn compare-btn';
            compareBtn.innerHTML = '<i class="fas fa-balance-scale"></i>';
            compareBtn.title = 'Compare Backends';
            compareBtn.addEventListener('click', () => this.showComparisonModal());
            backendsWidget.appendChild(compareBtn);
        }
    }

    injectComparisonStyles() {
        if (document.getElementById('comparison-styles')) return;
        const style = document.createElement('style');
        style.id = 'comparison-styles';
        style.textContent = `
            .comparison-modal{position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:1700;opacity:0;visibility:hidden;transition:all .3s ease}
            .comparison-modal.active{opacity:1;visibility:visible}
            .comparison-modal .modal-content{background:rgba(20,20,30,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:16px;max-width:95vw;max-height:90vh;width:1400px;overflow:auto;box-shadow:0 16px 64px rgba(0,0,0,0.45)}
            .comparison-modal .modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.1);color:#fff}
            .comparison-modal .modal-body{padding:16px;color:#e0e0e0}
            .comparison-controls{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
            .comparison-table-container{overflow-x:auto}
            .comparison-table{width:100%;border-collapse:collapse;min-width:1200px}
            .comparison-table th{background:rgba(0,245,255,0.08);color:#fff;text-align:left;padding:12px 8px;border-bottom:1px solid rgba(255,255,255,0.1);font-size:0.9rem;white-space:nowrap}
            .comparison-table td{padding:10px 8px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.85rem}
            .wait-time-info{display:flex;flex-direction:column;gap:2px}
            .wait-time-label{font-size:0.7rem;color:#9ca3af}
            .wait-excellent{color:#10b981;font-weight:600}
            .wait-good{color:#06b6d4;font-weight:600}
            .wait-moderate{color:#f59e0b;font-weight:600}
            .wait-long{color:#ef4444;font-weight:600}
            .wait-unknown{color:#6b7280}
            .recommendation.excellent{color:#10b981;font-weight:600}
            .recommendation.good{color:#06b6d4;font-weight:600}
            .recommendation.moderate{color:#f59e0b}
            .recommendation.poor{color:#ef4444}
            .close-btn{background:rgba(239,68,68,0.2);border:1px solid #ef4444;color:#ef4444;padding:8px 12px;border-radius:8px;cursor:pointer}
            .refresh-btn{padding:8px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,#00f5ff,#00d4ff);color:#000;cursor:pointer;font-weight:600}
            .refresh-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,245,255,0.3)}
            
            .backend-details-modal{position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:1800;opacity:0;visibility:hidden;transition:all .3s ease}
            .backend-details-modal.active{opacity:1;visibility:visible}
            .backend-details-content{background:rgba(25,25,40,0.98);border:1px solid rgba(255,255,255,0.2);border-radius:16px;max-width:90vw;max-height:90vh;width:1200px;overflow:auto;box-shadow:0 20px 80px rgba(0,0,0,0.6)}
            .backend-details-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.15);background:linear-gradient(135deg,rgba(0,212,255,0.1),rgba(147,51,234,0.1))}
            .backend-details-header h2{margin:0;color:#fff;font-size:1.5rem;font-weight:600}
            .backend-details-body{padding:24px;color:#e0e0e0}
            
            .backend-summary{margin-bottom:24px}
            .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px}
            .summary-grid.secondary{margin-top:16px}
            .summary-item{background:rgba(255,255,255,0.05);padding:16px;border-radius:8px;text-align:center}
            .summary-label{font-size:0.85rem;color:#9ca3af;margin-bottom:8px}
            .summary-value{font-size:1.5rem;font-weight:700;color:#00d4ff}
            .status-badge{padding:4px 12px;border-radius:12px;font-size:0.85rem;font-weight:600}
            .status-badge.online{background:rgba(16,185,129,0.2);color:#10b981}
            .status-badge.offline{background:rgba(239,68,68,0.2);color:#ef4444}
            
            .additional-details{margin-top:16px;padding:16px;background:rgba(0,0,0,0.2);border-radius:8px}
            .detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
            .detail-row:last-child{border-bottom:none}
            .detail-label{color:#9ca3af;font-size:0.9rem}
            .detail-value{color:#fff;font-weight:500}
            
            .calibration-section{margin-top:32px}
            .calibration-section h3{color:#fff;font-size:1.2rem;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}
            .calibration-timestamp{font-size:0.85rem;color:#9ca3af;font-weight:400}
            
            .calibration-tabs{display:flex;gap:8px;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:0}
            .tab-button{background:transparent;border:none;color:#9ca3af;padding:12px 20px;cursor:pointer;font-size:0.95rem;font-weight:500;border-bottom:2px solid transparent;transition:all .2s ease}
            .tab-button:hover{color:#fff;background:rgba(255,255,255,0.05)}
            .tab-button.active{color:#00d4ff;border-bottom-color:#00d4ff}
            
            .calibration-content{min-height:400px}
            .tab-content{display:none;animation:fadeIn .3s ease}
            .tab-content.active{display:block}
            
            @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
            
            .map-view-container,.graph-view-container,.table-view-container{padding:20px;background:rgba(0,0,0,0.2);border-radius:8px}
            .topology-message{text-align:center;padding:20px;background:rgba(0,212,255,0.1);border-radius:8px;margin-bottom:20px}
            .topology-message i{font-size:2rem;color:#00d4ff;margin-bottom:12px}
            .topology-message p{margin:8px 0;color:#e0e0e0}
            
            .coupling-list h4{color:#fff;margin-bottom:12px}
            .coupling-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px}
            .coupling-item{background:rgba(0,212,255,0.1);padding:8px;border-radius:4px;text-align:center;font-size:0.85rem;color:#00d4ff;border:1px solid rgba(0,212,255,0.3)}
            .coupling-more{color:#9ca3af;font-style:italic}
            
            .graph-controls{display:flex;align-items:center;gap:16px;margin-bottom:20px;flex-wrap:wrap}
            .graph-controls label{color:#9ca3af}
            .graph-type-select{background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:8px 16px;border-radius:6px;cursor:pointer}
            .graph-stats{display:flex;gap:16px;margin-left:auto;color:#9ca3af;font-size:0.9rem}
            .graph-chart{margin-top:16px}
            .graph-xlabel{text-align:center;color:#9ca3af;margin-top:8px;font-size:0.85rem}
            
            .table-search{margin-bottom:16px}
            .qubit-search-input{width:100%;padding:12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#fff;font-size:0.95rem}
            .qubit-search-input::placeholder{color:#6b7280}
            
            .calibration-table-wrapper{overflow-x:auto;max-height:500px;overflow-y:auto}
            .calibration-table{width:100%;border-collapse:collapse;min-width:800px}
            .calibration-table thead{position:sticky;top:0;background:rgba(0,212,255,0.1);z-index:10}
            .calibration-table th{color:#fff;text-align:left;padding:12px;border-bottom:2px solid rgba(255,255,255,0.2);font-size:0.9rem;white-space:nowrap}
            .calibration-table td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.85rem;color:#e0e0e0}
            .calibration-table tbody tr:hover{background:rgba(0,212,255,0.05)}
            
            .loading-indicator,.error-message{text-align:center;padding:40px;color:#9ca3af}
            .loading-indicator i{font-size:2rem;margin-bottom:16px;color:#00d4ff}
            .error-message i{font-size:2rem;margin-bottom:16px;color:#ef4444}
        `;
        document.head.appendChild(style);
    }

    createComparisonWidget() {
        // Create comparison modal
        const modal = document.createElement('div');
        modal.id = 'backend-comparison-modal';
        modal.className = 'comparison-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-balance-scale"></i> Backend Comparison</h2>
                    <button class="close-btn" id="close-comparison-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="comparison-controls">
                        <div class="filter-section">
                            <label>Filter by Status:</label>
                            <select id="status-filter">
                                <option value="all">All Backends</option>
                                <option value="online">Online Only</option>
                                <option value="offline">Offline Only</option>
                            </select>
                        </div>
                        <div class="sort-section">
                            <label>Sort by:</label>
                            <select id="sort-option">
                                <option value="queue">Queue Length</option>
                                <option value="wait">Predicted Wait</option>
                                <option value="qubits">Number of Qubits</option>
                                <option value="performance">Score</option>
                            </select>
                        </div>
                        <div class="sort-section">
                            <label>Algorithm:</label>
                            <select id="algo-option">
                                <option value="auto">Auto</option>
                                <option value="balanced">Balanced</option>
                                <option value="fastest_queue">Fastest Queue</option>
                                <option value="low_latency">Low Latency</option>
                                <option value="highest_qubits">Highest Qubits</option>
                            </select>
                        </div>
                        <div class="sort-section">
                            <label>Complexity:</label>
                            <select id="complexity-option">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <button class="refresh-btn" id="refresh-comparison">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    <div class="comparison-table-container">
                        <table class="comparison-table" id="comparison-table">
                            <thead>
                                <tr>
                                <th>Backend</th>
                                <th>Status</th>
                                <th>Qubits</th>
                                <th>Queue</th>
                                <th>Est. Wait Time</th>
                                <th>Exec. Time</th>
                                <th>Success Rate</th>
                                <th>Fidelity</th>
                                <th>Calibration</th>
                                <th>Gate Error</th>
                                <th>Coherence</th>
                                <th>Usage</th>
                                <th>Recommendation</th>
                                <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="comparison-tbody">
                                <!-- Comparison data will be populated here -->
                            </tbody>
                        </table>
                    </div>
                    <div class="comparison-insights">
                        <h3>💡 Insights & Recommendations</h3>
                        <div class="insights-content" id="insights-content">
                            <!-- AI-generated insights will appear here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup event listeners
        this.setupComparisonEventListeners();
    }

    setupComparisonEventListeners() {
        const closeBtn = document.getElementById('close-comparison-modal');
        const refreshBtn = document.getElementById('refresh-comparison');
        const statusFilter = document.getElementById('status-filter');
        const sortOption = document.getElementById('sort-option');
        const algoOption = document.getElementById('algo-option');
        const complexityOption = document.getElementById('complexity-option');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeComparisonModal());
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshComparisonData());
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterAndSortBackends());
        }

        if (sortOption) sortOption.addEventListener('change', () => this.filterAndSortBackends());
        if (algoOption) algoOption.addEventListener('change', () => this.collectBackendData());
        if (complexityOption) complexityOption.addEventListener('change', () => this.collectBackendData());
    }

    startDataCollection() {
        // Only collect data on initial load - no independent polling
        // Data will be refreshed when dashboard auto-refresh timer expires
        this.collectBackendData();
    }

    async collectBackendData() {
        try {
            console.log('  Collecting backend data...');
            const backendData = await this.fetchBackendData();
            
            console.log('  Fetched backend data:', backendData);
            
            if (!backendData || backendData.length === 0) {
                console.warn('  No backend data returned from fetchBackendData');
                this.comparisonData = [];
                this.updateComparisonData();
                return;
            }
            
            backendData.forEach(backend => {
                const backendName = backend.name;
                
                // Store current state
                this.backends.set(backendName, {
                    ...backend,
                    timestamp: Date.now()
                });
                
                // Store queue history
                if (!this.queueHistory.has(backendName)) {
                    this.queueHistory.set(backendName, []);
                }
                
                const history = this.queueHistory.get(backendName);
                history.push({
                    queue: backend.queue,
                    timestamp: Date.now()
                });
                
                // Keep only last 100 entries
                if (history.length > 100) {
                    history.shift();
                }
            });
            
            console.log(`  Stored ${this.backends.size} backends`);
            
            // Update comparison data
            this.updateComparisonData();
            
        } catch (error) {
            console.error('  Failed to collect backend data:', error);
            this.showNotification('Failed to load real backend data', 'error');
        }
    }

    async fetchBackendData() {
        console.log('  Backend Comparison: Fetching comprehensive data from all enhanced IBM Quantum APIs...');

        // Fetch real data from all enhanced backend APIs
        const algo = document.getElementById('algo-option')?.value || 'auto';
        const complexity = document.getElementById('complexity-option')?.value || 'medium';

        // Fetch all enhanced APIs concurrently
        const [
            backendsRes,
            performanceRes,
            realtimeRes,
            calibrationRes,
            historicalRes,
            predsRes,
            recsRes
        ] = await Promise.allSettled([
            fetch('/api/backends'),
            fetch('/api/performance_metrics'),
            fetch('/api/realtime_monitoring'),
            fetch('/api/calibration_data'),
            fetch('/api/historical_data'),
            fetch(`/api/predictions?job_complexity=${encodeURIComponent(complexity)}`),
            fetch(`/api/recommendations?algorithm=${encodeURIComponent(algo)}&top_k=999&job_complexity=${encodeURIComponent(complexity)}`)
        ]);

        console.log('  API Response status:', {
            backends: backendsRes.status,
            performance: performanceRes.status,
            realtime: realtimeRes.status,
            calibration: calibrationRes.status,
            historical: historicalRes.status,
            predictions: predsRes.status,
            recommendations: recsRes.status
        });

        // Process responses with error handling
        let backendsJson = backendsRes.status === 'fulfilled' && backendsRes.value.ok
            ? await backendsRes.value.json()
            : { backends: [] };

        console.log('  Raw Backends JSON:', backendsJson);
        
        // Handle both array and object responses
        if (!Array.isArray(backendsJson)) {
            // Check if response has backends property
            if (backendsJson.backends && Array.isArray(backendsJson.backends)) {
                backendsJson = backendsJson.backends;
            } else {
                console.warn('  Backends response is not an array and has no backends property:', backendsJson);
                backendsJson = [];
            }
        }
        
        console.log('  Processed Backends Array:', backendsJson);

        const performanceJson = performanceRes.status === 'fulfilled' && performanceRes.value.ok
            ? await performanceRes.value.json()
            : {};

        const realtimeJson = realtimeRes.status === 'fulfilled' && realtimeRes.value.ok
            ? await realtimeRes.value.json()
            : {};

        const calibrationJson = calibrationRes.status === 'fulfilled' && calibrationRes.value.ok
            ? await calibrationRes.value.json()
            : {};

        const historicalJson = historicalRes.status === 'fulfilled' && historicalRes.value.ok
            ? await historicalRes.value.json()
            : {};

        const predsJson = predsRes.status === 'fulfilled' && predsRes.value.ok
            ? await predsRes.value.json()
            : { predictions: [] };

        const recsJson = recsRes.status === 'fulfilled' && recsRes.value.ok
            ? await recsRes.value.json()
            : { recommendations: [] };

        // Process enhanced data
        const predictions = Array.isArray(predsJson.predictions) ? predsJson.predictions : [];
        const recommendations = Array.isArray(recsJson.recommendations) ? recsJson.recommendations : [];

        const predByName = new Map(predictions.map(p => [p.name, p]));
        const rankByName = new Map(recommendations.map((r, i) => [r.name, { score: r.score, rank: i + 1, wait: r.predicted_wait_seconds, throughput: r.throughput_jobs_per_hour, explanation: r.explanation, algorithm: r.algorithm }]));

        // Get backend-specific performance data
        const backendPerformance = performanceJson.backend_performance || {};
        const backendCalibrations = calibrationJson.backend_calibrations || {};
        const backendUsage = historicalJson.backend_usage || {};

        // backendsJson is now guaranteed to be an array
        const items = backendsJson.map(b => {
            const name = b.name || 'unknown';
            const pred = predByName.get(name);
            const rinfo = rankByName.get(name) || {};
            const perf = backendPerformance[name] || {};
            const calib = backendCalibrations[name] || {};
            const usage = backendUsage[name] || 0;

            // Calculate enhanced metrics
            const gateErrors = b.gate_errors || {};
            const avgGateError = Object.keys(gateErrors).length > 0
                ? Object.values(gateErrors).reduce((sum, err) => sum + err, 0) / Object.keys(gateErrors).length
                : 0;

            const t1Times = b.t1_times || {};
            const avgT1 = Object.keys(t1Times).length > 0
                ? Object.values(t1Times).reduce((sum, t1) => sum + t1, 0) / Object.keys(t1Times).length
                : 0;

            return {
                name,
                status: b.operational ? 'online' : 'offline',
                qubits: typeof b.num_qubits === 'number' ? b.num_qubits : (b.num_qubits || 0),
                queue: typeof b.pending_jobs === 'number' ? b.pending_jobs : (b.pending_jobs || 0),
                avgWaitTime: typeof (rinfo.wait ?? pred?.predicted_wait_seconds) === 'number' ? (rinfo.wait ?? pred?.predicted_wait_seconds) : 0,
                throughput: typeof (rinfo.throughput ?? pred?.throughput_jobs_per_hour) === 'number' ? (rinfo.throughput ?? pred?.throughput_jobs_per_hour) : 0,
                performanceScore: typeof rinfo.score === 'number' ? Math.round(rinfo.score * 100) : 0,
                recommendationRank: typeof rinfo.rank === 'number' ? rinfo.rank : null,
                explanation: rinfo.explanation || null,
                algorithm: rinfo.algorithm || (document.getElementById('algo-option')?.value || 'auto'),

                // Enhanced metrics from new APIs
                avgExecutionTime: perf.average_execution_time || 0,
                successRate: perf.success_rate ? Math.round(perf.success_rate * 100) : 0,
                avgFidelity: perf.average_fidelity ? Math.round(perf.average_fidelity * 100) : 0,
                calibrationStatus: calib.status || 'unknown',
                calibrationQuality: calib.calibration_quality ? Math.round(calib.calibration_quality * 100) : 0,
                usageCount: usage,
                gateErrorRate: avgGateError,
                coherenceTime: avgT1,
                couplingMapSize: (b.coupling_map || []).length,
                basisGatesCount: (b.basis_gates || []).length,

                lastUpdate: Date.now()
            };
        });

        console.log(`  Backend Comparison: Loaded comprehensive data for ${items.length} backends`);
        return items;
    }

    formatThroughput(value) {
        if (!value) return '—';
        return `${value.toFixed(1)} jobs/h`;
    }

    updateComparisonData() {
        this.comparisonData = Array.from(this.backends.values());
        this.filterAndSortBackends();
        this.generateInsights();
    }

    filterAndSortBackends() {
        const statusFilter = document.getElementById('status-filter')?.value || 'all';
        const sortOption = document.getElementById('sort-option')?.value || 'queue';
        
        let filteredData = [...this.comparisonData];
        
        // Apply status filter
        if (statusFilter !== 'all') {
            filteredData = filteredData.filter(backend => backend.status === statusFilter);
        }
        
        // Apply sorting
        filteredData.sort((a, b) => {
            switch (sortOption) {
                case 'queue':
                    return a.queue - b.queue;
                case 'wait':
                    return (a.avgWaitTime ?? Infinity) - (b.avgWaitTime ?? Infinity);
                case 'qubits':
                    return b.qubits - a.qubits;
                case 'performance':
                    return (b.performanceScore ?? -1) - (a.performanceScore ?? -1);
                default:
                    return 0;
            }
        });
        
        this.displayComparisonTable(filteredData);
    }

    displayComparisonTable(backends) {
        const tbody = document.getElementById('comparison-tbody');
        if (!tbody) return;
        
        console.log(`  Displaying ${backends.length} backends in comparison table`);
        
        tbody.innerHTML = '';
        
        if (!backends || backends.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="13" style="text-align: center; padding: 2rem; color: #ef4444;">
                        <i class="fas fa-exclamation-triangle"></i><br>
                        No backend data available.<br>
                        <small style="color: #9ca3af;">Please check your IBM Quantum connection or try refreshing.</small>
                    </td>
                </tr>
            `;
            return;
        }
        
        backends.forEach(backend => {
            const row = document.createElement('tr');
            row.className = `backend-row ${backend.status}`;
            
            const recommendation = this.getRecommendation(backend);
            const avgWaitTime = this.formatWaitTime(backend.avgWaitTime);
            
            row.innerHTML = `
                <td class="backend-name">
                    <div class="backend-info">
                        <strong class="backend-name-link" data-backend="${backend.name}" style="cursor: pointer; color: #00d4ff; text-decoration: underline; hover-effect: brightness(1.2);">${backend.name}</strong>
                        <span class="backend-type">Hardware</span>
                    </div>
                </td>
                <td class="status-cell">
                    <span class="status-indicator ${backend.status}"></span>
                    <span class="status-text">${backend.status}</span>
                </td>
                <td class="qubits-cell">
                    <span class="qubit-count">${backend.qubits}</span>
                    <span class="qubit-label">qubits</span>
                </td>
                <td class="queue-cell">
                    <div class="queue-info">
                        <span class="queue-count ${this.getQueueClass(backend.queue)}">${backend.queue}</span>
                        <div class="queue-trend">${this.getQueueTrend(backend.name)}</div>
                    </div>
                </td>
                <td class="wait-time-cell">
                    <div class="wait-time-info">
                        <span class="wait-time ${this.getWaitTimeClass(backend.avgWaitTime)}">${this.formatWaitTime(backend.avgWaitTime)}</span>
                        <span class="wait-time-label">${backend.avgWaitTime ? 'predicted' : 'unknown'}</span>
                    </div>
                </td>
                <td class="execution-time-cell">
                    <span class="execution-time">${backend.avgExecutionTime ? backend.avgExecutionTime.toFixed(1) + 's' : '—'}</span>
                </td>
                <td class="success-rate-cell">
                    <div class="success-rate">
                        <span class="rate-value">${backend.successRate || 0}%</span>
                        <div class="rate-bar">
                            <div class="rate-fill" style="width: ${backend.successRate || 0}%"></div>
                        </div>
                    </div>
                </td>
                <td class="fidelity-cell">
                    <div class="fidelity-info">
                        <span class="fidelity-value">${backend.avgFidelity || 0}%</span>
                        <div class="fidelity-bar">
                            <div class="fidelity-fill" style="width: ${backend.avgFidelity || 0}%"></div>
                        </div>
                    </div>
                </td>
                <td class="calibration-cell">
                    <div class="calibration-info">
                        <span class="calibration-status ${backend.calibrationStatus}">${backend.calibrationStatus}</span>
                        <span class="calibration-quality">${backend.calibrationQuality || 0}%</span>
                    </div>
                </td>
                <td class="gate-error-cell">
                    <span class="gate-error">${backend.gateErrorRate ? (backend.gateErrorRate * 100).toFixed(3) + '%' : '—'}</span>
                </td>
                <td class="coherence-cell">
                    <span class="coherence-time">${backend.coherenceTime ? (backend.coherenceTime / 1000).toFixed(1) + 'μs' : '—'}</span>
                </td>
                <td class="usage-cell">
                    <span class="usage-count">${backend.usageCount || 0}</span>
                    <span class="usage-label">jobs</span>
                </td>
                <td class="recommendation-cell">
                    <div class="recommendation-info">
                        <span class="recommendation ${recommendation.type}" title="${backend.explanation || recommendation.text}">
                            <i class="fas fa-${recommendation.icon}"></i>
                            ${recommendation.text}
                        </span>
                        ${backend.recommendationRank ? `<span class="rank-badge" style="font-size:0.7rem;color:#9ca3af">#${backend.recommendationRank}</span>` : ''}
                    </div>
                </td>
                <td class="actions-cell" style="padding: 10px 8px; text-align: center;">
                    <button class="details-btn" data-backend="${backend.name}" 
                        style="background: linear-gradient(135deg, #00f5ff, #00d4ff); color: #000; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s; white-space: nowrap;">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
            
            // Add click listeners
            const backendNameLink = row.querySelector('.backend-name-link');
            if (backendNameLink) {
                backendNameLink.addEventListener('click', () => {
                    this.showBackendDetails(backend.name);
                });
            }
            
            const detailsBtn = row.querySelector('.details-btn');
            if (detailsBtn) {
                detailsBtn.addEventListener('click', () => {
                    this.showBackendDetails(backend.name);
                });
                
                // Add hover effect
                detailsBtn.addEventListener('mouseenter', (e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 245, 255, 0.4)';
                });
                detailsBtn.addEventListener('mouseleave', (e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                });
            }
        });
    }
    
    async showBackendDetails(backendName) {
        console.log(`Fetching details for backend: ${backendName}`);
        
        // Create and show detailed backend modal
        this.createDetailedBackendModal(backendName);
        
        try {
            const response = await fetch(`/api/backend_details/${backendName}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch backend details: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                this.updateDetailedBackendModal(backendName, null, data.error);
            } else {
                this.updateDetailedBackendModal(backendName, data, null);
            }
        } catch (error) {
            console.error(`Error fetching backend details:`, error);
            this.updateDetailedBackendModal(backendName, null, error.message);
        }
    }
    
    createDetailedBackendModal(backendName) {
        // Remove existing modal if any
        const existingModal = document.getElementById('backend-details-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'backend-details-modal';
        modal.className = 'backend-details-modal active';
        modal.innerHTML = `
            <div class="backend-details-content">
                <div class="backend-details-header">
                    <h2>${backendName}</h2>
                    <button class="close-btn" id="close-backend-details">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="backend-details-body">
                    <div class="loading-indicator">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading backend details...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add close listener
        document.getElementById('close-backend-details').addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }
    
    updateDetailedBackendModal(backendName, data, error) {
        const modal = document.getElementById('backend-details-modal');
        if (!modal) return;
        
        const body = modal.querySelector('.backend-details-body');
        
        if (error) {
            body.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading backend details: ${error}</p>
                </div>
            `;
            return;
        }
        
        if (!data) {
            body.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No data available for this backend</p>
                </div>
            `;
            return;
        }
        
        // Display detailed backend information
        body.innerHTML = `
            <div class="backend-summary">
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-label">Qubits</div>
                        <div class="summary-value">${data.num_qubits || 0}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">2Q error (best)</div>
                        <div class="summary-value">${data.two_qubit_error_best ? (data.two_qubit_error_best * 1000).toFixed(2) + 'E-3' : '—'}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">2Q error (layered)</div>
                        <div class="summary-value">${data.two_qubit_error_layered ? (data.two_qubit_error_layered * 1000).toFixed(2) + 'E-3' : '—'}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">CLOPS</div>
                        <div class="summary-value">${data.clops ? (data.clops / 1000).toFixed(0) + 'K' : '—'}</div>
                    </div>
                </div>
                
                <div class="summary-grid secondary">
                    <div class="summary-item">
                        <div class="summary-label">Status</div>
                        <div class="summary-value"><span class="status-badge ${data.status}">${data.status}</span></div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Region</div>
                        <div class="summary-value">${data.region || 'Unknown'}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">QPU version</div>
                        <div class="summary-value">${data.qpu_version || 'Unknown'}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Processor type</div>
                        <div class="summary-value">${data.processor_type || 'Unknown'}</div>
                    </div>
                </div>
                
                <div class="additional-details">
                    <div class="detail-row">
                        <span class="detail-label">Basis gates:</span>
                        <span class="detail-value">${(data.basis_gates || []).join(', ')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Total pending jobs:</span>
                        <span class="detail-value">${data.pending_jobs || 0}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Median T1:</span>
                        <span class="detail-value">${data.median_t1 ? data.median_t1.toFixed(2) + ' μs' : '—'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Median T2:</span>
                        <span class="detail-value">${data.median_t2 ? data.median_t2.toFixed(2) + ' μs' : '—'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Median readout error:</span>
                        <span class="detail-value">${data.median_readout_error ? (data.median_readout_error * 100).toFixed(3) + '%' : '—'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Median readout length:</span>
                        <span class="detail-value">${data.median_readout_length ? data.median_readout_length.toFixed(0) + ' ns' : '—'}</span>
                    </div>
                </div>
            </div>
            
            <div class="calibration-section">
                <h3>Calibration data
                    <span class="calibration-timestamp">Last calibrated: ${this.formatCalibrationTime(data.last_update_date)}</span>
                </h3>
                
                <div class="calibration-tabs">
                    <button class="tab-button active" data-tab="map">Map view</button>
                    <button class="tab-button" data-tab="graph">Graph view</button>
                    <button class="tab-button" data-tab="table">Table view</button>
                </div>
                
                <div class="calibration-content">
                    <div class="tab-content active" id="map-view">
                        ${this.renderMapView(data)}
                    </div>
                    <div class="tab-content" id="graph-view">
                        ${this.renderGraphView(data)}
                    </div>
                    <div class="tab-content" id="table-view">
                        ${this.renderTableView(data)}
                    </div>
                </div>
            </div>
        `;
        
        // Setup tab switching
        const tabButtons = body.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                
                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update active tab content
                const tabContents = body.querySelectorAll('.tab-content');
                tabContents.forEach(content => content.classList.remove('active'));
                body.querySelector(`#${tabName}-view`).classList.add('active');
            });
        });
    }
    
    formatCalibrationTime(timestamp) {
        if (!timestamp) return 'Unknown';
        
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            
            if (diffHours < 1) return 'Less than 1 hour ago';
            if (diffHours === 1) return '1 hour ago';
            if (diffHours < 24) return `${diffHours} hours ago`;
            
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays === 1) return '1 day ago';
            return `${diffDays} days ago`;
        } catch (e) {
            return timestamp;
        }
    }
    
    renderMapView(data) {
        const couplingMap = data.coupling_map || [];
        const numQubits = data.num_qubits || 0;
        
        return `
            <div class="map-view-container">
                <div class="topology-message">
                    <i class="fas fa-info-circle"></i>
                    <p>Coupling topology map with ${numQubits} qubits and ${couplingMap.length} connections</p>
                    <p style="color: #9ca3af; font-size: 0.85rem;">Visual topology map requires advanced rendering (coming soon)</p>
                </div>
                <div class="coupling-list">
                    <h4>Coupling connections:</h4>
                    <div class="coupling-grid">
                        ${couplingMap.slice(0, 50).map(([q1, q2]) => `
                            <span class="coupling-item">${q1} ↔ ${q2}</span>
                        `).join('')}
                        ${couplingMap.length > 50 ? `<span class="coupling-more">... and ${couplingMap.length - 50} more</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderGraphView(data) {
        const qubitProperties = data.qubit_properties || [];
        const readoutErrors = qubitProperties.map(q => q.readout_assignment_error || 0);
        
        const maxError = Math.max(...readoutErrors, 0.1);
        const median = data.median_readout_error || 0;
        
        return `
            <div class="graph-view-container">
                <div class="graph-controls">
                    <label>Graph output:</label>
                    <select class="graph-type-select">
                        <option value="readout">Readout assignment error</option>
                        <option value="t1">T1 times</option>
                        <option value="t2">T2 times</option>
                    </select>
                    <div class="graph-stats">
                        <span>Median ${(median * 100).toFixed(3)}%</span>
                        <span>min ${(Math.min(...readoutErrors) * 100).toFixed(3)}%</span>
                        <span>max ${(Math.max(...readoutErrors) * 100).toFixed(3)}%</span>
                    </div>
                </div>
                <div class="graph-chart">
                    <svg width="100%" height="300" style="background: rgba(20,20,30,0.5); border-radius: 8px;">
                        ${readoutErrors.map((error, i) => {
                            const height = (error / maxError) * 250;
                            const x = (i / readoutErrors.length) * 100;
                            const color = error > median * 1.5 ? '#ef4444' : error > median ? '#f59e0b' : '#00d4ff';
                            return `<rect x="${x}%" y="${300 - height}" width="${100/readoutErrors.length - 0.5}%" height="${height}" fill="${color}"/>`;
                        }).join('')}
                        <line x1="0" y1="${300 - (median / maxError) * 250}" x2="100%" y2="${300 - (median / maxError) * 250}" 
                            stroke="#fff" stroke-width="1" stroke-dasharray="4"/>
                    </svg>
                    <div class="graph-xlabel">Qubit number</div>
                </div>
            </div>
        `;
    }
    
    renderTableView(data) {
        const qubitProperties = data.qubit_properties || [];
        
        return `
            <div class="table-view-container">
                <div class="table-search">
                    <input type="text" placeholder="Search by qubit number" class="qubit-search-input">
                </div>
                <div class="calibration-table-wrapper">
                    <table class="calibration-table">
                        <thead>
                            <tr>
                                <th>Qubit</th>
                                <th>T1 (μs)</th>
                                <th>T2 (μs)</th>
                                <th>Readout assignment error</th>
                                <th>Prob meas0 prep1</th>
                                <th>Prob meas1 prep0</th>
                                <th>Readout length (ns)</th>
                                <th>ID error</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${qubitProperties.map(qubit => `
                                <tr>
                                    <td>${qubit.qubit}</td>
                                    <td>${qubit.T1 ? qubit.T1.toFixed(2) : '—'}</td>
                                    <td>${qubit.T2 ? qubit.T2.toFixed(2) : '—'}</td>
                                    <td>${qubit.readout_assignment_error ? (qubit.readout_assignment_error * 100).toFixed(3) + '%' : '—'}</td>
                                    <td>${qubit.prob_meas0_prep1 ? qubit.prob_meas0_prep1.toFixed(4) : '—'}</td>
                                    <td>${qubit.prob_meas1_prep0 ? qubit.prob_meas1_prep0.toFixed(4) : '—'}</td>
                                    <td>${qubit.readout_length ? qubit.readout_length.toFixed(0) : '—'}</td>
                                    <td>${qubit.id_error ? (qubit.id_error * 100).toFixed(3) + '%' : '—'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    getRecommendation(backend) {
        if (backend.status !== 'online') {
            return { type: 'poor', icon: 'ban', text: 'Unavailable' };
        }
        if (backend.recommendationRank === 1) {
            return { type: 'excellent', icon: 'star', text: 'Best Choice' };
        }
        if (backend.recommendationRank && backend.recommendationRank <= 3) {
            return { type: 'good', icon: 'thumbs-up', text: 'Recommended' };
        }
        if ((backend.avgWaitTime ?? Infinity) <= 300) {
            return { type: 'good', icon: 'thumbs-up', text: 'Low Wait' };
        }
        if (backend.queue <= 5) {
            return { type: 'moderate', icon: 'clock', text: 'Moderate Wait' };
        }
        return { type: 'poor', icon: 'exclamation-triangle', text: 'Long Wait' };
    }

    getQueueClass(queue) {
        if (queue === 0) return 'queue-empty';
        if (queue <= 2) return 'queue-low';
        if (queue <= 5) return 'queue-medium';
        return 'queue-high';
    }

    getQueueTrend(backendName) {
        const history = this.queueHistory.get(backendName);
        if (!history || history.length < 2) return '';
        
        const recent = history.slice(-5);
        const trend = recent[recent.length - 1].queue - recent[0].queue;
        
        if (trend > 0) return '<i class="fas fa-arrow-up trend-up"></i>';
        if (trend < 0) return '<i class="fas fa-arrow-down trend-down"></i>';
        return '<i class="fas fa-minus trend-stable"></i>';
    }

    formatWaitTime(seconds) {
        if (!seconds || seconds === 0) return '—';
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${(seconds / 3600).toFixed(1)}h`;
    }
    
    getWaitTimeClass(seconds) {
        if (!seconds || seconds === 0) return 'wait-unknown';
        if (seconds < 60) return 'wait-excellent';
        if (seconds < 300) return 'wait-good';
        if (seconds < 900) return 'wait-moderate';
        return 'wait-long';
    }

    generateInsights() {
        const insightsContent = document.getElementById('insights-content');
        if (!insightsContent) return;
        
        const insights = this.analyzeBackendData();
        const algo = document.getElementById('algo-option')?.value || 'auto';
        const complexity = document.getElementById('complexity-option')?.value || 'medium';
        insightsContent.innerHTML = insights.map(insight => `
            <div class="insight-item ${insight.type}">
                <i class="fas fa-${insight.icon}"></i>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                </div>
            </div>
        `).join('') + `
            <div class="insight-item info">
                <i class="fas fa-sliders-h"></i>
                <div class="insight-content">
                    <h4>Recommendation Settings</h4>
                    <p>Algorithm: <strong>${algo}</strong>, Complexity: <strong>${complexity}</strong></p>
                </div>
            </div>
        `;
    }

    analyzeBackendData() {
        const insights = [];
        const backends = Array.from(this.backends.values());
        
        // Check if we have any backends
        if (backends.length === 0) {
            console.log('No backends available for analysis');
            return insights;
        }
        
        // Find best performing backend
        const bestBackend = backends.reduce((best, current) => 
            current.performanceScore > best.performanceScore ? current : best
        );
        
        insights.push({
            type: 'success',
            icon: 'trophy',
            title: 'Best Performing Backend',
            description: `${bestBackend.name} has the highest performance score (${bestBackend.performanceScore}) with ${bestBackend.queue} jobs in queue.`
        });
        
        // Find backends with no queue
        const availableBackends = backends.filter(b => b.queue === 0 && b.status === 'online');
        if (availableBackends.length > 0) {
            insights.push({
                type: 'info',
                icon: 'check-circle',
                title: 'Available Backends',
                description: `${availableBackends.length} backend(s) are currently available with no queue: ${availableBackends.map(b => b.name).join(', ')}.`
            });
        }
        
        // Check for high queue backends
        const highQueueBackends = backends.filter(b => b.queue > 5);
        if (highQueueBackends.length > 0) {
            insights.push({
                type: 'warning',
                icon: 'exclamation-triangle',
                title: 'High Queue Alert',
                description: `${highQueueBackends.length} backend(s) have long queues: ${highQueueBackends.map(b => `${b.name} (${b.queue})`).join(', ')}.`
            });
        }
        
        // Performance trend analysis
        const avgPerformance = backends.reduce((sum, b) => sum + b.performanceScore, 0) / backends.length;
        insights.push({
            type: 'info',
            icon: 'chart-line',
            title: 'System Performance',
            description: `Average system performance is ${avgPerformance.toFixed(1)}%. ${avgPerformance > 80 ? 'System is performing well.' : 'Consider optimizing job distribution.'}`
        });
        
        return insights;
    }

    async showComparisonModal() {
        const modal = document.getElementById('backend-comparison-modal');
        if (modal) {
            modal.classList.add('active');
            
            // Show loading state
            const tbody = document.getElementById('comparison-tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding: 2rem; color: #06b6d4;"><i class="fas fa-spinner fa-spin"></i> Loading real backend data from IBM Quantum...</td></tr>';
            }
            
            // Fetch fresh data
            await this.refreshComparisonData();
        }
    }

    closeComparisonModal() {
        const modal = document.getElementById('backend-comparison-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async refreshComparisonData() {
        console.log('  Refreshing backend comparison data...');
        await this.collectBackendData();
        console.log(`  Backend comparison data refreshed. Total backends: ${this.backends.size}`);
        this.showNotification('Backend data refreshed', 'info');
    }

    showNotification(message, type = 'info') {
        if (window.enhancedNotifications) {
            window.enhancedNotifications.showNotification('Backend Comparison', message, type);
        }
    }

    destroy() {
        // No intervals to clear - using centralized refresh control
    }
}

// Initialize backend comparison system
document.addEventListener('DOMContentLoaded', () => {
    window.backendComparison = new BackendComparisonSystem();
    
    // Expose showBackendDetails globally so it can be called from anywhere
    window.showBackendDetails = (backendName) => {
        if (window.backendComparison) {
            window.backendComparison.showBackendDetails(backendName);
        }
    };
    
    console.log('Backend Comparison System initialized with global showBackendDetails');
});