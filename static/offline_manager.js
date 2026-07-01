/**
 * Offline Manager for Quantum Jobs Tracker
 * Handles IndexedDB storage, offline detection, and data synchronization
 */

class OfflineManager {
    constructor() {
        this.dbName = 'QuantumJobsTracker';
        this.dbVersion = 1;
        this.db = null;
        this.isOnline = navigator.onLine;
        this.syncInterval = 15 * 60 * 1000; // 15 minutes in milliseconds
        this.maxCacheAge = 30 * 60 * 1000; // 30 minutes
        this.syncTimer = null;

        this.init();
    }

    async init() {
        try {
            await this.initIndexedDB();
            this.setupEventListeners();
            this.startPeriodicSync();
            this.checkOnlineStatus();

            console.log('Offline Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Offline Manager:', error);
        }
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores for different data types
                if (!db.objectStoreNames.contains('backends')) {
                    const backendsStore = db.createObjectStore('backends', { keyPath: 'id' });
                    backendsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    backendsStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains('jobs')) {
                    const jobsStore = db.createObjectStore('jobs', { keyPath: 'id' });
                    jobsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    jobsStore.createIndex('status', 'status', { unique: false });
                    jobsStore.createIndex('backend_name', 'backend_name', { unique: false });
                }

                if (!db.objectStoreNames.contains('metrics')) {
                    const metricsStore = db.createObjectStore('metrics', { keyPath: 'id' });
                    metricsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    metricsStore.createIndex('metric_name', 'metric_name', { unique: false });
                }

                if (!db.objectStoreNames.contains('quantum_states')) {
                    const quantumStatesStore = db.createObjectStore('quantum_states', { keyPath: 'id' });
                    quantumStatesStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('sync_status')) {
                    db.createObjectStore('sync_status', { keyPath: 'key' });
                }

                console.log('IndexedDB schema created/updated');
            };
        });
    }

    setupEventListeners() {
        // Online/Offline event listeners
        window.addEventListener('online', () => {
            console.log('Connection restored');
            this.isOnline = true;
            this.handleConnectionRestored();
        });

        window.addEventListener('offline', () => {
            console.log('Connection lost');
            this.isOnline = false;
            this.handleConnectionLost();
        });

        // Page visibility change for background sync
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.isOnline) {
                this.performSync();
            }
        });

        // Before page unload, ensure data is saved
        window.addEventListener('beforeunload', () => {
            this.saveCurrentState();
        });
    }

    async handleConnectionRestored() {
        console.log('Handling connection restoration...');
        this.showOnlineNotification();

        // Perform immediate sync
        await this.performSync();

        // Restart periodic sync if it was stopped
        this.startPeriodicSync();
    }

    async handleConnectionLost() {
        console.log('Handling connection loss...');
        this.showOfflineNotification();

        // Update sync status
        await this.updateSyncStatus({
            isOnline: false,
            lastOfflineTime: new Date().toISOString(),
            message: 'Connection lost'
        });
    }

    startPeriodicSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        this.syncTimer = setInterval(async () => {
            if (this.isOnline) {
                await this.performSync();
            }
        }, this.syncInterval);

        console.log(`Periodic sync started with ${this.syncInterval / 1000 / 60} minute intervals`);
    }

    async performSync() {
        if (!this.isOnline) {
            console.log('Skipping sync - offline');
            return;
        }

        try {
            console.log('Performing data synchronization...');

            // Fetch latest data from server
            const response = await fetch('/api/offline_data?max_age=30');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                await this.storeDataLocally(result.data);
                await this.updateSyncStatus({
                    isOnline: true,
                    lastSyncTime: new Date().toISOString(),
                    message: 'Sync completed successfully'
                });

                console.log('Data synchronization completed');
            } else {
                throw new Error(result.error || 'Sync failed');
            }

        } catch (error) {
            console.error('Sync failed:', error);
            await this.updateSyncStatus({
                isOnline: this.isOnline,
                lastSyncError: error.message,
                lastSyncAttempt: new Date().toISOString(),
                message: 'Sync failed'
            });
        }
    }

    async storeDataLocally(data) {
        const transaction = this.db.transaction(['backends', 'jobs', 'metrics', 'quantum_states'], 'readwrite');

        // Store backends
        if (data.backends) {
            const backendsStore = transaction.objectStore('backends');
            for (const backend of data.backends) {
                backend.id = `${backend.name}_${backend.timestamp}`;
                await this.storeObject(backendsStore, backend);
            }
        }

        // Store jobs
        if (data.jobs) {
            const jobsStore = transaction.objectStore('jobs');
            for (const job of data.jobs) {
                job.id = `${job.job_id}_${job.timestamp}`;
                await this.storeObject(jobsStore, job);
            }
        }

        // Store metrics
        if (data.metrics) {
            const metricsStore = transaction.objectStore('metrics');
            for (const metric of data.metrics) {
                metric.id = `${metric.metric_name}_${metric.timestamp}`;
                await this.storeObject(metricsStore, metric);
            }
        }

        // Store quantum states
        if (data.quantum_states) {
            const quantumStatesStore = transaction.objectStore('quantum_states');
            for (const state of data.quantum_states) {
                state.id = `${state.state_name}_${state.timestamp}`;
                await this.storeObject(quantumStatesStore, state);
            }
        }
    }

    storeObject(store, object) {
        return new Promise((resolve, reject) => {
            const request = store.put(object);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getOfflineData(dataType, maxAgeMinutes = 30) {
        const cutoffTime = new Date(Date.now() - (maxAgeMinutes * 60 * 1000));

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([dataType], 'readonly');
            const store = transaction.objectStore(dataType);
            const index = store.index('timestamp');
            const range = IDBKeyRange.lowerBound(cutoffTime.toISOString());

            const request = index.openCursor(range);
            const results = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    async isDataAvailable(dataType, maxAgeMinutes = 30) {
        try {
            const data = await this.getOfflineData(dataType, maxAgeMinutes);
            return data.length > 0;
        } catch (error) {
            console.error(`Error checking data availability for ${dataType}:`, error);
            return false;
        }
    }

    async updateSyncStatus(status) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sync_status'], 'readwrite');
            const store = transaction.objectStore('sync_status');

            const request = store.put({
                key: 'current_status',
                ...status,
                updatedAt: new Date().toISOString()
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSyncStatus() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sync_status'], 'readonly');
            const store = transaction.objectStore('sync_status');
            const request = store.get('current_status');

            request.onsuccess = () => {
                resolve(request.result || {
                    isOnline: this.isOnline,
                    message: 'No sync status available'
                });
            };
            request.onerror = () => reject(request.error);
        });
    }

    async saveCurrentState() {
        // Save any unsaved data before page unload
        if (typeof window.currentQuantumState !== 'undefined') {
            await this.storeDataLocally({
                quantum_states: [{
                    state_name: 'current_state',
                    state_vector: window.currentQuantumState,
                    timestamp: new Date().toISOString()
                }]
            });
        }
    }

    checkOnlineStatus() {
        // Additional check using fetch to a reliable endpoint
        fetch('/api/sync_status', {
            method: 'HEAD',
            cache: 'no-cache'
        })
        .then(() => {
            if (!this.isOnline) {
                this.isOnline = true;
                this.handleConnectionRestored();
            }
        })
        .catch(() => {
            if (this.isOnline) {
                this.isOnline = false;
                this.handleConnectionLost();
            }
        });
    }

    showOnlineNotification() {
        this.showNotification('Connection Restored', 'You are back online. Data synchronization in progress...', 'success');
    }

    showOfflineNotification() {
        this.showNotification('Connection Lost', 'You are offline. Using cached data.', 'warning');
    }

    showNotification(title, message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `offline-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <strong>${title}</strong>
                <button onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="notification-body">${message}</div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    async forceSyncNow() {
        console.log('Forcing immediate sync...');
        await this.performSync();
    }

    setSyncInterval(minutes) {
        this.syncInterval = minutes * 60 * 1000;
        this.startPeriodicSync();
        console.log(`Sync interval updated to ${minutes} minutes`);
    }

    // Public API methods
    async getBackends(maxAgeMinutes = 30) {
        return await this.getOfflineData('backends', maxAgeMinutes);
    }

    async getJobs(maxAgeMinutes = 30) {
        return await this.getOfflineData('jobs', maxAgeMinutes);
    }

    async getMetrics(maxAgeMinutes = 30) {
        return await this.getOfflineData('metrics', maxAgeMinutes);
    }

    async getQuantumStates(maxAgeMinutes = 30) {
        return await this.getOfflineData('quantum_states', maxAgeMinutes);
    }

    isOnlineStatus() {
        return this.isOnline;
    }
}

// CSS for notifications
const notificationStyles = `
.offline-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 300px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    border-left: 4px solid;
    animation: slideIn 0.3s ease-out;
}

.offline-notification.success {
    border-left-color: #28a745;
}

.offline-notification.warning {
    border-left-color: #ffc107;
}

.offline-notification.error {
    border-left-color: #dc3545;
}

.notification-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
}

.notification-header strong {
    color: #333;
}

.notification-header button {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #666;
}

.notification-body {
    padding: 12px 16px;
    color: #666;
    font-size: 14px;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 100%;
    }
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize Offline Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.offlineManager = new OfflineManager();
});

// Export for browser compatibility
if (typeof window !== 'undefined' && !window.OfflineManager) {
    window.OfflineManager = OfflineManager;
}
