/**
 * Widget Provider Dropdown Handler
 * Connects any provider dropdown in widgets to the main provider switcher
 */

(function () {
    'use strict';

    console.log('📡 Widget Provider Dropdown Handler loaded');

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function () {
        // Listen for clicks on provider items anywhere in the page
        document.addEventListener('click', function (e) {
            // Check if clicked element or its parent is a provider option
            const providerOption = e.target.closest('[data-provider-id]');

            if (providerOption) {
                const providerId = providerOption.dataset.providerId;
                console.log('🎯 Provider clicked in widget:', providerId);

                // Call the global switchProvider function if it exists
                if (typeof window.switchProvider === 'function') {
                    window.switchProvider(providerId);
                } else {
                    console.warn('switchProvider function not found');
                }
            }
        });

        console.log('✅ Widget provider dropdown handler initialized');
    });

})();
