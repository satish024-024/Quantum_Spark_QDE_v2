/**
 * RemoteDataService - HTTP-coupled data boundary
 * 
 * PRODUCTION-GRADE CORRECTIONS APPLIED:
 * ✅ #1: Backoff enforced in get() - prevents 429 reintroduction
 * ✅ #2: Backend-driven TTL - no frontend inference, loud fallback
 * ✅ #3: Backend ETag for state - no JSON.stringify performance landmine
 * ✅ #4: Named to reflect HTTP coupling - not transport-agnostic
 * ✅ #5: Subscription typed events with immediate cache replay
 * ✅ #6: Global singleton documented and enforced
 * ✅ #7: ESLint scoped to /ui/ and /widgets/
 * 
 * @version 1.0.0
 * @author Quantum Spark Team
 */

class RemoteDataService {
    constructor() {
        // Single cache: parsed data + backend metadata
        this.cache = new Map();

        // HTTP metadata per resource (ETag, Last-Modified)
        this.metadata = new Map();

        // Per-endpoint backoff enforcement
        this.backoff = new Map();

        // In-flight request deduplication
        this.pending = new Map();

        // Subscribers for reactive updates
        this.subscribers = new Map();

        // Periodic cache cleanup
        setInterval(() => this._clearExpiredCache(), 60000);

        console.log('✅ RemoteDataService initialized (HTTP-coupled data boundary)');
    }

    /**
     * Get data with cache-first, revalidation strategy
     * BLOCKING FIX #1: Enforces backoff BEFORE attempting fetch
     * 
     * @param {string} resource - Resource URL
     * @param {Object} options - Options
     * @param {boolean} [options.forceRefresh] - Bypass cache
     * @returns {Promise<any>} Parsed data
     */
    async get(resource, options = {}) {
        // CRITICAL: Enforce backoff FIRST (blocks 429 reintroduction)
        const backoffUntil = this.backoff.get(resource);
        if (backoffUntil && Date.now() < backoffUntil) {
            const waitSeconds = Math.ceil((backoffUntil - Date.now()) / 1000);
            throw new Error(`Backoff active for ${resource}. Retry in ${waitSeconds}s`);
        }

        // 1. Check cache validity
        const cached = this._getCachedIfValid(resource);
        if (cached && !options.forceRefresh) {
            console.log(`🎯 Cache hit for ${resource}`);
            return cached.data;
        }

        // 2. Check if request already in-flight
        if (this.pending.has(resource)) {
            console.log(`⏳ Request in-flight for ${resource}, waiting...`);
            return this.pending.get(resource);
        }

        // 3. Fetch with metadata
        const promise = this._fetchWithRevalidation(resource);
        this.pending.set(resource, promise);

        try {
            const data = await promise;
            return data;
        } finally {
            this.pending.delete(resource);
        }
    }

    /**
     * Fetch with ETag/Last-Modified revalidation
     * @private
     */
    async _fetchWithRevalidation(resource) {
        const meta = this.metadata.get(resource) || {};
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // Add conditional request headers
        if (meta.etag) {
            headers['If-None-Match'] = meta.etag;
        }
        if (meta.lastModified) {
            headers['If-Modified-Since'] = meta.lastModified;
        }

        try {
            const response = await fetch(resource, { headers });

            // 304 Not Modified - return cached
            if (response.status === 304) {
                console.log(`✓ ${resource} not modified (304)`);
                const cached = this.cache.get(resource);
                return cached ? cached.data : null;
            }

            // 429 Rate Limited - respect Retry-After
            if (response.status === 429) {
                const retryAfter = this._parseRetryAfter(response);
                this.backoff.set(resource, Date.now() + retryAfter);
                console.error(`🚫 Rate limited on ${resource}. Retry after ${retryAfter}ms`);
                throw new Error(`Rate limited. Retry after ${retryAfter / 1000}s`);
            }

            // Check for other HTTP errors
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Parse and cache
            const data = await response.json();
            this._updateCache(resource, data, response);

            return data;

        } catch (error) {
            console.error(`❌ Fetch error for ${resource}:`, error.message);
            throw error;
        }
    }

    /**
     * Parse Retry-After header (seconds or HTTP date)
     * @private
     */
    _parseRetryAfter(response) {
        const retryAfter = response.headers.get('Retry-After');
        if (!retryAfter) return 60000; // Default 60s

        // Seconds
        if (/^\d+$/.test(retryAfter)) {
            return parseInt(retryAfter, 10) * 1000;
        }

        // HTTP date
        const retryDate = new Date(retryAfter);
        return Math.max(0, retryDate.getTime() - Date.now());
    }

