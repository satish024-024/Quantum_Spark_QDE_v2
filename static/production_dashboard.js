/**
 * Production Dashboard Extension
 * Extends the main dashboard with production-specific features
 */

console.log('🚀 Loading Production Dashboard Extension...');

// Wait for the main dashboard to be available
function waitForDashboard() {
    return new Promise((resolve) => {
        const check = () => {
            if (typeof window.HackathonDashboard !== 'undefined') {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
}

// Extend the HackathonDashboard class
class ProductionDashboard extends window.HackathonDashboard {
    constructor() {
        super();
        this.isProduction = true;
        this.productionFeatures = {
            realtimeMonitoring: true,
            advancedAnalytics: true,
            enhancedSecurity: true
        };
        
        // Initialize production-specific features
        this.initializeProductionFeatures();
    }
    
    initializeProductionFeatures() {
        console.log('🚀 Initializing production features...');
        
        // Add production-specific event listeners
        this.setupProductionEventListeners();
        
        // Initialize production widgets
        this.initializeProductionWidgets();
        
        // Start production monitoring
        this.startProductionMonitoring();
    }
    
    setupProductionEventListeners() {
        // Add any production-specific event listeners here
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('🔄 Tab became visible, refreshing data...');
                this.refreshAllData().catch(console.error);
            }
        });
    }
    
    initializeProductionWidgets() {
        // Initialize any production-specific widgets here
        console.log('📊 Initializing production widgets...');
    }
    
    startProductionMonitoring() {
        console.log('🔍 Starting production monitoring...');
        // Add production monitoring logic here
    }
    
    // Override or extend methods as needed
    updateAllWidgets() {
        console.log('🔄 Updating all production widgets...');
        return super.updateAllWidgets().then(() => {
            // Additional production-specific updates
            return this.updateProductionWidgets();
        });
    }
    
    updateProductionWidgets() {
        // Update production-specific widgets
        return Promise.resolve();
    }
}

// Initialize the production dashboard when everything is ready
async function initializeProductionDashboard() {
    try {
        // Wait for the main dashboard to be available
        await waitForDashboard();
        
        // Replace the default dashboard with the production version
        window.ProductionDashboard = ProductionDashboard;
        
        // If we're on the dashboard page, create an instance
        if (document.body.classList.contains('dashboard-page')) {
            window.dashboard = new ProductionDashboard();
            console.log('✅ Production Dashboard initialized successfully');
        }
    } catch (error) {
        console.error('❌ Failed to initialize Production Dashboard:', error);
    }
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeProductionDashboard);
} else {
    initializeProductionDashboard();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProductionDashboard };
}
