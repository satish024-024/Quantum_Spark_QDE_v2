/**
 * Universal Theme Switcher for Quantum Spark Dashboards
 * Allows seamless switching between different dashboard themes
 */

class ThemeSwitcher {
    constructor() {
        this.themes = {
            'hackathon': {
                name: 'Hackathon (Default)',
                icon: 'fas fa-trophy',
                route: '/hackathon',
                description: 'Award-winning hackathon dashboard with 3D visualizations - DEFAULT THEME',
                default: true
            },
            'ultimate': {
                name: 'Ultimate 2026',
                icon: 'fas fa-rocket',
                route: '/ultimate',
                description: 'Latest 2026 design with dark/light mode, skeleton loaders, and accessibility improvements',
                new: true
            },
            'advanced': {
                name: 'Advanced',
                icon: 'fas fa-cogs',
                route: '/advanced',
                description: 'Advanced dashboard with glossy finish and 3D circuits'
            },
            'modern': {
                name: 'Modern',
                icon: 'fas fa-bolt',
                route: '/modern',
                description: 'Modern gradient-based dashboard with smooth animations'
            },
            'professional': {
                name: 'Professional',
                icon: 'fas fa-briefcase',
                route: '/professional',
                description: 'Clean professional dashboard for business presentations'
            },
            'production': {
                name: 'Production',
                icon: 'fas fa-industry',
                route: '/production',
                description: 'Production-grade dashboard with gray theme and advanced animations'
            },
            'quantum-research': {
                name: 'Quantum Research',
                icon: 'fas fa-flask',
                route: '/quantum-research',
                description: 'Advanced quantum research platform with specialized tools'
            }
        };

        this.currentTheme = this.detectCurrentTheme();
        this.init();
    }

    init() {
        this.createThemeSwitcher();
        this.setupEventListeners();
        this.loadSavedTheme();
    }

    detectCurrentTheme() {
        const path = window.location.pathname;
        if (path.includes('/ultimate')) return 'ultimate';
        if (path.includes('/hackathon')) return 'hackathon';
        if (path.includes('/advanced')) return 'advanced';
        if (path.includes('/modern')) return 'modern';
        if (path.includes('/professional')) return 'professional';
        if (path.includes('/production-dashboard') || path.includes('/production')) return 'production';
        if (path.includes('/quantum-research')) return 'quantum-research';
        return 'hackathon'; // default
    }