    /**
     * Update cache with backend-provided metadata
     * BLOCKING FIX #3: Use backend ETag, not JSON.stringify
     * @private
     */
    _updateCache(resource, data, response) {
        const etag = response.headers.get('ETag');

        this.cache.set(resource, {
            data,
            timestamp: Date.now(),
            etag: etag  // Backend-provided state version
        });

        this.metadata.set(resource, {
            etag: etag,
            lastModified: response.headers.get('Last-Modified')
        });

        // Notify subscribers with typed update event
        this._notifySubscribers(resource, {
            type: 'update',
            data: data,
            timestamp: Date.now(),
            cached: false
        });

        console.log(`✓ Cached ${resource} (ETag: ${etag || 'none'})`);
    }

    /**
     * Cache validation with ETag freshness
     * BLOCKING FIX #2: TTL = minimum revalidation interval
     * @private
     */
    _getCachedIfValid(resource) {
        const cached = this.cache.get(resource);
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        const ttl = this._getTTL(cached.data);

        // TTL valid → serve cache (ETag will be checked on next revalidation)
        if (age < ttl) {
            return cached;
        }

        // TTL expired → must revalidate (will use If-None-Match with ETag)
        return null;
    }

    /**
     * Backend-driven TTL (BLOCKING FIX #2)
     * No frontend inference. No deprecated code. Zero ambiguity.
     * @private
     */
    _getTTL(data) {
        // Backend MUST provide recommended_ttl_ms
        if (data && typeof data.recommended_ttl_ms === 'number') {
            return data.recommended_ttl_ms;
        }

        // Explicitly loud fallback - makes missing backend contract visible
        console.warn(
            '[RemoteDataService] Backend did not provide recommended_ttl_ms.',
            'Falling back to default TTL. Fix backend API contract.'
        );

        return 60000; // Default 60s
    }

    /**
     * Subscribe to data changes with typed events
     * BLOCKING FIX #5: Immediate cache replay, typed events
     * 
     * Events:
     *   - {type: 'update', data: [...], timestamp, cached: boolean}
     *   - {type: 'invalidate', resource: string, timestamp}
     * 
     * @param {string} resource - Resource URL
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     */
    subscribe(resource, callback) {
        if (!this.subscribers.has(resource)) {
            this.subscribers.set(resource, new Set());
        }
        this.subscribers.get(resource).add(callback);

        // Immediate cache replay with typed event (prevents widget flash)
        const cached = this.cache.get(resource);
        if (cached) {
            queueMicrotask(() => callback({
                type: 'update',
                data: cached.data,
                timestamp: cached.timestamp,
                cached: true
            }));
        }

        // Return unsubscribe with cleanup
        return () => {
            const subs = this.subscribers.get(resource);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    this.subscribers.delete(resource);
                }
            }
        };
    }

    /**
     * Notify subscribers with typed events
     * @private
     */
    _notifySubscribers(resource, event) {
        const subs = this.subscribers.get(resource);
        if (subs) {
            subs.forEach(callback => callback(event));
        }
    }

    /**
     * Explicit invalidation with typed events
     * BLOCKING FIX #3: Never emits undefined
     * @param {string} resource - Resource URL
     */
    invalidate(resource) {
        this.cache.delete(resource);
        this.metadata.delete(resource);
        this.backoff.delete(resource);

        // Emit typed invalidation event (never undefined)
        this._notifySubscribers(resource, {
            type: 'invalidate',
            resource: resource,
            timestamp: Date.now()
        });

        console.log(`♻️ Invalidated cache for ${resource}`);
    }

    /**
     * Clear expired cache entries
     * @private
     */
    _clearExpiredCache() {
        const now = Date.now();
        let cleared = 0;

        for (const [resource, cached] of this.cache.entries()) {
            const age = now - cached.timestamp;
            const ttl = this._getTTL(cached.data);

            if (age > ttl * 2) { // Double TTL before cleanup
                this.cache.delete(resource);
                this.metadata.delete(resource);
                cleared++;
            }
        }

        if (cleared > 0) {
            console.log(`🧹 Cleared ${cleared} expired cache entries`);
        }
    }

    /**
     * Get cache statistics (for debugging/monitoring)
     */
    getStats() {
        const now = Date.now();
        const stats = {
            cacheSize: this.cache.size,
            backoffActive: 0,
            subscriberCount: 0
        };

        for (const until of this.backoff.values()) {
            if (now < until) stats.backoffActive++;
        }

        for (const subs of this.subscribers.values()) {
            stats.subscriberCount += subs.size;
        }

        return stats;
    }
}

/**
 * Global Singleton (BLOCKING FIX #6)
 * 
 * RULES:
 * - Exactly ONE instance per page
 * - Created BEFORE any consumers
 * - IMMUTABLE (no reassignment)
 * - HTTP-coupled (for WebSocket/IndexedDB, create separate service)
 */
if (window.remoteDataService) {
    throw new Error('RemoteDataService already initialized!');
}

Object.defineProperty(window, 'remoteDataService', {
    value: new RemoteDataService(),
    writable: false,
    configurable: false
});

console.log('✅ window.remoteDataService ready');
