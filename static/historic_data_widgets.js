// Historic Data Widgets - Chart-based visualization with Snapshot Management
// Separate from widgets.js for custom historic data and performance widgets

class HistoricDataManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.snapshots = [];
        this.currentPage = 1;
        this.itemsPerPage = 5;
        console.log('📊 Historic Data Manager initialized');
    }

    // Main entry point - called by widget system
    async updateHistoricalDataWidget() {
        const contentElement = document.getElementById('historical-data-content');
        if (!contentElement) {
            console.warn('historical-data-content element not found');
            return;
        }

        try {
            console.log('📈 Fetching historical snapshots...');
            const response = await fetch('/api/historical_data?days_back=30');
            const data = await response.json();

            // Hide loading spinner
            const loadingElement = document.getElementById('historical-data-loading');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }

            // Show content
            contentElement.style.display = 'block';

            if (data && data.success) {
                this.snapshots = data.snapshots || [];
                this.renderSnapshotWidget(contentElement, data);
            } else {
                this.renderEmptyState(contentElement);
            }
        } catch (error) {
            console.error('Error fetching historical data:', error);
            contentElement.innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading historical data</p>';
        }
    }

    renderSnapshotWidget(container, data) {
        const snapshots = data.snapshots || [];
        const stats = data.stats || {};

        const html = `
            <div class="snapshot-widget" style="padding: 1rem;">
                <!-- Header with Actions -->
                <div class="snapshot-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div class="snapshot-stats" style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <span style="background: rgba(59, 130, 246, 0.2); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; color: #60a5fa;">
                            📸 ${stats.total_count || snapshots.length} Snapshots
                        </span>
                        <span style="background: rgba(16, 185, 129, 0.2); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; color: #34d399;">
                            🤖 ${stats.auto_count || 0} Auto
                        </span>
                        <span style="background: rgba(245, 158, 11, 0.2); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; color: #fbbf24;">
                            👆 ${stats.manual_count || 0} Manual
                        </span>
                    </div>
                    <div class="snapshot-actions" style="display: flex; gap: 0.5rem;">
                        <button id="take-snapshot-btn" class="snapshot-btn primary" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 0.3rem;">
                            <i class="fas fa-camera"></i> Take Snapshot
                        </button>
                        <button id="download-snapshots-btn" class="snapshot-btn" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                            <i class="fas fa-download"></i>
                        </button>
                        <button id="cleanup-snapshots-btn" class="snapshot-btn" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem;" title="Clean up old snapshots">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>

                <!-- Snapshot List -->
                <div class="snapshot-list" id="snapshot-list" style="max-height: 400px; overflow-y: auto;">
                    ${snapshots.length > 0 ? this.renderSnapshotList(snapshots) : this.renderNoSnapshots()}
                </div>

                <!-- Pagination -->
                ${snapshots.length > this.itemsPerPage ? this.renderPagination(snapshots.length) : ''}
            </div>
        `;

        container.innerHTML = html;
        this.attachEventListeners();
    }

    renderSnapshotList(snapshots) {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedSnapshots = snapshots.slice(start, end);

        return paginatedSnapshots.map(snap => {
            const timestamp = new Date(snap.timestamp).toLocaleString();
            const backendsCount = (snap.backends_data || []).length;
            const jobsCount = (snap.jobs_data || []).length;
            const perf = snap.performance_data || {};
            const triggerIcon = snap.snapshot_trigger === 'auto' ? '🤖' : '👆';
            const triggerColor = snap.snapshot_trigger === 'auto' ? '#34d399' : '#fbbf24';

            return `
                <div class="snapshot-item" data-snapshot-id="${snap.id}" style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; border-left: 3px solid ${triggerColor}; transition: all 0.2s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                <span style="font-weight: 600; color: #fff; font-size: 0.9rem;">${snap.snapshot_name || 'Unnamed Snapshot'}</span>
                                <span style="font-size: 0.7rem; background: rgba(255,255,255,0.1); padding: 0.1rem 0.4rem; border-radius: 4px;">${triggerIcon}</span>
                            </div>
                            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-bottom: 0.5rem;">
                                🕐 ${timestamp}
                            </div>
                            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                                <span style="font-size: 0.7rem; color: rgba(255,255,255,0.7);">
                                    💻 ${backendsCount} backends
                                </span>
                                <span style="font-size: 0.7rem; color: rgba(255,255,255,0.7);">
                                    📋 ${jobsCount} jobs
                                </span>
                                <span style="font-size: 0.7rem; color: rgba(255,255,255,0.7);">
                                    ✅ ${perf.success_rate || 0}% success
                                </span>
                                <span style="font-size: 0.7rem; color: rgba(255,255,255,0.7);">
                                    📅 ${snap.retention_days}d retention
                                </span>
                            </div>
                            ${snap.notes ? `<div style="font-size: 0.7rem; color: rgba(255,255,255,0.5); margin-top: 0.25rem; font-style: italic;">📝 ${snap.notes}</div>` : ''}
                        </div>
                        <div style="display: flex; gap: 0.25rem;">
                            <button class="view-snapshot-btn" data-id="${snap.id}" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: none; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="download-snapshot-btn" data-id="${snap.id}" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: none; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;" title="Download">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="delete-snapshot-btn" data-id="${snap.id}" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: none; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderNoSnapshots() {
        return `
            <div style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.5);">
                <i class="fas fa-camera" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p style="margin: 0.5rem 0;">No snapshots yet</p>
                <p style="font-size: 0.8rem;">Click "Take Snapshot" to save current dashboard state</p>
            </div>
        `;
    }

    renderEmptyState(container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.5);">
                <i class="fas fa-history" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p style="margin: 0.5rem 0;">No historical data available</p>
                <button id="take-snapshot-btn" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; margin-top: 1rem;">
                    <i class="fas fa-camera"></i> Take Your First Snapshot
                </button>
            </div>
        `;
        this.attachEventListeners();
    }

    renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        return `
            <div style="display: flex; justify-content: center; gap: 0.5rem; margin-top: 1rem;">
                <button class="pagination-btn" data-page="prev" style="background: rgba(255,255,255,0.1); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;" ${this.currentPage === 1 ? 'disabled style="opacity: 0.5;"' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span style="padding: 0.25rem 0.5rem; color: rgba(255,255,255,0.7); font-size: 0.8rem;">
                    ${this.currentPage} / ${totalPages}
                </span>
                <button class="pagination-btn" data-page="next" style="background: rgba(255,255,255,0.1); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;" ${this.currentPage === totalPages ? 'disabled style="opacity: 0.5;"' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    attachEventListeners() {
        // Take Snapshot button
        const takeSnapshotBtn = document.getElementById('take-snapshot-btn');
        if (takeSnapshotBtn) {
            takeSnapshotBtn.addEventListener('click', () => this.takeSnapshot());
        }

        // Download all snapshots
        const downloadBtn = document.getElementById('download-snapshots-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadAllSnapshots());
        }

        // Cleanup button
        const cleanupBtn = document.getElementById('cleanup-snapshots-btn');
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', () => this.cleanupSnapshots());
        }

        // View snapshot buttons
        document.querySelectorAll('.view-snapshot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.viewSnapshot(id);
            });
        });

        // Download single snapshot buttons
        document.querySelectorAll('.download-snapshot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.downloadSnapshot(id);
            });
        });

        // Delete snapshot buttons
        document.querySelectorAll('.delete-snapshot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.deleteSnapshot(id);
            });
        });

        // Pagination buttons
        document.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                if (page === 'prev' && this.currentPage > 1) {
                    this.currentPage--;
                } else if (page === 'next') {
                    this.currentPage++;
                }
                this.updateHistoricalDataWidget();
            });
        });
    }

    async takeSnapshot() {
        const btn = document.getElementById('take-snapshot-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        try {
            // Collect current dashboard data
            const snapshotData = await this.collectDashboardData();

            const response = await fetch('/api/historical_data/snapshot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(snapshotData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('✅ Snapshot saved successfully!', 'success');
                // Refresh the widget
                setTimeout(() => this.updateHistoricalDataWidget(), 500);
            } else {
                throw new Error(result.error || 'Failed to save snapshot');
            }
        } catch (error) {
            console.error('Error taking snapshot:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-camera"></i> Take Snapshot';
            }
        }
    }

    async collectDashboardData() {
        // Fetch current backends
        let backends = [];
        try {
            const backendsRes = await fetch('/api/backends');
            backends = await backendsRes.json();
            if (!Array.isArray(backends)) backends = [];
        } catch (e) { console.warn('Could not fetch backends:', e); }

        // Fetch current jobs
        let jobs = [];
        try {
            const jobsRes = await fetch('/api/jobs?limit=100');
            const jobsData = await jobsRes.json();
            jobs = Array.isArray(jobsData) ? jobsData : (jobsData.jobs || []);
        } catch (e) { console.warn('Could not fetch jobs:', e); }

        // Fetch performance metrics
        let performance = {};
        try {
            const perfRes = await fetch('/api/performance_metrics');
            const perfData = await perfRes.json();
            performance = {
                total_jobs: perfData.total_jobs || jobs.length,
                completed_jobs: perfData.completed_jobs || 0,
                running_jobs: perfData.running_jobs || 0,
                success_rate: perfData.success_rate || 0
            };
        } catch (e) { console.warn('Could not fetch performance:', e); }

        return {
            name: `Snapshot ${new Date().toLocaleString()}`,
            trigger: 'manual',
            retention_days: 7,
            backends: backends,
            jobs: jobs,
            performance: performance,
            widgets: {},
            notes: ''
        };
    }

    async viewSnapshot(snapshotId) {
        try {
            const response = await fetch(`/api/historical_data/${snapshotId}`);
            const result = await response.json();

            if (result.success && result.snapshot) {
                this.showSnapshotModal(result.snapshot);
            } else {
                this.showNotification('❌ Could not load snapshot details', 'error');
            }
        } catch (error) {
            console.error('Error viewing snapshot:', error);
            this.showNotification('❌ Error loading snapshot', 'error');
        }
    }

    showSnapshotModal(snapshot) {
        const backends = snapshot.backends_data || [];
        const jobs = snapshot.jobs_data || [];
        const perf = snapshot.performance_data || {};

        const modalHtml = `
            <div id="snapshot-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div style="background: #1a1a2e; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow: auto; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0; color: #fff;">${snapshot.snapshot_name || 'Snapshot Details'}</h3>
                        <button id="close-snapshot-modal" style="background: none; border: none; color: #fff; font-size: 1.5rem; cursor: pointer;">&times;</button>
                    </div>
                    
                    <div style="font-size: 0.85rem; color: rgba(255,255,255,0.6); margin-bottom: 1rem;">
                        🕐 Created: ${new Date(snapshot.timestamp).toLocaleString()}<br>
                        ${snapshot.snapshot_trigger === 'auto' ? '🤖 Auto-generated' : '👆 Manual snapshot'}
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
                        <div style="background: rgba(59, 130, 246, 0.2); padding: 1rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #60a5fa;">${backends.length}</div>
                            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Backends</div>
                        </div>
                        <div style="background: rgba(16, 185, 129, 0.2); padding: 1rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #34d399;">${jobs.length}</div>
                            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Jobs</div>
                        </div>
                        <div style="background: rgba(245, 158, 11, 0.2); padding: 1rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #fbbf24;">${perf.success_rate || 0}%</div>
                            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Success Rate</div>
                        </div>
                        <div style="background: rgba(139, 92, 246, 0.2); padding: 1rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #a78bfa;">${snapshot.retention_days}</div>
                            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">Days Retention</div>
                        </div>
                    </div>

                    ${backends.length > 0 ? `
                        <h4 style="color: #fff; margin: 1rem 0 0.5rem;">Backends</h4>
                        <div style="max-height: 150px; overflow-y: auto;">
                            ${backends.map(b => `
                                <div style="background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.25rem; font-size: 0.8rem;">
                                    <span style="color: #fff;">${b.name}</span>
                                    <span style="color: rgba(255,255,255,0.5);"> - ${b.num_qubits} qubits, ${b.operational ? '✅ Active' : '⏸️ Offline'}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    ${snapshot.notes ? `
                        <h4 style="color: #fff; margin: 1rem 0 0.5rem;">Notes</h4>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem;">${snapshot.notes}</p>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('close-snapshot-modal').addEventListener('click', () => {
            document.getElementById('snapshot-modal').remove();
        });

        document.getElementById('snapshot-modal').addEventListener('click', (e) => {
            if (e.target.id === 'snapshot-modal') {
                e.target.remove();
            }
        });
    }

    async downloadSnapshot(snapshotId) {
        try {
            const response = await fetch(`/api/historical_data/download?snapshot_id=${snapshotId}&format=json`);
            const result = await response.json();

            if (result.success) {
                const blob = new Blob([JSON.stringify(result.data[0], null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `snapshot_${snapshotId}.json`;
                a.click();
                URL.revokeObjectURL(url);
                this.showNotification('✅ Snapshot downloaded', 'success');
            }
        } catch (error) {
            console.error('Error downloading snapshot:', error);
            this.showNotification('❌ Download failed', 'error');
        }
    }

    async downloadAllSnapshots() {
        try {
            window.open('/api/historical_data/download?format=csv', '_blank');
            this.showNotification('✅ CSV download started', 'success');
        } catch (error) {
            console.error('Error downloading snapshots:', error);
            this.showNotification('❌ Download failed', 'error');
        }
    }

    async deleteSnapshot(snapshotId) {
        if (!confirm('Are you sure you want to delete this snapshot?')) return;

        try {
            const response = await fetch(`/api/historical_data/${snapshotId}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (result.success) {
                this.showNotification('✅ Snapshot deleted', 'success');
                this.updateHistoricalDataWidget();
            } else {
                throw new Error(result.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Error deleting snapshot:', error);
            this.showNotification('❌ ' + error.message, 'error');
        }
    }

    async cleanupSnapshots() {
        if (!confirm('This will delete all snapshots past their retention period. Continue?')) return;

        try {
            const response = await fetch('/api/historical_data/cleanup', {
                method: 'POST'
            });
            const result = await response.json();

            if (result.success) {
                this.showNotification(`✅ Cleaned up ${result.deleted_count} old snapshots`, 'success');
                this.updateHistoricalDataWidget();
            } else {
                throw new Error(result.error || 'Cleanup failed');
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
            this.showNotification('❌ ' + error.message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Use dashboard notification if available
        if (this.dashboard && typeof this.dashboard.showNotification === 'function') {
            this.dashboard.showNotification(message, type);
            return;
        }

        // Fallback notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            z-index: 10001;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Update Performance Widget (unchanged)
    async updatePerformanceWidget() {
        const contentElement = document.getElementById('performance-content');
        if (!contentElement) {
            console.warn('performance-content element not found');
            return;
        }

        try {
            console.log('📈 Fetching performance metrics...');
            const response = await fetch('/api/performance_metrics');
            const data = await response.json();

            const loadingElement = document.getElementById('performance-loading');
            if (loadingElement) loadingElement.style.display = 'none';
            contentElement.style.display = 'block';

            if (data && !data.error) {
                this.renderPerformanceChart(data, contentElement);
            } else {
                contentElement.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.6);">No performance data available</p>';
            }
        } catch (error) {
            console.error('Error fetching performance data:', error);
            contentElement.innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading performance data</p>';
        }
    }

    renderPerformanceChart(data, container) {
        const metrics = data.metrics || data;

        const plotData = [{
            type: 'bar',
            x: ['Total Jobs', 'Successful', 'Failed', 'Avg Time (s)'],
            y: [
                metrics.total_jobs || 0,
                metrics.successful_jobs || metrics.completed_jobs || 0,
                metrics.failed_jobs || 0,
                (metrics.average_execution_time || metrics.avg_execution_time || 0) * 10
            ],
            marker: {
                color: ['rgba(59, 130, 246, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(245, 158, 11, 0.8)']
            }
        }];

        const layout = {
            title: { text: 'Performance Metrics', font: { color: '#fff', size: 16 } },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0.3)',
            font: { color: '#fff' },
            xaxis: { color: '#9ca3af', gridcolor: 'rgba(255,255,255,0.1)' },
            yaxis: { color: '#9ca3af', gridcolor: 'rgba(255,255,255,0.1)' },
            margin: { t: 40, b: 40, l: 50, r: 20 }
        };

        container.innerHTML = '<div id="performance-chart" style="width: 100%; height: 300px;"></div>';

        if (typeof Plotly !== 'undefined') {
            Plotly.newPlot('performance-chart', plotData, layout, { responsive: true, displayModeBar: false });
        } else {
            this.renderPerformanceFallback(metrics, container);
        }
    }

    renderPerformanceFallback(metrics, container) {
        container.innerHTML = `
            <div style="padding: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div style="background: rgba(59, 130, 246, 0.2); padding: 1rem; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7);">Total Jobs</div>
                    <div style="font-size: 1.5rem; color: #fff; font-weight: bold;">${metrics.total_jobs || 0}</div>
                </div>
                <div style="background: rgba(16, 185, 129, 0.2); padding: 1rem; border-radius: 8px; border-left: 4px solid #10b981;">
                    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7);">Successful</div>
                    <div style="font-size: 1.5rem; color: #fff; font-weight: bold;">${metrics.successful_jobs || metrics.completed_jobs || 0}</div>
                </div>
            </div>
        `;
    }
}

// Make it globally available
window.HistoricDataManager = HistoricDataManager;
console.log('✅ Historic Data Manager loaded (with Snapshot Management)');
