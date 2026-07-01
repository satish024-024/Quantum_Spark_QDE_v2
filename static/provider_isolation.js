/**
 * STRICT PROVIDER DATA ISOLATION
 * 
 * Critical Production Requirement:
 * - When IBM mode: ONLY show IBM data
 * - When IonQ mode: ONLY show IonQ data  
 * - When Rigetti mode: ONLY show Rigetti data
 * - NO DATA MIXING between providers
 * 
 * This module enforces strict data isolation across all dashboard widgets.
 */

(function () {
    'use strict';

    // ==================== Global State ====================
    let currentProvider = 'ibm'; // Default provider
    let providersData = null;    // Cached provider data
    let lastFetchTime = 0;       // Cache timestamp
    const CACHE_DURATION = 30000; // 30 seconds

    // ==================== Race Condition Protection ====================
    let activeContextId = null;  // Current context version (race protection)
    let contextCounter = 0;      // Monotonic counter for context IDs

    /**
     * Generate unique context ID
     * Used to detect and abort stale async operations
     */
    function generateContextId() {
        contextCounter++;
        return `ctx_${Date.now()}_${contextCounter}`;
    }

    // ==================== Provider Switching ====================

    /**
     * Switch to a different provider
     * STRICT: Reloads ALL widgets with ONLY the selected provider's data
     * 
     * @param {string} providerId - Provider to switch to ('ibm', 'ionq', 'rigetti', etc.)
     */
    async function switchProvider(providerId) {
        if (!providerId) {
            console.error('❌ No provider ID specified');
            return;
        }

        // Generate unique context for this switch operation
        const contextId = generateContextId();
        activeContextId = contextId;

        console.log(`🔄 Switching to provider: ${providerId} (context: ${contextId})`);

        // Check if this provider requires API key authentication
        const requiresApiKey = !['ibm', 'local'].includes(providerId);

        if (requiresApiKey) {
            // Check if we already have credentials for this provider
            const hasCredentials = await checkProviderCredentials(providerId);

            if (!hasCredentials) {
                // Show API key modal and wait for user input
                const credentialsProvided = await showApiKeyModal(providerId);

                // GUARD: Check if context is still active after modal
                if (contextId !== activeContextId) {
                    console.warn(`⚠️ Context ${contextId} superseded during credential input, aborting`);
                    return;
                }

                if (!credentialsProvided) {
                    console.log('❌ User cancelled API key input');
                    return; // Don't switch provider
                }
            }
        }

        // Update global state
        const previousProvider = currentProvider;
        currentProvider = providerId;

        // Save to localStorage for persistence
        localStorage.setItem('selectedProvider', providerId);

        // Fetch ONLY this provider's data (scoped - no cross-provider API calls)
        await refreshProviderData(providerId);

        // GUARD: Check if context is still active after async fetch
        if (contextId !== activeContextId) {
            console.warn(`⚠️ Context ${contextId} superseded during data fetch, aborting`);
            currentProvider = previousProvider; // Rollback
            return;
        }

        // Get current provider data
        const provider = getProvider(providerId);

        if (!provider) {
            console.error(`❌ Provider not found: ${providerId}`);
            currentProvider = previousProvider; // Rollback
            return;
        }

        // ==================== STRICT DATA ISOLATION ====================
        // Reload ALL widgets with ONLY this provider's data

        console.log(`📊 Loading data EXCLUSIVELY for: ${provider.displayName} (context: ${contextId})`);

        // 1. Update UI theme
        updateProviderTheme(provider);

        // 2. Show provider-specific notice if not IBM
        showProviderNotice(provider);

        // 3. Hide/show widgets based on provider
        toggleWidgetsByProvider(provider);

        // 4. Reload backends widget (ONLY this provider)
        await reloadBackendsWidget(provider, contextId);

        // GUARD: Check context after widget reload
        if (contextId !== activeContextId) {
            console.warn(`⚠️ Context ${contextId} superseded after backends reload, aborting`);
            return;
        }

        // 5. Reload jobs widget (ONLY this provider's jobs)
        await reloadJobsWidget(provider, contextId);

        // GUARD: Check context after widget reload
        if (contextId !== activeContextId) {
            console.warn(`⚠️ Context ${contextId} superseded after jobs reload, aborting`);
            return;
        }

        // 6. Reload results and performance widgets (all providers)
        await reloadResultsWidget(provider);
        await reloadPerformanceWidget(provider);

        // 7. Update all dropdowns
        updateAllDropdowns(provider);

        // 8. Sync dashboard mode for metrics calculation
        window.dashboardMode = providerId;

        // 9. Refresh dashboard metrics with new provider
        if (window.dashboardMetrics) {
            await window.dashboardMetrics.onModeChange(providerId);
            await window.dashboardMetrics.refresh();
        }

        // INVARIANT: At this point, context is guaranteed to be active
        console.log(`✅ Switched to ${provider.displayName} - All data isolated (context: ${contextId})`);

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('providerChanged', {
            detail: { providerId, provider, contextId }
        }));

        // Dispatch dashboard mode change event
        window.dispatchEvent(new CustomEvent('dashboardModeChanged', {
            detail: { mode: providerId }
        }));
    }

    /**
     * Check if we have stored credentials for a provider
     */
    async function checkProviderCredentials(providerId) {
        try {
            const response = await fetch(`/api/provider/check-credentials?provider=${providerId}`);
            if (response.ok) {
                const data = await response.json();
                return data.hasCredentials === true;
            }
        } catch (error) {
            console.warn('Could not check credentials:', error);
        }

        // Check localStorage as fallback
        const storedKey = localStorage.getItem(`${providerId}_api_key`);
        return !!storedKey;
    }

    /**
     * Show API key input modal for a provider
     * @returns {Promise<boolean>} True if credentials were provided
     */
    async function showApiKeyModal(providerId) {
        return new Promise((resolve) => {
            // Provider-specific configuration
            const providerConfigs = {
                ionq: {
                    name: 'IonQ',
                    color: '#8b5cf6',
                    icon: '⚛️',
                    fields: [
                        { id: 'api_key', label: 'IonQ API Key', placeholder: 'Enter your IonQ API key', type: 'password', required: true }
                    ],
                    helpUrl: 'https://cloud.ionq.com/settings/keys',
                    helpText: 'Get your API key from the IonQ Cloud Console'
                },
                aws_braket: {
                    name: 'AWS Braket',
                    color: '#ff9900',
                    icon: '☁️',
                    fields: [
                        { id: 'access_key', label: 'AWS Access Key ID', placeholder: 'AKIAIOSFODNN7EXAMPLE', type: 'text', required: true },
                        { id: 'secret_key', label: 'AWS Secret Access Key', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', type: 'password', required: true },
                        { id: 'region', label: 'AWS Region', placeholder: 'us-east-1', type: 'text', required: true, default: 'us-east-1' }
                    ],
                    helpUrl: 'https://docs.aws.amazon.com/braket/latest/developerguide/braket-getting-started.html',
                    helpText: 'Configure AWS credentials for Braket access'
                },
                azure: {
                    name: 'Azure Quantum',
                    color: '#0078d4',
                    icon: '☁️',
                    fields: [
                        { id: 'subscription_id', label: 'Subscription ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'text', required: true },
                        { id: 'resource_group', label: 'Resource Group', placeholder: 'my-quantum-rg', type: 'text', required: true },
                        { id: 'workspace', label: 'Workspace Name', placeholder: 'my-quantum-workspace', type: 'text', required: true }
                    ],
                    helpUrl: 'https://learn.microsoft.com/en-us/azure/quantum/',
                    helpText: 'You\'ll be redirected to Azure login after saving'
                },
                rigetti: {
                    name: 'Rigetti',
                    color: '#00d4aa',
                    icon: '🔷',
                    fields: [
                        { id: 'api_key', label: 'Rigetti API Key', placeholder: 'Enter your Rigetti QCS API key', type: 'password', required: true }
                    ],
                    helpUrl: 'https://docs.rigetti.com/qcs/',
                    helpText: 'Get your API key from Rigetti QCS'
                },
                google: {
                    name: 'Google Quantum',
                    color: '#4285f4',
                    icon: '🔶',
                    fields: [
                        { id: 'project_id', label: 'Google Cloud Project ID', placeholder: 'my-quantum-project', type: 'text', required: true },
                        { id: 'processor_id', label: 'Processor ID', placeholder: 'rainbow', type: 'text', required: false }
                    ],
                    helpUrl: 'https://quantumai.google/cirq/google/concepts',
                    helpText: 'You\'ll be redirected to Google OAuth after saving'
                },
                quantinuum: {
                    name: 'Quantinuum',
                    color: '#ff6b6b',
                    icon: '⚛️',
                    fields: [
                        { id: 'username', label: 'Quantinuum Username', placeholder: 'your.email@example.com', type: 'email', required: true },
                        { id: 'password', label: 'Password', placeholder: '••••••••', type: 'password', required: true }
                    ],
                    helpUrl: 'https://um.qapi.quantinuum.com/',
                    helpText: 'Use your Quantinuum User Portal credentials'
                },
                dwave: {
                    name: 'D-Wave',
                    color: '#1e88e5',
                    icon: '🔶',
                    fields: [
                        { id: 'api_token', label: 'D-Wave API Token', placeholder: 'Enter your Leap API token', type: 'password', required: true },
                        { id: 'region', label: 'Region', placeholder: 'na-west-1', type: 'text', required: false, default: 'na-west-1' }
                    ],
                    helpUrl: 'https://cloud.dwavesys.com/leap/',
                    helpText: 'Get your token from D-Wave Leap'
                },
                xanadu: {
                    name: 'Xanadu',
                    color: '#22c55e',
                    icon: '🟢',
                    fields: [
                        { id: 'api_key', label: 'Xanadu Cloud API Key', placeholder: 'Enter your Xanadu Cloud API key', type: 'password', required: true }
                    ],
                    helpUrl: 'https://cloud.xanadu.ai/',
                    helpText: 'Get your API key from Xanadu Cloud'
                }
            };

            const config = providerConfigs[providerId] || {
                name: providerId.toUpperCase(),
                color: '#6366f1',
                icon: '🔌',
                fields: [{ id: 'api_key', label: 'API Key', placeholder: 'Enter API key', type: 'password', required: true }],
                helpUrl: '#',
                helpText: 'Enter your credentials to connect'
            };

            // Create modal HTML
            const modal = document.createElement('div');
            modal.id = 'provider-api-key-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                backdrop-filter: blur(8px);
            `;

            const fieldsHtml = config.fields.map(field => `
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; color: #b0b0b0; font-size: 13px; font-weight: 500;">
                        ${field.label} ${field.required ? '<span style="color: #ef4444;">*</span>' : ''}
                    </label>
                    <input 
                        type="${field.type}" 
                        id="provider-field-${field.id}"
                        placeholder="${field.placeholder}"
                        value="${field.default || ''}"
                        ${field.required ? 'required' : ''}
                        style="
                            width: 100%;
                            padding: 12px 16px;
                            background: rgba(0, 0, 0, 0.4);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            border-radius: 8px;
                            color: #fff;
                            font-size: 14px;
                            outline: none;
                            transition: border-color 0.2s;
                        "
                        onfocus="this.style.borderColor='${config.color}'"
                        onblur="this.style.borderColor='rgba(255,255,255,0.1)'"
                    />
                </div>
            `).join('');

            modal.innerHTML = `
                <div style="
                    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 32px;
                    max-width: 480px;
                    width: 90%;
                    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
                ">
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                        <div style="
                            width: 56px;
                            height: 56px;
                            background: ${config.color}20;
                            border-radius: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 28px;
                        ">${config.icon}</div>
                        <div>
                            <h2 style="margin: 0; color: #fff; font-size: 22px; font-weight: 600;">
                                Connect to ${config.name}
                            </h2>
                            <p style="margin: 4px 0 0 0; color: #888; font-size: 13px;">
                                Enter your credentials to access ${config.name} quantum backends
                            </p>
                        </div>
                    </div>

                    <form id="provider-credentials-form">
                        ${fieldsHtml}

                        <div style="
                            background: rgba(0, 0, 0, 0.3);
                            border-radius: 8px;
                            padding: 12px 16px;
                            margin-bottom: 24px;
                            display: flex;
                            align-items: start;
                            gap: 10px;
                        ">
                            <span style="font-size: 16px;">💡</span>
                            <div>
                                <p style="margin: 0; color: #888; font-size: 12px; line-height: 1.5;">
                                    ${config.helpText}
                                </p>
                                <a href="${config.helpUrl}" target="_blank" style="
                                    color: ${config.color};
                                    text-decoration: none;
                                    font-size: 12px;
                                    font-weight: 500;
                                ">Get API Key →</a>
                            </div>
                        </div>

                        <div style="display: flex; gap: 12px;">
                            <button type="button" id="cancel-provider-btn" style="
                                flex: 1;
                                padding: 14px;
                                background: rgba(255, 255, 255, 0.05);
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                border-radius: 10px;
                                color: #888;
                                font-size: 15px;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s;
                            ">Cancel</button>
                            <button type="submit" style="
                                flex: 2;
                                padding: 14px;
                                background: linear-gradient(135deg, ${config.color} 0%, ${config.color}cc 100%);
                                border: none;
                                border-radius: 10px;
                                color: #fff;
                                font-size: 15px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s;
                            ">Connect to ${config.name}</button>
                        </div>
                    </form>

                    <p style="margin: 16px 0 0 0; text-align: center; color: #555; font-size: 11px;">
                        🔒 Credentials are encrypted and stored securely in your session
                    </p>
                </div>
            `;

            document.body.appendChild(modal);

            // Focus first input
            const firstInput = modal.querySelector('input');
            if (firstInput) firstInput.focus();

            // Handle cancel
            modal.querySelector('#cancel-provider-btn').onclick = () => {
                modal.remove();
                resolve(false);
            };

            // Handle escape key
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escHandler);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', escHandler);

            // Handle form submit
            modal.querySelector('#provider-credentials-form').onsubmit = async (e) => {
                e.preventDefault();

                // Collect credentials
                const credentials = { provider: providerId };
                config.fields.forEach(field => {
                    const input = modal.querySelector(`#provider-field-${field.id}`);
                    credentials[field.id] = input.value.trim();
                });

                // Validate required fields
                const missingFields = config.fields
                    .filter(f => f.required && !credentials[f.id])
                    .map(f => f.label);

                if (missingFields.length > 0) {
                    alert(`Please fill in: ${missingFields.join(', ')}`);
                    return;
                }

                // Show loading state
                const submitBtn = modal.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Connecting...';
                submitBtn.disabled = true;

                try {
                    // Send credentials to backend
                    const response = await fetch('/api/provider/save-credentials', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(credentials)
                    });

                    if (response.ok) {
                        const result = await response.json();
                        console.log(`✅ ${config.name} credentials saved successfully`);
                        console.log('📡 Backend response:', result);

                        // Store minimal info in localStorage (not the actual keys)
                        localStorage.setItem(`${providerId}_connected`, 'true');

                        modal.remove();
                        document.removeEventListener('keydown', escHandler);

                        // CRITICAL FIX: Refresh provider data after successful authentication
                        console.log('🔄 Refreshing provider data after authentication...');
                        await refreshProviderData();

                        // Trigger widget updates if backend indicated
                        if (result.refresh_required || result.widget_updates) {
                            console.log('🔄 Backend requested widget refresh - updating all widgets');

                            // Get updated provider object with new backends
                            const updatedProvider = getProvider(providerId);
                            if (updatedProvider) {
                                // Force reload all relevant widgets
                                await reloadBackendsWidget(updatedProvider);
                                await reloadJobsWidget(updatedProvider);

                                console.log(`✅ All widgets updated for ${config.name}`);
                            }
                        }

                        resolve(true);
                    } else {
                        const error = await response.json();
                        throw new Error(error.message || 'Failed to save credentials');
                    }
                } catch (error) {
                    console.error('Failed to save credentials:', error);
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    alert(`Connection failed: ${error.message}\n\nPlease check your credentials and try again.`);
                }
            };
        });
    }

    /**
     * Refresh provider data from API
     * Uses SCOPED fetching when providerId specified (fetches ONLY that provider)
     * Falls back to fetching ALL providers if no providerId specified
     * 
     * @param {string} providerId - Optional provider ID for scoped fetching
     */
    async function refreshProviderData(providerId = null) {
        if (providerId) {
            console.log(`🔄 [SCOPED] Refreshing ONLY ${providerId} data...`);

            try {
                const data = await window.QuantumProviders.fetchSingleProvider(providerId);

                // Update ONLY this provider in cache
                if (!providersData) {
                    providersData = { providers: {}, timestamp: data.timestamp, version: data.version };
                }
                providersData.providers[providerId] = data.provider;
                lastFetchTime = Date.now();

                console.log(`✅ [SCOPED] ${providerId} data refreshed`);
                return providersData;

            } catch (error) {
                console.error(`❌ Failed to refresh ${providerId}:`, error);
                throw error;
            }
        } else {
            console.log('🔄 Refreshing ALL provider data from API...');

            try {
                const data = await window.QuantumProviders.fetchProviders();
                providersData = data;
                lastFetchTime = Date.now();

                console.log('✅ Provider data refreshed:', Object.keys(data.providers));
                return data;

            } catch (error) {
                console.error('❌ Failed to refresh provider data:', error);
                throw error;
            }
        }
    }

    /**
     * Get cached provider data (with auto-refresh)
     */
    async function getProvidersData() {
        const now = Date.now();

        // Auto-refresh if cache is stale
        if (!providersData || (now - lastFetchTime) > CACHE_DURATION) {
            await refreshProviderData();
        }

        return providersData;
    }

    /**
     * Get current provider object
     * @param {string} providerId - Optional provider ID (defaults to current)
     */
    function getProvider(providerId = null) {
        const id = providerId || currentProvider;

        if (!providersData) {
            console.warn('⚠️  Provider data not loaded yet');
            return null;
        }

        const rawProvider = providersData.providers[id];
        if (!rawProvider) {
            return null;
        }

        // Provider display configuration (matches modal config)
        const providerConfigs = {
            ibm: { displayName: 'IBM Quantum', color: '#667eea', icon: '🔵' },
            local: { displayName: 'Local Simulator', color: '#10b981', icon: '💻' },
            ionq: { displayName: 'IonQ', color: '#6366f1', icon: '⚡' },
            aws_braket: { displayName: 'AWS Braket', color: '#ff9900', icon: '☁️' },
            azure: { displayName: 'Azure Quantum', color: '#0078d4', icon: '☁️' },
            rigetti: { displayName: 'Rigetti', color: '#00d4aa', icon: '🔷' },
            google: { displayName: 'Google Quantum', color: '#4285f4', icon: '🔶' },
            quantinuum: { displayName: 'Quantinuum', color: '#ff6b6b', icon: '⚛️' },
            dwave: { displayName: 'D-Wave', color: '#1e88e5', icon: '🔶' },
            xanadu: { displayName: 'Xanadu', color: '#22c55e', icon: '🟢' }
        };

        const config = providerConfigs[id] || {
            displayName: id.toUpperCase(),
            color: '#06b6d4',
            icon: '🔌'
        };

        // Return enriched provider object
        return {
            id: id,
            ...rawProvider,
            displayName: config.displayName,
            color: config.color,
            icon: config.icon
        };
    }

    // ==================== Widget Reload Functions ====================

    /**
     * Reload backends widget with ONLY selected provider's backends
     * Uses the SAME beautiful IBM-style card layout
     */
    async function reloadBackendsWidget(provider) {
        console.log(`📡 [${provider.id.toUpperCase()}] Reloading backends...`);

        try {
            // Get backends from provider data
            const providerBackends = provider.backends || [];

            console.log(`✅ [${provider.id.toUpperCase()}] Found ${providerBackends.length} backends`);
            providerBackends.forEach((b, i) => {
                const name = typeof b === 'string' ? b : (b.name || b.backend_name || 'Unknown');
                console.log(`   ${i + 1}. ${name}`);
            });

            // Update the backends summary card
            const backendsCard = document.getElementById('active-backends');
            if (backendsCard) {
                backendsCard.textContent = providerBackends.length;
            }

            // Normalize backend data to match expected format
            const normalizedBackends = providerBackends.map(b => {
                if (typeof b === 'string') {
                    return { name: b, num_qubits: '?', status: 'online', queue: 0, tier: 'Free' };
                }
                return {
                    name: b.name || b.backend_name || b.id || 'Unknown',
                    num_qubits: b.qubits || b.num_qubits || b.n_qubits || '?',
                    status: b.status || 'active',
                    queue: b.queue || b.pending_jobs || b.queue_depth || 0,
                    tier: b.tier || (b.type === 'qpu' ? 'Paid' : 'Free'),
                    provider: b.provider || provider.displayName
                };
            });

            // Use the existing quantumWidgets renderer if available
            if (window.quantumWidgets && typeof window.quantumWidgets.renderBackendsContent === 'function') {
                const backendsWidget = document.querySelector('.backends-widget, #quantum-backends, [data-widget="backends"]');
                if (backendsWidget) {
                    const contentArea = backendsWidget.querySelector('.widget-content, .content, .backends-list');
                    if (contentArea) {
                        window.quantumWidgets.renderBackendsContent(normalizedBackends, contentArea);
                        console.log(`✅ [${provider.id.toUpperCase()}] Used quantumWidgets.renderBackendsContent`);
                        return;
                    }
                }
            }

            // Fallback: Render IBM-style cards directly (same design as widgets.js)
            const backendsWidget = document.querySelector('.backends-widget, #quantum-backends, [data-widget="backends"]');
            if (backendsWidget) {
                const contentArea = backendsWidget.querySelector('.widget-content, .content, .backends-list');
                if (contentArea && normalizedBackends.length > 0) {
                    const backendCards = normalizedBackends.slice(0, 3).map(backend => {
                        const isActive = backend.status === 'active' || backend.status === 'online';
                        const statusColor = isActive ? '#4CAF50' : '#FF9800';
                        const statusIcon = isActive ? 'fa-check-circle' : 'fa-clock';
                        const tier = backend.tier || 'Free';
                        const tierColor = tier.toLowerCase() === 'free' ? '#10b981' : '#f59e0b';

                        return `
                        <div class="backend-card" 
                             onclick="window.quantumWidgets?.showBackendDetails?.('${backend.name}')"
                             style="
                                background: var(--glass-bg, rgba(255,255,255,0.05)); 
                                padding: 1rem; 
                                border-radius: 8px; 
                                margin-bottom: 1rem; 
                                border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
                                cursor: pointer;
                                transition: all 0.3s ease;
                             "
                             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 16px rgba(102, 126, 234, 0.3)'; this.style.borderColor='${provider.color || '#667eea'}';"
                             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='var(--glass-border, rgba(255,255,255,0.1))';">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <h4 style="margin: 0; color: var(--text-primary, #fff); font-size: 1rem;">${backend.name}</h4>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="background: ${tierColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">${tier}</span>
                                    <span style="color: ${statusColor}; font-size: 1.2rem;">
                                        <i class="fas ${statusIcon}"></i>
                                    </span>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8rem; color: var(--text-secondary, #888);">
                                <div>📊 Qubits: ${backend.num_qubits}</div>
                                <div>⏳ Queue: ${backend.queue}</div>
                                <div>💡 Status: ${backend.status}</div>
                                <div>🎟️ Tier: ${tier}</div>
                            </div>
                            <div style="margin-top: 0.5rem; font-size: 0.75rem; color: ${provider.color || '#667eea'}; text-align: center;">
                                <i class="fas fa-info-circle"></i> Click for detailed metrics
                            </div>
                        </div>
                    `;
                    }).join('');

                    // Add expand button at the bottom (same as IBM)
                    const expandButton = `
                        <button 
                            onclick="window.quantumWidgets?.showDetailedBackendsModal?.()"
                            style="
                                width: 100%;
                                background: linear-gradient(135deg, ${provider.color || '#667eea'} 0%, ${provider.color ? provider.color + 'cc' : '#764ba2'} 100%);
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
                                box-shadow: 0 4px 12px ${provider.color ? provider.color + '40' : 'rgba(102, 126, 234, 0.3)'};
                            "
                            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px ${provider.color ? provider.color + '60' : 'rgba(102, 126, 234, 0.4)'}';"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px ${provider.color ? provider.color + '40' : 'rgba(102, 126, 234, 0.3)'}';"
                        >
                            <i class="fas fa-expand-arrows-alt"></i>
                            View Detailed Backend Metrics
                        </button>
                    `;

                    contentArea.innerHTML = backendCards + expandButton;
                    console.log(`✅ [${provider.id.toUpperCase()}] Rendered IBM-style backend cards`);
                } else if (contentArea && normalizedBackends.length === 0) {
                    contentArea.innerHTML = `
                        <div style="text-align: center; padding: 20px; color: #888;">
                            <p>No backends available for ${provider.displayName}</p>
                            <p style="font-size: 12px; margin-top: 8px;">Connect your API key to access backends</p>
                        </div>
                    `;
                }
            }

            // Update UI callback if exists
            if (typeof window.updateBackendsDisplay === 'function') {
                window.updateBackendsDisplay(normalizedBackends, provider.id);
            }

        } catch (error) {
            console.error(`❌ [${provider.id.toUpperCase()}] Failed to reload backends:`, error);
        }
    }

    /**
     * Reload jobs widget with ONLY selected provider's jobs
     */
    async function reloadJobsWidget(provider) {
        console.log(`📋 [${provider.id.toUpperCase()}] Reloading jobs...`);

        try {
            // Use provider-aware endpoint with query parameter
            let providerJobs = [];

            const response = await fetch(`/api/jobs/by-provider?provider=${provider.id}`);
            if (response.ok) {
                providerJobs = await response.json();
            } else {
                // Fallback to old endpoint if new one doesn't exist yet
                console.log(`[${provider.id.toUpperCase()}] Provider-aware endpoint not found, using fallback`);
                const fallbackResponse = await fetch('/api/jobs');
                if (fallbackResponse.ok) {
                    const allJobs = await fallbackResponse.json();
                    const jobsArray = Array.isArray(allJobs) ? allJobs : (allJobs.jobs || allJobs.data || []);

                    // FIXED FILTER: Match IBM jobs correctly including real_data flag
                    providerJobs = jobsArray.filter(job => {
                        const jobProvider = (job.provider || '').toLowerCase();
                        const backend = (job.backend || job.backend_name || '').toLowerCase();
                        const isRealData = job.real_data === true;

                        if (provider.id === 'ibm') {
                            // Match IBM jobs: provider='ibm' OR backend contains 'ibm' OR real_data=true with IBM backend patterns
                            const isIBMBackend = backend.includes('ibm') ||
                                backend.includes('fez') ||
                                backend.includes('torino') ||
                                backend.includes('marrakesh') ||
                                backend.includes('brisbane');
                            return jobProvider === 'ibm' || isIBMBackend || (isRealData && !backend.includes('simulator'));
                        } else {
                            // Other providers: standard matching
                            return jobProvider === provider.id || backend.includes(provider.id);
                        }
                    });
                }
            }

            console.log(`✅ [${provider.id.toUpperCase()}] Found ${providerJobs.length} jobs`);

            // Update total jobs summary card
            const totalJobsCard = document.getElementById('total-jobs');
            if (totalJobsCard) {
                totalJobsCard.textContent = providerJobs.length;
            }

            // Update running jobs card
            const runningJobs = providerJobs.filter(j => {
                const status = (j.status || '').toLowerCase();
                return status === 'running' || status === 'queued' || status === 'pending';
            });
            const runningJobsCard = document.getElementById('running-jobs');
            if (runningJobsCard) {
                runningJobsCard.textContent = runningJobs.length;
            }

            // Update success rate
            const completedJobs = providerJobs.filter(j => {
                const status = (j.status || '').toLowerCase();
                return status === 'completed' || status === 'done' || status === 'finished';
            });
            const successRate = providerJobs.length > 0 ? Math.round((completedJobs.length / providerJobs.length) * 100) : 0;
            const successRateCard = document.getElementById('success-rate');
            if (successRateCard) {
                successRateCard.textContent = `${successRate}%`;
            }

            // Update UI callback if exists
            if (typeof window.updateJobsDisplay === 'function') {
                window.updateJobsDisplay(providerJobs, provider.id);
            }

            // Update DashboardMetrics if available
            if (window.dashboardMetrics) {
                window.dashboardMetrics.onModeChange(provider.id);
            }

        } catch (error) {
            console.error(`❌ [${provider.id.toUpperCase()}] Failed to reload jobs:`, error);
        }
    }

    /**
     * Reload results widget with ONLY selected provider's results
     */
    async function reloadResultsWidget(provider) {
        console.log(`📊 Reloading results for: ${provider.displayName}`);

        try {
            const response = await fetch('/api/results');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const allResults = await response.json();

            // STRICT FILTER: Only this provider's results
            const providerResults = allResults.filter(result =>
                result.provider === provider.id
            );

            console.log(`✅ Loaded ${providerResults.length} results for ${provider.displayName}`);

            // Update UI (if updateResultsDisplay exists)
            if (typeof window.updateResultsDisplay === 'function') {
                window.updateResultsDisplay(providerResults, provider.id);
            }

        } catch (error) {
            console.error('❌ Failed to reload results:', error);
        }
    }

    /**
     * Reload performance widget with ONLY selected provider's metrics
     */
    async function reloadPerformanceWidget(provider) {
        console.log(`📈 Reloading performance for: ${provider.displayName}`);

        try {
            const response = await fetch('/api/performance_metrics');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const allMetrics = await response.json();

            // STRICT FILTER: Only this provider's metrics
            const providerMetrics = {
                ...allMetrics,
                provider: provider.id,
                provider_name: provider.displayName
            };

            console.log(`✅ Loaded performance metrics for ${provider.displayName}`);

            // Update UI (if updatePerformanceDisplay exists)
            if (typeof window.updatePerformanceDisplay === 'function') {
                window.updatePerformanceDisplay(providerMetrics, provider.id);
            }

        } catch (error) {
            console.error('❌ Failed to reload performance:', error);
        }
    }

    /**
     * Update provider theme (colors, branding)
     */
    function updateProviderTheme(provider) {
        console.log(`🎨 Updating theme for: ${provider.displayName}`);

        // Set CSS custom properties for provider color
        document.documentElement.style.setProperty('--provider-color', provider.color);
        document.documentElement.style.setProperty('--provider-icon', `"${provider.icon}"`);

        // Update data attribute for CSS targeting
        document.body.setAttribute('data-provider', provider.id);

        // Update page title if needed
        const titleElement = document.querySelector('.provider-title');
        if (titleElement) {
            titleElement.textContent = provider.displayName;
        }
    }

    /**
     * Update all provider/backend dropdowns
     */
    function updateAllDropdowns(provider) {
        console.log(`🔽 Updating dropdowns for: ${provider.displayName}`);

        // Update provider selector
        const providerSelector = document.getElementById('provider-selector');
        if (providerSelector) {
            providerSelector.value = provider.id;
        }

        // Update backend selector
        const backendSelector = document.getElementById('backend-selector');
        if (backendSelector && window.QuantumProviders) {
            backendSelector.innerHTML = window.QuantumProviders.createBackendDropdown(provider);
        }

        // Update 3D circuit visualizer device selector
        const deviceSelect = document.getElementById('deviceSelect');
        if (deviceSelect) {
            // Keep local simulator as first option
            deviceSelect.innerHTML = '<option value="simulator">Local Simulator</option>';

            // Add provider's backends
            const backends = provider.backends || [];
            backends.forEach(backend => {
                const option = document.createElement('option');
                const name = typeof backend === 'string' ? backend : (backend.name || backend.backend_name || 'Unknown');
                const qubits = typeof backend === 'object' ? (backend.qubits || backend.n_qubits || '?') : '?';
                option.value = name;
                option.textContent = `${name} (${qubits} qubits)`;
                deviceSelect.appendChild(option);
            });

            console.log(`🎛️  Updated device selector with ${backends.length} ${provider.displayName} backends`);
        }
    }

    /**
     * Show provider-specific notice for non-IBM providers
     */
    function showProviderNotice(provider) {
        // Remove existing notice
        const existingNotice = document.getElementById('provider-notice-banner');
        if (existingNotice) {
            existingNotice.remove();
        }

        // Only show notice for non-IBM providers and non-local
        if (provider.id === 'ibm' || provider.id === 'local') {
            return;
        }

        // Create notice banner
        const notice = document.createElement('div');
        notice.id = 'provider-notice-banner';
        notice.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, ${provider.color}15 0%, ${provider.color}25 100%);
            border: 2px solid ${provider.color};
            border-radius: 12px;
            padding: 20px 30px;
            max-width: 600px;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
            font-family: 'Inter', sans-serif;
        `;

        notice.innerHTML = `
            <div style="display: flex; align-items: start; gap: 15px;">
                <div style="font-size: 32px;">${provider.icon}</div>
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 8px 0; color: ${provider.color}; font-size: 18px; font-weight: 600;">
                        ${provider.displayName} Mode Active
                    </h3>
                    <p style="margin: 0 0 12px 0; color: #e0e0e0; font-size: 14px; line-height: 1.5;">
                        IBM-specific historical widgets are hidden. To execute circuits on ${provider.displayName}:
                    </p>
                    <ol style="margin: 0; padding-left: 20px; color: #b0b0b0; font-size: 13px; line-height: 1.6;">
                        <li>Use the <strong>Circuit Builder</strong> or <strong>AI Circuit Generator</strong></li>
                        <li>Select a <strong>${provider.displayName} backend</strong> from the dropdown</li>
                        <li>Click <strong>"Run Circuit"</strong> to execute</li>
                    </ol>
                    <div style="margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px; font-size: 12px; color: #888;">
                        💡 <strong>Tip:</strong> Results will appear after execution. Switch back to IBM to see historical data.
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                    transition: color 0.2s;
                " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#888'">×</button>
            </div>
        `;

        document.body.appendChild(notice);

        // Auto-hide after 15 seconds
        setTimeout(() => {
            if (notice.parentElement) {
                notice.style.transition = 'opacity 0.5s, transform 0.5s';
                notice.style.opacity = '0';
                notice.style.transform = 'translateX(-50%) translateY(-20px)';
                setTimeout(() => notice.remove(), 500);
            }
        }, 15000);
    }

    /**
     * Toggle widget visibility based on provider
     * ONLY hide IBM-specific calibration/metrics widgets
     * NEVER hide: Backends, Jobs, Bloch Sphere, 3D Circuit - these are universal
     */
    function toggleWidgetsByProvider(provider) {
        console.log(`🔀 Toggling widgets for provider: ${provider.id}`);

        // ONLY hide these IBM-specific widgets (NOT backends/jobs)
        const ibmOnlyWidgetSelectors = [
            '#performance-metrics',
            '#calibration-data',
            '#historical-data',
            '#realtime-monitoring',
            '.backend-comparison',
            '.performance-chart',
            '[data-widget-type="ibm-specific"]',
            '.ibm-calibration',
            '.queue-depth-chart'
        ];

        // NEVER hide these widgets - they work for all providers
        const universalWidgetSelectors = [
            '#quantum-backends',
            '#quantum-jobs',
            '.backends-widget',
            '.jobs-widget',
            '#bloch-sphere',
            '#3d-circuit',
            '.bloch-sphere-widget',
            '.circuit-widget',
            '.summary-cards',
            '.metric-card'
        ];

        // SYMMETRIC: Show ALL widgets for ALL providers
        // Widgets should handle empty data gracefully
        const allWidgetSelectors = [...ibmOnlyWidgetSelectors, ...universalWidgetSelectors];

        allWidgetSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = '';
                element.style.opacity = '1';
            });
        });


        // Be more careful about hiding widgets by text content
        const allWidgets = document.querySelectorAll('.widget, .card, .panel, .dashboard-card');
        allWidgets.forEach(widget => {
            const widgetText = widget.textContent.toLowerCase();
            const widgetId = (widget.id || '').toLowerCase();
            const widgetClass = (widget.className || '').toLowerCase();

            // NEVER hide backends or jobs widgets
            if (widgetId.includes('backend') || widgetId.includes('job') ||
                widgetClass.includes('backend') || widgetClass.includes('job') ||
                widgetText.includes('quantum backends') || widgetText.includes('quantum jobs')) {
                widget.style.display = '';
                return; // Skip this widget
            }

            // Only hide IBM calibration-specific widgets
            const isIBMCalibrationWidget =
                (widgetText.includes('calibration') && widgetText.includes('gate')) ||
                widgetText.includes('queue depth') ||
                (widgetText.includes('fidelity') && widgetText.includes('gate'));

            if (isIBMCalibrationWidget && !isIBMOrLocal) {
                widget.style.display = 'none';
            } else if (isIBMCalibrationWidget && isIBMOrLocal) {
                widget.style.display = '';
            }
        });

        console.log(`✅ Provider ${provider.id}: Showing universal widgets (backends, jobs, circuit)`);
    }

    // ==================== Initialization ====================

    /**
     * Initialize provider isolation system
     */
    async function initialize() {
        console.log('🚀 Initializing provider data isolation...');

        // Load saved provider preference
        const savedProvider = localStorage.getItem('selectedProvider');
        if (savedProvider) {
            currentProvider = savedProvider;
            console.log(`📌 Restored provider: ${savedProvider}`);
        }

        // Fetch initial data
        await refreshProviderData();

        // DON'T call switchProvider here - let the HTML dropdown handle it
        // This prevents conflicts with the modern_dashboard.html switchProvider
        console.log('✅ Provider data isolation initialized (data fetched, waiting for UI)');
    }

    // ==================== Public API ====================

    window.ProviderIsolation = {
        switchProvider,
        refreshProviderData,
        getProvidersData,
        getProvider,
        getCurrentProvider: () => currentProvider,
        initialize,
        reloadBackendsWidget,
        reloadJobsWidget,
        toggleWidgetsByProvider,
        updateAllDropdowns
    };

    // Make switchProvider global for backwards compatibility
    window.switchProvider = switchProvider;

    console.log('✅ Provider Isolation module loaded');

    // Auto-fetch provider data on load (but don't switch providers)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            await refreshProviderData();
            console.log('📡 Provider data pre-fetched');
        });
    } else {
        refreshProviderData().then(() => {
            console.log('📡 Provider data pre-fetched');
        });
    }

})();
