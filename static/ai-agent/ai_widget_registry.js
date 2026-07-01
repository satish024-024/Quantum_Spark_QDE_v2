/**
 * AI Widget Registry - Widget Abstraction Layer
 * 
 * Provides a clean interface for the AI Agent to interact with dashboard widgets.
 * Decouples AI commands from direct widget manipulation.
 */

(function () {
    'use strict';

    // ==========================================================================
    // WIDGET REGISTRY
    // ==========================================================================

    class WidgetRegistry {
        constructor() {
            this.widgets = new Map();
            this.highlightClass = 'ai-agent-highlight';
        }

        /**
         * Register a widget for AI interaction.
         * @param {string} id - Unique widget identifier
         * @param {object} controller - Widget controller with methods
         */
        registerWidget(id, controller) {
            if (!id || typeof id !== 'string') {
                console.error('[AIWidgetRegistry] Invalid widget id.');
                return;
            }

            this.widgets.set(id, {
                id,
                controller,
                element: null
            });

            console.log(`[AIWidgetRegistry] Registered widget: ${id}`);
        }

        /**
         * Unregister a widget.
         * @param {string} id - Widget identifier
         */
        unregisterWidget(id) {
            this.widgets.delete(id);
            console.log(`[AIWidgetRegistry] Unregistered widget: ${id}`);
        }

        /**
         * Get a registered widget.
         * @param {string} id - Widget identifier
         * @returns {object|null} Widget data or null
         */
        getWidget(id) {
            return this.widgets.get(id) || null;
        }

        /**
         * Get all registered widgets.
         * @returns {Array} Array of widget objects
         */
        getAllWidgets() {
            return Array.from(this.widgets.values());
        }

        /**
         * Focus a widget (scroll into view and highlight).
         * @param {string} id - Widget identifier
         * @returns {boolean} Whether focus was successful
         */
        focusWidget(id) {
            // Try registered widget first
            const registered = this.widgets.get(id);
            let element = registered?.element;

            // Fallback: Find by data attribute or ID
            if (!element) {
                element = document.querySelector(`[data-widget="${id}"]`) ||
                    document.getElementById(id) ||
                    document.getElementById(`${id}-widget`);
            }

            if (!element) {
                console.warn(`[AIWidgetRegistry] Widget not found: ${id}`);
                return false;
            }

            // Scroll into view
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // Apply highlight effect
            element.classList.add(this.highlightClass);

            // Remove highlight after animation
            setTimeout(() => {
                element.classList.remove(this.highlightClass);
            }, 2000);

            console.log(`[AIWidgetRegistry] Focused widget: ${id}`);
            return true;
        }

        /**
         * Execute a method on a widget controller.
         * @param {string} id - Widget identifier
         * @param {string} method - Method name
         * @param {Array} args - Method arguments
         * @returns {*} Method result or undefined
         */
        executeWidgetMethod(id, method, args = []) {
            const widget = this.widgets.get(id);

            if (!widget || !widget.controller) {
                console.error(`[AIWidgetRegistry] Widget or controller not found: ${id}`);
                return undefined;
            }

            if (typeof widget.controller[method] !== 'function') {
                console.error(`[AIWidgetRegistry] Method not found: ${id}.${method}`);
                return undefined;
            }

            try {
                return widget.controller[method](...args);
            } catch (error) {
                console.error(`[AIWidgetRegistry] Error executing ${id}.${method}:`, error);
                return undefined;
            }
        }

        /**
         * Auto-discover widgets in the DOM.
         * Looks for elements with [data-widget] attribute.
         */
        autoDiscover() {
            const elements = document.querySelectorAll('[data-widget]');

            elements.forEach(element => {
                const id = element.dataset.widget;

                if (!this.widgets.has(id)) {
                    this.widgets.set(id, {
                        id,
                        controller: null,
                        element
                    });
                } else {
                    // Update element reference
                    const existing = this.widgets.get(id);
                    existing.element = element;
                }
            });

            console.log(`[AIWidgetRegistry] Auto-discovered ${elements.length} widgets.`);
        }
    }

    // ==========================================================================
    // HIGHLIGHT STYLES (injected dynamically)
    // ==========================================================================

    const highlightStyles = document.createElement('style');
    highlightStyles.textContent = `
        .ai-agent-highlight {
            animation: ai-widget-highlight 2s ease-out;
            box-shadow: 0 0 0 3px rgba(14, 99, 156, 0.5) !important;
        }

        @keyframes ai-widget-highlight {
            0% {
                box-shadow: 0 0 0 3px rgba(14, 99, 156, 0.8);
            }
            100% {
                box-shadow: 0 0 0 3px rgba(14, 99, 156, 0);
            }
        }
    `;
    document.head.appendChild(highlightStyles);

    // ==========================================================================
    // GLOBAL EXPORT
    // ==========================================================================

    const instance = new WidgetRegistry();

    window.AIWidgetRegistry = {
        registerWidget: (id, controller) => instance.registerWidget(id, controller),
        unregisterWidget: (id) => instance.unregisterWidget(id),
        getWidget: (id) => instance.getWidget(id),
        getAllWidgets: () => instance.getAllWidgets(),
        focusWidget: (id) => instance.focusWidget(id),
        executeWidgetMethod: (id, method, args) => instance.executeWidgetMethod(id, method, args),
        autoDiscover: () => instance.autoDiscover()
    };

    // Auto-discover on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => instance.autoDiscover());
    } else {
        instance.autoDiscover();
    }

    console.log('[AIWidgetRegistry] Module loaded.');

})();
