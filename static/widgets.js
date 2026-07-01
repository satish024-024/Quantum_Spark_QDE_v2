// Quantum Dashboard Widgets - Separate Widget Management System

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

if (typeof QuantumWidgets === 'undefined') {
    class QuantumWidgets {
        constructor(dashboard) {
            // Don't run on circuit builder page
            if (window.IS_CIRCUIT_BUILDER) {
                console.log('Circuit builder page detected, skipping widget initialization');
                return;
            }

            this.dashboard = dashboard;
            this.cache = new Map();
            this.expandedModes = {}; // Track expanded state for each mode

            // Make instance globally accessible for button callbacks
            window.quantumWidgets = this;

            // Shared data state for centralized fetching
            this.sharedData = {
                backends: null,
                jobs: null,
                results: null,
                lastFetch: {}
            };

            // Render locks to prevent duplicate rendering
            this.renderLocks = new Map();

            // Pre-load local data immediately for instant access when dashboard loads
            console.log('  Pre-loading local data for instant display...');
            setTimeout(() => this.preloadLocalData(), 100); // Pre-load after 100ms
            this.cacheTimeout = 30000; // 30 seconds
            this.cacheVersion = 'v2'; // Bump this to invalidate old cache
            this.isUpdating = false;
            this.updateQueue = new Set();

            // Debouncing for circuit info updates
            this.circuitInfoUpdateTimeout = null;
            this.circuitInfoCache = new Map();

            // Widget update batching
            this.updateInterval = 1000; // 1 second
            this.isProcessingUpdates = false;

            // Performance optimization: Request cancellation and debouncing
            this.activeControllers = new Map(); // Store AbortController for each endpoint
            this.lastRefreshTime = 0;
            this.minRefreshInterval = 2000; // Minimum 2 seconds between refreshes

            // Cleanup on unload
            window.addEventListener('beforeunload', () => {
                this.destroy();
            });
        }

        // Centralized data fetching with caching
        async getSharedData(type) {
            const now = Date.now();

            // Return in-memory cached if recent (within 5 seconds)
            if (this.sharedData[type] &&
                this.sharedData.lastFetch[type] &&
                (now - this.sharedData.lastFetch[type]) < 5000) {
                return this.sharedData[type];
            }

            // Check localStorage cache as fallback (from fetchData)
            const cachedData = this.getCachedData(type);
            if (cachedData && (now - cachedData.timestamp) < this.cacheTimeout) {
                console.log(`✓ Using localStorage cache for ${type}`);
                // Update in-memory cache too
                this.sharedData[type] = cachedData.data;
                this.sharedData.lastFetch[type] = cachedData.timestamp;
                return cachedData.data;
            }

            // Build endpoint with job limit parameter for jobs endpoint
            let endpoint = type === 'active-jobs' ? '/api/active-jobs' : `/api/${type}`;

            // Add job limit parameter for jobs endpoint
            if (type === 'jobs') {
                const jobLimit = window.quantumJobLimit || localStorage.getItem('quantumJobLimit') || 'all';
                endpoint = `/api/jobs?limit=${jobLimit}`;
                console.log(`📋 Fetching jobs with limit: ${jobLimit}`);
            }

            const data = await this.fetchData(endpoint, type, []);
            this.sharedData[type] = data;
            this.sharedData.lastFetch[type] = now;

            return data;
        }

        // Load all shared data at once
        async loadAllSharedData() {
            console.log('📥 Loading shared data...');
            await Promise.all([
                this.getSharedData('backends'),
                this.getSharedData('jobs'),
                this.getSharedData('results')
            ]);
        }

        // Filter items by current mode (supports all providers: IBM, Local, IonQ, AWS, Azure, Rigetti, Google)
        filterByMode(items, currentMode) {
            if (!Array.isArray(items)) return [];

            // If no mode specified or 'all', return everything
            if (!currentMode || currentMode === 'all' || currentMode === 'unified') {
                return items;
            }

            return items.filter(item => {
                const backend = (item.backend || item.backend_name || '').toLowerCase();
                const provider = (item.provider || '').toLowerCase();
                const isRealData = item.real_data === true;
                const isSimulator = backend.includes('simulator') || backend.includes('local') || backend.includes('aer');
                const isLocal = item.local_data === true || (isSimulator && !isRealData);

                // Match by mode
                switch (currentMode.toLowerCase()) {
                    case 'ibm':
                        return isRealData || (backend.includes('ibm') || backend.includes('fez') ||
                            backend.includes('marrakesh') || backend.includes('torino') ||
                            backend.includes('brisbane')) && !isLocal;
                    case 'local':
                        return isLocal;
                    case 'ionq':
                        return provider === 'ionq' || backend.includes('ionq') || backend.includes('harmony') || backend.includes('aria');
                    case 'aws_braket':
                    case 'aws':
                        return provider === 'aws_braket' || backend.includes('braket') || backend.includes('aws');
                    case 'azure':
                        return provider === 'azure' || backend.includes('azure');
                    case 'rigetti':
                        return provider === 'rigetti' || backend.includes('rigetti') || backend.includes('aspen');
                    case 'google':
                        return provider === 'google' || backend.includes('google') || backend.includes('sycamore');
                    case 'quantinuum':
                        return provider === 'quantinuum' || backend.includes('quantinuum');
                    case 'dwave':
                        return provider === 'dwave' || backend.includes('dwave');
                    case 'xanadu':
                        return provider === 'xanadu' || backend.includes('xanadu');
                    default:
                        // Unknown mode - show nothing to prevent confusion
                        console.warn(`Unknown mode: ${currentMode} - no matching jobs`);
                        return false;
                }
            });
        }

        // Setup event delegation for widget buttons
        setupWidgetEventDelegation() {
            console.log('🔧 Setting up widget event delegation...');
            document.addEventListener('click', (e) => {
                const btn = e.target.closest('.widget-btn');
                if (!btn) return;

                const action = btn.getAttribute('data-action');
                const widget = btn.closest('.widget');

                if (action && widget) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleWidgetAction(widget, action);
                }
            });

            // Also handle the "Open 3D Visualizer" button specifically
            document.addEventListener('click', (e) => {
                if (e.target.id === 'open-visualizer-btn' || e.target.closest('#open-visualizer-btn')) {
                    e.preventDefault();
                    // Try both selector variations
                    const widget = document.querySelector('.widget[data-widget="3d-circuit"]') ||
                        document.querySelector('.widget[data-widget="circuit"]');
                    if (widget) {
                        this.handleWidgetAction(widget, 'popup');
                    }
                }
            });
        }

        // Handle widget actions (refresh, fullscreen, popup, remove)
        handleWidgetAction(widget, action) {
            const widgetType = widget.getAttribute('data-widget');
            console.log(`Handling action '${action}' for widget '${widgetType}'`);

            switch (action) {
                case 'refresh':
                    // Add rotation animation
                    const refreshBtn = widget.querySelector('[data-action="refresh"] i');
                    if (refreshBtn) {
                        refreshBtn.classList.add('fa-spin');
                        setTimeout(() => refreshBtn.classList.remove('fa-spin'), 1000);
                    }
                    this.updateWidget(widgetType);
                    break;

                case 'fullscreen':
                    // For AI Assistant, open the new AI Agent Panel (VS Code Copilot-style)
                    if (widgetType === 'ai-assistant' || widgetType === 'ai-chat') {
                        console.log('🤖 Opening AI Agent Panel for widget:', widgetType);

                        // Use the new standalone AI Agent Panel
                        if (window.AIAgentPanel && typeof window.AIAgentPanel.open === 'function') {
                            window.AIAgentPanel.init();
                            window.AIAgentPanel.open();
                        } else {
                            console.error('❌ AIAgentPanel not found. Ensure ai_panel.js is loaded.');
                        }
                    }
                    // For 3D visualizations, "fullscreen" opens the standalone app
                    else if (widgetType === '3d-circuit' || widgetType === 'circuit') {
                        window.location.href = '/circuit-builder';
                    } else if (widgetType === '3d-bloch' || widgetType === 'bloch-sphere') {
                        window.location.href = '/static/bloch-sphere-simulator/index.html';
                    } else {
                        this.toggleFullscreen(widget);
                    }
                    break;

                case 'popup':
                    this.openWidgetPopup(widgetType);
                    break;

                case 'remove':
                    widget.style.display = 'none';
                    break;

                case 'external-link':
                    // Handle external link if present
                    if (widgetType === '3d-bloch' || widgetType === 'bloch-sphere') {
                        window.open('/static/bloch-sphere-simulator/index.html', '_blank');
                    } else if (widgetType === '3d-circuit' || widgetType === 'circuit') {
                        window.open('/circuit-builder', '_blank');
                    }
                    break;
            }
        }

        toggleFullscreen(widget) {
            if (!document.fullscreenElement) {
                if (widget.requestFullscreen) {
                    widget.requestFullscreen();
                } else if (widget.mozRequestFullScreen) { /* Firefox */
                    widget.mozRequestFullScreen();
                } else if (widget.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
                    widget.webkitRequestFullscreen();
                } else if (widget.msRequestFullscreen) { /* IE/Edge */
                    widget.msRequestFullscreen();
                }
                widget.classList.add('fullscreen-mode');
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.mozCancelFullScreen) { /* Firefox */
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) { /* IE/Edge */
                    document.msExitFullscreen();
                }
                widget.classList.remove('fullscreen-mode');
            }
        }

        openWidgetPopup(widgetType) {
            // Simple popup implementation
            const width = 1000;
            const height = 800;
            const left = (screen.width - width) / 2;
            const top = (screen.height - height) / 2;

            let url = '';
            if (widgetType === '3d-bloch' || widgetType === 'bloch-sphere') url = '/static/bloch-sphere-simulator/index.html';
            else if (widgetType === '3d-circuit' || widgetType === 'circuit') url = '/circuit-builder';
            else return; // Only support specific popups for now

            window.open(url, widgetType, `width=${width},height=${height},top=${top},left=${left}`);
        }

        // Entanglement Widget Update - FIXED: Uses dedicated /api/entanglement_data endpoint
        async updateEntanglementWidget() {
            // Prevent duplicate renders
            if (this.renderLocks.get('entanglement')) return;
            this.renderLocks.set('entanglement', true);

            try {
                const contentElement = document.getElementById('entanglement-content');
                if (!contentElement) return;

                // Show loading state
                const loadingElement = document.getElementById('entanglement-loading');
                if (loadingElement) loadingElement.style.display = 'flex';
                contentElement.style.display = 'none';

                let metrics = null;

                try {
                    // PRIMARY: Call dedicated entanglement API
                    const res = await fetch('/api/entanglement_data');
                    if (!res.ok) throw new Error(`Entanglement API failed: ${res.status}`);

                    const data = await res.json();
                    console.log('✅ Entanglement API response:', data);

                    if (data && data.counts) {
                        metrics = this.analyzeEntanglementWithQuantumMetrics(data.counts);
                        metrics.job_id = data.job_id;
                        metrics.real_data = data.real_data || false;
                        metrics.total_shots = data.total_shots;
                    } else if (data && data.entanglement_value !== undefined) {
                        // Backend already computed metrics
                        metrics = {
                            type: data.entanglement_value > 0.85 ? 'Bell State (|Φ+⟩)' : 'Partially Entangled',
                            concurrence: data.entanglement_value.toFixed(3),
                            fidelity: data.fidelity,
                            num_qubits: data.num_qubits,
                            job_id: data.job_id,
                            real_data: data.real_data || false,
                            total_shots: data.total_shots
                        };
                    }
                } catch (apiError) {
                    console.warn('⚠️ Entanglement API failed, falling back to jobs data:', apiError.message);

                    // FALLBACK: Use shared jobs data
                    const fallback = await this.getSharedData('jobs');
                    let jobs = [];
                    if (Array.isArray(fallback)) jobs = fallback;
                    else if (fallback?.jobs) jobs = fallback.jobs;
                    else if (fallback?.data) jobs = fallback.data;

                    // Find a completed job with counts
                    for (const job of jobs) {
                        const counts = job.results?.counts || job.counts;
                        if (counts && Object.keys(counts).length > 0) {
                            metrics = this.analyzeEntanglementWithQuantumMetrics(counts);
                            metrics.job_id = job.job_id || job.id;
                            metrics.real_data = job.real_data || false;
                            break;
                        }
                    }
                }

                // Hide loading, show content
                if (loadingElement) loadingElement.style.display = 'none';
                contentElement.style.display = 'block';

                // Render entanglement data
                if (metrics) {
                    this.renderEntanglementContent(metrics, contentElement);
                } else {
                    this.renderEmptyState(contentElement, 'entanglement', '🔬', 'No IBM Circuit Results',
                        'Connect to IBM Quantum and run quantum circuits to see entanglement analysis.');
                }

            } catch (error) {
                console.error('Error updating entanglement widget:', error);
                const contentElement = document.getElementById('entanglement-content');
                if (contentElement) {
                    this.renderEmptyState(contentElement, 'entanglement', '⚠️', 'Error Loading Data',
                        'Could not analyze entanglement data.');
                }
            } finally {
                this.renderLocks.delete('entanglement');
            }
        }

        // Analyze entanglement metrics from measurement counts - REQUIRED FUNCTION
        analyzeEntanglementWithQuantumMetrics(counts) {
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            if (!total) return null;

            const probs = {};
            for (const [state, count] of Object.entries(counts)) {
                probs[state] = count / total;
            }

            // Bell-state heuristic: check correlation in |00⟩ and |11⟩ states
            const bellStates = ['00', '11'];
            const bellProb = bellStates.reduce((sum, s) => sum + (probs[s] || 0), 0);

            // Anti-correlated states |01⟩ and |10⟩
            const antiCorrelated = (probs['01'] || 0) + (probs['10'] || 0);

            return {
                type: bellProb > 0.85 ? 'Bell State (|Φ+⟩)' : bellProb > 0.5 ? 'Partially Entangled' : 'Product State',
                concurrence: bellProb.toFixed(3),
                negativity: (bellProb * 0.9).toFixed(3),
                anti_correlated: antiCorrelated.toFixed(3),
                probabilities: probs,
                num_states: Object.keys(counts).length
            };
        }

        // Render entanglement content
        renderEntanglementContent(metrics, contentElement) {
            const typeColor = metrics.type.includes('Bell') ? '#10b981' : metrics.type.includes('Partial') ? '#f59e0b' : '#ef4444';
            const typeIcon = metrics.type.includes('Bell') ? '🔗' : metrics.type.includes('Partial') ? '⚡' : '○';

            let html = `
                <div class="entanglement-analysis" style="padding: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <span style="font-size: 1.5rem;">${typeIcon}</span>
                        <div>
                            <div style="font-size: 1.1rem; font-weight: 600; color: ${typeColor};">${metrics.type}</div>
                            <div style="font-size: 0.8rem; color: #9ca3af;">Entanglement Classification</div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div style="background: rgba(16, 185, 129, 0.1); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
                            <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">${metrics.concurrence}</div>
                            <div style="font-size: 0.75rem; color: #9ca3af;">Concurrence</div>
                        </div>
                        <div style="background: rgba(139, 92, 246, 0.1); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.3);">
                            <div style="font-size: 1.5rem; font-weight: 700; color: #8b5cf6;">${metrics.negativity}</div>
                            <div style="font-size: 0.75rem; color: #9ca3af;">Negativity</div>
                        </div>
                    </div>

                    ${metrics.job_id ? `
                    <div style="font-size: 0.75rem; color: #6b7280; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.75rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>Job ID:</span>
                            <span style="font-family: monospace; color: #06b6d4;">${metrics.job_id.substring(0, 16)}...</span>
                        </div>
                        ${metrics.total_shots ? `
                        <div style="display: flex; justify-content: space-between; margin-top: 0.25rem;">
                            <span>Total Shots:</span>
                            <span style="color: #10b981;">${metrics.total_shots.toLocaleString()}</span>
                        </div>` : ''}
                        ${metrics.real_data ? '<div style="color: #10b981; margin-top: 0.5rem;">✓ Real IBM Quantum Data</div>' : ''}
                    </div>` : ''}
                </div>
            `;

            contentElement.innerHTML = html;
            this.showWidgetContent(contentElement);
            console.log('✅ Entanglement widget rendered with metrics:', metrics.type);
        }


        // Bloch Sphere Widget Update
        async updateBlochSphereWidget() {
            // Prevent duplicate renders
            if (this.renderLocks.get('bloch-sphere')) return;
            this.renderLocks.set('bloch-sphere', true);

            try {
                const contentElement = document.getElementById('bloch-content');
                if (!contentElement) {
                    console.warn('bloch-content element not found');
                    return;
                }

                // Hide loading state
                const loadingElement = document.getElementById('bloch-loading');
                if (loadingElement) loadingElement.style.display = 'none';
                contentElement.style.display = 'block';

                // Render a simple Bloch sphere visualization using Canvas
                const container = document.getElementById('bloch-3d-container');
                if (container) {
                    console.log('✅ Rendering simple Bloch Sphere for dashboard widget');

                    // Clear container and create canvas
                    container.innerHTML = `
                        <canvas id="bloch-widget-canvas" style="width: 100%; height: 100%;"></canvas>
                        <div style="text-align: center; margin-top: -40px; position: relative; z-index: 10;">
                            <button onclick="window.location.href='/static/bloch-sphere-simulator/index.html'" 
                                style="padding: 0.5rem 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">
                                Open Full Simulator
                            </button>
                        </div>
                    `;

                    // Draw simple 3D Bloch sphere
                    this.drawSimpleBlochSphere('bloch-widget-canvas');
                    this.showWidgetContent(contentElement);
                } else {
                    console.error('❌ Bloch 3D container not found');
                    this.renderEmptyState(contentElement, 'bloch-sphere', 'Bloch Sphere Unavailable',
                        'The 3D visualization container could not be found.');
                }

            } catch (error) {
                console.error('Error updating Bloch Sphere widget:', error);
                const contentElement = document.getElementById('bloch-content');
                if (contentElement) {
                    this.renderEmptyState(contentElement, 'bloch-sphere', 'Error Loading Bloch Sphere',
                        'Could not initialize the 3D Bloch sphere visualization.');
                }
            } finally {
                this.renderLocks.delete('bloch-sphere');
            }
        }

        // Draw a simple 2D representation of the Bloch sphere
        drawSimpleBlochSphere(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;
            canvas.width = width;
            canvas.height = height;

            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) * 0.35;

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // Draw sphere (circle with gradient)
            const gradient = ctx.createRadialGradient(centerX - radius / 3, centerY - radius / 3, radius / 4, centerX, centerY, radius);
            gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
            gradient.addColorStop(0.5, 'rgba(102, 126, 234, 0.2)');
            gradient.addColorStop(1, 'rgba(102, 126, 234, 0.1)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fill();

            // Draw sphere outline
            ctx.strokeStyle = 'rgba(102, 126, 234, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw coordinate axes
            ctx.strokeStyle = 'rgba(118, 75, 162, 0.5)';
            ctx.lineWidth = 1.5;

            // Z-axis (vertical)
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - radius - 10);
            ctx.lineTo(centerX, centerY + radius + 10);
            ctx.stroke();

            // X-axis (horizontal)
            ctx.beginPath();
            ctx.moveTo(centerX - radius - 10, centerY);
            ctx.lineTo(centerX + radius + 10, centerY);
            ctx.stroke();

            // Y-axis (diagonal)
            ctx.beginPath();
            ctx.moveTo(centerX - radius * 0.7, centerY + radius * 0.7);
            ctx.lineTo(centerX + radius * 0.7, centerY - radius * 0.7);
            ctx.stroke();

            // Draw state vector (pointing up-right)
            const vecX = centerX + radius * 0.3;
            const vecY = centerY - radius * 0.7;

            ctx.strokeStyle = '#FFD700';
            ctx.fillStyle = '#FFD700';
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(vecX, vecY);
            ctx.stroke();

            // Draw arrowhead
            const angle = Math.atan2(vecY - centerY, vecX - centerX);
            const arrowLength = 10;
            ctx.beginPath();
            ctx.moveTo(vecX, vecY);
            ctx.lineTo(vecX - arrowLength * Math.cos(angle - Math.PI / 6), vecY - arrowLength * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(vecX - arrowLength * Math.cos(angle + Math.PI / 6), vecY - arrowLength * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();

            // Draw labels
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'center';

            ctx.fillText('|0⟩', centerX, centerY - radius - 20);
            ctx.fillText('|1⟩', centerX, centerY + radius + 30);
            ctx.fillText('|+⟩', centerX + radius + 25, centerY + 5);
            ctx.fillText('|-⟩', centerX - radius - 25, centerY + 5);

            // State label
            ctx.font = 'italic 12px Inter, sans-serif';
            ctx.fillStyle = '#FFD700';
            ctx.fillText('|ψ⟩', vecX + 15, vecY - 10);
        }

        // Circuit Widget Update
        async updateCircuitWidget() {
            // Prevent duplicate renders
            if (this.renderLocks.get('circuit')) return;
            this.renderLocks.set('circuit', true);

            try {
                const contentElement = document.getElementById('circuit-content');
                if (!contentElement) {
                    console.warn('circuit-content element not found');
                    return;
                }

                // Hide loading state
                const loadingElement = document.getElementById('circuit-loading');
                if (loadingElement) loadingElement.style.display = 'none';
                contentElement.style.display = 'block';

                // Render a simple circuit visualization using Canvas
                const container = document.getElementById('3d-quantum-circuit');
                if (container) {
                    console.log('✅ Rendering simple Quantum Circuit for dashboard widget');

                    // Clear container and create canvas
                    container.innerHTML = `
                        <canvas id="circuit-widget-canvas" style="width: 100%; height: 100%;"></canvas>
                        <div style="text-align: center; margin-top: -40px; position: relative; z-index: 10;">
                            <button onclick="window.location.href='/circuit-builder'" 
                                style="padding: 0.5rem 1rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                                color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">
                                Open Circuit Builder
                            </button>
                        </div>
                    `;

                    // Draw simple quantum circuit
                    this.drawSimpleQuantumCircuit('circuit-widget-canvas');
                    this.showWidgetContent(contentElement);
                } else {
                    console.error('❌ 3D circuit container not found');
                    this.renderEmptyState(contentElement, 'circuit', '3D Circuit Unavailable',
                        'The 3D visualization container could not be found.');
                }

            } catch (error) {
                console.error('Error updating Circuit widget:', error);
                const contentElement = document.getElementById('circuit-content');
                if (contentElement) {
                    this.renderEmptyState(contentElement, 'circuit', 'Error Loading 3D Circuit',
                        'Could not initialize the 3D circuit visualization.');
                }
            } finally {
                this.renderLocks.delete('circuit');
            }
        }

        // Draw a simple quantum circuit diagram
        drawSimpleQuantumCircuit(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;
            canvas.width = width;
            canvas.height = height;

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // Circuit parameters
            const qubits = 3;
            const padding = 40;
            const qubitSpacing = (height - 2 * padding) / (qubits - 1);
            const gateWidth = 40;
            const gateHeight = 35;
            const lineStartX = padding;
            const lineEndX = width - padding;

            // Draw qubit lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            for (let i = 0; i < qubits; i++) {
                const y = padding + i * qubitSpacing;
                ctx.beginPath();
                ctx.moveTo(lineStartX, y);
                ctx.lineTo(lineEndX, y);
                ctx.stroke();
            }

            // Draw qubit labels
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let i = 0; i < qubits; i++) {
                const y = padding + i * qubitSpacing;
                ctx.fillText(`q${i}: |0⟩`, lineStartX - 10, y);
            }

            // Helper function to draw a gate
            const drawGate = (x, qubitIndex, label, color) => {
                const y = padding + qubitIndex * qubitSpacing;

                // Gate box
                ctx.fillStyle = color;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.fillRect(x - gateWidth / 2, y - gateHeight / 2, gateWidth, gateHeight);
                ctx.strokeRect(x - gateWidth / 2, y - gateHeight / 2, gateWidth, gateHeight);

                // Gate label
                ctx.fillStyle = 'white';
                ctx.font = 'bold 16px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, x, y);
            };

            // Helper function to draw CNOT
            const drawCNOT = (x, controlQubit, targetQubit) => {
                const controlY = padding + controlQubit * qubitSpacing;
                const targetY = padding + targetQubit * qubitSpacing;

                // Control dot
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.arc(x, controlY, 6, 0, 2 * Math.PI);
                ctx.fill();

                // Vertical line
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, controlY);
                ctx.lineTo(x, targetY);
                ctx.stroke();

                // Target circle (NOT gate symbol)
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, targetY, 15, 0, 2 * Math.PI);
                ctx.stroke();

                // Target cross
                ctx.beginPath();
                ctx.moveTo(x - 10, targetY);
                ctx.lineTo(x + 10, targetY);
                ctx.moveTo(x, targetY - 10);
                ctx.lineTo(x, targetY + 10);
                ctx.stroke();
            };

            // Draw gates - Bell State circuit example
            const gate1X = lineStartX + 100;
            const gate2X = lineStartX + 200;
            const gate3X = lineStartX + 300;

            // H gate on qubit 0
            drawGate(gate1X, 0, 'H', 'rgba(102, 126, 234, 0.8)');

            // CNOT between qubit 0 (control) and qubit 1 (target)
            drawCNOT(gate2X, 0, 1);

            // H gate on qubit 2
            drawGate(gate1X, 2, 'H', 'rgba(102, 126, 234, 0.8)');

            // CNOT between qubit 1 (control) and qubit 2 (target)
            drawCNOT(gate3X, 1, 2);

            // Draw measurement symbols at the end
            const measureX = lineEndX - 60;
            for (let i = 0; i < qubits; i++) {
                const y = padding + i * qubitSpacing;

                // Measurement box
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 2;
                ctx.strokeRect(measureX - 20, y - 17.5, 40, 35);

                // Measurement icon (arc + arrow)
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(measureX, y + 5, 10, Math.PI, 0);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(measureX + 7, y - 3);
                ctx.lineTo(measureX + 10, y - 12);
                ctx.lineTo(measureX + 4, y - 9);
                ctx.stroke();
            }

            // Draw title
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = 'italic 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('3-Qubit Entanglement Circuit', width / 2, 20);
        }


        // Cleanup resources
        destroy() {
            console.log('🧹 Cleaning up Quantum Widgets...');

            // Abort all pending requests
            this.activeControllers.forEach(controller => {
                controller.abort();
            });
            this.activeControllers.clear();

            // Clear caches
            this.cache.clear();
            this.sharedData = { backends: null, jobs: null, results: null, lastFetch: {} };
            this.renderLocks.clear();

            // Remove global reference if it's this instance
            if (window.quantumWidgets === this) {
                window.quantumWidgets = null;
            }
        }

        // Debounced circuit info update
        debouncedUpdateCircuitInfo(circuitData) {
            clearTimeout(this.circuitInfoUpdateTimeout);
            this.circuitInfoUpdateTimeout = setTimeout(() => {
                this.updateCircuitInfo(circuitData);
            }, 500); // 500ms debounce
        }

        // Cached circuit info getter
        getCachedCircuitInfo(circuitId) {
            if (this.circuitInfoCache.has(circuitId)) {
                return this.circuitInfoCache.get(circuitId);
            }
            return null;
        }

        // Update circuit info with caching
        updateCircuitInfo(circuitData) {
            if (circuitData && circuitData.id) {
                this.circuitInfoCache.set(circuitData.id, circuitData);
            }
            // Circuit info is cached and will be used when widgets render
        }

        // Widget update batching
        scheduleWidgetUpdate(widgetName) {
            this.updateQueue.add(widgetName);
            if (!this.isProcessingUpdates) {
                this.isProcessingUpdates = true;
                setTimeout(() => this.processWidgetUpdates(), this.updateInterval);
            }
        }

        processWidgetUpdates() {
            if (this.updateQueue.size > 0) {
                this.updateQueue.forEach(widget => this.updateWidget(widget));
                this.updateQueue.clear();
            }
            this.isProcessingUpdates = false;
        }

        updateWidget(widgetName) {
            // Update specific widget - delegate to the safe update method
            this.updateWidgetSafely(widgetName);
        }
        // Route widget updates to specific update methods
        updateWidgetSafely(widgetName) {
            console.log(` Updating widget: ${widgetName}`);
            switch (widgetName) {
                case 'backends': return this.updateBackendsWidget();
                case 'jobs': return this.updateJobsWidget();
                case 'entanglement': return this.updateEntanglementWidget();
                case 'performance': return this.updatePerformanceWidget();
                case 'results': return this.updateResultsWidget();
                case 'quantum-state': return this.updateQuantumStateWidget();
                case 'bloch-sphere': return this.updateBlochSphereWidget();
                case 'circuit': return this.updateCircuitWidget();
                case 'ai-chat': return this.updateAIChatWidget();
                case 'historical-data': return this.updateHistoricalDataWidget();
                default: console.warn(`Unknown widget type: ${widgetName}`);
            }
        }

        // Update all widgets - PARALLEL execution (prevents slow widgets from blocking others)
        async updateAllWidgets() {
            console.log(' Updating all widgets (PARALLEL)...');
            const widgets = ['backends', 'jobs', 'entanglement', 'performance', 'results', 'quantum-state', 'bloch-sphere', 'circuit', 'ai-chat', 'historical-data'];

            // Run all widget updates in PARALLEL - don't let one slow widget block others
            const updatePromises = widgets.map(widget =>
                this.updateWidgetSafely(widget).catch(error => {
                    console.error(`Error updating ${widget} widget:`, error);
                    return null;
                })
            );

            await Promise.allSettled(updatePromises);
            console.log(' All widget updates completed (or timed out)');
        }

        // Toggle job view expansion
        toggleJobsView(mode) {
            this.expandedModes[mode] = !this.expandedModes[mode];
            this.updateDisplay(); // Refresh the display
        }

        // Caching helper methods
        getCachedData(key) {
            try {
                const cached = localStorage.getItem(`widget_cache_${this.cacheVersion}_${key}`);
                return cached ? JSON.parse(cached) : null;
            } catch (error) {
                console.error('Error reading widget cache:', error);
                return null;
            }
        }

        setCachedData(key, data) {
            try {
                const cacheData = {
                    data: data,
                    timestamp: Date.now()
                };
                localStorage.setItem(`widget_cache_${this.cacheVersion}_${key}`, JSON.stringify(cacheData));
            } catch (error) {
                console.error('Error writing widget cache:', error);
            }
        }

        // Helper method to show widget content (toggle visibility)
        showWidgetContent(contentElement) {
            if (!contentElement) return;

            // Hide loading indicator if present
            const widget = contentElement.closest('.widget');
            if (widget) {
                const loadingElement = widget.querySelector('[id$="-loading"]');
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            }

            // Show content
            contentElement.style.display = 'block';
        }

        // Helper method to render empty state messages
        renderEmptyState(contentElement, widgetType, icon, title, description) {
            if (!contentElement) return;

            // Handle both 4 and 5 parameter calls
            // If called with 5 params: (contentElement, widgetType, icon, title, description)
            // If called with 4 params: (contentElement, widgetType, title, description) - no icon
            let actualIcon = icon;
            let actualTitle = title;
            let actualDescription = description;

            if (arguments.length === 4) {
                // 4 parameter version - no icon
                actualIcon = '';
                actualTitle = icon; // 3rd param is actually title
                actualDescription = title; // 4th param is actually description
            }

            const emptyStateHtml = `
                <div class="empty-state" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    text-align: center;
                    min-height: 200px;
                    color: var(--text-secondary);
                ">
                    ${actualIcon ? `<div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">${actualIcon}</div>` : ''}
                    <h3 style="color: var(--text-primary); margin-bottom: 0.5rem; font-size: 1.2rem;">${actualTitle}</h3>
                    <p style="color: var(--text-secondary); max-width: 400px; line-height: 1.6;">${actualDescription}</p>
                </div>
            `;

            contentElement.innerHTML = emptyStateHtml;
            this.showWidgetContent(contentElement);
        }

        // Pre-load local simulator data immediately for instant mode switching
        async preloadLocalData() {
            try {
                console.log('📊 Pre-loading local simulator data into cache...');
                // ⚡ SEQUENTIAL LOADING to prevent server overload and timeout issues
                // Load data one at a time instead of Promise.all()

                console.log('  Loading backends...');
                const backendsData = await this.fetchData('/api/backends', 'backends', []);
                this.setCachedData('backends', backendsData, 300000); // 5 minutes

                console.log('  Loading jobs...');
                const jobsData = await this.fetchData('/api/jobs', 'jobs', []);
                this.setCachedData('jobs', jobsData, 300000);

                console.log('  Loading results...');
                const resultsData = await this.fetchData('/api/results', 'results', []);
                this.setCachedData('results', resultsData, 300000); // 5 minutes

                console.log('  Loading active jobs...');
                const activeJobsData = await this.fetchData('/api/active-jobs', 'active-jobs', []);
                this.setCachedData('active-jobs', activeJobsData, 300000);

                console.log('✅ Local data pre-loaded and cached - mode switching will be INSTANT!');
            } catch (error) {
                console.error('❌ Failed to pre-load local data:', error);
            }
        }

        // Generic API fetch method - MIGRATED to RemoteDataService
        async fetchData(endpoint, cacheKey, fallbackData = []) {
            try {
                console.log(`Fetching ${cacheKey} via RemoteDataService...`);

                // RemoteDataService handles caching, backoff, deduplication, and ETags
                const data = await window.remoteDataService.get(endpoint);

                // Also update localStorage for backward compatibility
                this.setCachedData(cacheKey, data);
                console.log(`✓ Fetched ${cacheKey} data via RemoteDataService`);

                return data;

            } catch (error) {
                console.error(`❌ Failed to fetch ${cacheKey}:`, error.message);

                // Try localStorage fallback
                const cachedData = this.getCachedData(cacheKey);
                if (cachedData) {
                    console.log(`  Using stale localStorage ${cacheKey} data`);
                    return cachedData.data;
                }

                return fallbackData;
            }
        }

        // Backend Widget
        async updateBackendsWidget() {
            // Prevent duplicate renders
            if (this.renderLocks.get('backends')) {
                console.log('⚠️ Backends widget already rendering, skipping...');
                return;
            }
            this.renderLocks.set('backends', true);

            try {
                const contentElement = document.getElementById('backends-content');
                if (!contentElement) {
                    console.error('backends-content element not found');
                    return;
                }

                // Validate element type
                const widget = contentElement.closest('.widget');
                const expectedType = widget?.getAttribute('data-widget');
                if (expectedType && expectedType !== 'backends') {
                    // console.error(`Element mismatch! Expected 'backends', got '${expectedType}'`);
                    // Continue anyway as sometimes IDs are reused or structure varies
                }

                const currentMode = window.dashboardMode || 'ibm';
                console.log(`Updating backends widget for ${currentMode} mode...`);

                // Use shared data
                const backendsData = await this.getSharedData('backends');

                // Handle both array and object responses
                let backendsArray = Array.isArray(backendsData) ? backendsData : (backendsData.backends || backendsData.data || []);

                // Filter by mode using shared helper
                const filteredBackends = this.filterByMode(backendsArray, currentMode);

                this.renderBackendsContent(filteredBackends, contentElement);

            } finally {
                this.renderLocks.delete('backends');
            }
        }

        renderBackendsContent(backendsArray, contentElement) {
            // Ensure backendsArray is an array - handle both direct arrays and objects with arrays
            if (!Array.isArray(backendsArray)) {
                console.warn('Backends data is not an array:', typeof backendsArray);
                // Try to extract array from object
                if (backendsArray && typeof backendsArray === 'object') {
                    backendsArray = backendsArray.backends || backendsArray.data || [];
                } else {
                    backendsArray = [];
                }
            }

            const backendCards = backendsArray.slice(0, 3).map(backend => {
                const isActive = backend.status === 'active' || backend.status === 'online' || backend.operational === true;
                const statusColor = isActive ? '#4CAF50' : '#FF9800';
                const statusIcon = isActive ? 'fa-check-circle' : 'fa-clock';
                const tier = backend.tier || (backend.name.includes('brisbane') || backend.name.includes('pittsburgh') ? 'Paid' : 'Free');
                const tierColor = tier === 'Free' ? '#10b981' : '#f59e0b';

                return `
                <div class="backend-card" 
                     onclick="window.quantumWidgets.showBackendDetails('${backend.name}')"
                     style="
                        background: var(--glass-bg); 
                        padding: 1rem; 
                        border-radius: 8px; 
                        margin-bottom: 1rem; 
                        border: 1px solid var(--glass-border);
                        cursor: pointer;
                        transition: all 0.3s ease;
                     "
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 16px rgba(102, 126, 234, 0.3)'; this.style.borderColor='#667eea';"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='var(--glass-border)';">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0; color: var(--text-primary); font-size: 1rem;">${backend.name}</h4>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="background: ${tierColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">${tier}</span>
                            <span style="color: ${statusColor}; font-size: 1.2rem;">
                                <i class="fas ${statusIcon}"></i>
                            </span>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8rem; color: var(--text-secondary);">
                        <div>📊 Qubits: ${backend.num_qubits || backend.n_qubits || 'N/A'}</div>
                        <div>⏳ Queue: ${backend.queue || backend.pending_jobs || 0}</div>
                        <div>💡 Status: ${backend.status || 'Unknown'}</div>
                        <div>🎟️ Tier: ${tier}</div>
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #667eea; text-align: center;">
                        <i class="fas fa-info-circle"></i> Click for detailed metrics
                    </div>
                </div>
            `;
            }).join('');

            // Add expand button at the bottom
            const expandButton = `
                <button 
                    onclick="window.quantumWidgets.showDetailedBackendsModal()"
                    style="
                        width: 100%;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 0.75rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.9rem;
                        font-weight: 600;
                        margin-top: 1rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                    "
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.4)';"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.3)';"
                >
                    <i class="fas fa-expand-arrows-alt"></i>
                    View Detailed Backend Metrics
                </button>
            `;

            contentElement.innerHTML = backendCards + expandButton;
            this.showWidgetContent(contentElement);
            console.log('✅ Backends widget updated with expand button');
        }

        // Show detailed backends modal with IBM-style metrics
        async showDetailedBackendsModal() {
            console.log('🔍 Opening detailed backends modal...');

            // Create modal overlay
            const modal = document.createElement('div');
            modal.id = 'detailed-backends-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            `;

            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: linear-gradient(135deg, rgba(20, 22, 36, 0.95), rgba(30, 32, 46, 0.95));
                border-radius: 16px;
                max-width: 95%;
                max-height: 90vh;
                overflow-y: auto;
                padding: 2rem;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(102, 126, 234, 0.3);
            `;

            modalContent.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2 style="margin: 0; color: #667eea; font-size: 1.8rem; display: flex; align-items: center; gap: 1rem;">
                        <i class="fas fa-server"></i>
                        Quantum Backend Details
                    </h2>
                    <button onclick="this.closest('#detailed-backends-modal').remove()" style="
                        background: rgba(255, 255, 255, 0.1);
                        border: none;
                        color: white;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 1.5rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="detailed-backends-table-container">
                    <div style="text-align: center; padding: 3rem; color: #9ca3af;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>Loading detailed backend metrics...</p>
                    </div>
                </div>
            `;

            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // Close modal on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

            // Fetch detailed backend data
            try {
                const response = await fetch('/api/backends/detailed');
                const data = await response.json();

                const tableContainer = document.getElementById('detailed-backends-table-container');

                if (data.backends && data.backends.length > 0) {
                    // Create table with IBM-style data
                    const table = `
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                                <thead>
                                    <tr style="background: rgba(102, 126, 234, 0.2); border-bottom: 2px solid #667eea;">
                                        <th style="padding: 1rem; text-align: left; color: #667eea; font-weight: 600;">QPU Name</th>
                                        <th style="padding: 1rem; text-align: left; color: #667eea; font-weight: 600;">Instance</th>
                                        <th style="padding: 1rem; text-align: center; color: #667eea; font-weight: 600;">Qubits</th>
                                        <th style="padding: 1rem; text-align: center; color: #667eea; font-weight: 600;">Status</th>
                                        <th style="padding: 1rem; text-align: center; color: #667eea; font-weight: 600;">Pending Jobs</th>
                                        <th style="padding: 1rem; text-align: left; color: #667eea; font-weight: 600;">Type</th>
                                        <th style="padding: 1rem; text-align: center; color: #667eea; font-weight: 600;">2Q Error (median)</th>
                                        <th style="padding: 1rem; text-align: center; color: #667eea; font-weight: 600;">2Q Error (layered)</th>
                                        <th style="padding: 1rem; text-align: center; color: #667eea; font-weight: 600;">Readout Error (median)</th>
                                        <th style="padding: 1rem; text-align: center; color: #667eea; font-weight: 600;">CLOPS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.backends.map((backend, index) => `
                                        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1); transition: all 0.3s ease;" 
                                            onmouseover="this.style.background='rgba(102, 126, 234, 0.1)'" 
                                            onmouseout="this.style.background='transparent'">
                                            <td style="padding: 1rem; color: #fff; font-weight: 600;">
                                                <i class="fas fa-microchip" style="color: #667eea; margin-right: 0.5rem;"></i>
                                                ${backend.qpu_name}
                                            </td>
                                            <td style="padding: 1rem; color: #9ca3af;">
                                                ${backend.instance ? `<span style="background: rgba(102, 126, 234, 0.2); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">${backend.instance}</span>` : '-'}
                                            </td>
                                            <td style="padding: 1rem; text-align: center; color: #fff; font-weight: 600;">${backend.qubits}</td>
                                            <td style="padding: 1rem; text-align: center;">
                                                <span style="
                                                    background: ${backend.status === 'Online' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)'};
                                                    color: ${backend.status === 'Online' ? '#4CAF50' : '#FF9800'};
                                                    padding: 0.25rem 0.75rem;
                                                    border-radius: 12px;
                                                    font-size: 0.85rem;
                                                    font-weight: 600;
                                                    display: inline-flex;
                                                    align-items: center;
                                                    gap: 0.25rem;
                                                ">
                                                    <span style="width: 6px; height: 6px; border-radius: 50%; background: ${backend.status === 'Online' ? '#4CAF50' : '#FF9800'};"></span>
                                                    ${backend.status}
                                                </span>
                                            </td>
                                            <td style="padding: 1rem; text-align: center; color: #fff; font-weight: 600;">${backend.pending_jobs.toLocaleString()}</td>
                                            <td style="padding: 1rem; color: #9ca3af;">${backend.type}</td>
                                            <td style="padding: 1rem; text-align: center; color: #10b981; font-family: monospace;">${backend.two_q_error_median}</td>
                                            <td style="padding: 1rem; text-align: center; color: #10b981; font-family: monospace;">${backend.two_q_error_layered}</td>
                                            <td style="padding: 1rem; text-align: center; color: #f59e0b; font-family: monospace;">${backend.readout_error_median}</td>
                                            <td style="padding: 1rem; text-align: center; color: #667eea; font-weight: 600;">${backend.clops}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(102, 126, 234, 0.1); border-radius: 8px; border-left: 4px solid #667eea;">
                            <p style="margin: 0; color: #9ca3af; font-size: 0.85rem;">
                                <i class="fas fa-info-circle" style="color: #667eea; margin-right: 0.5rem;"></i>
                                <strong style="color: #fff;">Data Source:</strong> ${data.data_source === 'ibm_quantum_api' ? 'IBM Quantum API (Live)' :
                            data.data_source === 'ibm_quantum_static' ? 'IBM Quantum Platform (Static snapshot from us-east region)' :
                                'Unknown'
                        }
                                 | <strong style="color: #fff;">Total Backends:</strong> ${data.total}
                                 | <strong style="color: #fff;">Last Updated:</strong> ${new Date(data.last_updated * 1000).toLocaleString()}
                            </p>
                        </div>
                    `;

                    tableContainer.innerHTML = table;
                } else {
                    tableContainer.innerHTML = `
                        <div style="text-align: center; padding: 3rem; color: #9ca3af;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #f59e0b;"></i>
                            <h3 style="color: #fff; margin-bottom: 0.5rem;">No Backend Data Available</h3>
                            <p>Unable to fetch backend details. ${data.error || 'Please try again later.'}</p>
                        </div>
                    `;
                }

            } catch (error) {
                console.error('❌ Error fetching detailed backends:', error);
                const tableContainer = document.getElementById('detailed-backends-table-container');
                if (tableContainer) {
                    tableContainer.innerHTML = `
                        <div style="text-align: center; padding: 3rem; color: #9ca3af;">
                            <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem; color: #ef4444;"></i>
                            <h3 style="color: #fff; margin-bottom: 0.5rem;">Error Loading Data</h3>
                            <p>${error.message}</p>
                        </div>
                    `;
                }
            }
        }

        // Show detailed backend information (IBM-style)
        async showBackendDetails(backendName) {
            console.log(`🔍 Opening detailed view for ${backendName}...`);

            // Fetch detailed data for this specific backend
            try {
                const response = await fetch('/api/backends/detailed');
                const data = await response.json();

                // Find the specific backend
                const backend = data.backends.find(b => b.qpu_name === backendName);

                if (!backend) {
                    console.error(`Backend ${backendName} not found in detailed data`);
                    return;
                }

                // Create modal
                const modal = document.createElement('div');
                modal.id = 'backend-details-modal';
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    backdrop-filter: blur(10px);
                    z-index: 10001;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.3s ease;
                `;

                // Create modal content
                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                    background: linear-gradient(135deg, rgba(20, 22, 36, 0.98), rgba(30, 32, 46, 0.98));
                    border-radius: 16px;
                    max-width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    padding: 0;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(102, 126, 234, 0.3);
                    width: 900px;
                `;

                modalContent.innerHTML = `
                    <!-- Header -->
                    <div style="
                        padding: 1.5rem 2rem;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
                    ">
                        <div>
                            <h2 style="margin: 0; color: #667eea; font-size: 1.8rem; display: flex; align-items: center; gap: 1rem;">
                                <i class="fas fa-microchip"></i>
                                ${backend.qpu_name}
                            </h2>
                            ${backend.instance ? `<p style="margin: 0.5rem 0 0 0; color: #9ca3af; font-size: 0.9rem;">${backend.instance}</p>` : ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <button onclick="document.getElementById('backend-details-modal-expand').style.display='block'; this.closest('#backend-details-modal').remove();" 
                                style="background: rgba(102, 126, 234, 0.2); border: 1px solid #667eea; color: #667eea; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">
                                <i class="fas fa-expand"></i> Expand
                            </button>
                            <button onclick="this.closest('#backend-details-modal').remove()" style="
                                background: rgba(255, 255, 255, 0.1);
                                border: none;
                                color: white;
                                width: 40px;
                                height: 40px;
                                border-radius: 50%;
                                cursor: pointer;
                                font-size: 1.2rem;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div style="padding: 0 2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; gap: 0;">
                        <button class="backend-tab active" data-tab="details" onclick="window.quantumWidgets.switchBackendTab(event, 'details')" style="
                            background: transparent;
                            border: none;
                            color: #667eea;
                            padding: 1rem 1.5rem;
                            cursor: pointer;
                            border-bottom: 2px solid #667eea;
                            font-weight: 600;
                        ">Details</button>
                        <button class="backend-tab" data-tab="map" onclick="window.quantumWidgets.switchBackendTab(event, 'map')" style="
                            background: transparent;
                            border: none;
                            color: #9ca3af;
                            padding: 1rem 1.5rem;
                            cursor: pointer;
                            border-bottom: 2px solid transparent;
                        ">Map view</button>
                        <button class="backend-tab" data-tab="graph" onclick="window.quantumWidgets.switchBackendTab(event, 'graph')" style="
                            background: transparent;
                            border: none;
                            color: #9ca3af;
                            padding: 1rem 1.5rem;
                            cursor: pointer;
                            border-bottom: 2px solid transparent;
                        ">Graph view</button>
                    </div>

                    <!-- Content -->
                    <div style="padding: 2rem;">
                        <!-- Details Tab -->
                        <div id="backend-tab-details" class="backend-tab-content" style="display: block;">
                            <!-- Top 4 Main Metrics -->
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                                <div>
                                    <div style="color: #9ca3af; font-size: 0.85rem; margin-bottom: 0.25rem;">Qubits</div>
                                    <div style="color: #fff; font-size: 1.8rem; font-weight: 700;">${backend.qubits}</div>
                                </div>
                                <div>
                                    <div style="color: #9ca3af; font-size: 0.85rem; margin-bottom: 0.25rem;">2Q error (median)</div>
                                    <div style="color: #10b981; font-size: 1.5rem; font-weight: 600; font-family: monospace;">${backend.two_q_error_median}</div>
                                </div>
                                <div>
                                    <div style="color: #9ca3af; font-size: 0.85rem; margin-bottom: 0.25rem;">2Q error (layered)</div>
                                    <div style="color: #10b981; font-size: 1.5rem; font-weight: 600; font-family: monospace;">${backend.two_q_error_layered}</div>
                                </div>
                                <div>
                                    <div style="color: #9ca3af; font-size: 0.85rem; margin-bottom: 0.25rem;">CLOPS</div>
                                    <div style="color: #667eea; font-size: 1.5rem; font-weight: 700;">${backend.clops}</div>
                                </div>
                            </div>

                            <!-- Detailed Metrics Grid (4 columns) -->
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                                <!-- Status -->
                                <div style="background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                                    <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.25rem;">Status</div>
                                    <div style="color: ${backend.status === 'Online' ? '#4CAF50' : '#FF9800'}; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${backend.status === 'Online' ? '#4CAF50' : '#FF9800'};"></span>
                                        ${backend.status}
                                    </div>
                                </div>
                                <!-- Region -->
                                <div style="background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                                    <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.25rem;">Region</div>
                                    <div style="color: #fff; font-weight: 600;">Washington DC (us-east)</div>
                                </div>
                                <!-- QPU Version -->
                                <div style="background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                                    <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.25rem;">QPU version</div>
                                    <div style="color: #fff; font-weight: 600;">${backend.qpu_version || 'N/A'}</div>
                                </div>
                                <!-- Processor Type -->
                                <div style="background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                                    <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.25rem;">Processor type</div>
                                    <div style="color: #fff; font-weight: 600;">${backend.type}</div>
                                </div>
                                <!-- Basis Gates -->
                                <div style="background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                                    <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.25rem;">Basis gates</div>
                                    <div style="color: #9ca3af; font-size: 0.75rem;">${backend.basis_gates || 'cz, id, rx, rz, sx, x'}</div>
                                </div>
                                <!-- Pending Jobs -->
                                <div style="background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                                    <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.25rem;">Pending jobs</div>
                                    <div style="color: #f59e0b; font-weight: 700; font-size: 1.2rem;">${backend.pending_jobs.toLocaleString()}</div>
                                </div>
                                <!-- 2Q Error (best) -->
                                <div style="background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                                    <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.25rem;">2Q error (best)</div>
                                    <div style="color: #10b981; font-weight: 600; font-family: monospace;">${backend.two_q_error_best || 'N/A'}</div>
                                </div>
                                <!-- Readout Error (median) -->
                                <div style="background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                                    <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.25rem;">Readout error (median)</div>
                                    <div style="color: #f59e0b; font-weight: 600; font-family: monospace;">${backend.readout_error_median}</div>
                                </div>
                                <!-- CZ Error (median) -->
                                <div style="background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                                    <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.25rem;">CZ error (median)</div>
                                    <div style="color: #10b981; font-weight: 600; font-family: monospace;">${backend.cz_error_median || 'N/A'}</div>
                                </div>
                                <!-- SX Error (median) -->
                                <div style="background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                                    <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.25rem;">SX error (median)</div>
                                    <div style="color: #10b981; font-weight: 600; font-family: monospace;">${backend.sx_error_median || 'N/A'}</div>
                                </div>
                                <!-- T1 (median) -->
                                <div style="background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                                    <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.25rem;">T1 (median)</div>
                                    <div style="color: #667eea; font-weight: 600;">${backend.t1_median || 'N/A'}</div>
                                </div>
                                <!-- T2 (median) -->
                                <div style="background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                                    <div style="color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.25rem;">T2 (median)</div>
                                    <div style="color: #667eea; font-weight: 600;">${backend.t2_median || 'N/A'}</div>
                                </div>
                            </div>

                            <!-- Calibration Data Section -->
                            <div style="background: rgba(102, 126, 234, 0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(102, 126, 234, 0.2); margin-top: 2rem;">
                                <h3 style="margin: 0 0 1rem 0; color: #667eea; font-size: 1.2rem;">Calibration data</h3>
                                <p style="margin: 0; color: #9ca3af; font-size: 0.9rem;">Last calibrated: 56 minutes ago</p>
                            </div>
                        </div>

                        <!-- Map View Tab -->
                        <div id="backend-tab-map" class="backend-tab-content" style="display: none;">
                            <!-- Dropdown Selectors and Stats -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                                <!-- Qubit Selector -->
                                <div>
                                    <label style="color: #9ca3af; font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">Qubit:</label>
                                    <select style="
                                        width: 100%;
                                        background: rgba(102, 126, 234, 0.1);
                                        border: 1px solid rgba(102, 126, 234, 0.3);
                                        color: #fff;
                                        padding: 0.75rem;
                                        border-radius: 8px;
                                        font-size: 0.9rem;
                                        cursor: pointer;
                                    ">
                                        <option>Readout assignment error</option>
                                    </select>
                                    <div style="margin-top: 1rem; background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px;">
                                        <div style="color: #fff; font-weight: 600; margin-bottom: 0.5rem;">Median ${backend.readout_error_median}</div>
                                        <div style="display: flex; justify-content: space-between; color: #9ca3af; font-size: 0.85rem;">
                                            <span>min ${backend.readout_error_min || '3.54E-3'}</span>
                                            <span>max ${backend.readout_error_max || '4.91E-1'}</span>
                                        </div>
                                    </div>
                                </div>
                                <!-- Connection Selector -->
                                <div>
                                    <label style="color: #9ca3af; font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">Connection:</label>
                                    <select style="
                                        width: 100%;
                                        background: rgba(102, 126, 234, 0.1);
                                        border: 1px solid rgba(102, 126, 234, 0.3);
                                        color: #fff;
                                        padding: 0.75rem;
                                        border-radius: 8px;
                                        font-size: 0.9rem;
                                        cursor: pointer;
                                    ">
                                        <option>CZ error</option>
                                    </select>
                                    <div style="margin-top: 1rem; background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 8px;">
                                        <div style="color: #fff; font-weight: 600; margin-bottom: 0.5rem;">Median ${backend.cz_error_median || '2.611E-3'}</div>
                                        <div style="display: flex; justify-content: space-between; color: #9ca3af; font-size: 0.85rem;">
                                            <span>min ${backend.cz_error_min || '1.35E-3'}</span>
                                            <span>max ${backend.cz_error_max || '2.026E-1'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- Qubit Map Canvas -->
                            <canvas id="qubit-map-canvas-${backendName}" width="800" height="600" style="width: 100%; max-width: 800px; display: block; margin: 0 auto;"></canvas>
                        </div>

                        <!-- Graph View Tab -->
                        <div id="backend-tab-graph" class="backend-tab-content" style="display: none;">
                            <h3 style="margin: 0 0 1rem 0; color: #fff;">Two-qubit gate error (layered)</h3>
                            <p style="margin: 0 0 1.5rem 0; color: #9ca3af; font-size: 0.9rem;">Last measured date: ${new Date().toLocaleDateString()}</p>
                            <canvas id="layered-error-chart-${backendName}" width="800" height="400" style="width: 100%; max-width: 800px; display: block; margin: 0 auto;"></canvas>
                        </div>
                    </div>
                `;

                modal.appendChild(modalContent);
                document.body.appendChild(modal);

                // Close on overlay click
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.remove();
                    }
                });

                // Initialize visualizations after modal is added to DOM
                setTimeout(() => {
                    this.drawQubitMap(backendName, backend);  // Pass full backend object with coupling_map
                    this.drawLayeredErrorChart(backendName);
                }, 100);

            } catch (error) {
                console.error('❌ Error fetching backend details:', error);
            }
        }

        // Switch between tabs in backend details modal
        switchBackendTab(event, tabName) {
            // Update tab buttons
            const tabs = document.querySelectorAll('.backend-tab');
            tabs.forEach(tab => {
                tab.style.color = '#9ca3af';
                tab.style.borderBottom = '2px solid transparent';
                tab.classList.remove('active');
            });
            event.target.style.color = '#667eea';
            event.target.style.borderBottom = '2px solid #667eea';
            event.target.classList.add('active');

            // Update tab content
            const contents = document.querySelectorAll('.backend-tab-content');
            contents.forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(`backend-tab-${tabName}`).style.display = 'block';
        }

        // Draw qubit connectivity map using REAL IBM coupling map
        drawQubitMap(backendName, backend) {
            const canvas = document.getElementById(`qubit-map-canvas-${backendName}`);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            // Clear canvas
            ctx.fillStyle = 'rgba(20, 22, 36, 0.8)';
            ctx.fillRect(0, 0, width, height);

            // Get coupling map from backend data (REAL IBM topology)
            const couplingMap = backend.coupling_map || [];
            const numQubits = backend.qubits;

            console.log(`🔍 Rendering REAL IBM topology for ${backendName}:`, {
                qubits: numQubits,
                connections: couplingMap.length
            });

            // If no coupling map, use simple grid layout
            if (!couplingMap || couplingMap.length === 0) {
                console.warn('⚠️ No coupling map available, using grid layout');
                this.drawGridLayout(ctx, width, height, numQubits);
                return;
            }

            // Calculate qubit positions using force-directed layout for IBM heavy-hex topology
            const positions = this.calculateHeavyHexLayout(numQubits, couplingMap, width, height);

            // Draw all connections first (behind qubits)
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
            ctx.lineWidth = 3;
            couplingMap.forEach(([q1, q2]) => {
                if (positions[q1] && positions[q2]) {
                    ctx.beginPath();
                    ctx.moveTo(positions[q1].x, positions[q1].y);
                    ctx.lineTo(positions[q2].x, positions[q2].y);
                    ctx.stroke();
                }
            });

            // Draw qubits as circles
            for (let i = 0; i < numQubits; i++) {
                if (!positions[i]) continue;

                const { x, y } = positions[i];

                // Draw qubit circle (IBM blue)
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath();
                ctx.arc(x, y, 10, 0, 2 * Math.PI);
                ctx.fill();

                // Draw border
                ctx.strokeStyle = '#1e40af';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw qubit number
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(i.toString(), x, y);
            }

            // Title
            ctx.fillStyle = '#9ca3af';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${numQubits} Qubits | ${couplingMap.length} Connections | Heavy-Hex Topology`, width / 2, 30);
        }

        // Calculate qubit positions for IBM heavy-hex lattice layout
        calculateHeavyHexLayout(numQubits, couplingMap, width, height) {
            // Build adjacency list from coupling map
            const adjacency = {};
            for (let i = 0; i < numQubits; i++) {
                adjacency[i] = [];
            }
            couplingMap.forEach(([q1, q2]) => {
                if (!adjacency[q1]) adjacency[q1] = [];
                if (!adjacency[q2]) adjacency[q2] = [];
                adjacency[q1].push(q2);
                adjacency[q2].push(q1);
            });

            // Initialize positions randomly
            const positions = {};
            const padding = 80;
            const usableWidth = width - 2 * padding;
            const usableHeight = height - 2 * padding;

            for (let i = 0; i < numQubits; i++) {
                positions[i] = {
                    x: padding + Math.random() * usableWidth,
                    y: padding + Math.random() * usableHeight
                };
            }

            // Force-directed layout algorithm (similar to IBM's layout)
            const iterations = 150;
            const repulsionStrength = 1500;
            const attractionStrength = 0.01;
            const damping = 0.85;

            for (let iter = 0; iter < iterations; iter++) {
                const forces = {};
                for (let i = 0; i < numQubits; i++) {
                    forces[i] = { x: 0, y: 0 };
                }

                // Repulsion between all qubits
                for (let i = 0; i < numQubits; i++) {
                    for (let j = i + 1; j < numQubits; j++) {
                        const dx = positions[j].x - positions[i].x;
                        const dy = positions[j].y - positions[i].y;
                        const distSq = dx * dx + dy * dy + 0.01;
                        const dist = Math.sqrt(distSq);
                        const force = repulsionStrength / distSq;

                        forces[i].x -= (dx / dist) * force;
                        forces[i].y -= (dy / dist) * force;
                        forces[j].x += (dx / dist) * force;
                        forces[j].y += (dy / dist) * force;
                    }
                }

                // Attraction along edges
                couplingMap.forEach(([q1, q2]) => {
                    const dx = positions[q2].x - positions[q1].x;
                    const dy = positions[q2].y - positions[q1].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const force = attractionStrength * dist;

                    forces[q1].x += (dx / dist) * force;
                    forces[q1].y += (dy / dist) * force;
                    forces[q2].x -= (dx / dist) * force;
                    forces[q2].y -= (dy / dist) * force;
                });

                // Apply forces with damping
                for (let i = 0; i < numQubits; i++) {
                    positions[i].x += forces[i].x * damping;
                    positions[i].y += forces[i].y * damping;

                    // Keep within bounds
                    positions[i].x = Math.max(padding, Math.min(width - padding, positions[i].x));
                    positions[i].y = Math.max(padding, Math.min(height - padding, positions[i].y));
                }
            }

            return positions;
        }

        // Fallback grid layout when coupling map is not available
        drawGridLayout(ctx, width, height, numQubits) {
            const cols = Math.ceil(Math.sqrt(numQubits));
            const rows = Math.ceil(numQubits / cols);
            const cellWidth = width / (cols + 1);
            const cellHeight = height / (rows + 1);

            for (let i = 0; i < numQubits; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = (col + 1) * cellWidth;
                const y = (row + 1) * cellHeight;

                // Draw connections
                ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
                ctx.lineWidth = 2;

                if (col < cols - 1 && i + 1 < numQubits) {
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + cellWidth, y);
                    ctx.stroke();
                }

                if (row < rows - 1 && i + cols < numQubits) {
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y + cellHeight);
                    ctx.stroke();
                }

                // Draw qubit
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, 2 * Math.PI);
                ctx.fill();

                ctx.fillStyle = '#fff';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(i.toString(), x, y);
            }

            ctx.fillStyle = '#9ca3af';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${numQubits} Qubit Grid Layout (No coupling map available)`, width / 2, 30);
        }

        // Draw layered error chart
        drawLayeredErrorChart(backendName) {
            const canvas = document.getElementById(`layered-error-chart-${backendName}`);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            // Clear canvas
            ctx.fillStyle = 'rgba(20, 22, 36, 0.5)';
            ctx.fillRect(0, 0, width, height);

            // Generate sample data (simulating error rates over qubit count)
            const dataPoints = [];
            for (let i = 0; i <= 100; i += 2) {
                const baseError = 0.003;
                const variation = (Math.sin(i / 10) * 0.0005) + (Math.random() * 0.0003);
                dataPoints.push({
                    x: i,
                    y: baseError + variation
                });
            }

            // Set up chart area
            const padding = 60;
            const chartWidth = width - 2 * padding;
            const chartHeight = height - 2 * padding;

            // Draw axes
            ctx.strokeStyle = '#9ca3af';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, height - padding);
            ctx.lineTo(width - padding, height - padding);
            ctx.stroke();

            // Draw axis labels
            ctx.fillStyle = '#9ca3af';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Number of qubits used', width / 2, height - 20);

            ctx.save();
            ctx.translate(20, height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('2Q error (layered)', 0, 0);
            ctx.restore();

            // Draw data line
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            dataPoints.forEach((point, index) => {
                const x = padding + (point.x / 100) * chartWidth;
                const y = height - padding - ((point.y - 0.0025) / 0.002) * chartHeight;

                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                // Draw point
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.fill();
            });
            ctx.stroke();

            // Draw Y-axis labels
            ctx.fillStyle = '#9ca3af';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            for (let i = 0; i <= 5; i++) {
                const value = 0.0025 + (i * 0.0004);
                const y = height - padding - (i / 5) * chartHeight;
                ctx.fillText(value.toExponential(2), padding - 10, y + 4);
            }

            // Draw X-axis labels
            ctx.textAlign = 'center';
            for (let i = 0; i <= 100; i += 20) {
                const x = padding + (i / 100) * chartWidth;
                ctx.fillText(i.toString(), x, height - padding + 20);
            }
        }

        /**
         * Check if a job matches a specific provider (symmetric matching)
         * @param {Object} job - The job object
         * {string} providerId - The provider ID ('ibm', 'ionq', 'local', etc.)
         * @returns {boolean} - True if job matches the provider
         */
        jobMatchesProvider(job, providerId) {
            const backend = (job.backend_name || job.backend || '').toLowerCase();

            switch (providerId) {
                case 'ibm':
                    // IBM: real_data flag OR non-local/non-simulator backends
                    return job.real_data === true ||
                        (backend.includes('ibm') || backend.includes('fez') || backend.includes('marrakesh') || backend.includes('torino')) ||
                        (!this._isLocalJob(job) && !backend.includes('ionq') && !backend.includes('rigetti'));

                case 'ionq':
                    // IonQ: backend name contains ionq OR provider field is ionq
                    return backend.includes('ionq') || job.provider === 'ionq';

                case 'local':
                    // Local: local_data flag OR simulator backend names
                    return this._isLocalJob(job);

                case 'rigetti':
                    // Rigetti: backend name contains rigetti/aspen OR provider field
                    return backend.includes('rigetti') || backend.includes('aspen') || job.provider === 'rigetti';

                case 'aws_braket':
                    // AWS Braket
                    return backend.includes('braket') || backend.includes('aws') || job.provider === 'aws_braket';

                case 'azure':
                    // Azure Quantum
                    return backend.includes('azure') || job.provider === 'azure';

                case 'google':
                    // Google Quantum
                    return background.includes('google') || backend.includes('sycamore') || job.provider === 'google';

                default:
                    // Unknown provider - don't show any jobs
                    console.warn(`Unknown provider: ${providerId}`);
                    return false;
            }
        }

        /**
         * Helper to check if job is from local simulator
         */
        _isLocalJob(job) {
            const backend = (job.backend_name || job.backend || '').toLowerCase();
            return job.local_data === true ||
                backend.includes('local') ||
                backend.includes('simulator') ||
                backend.includes('aer') ||
                backend.includes('qasm_simulator');
        }


        async updateJobsWidget() {
            // Prevent duplicate renders
            if (this.renderLocks.get('jobs')) {
                console.log('⚠️ Jobs widget already rendering, skipping...');
                return;
            }
            this.renderLocks.set('jobs', true);

            // Declare contentElement outside try block so it's accessible in catch
            let contentElement = null;

            try {
                console.log('🔧 Updating jobs widget...');
                contentElement = document.getElementById('jobs-content');
                if (!contentElement) {
                    console.error('❌ jobs-content element not found');
                    return;
                }

                // Verify we're targeting the correct widget
                const widget = contentElement.closest('.widget');
                if (widget && widget.getAttribute('data-widget') !== 'jobs') {
                    console.error('❌ Jobs widget update targeting wrong widget element!');
                    return;
                }
                console.log('✅ Jobs widget targeting correct element:', contentElement.id);

                const currentMode = window.dashboardMode || 'ibm';
                console.log(`  Updating jobs widget for MODE: ${currentMode}...`);

                // PROVIDER-SCOPED FETCH - Single source of truth
                console.log(`  Fetching provider-scoped data for: ${currentMode}`);
                const requestedProvider = currentMode;  // Race guard: capture requested provider

                const providerData = await window.QuantumProviders.fetchSingleProvider(requestedProvider);

                // RACE CONDITION GUARD: If provider changed during fetch, abort
                if (window.dashboardMode !== requestedProvider) {
                    console.log(`  ⚠️ Provider changed during fetch (${requestedProvider} → ${window.dashboardMode}), aborting stale render`);
                    return;
                }


                // Extract jobs from scoped provider response
                const jobs = providerData.provider?.jobs || [];
                const activeJobs = jobs.filter(job => {
                    const status = (job.status || '').toLowerCase();
                    return status === 'queued' || status === 'running' || status === 'pending' || status === 'validating';
                });

                console.log(`  Extracted ${jobs.length} jobs from scoped provider`);
                if (jobs.length > 0) {
                    console.log('  Latest job:', jobs[0]);
                    // Log job statuses
                    const statusCounts = {};
                    jobs.forEach(job => {
                        const status = job.status || 'unknown';
                        statusCounts[status] = (statusCounts[status] || 0) + 1;
                    });
                    console.log('  Job status breakdown:', statusCounts);
                }

                // No independent auto-refresh - controlled by dashboard timer
                const hasActiveJobs = activeJobs.length > 0;

                if (hasActiveJobs) {
                    console.log('  Active jobs detected - will refresh on next dashboard update');
                }

                if (jobs.length > 0 || activeJobs.length > 0) {
                    this.renderEnhancedJobsContent(jobs, activeJobs, contentElement);
                } else {
                    this.renderEmptyState(contentElement, 'jobs', 'No Quantum Jobs Available', 'Run quantum jobs to see them here.');
                }
            } catch (error) {
                console.error('Error fetching jobs:', error);
                // Only try to render error if contentElement was found
                if (contentElement) {
                    this.renderEmptyState(contentElement, 'jobs', 'No Quantum Jobs Available', 'Run quantum jobs to see them here.');
                }
            } finally {
                this.renderLocks.delete('jobs');
            }
        }

        renderEnhancedJobsContent(jobs, activeJobs, contentElement) {
            // PRIORITIZE IBM JOBS: Separate local and IBM Quantum jobs
            console.log('=== JOB COUNT DIAGNOSTIC ===');
            console.log('Total jobs received:', jobs.length);
            console.log('Active jobs received:', activeJobs.length);
            console.log('Original jobs before categorization:', jobs.map(j => ({ backend: j.backend, real_data: j.real_data, local_data: j.local_data })));

            const ibmJobs = jobs.filter(job => {
                // Check multiple indicators for IBM jobs
                const backend = (job.backend || job.backend_name || '').toLowerCase();
                const isRealData = job.real_data === true;
                const isSimulator = backend.includes('simulator') || backend.includes('local') || backend.includes('aer') || backend.includes('qasm');
                const isNotLocal = !job.local_data && !isSimulator;
                const shouldInclude = isRealData || isNotLocal;
                console.log(`IBM job check - Backend ${backend}: real_data=${isRealData}, isSimulator=${isSimulator}, local_data=${job.local_data}, shouldInclude=${shouldInclude}`);
                return shouldInclude;
            });

            const localJobs = jobs.filter(job => {
                const backend = (job.backend || job.backend_name || '').toLowerCase();
                const isSimulator = backend.includes('simulator') || backend.includes('local') || backend.includes('aer') || backend.includes('qasm');
                const isLocalData = job.local_data === true;
                const shouldInclude = isLocalData || (isSimulator && !job.real_data);
                console.log(`Local job check - Backend ${backend}: local_data=${isLocalData}, isSimulator=${isSimulator}, real_data=${job.real_data}, shouldInclude=${shouldInclude}`);
                return shouldInclude;
            });

            console.log('Categorized jobs - IBM:', ibmJobs.length, 'Local:', localJobs.length);

            // FIX: Ensure accurate job counts - don't double-count jobs
            const totalUniqueJobs = jobs.length;
            console.log('FIXED Job counts - Total:', totalUniqueJobs, '| IBM:', ibmJobs.length, '| Local:', localJobs.length);

            // Check dashboard mode for data segregation
            const currentMode = window.dashboardMode || 'ibm';
            console.log(`JOBS RENDER - Current Mode: ${currentMode} | Total Jobs: ${jobs.length} | IBM Jobs: ${ibmJobs.length} | Local Jobs: ${localJobs.length}`);

            // SYMMETRIC PROVIDER MATCHING - no more IBM special-casing
            const modeJobs = jobs.filter(job => this.jobMatchesProvider(job, currentMode));
            const modeActiveJobs = activeJobs.filter(job => this.jobMatchesProvider(job, currentMode));

            console.log(`MODE FILTER (${currentMode}): Showing ${modeJobs.length} jobs, ${modeActiveJobs.length} active`);
            console.log('=== JOB COUNT ISSUE DIAGNOSIS ===');
            console.log(`Expected to show: ${modeJobs.length + modeActiveJobs.length} total jobs`);
            console.log(`But display shows: 1 job (hardcoded limit)`);
            console.log(`Issue: Line 513 shows Math.min(1, modeJobs.length) instead of modeJobs.length`);
            console.log(`Issue: Line 518 slices to show only first job: modeJobs.slice(0, 1)`);
            console.log(`DIAGNOSTIC: modeJobs.length = ${modeJobs.length}, modeActiveJobs.length = ${modeActiveJobs.length}`);
            console.log(`DIAGNOSTIC: Total jobs that should be displayed: ${modeJobs.length + modeActiveJobs.length}`);
            console.log(`DIAGNOSTIC: Current display logic limits to 1 job instead of showing all available jobs`);

            // If no jobs for current mode, show appropriate message
            if (modeJobs.length === 0 && modeActiveJobs.length === 0) {
                if (currentMode === 'ibm') {
                    this.renderEmptyState(contentElement, 'jobs', ' ', 'No IBM Quantum Jobs Yet',
                        'Connect your IBM Quantum credentials and submit circuits to see quantum jobs here.');
                } else {
                    this.renderEmptyState(contentElement, 'jobs', ' ', 'No Local Jobs Yet',
                        'Run quantum circuit simulations locally to see jobs here.');
                }
                return;
            }

            // Mode-specific styling
            const modeColors = currentMode === 'ibm' ?
                { primary: '#06b6d4', secondary: '#0891b2', icon: '🌐' } :
                { primary: '#10b981', secondary: '#059669', icon: ' ' };

            const modeLabel = currentMode === 'ibm' ? 'IBM Quantum' : 'Local Simulator';

            let html = `
            <div class="enhanced-jobs-container">
                <!-- Mode-Specific Job Summary Header -->
                <div class="job-summary-header" style="background: linear-gradient(135deg, rgba(${currentMode === 'ibm' ? '6, 182, 212' : '16, 185, 129'}, 0.3), rgba(${currentMode === 'ibm' ? '6, 182, 212' : '16, 185, 129'}, 0.2)); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; border: 2px solid rgba(${currentMode === 'ibm' ? '6, 182, 212' : '16, 185, 129'}, 0.5);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="font-size: 1.5rem;">${modeColors.icon}</span>
                            <div>
                                <div style="font-size: 1.1rem; font-weight: 600; color: ${modeColors.primary};">${modeLabel} Jobs (${modeJobs.length + modeActiveJobs.length} total)</div>
                                <div style="font-size: 0.8rem; color: ${modeColors.primary};">Mode: ${currentMode.toUpperCase()}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${modeColors.primary}; border: 2px solid ${modeColors.secondary};"></span>
                            <span style="color: ${modeColors.primary}; font-weight: 600; font-size: 0.9rem;">${modeJobs.length + modeActiveJobs.length} ${modeLabel} Jobs</span>
                        </div>
                    </div>
                </div>
        `;

            // Show active jobs first (running/queued) - MODE FILTERED
            if (modeActiveJobs.length > 0) {
                html += `
                <div class="active-jobs-section" style="margin-bottom: 1.5rem;">
                    <h5 style="color: #f59e0b; margin: 0 0 0.8rem 0; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; animation: pulse 2s infinite;"></span>
                        Active ${modeLabel} Jobs (${modeActiveJobs.length})
                    </h5>
            `;

                modeActiveJobs.forEach((job, index) => {
                    const status = job.status || 'UNKNOWN';
                    const jobId = job.job_id || job.execution_id || `job-${index}`;
                    const backend = job.backend_name || 'Unknown';
                    const circuitName = job.execution_data?.circuit_name || 'Unknown Circuit';
                    const createdAt = new Date(job.created_at).toLocaleTimeString();

                    const statusConfig = this.getJobStatusConfig(status);

                    html += `
                    <div class="active-job-card" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 0.8rem; margin-bottom: 0.8rem;">
                        <div class="job-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                            <div>
                                <div style="font-size: 0.9rem; color: #f59e0b; font-weight: bold;">${circuitName}</div>
                                <div style="font-size: 0.8rem; color: #9ca3af;">${backend} • ${createdAt}</div>
                            </div>
                            <div class="status-container" style="display: flex; align-items: center; gap: 0.5rem;">
                                <div class="status-indicator" style="width: 8px; height: 8px; border-radius: 50%; background: ${statusConfig.color}; ${statusConfig.animation}"></div>
                                <div class="status-badge" style="background: ${statusConfig.bgColor}; color: ${statusConfig.textColor}; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.7rem; font-weight: 500;">
                                    ${statusConfig.label}
                                </div>
                            </div>
                        </div>
                        <div class="job-details">
                            <div style="font-size: 0.8rem; color: #9ca3af; margin-bottom: 0.5rem;">Job ID: ${jobId ? jobId.substring(0, 12) + '...' : 'N/A'}</div>
                            ${this.renderJobProgress(job, statusConfig)}
                        </div>
                    </div>
                `;
                });

                html += '</div>';
            }

            // MODE-SPECIFIC COMPLETED JOBS SECTION
            if (modeJobs.length > 0) {
                // FIX: Filter out any string objects that might cause 'name' attribute errors
                const validModeJobs = modeJobs.filter(job => {
                    if (typeof job === 'string') {
                        console.warn('FILTERED: Removed string job object to prevent attribute error:', job);
                        return false;
                    }
                    if (!job || typeof job !== 'object') {
                        console.warn('FILTERED: Removed invalid job object:', job);
                        return false;
                    }
                    return true;
                });

                console.log(`FIXED: Filtered ${modeJobs.length - validModeJobs.length} invalid jobs, showing ${validModeJobs.length} valid jobs`);

                html += `
            <div class="mode-jobs-section" style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                    <h5 style="color: ${modeColors.primary}; margin: 0; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; font-weight: 600;">
                        <span style="width: 10px; height: 10px; border-radius: 50%; background: ${modeColors.primary}; border: 2px solid ${modeColors.secondary}; box-shadow: 0 0 10px rgba(${currentMode === 'ibm' ? '6, 182, 212' : '16, 185, 129'}, 0.5);"></span>
                        Latest ${modeLabel} Jobs (${validModeJobs.length} total)
                    </h5>
                    ${validModeJobs.length > 1 ? `
                        <button onclick="window.quantumWidgets.toggleJobsView('${currentMode}')" style="background: linear-gradient(135deg, ${modeColors.primary}, ${modeColors.secondary}); color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600; box-shadow: 0 2px 8px rgba(${currentMode === 'ibm' ? '6, 182, 212' : '16, 185, 129'}, 0.3);">
                            ${modeColors.icon} ${!this.expandedModes[currentMode] ? `Show More (${Math.max(0, validModeJobs.length - 1)} more)` : 'Show Less'}
                        </button>
                    ` : ''}
                </div>
                <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 0.5rem; font-style: italic;">
                    Showing ${!this.expandedModes[currentMode] ? Math.min(1, validModeJobs.length) : validModeJobs.length} of ${validModeJobs.length} ${modeLabel.toLowerCase()} job(s)
                </div>
        `;

                // Show jobs with show more/less functionality - Show 1 job by default for clean dashboard
                const jobsToShow = !this.expandedModes[currentMode] ? validModeJobs.slice(0, 1) : validModeJobs;
                jobsToShow.forEach((job, index) => {
                    // Check for potential string object issue
                    if (typeof job === 'string') {
                        console.error('ERROR: Job is a string instead of object! Value:', job);
                        return; // Skip processing this job
                    }

                    if (!job || typeof job !== 'object') {
                        console.error('ERROR: Job is not a valid object! Value:', job);
                        return; // Skip processing this job
                    }

                    // Get job name safely
                    const jobName = job.name || job.backend_name || 'Unknown';

                    // Process job data

                    // Extract job ID properly - use the actual job_id field
                    const jobId = job.job_id || job.id || 'No Job ID';

                    // Determine backend properly - check real_data flag first
                    let backend = 'Unknown';
                    let isIBM = false;
                    let isLocal = false;

                    if (job.real_data === true || job.backend_name) {
                        // This is an IBM Quantum job
                        backend = job.backend_name || job.backend || 'IBM Quantum';
                        isIBM = true;
                        isLocal = false;
                    } else if (job.local_data === true) {
                        // This is a local simulation - use the actual backend name from the job
                        backend = job.backend_name || job.backend || 'Local Simulator';
                        isLocal = true;
                        isIBM = false;
                    } else {
                        // Fallback: check backend string
                        backend = job.backend || job.backend_name || 'Unknown';
                        isLocal = backend.toLowerCase().includes('local') || backend.toLowerCase().includes('simulator');
                        isIBM = !isLocal && backend !== 'Unknown';
                    }

                    console.log('  Backend:', backend, '| isIBM:', isIBM, '| isLocal:', isLocal);

                    // CRITICAL FIX: Use actual IBM status - don't default to 'done'!
                    const status = job.status || job.job_status || 'UNKNOWN';
                    console.log('  Job Status:', status);

                    // Parse execution data
                    let circuitName = 'Unknown Circuit';
                    let qubits = 2;
                    let depth = 2;
                    let shots = 1024;
                    let gates = 0;
                    let resultStates = 0;
                    let executionTime = 'N/A';
                    let results = {};

                    try {
                        // Check circuit_info first (added in backend)
                        if (job.circuit_info) {
                            const circInfo = typeof job.circuit_info === 'string' ? JSON.parse(job.circuit_info) : job.circuit_info;
                            circuitName = circInfo.name || circuitName;
                            gates = circInfo.gates || gates;
                            depth = circInfo.depth || depth;
                            qubits = circInfo.qubits || qubits;
                        }

                        // Try to parse execution_data
                        if (job.execution_data) {
                            const execData = typeof job.execution_data === 'string' ? JSON.parse(job.execution_data) : job.execution_data;
                            circuitName = execData.circuit_name || execData.name || circuitName;
                            shots = execData.shots || shots;
                            qubits = execData.qubits || execData.num_qubits || qubits;
                            depth = execData.depth || depth;
                            gates = execData.gates || gates;
                        }

                        // Also check circuit_data if available
                        if (job.circuit_data) {
                            const circData = typeof job.circuit_data === 'string' ? JSON.parse(job.circuit_data) : job.circuit_data;
                            gates = circData.gates || gates;
                            qubits = circData.qubits || qubits;
                            depth = circData.depth || depth;
                        }


                        // Try to parse results_data - handle nested counts structure
                        console.log(`  📊 Parsing results for job ${jobId}...`);
                        console.log(`    results_data type:`, typeof job.results_data);
                        console.log(`    results_data value:`, job.results_data);

                        if (job.results_data) {
                            try {
                                const parsedResults = typeof job.results_data === 'string' ? JSON.parse(job.results_data) : job.results_data;
                                console.log(`    Parsed results:`, parsedResults);

                                // Check if results_data has a nested 'counts' field
                                if (parsedResults && parsedResults.counts) {
                                    results = parsedResults.counts;
                                    console.log(`    ✅ Found counts in parsedResults.counts:`, results);
                                } else if (parsedResults && typeof parsedResults === 'object') {
                                    // Check if parsedResults itself is the counts object
                                    const hasNumericValues = Object.values(parsedResults).some(v => typeof v === 'number');
                                    if (hasNumericValues) {
                                        results = parsedResults;
                                        console.log(`    ✅ parsedResults is the counts object:`, results);
                                    }
                                }

                                if (results && typeof results === 'object') {
                                    resultStates = Object.keys(results).length;
                                    console.log(`    ✅ Results found: ${resultStates} states from results_data`);
                                    console.log(`    Result counts:`, results);
                                } else {
                                    console.log(`    ⚠️ No valid counts found in results_data`);
                                }
                            } catch (parseErr) {
                                console.error(`    ❌ Error parsing results_data:`, parseErr);
                            }
                        } else if (job.results && job.results.counts) {
                            results = job.results.counts;
                            resultStates = Object.keys(results).length;
                            console.log(`    ✅ Results from job.results.counts: ${resultStates} states`);
                        } else if (job.counts) {
                            results = job.counts;
                            resultStates = Object.keys(results).length;
                            console.log(`    ✅ Results from job.counts: ${resultStates} states`);
                        } else if (job.result && job.result.counts) {
                            results = job.result.counts;
                            resultStates = Object.keys(results).length;
                            console.log(`    ✅ Results from job.result.counts: ${resultStates} states`);
                        } else {
                            console.log(`    ⚠️ No results found in job data`);
                        }

                        if (job.execution_time) {
                            executionTime = `${job.execution_time}s`;
                        }
                    } catch (e) {
                        console.error('  ❌ Error parsing job data:', e);
                    }

                    // Format creation time
                    let createdAt = 'Unknown time';
                    if (job.created_at) {
                        try {
                            const date = new Date(job.created_at);
                            createdAt = date.toLocaleTimeString();
                        } catch (e) {
                            createdAt = String(job.created_at);
                        }
                    } else if (job.creation_date) {
                        try {
                            const date = new Date(job.creation_date);
                            createdAt = date.toLocaleTimeString();
                        } catch (e) {
                            createdAt = String(job.creation_date);
                        }
                    }

                    // Determine badge colors based on actual execution type
                    const simulatorBadge = isLocal ?
                        '<span style="background: #10b981; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">  Local Simulator</span>' :
                        '<span style="background: #06b6d4; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">🌐 IBM Quantum</span>';

                    // Only show 3D Visualization badge if this is from the 3D circuit builder
                    const has3DVisualization = circuitName.includes('3D') || circuitName.includes('Circuit Widget');
                    const visualizationBadge = has3DVisualization ?
                        '<span style="background: #f59e0b; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">🎨 3D Visualization</span>' : '';

                    // Border color based on type
                    const borderColor = isLocal ? '#10b981' : '#06b6d4';

                    html += `
                    <div class="job-card" style="background: rgba(30, 41, 59, 0.4); border-left: 4px solid ${borderColor}; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; backdrop-filter: blur(10px);">
                        <!-- Job Header with Job ID -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem;">
                            <div style="flex: 1;">
                                <div style="margin-bottom: 0.75rem;">
                                    <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 0.3rem; text-transform: uppercase;">Job ID:</div>
                                    <div style="font-size: 0.9rem; color: #e2e8f0; font-family: 'Courier New', monospace; background: rgba(0, 0, 0, 0.5); padding: 0.5rem 0.8rem; border-radius: 6px; overflow: hidden; text-overflow: ellipsis; border: 1px solid rgba(100, 116, 139, 0.3); font-weight: 600; max-width: 100%; word-break: break-all;">
                                        ${jobId}
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                                    ${simulatorBadge}
                                    ${visualizationBadge}
                                </div>
                            </div>
                            <button onclick="window.quantumWidgets.toggleJobDetails('${jobId}')" style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; padding: 0.5rem; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                ✓
                            </button>
                        </div>
                        
                        <!-- Job Details -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.8rem; font-size: 0.85rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8;">
                                <span>${isIBM ? '🌐' : ' '}</span>
                                <span style="color: ${isIBM ? '#06b6d4' : '#10b981'}; font-weight: 600;">${backend}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8;">
                                <span> </span>
                                <span style="color: #e2e8f0;">${circuitName}</span>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8;">
                                <span> </span>
                                <span style="color: ${status.toLowerCase().includes('queued') || status.toLowerCase().includes('pending') ? '#f59e0b' : status.toLowerCase().includes('running') ? '#3b82f6' : status.toLowerCase().includes('done') || status.toLowerCase().includes('completed') ? '#10b981' : '#ef4444'};">
                                    Status: <strong style="letter-spacing: 0.05em;">${status.toUpperCase()}</strong>
                                </span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8;">
                                <span>🎯</span>
                                <span>Shots: <strong style="color: #f59e0b;">${shots}</strong></span>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8;">
                                <span>🕐</span>
                                <span>Created: <strong style="color: #e2e8f0;">${createdAt}</strong></span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8;">
                                <span>📈</span>
                                <span>Results: <strong style="color: #06b6d4;">${resultStates} states</strong></span>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8;">
                                <span>⚛️</span>
                                <span>Qubits: <strong style="color: #8b5cf6;">${qubits || 2}</strong></span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8;">
                                <span>📏</span>
                                <span>Depth: <strong style="color: #06b6d4;">${depth || 2}</strong></span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8;">
                                <span>🧩</span>
                                <span>Gates: <strong style="color: #f59e0b;">${gates || 'N/A'}</strong></span>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; grid-column: 1 / -1;">
                                <span>⚡</span>
                                <span>Exec Time: <strong style="color: #e2e8f0;">${executionTime}</strong></span>
                            </div>
                        </div>
                        
                        <!-- Results Preview -->
                        ${resultStates > 0 ? `
                        <div style="background: rgba(16, 185, 129, 0.1); border-radius: 6px; padding: 0.8rem; border: 1px solid rgba(16, 185, 129, 0.3);">
                            <div style="font-size: 0.9rem; color: #10b981; font-weight: 600; margin-bottom: 0.5rem;">
                                  Local Simulation Results:
                            </div>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                ${Object.entries(results).slice(0, 4).map(([state, count]) => `
                                    <div style="background: rgba(16, 185, 129, 0.2); padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.8rem; color: #10b981;">
                                        |${state}⟩: ${count}
                                    </div>
                                `).join('')}
                                ${resultStates > 4 ? `<div style="color: #64748b; font-size: 0.8rem;">+${resultStates - 4} more</div>` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                `;
                });

                html += '</div>'; // Close mode jobs section
            }

            html += '</div>'; // Close enhanced-jobs-container
            contentElement.innerHTML = html;

            // Add CSS animations if not already added
            this.addJobAnimations();

            // Start polling for active jobs
            this.startJobPolling();
        }

        refreshJobs() {
            this.updateJobsWidget();
        }

        toggleJobDetails(jobId) {
            const jobCard = event.target.closest('.job-card');
            if (jobCard) {
                const isExpanded = jobCard.classList.contains('expanded');
                if (isExpanded) {
                    jobCard.classList.remove('expanded');
                } else {
                    jobCard.classList.add('expanded');
                }
            }
        }

        // Entanglement Widget - Enhanced with Quantum Metrics and Graphs
        async updateEntanglementWidget() {
            // Prevent duplicate renders
            if (this.renderLocks.get('entanglement')) {
                console.log('⚠️ Entanglement widget already rendering, skipping...');
                return;
            }
            this.renderLocks.set('entanglement', true);

            try {
                const contentElement = document.getElementById('entanglement-content');
                if (!contentElement) {
                    console.error('entanglement-content element not found');
                    return;
                }

                const currentMode = window.dashboardMode || 'ibm';
                console.log(`Updating entanglement widget for ${currentMode} mode...`);

                // Use shared data
                const resultsData = await this.getSharedData('results');
                const backendsData = await this.getSharedData('backends');

                // Handle both array and object responses
                let resultsArray = Array.isArray(resultsData) ? resultsData : (resultsData.results || resultsData.data || []);
                let backendsArray = Array.isArray(backendsData) ? backendsData : (backendsData.backends || backendsData.data || []);

                // Filter by mode using shared helper
                const filteredResults = this.filterByMode(resultsArray, currentMode);

                // Analyze entanglement with filtered results
                this.analyzeEntanglementWithQuantumMetrics(filteredResults, backendsArray);

            } finally {
                this.renderLocks.delete('entanglement');
            }
        }

        async showAllJobs(mode = null) {
            try {
                // Get current mode if not specified
                const currentMode = mode || window.dashboardMode || 'ibm';
                console.log(`  Show All Jobs - Mode: ${currentMode}`);

                // Fetch all jobs
                const [jobsData, activeJobsData] = await Promise.all([
                    this.fetchData('/api/jobs', 'jobs', []),
                    this.fetchData('/api/active-jobs', 'active-jobs', [])
                ]);

                const allJobsRaw = Array.isArray(jobsData) ? jobsData : (jobsData.jobs || jobsData.data || []);
                const allActiveJobsRaw = Array.isArray(activeJobsData) ? activeJobsData : (activeJobsData.jobs || []);

                // FILTER JOBS BY MODE - Use the class method for multi-provider support
                const jobs = this.filterByMode(allJobsRaw, currentMode);
                const activeJobs = this.filterByMode(allActiveJobsRaw, currentMode);

                console.log(`  Filtered Jobs - Mode: ${currentMode}, Total: ${jobs.length}, Active: ${activeJobs.length}`);

                // Mode-specific styling
                const modeStyles = {
                    ibm: { primary: '#06b6d4', secondary: '#0891b2', icon: '🌐', label: 'IBM Quantum' },
                    local: { primary: '#10b981', secondary: '#059669', icon: '💻', label: 'Local Simulator' },
                    ionq: { primary: '#8b5cf6', secondary: '#7c3aed', icon: '⚛️', label: 'IonQ' },
                    aws_braket: { primary: '#ff9900', secondary: '#ec7211', icon: '☁️', label: 'AWS Braket' },
                    azure: { primary: '#0078d4', secondary: '#005a9e', icon: '☁️', label: 'Azure Quantum' },
                    rigetti: { primary: '#00d4aa', secondary: '#00b894', icon: '🔷', label: 'Rigetti' },
                    google: { primary: '#4285f4', secondary: '#1a73e8', icon: '🔶', label: 'Google Quantum' },
                    quantinuum: { primary: '#ff6b6b', secondary: '#ee5a5a', icon: '⚛️', label: 'Quantinuum' },
                    dwave: { primary: '#1e88e5', secondary: '#1565c0', icon: '🔶', label: 'D-Wave' },
                    xanadu: { primary: '#22c55e', secondary: '#16a34a', icon: '🟢', label: 'Xanadu' }
                };
                const modeColors = modeStyles[currentMode] || modeStyles.ibm;

                // Create fullscreen modal
                const modal = document.createElement('div');
                modal.id = 'all-jobs-modal';
                modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                z-index: 10000;
                overflow-y: auto;
                padding: 2rem;
                backdrop-filter: blur(10px);
            `;
                modal.className = 'widget-content';

                modal.innerHTML = `
                <div style="max-width: 1200px; margin: 0 auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                        <h2 style="color: ${modeColors.primary}; font-size: 1.5rem; margin: 0; display: flex; align-items: center; gap: 0.75rem;">
                            <span style="font-size: 1.8rem;">${modeColors.icon}</span>
                            All ${modeColors.label} Jobs (${jobs.length + activeJobs.length} total)
                        </h2>
                        <button onclick="document.getElementById('all-jobs-modal').remove()" style="background: #ef4444; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                            ✕ Close
                        </button>
                    </div>
                    <div id="all-jobs-content"></div>
                </div>
            `;

                document.body.appendChild(modal);

                // Render all jobs in the modal (but show all of them, not just 1)
                const contentElement = document.getElementById('all-jobs-content');

                // Temporarily render all jobs by modifying the render function behavior
                let html = `<div class="all-jobs-container">`;

                // Combine and sort all jobs by creation date
                const allJobs = [...jobs, ...activeJobs].sort((a, b) => {
                    const dateA = new Date(a.created_at || 0);
                    const dateB = new Date(b.created_at || 0);
                    return dateB - dateA; // Most recent first
                });

                allJobs.forEach((job, index) => {
                    const jobId = job.job_id || job.id || `LOCAL_${Date.now()}_${index}`;
                    const backend = job.backend || job.backend_name || 'Unknown';
                    // CRITICAL FIX: Use actual IBM status - don't default!
                    const status = job.status || job.job_status || 'UNKNOWN';
                    const isLocal = job.local_data || backend === 'local_simulator';
                    const borderColor = isLocal ? '#10b981' : '#06b6d4';

                    let circuitName = 'Unknown Circuit';
                    let qubits = 0;
                    let depth = 0;
                    let shots = 1024;
                    let gates = 0;
                    let resultStates = 0;
                    let executionTime = 'N/A';
                    let results = {};

                    try {
                        if (job.execution_data) {
                            const execData = typeof job.execution_data === 'string' ? JSON.parse(job.execution_data) : job.execution_data;
                            circuitName = execData.circuit_name || circuitName;
                            shots = execData.shots || shots;
                            gates = execData.gates || gates;
                        }
                        // Also check circuit_data
                        if (job.circuit_data) {
                            const circData = typeof job.circuit_data === 'string' ? JSON.parse(job.circuit_data) : job.circuit_data;
                            gates = circData.gates || gates;
                        }
                        if (job.results_data) {
                            const parsedResults = typeof job.results_data === 'string' ? JSON.parse(job.results_data) : job.results_data;
                            // Check if results_data has a nested 'counts' field
                            if (parsedResults && parsedResults.counts) {
                                results = parsedResults.counts;
                            } else {
                                results = parsedResults;
                            }
                            resultStates = results ? Object.keys(results).length : 0;
                        }
                        if (job.execution_time) {
                            executionTime = `${job.execution_time}s`;
                        }
                    } catch (e) {
                        console.error('Error parsing job data:', e);
                    }

                    let createdAt = 'Unknown time';
                    if (job.created_at) {
                        try {
                            const date = new Date(job.created_at);
                            createdAt = date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
                        } catch (e) {
                            createdAt = String(job.created_at);
                        }
                    }

                    const simulatorBadge = isLocal ?
                        '<span style="background: #10b981; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">Local Simulator</span>' :
                        '<span style="background: #06b6d4; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">IBM Quantum</span>';

                    const visualizationBadge = '<span style="background: #f59e0b; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">🎨 3D Visualization</span>';

                    html += `
                    <div class="job-card" style="background: rgba(30, 41, 59, 0.4); border-left: 4px solid ${borderColor}; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <span style="color: #64748b; font-size: 1rem;">▶</span>
                                    <div style="font-size: 0.85rem; color: #e2e8f0; font-family: monospace; background: rgba(0, 0, 0, 0.3); padding: 0.3rem 0.6rem; border-radius: 4px;">
                                        ${jobId}
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                                    ${simulatorBadge}
                                    ${visualizationBadge}
                                </div>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.8rem; font-size: 0.85rem;">
                            <div style="color: #94a3b8;"><span> </span> ${backend}</div>
                            <div style="color: #94a3b8;"><span> </span> ${circuitName}</div>
                            <div style="color: #10b981;"><span> </span> Status: <strong>${status}</strong></div>
                            <div style="color: #94a3b8;"><span>🎯</span> Shots: <strong style="color: #f59e0b;">${shots}</strong></div>
                            <div style="color: #94a3b8;"><span>🕐</span> Created: <strong style="color: #e2e8f0;">${createdAt}</strong></div>
                            <div style="color: #94a3b8;"><span>📈</span> Results: <strong style="color: #06b6d4;">${resultStates} states</strong></div>
                            <div style="color: #94a3b8;"><span>⚛️</span> Qubits: <strong style="color: #8b5cf6;">${qubits || 2}</strong></div>
                            <div style="color: #94a3b8;"><span>📏</span> Depth: <strong style="color: #06b6d4;">${depth || 2}</strong></div>
                            <div style="color: #94a3b8;"><span>🧩</span> Gates: <strong style="color: #f59e0b;">${gates || 'N/A'}</strong></div>
                            <div style="color: #94a3b8; grid-column: 1 / -1;"><span>⚡</span> Exec Time: <strong style="color: #e2e8f0;">${executionTime}</strong></div>
                        </div>
                        
                        ${resultStates > 0 ? `
                        <div style="background: rgba(16, 185, 129, 0.1); border-radius: 6px; padding: 0.8rem; border: 1px solid rgba(16, 185, 129, 0.3);">
                            <div style="font-size: 0.9rem; color: #10b981; font-weight: 600; margin-bottom: 0.5rem;">  Results:</div>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                ${Object.entries(results).slice(0, 8).map(([state, count]) => `
                                    <div style="background: rgba(16, 185, 129, 0.2); padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.8rem; color: #10b981;">
                                        |${state}⟩: ${count}
                                    </div>
                                `).join('')}
                                ${resultStates > 8 ? `<div style="color: #64748b; font-size: 0.8rem;">+${resultStates - 8} more</div>` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                `;
                });

                html += '</div>';
                contentElement.innerHTML = html;

            } catch (error) {
                console.error('Error loading all jobs:', error);
                alert('Failed to load all jobs. Please try again.');
            }
        }


        // Method to show full jobs list
        showFullJobsList() {
            const contentElement = document.getElementById('jobs-content');
            if (!contentElement) return;

            // Get all jobs from database API
            this.fetchData('/api/jobs', 'jobs', []).then(jobsData => {
                const jobsArray = Array.isArray(jobsData) ? jobsData : (jobsData.jobs || jobsData.data || []);
                this.renderEnhancedJobsContent(jobsArray, [], contentElement);
            });
        }

        // Method to refresh results
        refreshResults() {
            this.updateResultsWidget();
        }


        // Performance Widget - MODE AWARE: Show only current mode metrics
        async updatePerformanceWidget() {
            // Prevent duplicate renders
            if (this.renderLocks.get('performance')) {
                console.log('⚠️ Performance widget already rendering, skipping...');
                return;
            }
            this.renderLocks.set('performance', true);

            try {
                const contentElement = document.getElementById('performance-content');
                if (!contentElement) {
                    console.error('performance-content element not found');
                    return;
                }

                const currentMode = window.dashboardMode || 'ibm';
                console.log(`Updating performance widget for ${currentMode} mode...`);

                // Use shared data - performance is derived from results
                // Fetch performance metrics
                const performanceData = await this.getSharedData('performance_metrics');

                // Also fetch results and jobs to calculate real-time stats
                const resultsData = await this.getSharedData('results');
                const jobsData = await this.getSharedData('jobs');

                // Filter results by mode to calculate accurate success rate
                let modeResults = [];
                // Handle both array and object responses for results
                let resultsArray = Array.isArray(resultsData) ? resultsData : (resultsData.results || resultsData.data || []);

                // Handle jobs data
                let jobsArray = Array.isArray(jobsData) ? jobsData : (jobsData.jobs || jobsData.data || []);

                modeResults = this.filterByMode(resultsArray, currentMode);
                const modeJobs = this.filterByMode(jobsArray, currentMode);

                // Calculate mode-specific metrics
                const totalJobs = modeJobs.length;
                const completedJobs = modeJobs.filter(j =>
                    j.status === 'COMPLETED' || j.status === 'DONE' || j.status === 'done' || j.status === 'completed'
                ).length;

                // Calculate success rate based on completed jobs vs total jobs
                const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

                // Calculate REAL average execution time from actual job data
                // First, try to get jobs with explicit execution_time
                let jobsWithTime = modeJobs.filter(j => j.execution_time && j.execution_time > 0);

                // If no jobs have execution_time, calculate it from timestamps
                if (jobsWithTime.length === 0) {
                    console.log('⚠️ No jobs with execution_time found, calculating from timestamps...');
                    jobsWithTime = modeJobs
                        .filter(j => j.created_at && j.completed_at)
                        .map(j => {
                            const execTime = Math.max(0, (j.completed_at - j.created_at));
                            return { ...j, execution_time: execTime };
                        })
                        .filter(j => j.execution_time > 0);

                    console.log(`✓ Calculated execution_time for ${jobsWithTime.length} jobs from timestamps`);
                }

                const avgExecutionTime = jobsWithTime.length > 0
                    ? jobsWithTime.reduce((sum, j) => sum + (j.execution_time || 0), 0) / jobsWithTime.length
                    : 0;

                console.log(`📊 Performance metrics: ${jobsWithTime.length} jobs with time data, avg: ${avgExecutionTime.toFixed(2)}s`);

                // Count running jobs
                const runningJobs = modeJobs.filter(j =>
                    j.status === 'RUNNING' || j.status === 'QUEUED' || j.status === 'running' || j.status === 'queued'
                ).length;

                // Create real performance object (replacing any fake data)
                const realPerformanceData = {
                    success_rate: successRate,
                    avg_execution_time: avgExecutionTime,
                    total_jobs: totalJobs,
                    completed_jobs: completedJobs,
                    running_jobs: runningJobs,
                    mode: currentMode
                };

                this.renderModeSpecificPerformanceContent(realPerformanceData, contentElement);

            } finally {
                this.renderLocks.delete('performance');
            }
        }

        // Mode-specific performance rendering (single mode only)
        renderModeSpecificPerformanceContent(performance, contentElement) {
            const mode = performance.mode || 'ibm';
            const modeColors = mode === 'ibm' ?
                { primary: '#06b6d4', secondary: '#0891b2', icon: '🌐' } :
                { primary: '#10b981', secondary: '#059669', icon: ' ' };
            const modeLabel = mode === 'ibm' ? 'IBM Quantum' : 'Local Simulator';

            const performanceHtml = `
            <div class="widget-content" style="padding: 1rem; max-height: 380px; overflow-y: auto;">
                <!-- Mode Header -->
                <div style="background: linear-gradient(135deg, rgba(${mode === 'ibm' ? '6, 182, 212' : '16, 185, 129'}, 0.2), rgba(${mode === 'ibm' ? '6, 182, 212' : '16, 185, 129'}, 0.1)); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(${mode === 'ibm' ? '6, 182, 212' : '16, 185, 129'}, 0.4); margin-bottom: 1rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: ${modeColors.primary}; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <span>${modeColors.icon}</span>
                        ${modeLabel} Performance Metrics
                    </div>
                    <div style="font-size: 0.7rem; color: #9ca3af; margin-top: 0.25rem;">Mode: ${mode.toUpperCase()}</div>
                </div>
                
                <!-- Performance Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
                    <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05)); padding: 1rem; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3); text-align: center;">
                        <div style="font-size: 2rem; color: #10b981; font-weight: bold; margin-bottom: 0.25rem;">${performance.success_rate.toFixed(1)}%</div>
                        <div style="color: var(--text-secondary); font-size: 0.8rem;">Success Rate</div>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05)); padding: 1rem; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.3); text-align: center;">
                        <div style="font-size: 2rem; color: #3b82f6; font-weight: bold; margin-bottom: 0.25rem;">${performance.avg_execution_time.toFixed(2)}s</div>
                        <div style="color: var(--text-secondary); font-size: 0.8rem;">Avg Time</div>
                    </div>
                </div>
                
                <!-- Total Jobs -->
                <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05)); padding: 1rem; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.3); text-align: center; margin-bottom: 1rem;">
                    <div style="font-size: 2rem; color: #8b5cf6; font-weight: bold; margin-bottom: 0.25rem;">${performance.total_jobs}</div>
                    <div style="color: var(--text-secondary); font-size: 0.8rem;">Total Jobs</div>
                </div>
                
                <!-- Completion Status -->
                <div style="padding: 0.75rem; background: var(--glass-bg); border-radius: 8px; border: 1px solid var(--glass-border);">
                    <h4 style="color: var(--text-primary); margin: 0 0 0.5rem 0; font-size: 0.85rem; font-weight: 600;">  Completion Status</h4>
                    <div style="color: var(--text-secondary); font-size: 0.75rem; line-height: 1.6;">
                        <div style="display: flex; justify-content: space-between; margin: 0.25rem 0;">
                            <span>Completed Jobs:</span>
                            <span style="color: ${modeColors.primary}; font-weight: bold;">${performance.completed_jobs}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 0.25rem 0;">
                            <span>Total Jobs:</span>
                            <span style="color: var(--text-primary); font-weight: bold;">${performance.total_jobs}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 0.25rem 0;">
                            <span>Mode:</span>
                            <span style="color: ${modeColors.primary}; font-weight: bold;">${modeLabel}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

            contentElement.innerHTML = performanceHtml;
            this.showWidgetContent(contentElement);
            console.log(`  Performance widget updated for ${mode} mode`);
        }

        // New rendering function for prioritized performance (IBM vs Local)


        // Results Widget - Show results based on current mode (IBM/Local)
        async updateResultsWidget() {
            // Prevent duplicate renders
            if (this.renderLocks.get('results')) {
                console.log('⚠️ Results widget already rendering, skipping...');
                return;
            }
            this.renderLocks.set('results', true);

            try {
                const contentElement = document.getElementById('results-content');
                if (!contentElement) {
                    console.error('results-content element not found');
                    return;
                }

                const currentMode = window.dashboardMode || 'ibm';
                console.log(`Updating results widget for ${currentMode} mode...`);

                // Use shared data
                const resultsData = await this.getSharedData('results');

                // Handle both array and object responses
                let resultsArray = Array.isArray(resultsData) ? resultsData : (resultsData.results || resultsData.data || []);

                // Filter by mode using shared helper
                const filteredResults = this.filterByMode(resultsArray, currentMode);
                console.log(`  Filtered results for ${currentMode} mode: ${filteredResults.length}`);

                this.renderQuantumResults(filteredResults, contentElement);

            } finally {
                this.renderLocks.delete('results');
            }
        }

        // Quantum State Widget - FIXED: Uses dedicated /api/quantum_state endpoint
        async updateQuantumStateWidget() {
            // Prevent duplicate renders
            if (this.renderLocks.get('quantum-state')) {
                console.log('⚠️ Quantum State widget already rendering, skipping...');
                return;
            }
            this.renderLocks.set('quantum-state', true);

            try {
                const contentElement = document.getElementById('quantum-state-content');
                if (!contentElement) {
                    console.error('quantum-state-content element not found');
                    return;
                }

                const currentMode = window.dashboardMode || 'ibm';
                console.log(`Updating quantum state widget for ${currentMode} mode...`);

                let stateData = null;

                try {
                    // PRIMARY: Call dedicated quantum state API
                    const res = await fetch('/api/quantum_state');
                    if (!res.ok) throw new Error(`Quantum State API failed: ${res.status}`);

                    const apiResponse = await res.json();
                    console.log('✅ Quantum State API response:', apiResponse);

                    // Check if API returned successful data (connected: true)
                    if (apiResponse.connected === true && (apiResponse.counts || apiResponse.bloch_vector)) {
                        stateData = apiResponse;
                    } else if (apiResponse.error) {
                        console.warn('⚠️ Quantum State API returned error:', apiResponse.error);
                        // Don't throw - fall through to fallback
                    }

                } catch (apiError) {
                    console.warn('⚠️ Quantum State API failed:', apiError.message);
                }

                // FALLBACK: Use shared results data if primary API didn't return valid data
                if (!stateData) {
                    console.log('📊 Falling back to shared results data for quantum state...');
                    try {
                        const resultsData = await this.getSharedData('results');
                        let resultsArray = Array.isArray(resultsData) ? resultsData : (resultsData.results || resultsData.data || []);

                        // Filter by mode using shared helper
                        const filteredResults = this.filterByMode(resultsArray, currentMode);

                        // Use the latest result for state visualization
                        if (filteredResults.length > 0) {
                            const latestResult = filteredResults[0];
                            const counts = latestResult.results?.counts || latestResult.counts;
                            if (counts && Object.keys(counts).length > 0) {
                                stateData = {
                                    counts: counts,
                                    job_id: latestResult.job_id || latestResult.id,
                                    backend: latestResult.backend || latestResult.backend_name,
                                    real_data: latestResult.real_data || false
                                };
                                console.log('✅ Using fallback data from results:', stateData.job_id);
                            }
                        }
                    } catch (fallbackError) {
                        console.error('❌ Fallback also failed:', fallbackError.message);
                    }
                }

                // Render state visualization
                if (stateData && (stateData.counts || stateData.bloch_vector)) {
                    this.renderQuantumStateVisualization(stateData, contentElement, currentMode);
                } else {
                    // Show appropriate empty state based on mode
                    const modeLabel = currentMode === 'ibm' ? 'IBM Quantum' : currentMode === 'local' ? 'Local Simulator' : currentMode.toUpperCase();
                    this.renderEmptyState(contentElement, 'quantum-state', '🌐', `No ${modeLabel} State Data`,
                        `Connect to ${modeLabel} and run circuits to see state representations.`);
                }

            } finally {
                this.renderLocks.delete('quantum-state');
            }
        }

        // Render quantum state visualization
        renderQuantumStateVisualization(stateData, contentElement, currentMode) {
            // Calculate Bloch sphere coordinates from counts (simplified)
            let blochVector = { x: 0, y: 0, z: 1 }; // Default |0⟩ state

            if (stateData.bloch_vector) {
                blochVector = stateData.bloch_vector;
            } else if (stateData.counts) {
                // Estimate from measurement counts
                const counts = stateData.counts;
                const total = Object.values(counts).reduce((a, b) => a + b, 0);
                if (total > 0) {
                    const p0 = (counts['0'] || counts['00'] || 0) / total;
                    const p1 = (counts['1'] || counts['11'] || 0) / total;
                    blochVector.z = p0 - p1; // z = p(0) - p(1)
                }
            }

            const modeColor = currentMode === 'ibm' ? '#06b6d4' : currentMode === 'ionq' ? '#8b5cf6' : '#10b981';

            let html = `
                <div class="quantum-state-visualization" style="padding: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <span style="font-size: 1.5rem;">🌐</span>
                        <div>
                            <div style="font-size: 1.1rem; font-weight: 600; color: ${modeColor};">Quantum State</div>
                            <div style="font-size: 0.8rem; color: #9ca3af;">${currentMode.toUpperCase()} Provider</div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                        <div style="background: rgba(6, 182, 212, 0.1); padding: 0.75rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 700; color: #06b6d4;">${blochVector.x.toFixed(3)}</div>
                            <div style="font-size: 0.7rem; color: #9ca3af;">X (|+⟩/-⟩)</div>
                        </div>
                        <div style="background: rgba(139, 92, 246, 0.1); padding: 0.75rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 700; color: #8b5cf6;">${blochVector.y.toFixed(3)}</div>
                            <div style="font-size: 0.7rem; color: #9ca3af;">Y (|i⟩/-i⟩)</div>
                        </div>
                        <div style="background: rgba(16, 185, 129, 0.1); padding: 0.75rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 700; color: #10b981;">${blochVector.z.toFixed(3)}</div>
                            <div style="font-size: 0.7rem; color: #9ca3af;">Z (|0⟩/|1⟩)</div>
                        </div>
                    </div>

                    ${stateData.amplitudes ? `
                    <div style="background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                        <div style="font-size: 0.8rem; color: #9ca3af; margin-bottom: 0.5rem;">Amplitudes</div>
                        <div style="font-family: monospace; font-size: 0.9rem; color: #e5e7eb;">
                            |0⟩: ${stateData.amplitudes['0'] || 'N/A'}<br>
                            |1⟩: ${stateData.amplitudes['1'] || 'N/A'}
                        </div>
                    </div>` : ''}

                    ${stateData.job_id ? `
                    <div style="font-size: 0.75rem; color: #6b7280; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.75rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>Job:</span>
                            <span style="font-family: monospace; color: ${modeColor};">${stateData.job_id.substring(0, 16)}...</span>
                        </div>
                        ${stateData.backend ? `
                        <div style="display: flex; justify-content: space-between; margin-top: 0.25rem;">
                            <span>Backend:</span>
                            <span style="color: #9ca3af;">${stateData.backend}</span>
                        </div>` : ''}
                        ${stateData.real_data ? '<div style="color: #10b981; margin-top: 0.5rem;">✓ Real Quantum Data</div>' : ''}
                    </div>` : ''}
                </div>
            `;

            contentElement.innerHTML = html;
            this.showWidgetContent(contentElement);
            console.log('✅ Quantum State widget rendered');
        }


        renderQuantumResults(resultsData, contentElement) {
            const results = Array.isArray(resultsData) ? resultsData : [resultsData];

            // Separate local and IBM results
            const localResults = results.filter(r => r.backend_name && r.backend_name.includes('Local Simulator'));
            const ibmResults = results.filter(r => !(r.backend_name && r.backend_name.includes('Local Simulator')));

            // Get the most recent result (fresh result)
            const freshResult = results.length > 0 ? results[0] : null;

            let html = `
            <div class="results-container">
                <div class="results-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div>
                        <h4 style="color: #06b6d4; margin: 0; font-size: 1rem;">Latest Measurement Result</h4>
                        <div style="font-size: 0.8rem; color: #9ca3af; margin-top: 0.2rem; display: flex; gap: 1rem;">
                            <span style="color: #06b6d4; background: rgba(6, 182, 212, 0.15); padding: 0.2rem 0.6rem; border-radius: 12px;">
                                ${ibmResults.length} IBM Quantum
                            </span>
                            <span style="color: #10b981; background: rgba(16, 185, 129, 0.15); padding: 0.2rem 0.6rem; border-radius: 12px;">
                                ${localResults.length} Local Simulator
                            </span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                    <button onclick="window.quantumWidgets.refreshResults()" style="background: #06b6d4; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: all 0.3s;">Refresh</button>
                        <button onclick="window.quantumWidgets.showAllResults()" style="background: #8b5cf6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: all 0.3s;">View All (${results.length})</button>
                    </div>
                </div>
        `;

            // Show only the fresh result in the main widget
            if (freshResult) {
                const counts = freshResult.results?.counts || freshResult.counts || {};
                const jobId = freshResult.job_id || freshResult.id || 'result-1';
                const backend = freshResult.backend || freshResult.backend_name || 'Unknown';
                const status = freshResult.status || 'Unknown';
                const isLocal = freshResult.is_local || (backend && backend.includes('Local Simulator'));

                // Calculate total shots and most common state
                const totalShots = Object.values(counts).reduce((sum, count) => sum + count, 0);
                const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);

                // Different styling for IBM vs Local
                const cardBg = isLocal ? 'rgba(16, 185, 129, 0.1)' : 'rgba(6, 182, 212, 0.1)';
                const cardBorder = isLocal ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 182, 212, 0.3)';
                const accentColor = isLocal ? '#10b981' : '#06b6d4';
                const typeLabel = isLocal ? 'Local Simulator' : 'IBM Quantum Hardware';
                const typeIcon = isLocal ? '' : '';

                html += `
                <div class="result-card" style="background: ${cardBg}; border: 2px solid ${cardBorder}; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <div class="result-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
                                <div style="font-size: 0.85rem; color: ${accentColor}; font-weight: bold; font-family: monospace; overflow: hidden; text-overflow: ellipsis; max-width: 300px;" title="${jobId || 'N/A'}">Job: ${jobId ? (jobId.length > 20 ? jobId.substring(0, 20) + '...' : jobId) : 'N/A'}</div>
                                <div style="background: ${isLocal ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.2)'}; color: ${accentColor}; padding: 0.1rem 0.5rem; border-radius: 10px; font-size: 0.65rem; font-weight: 600; white-space: nowrap;">
                                    ${typeIcon} ${typeLabel}
                                </div>
                            </div>
                            <div style="font-size: 0.8rem; color: #9ca3af; overflow: hidden; text-overflow: ellipsis;">${backend} • ${totalShots} shots</div>
                        </div>
                        <div class="status-badge" style="background: ${status === 'DONE' || status === 'COMPLETED' ? '#10b981' : '#f59e0b'}; color: white; padding: 0.3rem 0.7rem; border-radius: 12px; font-size: 0.7rem; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
                            ${status === 'DONE' || status === 'COMPLETED' ? '' : ''} ${status}
                        </div>
                    </div>
                    
                    <div class="measurement-results">
                        <div style="font-size: 0.85rem; color: ${accentColor}; margin-bottom: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Measurement Distribution</div>
                        <div class="counts-display">
            `;

                // Add IBM Quantum Platform-style histogram visualization
                const safeJobId = jobId.replace(/[^a-zA-Z0-9-_]/g, '-');
                html += `
                <div style="margin-bottom: 1.2rem; background: linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%); border-radius: 8px; padding: 1rem; border: 1px solid ${isLocal ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.2)'};">
                    <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Probability Distribution</div>
                    <div id="histogram-${safeJobId}" style="height: 140px; position: relative; margin-bottom: 0.6rem;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: #9ca3af; padding: 0 0.2rem;">
                        <span style="font-weight: 500;">0%</span>
                        <span style="font-weight: 500; color: ${accentColor};">Probability</span>
                        <span style="font-weight: 500;">100%</span>
                    </div>
                </div>
            `;

                // Display measurement counts with IBM Quantum Platform-style formatting
                html += `<div style="background: rgba(0, 0, 0, 0.2); border-radius: 8px; padding: 0.8rem; border: 1px solid rgba(255, 255, 255, 0.1);">`;
                html += `<div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Measurement Outcomes</div>`;

                sortedCounts.slice(0, 8).forEach(([state, count]) => {
                    const percentage = totalShots > 0 ? ((count / totalShots) * 100).toFixed(2) : 0;
                    const barWidth = sortedCounts.length > 0 ? (count / Math.max(...Object.values(counts))) * 100 : 0;

                    // IBM Quantum Platform-style color coding
                    const stateColors = {
                        '00': { main: '#10b981', light: 'rgba(16, 185, 129, 0.2)' },
                        '01': { main: '#3b82f6', light: 'rgba(59, 130, 246, 0.2)' },
                        '10': { main: '#f59e0b', light: 'rgba(245, 158, 11, 0.2)' },
                        '11': { main: '#ef4444', light: 'rgba(239, 68, 68, 0.2)' },
                        '000': { main: '#10b981', light: 'rgba(16, 185, 129, 0.2)' },
                        '001': { main: '#3b82f6', light: 'rgba(59, 130, 246, 0.2)' },
                        '010': { main: '#06b6d4', light: 'rgba(6, 182, 212, 0.2)' },
                        '011': { main: '#f59e0b', light: 'rgba(245, 158, 11, 0.2)' },
                        '100': { main: '#8b5cf6', light: 'rgba(139, 92, 246, 0.2)' },
                        '101': { main: '#ec4899', light: 'rgba(236, 72, 153, 0.2)' },
                        '110': { main: '#ef4444', light: 'rgba(239, 68, 68, 0.2)' },
                        '111': { main: '#f97316', light: 'rgba(249, 115, 22, 0.2)' }
                    };

                    const colors = stateColors[state] || { main: '#8b5cf6', light: 'rgba(139, 92, 246, 0.2)' };

                    html += `
                    <div style="margin-bottom: 0.7rem; background: ${colors.light}; border-radius: 8px; padding: 0.6rem; border: 1px solid ${colors.main}40; transition: all 0.3s ease;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <div style="display: flex; align-items: center; gap: 0.6rem;">
                                <div style="background: ${colors.main}; width: 4px; height: 24px; border-radius: 2px;"></div>
                                <span style="font-family: 'Courier New', monospace; color: ${colors.main}; font-size: 1rem; font-weight: 700; letter-spacing: 1px;">|${state}⟩</span>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: #e5e7eb; font-size: 0.9rem; font-weight: 600;">${percentage}%</div>
                                <div style="color: #9ca3af; font-size: 0.7rem; font-weight: 500;">${count} shots</div>
                            </div>
                        </div>
                        <div style="background: rgba(0, 0, 0, 0.3); height: 10px; border-radius: 5px; overflow: hidden; position: relative;">
                            <div style="background: linear-gradient(90deg, ${colors.main} 0%, ${colors.main}dd 100%); height: 100%; width: ${barWidth}%; border-radius: 5px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);"></div>
                        </div>
                    </div>
                `;
                });

                html += `</div>`;

                if (sortedCounts.length > 8) {
                    html += `<div style="color: #9ca3af; font-size: 0.75rem; text-align: center; margin-top: 0.8rem; padding: 0.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px; font-weight: 500;">+ ${sortedCounts.length - 8} more measurement outcomes</div>`;
                }

                html += `
                        </div>
                    </div>
                </div>
            `;
            } else {
                html += `
                <div style="text-align: center; color: #9ca3af; padding: 2rem;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;"> </div>
                    <div>No measurement results available</div>
                    <div style="font-size: 0.8rem; margin-top: 0.5rem;">Run quantum circuits to see results here</div>
                </div>
            `;
            }

            html += '</div>';

            contentElement.innerHTML = html;

            // Create histogram visualization for the fresh result
            if (freshResult) {
                const jobId = freshResult.job_id || freshResult.id || 'unknown';
                this.createHistogram(freshResult, jobId);
            }
        }

        // Create professional histogram visualization
        createHistogram(result, jobId) {
            const counts = result.results?.counts || result.counts || {};
            const totalShots = Object.values(counts).reduce((sum, count) => sum + count, 0);
            const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);

            if (totalShots === 0 || sortedCounts.length === 0) {
                console.log('No data to create histogram');
                return;
            }

            // Create a safe ID for the histogram element
            const safeJobId = jobId.replace(/[^a-zA-Z0-9-_]/g, '-');
            const histogramElement = document.getElementById(`histogram-${safeJobId}`);
            if (!histogramElement) {
                console.log(`Histogram element not found: histogram-${safeJobId}`);
                return;
            }

            // Clear any existing content
            histogramElement.innerHTML = '';

            // Create SVG histogram
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', '0 0 400 100');
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            const maxCount = Math.max(...Object.values(counts));
            const barWidth = Math.min(400 / sortedCounts.length, 80);
            const spacing = barWidth * 0.2;
            const actualBarWidth = barWidth - spacing;
            const maxHeight = 80;

            sortedCounts.forEach(([state, count], index) => {
                const height = Math.max((count / maxCount) * maxHeight, 2);
                const x = index * barWidth + spacing / 2;
                const y = maxHeight - height;

                // Color coding based on state
                const stateColor = state === '00' ? '#10b981' :
                    state === '01' ? '#3b82f6' :
                        state === '10' ? '#f59e0b' :
                            state === '11' ? '#ef4444' : '#8b5cf6';

                // Create bar
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', x);
                rect.setAttribute('y', y);
                rect.setAttribute('width', actualBarWidth);
                rect.setAttribute('height', height);
                rect.setAttribute('fill', stateColor);
                rect.setAttribute('rx', '2');
                rect.setAttribute('ry', '2');
                rect.style.transition = 'all 0.8s ease';
                svg.appendChild(rect);

                // Add state label
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', x + barWidth / 2);
                text.setAttribute('y', maxHeight + 15);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-size', '10');
                text.setAttribute('fill', '#9ca3af');
                text.setAttribute('font-family', 'monospace');
                text.textContent = state;
                svg.appendChild(text);

                // Add percentage label
                const percentage = ((count / totalShots) * 100).toFixed(1);
                const percentText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                percentText.setAttribute('x', x + barWidth / 2);
                percentText.setAttribute('y', y - 5);
                percentText.setAttribute('text-anchor', 'middle');
                percentText.setAttribute('font-size', '8');
                percentText.setAttribute('fill', '#e5e7eb');
                percentText.setAttribute('font-weight', 'bold');
                percentText.textContent = `${percentage}%`;
                svg.appendChild(percentText);
            });

            histogramElement.appendChild(svg);
        }

        // Show all results in fullscreen modal
        async showAllResults() {
            try {
                // Fetch all results
                const resultsData = await this.fetchData('/api/results', 'results', []);
                const resultsArray = Array.isArray(resultsData) ? resultsData : (resultsData.results || resultsData.data || []);

                if (resultsArray.length === 0) {
                    alert('No measurement results available');
                    return;
                }

                // Create modal
                const modal = document.createElement('div');
                modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
                align-items: center; justify-content: center; padding: 2rem;
            `;

                modal.innerHTML = `
                <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); 
                           border-radius: 16px; width: 90%; max-width: 1400px; max-height: 90%; 
                           overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5); border: 1px solid rgba(6, 182, 212, 0.3);">
                    <div style="padding: 1.5rem 2rem; border-bottom: 2px solid rgba(6, 182, 212, 0.3); 
                               display: flex; justify-content: space-between; align-items: center; background: linear-gradient(90deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%);">
                        <div>
                            <h2 style="color: #06b6d4; margin: 0 0 0.3rem 0; font-size: 1.6rem; font-weight: 700; letter-spacing: -0.5px;">Measurement Results</h2>
                            <div style="color: #9ca3af; font-size: 0.85rem; font-weight: 500;">${resultsArray.length} total executions</div>
                        </div>
                        <button onclick="this.closest('.modal').remove()" 
                                style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; padding: 0.6rem 1.2rem; 
                                       border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.3s; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);"
                                onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">Close</button>
                    </div>
                    <div class="widget-content" style="max-height: calc(90vh - 120px); overflow-y: auto; padding: 1.5rem;">
                        <div id="all-results-content"></div>
                    </div>
                </div>
            `;

                modal.className = 'modal';
                document.body.appendChild(modal);

                // Render all results
                this.renderAllResults(resultsArray, document.getElementById('all-results-content'));

            } catch (error) {
                console.error('Error showing all results:', error);
                alert('Error loading results');
            }
        }

        // Render all results in the modal
        renderAllResults(resultsData, contentElement) {
            const results = Array.isArray(resultsData) ? resultsData : [resultsData];

            // Separate local and IBM results
            const localResults = results.filter(r => r.backend_name && r.backend_name.includes('Local Simulator'));
            const ibmResults = results.filter(r => !(r.backend_name && r.backend_name.includes('Local Simulator')));

            let html = `
            <div class="all-results-container">
                <div class="results-summary" style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%); 
                                                  border: 2px solid rgba(6, 182, 212, 0.3); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h3 style="color: #06b6d4; margin: 0 0 0.8rem 0; font-size: 1.2rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Results Overview</h3>
                            <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
                                <div style="background: rgba(6, 182, 212, 0.2); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.4);">
                                    <div style="font-size: 0.7rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.2rem;">IBM Quantum</div>
                                    <div style="font-size: 1.5rem; color: #06b6d4; font-weight: 700;">${ibmResults.length}</div>
                                </div>
                                <div style="background: rgba(16, 185, 129, 0.2); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.4);">
                                    <div style="font-size: 0.7rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.2rem;">Local Simulator</div>
                                    <div style="font-size: 1.5rem; color: #10b981; font-weight: 700;">${localResults.length}</div>
                                </div>
                                <div style="background: rgba(139, 92, 246, 0.2); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.4);">
                                    <div style="font-size: 0.7rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.2rem;">Total Results</div>
                                    <div style="font-size: 1.5rem; color: #8b5cf6; font-weight: 700;">${results.length}</div>
                                </div>
                            </div>
                        </div>
                        <div style="background: rgba(16, 185, 129, 0.15); padding: 0.6rem 1rem; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
                            <div style="color: #10b981; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 0.4rem;">
                                <span style="font-size: 1.2rem;">✓</span> Real Quantum Data
                            </div>
                        </div>
                    </div>
                </div>
        `;

            results.forEach((result, index) => {
                const counts = result.results?.counts || result.counts || {};
                const jobId = result.job_id || result.id || `result-${index}`;
                const backend = result.backend || result.backend_name || 'Unknown';
                const status = result.status || 'Unknown';
                const isLocal = result.is_local || (backend && backend.includes('Local Simulator'));

                // Calculate total shots and most common state
                const totalShots = Object.values(counts).reduce((sum, count) => sum + count, 0);
                const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);

                // Different styling for IBM vs Local
                const cardBg = isLocal ? 'rgba(16, 185, 129, 0.1)' : 'rgba(6, 182, 212, 0.1)';
                const cardBorder = isLocal ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 182, 212, 0.3)';
                const accentColor = isLocal ? '#10b981' : '#06b6d4';
                const typeLabel = isLocal ? 'Local Simulator' : 'IBM Quantum Hardware';
                const typeIcon = isLocal ? '' : '';

                html += `
                <div class="result-card" style="background: ${cardBg}; border: 2px solid ${cardBorder}; 
                                               border-radius: 8px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <div class="result-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
                                <div style="font-size: 1rem; color: ${accentColor}; font-weight: bold;">Job: ${jobId}</div>
                                <div style="background: ${isLocal ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.2)'}; color: ${accentColor}; padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.7rem; font-weight: 600;">
                                    ${typeIcon} ${typeLabel}
                                </div>
                            </div>
                            <div style="font-size: 0.9rem; color: #9ca3af;">${backend} • ${totalShots} shots</div>
                        </div>
                        <div class="status-badge" style="background: ${status === 'DONE' || status === 'COMPLETED' ? '#10b981' : '#f59e0b'}; 
                                                         color: white; padding: 0.3rem 0.8rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">
                            ${status === 'DONE' || status === 'COMPLETED' ? '' : ''} ${status}
                        </div>
                    </div>
                    
                    <div class="measurement-results">
                        <div style="font-size: 0.85rem; color: ${accentColor}; margin-bottom: 1rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Measurement Distribution</div>
                        <div class="counts-display" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0.8rem;">
            `;

                // Display measurement counts with IBM Quantum Platform-style formatting
                sortedCounts.forEach(([state, count]) => {
                    const percentage = totalShots > 0 ? ((count / totalShots) * 100).toFixed(2) : 0;
                    const barWidth = sortedCounts.length > 0 ? (count / Math.max(...Object.values(counts))) * 100 : 0;

                    // IBM Quantum Platform-style color coding
                    const stateColors = {
                        '00': { main: '#10b981', light: 'rgba(16, 185, 129, 0.2)' },
                        '01': { main: '#3b82f6', light: 'rgba(59, 130, 246, 0.2)' },
                        '10': { main: '#f59e0b', light: 'rgba(245, 158, 11, 0.2)' },
                        '11': { main: '#ef4444', light: 'rgba(239, 68, 68, 0.2)' },
                        '000': { main: '#10b981', light: 'rgba(16, 185, 129, 0.2)' },
                        '001': { main: '#3b82f6', light: 'rgba(59, 130, 246, 0.2)' },
                        '010': { main: '#06b6d4', light: 'rgba(6, 182, 212, 0.2)' },
                        '011': { main: '#f59e0b', light: 'rgba(245, 158, 11, 0.2)' },
                        '100': { main: '#8b5cf6', light: 'rgba(139, 92, 246, 0.2)' },
                        '101': { main: '#ec4899', light: 'rgba(236, 72, 153, 0.2)' },
                        '110': { main: '#ef4444', light: 'rgba(239, 68, 68, 0.2)' },
                        '111': { main: '#f97316', light: 'rgba(249, 115, 22, 0.2)' }
                    };

                    const colors = stateColors[state] || { main: '#8b5cf6', light: 'rgba(139, 92, 246, 0.2)' };

                    html += `
                    <div style="background: ${colors.light}; border-radius: 8px; padding: 0.7rem; border: 1px solid ${colors.main}40; transition: all 0.3s ease;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                            <div style="display: flex; align-items: center; gap: 0.6rem;">
                                <div style="background: ${colors.main}; width: 4px; height: 28px; border-radius: 2px;"></div>
                                <span style="font-family: 'Courier New', monospace; color: ${colors.main}; font-size: 1.1rem; font-weight: 700; letter-spacing: 1px;">|${state}⟩</span>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: #e5e7eb; font-size: 1rem; font-weight: 600;">${percentage}%</div>
                                <div style="color: #9ca3af; font-size: 0.75rem; font-weight: 500;">${count} shots</div>
                            </div>
                        </div>
                        <div style="background: rgba(0, 0, 0, 0.3); height: 12px; border-radius: 6px; overflow: hidden; position: relative;">
                            <div style="background: linear-gradient(90deg, ${colors.main} 0%, ${colors.main}dd 100%); height: 100%; width: ${barWidth}%; border-radius: 6px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);"></div>
                        </div>
                    </div>
                `;
                });

                html += `
                        </div>
                    </div>
                </div>
            `;
            });

            html += '</div>';
            contentElement.innerHTML = html;
        }

        // Active Jobs Widget
        async updateActiveJobsWidget() {
            // Skip if on circuit builder page or if element doesn't exist
            if (window.IS_CIRCUIT_BUILDER) {
                return;
            }

            const contentElement = document.getElementById('active-jobs-content');
            if (!contentElement) {
                // Silently skip - element may not exist on all dashboard pages
                console.debug('active-jobs-content element not found on this page - skipping update');
                return;
            }

            console.log('Updating active jobs widget...');

            try {
                const jobsData = await this.fetchData('/api/active-jobs', 'active-jobs', []);
                const jobs = Array.isArray(jobsData) ? jobsData : (jobsData.jobs || []);

                if (jobs.length > 0) {
                    this.renderActiveJobs(jobs, contentElement);
                } else {
                    this.renderEmptyState(contentElement, 'active-jobs', '⚡', 'No Active Jobs', 'Submit quantum circuits to see job progress here.');
                }
            } catch (error) {
                console.error('Error fetching active jobs:', error);
                this.renderEmptyState(contentElement, 'active-jobs', '⚡', 'No Active Jobs', 'Submit quantum circuits to see job progress here.');
            }
        }

        renderActiveJobs(jobs, contentElement) {
            let html = `
            <div class="active-jobs-container">
                <div class="jobs-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="color: #06b6d4; margin: 0; font-size: 1rem;">⚡ Active Jobs (${jobs.length})</h4>
                    <button onclick="window.quantumWidgets.refreshActiveJobs()" style="background: #06b6d4; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">  Refresh</button>
                </div>
        `;

            jobs.forEach((job, index) => {
                const status = job.status || 'UNKNOWN';
                const jobId = job.job_id || job.execution_id || `job-${index}`;
                const backend = job.backend_name || 'Unknown';
                const circuitName = job.execution_data?.circuit_name || 'Unknown Circuit';
                const createdAt = new Date(job.created_at).toLocaleTimeString();

                // Status styling and animation
                const statusConfig = this.getJobStatusConfig(status);

                html += `
                <div class="job-card" style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                    <div class="job-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                        <div>
                            <div style="font-size: 0.9rem; color: #06b6d4; font-weight: bold;">${circuitName}</div>
                            <div style="font-size: 0.8rem; color: #9ca3af;">${backend} • ${createdAt}</div>
                        </div>
                        <div class="status-container" style="display: flex; align-items: center; gap: 0.5rem;">
                            <div class="status-indicator" style="width: 8px; height: 8px; border-radius: 50%; background: ${statusConfig.color}; ${statusConfig.animation}"></div>
                            <div class="status-badge" style="background: ${statusConfig.bgColor}; color: ${statusConfig.textColor}; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.7rem; font-weight: 500;">
                                ${statusConfig.label}
                            </div>
                        </div>
                    </div>
                    
                    <div class="job-details">
                        <div style="font-size: 0.8rem; color: #9ca3af; margin-bottom: 0.5rem;">Job ID: ${jobId ? jobId.substring(0, 12) + '...' : 'N/A'}</div>
                        ${this.renderJobProgress(job, statusConfig)}
                    </div>
                </div>
            `;
            });

            html += '</div>';
            contentElement.innerHTML = html;

            // Add CSS animations if not already added
            this.addJobAnimations();

            // Start polling for active jobs
            this.startJobPolling();
        }

        addJobAnimations() {
            // Add CSS animations for job status indicators
            if (!document.getElementById('job-animations')) {
                const style = document.createElement('style');
                style.id = 'job-animations';
                style.textContent = `
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                
                @keyframes progress {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }
                
                .status-indicator {
                    transition: all 0.3s ease;
                }
                
                .job-card {
                    transition: all 0.3s ease;
                }
                
                .job-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(6, 182, 212, 0.2);
                }
            `;
                document.head.appendChild(style);
            }
        }

        getJobStatusConfig(status) {
            const statusMap = {
                'RUNNING': {
                    label: 'Running',
                    color: '#3b82f6',
                    bgColor: 'rgba(59, 130, 246, 0.2)',
                    textColor: '#3b82f6',
                    animation: 'animation: pulse 2s infinite;'
                },
                'QUEUED': {
                    label: 'Queued',
                    color: '#f59e0b',
                    bgColor: 'rgba(245, 158, 11, 0.2)',
                    textColor: '#f59e0b',
                    animation: 'animation: bounce 1s infinite;'
                },
                'DONE': {
                    label: 'Completed',
                    color: '#10b981',
                    bgColor: 'rgba(16, 185, 129, 0.2)',
                    textColor: '#10b981',
                    animation: ''
                },
                'COMPLETED': {
                    label: 'Completed',
                    color: '#10b981',
                    bgColor: 'rgba(16, 185, 129, 0.2)',
                    textColor: '#10b981',
                    animation: ''
                },
                'SUCCESS': {
                    label: 'Success',
                    color: '#10b981',
                    bgColor: 'rgba(16, 185, 129, 0.2)',
                    textColor: '#10b981',
                    animation: ''
                },
                'ERROR': {
                    label: 'Failed',
                    color: '#ef4444',
                    bgColor: 'rgba(239, 68, 68, 0.2)',
                    textColor: '#ef4444',
                    animation: ''
                },
                'FAILED': {
                    label: 'Failed',
                    color: '#ef4444',
                    bgColor: 'rgba(239, 68, 68, 0.2)',
                    textColor: '#ef4444',
                    animation: ''
                },
                'CANCELLED': {
                    label: 'Cancelled',
                    color: '#6b7280',
                    bgColor: 'rgba(107, 114, 128, 0.2)',
                    textColor: '#6b7280',
                    animation: ''
                },
                'PENDING': {
                    label: 'Pending',
                    color: '#8b5cf6',
                    bgColor: 'rgba(139, 92, 246, 0.2)',
                    textColor: '#8b5cf6',
                    animation: 'animation: pulse 2s infinite;'
                },
                'SUBMITTED': {
                    label: 'Submitted',
                    color: '#06b6d4',
                    bgColor: 'rgba(6, 182, 212, 0.2)',
                    textColor: '#06b6d4',
                    animation: 'animation: pulse 2s infinite;'
                }
            };

            // Default status for unknown values
            const defaultStatus = {
                label: status || 'Unknown',
                color: '#9ca3af',
                bgColor: 'rgba(156, 163, 175, 0.2)',
                textColor: '#9ca3af',
                animation: ''
            };

            // Safety check for undefined/null status
            if (!status || typeof status !== 'string') {
                return defaultStatus;
            }

            return statusMap[status.toUpperCase()] || defaultStatus;
        }

        renderJobProgress(job, statusConfig) {
            if (statusConfig.label === 'Running') {
                return `
                <div class="progress-container" style="margin-top: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
                        <span style="font-size: 0.8rem; color: #06b6d4;">Progress</span>
                        <span style="font-size: 0.7rem; color: #9ca3af;">Executing on quantum hardware...</span>
                    </div>
                    <div style="background: rgba(6, 182, 212, 0.2); height: 6px; border-radius: 3px; overflow: hidden;">
                        <div class="progress-bar" style="background: linear-gradient(90deg, #3b82f6, #06b6d4); height: 100%; width: 0%; border-radius: 3px; animation: progress 3s ease-in-out infinite;"></div>
                    </div>
                </div>
            `;
            } else if (statusConfig.label === 'Queued') {
                return `
                <div class="queue-info" style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(245, 158, 11, 0.1); border-radius: 4px; border-left: 3px solid #f59e0b;">
                    <div style="font-size: 0.8rem; color: #f59e0b;">  Waiting in queue...</div>
                    <div style="font-size: 0.7rem; color: #9ca3af; margin-top: 0.2rem;">Your job will start executing soon</div>
                </div>
            `;
            } else if (statusConfig.label === 'Completed') {
                // Handle nested counts structure
                let results = {};
                if (job.results_data) {
                    if (job.results_data.counts) {
                        results = job.results_data.counts;
                    } else {
                        results = job.results_data;
                    }
                }
                const resultCount = Object.keys(results).length;
                return `
                <div class="completion-info" style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 4px; border-left: 3px solid #10b981;">
                    <div style="font-size: 0.8rem; color: #10b981;">  Execution completed successfully</div>
                    <div style="font-size: 0.7rem; color: #9ca3af; margin-top: 0.2rem;">${resultCount} measurement results available</div>
                </div>
            `;
            } else if (statusConfig.label === 'Failed') {
                return `
                <div class="error-info" style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px; border-left: 3px solid #ef4444;">
                    <div style="font-size: 0.8rem; color: #ef4444;">  Execution failed</div>
                    <div style="font-size: 0.7rem; color: #9ca3af; margin-top: 0.2rem;">Check job details for error information</div>
                </div>
            `;
            }

            return '';
        }

        startJobPolling() {
            // Skip if on circuit builder page
            if (window.IS_CIRCUIT_BUILDER) {
                return;
            }

            // Clear existing polling
            if (this.jobPollingInterval) {
                clearInterval(this.jobPollingInterval);
            }

            // No independent polling - controlled by dashboard timer
        }

        refreshActiveJobs() {
            this.updateActiveJobsWidget();
        }

        // Bloch Sphere Widget - Clean 3D Sphere visualization for dashboard
        async updateBlochSphereWidget() {
            // Try to find the widget by ID first, then by data attribute
            let contentElement = document.getElementById('bloch-content');

            if (!contentElement) {
                // Find the widget container by data attribute
                const widget = document.querySelector('[data-widget="bloch-sphere"]');
                if (widget) {
                    contentElement = widget.querySelector('.widget-content');
                }
            }

            if (!contentElement) {
                console.error('  Bloch Sphere widget content element not found');
                return;
            }

            console.log('🌐 Updating Bloch sphere widget with clean 3D sphere...');

            // Hide loading state
            const loadingElement = document.getElementById('bloch-loading');
            if (loadingElement) loadingElement.style.display = 'none';
            contentElement.style.display = 'block';

            // Render the clean 3D sphere container
            const container = document.getElementById('bloch-3d-container');
            if (container) {
                // Clear container completely and render clean 3D sphere
                container.innerHTML = '';
                container.style.height = '280px';
                container.style.width = '100%';
                container.style.position = 'relative';
                container.style.background = 'linear-gradient(135deg, rgba(0,0,0,0.3), rgba(30,30,50,0.4))';
                container.style.borderRadius = '8px';

                // Create the 3D canvas container
                const canvasContainer = document.createElement('div');
                canvasContainer.style.cssText = 'width: 100%; height: 240px;';
                container.appendChild(canvasContainer);

                // Check if Three.js is available
                if (typeof THREE !== 'undefined') {
                    this.render3DBlochSphere(canvasContainer);
                } else {
                    // Fallback to canvas-based 2D sphere
                    canvasContainer.innerHTML = `
                        <canvas id="bloch-widget-canvas" style="width: 100%; height: 100%;"></canvas>
                    `;
                    setTimeout(() => this.drawSimpleBlochSphere('bloch-widget-canvas'), 50);
                }

                // Add "Open Full Simulator" button inside container
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = 'text-align: center; padding: 8px 0;';
                buttonContainer.innerHTML = `
                    <button onclick="window.location.href='/static/bloch-sphere-simulator/index.html'" 
                        style="padding: 0.5rem 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
                        transition: transform 0.2s, box-shadow 0.2s;"
                        onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 15px rgba(102,126,234,0.4)';"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                        🔮 Open Full Simulator
                    </button>
                `;
                container.appendChild(buttonContainer);

                this.showWidgetContent(contentElement);
                console.log('✅ Clean 3D Bloch sphere rendered');
            } else {
                console.error('❌ Bloch 3D container not found');
            }
        }

        // Render a clean 3D Bloch sphere using Three.js
        render3DBlochSphere(container) {
            // Setup Three.js scene
            const width = container.clientWidth;
            const height = 280;

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
            camera.position.set(0, 0, 3);

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(width, height);
            renderer.setClearColor(0x000000, 0);
            container.appendChild(renderer.domElement);

            // Create sphere
            const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
            const sphereMaterial = new THREE.MeshPhongMaterial({
                color: 0x4a90d9,
                transparent: true,
                opacity: 0.3,
                wireframe: false,
                side: THREE.DoubleSide
            });
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            scene.add(sphere);

            // Wireframe overlay
            const wireframeMaterial = new THREE.MeshBasicMaterial({
                color: 0x667eea,
                wireframe: true,
                transparent: true,
                opacity: 0.2
            });
            const wireframe = new THREE.Mesh(sphereGeometry, wireframeMaterial);
            scene.add(wireframe);

            // Add axes
            const axesMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.6 });

            // Z-axis (|0⟩ to |1⟩)
            const zAxis = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, -1.3, 0),
                new THREE.Vector3(0, 1.3, 0)
            ]);
            scene.add(new THREE.Line(zAxis, new THREE.LineBasicMaterial({ color: 0x66ff66 })));

            // X-axis
            const xAxis = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-1.3, 0, 0),
                new THREE.Vector3(1.3, 0, 0)
            ]);
            scene.add(new THREE.Line(xAxis, new THREE.LineBasicMaterial({ color: 0xff6666 })));

            // Y-axis
            const yAxis = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, -1.3),
                new THREE.Vector3(0, 0, 1.3)
            ]);
            scene.add(new THREE.Line(yAxis, new THREE.LineBasicMaterial({ color: 0x6666ff })));

            // State vector (|ψ⟩)
            const psi = new THREE.Vector3(0.5, 0.7, 0.3).normalize();
            const arrowHelper = new THREE.ArrowHelper(
                psi,
                new THREE.Vector3(0, 0, 0),
                1,
                0xffd700,
                0.15,
                0.08
            );
            scene.add(arrowHelper);

            // Add |0⟩ and |1⟩ points
            const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
            const point0 = new THREE.Mesh(pointGeometry, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
            point0.position.set(0, 1, 0);
            scene.add(point0);

            const point1 = new THREE.Mesh(pointGeometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            point1.position.set(0, -1, 0);
            scene.add(point1);

            // Lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 1);
            scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 5, 5);
            scene.add(directionalLight);

            // Animation
            let animationId;
            const animate = () => {
                animationId = requestAnimationFrame(animate);
                sphere.rotation.y += 0.003;
                wireframe.rotation.y += 0.003;
                renderer.render(scene, camera);
            };
            animate();

            // Cleanup on widget removal
            container._cleanup = () => {
                cancelAnimationFrame(animationId);
                renderer.dispose();
            };
        }

        // Circuit Widget - 3D Quantum Circuit Visualization
        async updateCircuitWidget() {
            const contentElement = document.getElementById('circuit-content');
            if (!contentElement) {
                console.error('  circuit-content element not found');
                return;
            }

            console.log('⚡ Updating 3D circuit widget with visualization...');

            // Hide loading state
            const loadingElement = document.getElementById('circuit-loading');
            if (loadingElement) loadingElement.style.display = 'none';
            contentElement.style.display = 'block';

            const circuitContainer = contentElement.querySelector('[id*="quantum-circuit"]') || document.getElementById('3d-quantum-circuit');
            if (circuitContainer) {
                // Clear container and render 3D circuit
                circuitContainer.innerHTML = '';
                circuitContainer.style.height = '280px';
                circuitContainer.style.width = '100%';
                circuitContainer.style.position = 'relative';
                circuitContainer.style.background = 'linear-gradient(135deg, rgba(6,95,70,0.3), rgba(4,120,87,0.4))';
                circuitContainer.style.borderRadius = '8px';
                circuitContainer.style.overflow = 'hidden';

                // Check if we have AI-generated circuit, otherwise show a sample circuit
                if (this.dashboard && this.dashboard.currentCircuit) {
                    const circuit = this.dashboard.currentCircuit;
                    const circuitHtml = this.render2DCircuit(circuit);
                    circuitContainer.innerHTML = `
                        <div style="padding: 1rem; height: 100%;">
                            <h4 style="color: #10b981; margin-bottom: 0.75rem; font-size: 0.9rem;">
                                🤖 AI Generated Circuit
                            </h4>
                            <div style="overflow-x: auto; height: calc(100% - 60px);">
                                ${circuitHtml}
                            </div>
                        </div>
                    `;
                } else {
                    // Render a sample 3D quantum circuit visualization
                    circuitContainer.innerHTML = `
                        <canvas id="circuit-3d-canvas" style="width: 100%; height: 100%;"></canvas>
                    `;
                    setTimeout(() => this.draw3DQuantumCircuit('circuit-3d-canvas'), 50);
                }

                // Add "Open Circuit Builder" button
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = 'position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); z-index: 10;';
                buttonContainer.innerHTML = `
                    <button onclick="window.location.href='/circuit-builder'" 
                        style="padding: 0.5rem 1rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                        color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
                        transition: transform 0.2s, box-shadow 0.2s;"
                        onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 15px rgba(16,185,129,0.4)';"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                        🔧 Open Circuit Builder
                    </button>
                `;
                circuitContainer.appendChild(buttonContainer);
            }

            this.showWidgetContent(contentElement);
            console.log('✅ 3D circuit widget rendered');
        }

        // Draw a 3D-style quantum circuit on canvas
        draw3DQuantumCircuit(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.offsetWidth || 400;
            const height = canvas.offsetHeight || 250;
            canvas.width = width;
            canvas.height = height;

            // Clear canvas with gradient background
            const bgGradient = ctx.createLinearGradient(0, 0, width, height);
            bgGradient.addColorStop(0, 'rgba(6, 95, 70, 0.4)');
            bgGradient.addColorStop(1, 'rgba(4, 120, 87, 0.5)');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);

            // Circuit parameters
            const qubits = 3;
            const padding = 50;
            const qubitSpacing = (height - 2 * padding) / (qubits - 1);
            const gateWidth = 45;
            const gateHeight = 40;
            const lineStartX = padding + 40;
            const lineEndX = width - padding - 20;

            // Draw title
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('3-Qubit Entanglement Circuit', width / 2, 25);

            // Draw 3D-effect qubit lines
            for (let i = 0; i < qubits; i++) {
                const y = padding + i * qubitSpacing;

                // Shadow line for 3D effect
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(lineStartX + 2, y + 2);
                ctx.lineTo(lineEndX + 2, y + 2);
                ctx.stroke();

                // Main wire
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(lineStartX, y);
                ctx.lineTo(lineEndX, y);
                ctx.stroke();
            }

            // Draw qubit labels with 3D effect
            ctx.font = 'bold 13px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let i = 0; i < qubits; i++) {
                const y = padding + i * qubitSpacing;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillText(`q${i}: |0⟩`, lineStartX - 8, y + 1);
                ctx.fillStyle = '#10b981';
                ctx.fillText(`q${i}: |0⟩`, lineStartX - 10, y);
            }

            // Helper function to draw 3D gate
            const draw3DGate = (x, qubitIndex, label, color) => {
                const y = padding + qubitIndex * qubitSpacing;

                // Gate shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillRect(x - gateWidth / 2 + 3, y - gateHeight / 2 + 3, gateWidth, gateHeight);

                // Gate background with gradient
                const gateGradient = ctx.createLinearGradient(x - gateWidth / 2, y - gateHeight / 2, x + gateWidth / 2, y + gateHeight / 2);
                gateGradient.addColorStop(0, color);
                gateGradient.addColorStop(1, this.darkenColor(color, 0.3));
                ctx.fillStyle = gateGradient;
                ctx.fillRect(x - gateWidth / 2, y - gateHeight / 2, gateWidth, gateHeight);

                // Gate border
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.strokeRect(x - gateWidth / 2, y - gateHeight / 2, gateWidth, gateHeight);

                // Gate label
                ctx.fillStyle = 'white';
                ctx.font = 'bold 18px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, x, y);
            };

            // Helper function to draw CNOT gate
            const draw3DCNOT = (x, controlQubit, targetQubit) => {
                const controlY = padding + controlQubit * qubitSpacing;
                const targetY = padding + targetQubit * qubitSpacing;

                // Vertical connection line shadow
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(x + 2, controlY + 2);
                ctx.lineTo(x + 2, targetY + 2);
                ctx.stroke();

                // Vertical connection line
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x, controlY);
                ctx.lineTo(x, targetY);
                ctx.stroke();

                // Control dot (filled circle)
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.arc(x, controlY, 8, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Target circle (⊕ symbol)
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x, targetY, 18, 0, 2 * Math.PI);
                ctx.stroke();

                // Cross inside target
                ctx.beginPath();
                ctx.moveTo(x - 12, targetY);
                ctx.lineTo(x + 12, targetY);
                ctx.moveTo(x, targetY - 12);
                ctx.lineTo(x, targetY + 12);
                ctx.stroke();
            };

            // Draw gates - Bell State circuit
            const gate1X = lineStartX + 80;
            const gate2X = lineStartX + 180;
            const gate3X = lineStartX + 280;

            // H gate on qubit 0
            draw3DGate(gate1X, 0, 'H', 'rgba(102, 126, 234, 0.9)');

            // CNOT between qubit 0 (control) and qubit 1 (target)
            draw3DCNOT(gate2X, 0, 1);

            // H gate on qubit 2
            draw3DGate(gate1X, 2, 'H', 'rgba(102, 126, 234, 0.9)');

            // CNOT between qubit 1 (control) and qubit 2 (target)
            draw3DCNOT(gate3X, 1, 2);

            // Draw measurement symbols
            const measureX = lineEndX - 40;
            ctx.font = 'bold 20px Inter, sans-serif';
            ctx.textAlign = 'center';
            for (let i = 0; i < qubits; i++) {
                const y = padding + i * qubitSpacing;

                // Measurement box shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(measureX - 18 + 2, y - 16 + 2, 36, 32);

                // Measurement box
                ctx.fillStyle = 'rgba(139, 92, 246, 0.8)';
                ctx.fillRect(measureX - 18, y - 16, 36, 32);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.strokeRect(measureX - 18, y - 16, 36, 32);

                // Measurement symbol (M)
                ctx.fillStyle = 'white';
                ctx.fillText('M', measureX, y + 2);
            }
        }

        // Helper to darken a color
        darkenColor(color, amount) {
            // Simple color darkening for gradients
            return color.replace(/[\d.]+\)$/, (match) => {
                const opacity = parseFloat(match);
                return `${Math.max(0, opacity - amount)})`;
            });
        }

        render2DCircuit(circuit) {
            if (!circuit || !circuit.gates || !Array.isArray(circuit.gates)) {
                return '<div style="color: var(--text-secondary);">No circuit data available</div>';
            }

            const qubits = circuit.qubits || 2;
            const depth = circuit.depth || circuit.gates.length;

            // Create qubit lines
            let html = '<div style="font-family: monospace; font-size: 12px; line-height: 1.5;">';

            // Add qubit labels
            html += '<div style="display: inline-block; margin-right: 1rem;">';
            for (let q = 0; q < qubits; q++) {
                html += `<div style="height: 20px;">q${q}:</div>`;
            }
            html += '</div>';

            // Create gate grid
            const gateGrid = [];
            for (let q = 0; q < qubits; q++) {
                gateGrid[q] = new Array(depth).fill('───');
            }

            // Place gates on the grid
            circuit.gates.forEach((gate, index) => {
                const qubitIndex = gate.qubitIndex !== undefined ? gate.qubitIndex : 0;
                const gateDepth = gate.depth !== undefined ? gate.depth : index;

                if (qubitIndex < qubits && gateDepth < depth) {
                    let gateSymbol = gate.type || 'UNK';

                    // Format gate symbols
                    if (gateSymbol.length > 3) {
                        gateSymbol = gateSymbol ? gateSymbol.substring(0, 3) : '?';
                    }

                    // Handle multi-qubit gates
                    if (gate.controlQubit !== null && gate.controlQubit !== undefined) {
                        // CNOT or controlled gate
                        if (gate.type === 'cx' || gate.type === 'cnot') {
                            gateGrid[gate.controlQubit][gateDepth] = '●──';
                            gateGrid[qubitIndex][gateDepth] = '⊕──';
                        } else {
                            gateGrid[gate.controlQubit][gateDepth] = '●──';
                            gateGrid[qubitIndex][gateDepth] = gateSymbol;
                        }
                    } else {
                        gateGrid[qubitIndex][gateDepth] = gateSymbol;
                    }
                }
            });

            // Render the grid
            for (let d = 0; d < Math.min(depth, 20); d++) { // Limit depth for display
                html += '<div style="display: inline-block; margin-right: 0.5rem;">';
                for (let q = 0; q < qubits; q++) {
                    const gateText = gateGrid[q][d] || '───';
                    html += `<div style="height: 20px; color: ${gateText.includes('●') || gateText.includes('⊕') ? '#3b82f6' : gateText === 'H' ? '#f59e0b' : gateText === 'X' ? '#ef4444' : gateText === 'Y' ? '#10b981' : gateText === 'Z' ? '#8b5cf6' : 'var(--text-primary)'};">${gateText}</div>`;
                }
                html += '</div>';
            }

            html += '</div>';
            return html;
        }

        // Entanglement Widget - Enhanced with Quantum Metrics and Graphs
        async updateEntanglementWidget() {
            const contentElement = document.getElementById('entanglement-content');
            if (!contentElement) {
                console.error('entanglement-content element not found');
                return;
            }

            const currentMode = window.dashboardMode || 'ibm';
            console.log(`🔬 Updating entanglement widget for ${currentMode} mode with quantum metrics and graphs...`);

            try {
                // PROVIDER-SCOPED FETCH - Single source of truth
                const requestedProvider = currentMode;  // Race guard
                const providerData = await window.QuantumProviders.fetchSingleProvider(requestedProvider);

                // RACE CONDITION GUARD
                if (window.dashboardMode !== requestedProvider) {
                    console.log(`  ⚠️ Provider changed during fetch (${requestedProvider} → ${window.dashboardMode}), aborting stale render`);
                    return;
                }

                // Extract results and backends from scoped provider response
                const resultsArray = providerData.provider?.results || [];
                const backends = providerData.provider?.backends || [];

                if (resultsArray.length === 0) {
                    // Show real job status for entanglement analysis
                    this.renderEntanglementJobStatus(contentElement, currentMode);
                    return;
                }

                console.log('  DEBUG: Entanglement - Results array length:', resultsArray.length);
                console.log('  DEBUG: Entanglement - Backends count:', backends.length);

                // MODE-SPECIFIC FILTERING: Only analyze current mode results
                console.log('  Original entanglement results before mode filtering:', resultsArray.map(r => ({ backend: r.backend, real_data: r.real_data, local_data: r.local_data })));

                // SYMMETRIC PROVIDER MATCHING - entanglement widget
                const modeResults = resultsArray.filter(r => {
                    const jobLike = {
                        backend_name: r.backend || r.backend_name,
                        backend: r.backend || r.backend_name,
                        real_data: r.real_data,
                        local_data: r.local_data,
                        provider: r.provider
                    };

                    const matches = this.jobMatchesProvider(jobLike, currentMode);
                    // Check for counts in multiple possible locations
                    const counts = r.counts || r.result?.counts || r.measurement_counts || {};
                    const hasCounts = counts && Object.keys(counts).length > 0;
                    // For IBM mode, accept results even without counts (they may have other data)
                    const shouldInclude = matches && (hasCounts || (currentMode === 'ibm' && r.real_data));
                    if (!shouldInclude && matches) {
                        console.log(`  ${currentMode.toUpperCase()} entanglement - Backend ${r.backend}: matches but no counts, skipped`);
                    }
                    return shouldInclude;
                });

                console.log(`  Filtered entanglement results for ${currentMode} mode: ${modeResults.length} results`);

                if (modeResults.length > 0) {
                    // Analyze the MODE-SPECIFIC results for entanglement patterns with quantum metrics
                    const entanglementMetrics = this.analyzeEntanglementWithQuantumMetrics(modeResults, backends);

                    // Render with graphs and detailed metrics
                    this.renderEnhancedEntanglementContent(entanglementMetrics, contentElement);
                } else {
                    if (currentMode === 'ibm') {
                        this.renderEmptyState(contentElement, 'entanglement', ' ', 'No IBM Circuit Results', 'Connect to IBM Quantum and run quantum circuits to see entanglement analysis.');
                    } else {
                        this.renderEmptyState(contentElement, 'entanglement', ' ', 'No Local Circuit Results', 'Run local quantum simulations to see entanglement analysis.');
                    }
                }
            } catch (error) {
                console.error('Error analyzing entanglement data:', error);
                this.renderEmptyState(contentElement, 'entanglement', '🔌', 'Error', 'Unable to analyze entanglement data.');
            }
        }

        // Render job status when no results are available for entanglement
        renderEntanglementJobStatus(contentElement, mode) {
            const modeLabel = mode === 'ibm' ? 'IBM Quantum' : 'Local Simulator';
            const modeColor = mode === 'ibm' ? '#06b6d4' : '#10b981';

            contentElement.innerHTML = `
                <div style="padding: 1rem; text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
                    <div style="color: ${modeColor}; font-weight: 600; margin-bottom: 0.5rem;">
                        No ${modeLabel} Results
                    </div>
                    <div style="color: var(--text-secondary); font-size: 0.85rem;">
                        Run quantum circuits to see entanglement analysis
                    </div>
                </div>
            `;
        }

        // Render job status when no results are available for quantum state
        renderQuantumStateJobStatus(contentElement, mode, latestResult = null) {
            const modeLabel = mode === 'ibm' ? 'IBM Quantum' : 'Local Simulator';
            const modeColor = mode === 'ibm' ? '#06b6d4' : '#10b981';

            // If we have a result, show it
            if (latestResult && latestResult.counts) {
                const counts = latestResult.counts;
                const states = Object.keys(counts);
                const totalShots = Object.values(counts).reduce((a, b) => a + b, 0);

                let statesHtml = states.slice(0, 4).map(state => {
                    const count = counts[state];
                    const prob = (count / totalShots * 100).toFixed(1);
                    return `<div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
                        <span style="font-family: monospace; color: ${modeColor};">|${state}⟩</span>
                        <span style="color: var(--text-secondary);">${prob}%</span>
                    </div>`;
                }).join('');

                contentElement.innerHTML = `
                    <div style="padding: 1rem;">
                        <div style="color: ${modeColor}; font-weight: 600; margin-bottom: 0.5rem; text-align: center;">
                            ${modeLabel} Quantum State
                        </div>
                        <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px;">
                            ${statesHtml}
                        </div>
                        <div style="color: var(--text-secondary); font-size: 0.75rem; text-align: center; margin-top: 0.5rem;">
                            ${totalShots} shots - ${states.length} states
                        </div>
                    </div>
                `;
                return;
            }

            contentElement.innerHTML = `
                <div style="padding: 1rem; text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔮</div>
                    <div style="color: ${modeColor}; font-weight: 600; margin-bottom: 0.5rem;">
                        No ${modeLabel} State Data
                    </div>
                    <div style="color: var(--text-secondary); font-size: 0.85rem;">
                        Run quantum circuits to see state analysis
                    </div>
                </div>
            `;
        }

        analyzeEntanglement(results) {
            let totalJobs = results.length;
            let entangledJobs = 0;
            let bellStateJobs = 0;
            let avgEntanglementStrength = 0;
            let totalStrength = 0;

            console.log(`Analyzing ${totalJobs} results for entanglement patterns...`);

            results.forEach((job, index) => {
                // Get counts from various possible locations
                let counts = {};

                // Try different data structures
                if (job.results && job.results.counts) {
                    counts = job.results.counts;
                } else if (job.counts) {
                    counts = job.counts;
                } else if (job.result) {
                    // Legacy format - try to parse string
                    try {
                        if (typeof job.result === 'string') {
                            const match = job.result.match(/\{[^}]+\}/);
                            if (match) {
                                counts = JSON.parse(match[0].replace(/'/g, '"'));
                            }
                        } else if (typeof job.result === 'object') {
                            counts = job.result;
                        }
                    } catch (e) {
                        console.log('Could not parse result:', job.result);
                    }
                }

                // Detect entanglement patterns
                const keys = Object.keys(counts);

                if (keys.length === 0) {
                    console.log(`Job ${index}: No counts found`);
                    return;
                }

                // Bell state detection: strong correlation in 00 and 11 or 01 and 10
                if (keys.length >= 2) {
                    const total = Object.values(counts).reduce((a, b) => a + b, 0);
                    const probs = {};
                    keys.forEach(k => {
                        probs[k] = counts[k] / total;
                    });

                    // Check for Bell-like patterns (handle both binary string and decimal formats)
                    const has00 = probs['00'] || probs['0'] || 0;
                    const has11 = probs['11'] || probs['3'] || 0;
                    const has01 = probs['01'] || probs['1'] || 0;
                    const has10 = probs['10'] || probs['2'] || 0;

                    console.log(`Job ${index} probabilities:`, { has00, has11, has01, has10 });

                    // Calculate entanglement strength based on correlation
                    const correlation1 = Math.abs(has00 - has11);
                    const correlation2 = Math.abs(has01 - has10);

                    // Bell states show strong correlation: either 00+11 or 01+10 dominate
                    if ((has00 + has11) > 0.7 || (has01 + has10) > 0.7) {
                        entangledJobs++;
                        console.log(`Job ${index}: Entangled! (00+11=${has00 + has11}, 01+10=${has01 + has10})`);

                        // Check if it's a Bell state (equal superposition)
                        if (correlation1 < 0.2 || correlation2 < 0.2) {
                            bellStateJobs++;
                            console.log(`Job ${index}: Bell state detected!`);
                        }

                        // Entanglement strength (0-1)
                        const strength = Math.max(has00 + has11, has01 + has10);
                        totalStrength += strength;
                    }
                }
            });

            avgEntanglementStrength = entangledJobs > 0 ? totalStrength / entangledJobs : 0;

            console.log(`Entanglement Analysis: ${entangledJobs}/${totalJobs} entangled, ${bellStateJobs} Bell states, avg strength: ${avgEntanglementStrength}`);

            return {
                totalJobs,
                entangledJobs,
                bellStateJobs,
                avgEntanglementStrength,
                entanglementRate: totalJobs > 0 ? (entangledJobs / totalJobs) : 0
            };
        }

        // Enhanced entanglement analysis with proper quantum metrics
        analyzeEntanglementWithQuantumMetrics(results, backends) {
            let totalJobs = results.length;
            let entangledJobs = 0;
            let bellStateJobs = 0;
            let totalConcurrence = 0;
            let totalNegativity = 0;
            let entanglementPairs = [];
            let quantumStates = [];

            console.log(`🔬 Analyzing ${totalJobs} results for quantum entanglement metrics...`);

            results.forEach((job, index) => {
                // Extract counts from results
                let counts = {};
                if (job.results && job.results.counts) {
                    counts = job.results.counts;
                } else if (job.counts) {
                    counts = job.counts;
                } else if (job.results_data) {
                    try {
                        const parsed = typeof job.results_data === 'string' ? JSON.parse(job.results_data) : job.results_data;
                        counts = parsed.counts || parsed;
                    } catch (e) { }
                }

                const keys = Object.keys(counts);
                if (keys.length === 0) return;

                // Calculate probabilities
                const total = Object.values(counts).reduce((a, b) => a + b, 0);
                const probs = {};
                keys.forEach(k => {
                    probs[k] = counts[k] / total;
                });

                // Detect entanglement patterns
                const has00 = probs['00'] || probs['0'] || 0;
                const has11 = probs['11'] || probs['3'] || 0;
                const has01 = probs['01'] || probs['1'] || 0;
                const has10 = probs['10'] || probs['2'] || 0;

                // Calculate Concurrence (measure of entanglement for 2-qubit systems)
                // Concurrence C = 2 * |α * δ - β * γ| for state α|00⟩ + β|01⟩ + γ|10⟩ + δ|11⟩
                const alpha = Math.sqrt(has00);
                const beta = Math.sqrt(has01);
                const gamma = Math.sqrt(has10);
                const delta = Math.sqrt(has11);
                const concurrence = 2 * Math.abs(alpha * delta - beta * gamma);

                // Calculate Negativity (another entanglement measure)
                // Simplified negativity based on correlation
                const correlation = Math.abs(has00 + has11 - has01 - has10);
                const negativity = Math.max(0, correlation - 0.5) * 2;

                // Check for entanglement (Concurrence > 0)
                if (concurrence > 0.1) {
                    entangledJobs++;
                    totalConcurrence += concurrence;
                    totalNegativity += negativity;

                    // Store entanglement pair data for graphing
                    entanglementPairs.push({
                        jobIndex: index,
                        concurrence: concurrence,
                        negativity: negativity,
                        qubits: [0, 1] // Assuming 2-qubit system
                    });

                    // Check for Bell state (maximal entanglement)
                    if (concurrence > 0.9 && Math.abs(has00 - has11) < 0.1 || Math.abs(has01 - has10) < 0.1) {
                        bellStateJobs++;
                    }
                }

                // Store quantum state for visualization
                quantumStates.push({
                    probabilities: [has00, has01, has10, has11],
                    entangled: concurrence > 0.1
                });
            });

            const avgConcurrence = entangledJobs > 0 ? totalConcurrence / entangledJobs : 0;
            const avgNegativity = entangledJobs > 0 ? totalNegativity / entangledJobs : 0;

            console.log(`🔬 Quantum Metrics: ${entangledJobs}/${totalJobs} entangled, avg concurrence: ${avgConcurrence.toFixed(3)}, avg negativity: ${avgNegativity.toFixed(3)}`);

            return {
                totalJobs,
                entangledJobs,
                bellStateJobs,
                avgConcurrence,
                avgNegativity,
                entanglementRate: totalJobs > 0 ? (entangledJobs / totalJobs) : 0,
                entanglementPairs,
                quantumStates,
                backends: backends || []
            };
        }

        // Enhanced rendering with graphs and quantum metrics
        renderEnhancedEntanglementContent(metrics, contentElement) {
            const entanglementHtml = `
            <div class="widget-content" style="padding: 1rem; max-height: 380px; overflow-y: auto;">
                <!-- Quantum Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
                    <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1)); padding: 1rem; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.4); text-align: center;">
                        <div style="font-size: 1.8rem; color: #8b5cf6; font-weight: bold; margin-bottom: 0.25rem;">${metrics.entangledJobs}</div>
                        <div style="color: var(--text-secondary); font-size: 0.75rem;">Entangled Circuits</div>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(6, 182, 212, 0.1)); padding: 1rem; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.4); text-align: center;">
                        <div style="font-size: 1.8rem; color: #06b6d4; font-weight: bold; margin-bottom: 0.25rem;">${metrics.bellStateJobs}</div>
                        <div style="color: var(--text-secondary); font-size: 0.75rem;">Bell States</div>
                    </div>
                </div>
                
                <!-- Quantum Entanglement Measures -->
                <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1)); padding: 1rem; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.4); margin-bottom: 1rem;">
                    <h4 style="color: #10b981; margin: 0 0 0.75rem 0; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.2rem;">🔬</span>
                        Quantum Entanglement Measures
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; color: #10b981; font-weight: bold;">${metrics.avgConcurrence.toFixed(3)}</div>
                            <div style="color: var(--text-secondary); font-size: 0.75rem;">Avg Concurrence</div>
                            <div style="color: #9ca3af; font-size: 0.65rem; margin-top: 0.25rem;">(0-1 scale)</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; color: #10b981; font-weight: bold;">${metrics.avgNegativity.toFixed(3)}</div>
                            <div style="color: var(--text-secondary); font-size: 0.75rem;">Avg Negativity</div>
                            <div style="color: #9ca3af; font-size: 0.65rem; margin-top: 0.25rem;">(entanglement witness)</div>
                        </div>
                    </div>
                </div>
                
                <!-- Entanglement Graph Container -->
                <div id="entanglement-graph" style="width: 100%; height: 200px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; border: 1px solid var(--glass-border); margin-bottom: 1rem;"></div>
                
                <!-- Analysis Summary -->
                <div style="padding: 0.75rem; background: var(--glass-bg); border-radius: 8px; border: 1px solid var(--glass-border);">
                    <h4 style="color: var(--text-primary); margin: 0 0 0.5rem 0; font-size: 0.85rem; font-weight: 600;">  Analysis Summary</h4>
                    <div style="color: var(--text-secondary); font-size: 0.75rem; line-height: 1.6;">
                        <div style="display: flex; justify-content: space-between; margin: 0.25rem 0;">
                            <span>Total Jobs Analyzed:</span>
                            <span style="color: var(--text-primary); font-weight: bold;">${metrics.totalJobs}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 0.25rem 0;">
                            <span>Entanglement Rate:</span>
                            <span style="color: #10b981; font-weight: bold;">${(metrics.entanglementRate * 100).toFixed(1)}%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 0.25rem 0;">
                            <span>Quantum State:</span>
                            <span style="color: #8b5cf6; font-weight: bold;">${metrics.entangledJobs > 0 ? 'Entangled' : 'Separable'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

            contentElement.innerHTML = entanglementHtml;
            this.showWidgetContent(contentElement);

            // Render entanglement graph with Plotly
            setTimeout(() => this.renderEntanglementGraph(metrics), 100);
        }

        // Render entanglement connectivity graph
        renderEntanglementGraph(metrics) {
            const graphContainer = document.getElementById('entanglement-graph');
            if (!graphContainer || typeof Plotly === 'undefined') {
                console.log('Plotly not available or container not found for entanglement graph');
                return;
            }

            try {
                // Create bar chart showing concurrence and negativity for each entangled circuit
                const data = [{
                    x: metrics.entanglementPairs.map((_, i) => `Circuit ${i + 1}`),
                    y: metrics.entanglementPairs.map(p => p.concurrence),
                    type: 'bar',
                    name: 'Concurrence',
                    marker: {
                        color: '#8b5cf6',
                        line: { color: '#a855f7', width: 1 }
                    }
                }, {
                    x: metrics.entanglementPairs.map((_, i) => `Circuit ${i + 1}`),
                    y: metrics.entanglementPairs.map(p => p.negativity),
                    type: 'bar',
                    name: 'Negativity',
                    marker: {
                        color: '#10b981',
                        line: { color: '#059669', width: 1 }
                    }
                }];

                const layout = {
                    title: {
                        text: 'Entanglement Metrics by Circuit',
                        font: { size: 12, color: '#e5e7eb' }
                    },
                    xaxis: {
                        title: '',
                        color: '#9ca3af',
                        gridcolor: 'rgba(156, 163, 175, 0.1)'
                    },
                    yaxis: {
                        title: 'Measure Value',
                        color: '#9ca3af',
                        gridcolor: 'rgba(156, 163, 175, 0.1)',
                        range: [0, 1]
                    },
                    paper_bgcolor: 'rgba(0, 0, 0, 0.2)',
                    plot_bgcolor: 'rgba(0, 0, 0, 0.1)',
                    font: { color: '#e5e7eb', size: 10 },
                    margin: { l: 40, r: 20, t: 40, b: 40 },
                    showlegend: true,
                    legend: {
                        x: 1,
                        xanchor: 'right',
                        y: 1,
                        font: { size: 10 }
                    }
                };

                const config = {
                    responsive: true,
                    displayModeBar: false
                };

                Plotly.newPlot(graphContainer, data, layout, config);
                console.log('  Entanglement graph rendered successfully');
            } catch (error) {
                console.error('Error rendering entanglement graph:', error);
                graphContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af; font-size: 0.8rem;">Entanglement graph unavailable</div>';
            }
        }


        // Quantum State Widget
        async updateQuantumStateWidget() {
            const contentElement = document.getElementById('quantum-state-content');
            if (!contentElement) {
                console.error('quantum-state-content element not found');
                return;
            }

            const currentMode = window.dashboardMode || 'ibm';
            console.log(`Updating quantum state widget for ${currentMode} mode - using results data...`);

            try {
                // PROVIDER-SCOPED FETCH - Single source of truth
                const requestedProvider = currentMode;  // Race guard
                const providerData = await window.QuantumProviders.fetchSingleProvider(requestedProvider);

                // RACE CONDITION GUARD
                if (window.dashboardMode !== requestedProvider) {
                    console.log(`  ⚠️ Provider changed during fetch (${requestedProvider} → ${window.dashboardMode}), aborting stale render`);
                    return;
                }

                // Extract results from scoped provider response
                const resultsArray = providerData.provider?.results || [];

                if (resultsArray.length === 0) {
                    // Show real job status for quantum state analysis
                    this.renderQuantumStateJobStatus(contentElement, currentMode);
                    return;
                }

                console.log('  DEBUG: Quantum State - Results array length:', resultsArray.length);

                // MODE-SPECIFIC FILTERING: Only show current mode results
                console.log('  Original quantum state results before mode filtering:', resultsArray.map(r => ({ backend: r.backend, real_data: r.real_data, local_data: r.local_data })));

                // SYMMETRIC PROVIDER MATCHING - quantum state widget
                const modeResults = resultsArray.filter(r => {
                    const jobLike = {
                        backend_name: r.backend || r.backend_name,
                        backend: r.backend || r.backend_name,
                        real_data: r.real_data,
                        local_data: r.local_data,
                        provider: r.provider
                    };

                    const matches = this.jobMatchesProvider(jobLike, currentMode);
                    // Check for counts in multiple possible locations
                    const counts = r.counts || r.result?.counts || r.measurement_counts || {};
                    const hasCounts = counts && Object.keys(counts).length > 0;
                    // For IBM mode, accept results even without counts
                    const shouldInclude = matches && (hasCounts || (currentMode === 'ibm' && r.real_data));
                    return shouldInclude;
                });

                console.log(`  Filtered quantum state results for ${currentMode} mode: ${modeResults.length} results`);

                // Check if we have valid results with counts
                let stateRendered = false;

                if (modeResults.length > 0) {
                    // Try to find a result with valid counts
                    let latestResult = null;
                    let counts = {};

                    // Iterate through results to find one with counts
                    for (const result of modeResults) {
                        // Try multiple possible locations for counts
                        let resultCounts = result.counts
                            || result.results?.counts
                            || result.result?.counts
                            || result.measurement_counts
                            || {};

                        // Also check results_data which might be a JSON string
                        if (Object.keys(resultCounts).length === 0 && result.results_data) {
                            try {
                                const parsedData = typeof result.results_data === 'string'
                                    ? JSON.parse(result.results_data)
                                    : result.results_data;
                                resultCounts = parsedData.counts || parsedData || {};
                            } catch (e) {
                                console.log('Could not parse results_data:', e.message);
                            }
                        }

                        if (Object.keys(resultCounts).length > 0) {
                            latestResult = result;
                            counts = resultCounts;
                            break; // Found a result with counts
                        }
                    }

                    // Fall back to first result if none have counts
                    if (!latestResult) {
                        latestResult = modeResults[0];
                    }

                    if (Object.keys(counts).length > 0) {
                        // Calculate state representation from measurement counts
                        const totalShots = Object.values(counts).reduce((sum, count) => sum + count, 0);
                        const states = Object.keys(counts).sort();

                        let stateRepresentation = "|ψ⟩ = ";
                        states.forEach((state, index) => {
                            const probability = counts[state] / totalShots;
                            const amplitude = Math.sqrt(probability).toFixed(3);
                            if (index > 0) stateRepresentation += " + ";
                            stateRepresentation += `${amplitude}|${state}⟩`;
                        });

                        const stateHtml = `
                        <div style="padding: 1rem;">
                            <h4 style="color: var(--text-primary); margin-bottom: 1rem;">Quantum State</h4>
                            <div style="font-family: monospace; margin: 1rem 0; padding: 1rem; background: var(--glass-bg); border-radius: 8px; border: 1px solid var(--glass-border); text-align: center; font-size: 0.9rem; word-wrap: break-word;">
                                ${stateRepresentation}
                            </div>
                            <div style="text-align: center; font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;">
                                Based on ${totalShots} measurements from ${latestResult.backend_name || latestResult.backend || 'Quantum Backend'} 
                                <span style="color: ${currentMode === 'ibm' ? '#06b6d4' : '#10b981'}; font-weight: 500;">(${currentMode === 'ibm' ? 'IBM Quantum' : 'Local Simulator'})</span>
                            </div>
                        </div>
                    `;

                        contentElement.innerHTML = stateHtml;
                        this.showWidgetContent(contentElement);
                        console.log('✅ Quantum state widget updated with calculated state');
                        stateRendered = true;
                    } else {
                        // Results exist but no counts - show info about pending results
                        console.log('⚠️ Results found but no counts available yet');
                        const jobId = latestResult.job_id || latestResult.id || 'Unknown';
                        const backend = latestResult.backend_name || latestResult.backend || 'Unknown';

                        const pendingHtml = `
                        <div style="padding: 1rem; text-align: center;">
                            <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏳</div>
                            <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">Awaiting Measurement Results</h4>
                            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem;">
                                ${modeResults.length} job(s) found on ${currentMode === 'ibm' ? 'IBM Quantum' : 'Local Simulator'}
                            </p>
                            <div style="background: var(--glass-bg); border-radius: 8px; padding: 0.75rem; border: 1px solid var(--glass-border);">
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                    <div>Latest Job: <span style="font-family: monospace; color: ${currentMode === 'ibm' ? '#06b6d4' : '#10b981'};">${jobId.substring(0, 16)}...</span></div>
                                    <div style="margin-top: 0.25rem;">Backend: <span style="color: var(--text-primary);">${backend}</span></div>
                                </div>
                            </div>
                        </div>
                        `;
                        contentElement.innerHTML = pendingHtml;
                        this.showWidgetContent(contentElement);
                        console.log('✅ Quantum state widget showing pending results state');
                        stateRendered = true;
                    }
                }

                // If nothing was rendered, show empty state
                if (!stateRendered) {
                    if (currentMode === 'ibm') {
                        this.renderEmptyState(contentElement, 'quantum-state', '🌐', 'No IBM Quantum State Data', 'Connect to IBM Quantum and run circuits to see state representations.');
                    } else {
                        this.renderEmptyState(contentElement, 'quantum-state', '💻', 'No Local Quantum State Data', 'Run local quantum simulations to see state representations.');
                    }
                }
            } catch (error) {
                console.error('Error calculating quantum state:', error);
                this.renderEmptyState(contentElement, 'quantum-state', '🔌', 'Error', 'Unable to calculate quantum state.');
            }
        }
        // }

        async updateAIChatWidget() {
            console.log('🤖 Updating AI Chat widget...');
            const contentElement = document.getElementById('ai-chat-content');
            const loadingElement = document.getElementById('ai-chat-loading');
            if (!contentElement) return;
            if (loadingElement) loadingElement.style.display = 'none';
            contentElement.style.display = 'block';
            const sendBtn = document.getElementById('send-message');
            const chatInput = document.getElementById('chat-input');
            const chatMessages = document.getElementById('chat-messages');
            if (sendBtn && chatInput && chatMessages) {
                sendBtn.onclick = async () => {
                    const msg = chatInput.value.trim();
                    if (!msg) return;
                    chatMessages.innerHTML += `<div class="message user-message"><div class="message-content">${msg}</div></div>`;
                    chatInput.value = '';
                    try {
                        // Call the Gemini-powered quantum chat endpoint
                        const response = await fetch('/api/ai/quantum_chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message: msg })
                        });
                        const data = await response.json();
                        // Extract the AI response from the proper field
                        const aiResponse = data.ai_response || data.response || 'I apologize, but I encountered an error. Please try again.';

                        // Format the response with syntax highlighting
                        const formattedResponse = this.formatAIResponse(aiResponse);

                        chatMessages.innerHTML += `<div class="message ai-message"><div class="message-content"><i class="fas fa-robot"></i> ${formattedResponse}</div></div>`;
                        chatMessages.scrollTop = chatMessages.scrollHeight;

                        // Attach copy button listeners
                        chatMessages.querySelectorAll('.copy-code-btn').forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const pre = e.target.closest('.code-block-container').querySelector('pre code');
                                const code = pre.textContent;
                                navigator.clipboard.writeText(code).then(() => {
                                    const originalText = e.target.innerHTML;
                                    e.target.innerHTML = '<i class="fas fa-check"></i> Copied';
                                    setTimeout(() => {
                                        e.target.innerHTML = originalText;
                                    }, 2000);
                                });
                            });
                        });
                    } catch (error) {
                        console.error('AI Chat Error:', error);
                        chatMessages.innerHTML += `<div class="message ai-message"><div class="message-content"><i class="fas fa-robot"></i> Sorry, I'm having trouble connecting to the AI service.</div></div>`;
                    }
                };
                chatInput.onkeypress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); } };
            }
        }

        formatAIResponse(text) {
            if (!text) return '';

            let html = text;
            const codeBlocks = [];

            // 1. Aggressive fallback for unwrapped code
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
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
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

            // 3. Escape remaining text to prevent XSS
            html = html
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            // 4. Handle Markdown formatting
            // Inline code
            html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(167,139,250,0.15); padding:4px 8px; border-radius:6px; font-family:\'IBM Plex Mono\', monospace; color:#c084fc; font-size:13px; border:1px solid rgba(167,139,250,0.3);">$1</code>');

            // Bold/Italic
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#a78bfa; font-weight:700;">$1</strong>');
            html = html.replace(/\*(.*?)\*/g, '<em style="color:#c4b5fd;">$1</em>');

            // Lists
            html = html.replace(/^\s*[-•]\s+(.*)$/gm, '<li style="margin:6px 0; color:#e0e7ff; line-height:1.6;">$1</li>');
            html = html.replace(/(<li.*<\/li>)/s, '<ul style="padding-left:28px; margin:12px 0; list-style-type:disc;">$1</ul>');

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


        // Historical Data Widget - Full Featured
        async updateHistoricalDataWidget() {
            console.log('📊 Updating Historical Data widget...');
            const contentElement = document.getElementById('historical-data-content');
            const loadingElement = document.getElementById('historical-data-loading');
            if (!contentElement) return;
            if (loadingElement) loadingElement.style.display = 'flex';
            contentElement.style.display = 'none';

            try {
                // Fetch directly to bypass cache issues
                const response = await fetch('/api/historical_data?days_back=30');
                const data = await response.json();

                if (loadingElement) loadingElement.style.display = 'none';
                contentElement.style.display = 'block';

                console.log('📊 Historical Data API response:', data);

                let snapshots = [];
                // Check 'snapshots' key FIRST (raw snapshot objects)
                if (data && data.snapshots && Array.isArray(data.snapshots)) {
                    snapshots = data.snapshots;
                    console.log('📊 Using data.snapshots:', snapshots.length);
                } else if (data && data.data && Array.isArray(data.data)) {
                    // Fallback: check if data.data contains snapshot objects (not chart data)
                    // Snapshot objects have 'id', 'snapshot_name', 'backends_data' etc.
                    if (data.data.length > 0 && data.data[0].id !== undefined && data.data[0].backends_data !== undefined) {
                        snapshots = data.data;
                        console.log('📊 Using data.data (snapshot format):', snapshots.length);
                    }
                } else if (Array.isArray(data)) {
                    snapshots = data;
                }

                console.log(`📊 Found ${snapshots.length} snapshots to render`);
                this.renderHistoricalDataContent(snapshots, contentElement);
            } catch (error) {
                console.error('Error in Historical Data widget:', error);
                if (loadingElement) loadingElement.style.display = 'none';
                contentElement.style.display = 'block';
                contentElement.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ef4444;">Error loading data</div>';
            }
        }

        renderHistoricalDataContent(snapshots, container) {
            const hasSnapshots = snapshots && snapshots.length > 0;
            container.innerHTML = `
                <div style="padding: 1rem;">
                    <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                        <button onclick="window.quantumWidgets && window.quantumWidgets.takeSnapshot()" 
                            style="flex: 1; padding: 0.5rem; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                            <i class="fas fa-camera"></i> Snapshot
                        </button>
                        <button onclick="window.open('/api/historical_data/download?format=json', '_blank')" 
                            style="flex: 1; padding: 0.5rem; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button onclick="window.quantumWidgets && window.quantumWidgets.updateHistoricalDataWidget()" 
                            style="padding: 0.5rem; background: var(--glass-bg); color: white; border: 1px solid var(--glass-border); border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
                        <div style="background: rgba(59, 130, 246, 0.2); padding: 0.5rem; border-radius: 6px; text-align: center;">
                            <div style="font-size: 1.2rem; font-weight: bold; color: #3b82f6;">${snapshots.length}</div>
                            <div style="font-size: 0.65rem; color: var(--text-secondary);">Snapshots</div>
                        </div>
                        <div style="background: rgba(16, 185, 129, 0.2); padding: 0.5rem; border-radius: 6px; text-align: center;">
                            <div style="font-size: 1.2rem; font-weight: bold; color: #10b981;">24h</div>
                            <div style="font-size: 0.65rem; color: var(--text-secondary);">Coverage</div>
                        </div>
                        <div style="background: rgba(139, 92, 246, 0.2); padding: 0.5rem; border-radius: 6px; text-align: center;">
                            <div style="font-size: 1.2rem; font-weight: bold; color: #8b5cf6;">Active</div>
                            <div style="font-size: 0.65rem; color: var(--text-secondary);">Status</div>
                        </div>
                    </div>
                    ${hasSnapshots ? this.renderSnapshotsList(snapshots) : this.renderEmptyHistoricalState()}
                </div>
            `;
        }

        renderSnapshotsList(snapshots) {
            const displaySnapshots = snapshots.slice(0, 5);
            const hasMore = snapshots.length > 5;

            let html = displaySnapshots.map((snap, i) => `
                <div style="background: var(--glass-bg); padding: 0.6rem; margin-bottom: 0.4rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid ${snap.snapshot_trigger === 'auto' ? '#10b981' : '#3b82f6'};">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 0.85rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${snap.snapshot_name || `Snapshot #${i + 1}`}</div>
                        <div style="font-size: 0.7rem; color: var(--text-secondary); display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <span>🕐 ${snap.timestamp ? new Date(snap.timestamp).toLocaleString() : 'Just now'}</span>
                            <span>💻 ${(snap.backends_data || []).length} backends</span>
                            <span>📋 ${(snap.jobs_data || []).length} jobs</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.25rem;">
                        <button onclick="window.quantumWidgets && window.quantumWidgets.viewSnapshotDetails(${snap.id})" 
                            style="padding: 0.25rem 0.4rem; background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: none; border-radius: 4px; cursor: pointer; font-size: 0.7rem;" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="window.quantumWidgets && window.quantumWidgets.deleteSnapshot(${snap.id || i})" 
                            style="padding: 0.25rem 0.4rem; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: none; border-radius: 4px; cursor: pointer; font-size: 0.7rem;" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            // Add "View All" button if more than 5 snapshots
            if (hasMore) {
                html += `
                    <button onclick="window.quantumWidgets && window.quantumWidgets.showAllSnapshotsModal()" 
                        style="width: 100%; padding: 0.5rem; margin-top: 0.5rem; background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3)); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                        <i class="fas fa-expand"></i> View All ${snapshots.length} Snapshots
                    </button>
                `;
            }

            return html;
        }

        renderEmptyHistoricalState() {
            return `
                <div style="text-align: center; padding: 1.5rem;">
                    <i class="fas fa-history" style="font-size: 2rem; color: rgba(255,255,255,0.3); margin-bottom: 0.75rem;"></i>
                    <h4 style="color: var(--text-primary); margin-bottom: 0.5rem; font-size: 0.95rem;">No Snapshots Yet</h4>
                    <p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.75rem;">Take snapshots to track history</p>
                    <button onclick="window.quantumWidgets && window.quantumWidgets.takeSnapshot()" 
                        style="padding: 0.4rem 0.8rem; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                        <i class="fas fa-camera"></i> Take First Snapshot
                    </button>
                </div>
            `;
        }

        // Store snapshots for modal use
        _cachedSnapshots = [];

        async showAllSnapshotsModal() {
            // Fetch all snapshots
            try {
                const response = await fetch('/api/historical_data?days_back=90');
                const data = await response.json();
                const snapshots = data.snapshots || [];

                this.renderSnapshotsModal(snapshots);
            } catch (error) {
                console.error('Error fetching snapshots for modal:', error);
                alert('❌ Could not load snapshots');
            }
        }

        renderSnapshotsModal(snapshots) {
            // Remove existing modal if any
            const existingModal = document.getElementById('snapshots-fullscreen-modal');
            if (existingModal) existingModal.remove();

            const modalHtml = `
                <div id="snapshots-fullscreen-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 2rem;">
                    <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 16px; width: 90%; max-width: 900px; max-height: 90vh; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
                        <!-- Header -->
                        <div style="padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h2 style="margin: 0; color: #fff; font-size: 1.5rem;">📊 All Snapshots</h2>
                                <p style="margin: 0.5rem 0 0 0; color: rgba(255,255,255,0.6); font-size: 0.85rem;">${snapshots.length} snapshots stored</p>
                            </div>
                            <button onclick="document.getElementById('snapshots-fullscreen-modal').remove()" 
                                style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                                <i class="fas fa-times"></i> Close
                            </button>
                        </div>
                        
                        <!-- Snapshots List -->
                        <div style="flex: 1; overflow-y: auto; padding: 1rem;">
                            ${snapshots.map((snap, i) => this.renderModalSnapshotItem(snap, i)).join('')}
                        </div>
                        
                        <!-- Footer -->
                        <div style="padding: 1rem; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 0.5rem; justify-content: flex-end;">
                            <button onclick="window.open('/api/historical_data/download?format=csv', '_blank')" 
                                style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-file-csv"></i> Export CSV
                            </button>
                            <button onclick="window.open('/api/historical_data/download?format=json', '_blank')" 
                                style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-file-code"></i> Export JSON
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Close on backdrop click
            document.getElementById('snapshots-fullscreen-modal').addEventListener('click', (e) => {
                if (e.target.id === 'snapshots-fullscreen-modal') {
                    e.target.remove();
                }
            });
        }

        renderModalSnapshotItem(snap, index) {
            const backends = snap.backends_data || [];
            const jobs = snap.jobs_data || [];
            const perf = snap.performance_data || {};
            const triggerColor = snap.snapshot_trigger === 'auto' ? '#10b981' : '#3b82f6';
            const triggerIcon = snap.snapshot_trigger === 'auto' ? '🤖' : '👆';

            return `
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem; border-left: 4px solid ${triggerColor};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                        <div style="flex: 1; min-width: 200px;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <span style="font-size: 1rem; font-weight: 600; color: #fff;">${snap.snapshot_name || `Snapshot #${index + 1}`}</span>
                                <span style="font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 0.15rem 0.4rem; border-radius: 4px;">${triggerIcon}</span>
                            </div>
                            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">
                                🕐 ${snap.timestamp ? new Date(snap.timestamp).toLocaleString() : 'Unknown'} • 
                                📅 ${snap.retention_days || 7} days retention
                            </div>
                            ${snap.notes ? `<div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 0.25rem; font-style: italic;">📝 ${snap.notes}</div>` : ''}
                        </div>
                        
                        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                            <div style="text-align: center; background: rgba(59, 130, 246, 0.2); padding: 0.5rem 1rem; border-radius: 8px;">
                                <div style="font-size: 1.2rem; font-weight: bold; color: #60a5fa;">${backends.length}</div>
                                <div style="font-size: 0.65rem; color: rgba(255,255,255,0.6);">Backends</div>
                            </div>
                            <div style="text-align: center; background: rgba(16, 185, 129, 0.2); padding: 0.5rem 1rem; border-radius: 8px;">
                                <div style="font-size: 1.2rem; font-weight: bold; color: #34d399;">${jobs.length}</div>
                                <div style="font-size: 0.65rem; color: rgba(255,255,255,0.6);">Jobs</div>
                            </div>
                            <div style="text-align: center; background: rgba(245, 158, 11, 0.2); padding: 0.5rem 1rem; border-radius: 8px;">
                                <div style="font-size: 1.2rem; font-weight: bold; color: #fbbf24;">${perf.success_rate || 0}%</div>
                                <div style="font-size: 0.65rem; color: rgba(255,255,255,0.6);">Success</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="window.quantumWidgets.viewSnapshotDetails(${snap.id})" 
                                style="padding: 0.5rem 0.75rem; background: rgba(59, 130, 246, 0.3); color: #60a5fa; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button onclick="window.quantumWidgets.deleteSnapshot(${snap.id})" 
                                style="padding: 0.5rem 0.75rem; background: rgba(239, 68, 68, 0.2); color: #f87171; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        async viewSnapshotDetails(snapshotId) {
            try {
                const response = await fetch(`/api/historical_data/${snapshotId}`);
                const result = await response.json();

                if (result.success && result.snapshot) {
                    this.showSnapshotDetailsModal(result.snapshot);
                } else {
                    alert('❌ Could not load snapshot details');
                }
            } catch (error) {
                console.error('Error viewing snapshot:', error);
                alert('❌ Error loading snapshot details');
            }
        }

        showSnapshotDetailsModal(snapshot) {
            const backends = snapshot.backends_data || [];
            const jobs = snapshot.jobs_data || [];
            const perf = snapshot.performance_data || {};

            // Remove existing modal if any
            const existingModal = document.getElementById('snapshot-details-modal');
            if (existingModal) existingModal.remove();

            const modalHtml = `
                <div id="snapshot-details-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 2rem;">
                    <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 16px; max-width: 700px; width: 90%; max-height: 85vh; overflow: auto; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                            <h3 style="margin: 0; color: #fff; font-size: 1.25rem;">${snapshot.snapshot_name || 'Snapshot Details'}</h3>
                            <button onclick="document.getElementById('snapshot-details-modal').remove()" 
                                style="background: none; border: none; color: #fff; font-size: 1.5rem; cursor: pointer;">&times;</button>
                        </div>
                        
                        <div style="font-size: 0.85rem; color: rgba(255,255,255,0.6); margin-bottom: 1.5rem;">
                            🕐 Created: ${new Date(snapshot.timestamp).toLocaleString()}<br>
                            ${snapshot.snapshot_trigger === 'auto' ? '🤖 Auto-generated' : '👆 Manual snapshot'}
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="background: rgba(59, 130, 246, 0.2); padding: 1rem; border-radius: 10px; text-align: center;">
                                <div style="font-size: 1.75rem; font-weight: bold; color: #60a5fa;">${backends.length}</div>
                                <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Backends</div>
                            </div>
                            <div style="background: rgba(16, 185, 129, 0.2); padding: 1rem; border-radius: 10px; text-align: center;">
                                <div style="font-size: 1.75rem; font-weight: bold; color: #34d399;">${jobs.length}</div>
                                <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Jobs</div>
                            </div>
                            <div style="background: rgba(245, 158, 11, 0.2); padding: 1rem; border-radius: 10px; text-align: center;">
                                <div style="font-size: 1.75rem; font-weight: bold; color: #fbbf24;">${perf.success_rate || 0}%</div>
                                <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Success Rate</div>
                            </div>
                            <div style="background: rgba(139, 92, 246, 0.2); padding: 1rem; border-radius: 10px; text-align: center;">
                                <div style="font-size: 1.75rem; font-weight: bold; color: #a78bfa;">${snapshot.retention_days || 7}</div>
                                <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Days Retention</div>
                            </div>
                        </div>

                        ${backends.length > 0 ? `
                            <h4 style="color: #fff; margin: 1rem 0 0.5rem; font-size: 0.95rem;">💻 Backends Captured</h4>
                            <div style="max-height: 150px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 0.5rem;">
                                ${backends.map(b => `
                                    <div style="padding: 0.4rem 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.8rem;">
                                        <span style="color: #fff; font-weight: 500;">${b.name}</span>
                                        <span style="color: rgba(255,255,255,0.5);"> - ${b.num_qubits} qubits</span>
                                        <span style="float: right; color: ${b.operational ? '#34d399' : '#f87171'};">${b.operational ? '✅ Active' : '⏸️ Offline'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        ${snapshot.notes ? `
                            <h4 style="color: #fff; margin: 1rem 0 0.5rem; font-size: 0.95rem;">📝 Notes</h4>
                            <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px;">${snapshot.notes}</p>
                        ` : ''}
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Close on backdrop click
            document.getElementById('snapshot-details-modal').addEventListener('click', (e) => {
                if (e.target.id === 'snapshot-details-modal') {
                    e.target.remove();
                }
            });
        }

        async takeSnapshot() {
            console.log('📸 Taking snapshot...');
            try {
                // Fetch fresh data from APIs to ensure we have current state
                let backends = this.sharedData.backends || [];
                let jobs = this.sharedData.jobs || [];

                // Ensure backends is an array
                if (!Array.isArray(backends)) {
                    backends = backends.backends || backends.data || [];
                }

                // Ensure jobs is an array
                if (!Array.isArray(jobs)) {
                    jobs = jobs.jobs || jobs.data || [];
                }

                // If no cached data, fetch fresh
                if (backends.length === 0) {
                    try {
                        const backendsRes = await fetch('/api/backends');
                        const backendsData = await backendsRes.json();
                        backends = Array.isArray(backendsData) ? backendsData : (backendsData.backends || backendsData.data || []);
                    } catch (e) {
                        console.warn('Could not fetch backends for snapshot:', e);
                        backends = [];
                    }
                }

                if (!Array.isArray(jobs) || jobs.length === 0) {
                    try {
                        const jobLimit = window.quantumJobLimit || localStorage.getItem('quantumJobLimit') || '100';
                        const jobsRes = await fetch(`/api/jobs?limit=${jobLimit}`);
                        const jobsData = await jobsRes.json();
                        jobs = Array.isArray(jobsData) ? jobsData : (jobsData.jobs || jobsData.data || []);
                    } catch (e) {
                        console.warn('Could not fetch jobs for snapshot:', e);
                        jobs = [];
                    }
                }

                // Final safety check - ensure jobs is an array
                if (!Array.isArray(jobs)) {
                    console.warn('Jobs data is not an array, using empty array');
                    jobs = [];
                }

                const performance = {
                    total_jobs: jobs.length,
                    completed_jobs: jobs.filter(j => ['COMPLETED', 'DONE'].includes((j.status || '').toUpperCase())).length,
                    running_jobs: jobs.filter(j => ['RUNNING', 'QUEUED'].includes((j.status || '').toUpperCase())).length,
                    success_rate: jobs.length > 0 ? (jobs.filter(j => ['COMPLETED', 'DONE'].includes((j.status || '').toUpperCase())).length / jobs.length * 100).toFixed(1) : 0
                };

                console.log('📸 Snapshot data collected:', { backends: backends.length, jobs: jobs.length, performance });

                const response = await fetch('/api/historical_data/snapshot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        trigger: 'manual',
                        name: `Snapshot ${new Date().toLocaleString()}`,
                        backends: backends,
                        jobs: jobs,
                        performance: performance
                    })
                });

                const result = await response.json();
                console.log('📸 Snapshot API response:', result);

                if (result.success) {
                    alert('✅ Snapshot saved!');
                    this.updateHistoricalDataWidget();
                } else {
                    console.error('Snapshot failed:', result);
                    alert('❌ Failed: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error taking snapshot:', error);
                alert('❌ Error taking snapshot: ' + error.message);
            }
        }

        async deleteSnapshot(id) {
            if (!confirm('Delete this snapshot?')) return;
            try {
                const response = await fetch(`/api/historical_data/${id}`, { method: 'DELETE' });
                const result = await response.json();
                if (result.success) {
                    this.updateHistoricalDataWidget();
                } else {
                    alert('❌ Failed to delete: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error deleting snapshot:', error);
                alert('❌ Error deleting snapshot');
            }
        }
    }

    if (typeof window !== 'undefined') {
        window.QuantumWidgets = QuantumWidgets;
    }
}

// Global functions for AI chat code buttons
window.copyCodeToClipboard = function (codeId) {
    const codeElement = document.getElementById(codeId);
    if (codeElement) {
        const code = codeElement.textContent;
        navigator.clipboard.writeText(code).then(() => {
            console.log('  Code copied to clipboard');
            // Show temporary success message
            const button = event.target;
            const originalText = button.innerHTML;
            button.innerHTML = '  Copied!';
            button.style.background = '#10b981';
            setTimeout(() => {
                button.innerHTML = originalText;
                button.style.background = 'linear-gradient(45deg, #06b6d4, #0891b2)';
            }, 2000);
        }).catch(err => {
            console.error('  Failed to copy code:', err);
            alert('Failed to copy code to clipboard');
        });
    }
};

window.runGeneratedCode = async function (codeId) {
    const codeElement = document.getElementById(codeId);
    if (codeElement) {
        const code = codeElement.textContent;
        console.log('  Running generated code:', code);

        try {
            const response = await fetch('/api/ibm/submit-job', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    backend: 'ibm_qasm_simulator',
                    shots: 1024,

                })
            });

            const result = await response.json();
            if (result.success) {
                console.log('  Code executed successfully:', result);
                alert(`Code executed successfully! Job ID: ${result.job_id}`);

                // Refresh widgets to show new job
                if (window.quantumWidgets) {
                    setTimeout(() => {
                        window.quantumWidgets.updateAllWidgets();
                    }, 1000);
                }
            } else {
                console.error('  Code execution failed:', result.error);
                alert(`Code execution failed: ${result.error}`);
            }
        } catch (error) {
            console.error('  Error running code:', error);
            alert('Error running code. Please check the console for details.');
        }
    }
};

window.openInCircuitBuilder = function (codeId) {
    const codeElement = document.getElementById(codeId);
    if (codeElement) {
        const code = codeElement.textContent;
        console.log('  Opening code in circuit builder:', code);

        // Store the code in sessionStorage for the circuit builder
        sessionStorage.setItem('circuitBuilderCode', code);

        // Open circuit builder in new tab/window
        const circuitBuilderUrl = '/circuit-builder';
        window.open(circuitBuilderUrl, '_blank');
    }
};
