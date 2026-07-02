/**
 * QDE Keyboard Shortcuts Manager
 * Registers and hooks keyboard shortcuts to state actions and UI modals.
 */
class KeyboardShortcutsManager {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('keydown', (event) => {
            // Check if key combo matches
            
            // Ctrl + K -> Open Command Palette
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                this.toggleCommandPalette();
            }

            // Ctrl + B -> Toggle Primary Sidebar
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
                event.preventDefault();
                window.LayoutManager.togglePanel('sidebar');
            }

            // Ctrl + Enter -> Execute/Run Current Circuit
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                this.executeCircuit();
            }

            // Ctrl + S -> Save Snapshot/Session
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                this.saveWorkspaceSession();
            }
        });
    }

    toggleCommandPalette() {
        const palette = document.getElementById('command-palette');
        if (palette) {
            const isVisible = palette.style.display === 'flex';
            palette.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) {
                const input = palette.querySelector('input');
                if (input) input.focus();
            }
        }
    }

    executeCircuit() {
        const runBtn = document.getElementById('run-circuit-btn') || document.getElementById('execute-circuit-btn');
        if (runBtn) {
            console.log("Keyboard Shortcut: Triggering Circuit Execution");
            runBtn.click();
        }
    }

    saveWorkspaceSession() {
        const saveBtn = document.getElementById('save-session-btn') || document.getElementById('take-snapshot-btn');
        if (saveBtn) {
            console.log("Keyboard Shortcut: Saving Workspace Session");
            saveBtn.click();
        }
    }
}

// Global Singleton Instance
window.KeyboardShortcuts = new KeyboardShortcutsManager();
