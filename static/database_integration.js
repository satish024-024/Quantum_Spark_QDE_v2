/**
 * Database Integration for Quantum Jobs Tracker
 * Handles offline mode and historical data display
 */

class DatabaseIntegration {
    constructor() {
        this.isOnline = navigator.onLine;
        this.offlineData = null;
        this.historicalData = null;
        this.lastUpdateTime = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        this.init();
    }
    
    init() {
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Check connection status periodically
        setInterval(() => this.checkConnectionStatus(), 30000); // Every 30 seconds
        
        // Load offline data on startup
        this.loadOfflineData();
    }
    
    async checkConnectionStatus() {
        try {
            const response = await fetch('/api/status', { 
                method: 'HEAD',
                cache: 'no-cache',
                timeout: 5000
            });
            this.isOnline = response.ok;
        } catch (error) {
            this.isOnline = false;
        }
        
        this.updateConnectionIndicator();
    }
    
    handleOnline() {
        console.log('🌐 Connection restored');
        this.isOnline = true;
        this.retryCount = 0;
        this.updateConnectionIndicator();
        
        // Refresh data when back online
        this.refreshData();
    }
    
    handleOffline() {
        console.log('📴 Connection lost - switching to offline mode');
        this.isOnline = false;
        this.updateConnectionIndicator();
        
        // Show offline notification
        this.showOfflineNotification();
    }
    
