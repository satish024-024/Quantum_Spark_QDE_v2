// Essential timeout fixes for hackathon_dashboard.js
// This file contains the key fixes to resolve widget timeout issues

// 1. Increase widget update timeout from 3 seconds to 10 seconds
const WIDGET_UPDATE_TIMEOUT = 10000; // 10 seconds instead of 3

// 2. Add caching helper methods
function getCachedData(key) {
    try {
        const cached = localStorage.getItem(`dashboard_cache_${key}`);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error('Error reading cache:', error);
        return null;
    }
}

function setCachedData(key, data) {
    try {
        const cacheData = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(`dashboard_cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error setting cache:', error);
    }
}

function clearCache() {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('dashboard_cache_')) {
                localStorage.removeItem(key);
            }
        });
        console.log('✅ Dashboard cache cleared');
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

// 3. Improved widget update with timeout and caching
async function updateWidgetWithTimeout(widgetType, updateFunction) {
    const cacheKey = `${widgetType}_cache`;
    const now = Date.now();
    const cachedData = getCachedData(cacheKey);
    
    // Use cached data if available (within 30 seconds)
    if (cachedData && (now - cachedData.timestamp) < 30000) {
        console.log(`📦 Using cached ${widgetType} data`);
        return cachedData.data;
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second API timeout
        
        const result = await Promise.race([
            updateFunction(controller.signal),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Widget ${widgetType} update timeout`)), WIDGET_UPDATE_TIMEOUT)
            )
        ]);
        
        clearTimeout(timeoutId);
        
        // Cache the result
        setCachedData(cacheKey, result);
        
        return result;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error(`❌ ${widgetType} data fetch timeout`);
        } else {
            console.error(`Error updating ${widgetType} widget:`, error);
        }
        throw error;
    }
}

// 4. Summary cards fix - ensure metrics update properly
function updateSummaryCards() {
    // Force update all summary card elements
    const summaryElements = [
        'active-backends',
        'total-jobs', 
        'running-jobs',
        'success-rate',
        'avg-execution-time',
        'avg-queue-time',
        'avg-fidelity'
    ];
    
    summaryElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            // Trigger a re-render by temporarily hiding and showing
            element.style.display = 'none';
            setTimeout(() => {
                element.style.display = 'block';
            }, 10);
        }
    });
}

console.log('✅ Timeout fixes loaded - apply these changes to hackathon_dashboard.js');
