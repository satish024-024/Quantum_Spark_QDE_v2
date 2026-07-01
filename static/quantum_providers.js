/**
 * Quantum Providers - Frontend Configuration
 * 
 * UI PRESENTATION ONLY - truth comes from /api/providers
 * This file only contains display metadata (icons, colors, docs)
 */

// ==================== UI Metadata (Presentation Only) ====================
const PROVIDER_UI = {
    ibm: {
        displayName: 'IBM Quantum',
        icon: '🔵',
        color: '#0f62fe',
        logoUrl: '/static/images/ibm-quantum-logo.svg',
        docs: 'https://quantum.ibm.com/docs',
        description: 'Access IBM\'s superconducting quantum processors'
    },
    ionq: {
        displayName: 'IonQ',
        icon: '⚛️',
        color: '#3b82f6',
        logoUrl: '/static/images/ionq-logo.svg',
        docs: 'https://ionq.com/docs',
        description: 'Trapped-ion quantum computers with high fidelity'
    },
    rigetti: {
        displayName: 'Rigetti',
        icon: '🟣',
        color: '#8b5cf6',
        logoUrl: '/static/images/rigetti-logo.svg',
        docs: 'https://docs.rigetti.com/',
        description: 'Superconducting quantum processors via Rigetti QCS'
    },
    aws_braket: {
        displayName: 'AWS Braket',
        icon: '🟠',
        color: '#ff9900',
        logoUrl: '/static/images/aws-braket-logo.svg',
        docs: 'https://aws.amazon.com/braket/',
        description: 'Run on IonQ, Rigetti, and other providers via AWS'
    },
    azure: {
        displayName: 'Azure Quantum',
        icon: '🔷',
        color: '#0078d4',
        logoUrl: '/static/images/azure-quantum-logo.svg',
        docs: 'https://azure.microsoft.com/en-us/products/quantum',
        description: 'Microsoft Azure quantum cloud service'
    },
    google: {
        displayName: 'Google Quantum AI',
        icon: '🟢',
        color: '#34a853',
        logoUrl: '/static/images/google-quantum-logo.svg',
        docs: 'https://quantumai.google/',
        description: 'Google\'s quantum processors and simulators',
        restricted: true
    },
    local: {
        displayName: 'Local Simulator',
        icon: '💻',
        color: '#00d4ff',
        logoUrl: null,
        docs: null,
        description: 'Run circuits locally using Qiskit Aer'
    }
};

// ==================== Live Provider Data Fetching ====================

/**
 * Fetch live provider data from backend API
 * Merges with UI metadata for display
 * 
 * @returns {Promise<Object>} Providers with UI metadata
 */
async function fetchProviders() {
    try {
        console.log('🔄 Fetching providers from /api/providers...');

        const response = await fetch('/api/providers');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Received provider data:', data);

        // Merge backend data with UI metadata
        const providers = {};
        for (const [key, backendData] of Object.entries(data.providers || {})) {
            providers[key] = {
                ...backendData,              // Backend data (truth)
                ...(PROVIDER_UI[key] || {}), // UI metadata (presentation)
                id: key
            };
        }

        console.log('📊 Merged providers:', Object.keys(providers));
        return {
            providers,
            timestamp: data.timestamp,
            version: data.version
        };

    } catch (error) {
        console.error('❌ Failed to fetch providers:', error);

        // Fallback: return UI metadata only with error
        const providers = {};
        for (const [key, uiData] of Object.entries(PROVIDER_UI)) {
            providers[key] = {
                ...uiData,
                id: key,
                backends: [],
                error: 'Failed to fetch live data from backend'
            };
        }

        return {
            providers,
            timestamp: new Date().toISOString(),
            version: 'v1',
            error: error.message
        };
    }
}

/**
 * Fetch ONLY a single provider's data from backend API
 * Prevents unnecessary API calls to other providers
 * 
 * @param {string} providerId - Provider to fetch ('ibm', 'ionq', etc.)
 * @returns {Promise<Object>} Provider with UI metadata
 */
