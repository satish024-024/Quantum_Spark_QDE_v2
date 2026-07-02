/**
 * QDE Workspace State Manager
 * Centralized, reactive state object with localStorage state persistence.
 */
class WorkspaceStateManager {
    constructor() {
        this.state = {
            currentProject: "Default Project",
            currentExperiment: "Bell State Preparation",
            activeBackend: {
                provider: "ibm",
                name: "ibm_fez",
                queueDepth: 0,
                estimatedWait: "0.0s",
                qubits: 0
            },
            activeSession: {
                id: "session_morning_research_01",
                name: "Morning Research",
                created: Date.now()
            },
            openTabs: [
                { id: "tab_bell_state", title: "Bell State", active: true },
                { id: "tab_grover", title: "Grover Search", active: false }
            ],
            selectedElement: {
                type: null, // 'gate' | 'backend' | 'job' | 'result'
                id: null,
                metadata: {}
            },
            layout: {
                sidebarOpen: true,
                rightSidebarOpen: true,
                bottomPanelOpen: false,
                activeSidebarTab: "hardware", // 'hardware' | 'library' | 'timeline'
                zoomLevel: 1.0,
                mode: "builder" // 'builder' | 'research' | 'hardware' | 'insights'
            },
            theme: "pantone-light"
        };
        
        this.listeners = [];
        this.loadState();
    }

    // Subscribe to state change notifications
    subscribe(callback) {
        this.listeners.push(callback);
    }

    // Set state properties and notify listeners
    setState(path, value) {
        const parts = path.split('.');
        let current = this.state;
        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
        this.saveState();
        this.notify();
    }

    notify() {
        this.listeners.forEach(callback => callback(this.state));
    }

    saveState() {
        localStorage.setItem('quantum_spark_qde_state', JSON.stringify(this.state));
    }

    loadState() {
        const saved = localStorage.getItem('quantum_spark_qde_state');
        if (saved) {
            try {
                this.state = { ...this.state, ...JSON.parse(saved) };
            } catch (e) {
                console.error("Failed to restore QDE state:", e);
            }
        }
    }
}

// Global Singleton Instance
window.WorkspaceState = new WorkspaceStateManager();
