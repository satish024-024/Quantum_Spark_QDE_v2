/**
 * Global Theme Manager for Quantum Spark Dashboard
 * 
 * A centralized theme management system that works across ALL dashboards.
 * Features:
 * - Dark/Light mode toggle with smooth transitions
 * - Persists preference to localStorage
 * - Respects system preference (prefers-color-scheme)
 * - Works with any dashboard template
 * 
 * @version 2.0.0
 * @author Quantum Spark Team
 * @license MIT
 */

const ThemeManager = (function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════

    const CONFIG = {
        storageKey: 'quantum-spark-theme',
        defaultTheme: 'dark',
        transitionDuration: 300,
        themes: ['dark', 'light'],
        cssVariables: {
            dark: {
                '--background-gradient': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                '--surface-bg': 'rgba(255, 255, 255, 0.05)',
                '--glass-bg': 'rgba(255, 255, 255, 0.1)',
                '--glass-border': 'rgba(255, 255, 255, 0.15)',
                '--text-primary': '#f8fafc',
                '--text-secondary': '#cbd5e1',
                '--text-muted': '#64748b',
                '--shadow-color': 'rgba(0, 0, 0, 0.3)',
                '--card-bg': 'rgba(30, 41, 59, 0.8)',
                '--input-bg': 'rgba(15, 23, 42, 0.8)',
                '--modal-overlay': 'rgba(0, 0, 0, 0.8)'
            },
            light: {
                '--background-gradient': 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
                '--surface-bg': 'rgba(255, 255, 255, 0.9)',
                '--glass-bg': 'rgba(255, 255, 255, 0.85)',
                '--glass-border': 'rgba(0, 0, 0, 0.1)',
                '--text-primary': '#0f172a',
                '--text-secondary': '#475569',
                '--text-muted': '#94a3b8',
                '--shadow-color': 'rgba(0, 0, 0, 0.1)',
                '--card-bg': 'rgba(255, 255, 255, 0.95)',
                '--input-bg': 'rgba(248, 250, 252, 0.95)',
                '--modal-overlay': 'rgba(0, 0, 0, 0.5)'
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════

    let currentTheme = CONFIG.defaultTheme;
    let isTransitioning = false;
    let listeners = [];

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get system color scheme preference
     */
    function getSystemPreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    }

    /**
     * Get stored theme preference
     */
    function getStoredTheme() {
        try {
            return localStorage.getItem(CONFIG.storageKey);
        } catch (e) {
            console.warn('ThemeManager: Could not access localStorage', e);
            return null;
        }
    }

    /**
     * Store theme preference
     */
    function storeTheme(theme) {
        try {
            localStorage.setItem(CONFIG.storageKey, theme);
        } catch (e) {
            console.warn('ThemeManager: Could not save to localStorage', e);
        }
    }

    /**
     * Apply CSS variables for theme
     */
    function applyCSSVariables(theme) {
        const variables = CONFIG.cssVariables[theme];
        if (!variables) return;

        const root = document.documentElement;
        Object.entries(variables).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
    }

    /**
     * Apply theme to document
     */
    function applyTheme(theme, animate = true) {
        const root = document.documentElement;
        const body = document.body;

        // Add transition class for smooth switching
        if (animate && !isTransitioning) {
            isTransitioning = true;
            body.classList.add('theme-transitioning');

            setTimeout(() => {
                body.classList.remove('theme-transitioning');
                isTransitioning = false;
            }, CONFIG.transitionDuration);
        }

        // Set data attribute for CSS selectors
        root.setAttribute('data-theme', theme);
        body.setAttribute('data-theme', theme);

        // Apply CSS variables
        applyCSSVariables(theme);

        // Update meta theme-color for mobile browsers
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f8fafc');
        }

        // Update current theme
        currentTheme = theme;

        // Store preference
        storeTheme(theme);

        // Notify listeners
        notifyListeners(theme);

        console.log(`🎨 Theme switched to: ${theme}`);
    }

    /**
     * Notify all registered listeners
     */
    function notifyListeners(theme) {
        listeners.forEach(callback => {
            try {
                callback(theme);
            } catch (e) {
                console.error('ThemeManager: Listener error', e);
            }
        });
    }

    /**
     * Create and inject transition styles
     */
    function injectTransitionStyles() {
        const styleId = 'theme-manager-styles';
        if (document.getElementById(styleId)) return;

        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = `
            /* Theme transition animations */
            .theme-transitioning,
            .theme-transitioning * {
                transition: background-color ${CONFIG.transitionDuration}ms ease,
                            color ${CONFIG.transitionDuration}ms ease,
                            border-color ${CONFIG.transitionDuration}ms ease,
                            box-shadow ${CONFIG.transitionDuration}ms ease !important;
            }

            /* Respect user preference for reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .theme-transitioning,
                .theme-transitioning * {
                    transition: none !important;
                }
            }

            /* Dark theme specific overrides */
            [data-theme="dark"] {
                color-scheme: dark;
            }

            /* Light theme specific overrides */
            [data-theme="light"] {
                color-scheme: light;
            }

            [data-theme="light"] .header {
                background: rgba(255, 255, 255, 0.95);
                border-bottom-color: rgba(0, 0, 0, 0.1);
            }

            [data-theme="light"] .widget {
                background: rgba(255, 255, 255, 0.9);
                border-color: rgba(0, 0, 0, 0.1);
            }

            [data-theme="light"] .metric-card {
                background: rgba(255, 255, 255, 0.95);
                border-color: rgba(0, 0, 0, 0.1);
            }

            [data-theme="light"] .animated-bg {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
            }

            [data-theme="light"] .animated-bg::before {
                background: radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                            radial-gradient(circle at 40% 40%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
            }

            [data-theme="light"] .btn-secondary {
                background: rgba(255, 255, 255, 0.9);
                border-color: rgba(0, 0, 0, 0.15);
                color: #0f172a;
            }

            [data-theme="light"] .provider-dropdown .provider-selected,
            [data-theme="light"] .provider-dropdown .provider-options {
                background: rgba(255, 255, 255, 0.95);
                border-color: rgba(0, 0, 0, 0.15);
            }

            [data-theme="light"] .provider-name {
                color: #0f172a;
            }

            [data-theme="light"] .customization-panel {
                background: rgba(255, 255, 255, 0.98);
            }

            [data-theme="light"] .widget-header {
                background: rgba(248, 250, 252, 0.95);
            }

            [data-theme="light"] .loading span {
                color: #475569;
            }

            [data-theme="light"] .chat-input {
                background: rgba(248, 250, 252, 0.95);
                border-color: rgba(0, 0, 0, 0.1);
                color: #0f172a;
            }

            [data-theme="light"] .popup-modal {
                background: rgba(255, 255, 255, 0.98);
            }

            [data-theme="light"] .status-cluster {
                background: rgba(255, 255, 255, 0.8);
                border-color: rgba(0, 0, 0, 0.1);
            }

            [data-theme="light"] .auto-refresh-panel {
                background: rgba(255, 255, 255, 0.8);
                border-color: rgba(0, 0, 0, 0.1);
            }

            [data-theme="light"] .secondary-actions {
                background: rgba(255, 255, 255, 0.8);
                border-color: rgba(0, 0, 0, 0.1);
            }

            /* Theme toggle button styling */
            .theme-toggle-btn {
                position: relative;
                overflow: hidden;
            }

            .theme-toggle-btn .fa-sun,
            .theme-toggle-btn .fa-moon {
                transition: opacity 0.2s ease, transform 0.3s ease;
            }

            [data-theme="dark"] .theme-toggle-btn .fa-sun {
                opacity: 0;
                transform: rotate(-90deg) scale(0);
                position: absolute;
            }

            [data-theme="dark"] .theme-toggle-btn .fa-moon {
                opacity: 1;
                transform: rotate(0) scale(1);
            }

            [data-theme="light"] .theme-toggle-btn .fa-moon {
                opacity: 0;
                transform: rotate(90deg) scale(0);
                position: absolute;
            }

            [data-theme="light"] .theme-toggle-btn .fa-sun {
                opacity: 1;
                transform: rotate(0) scale(1);
            }
        `;

        document.head.appendChild(styles);
    }

    /**
     * Listen for system preference changes
     */
    function watchSystemPreference() {
        if (!window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            // Only auto-switch if user hasn't manually set a preference
            const stored = getStoredTheme();
            if (!stored) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
        } else if (mediaQuery.addListener) {
            // Legacy browsers
            mediaQuery.addListener(handleChange);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════

    return {
        /**
         * Get current theme
         * @returns {string} Current theme name
         */
        get current() {
            return currentTheme;
        },

        /**
         * Check if dark mode is active
         * @returns {boolean}
         */
        get isDark() {
            return currentTheme === 'dark';
        },

        /**
         * Check if light mode is active
         * @returns {boolean}
         */
        get isLight() {
            return currentTheme === 'light';
        },

        /**
         * Initialize theme manager
         * Should be called on page load
         */
        init() {
            console.log('🎨 ThemeManager initializing...');

            // Inject transition styles
            injectTransitionStyles();

            // Determine initial theme
            const stored = getStoredTheme();
            const initial = stored || getSystemPreference();

            // Apply without animation on initial load
            applyTheme(initial, false);

            // Watch for system preference changes
            watchSystemPreference();

            // Bind toggle buttons
            this.bindToggleButtons();

            console.log('✅ ThemeManager initialized with theme:', initial);
        },

        /**
         * Toggle between dark and light themes
         */
        toggle() {
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            return newTheme;
        },

        /**
         * Set specific theme
         * @param {string} theme - Theme name ('dark' or 'light')
         */
        set(theme) {
            if (!CONFIG.themes.includes(theme)) {
                console.error(`ThemeManager: Invalid theme "${theme}"`);
                return;
            }
            applyTheme(theme);
        },

        /**
         * Reset to system preference
         */
        reset() {
            try {
                localStorage.removeItem(CONFIG.storageKey);
            } catch (e) { }
            applyTheme(getSystemPreference());
        },

        /**
         * Register a callback for theme changes
         * @param {Function} callback - Called with new theme name
         * @returns {Function} Unsubscribe function
         */
        onChange(callback) {
            if (typeof callback !== 'function') {
                console.error('ThemeManager: onChange requires a function');
                return () => { };
            }

            listeners.push(callback);

            // Return unsubscribe function
            return () => {
                listeners = listeners.filter(cb => cb !== callback);
            };
        },

        /**
         * Bind click handlers to theme toggle buttons
         * Looks for elements with [data-theme-toggle] attribute
         */
        bindToggleButtons() {
            const toggleButtons = document.querySelectorAll('[data-theme-toggle], #theme-toggle-btn, .theme-toggle-btn');

            toggleButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggle();

                    // Update button icon
                    const icon = btn.querySelector('i');
                    if (icon) {
                        if (this.isDark) {
                            icon.className = 'fas fa-moon';
                        } else {
                            icon.className = 'fas fa-sun';
                        }
                    }
                });
            });

            console.log(`🔘 Bound ${toggleButtons.length} theme toggle button(s)`);
        },

        /**
         * Create a theme toggle button element
         * @returns {HTMLButtonElement}
         */
        createToggleButton() {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary theme-toggle-btn';
            btn.id = 'theme-toggle-btn';
            btn.setAttribute('data-theme-toggle', '');
            btn.setAttribute('title', 'Toggle Dark/Light Mode');
            btn.setAttribute('aria-label', 'Toggle dark and light theme');

            btn.innerHTML = `
                <i class="fas ${this.isDark ? 'fa-moon' : 'fa-sun'}"></i>
            `;

            btn.addEventListener('click', () => {
                this.toggle();
                const icon = btn.querySelector('i');
                icon.className = `fas ${this.isDark ? 'fa-moon' : 'fa-sun'}`;
            });

            return btn;
        },

        /**
         * Get available themes
         * @returns {string[]}
         */
        getThemes() {
            return [...CONFIG.themes];
        }
    };
})();

// ═══════════════════════════════════════════════════════════════════════
// AUTO-INITIALIZE
// ═══════════════════════════════════════════════════════════════════════

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}

// Make globally available
window.ThemeManager = ThemeManager;