async function fetchSingleProvider(providerId) {
    try {
        console.log(`🔄 [SCOPED] Fetching ONLY ${providerId} from /api/providers/${providerId}...`);

        const response = await fetch(`/api/providers/${providerId}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ [SCOPED] Received ${providerId} data:`, data);

        // Merge backend data with UI metadata
        const providerData = {
            ...data.provider,              // Backend data (truth)
            ...(PROVIDER_UI[providerId] || {}), // UI metadata (presentation)
            id: providerId
        };

        console.log(`📊 [SCOPED] ${providerId} has ${providerData.backends?.length || 0} backends`);

        return {
            provider: providerData,
            timestamp: data.timestamp,
            version: data.version
        };

    } catch (error) {
        console.error(`❌ Failed to fetch provider ${providerId}:`, error);

        // Fallback: return UI metadata only with error
        const providerData = {
            ...(PROVIDER_UI[providerId] || {}),
            id: providerId,
            backends: [],
            error: 'Failed to fetch live data from backend'
        };

        return {
            provider: providerData,
            timestamp: new Date().toISOString(),
            version: 'v1',
            error: error.message
        };
    }
}


/**
 * Get provider by ID
 * 
 * @param {string} providerId - Provider identifier
 * @param {Object} providersData - Data from fetchProviders()
 * @returns {Object|null} Provider or null
 */
function getProvider(providerId, providersData) {
    return providersData.providers[providerId] || null;
}

/**
 * Get all backends across all providers
 * 
 * @param {Object} providersData - Data from fetchProviders()
 * @returns {Array} All backends with provider info
 */
function getAllBackends(providersData) {
    const backends = [];

    for (const [providerId, provider] of Object.entries(providersData.providers)) {
        for (const backend of (provider.backends || [])) {
            backends.push({
                ...backend,
                provider: providerId,
                providerName: provider.displayName
            });
        }
    }

    return backends;
}

/**
 * Filter backends by type (qpu, simulator)
 * 
 * @param {Object} providersData - Data from fetchProviders()
 * @param {string} type - 'qpu' or 'simulator'
 * @returns {Array} Filtered backends
 */
function getBackendsByType(providersData, type) {
    return getAllBackends(providersData).filter(b => b.type === type);
}

/**
 * Get available (online) backends only
 * 
 * @param {Object} providersData - Data from fetchProviders()
 * @returns {Array} Available backends
 */
function getAvailableBackends(providersData) {
    return getAllBackends(providersData).filter(b => b.status === 'online');
}

// ==================== UI Helper Functions ====================

/**
 * Create provider dropdown HTML
 * 
 * @param {Object} providersData - Data from fetchProviders()
 * @param {string} selectedId - Currently selected provider ID
 * @returns {string} HTML for dropdown
 */
function createProviderDropdown(providersData, selectedId = 'ibm') {
    let html = '<select id="provider-selector" class="provider-dropdown">';

    for (const [id, provider] of Object.entries(providersData.providers)) {
        const disabled = provider.restricted && !provider.backends?.length ? 'disabled' : '';
        const selected = id === selectedId ? 'selected' : '';

        html += `<option value="${id}" ${selected} ${disabled}>`;
        html += `${provider.icon} ${provider.displayName}`;
        if (provider.restricted) html += ' 🔒';
        html += '</option>';
    }

    html += '</select>';
    return html;
}

/**
 * Create backend dropdown HTML for a provider
 * 
 * @param {Object} provider - Provider object
 * @param {string} selectedBackendId - Currently selected backend
 * @returns {string} HTML for dropdown
 */
function createBackendDropdown(provider, selectedBackendId = null) {
    if (!provider || !provider.backends || provider.backends.length === 0) {
        return '<select disabled><option>No backends available</option></select>';
    }

    let html = '<select id="backend-selector" class="backend-dropdown">';

    for (const backend of provider.backends) {
        const selected = backend.id === selectedBackendId ? 'selected' : '';
        const offline = backend.status !== 'online' ? 'disabled' : '';

        html += `<option value="${backend.id}" ${selected} ${offline}>`;
        html += `${backend.name} (${backend.qubits}q)`;
        if (backend.status !== 'online') html += ' [Offline]';
        if (backend.queue_depth > 0) html += ` [Queue: ${backend.queue_depth}]`;
        html += '</option>';
    }

    html += '</select>';
    return html;
}

// ==================== Export for Browser ====================
if (typeof window !== 'undefined') {
    window.QuantumProviders = {
        PROVIDER_UI,
        fetchProviders,
        fetchSingleProvider,  // NEW: Scoped provider fetching
        getProvider,
        getAllBackends,
        getBackendsByType,
        getAvailableBackends,
        createProviderDropdown,
        createBackendDropdown
    };

    console.log('✅ Quantum Providers module loaded');
}

// ==================== Export for Node.js ====================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PROVIDER_UI,
        fetchProviders,
        fetchSingleProvider,  // NEW: Scoped provider fetching
        getProvider,
        getAllBackends,
        getBackendsByType,
        getAvailableBackends,
        createProviderDropdown,
        createBackendDropdown
    };
}
