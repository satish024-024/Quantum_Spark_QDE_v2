// API utilities with retry logic, timeout handling, and request deduplication

const API_CONFIG = {
    DEFAULT_TIMEOUT: 60000,    // 60 seconds - allow slow IBM Quantum API calls to complete
    MAX_RETRIES: 1,            // Maximum number of retry attempts (reduced to prevent long waits)
    RETRY_DELAY: 5000,         // 5 second delay between retries (increased to reduce rate limiting)
    // IMPORTANT: 429 removed from retry codes - retrying on rate limit causes cascade failures
    RETRY_STATUS_CODES: [408, 502, 503, 504],  // Status codes that trigger retry (NOT 429!)
    CONNECTION_TIMEOUT: 3000,  // 3 seconds for initial connection
    RATE_LIMIT_BACKOFF: 60000  // 60 second backoff when rate limited (429)
};

// Request deduplication: track in-flight requests to prevent duplicate calls
const pendingRequests = new Map();

// Global rate limit tracking
let globalRateLimitUntil = 0;

// CRITICAL FIX: Global response cache shared across all modules
// This prevents redundant API calls and stores parsed JSON data
window.globalApiCache = window.globalApiCache || new Map();
const GLOBAL_CACHE_TTL = 60000; // 60 seconds

/**
 * Check if we're currently rate limited
 * @returns {boolean} - True if rate limited
 */
function isRateLimited() {
    return Date.now() < globalRateLimitUntil;
}

/**
 * Set global rate limit
 * @param {number} backoffMs - Backoff time in milliseconds
 */
function setRateLimit(backoffMs) {
    globalRateLimitUntil = Date.now() + backoffMs;
    console.warn(`⚠️ Global rate limit set for ${backoffMs / 1000}s`);
}

/**
 * Enhanced fetch function with timeout, retry logic, and request deduplication
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} [options.timeout] - Timeout in milliseconds
 * @param {number} [options.retries] - Number of retries
 * @param {number} [options.retryDelay] - Delay between retries in milliseconds
 * @returns {Promise<Response>} - Fetch response
 */
async function fetchWithRetry(url, options = {}) {
    // CRITICAL FIX: Check global cache first to prevent redundant API calls
    const cacheKey = `${options.method || 'GET'}:${url}`;
    const cachedData = getGlobalCache(cacheKey);
    if (cachedData) {
        console.log(`🎯 Using global cache for ${url}`);
        // Return a fake Response object with the cached data
        return new Response(JSON.stringify(cachedData), {
            status: 200,
            statusText: 'OK (Cached)',
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Check global rate limit first
    if (isRateLimited()) {
        const waitTime = Math.ceil((globalRateLimitUntil - Date.now()) / 1000);
        console.warn(`⏳ Rate limited, waiting ${waitTime}s before request to ${url}`);
        throw new Error(`Rate limited. Please wait ${waitTime}s`);
    }

    // Request deduplication: if same request is in-flight, return that promise
    const requestKey = `${options.method || 'GET'}:${url}`;
    if (pendingRequests.has(requestKey)) {
        console.log(`🔄 Deduplicating request to ${url}`);
        return pendingRequests.get(requestKey);
    }

    const timeout = options.timeout || API_CONFIG.DEFAULT_TIMEOUT;
    const maxRetries = options.retries || API_CONFIG.MAX_RETRIES;
    const retryDelay = options.retryDelay || API_CONFIG.RETRY_DELAY;

    let lastError;

    const requestPromise = (async () => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Create abort controller for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    console.warn(`Request to ${url} timed out after ${timeout}ms`);
                    controller.abort();
                }, timeout);

                // Add signal to options with better error handling
                const fetchOptions = {
                    ...options,
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        ...options.headers
                    }
                };

                try {
                    const response = await fetch(url, fetchOptions);
                    clearTimeout(timeoutId);

                    // Handle rate limiting (429)
                    if (response.status === 429) {
                        setRateLimit(API_CONFIG.RATE_LIMIT_BACKOFF);
                        throw new Error(`Rate limited (429). Retry after ${API_CONFIG.RATE_LIMIT_BACKOFF / 1000}s`);
                    }

                    // Check if response needs retry
                    if (!response.ok && API_CONFIG.RETRY_STATUS_CODES.includes(response.status)) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    // CRITICAL FIX: Clone and cache successful responses
                    const clonedResponse = response.clone();

                    // Parse and cache the response data for future requests
                    try {
                        const data = await clonedResponse.json();
                        setGlobalCache(cacheKey, data);
                        console.log(`✓ Cached response for ${url}`);
                    } catch (jsonError) {
                        console.warn(`⚠️ Failed to parse JSON for caching: ${jsonError.message}`);
                    }

                    // Return another clone for the caller to use
                    return response.clone();

                } catch (error) {
                    clearTimeout(timeoutId);
                    // Handle different types of errors
                    if (error.name === 'AbortError') {
                        console.warn(`Request to ${url} was aborted (timeout: ${timeout}ms)`);
                        lastError = new Error(`Request timeout after ${timeout}ms`);
                    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                        console.warn(`Network error for ${url}: ${error.message}`);
                        lastError = new Error(`Network error: ${error.message}`);
                    } else {
                        console.warn(`Request error for ${url}: ${error.message}`);
                        lastError = error;
                    }
                }

            } catch (error) {
                lastError = error;
            }

            // Don't wait on the last attempt
            if (attempt < maxRetries) {
                console.log(`API call failed, retrying in ${retryDelay}ms... (${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }

        throw lastError;
    })();

    // Store pending request
    pendingRequests.set(requestKey, requestPromise);

    // Clean up after request completes
    requestPromise.finally(() => {
        pendingRequests.delete(requestKey);
    });

    return requestPromise;
}

/**
 * Helper function to check if response should be retried
 * @param {Response} response - Fetch response
 * @returns {boolean} - True if should retry
 */
function shouldRetry(response) {
    return !response.ok && API_CONFIG.RETRY_STATUS_CODES.includes(response.status);
}

/**
 * Get data from global cache
 * @param {string} key - Cache key
 * @returns {Object|null} - Cached data or null
 */
function getGlobalCache(key) {
    const cached = window.globalApiCache.get(key);
    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > GLOBAL_CACHE_TTL) {
        window.globalApiCache.delete(key);
        return null;
    }

    return cached.data;
}

/**
 * Set data in global cache
 * @param {string} key - Cache key
 * @param {Object} data - Data to cache
 */
function setGlobalCache(key, data) {
    window.globalApiCache.set(key, {
        data: data,
        timestamp: Date.now()
    });
}

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of window.globalApiCache.entries()) {
        if (now - value.timestamp > GLOBAL_CACHE_TTL) {
            window.globalApiCache.delete(key);
        }
    }
}

// Clear expired cache entries every minute
setInterval(clearExpiredCache, 60000);

// Export utilities
window.apiUtils = {
    fetchWithRetry,
    API_CONFIG,
    isRateLimited,
    setRateLimit,
    getGlobalCache,
    setGlobalCache,
    clearExpiredCache
};
