/**
 * AI Agent Commands - Command Handlers
 * 
 * Handles execution of AI commands with context validation.
 * Each command handler receives (payload, panelInstance).
 */

(function () {
    'use strict';

    // ==========================================================================
    // COMMAND HANDLERS
    // ==========================================================================

    const AIAgentCommands = {

        /**
         * Load a circuit into the visualizer.
         * @param {object} payload - { circuit_data, circuit_name }
         * @param {object} panel - AIAgentPanel instance
         */
        LOAD_CIRCUIT: function (payload, panel) {
            console.log('[AIAgentCommands] LOAD_CIRCUIT', payload);

            if (!payload || !payload.circuit_data) {
                panel.showError('LOAD_CIRCUIT: Missing circuit_data in payload.');
                return;
            }

            const { circuit_data, circuit_name } = payload;

            // Validate circuit_data structure
            if (!circuit_data.qubits || !Array.isArray(circuit_data.gates)) {
                panel.showError('LOAD_CIRCUIT: Invalid circuit_data format.');
                return;
            }

            // Update panel state
            if (window.AIAgentPanel) {
                const state = window.AIAgentPanel.getState();
                state.currentCircuit = circuit_data;
            }

            // Try to load into 3D visualizer
            if (window.QuantumCircuit3D && typeof window.QuantumCircuit3D.loadCircuit === 'function') {
                try {
                    window.QuantumCircuit3D.loadCircuit(circuit_data);
                    panel.appendSystemMessage(`Circuit loaded: ${circuit_name || 'Custom Circuit'}`);

                    // Transition to execution context
                    panel.setContext('execution');
                } catch (error) {
                    panel.showError(`Failed to load circuit: ${error.message}`);
                }
            } else {
                // Fallback: Log to console and notify
                console.log('[AIAgentCommands] Circuit data:', circuit_data);
                panel.appendSystemMessage(`Circuit ready: ${circuit_name || 'Custom Circuit'} (Visualizer not available)`);
            }
        },

        /**
         * Run the current circuit on a backend.
         * @param {object} payload - { backend, shots }
         * @param {object} panel - AIAgentPanel instance
         */
        RUN_CIRCUIT: function (payload, panel) {
            console.log('[AIAgentCommands] RUN_CIRCUIT', payload);

            const state = window.AIAgentPanel?.getState();

            if (!state?.currentCircuit) {
                panel.showError('RUN_CIRCUIT: No circuit loaded. Load a circuit first.');
                return;
            }

            const backend = payload?.backend || 'local_simulator';
            const shots = payload?.shots || 1024;

            panel.appendSystemMessage(`Running circuit on ${backend} with ${shots} shots...`);

            // Call backend API
            fetch('/api/run_circuit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    circuit: state.currentCircuit,
                    backend: backend,
                    shots: shots
                })
            })
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    if (data.error) {
                        panel.showError(`Execution failed: ${data.error}`);
                    } else {
                        panel.appendAIMessage(`Circuit executed successfully. Results: ${JSON.stringify(data.counts || data.results)}`);

                        // Store results
                        if (window.AIAgentPanel) {
                            const s = window.AIAgentPanel.getState();
                            s.lastResults = data;
                        }
                    }
                })
                .catch(error => {
                    panel.showError(`RUN_CIRCUIT failed: ${error.message}`);
                });
        },

        /**
         * Show a results chart.
         * @param {object} payload - { chart_type }
         * @param {object} panel - AIAgentPanel instance
         */
        SHOW_CHART: function (payload, panel) {
            console.log('[AIAgentCommands] SHOW_CHART', payload);

            const state = window.AIAgentPanel?.getState();

            if (!state?.lastResults) {
                panel.showError('SHOW_CHART: No results available. Run a circuit first.');
                return;
            }

            const chartType = payload?.chart_type || 'histogram';
            panel.appendSystemMessage(`Displaying ${chartType} chart...`);

            // Focus the results widget
            if (window.AIWidgetRegistry && typeof window.AIWidgetRegistry.focusWidget === 'function') {
                window.AIWidgetRegistry.focusWidget('results');
            }
        },

        /**
         * Focus a specific widget.
         * @param {object} payload - { widget_id }
         * @param {object} panel - AIAgentPanel instance
         */
        FOCUS_WIDGET: function (payload, panel) {
            console.log('[AIAgentCommands] FOCUS_WIDGET', payload);

            if (!payload || !payload.widget_id) {
                panel.showError('FOCUS_WIDGET: Missing widget_id.');
                return;
            }

            const widgetId = payload.widget_id;

            // Use widget registry
            if (window.AIWidgetRegistry && typeof window.AIWidgetRegistry.focusWidget === 'function') {
                const focused = window.AIWidgetRegistry.focusWidget(widgetId);
                if (focused) {
                    panel.appendSystemMessage(`Focused: ${widgetId}`);
                } else {
                    panel.showError(`Widget not found: ${widgetId}`);
                }
            } else {
                // Fallback: Try to find and scroll to element
                const widget = document.querySelector(`[data-widget="${widgetId}"]`) ||
                    document.getElementById(widgetId);

                if (widget) {
                    widget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    widget.classList.add('ai-agent-highlight');
                    setTimeout(() => widget.classList.remove('ai-agent-highlight'), 2000);
                    panel.appendSystemMessage(`Focused: ${widgetId}`);
                } else {
                    panel.showError(`Widget not found: ${widgetId}`);
                }
            }
        },

        /**
         * Explain quantum results or concepts.
         * @param {object} payload - { topic }
         * @param {object} panel - AIAgentPanel instance
         */
        EXPLAIN_RESULT: function (payload, panel) {
            console.log('[AIAgentCommands] EXPLAIN_RESULT', payload);

            const state = window.AIAgentPanel?.getState();
            const topic = payload?.topic || 'latest results';

            if (state?.lastResults) {
                // Format results explanation
                const counts = state.lastResults.counts || state.lastResults.results || {};
                const total = Object.values(counts).reduce((a, b) => a + b, 0);

                let explanation = `**Results Analysis (${topic})**\n\n`;
                explanation += `Total shots: ${total}\n\n`;

                Object.entries(counts)
                    .sort((a, b) => b[1] - a[1])
                    .forEach(([state, count]) => {
                        const probability = ((count / total) * 100).toFixed(2);
                        explanation += `|${state}⟩: ${count} (${probability}%)\n`;
                    });

                panel.appendAIMessage(explanation);
            } else {
                panel.appendAIMessage(`To explain ${topic}, please run a circuit first or ask about a specific quantum concept.`);
            }
        }
    };

    // ==========================================================================
    // GLOBAL EXPORT
    // ==========================================================================

    window.AIAgentCommands = AIAgentCommands;

    console.log('[AIAgentCommands] Module loaded.');

})();