    updateConnectionIndicator() {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            const indicator = statusElement.querySelector('.status-indicator');
            const text = statusElement.querySelector('span');
            
            if (this.isOnline) {
                indicator.className = 'fas fa-circle status-indicator online';
                text.textContent = 'Connected to IBM Quantum';
                statusElement.className = 'connection-status online';
            } else {
                indicator.className = 'fas fa-circle status-indicator offline';
                text.textContent = 'Offline Mode - Using Cached Data';
                statusElement.className = 'connection-status offline';
            }
        }
    }
    
    async loadOfflineData() {
        try {
            const response = await fetch('/api/offline_data');
            const data = await response.json();
            
            if (data.success) {
                this.offlineData = data.data;
                this.lastUpdateTime = data.data.last_update;
                console.log('💾 Offline data loaded successfully');
                
                if (!this.isOnline) {
                    this.displayOfflineData();
                }
            }
        } catch (error) {
            console.error('❌ Failed to load offline data:', error);
        }
    }
    
    async loadHistoricalData(hoursBack = 24) {
        try {
            const response = await fetch(`/api/historical_data?hours=${hoursBack}`);
            const data = await response.json();
            
            if (data.success) {
                this.historicalData = data.data;
                console.log(`📊 Historical data loaded (${hoursBack}h back)`);
                return data.data;
            }
        } catch (error) {
            console.error('❌ Failed to load historical data:', error);
        }
        return null;
    }
    
    async getMetricsHistory(metricName, hoursBack = 24) {
        try {
            const response = await fetch(`/api/metrics_history?metric=${metricName}&hours=${hoursBack}`);
            const data = await response.json();
            
            if (data.success) {
                return data.data;
            }
        } catch (error) {
            console.error(`❌ Failed to load metrics history for ${metricName}:`, error);
        }
        return [];
    }
    
    displayOfflineData() {
        if (!this.offlineData) return;
        
        console.log('📱 Displaying offline data');
        
        // Update metrics with offline data
        this.updateMetricsOffline();
        
        // Update backends with offline data
        this.updateBackendsOffline();
        
        // Update jobs with offline data
        this.updateJobsOffline();
        
        // Show offline banner
        this.showOfflineBanner();
    }
    
    updateMetricsOffline() {
        if (!this.offlineData.metrics) return;
        
        const metrics = this.offlineData.metrics;
        
        // Update metric cards
        const metricCards = document.querySelectorAll('.metric-card');
        metricCards.forEach(card => {
            const metricType = card.dataset.metric;
            const valueElement = card.querySelector('.metric-value');
            const trendElement = card.querySelector('.metric-trend');
            
            if (valueElement && trendElement) {
                const metric = metrics.find(m => m.metric_name === metricType);
                if (metric) {
                    valueElement.textContent = metric.metric_value;
                    trendElement.innerHTML = '<span class="offline-indicator">📴 Cached</span>';
                }
            }
        });
    }
    
    updateBackendsOffline() {
        if (!this.offlineData.backends) return;
        
        const backendsList = document.getElementById('backends-content');
        if (backendsList) {
            backendsList.innerHTML = '';
            
            this.offlineData.backends.forEach(backend => {
                const backendElement = this.createBackendElement(backend);
                backendsList.appendChild(backendElement);
            });
            
            // Show the content
            document.getElementById('backends-loading').style.display = 'none';
            backendsList.style.display = 'block';
        }
    }
    
    updateJobsOffline() {
        if (!this.offlineData.jobs) return;
        
        const jobsContent = document.getElementById('jobs-content');
        if (jobsContent) {
            jobsContent.innerHTML = this.createJobsTable(this.offlineData.jobs);
            
            // Show the content
            document.getElementById('jobs-loading').style.display = 'none';
            jobsContent.style.display = 'block';
        }
    }
    
    createBackendElement(backend) {
        const div = document.createElement('div');
        div.className = 'backend-item offline';
        div.innerHTML = `
            <div class="backend-info">
                <h3>${backend.name}</h3>
                <div class="backend-status ${backend.operational ? 'operational' : 'inactive'}">
                    <i class="fas fa-circle"></i>
                    ${backend.operational ? 'Operational' : 'Inactive'}
                </div>
                <div class="backend-details">
                    <span><i class="fas fa-microchip"></i> ${backend.qubits || 0} qubits</span>
                    <span><i class="fas fa-clock"></i> ${backend.pending_jobs || 0} pending</span>
                </div>
                <div class="offline-indicator">
                    <i class="fas fa-database"></i> Cached Data
                </div>
            </div>
        `;
        return div;
    }
    
    createJobsTable(jobs) {
        if (!jobs || jobs.length === 0) {
            return '<div class="no-data">No jobs available in offline mode</div>';
        }
        
        const table = document.createElement('table');
        table.className = 'jobs-table offline';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Job ID</th>
                    <th>Backend</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Shots</th>
                    <th>Source</th>
                </tr>
            </thead>
            <tbody>
                ${jobs.slice(0, 20).map(job => `
                    <tr>
                        <td>${job.job_id || 'N/A'}</td>
                        <td>${job.backend_name || 'Unknown'}</td>
                        <td><span class="status ${job.status || 'unknown'}">${job.status || 'Unknown'}</span></td>
                        <td>${job.creation_date ? new Date(job.creation_date).toLocaleString() : 'N/A'}</td>
                        <td>${job.shots || 'N/A'}</td>
                        <td><span class="offline-indicator">📴 Cached</span></td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        return table.outerHTML;
    }
    
    showOfflineBanner() {
        // Remove existing banner
        const existingBanner = document.getElementById('offline-banner');
        if (existingBanner) {
            existingBanner.remove();
        }
        
        // Create offline banner
        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.className = 'offline-banner';
        banner.innerHTML = `
            <div class="offline-banner-content">
                <i class="fas fa-wifi-slash"></i>
                <span>You're currently offline. Showing cached data from ${this.lastUpdateTime ? new Date(this.lastUpdateTime).toLocaleString() : 'unknown time'}.</span>
                <button onclick="databaseIntegration.refreshData()" class="retry-btn">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
        
        // Insert at the top of the main content
        const main = document.querySelector('.dashboard-main');
        if (main) {
            main.insertBefore(banner, main.firstChild);
        }
    }
    
    showOfflineNotification() {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification('Connection Lost', 'Switching to offline mode with cached data', 'warning');
        } else {
            console.log('📴 Offline mode activated');
        }
    }
    
    async refreshData() {
        if (!this.isOnline) {
            console.log('📴 Still offline - cannot refresh data');
            return;
        }
        
        try {
            // Hide offline banner
            const banner = document.getElementById('offline-banner');
            if (banner) {
                banner.remove();
            }
            
            // Refresh offline data
            await this.loadOfflineData();
            
            // Trigger dashboard refresh if available
            if (window.quantumDashboard && typeof window.quantumDashboard.refreshData === 'function') {
                window.quantumDashboard.refreshData();
            }
            
            console.log('🔄 Data refreshed successfully');
        } catch (error) {
            console.error('❌ Failed to refresh data:', error);
        }
    }
    
    async getDatabaseStats() {
        try {
            const response = await fetch('/api/database_stats');
            const data = await response.json();
            
            if (data.success) {
                return data.stats;
            }
        } catch (error) {
            console.error('❌ Failed to get database stats:', error);
        }
        return null;
    }
    
    async cleanupDatabase(daysToKeep = 30) {
        try {
            const response = await fetch('/api/cleanup_database', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ days: daysToKeep })
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('🧹 Database cleaned up successfully');
                return true;
            }
        } catch (error) {
            console.error('❌ Failed to cleanup database:', error);
        }
        return false;
    }
    
    // Method to create historical charts
    async createHistoricalChart(metricName, containerId, hoursBack = 24) {
        const data = await this.getMetricsHistory(metricName, hoursBack);
        
        if (!data || data.length === 0) {
            console.log(`No historical data available for ${metricName}`);
            return;
        }
        
        // Create chart using Chart.js or similar
        const ctx = document.getElementById(containerId);
        if (!ctx) return;
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.timestamp).toLocaleTimeString()),
                datasets: [{
                    label: metricName.replace('_', ' ').toUpperCase(),
                    data: data.map(d => d.metric_value),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
        
        return chart;
    }
}

// Initialize database integration
const databaseIntegration = new DatabaseIntegration();

// Make it globally available
window.databaseIntegration = databaseIntegration;

// Add CSS for offline indicators
const style = document.createElement('style');
style.textContent = `
    .offline-banner {
        background: linear-gradient(135deg, #f39c12, #e67e22);
        color: white;
        padding: 12px 20px;
        margin-bottom: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        animation: slideDown 0.3s ease-out;
    }
    
    .offline-banner-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .offline-banner i {
        font-size: 18px;
    }
    
    .retry-btn {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;
    }
    
    .retry-btn:hover {
        background: rgba(255,255,255,0.3);
    }
    
    .connection-status.offline {
        background: linear-gradient(135deg, #e74c3c, #c0392b);
    }
    
    .connection-status.offline .status-indicator {
        color: #fff;
    }
    
    .offline-indicator {
        color: #f39c12;
        font-size: 12px;
        font-weight: 500;
    }
    
    .backend-item.offline {
        border-left: 4px solid #f39c12;
    }
    
    .jobs-table.offline {
        border: 1px solid #f39c12;
    }
    
    @keyframes slideDown {
        from {
            transform: translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
