/**
 * QDE Command Palette Controller
 * Searches and runs actions based on input queries.
 */
class CommandPaletteController {
    constructor() {
        this.commands = [
            { id: 'run_circuit', title: 'Run Circuit', category: 'Actions', icon: 'fa-play', action: () => window.KeyboardShortcuts.executeCircuit() },
            { id: 'switch_ibm', title: 'Switch Backend to IBM Fez', category: 'Hardware', icon: 'fa-server', action: () => this.switchBackend('ibm', 'ibm_fez') },
            { id: 'switch_kingston', title: 'Switch Backend to IBM Kingston', category: 'Hardware', icon: 'fa-server', action: () => this.switchBackend('ibm', 'ibm_kingston') },
            { id: 'gen_bell', title: 'Generate Bell State Circuit', category: 'AI & Templates', icon: 'fa-magic', action: () => this.generateTemplate('bell') },
            { id: 'open_history', title: 'Open Execution Timeline', category: 'Views', icon: 'fa-history', action: () => this.switchSidebarTab('timeline') },
            { id: 'open_hardware', title: 'Open Hardware Explorer', category: 'Views', icon: 'fa-server', action: () => this.switchSidebarTab('hardware') },
            { id: 'save_session', title: 'Save Workspace Session', category: 'Actions', icon: 'fa-save', action: () => window.KeyboardShortcuts.saveWorkspaceSession() },
            { id: 'open_docs', title: 'Open Documentation Panel', category: 'Support', icon: 'fa-book', action: () => this.togglePanel('rightSidebar') }
        ];
        
        this.init();
    }

    init() {
        const input = document.querySelector('#command-palette-input');
        if (input) {
            input.addEventListener('input', (e) => this.filterCommands(e.target.value));
        }

        // Close palette when click outside
        const palette = document.getElementById('command-palette');
        if (palette) {
            palette.addEventListener('click', (e) => {
                if (e.target === palette) {
                    palette.style.display = 'none';
                }
            });
        }
        
        this.renderCommands(this.commands);
    }

    filterCommands(query) {
        const filtered = this.commands.filter(cmd => 
            cmd.title.toLowerCase().includes(query.toLowerCase()) ||
            cmd.category.toLowerCase().includes(query.toLowerCase())
        );
        this.renderCommands(filtered);
    }

    renderCommands(list) {
        const container = document.querySelector('#command-palette-results');
        if (!container) return;

        container.innerHTML = '';
        if (list.length === 0) {
            container.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-secondary);">No commands found</div>';
            return;
        }

        let currentCategory = '';
        list.forEach(cmd => {
            if (cmd.category !== currentCategory) {
                currentCategory = cmd.category;
                const catHeader = document.createElement('div');
                catHeader.style.padding = '8px 16px';
                catHeader.style.fontSize = '11px';
                catHeader.style.fontWeight = '700';
                catHeader.style.color = 'var(--text-secondary)';
                catHeader.style.textTransform = 'uppercase';
                catHeader.innerText = currentCategory;
                container.appendChild(catHeader);
            }

            const item = document.createElement('div');
            item.style.padding = '12px 16px';
            item.style.fontSize = '14px';
            item.style.fontWeight = '600';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '12px';
            item.style.cursor = 'pointer';
            item.style.borderRadius = '8px';
            item.style.margin = '2px 8px';
            item.className = 'command-item';
            
            item.innerHTML = `<i class="fas ${cmd.icon}" style="width: 16px;"></i> <span>${cmd.title}</span>`;
            item.addEventListener('click', () => {
                cmd.action();
                const palette = document.getElementById('command-palette');
                if (palette) palette.style.display = 'none';
            });

            container.appendChild(item);
        });
    }

    switchBackend(provider, name) {
        console.log(`Command Palette: Switching backend to ${provider}/${name}`);
        window.WorkspaceState.setState('activeBackend.provider', provider);
        window.WorkspaceState.setState('activeBackend.name', name);
    }

    switchSidebarTab(tabName) {
        window.WorkspaceState.setState('layout.activeSidebarTab', tabName);
    }

    togglePanel(panelName) {
        window.LayoutManager.togglePanel(panelName);
    }

    generateTemplate(type) {
        console.log(`Command Palette: Generating circuit template: ${type}`);
        // Dispatch custom event for circuit code updates
        const event = new CustomEvent('generate-circuit-template', { detail: { type } });
        document.dispatchEvent(event);
    }
}

// Global Singleton Instance
document.addEventListener('DOMContentLoaded', () => {
    window.CommandPalette = new CommandPaletteController();
});
