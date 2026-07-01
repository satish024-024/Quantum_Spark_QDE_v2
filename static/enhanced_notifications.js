// Enhanced Real-time Notification System
// Monitors quantum jobs, backend status, and system events

class EnhancedNotificationSystem {
    constructor() {
        this.notifications = [];
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.lastJobStates = new Map();
        this.lastBackendStates = new Map();
        this.notificationQueue = [];
        this.isProcessingQueue = false;
        
        this.init();
    }

    init() {
        console.log('🔔 Initializing Enhanced Notification System...');
        this.setupNotificationPanel();
        this.startMonitoring();
        this.processNotificationQueue();
    }

    setupNotificationPanel() {
        // Create notification panel if it doesn't exist
        let panel = document.getElementById('notification-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'notification-panel';
            panel.className = 'notification-panel';
            panel.innerHTML = `
                <div class="notification-header">
                    <h3><i class="fas fa-bell"></i> Quantum Notifications</h3>
                    <button class="close-btn" id="close-notifications">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="notification-list" id="notification-list">
                    <!-- Notifications will be populated here -->
                </div>
                <div class="notification-controls">
                    <button class="notification-btn" id="clear-all-notifications">
                        <i class="fas fa-trash"></i> Clear All
                    </button>
                    <button class="notification-btn" id="notification-settings">
                        <i class="fas fa-cog"></i> Settings
                    </button>
                </div>
            `;
            document.body.appendChild(panel);
        }

        // Setup event listeners
        const closeBtn = document.getElementById('close-notifications');
        const clearBtn = document.getElementById('clear-all-notifications');
        const settingsBtn = document.getElementById('notification-settings');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeNotificationPanel());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllNotifications());
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openNotificationSettings());
        }
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        console.log('🔍 Starting real-time monitoring...');
        
        // Monitor every 30 seconds (reduced frequency)
        this.monitoringInterval = setInterval(() => {
            this.checkJobStatusChanges();
            this.checkBackendStatusChanges();
            this.checkSystemHealth();
            this.checkQueueChanges();
        }, 30000);
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        console.log('⏹️ Stopped real-time monitoring');
    }

    async checkJobStatusChanges() {
        try {
            // Simulate fetching real job data
            const jobs = await this.fetchJobData();
            
            jobs.forEach(job => {
                const jobId = job.id;
                const currentState = job.status;
                const lastState = this.lastJobStates.get(jobId);
                
                if (lastState && lastState !== currentState) {
                    this.handleJobStatusChange(job, lastState, currentState);
                }
                
                this.lastJobStates.set(jobId, currentState);
            });
        } catch (error) {
            console.warn('Failed to check job status:', error);
        }
    }

    async checkBackendStatusChanges() {
        try {
            // Simulate fetching real backend data
            const backends = await this.fetchBackendData();
            
            backends.forEach(backend => {
                const backendName = backend.name;
                const currentState = backend.status;
                const currentQueue = backend.queue;
                const lastState = this.lastBackendStates.get(backendName);
                
                if (lastState) {
                    if (lastState.status !== currentState) {
                        this.handleBackendStatusChange(backend, lastState.status, currentState);
                    }
                    if (lastState.queue !== currentQueue) {
                        this.handleQueueChange(backend, lastState.queue, currentQueue);
                    }
                }
                
                this.lastBackendStates.set(backendName, { status: currentState, queue: currentQueue });
            });
        } catch (error) {
            console.warn('Failed to check backend status:', error);
        }
    }

    checkSystemHealth() {
        // Check for system health issues
        const healthMetrics = this.getSystemHealthMetrics();
        
        if (healthMetrics.errorRate > 0.1) {
            this.addNotification({
                type: 'warning',
                title: 'High Error Rate',
                message: `System error rate is ${(healthMetrics.errorRate * 100).toFixed(1)}%`,
                timestamp: Date.now(),
                priority: 'high'
            });
        }
        
        if (healthMetrics.avgQueueTime > 300) { // 5 minutes
            this.addNotification({
                type: 'info',
                title: 'Long Queue Times',
                message: `Average queue time is ${Math.round(healthMetrics.avgQueueTime / 60)} minutes`,
                timestamp: Date.now(),
                priority: 'medium'
            });
        }
    }

    checkQueueChanges() {
        // Check for significant queue changes
        const totalQueue = Array.from(this.lastBackendStates.values())
            .reduce((sum, backend) => sum + (backend.queue || 0), 0);
        
        if (totalQueue === 0 && this.lastTotalQueue > 0) {
            this.addNotification({
                type: 'success',
                title: 'All Queues Cleared',
                message: 'All quantum backends are now available',
                timestamp: Date.now(),
                priority: 'medium'
            });
        }
        
        this.lastTotalQueue = totalQueue;
    }

    handleJobStatusChange(job, oldStatus, newStatus) {
        const statusMessages = {
            'queued': 'Job queued for execution',
            'running': 'Job started running',
            'completed': 'Job completed successfully',
            'failed': 'Job failed to complete',
            'cancelled': 'Job was cancelled'
        };

        const type = newStatus === 'completed' ? 'success' : 
                    newStatus === 'failed' ? 'error' : 
                    newStatus === 'running' ? 'info' : 'warning';

        this.addNotification({
            type: type,
            title: `Job ${job.id} Status Changed`,
            message: `${statusMessages[newStatus] || `Status changed to ${newStatus}`}`,
            timestamp: Date.now(),
            priority: newStatus === 'failed' ? 'high' : 'medium',
            data: { jobId: job.id, oldStatus, newStatus }
        });
    }

    handleBackendStatusChange(backend, oldStatus, newStatus) {
        const type = newStatus === 'online' ? 'success' : 
                    newStatus === 'offline' ? 'error' : 'warning';

        this.addNotification({
            type: type,
            title: `Backend ${backend.name} Status Changed`,
            message: `Backend is now ${newStatus}`,
            timestamp: Date.now(),
            priority: newStatus === 'offline' ? 'high' : 'medium',
            data: { backendName: backend.name, oldStatus, newStatus }
        });
    }

    handleQueueChange(backend, oldQueue, newQueue) {
        if (newQueue === 0 && oldQueue > 0) {
            this.addNotification({
                type: 'success',
                title: `${backend.name} Queue Cleared`,
                message: 'Backend is now available for new jobs',
                timestamp: Date.now(),
                priority: 'low'
            });
        } else if (newQueue > oldQueue && newQueue > 5) {
            this.addNotification({
                type: 'warning',
                title: `${backend.name} Queue Growing`,
                message: `Queue now has ${newQueue} jobs waiting`,
                timestamp: Date.now(),
                priority: 'medium'
            });
        }
    }

    addNotification(notification) {
        // Add unique ID and timestamp
        notification.id = Date.now() + Math.random();
        notification.timestamp = notification.timestamp || Date.now();
        
        // Add to queue for processing
        this.notificationQueue.push(notification);
        
        // Process queue if not already processing
        if (!this.isProcessingQueue) {
            this.processNotificationQueue();
        }
    }

    async processNotificationQueue() {
        if (this.isProcessingQueue || this.notificationQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.notificationQueue.length > 0) {
            const notification = this.notificationQueue.shift();
            await this.displayNotification(notification);
            
            // Small delay between notifications
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.isProcessingQueue = false;
    }

    async displayNotification(notification) {
        // Add to notifications array
        this.notifications.unshift(notification);
        
        // Limit notifications to 50
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
        
        // Update notification panel
        this.updateNotificationPanel();
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
            this.showBrowserNotification(notification);
        }
        
        // Update notification badge
        this.updateNotificationBadge();
        
        // Auto-remove low priority notifications after 10 seconds
        if (notification.priority === 'low') {
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, 10000);
        }
    }

    updateNotificationPanel() {
        const notificationList = document.getElementById('notification-list');
        if (!notificationList) return;
        
        notificationList.innerHTML = '';
        
        this.notifications.forEach(notification => {
            const notificationElement = this.createNotificationElement(notification);
            notificationList.appendChild(notificationElement);
        });
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification-item ${notification.type} ${notification.priority}`;
        element.dataset.notificationId = notification.id;
        
        const timeAgo = this.getTimeAgo(notification.timestamp);
        const icon = this.getNotificationIcon(notification.type);
        
        element.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
                <span class="notification-time">${timeAgo}</span>
            </div>
            <button class="notification-close" onclick="window.enhancedNotifications.removeNotification('${notification.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add click animation
        element.addEventListener('click', () => {
            this.handleNotificationClick(notification);
        });
        
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

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }

    showBrowserNotification(notification) {
        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/static/favicon.ico',
                tag: notification.id
            });
        }
    }

    updateNotificationBadge() {
        const badge = document.querySelector('.notification-btn .badge');
        const count = this.notifications.length;
        
        if (count > 0) {
            if (!badge) {
                const notificationBtn = document.getElementById('notification-btn');
                if (notificationBtn) {
                    const badgeElement = document.createElement('span');
                    badgeElement.className = 'badge';
                    notificationBtn.appendChild(badgeElement);
                }
            }
            
            if (badge) {
                badge.textContent = count > 99 ? '99+' : count.toString();
                badge.style.display = 'block';
            }
        } else if (badge) {
            badge.style.display = 'none';
        }
    }

    removeNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.updateNotificationPanel();
        this.updateNotificationBadge();
    }

    clearAllNotifications() {
        this.notifications = [];
        this.updateNotificationPanel();
        this.updateNotificationBadge();
        this.showNotification('Notifications Cleared', 'All notifications have been cleared', 'info');
    }

    handleNotificationClick(notification) {
        // Handle notification click based on type
        if (notification.data) {
            if (notification.data.jobId) {
                // Focus on job in jobs widget
                this.focusOnJob(notification.data.jobId);
            } else if (notification.data.backendName) {
                // Focus on backend in backends widget
                this.focusOnBackend(notification.data.backendName);
            }
        }
    }

    focusOnJob(jobId) {
        // Scroll to jobs widget and highlight the job
        const jobsWidget = document.querySelector('.jobs-widget');
        if (jobsWidget) {
            jobsWidget.scrollIntoView({ behavior: 'smooth' });
            jobsWidget.classList.add('highlight');
            setTimeout(() => jobsWidget.classList.remove('highlight'), 3000);
        }
    }

    focusOnBackend(backendName) {
        // Scroll to backends widget and highlight the backend
        const backendsWidget = document.querySelector('.backends-widget');
        if (backendsWidget) {
            backendsWidget.scrollIntoView({ behavior: 'smooth' });
            backendsWidget.classList.add('highlight');
            setTimeout(() => backendsWidget.classList.remove('highlight'), 3000);
        }
    }

    toggleNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        if (panel) {
            panel.classList.toggle('active');
            
            if (panel.classList.contains('active')) {
                this.updateNotificationPanel();
            }
        }
    }

    closeNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        if (panel) {
            panel.classList.remove('active');
        }
    }

    openNotificationSettings() {
        // Open notification settings modal
        this.showNotification('Settings', 'Notification settings panel coming soon', 'info');
    }

    // Mock data functions (replace with real API calls)
    async fetchJobData() {
        // Simulate real job data
        return [
            { id: 'QJ_2024_001', status: 'running', backend: 'ibm_oslo', progress: 75 },
            { id: 'QJ_2024_002', status: 'queued', backend: 'ibm_nairobi', progress: 0 },
            { id: 'QJ_2024_003', status: 'completed', backend: 'ibm_lagos', progress: 100 }
        ];
    }

    async fetchBackendData() {
        // Simulate real backend data
        return [
            { name: 'ibmq_qasm_simulator', status: 'online', queue: 0 },
            { name: 'ibm_oslo', status: 'online', queue: 3 },
            { name: 'ibm_nairobi', status: 'online', queue: 1 },
            { name: 'ibm_lagos', status: 'online', queue: 2 },
            { name: 'ibm_perth', status: 'online', queue: 0 }
        ];
    }

    getSystemHealthMetrics() {
        // Simulate system health metrics
        return {
            errorRate: Math.random() * 0.05, // 0-5% error rate
            avgQueueTime: Math.random() * 600, // 0-10 minutes
            activeJobs: Math.floor(Math.random() * 20) + 5,
            totalBackends: 5
        };
    }

    showNotification(title, message, type = 'info') {
        this.addNotification({
            type: type,
            title: title,
            message: message,
            timestamp: Date.now(),
            priority: 'low'
        });
    }
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Initialize notification system
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedNotifications = new EnhancedNotificationSystem();
});