    createThemeSwitcher() {
        // Create theme dropdown only (button already exists in HTML)
        const themeDropdown = document.createElement('div');
        themeDropdown.className = 'theme-dropdown';
        themeDropdown.id = 'theme-dropdown';
        themeDropdown.innerHTML = `
            <div class="theme-dropdown-header">
                <h4><i class="fas fa-palette"></i> Choose Dashboard Theme</h4>
                <button class="close-theme-dropdown" id="close-theme-dropdown">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="theme-options">
                ${Object.entries(this.themes).map(([key, theme]) => `
                    <div class="theme-option ${key === this.currentTheme ? 'active' : ''}" data-theme="${key}">
                        <div class="theme-preview">
                            <i class="${theme.icon}"></i>
                        </div>
                        <div class="theme-info">
                            <h5>${theme.name}</h5>
                            <p>${theme.description}</p>
                        </div>
                        <div class="theme-status">
                            ${key === this.currentTheme ? '<i class="fas fa-check"></i>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="theme-dropdown-footer">
                <p><i class="fas fa-info-circle"></i> Switching themes preserves all your data and settings</p>
            </div>
        `;

        // Add styles
        this.addThemeSwitcherStyles();

        // Add dropdown to body
        document.body.appendChild(themeDropdown);
    }

    addThemeSwitcherStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .theme-switcher-btn {
                position: relative;
                transition: all 0.3s ease;
            }

            .theme-switcher-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(6, 182, 212, 0.3);
            }

            .theme-dropdown {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.8);
                width: 500px;
                max-width: 90vw;
                background: var(--glass-bg);
                backdrop-filter: blur(20px);
                border: 1px solid var(--glass-border);
                border-radius: var(--border-radius);
                box-shadow: var(--shadow-deep);
                z-index: 2000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                max-height: 80vh;
                overflow-y: auto;
            }

            .theme-dropdown.active {
                opacity: 1;
                visibility: visible;
                transform: translate(-50%, -50%) scale(1);
            }

            .theme-dropdown-header {
                padding: 1.5rem;
                border-bottom: 1px solid var(--glass-border);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: var(--quantum-gradient);
                color: white;
                border-radius: var(--border-radius) var(--border-radius) 0 0;
            }

            .theme-dropdown-header h4 {
                margin: 0;
                font-size: 1.1rem;
                font-weight: 600;
            }

            .close-theme-dropdown {
                width: 32px;
                height: 32px;
                border: none;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .close-theme-dropdown:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }

            .theme-options {
                padding: 1rem;
            }

            .theme-option {
                display: flex;
                align-items: center;
                padding: 1rem;
                margin-bottom: 0.5rem;
                border: 1px solid var(--glass-border);
                border-radius: var(--border-radius);
                cursor: pointer;
                transition: all 0.3s ease;
                background: var(--glass-bg);
                position: relative;
                overflow: hidden;
            }

            .theme-option::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.1), transparent);
                transition: left 0.5s;
            }

            .theme-option:hover::before {
                left: 100%;
            }

            .theme-option:hover {
                transform: translateX(5px);
                border-color: var(--text-accent);
                box-shadow: 0 5px 15px rgba(6, 182, 212, 0.2);
            }

            .theme-option.active {
                border-color: var(--text-accent);
                background: var(--quantum-gradient);
                color: white;
            }

            .theme-option.active .theme-preview i {
                color: white;
            }

            .theme-preview {
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--glass-bg);
                border-radius: 50%;
                margin-right: 1rem;
                transition: all 0.3s ease;
            }

            .theme-option:hover .theme-preview {
                transform: scale(1.1);
                box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
            }

            .theme-preview i {
                font-size: 1.2rem;
                color: var(--text-accent);
                transition: color 0.3s ease;
            }

            .theme-info {
                flex: 1;
            }

            .theme-info h5 {
                margin: 0 0 0.25rem 0;
                font-size: 1rem;
                font-weight: 600;
                color: var(--text-primary);
            }

            .theme-option.active .theme-info h5 {
                color: white;
            }

            .theme-info p {
                margin: 0;
                font-size: 0.8rem;
                color: var(--text-secondary);
                line-height: 1.3;
            }

            .theme-option.active .theme-info p {
                color: rgba(255, 255, 255, 0.8);
            }

            .theme-status {
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .theme-status i {
                color: var(--text-accent);
                font-size: 1rem;
            }

            .theme-option.active .theme-status i {
                color: white;
            }

            .theme-dropdown-footer {
                padding: 1rem 1.5rem;
                border-top: 1px solid var(--glass-border);
                background: var(--glass-bg);
                border-radius: 0 0 var(--border-radius) var(--border-radius);
            }

            .theme-dropdown-footer p {
                margin: 0;
                font-size: 0.8rem;
                color: var(--text-secondary);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .theme-dropdown-footer i {
                color: var(--text-accent);
            }

            /* Overlay for modal */
            .theme-dropdown-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(5px);
                z-index: 1999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .theme-dropdown-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .theme-dropdown {
                    width: 95vw;
                    margin: 1rem;
                }
                
                .theme-option {
                    padding: 0.75rem;
                }
                
                .theme-preview {
                    width: 40px;
                    height: 40px;
                    margin-right: 0.75rem;
                }
                
                .theme-info h5 {
                    font-size: 0.9rem;
                }
                
                .theme-info p {
                    font-size: 0.75rem;
                }
            }

            /* Animation for theme switching */
            .theme-switch-animation {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: var(--quantum-gradient);
                z-index: 3000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.5s ease;
            }

            .theme-switch-animation.active {
                opacity: 1;
                visibility: visible;
            }

            .theme-switch-animation .loading-content {
                text-align: center;
                color: white;
            }

            .theme-switch-animation .spinner {
                width: 60px;
                height: 60px;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Theme button click
        document.getElementById('theme-switcher-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleThemeDropdown();
        });

        // Close button click
        document.getElementById('close-theme-dropdown').addEventListener('click', () => {
            this.closeThemeDropdown();
        });

        // Theme option clicks
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.switchTheme(theme);
            });
        });

        // Close on overlay click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.theme-switcher-btn') && !e.target.closest('.theme-dropdown')) {
                this.closeThemeDropdown();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeThemeDropdown();
            }
        });
    }

    toggleThemeDropdown() {
        const dropdown = document.getElementById('theme-dropdown');
        const overlay = this.getOrCreateOverlay();

        if (dropdown.classList.contains('active')) {
            this.closeThemeDropdown();
        } else {
            this.openThemeDropdown();
        }
    }

    openThemeDropdown() {
        const dropdown = document.getElementById('theme-dropdown');
        const overlay = this.getOrCreateOverlay();

        dropdown.classList.add('active');
        overlay.classList.add('active');

        // Animate theme options
        const options = dropdown.querySelectorAll('.theme-option');
        options.forEach((option, index) => {
            option.style.opacity = '0';
            option.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                option.style.transition = 'all 0.3s ease';
                option.style.opacity = '1';
                option.style.transform = 'translateX(0)';
            }, index * 100);
        });
    }

    closeThemeDropdown() {
        const dropdown = document.getElementById('theme-dropdown');
        const overlay = document.querySelector('.theme-dropdown-overlay');

        dropdown.classList.remove('active');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    getOrCreateOverlay() {
        let overlay = document.querySelector('.theme-dropdown-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'theme-dropdown-overlay';
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    switchTheme(themeKey) {
        if (themeKey === this.currentTheme) {
            this.closeThemeDropdown();
            return;
        }

        const theme = this.themes[themeKey];
        if (!theme) return;

        // Show loading animation
        this.showThemeSwitchAnimation();

        // Save theme preference
        localStorage.setItem('quantum-spark-theme', themeKey);

        // Navigate to the appropriate dashboard route
        setTimeout(() => {
            this.navigateToTheme(themeKey);
        }, 1000);
    }

    navigateToTheme(themeKey) {
        console.log('🎨 Navigating to theme:', themeKey);

        const theme = this.themes[themeKey];
        if (!theme) return;

        // Close dropdown
        this.closeThemeDropdown();

        // Navigate to the theme's route
        window.location.href = theme.route;
    }

    applyTheme(themeKey) {
        console.log('🎨 Applying theme:', themeKey);

        // Remove existing theme classes
        document.body.classList.remove('hackathon-theme', 'advanced-theme', 'modern-theme', 'professional-theme', 'production-theme');

        // Add new theme class
        document.body.classList.add(`${themeKey}-theme`);

        // Update current theme
        this.currentTheme = themeKey;

        // Update theme indicators
        this.updateThemeIndicators();

        // Show success notification
        if (window.dashboard && window.dashboard.showNotification) {
            window.dashboard.showNotification(`Switched to ${this.themes[themeKey].name} theme`, 'success');
        }

        console.log('✅ Theme applied successfully');
    }

    showThemeSwitchAnimation() {
        const animation = document.createElement('div');
        animation.className = 'theme-switch-animation active';
        animation.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <h3>Switching to ${this.themes[this.detectCurrentTheme()].name} Theme</h3>
                <p>Preserving all your data and settings...</p>
            </div>
        `;
        document.body.appendChild(animation);

        // Remove animation after navigation
        setTimeout(() => {
            if (animation.parentNode) {
                animation.parentNode.removeChild(animation);
            }
        }, 2000);
    }

    loadSavedTheme() {
        const savedTheme = localStorage.getItem('quantum-spark-theme');
        if (savedTheme && savedTheme !== this.currentTheme) {
            // Update current theme indicator
            this.currentTheme = savedTheme;
            this.updateThemeIndicators();
        }
    }

    updateThemeIndicators() {
        document.querySelectorAll('.theme-option').forEach(option => {
            const theme = option.dataset.theme;
            if (theme === this.currentTheme) {
                option.classList.add('active');
                option.querySelector('.theme-status').innerHTML = '<i class="fas fa-check"></i>';
            } else {
                option.classList.remove('active');
                option.querySelector('.theme-status').innerHTML = '';
            }
        });
    }
}

// Initialize theme switcher when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.themeSwitcher = new ThemeSwitcher();
    console.log('🎨 Theme Switcher initialized');
});
