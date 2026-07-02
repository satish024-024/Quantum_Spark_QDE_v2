/**
 * QDE Layout Manager
 * Handles dockable panels resizing, expanding/collapsing sidebars, and viewport management.
 */
class QDELayoutManager {
    constructor() {
        this.init();
    }

    init() {
        // Register listeners for state changes to adjust layout
        window.WorkspaceState.subscribe((state) => {
            this.applyLayout(state.layout);
        });

        // Trigger layout initial restore
        this.applyLayout(window.WorkspaceState.state.layout);
    }

    applyLayout(layout) {
        // Primary Sidebar visibility toggle
        const sidebar = document.querySelector('.sidebar-panel');
        if (sidebar) {
            sidebar.style.display = layout.sidebarOpen ? 'flex' : 'none';
        }

        // Right Sidebar inspect panel toggle
        const rightSidebar = document.querySelector('.right-sidebar-panel');
        if (rightSidebar) {
            rightSidebar.style.display = layout.rightSidebarOpen ? 'flex' : 'none';
        }

        // Bottom Console / Log Panel toggle
        const bottomPanel = document.querySelector('.bottom-panel-container');
        if (bottomPanel) {
            bottomPanel.style.display = layout.bottomPanelOpen ? 'flex' : 'none';
        }

        // Apply Zoom Settings
        const workspaceCanvas = document.querySelector('.workspace-grid');
        if (workspaceCanvas) {
            workspaceCanvas.style.transform = `scale(${layout.zoomLevel})`;
            workspaceCanvas.style.transformOrigin = 'top center';
        }

        // Apply Mode styling changes
        const mainContainer = document.querySelector('.workspace-content');
        if (mainContainer) {
            mainContainer.className = `workspace-content mode-${layout.mode}`;
        }
    }

    // Toggle Specific Panel View States
    togglePanel(panelName) {
        const layout = window.WorkspaceState.state.layout;
        if (panelName === 'sidebar') {
            window.WorkspaceState.setState('layout.sidebarOpen', !layout.sidebarOpen);
        } else if (panelName === 'rightSidebar') {
            window.WorkspaceState.setState('layout.rightSidebarOpen', !layout.rightSidebarOpen);
        } else if (panelName === 'bottom') {
            window.WorkspaceState.setState('layout.bottomPanelOpen', !layout.bottomPanelOpen);
        }
    }

    setZoom(level) {
        window.WorkspaceState.setState('layout.zoomLevel', Math.max(0.7, Math.min(1.5, level)));
    }
}

// Global Singleton Instance
window.LayoutManager = new QDELayoutManager();
