// Interactive Tutorial System - Canva-style Onboarding
class QuantumTutorial {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.steps = [
            {
                target: '.logo',
                title: 'Welcome to Quantum Spark Dashboard',
                content: 'Your all-in-one quantum computing platform. Let me show you around!',
                position: 'bottom',
                icon: 'fas fa-rocket'
            },
            {
                target: '.mode-toggle-container',
                title: 'Mode Switcher',
                content: 'Switch between IBM Quantum (real quantum hardware) and Local Simulator. IBM mode connects to real quantum computers!',
                position: 'bottom',
                icon: 'fas fa-exchange-alt'
            },
            {
                target: '#auto-refresh-controls',
                title: 'Auto-Refresh Timer',
                content: 'The dashboard automatically refreshes every 5 minutes. You can change the interval or pause it. Keep your data fresh!',
                position: 'bottom',
                icon: 'fas fa-clock'
            },
            {
                target: '#user-status',
                title: 'Authentication Status',
                content: 'Shows your login status. Click Login to connect to IBM Quantum or use Local mode for testing.',
                position: 'bottom',
                icon: 'fas fa-user'
            },
            {
                target: '[data-widget="backends"]',
                title: 'Quantum Backends',
                content: 'View available quantum processors. See their status, queue depth, and number of qubits. Click to select a backend for your circuits.',
                position: 'top',
                icon: 'fas fa-microchip'
            },
            {
                target: '[data-widget="jobs"]',
                title: 'Job Tracking',
                content: 'Monitor all your quantum circuit executions. Track job status, view results, and manage your quantum computations in real-time.',
                position: 'top',
                icon: 'fas fa-tasks'
            },
            {
                target: '[data-widget="results"]',
                title: 'Quantum Results',
                content: 'View measurement outcomes from your quantum circuits. See probability distributions and analyze quantum states.',
                position: 'left',
                icon: 'fas fa-chart-bar'
            },
            {
                target: '[data-widget="circuit"]',
                title: '3D Circuit Visualizer',
                content: 'Build and visualize quantum circuits in stunning 3D. Add gates, entangle qubits, and see your quantum algorithm come to life!',
                position: 'right',
                icon: 'fas fa-cube'
            },
            {
                target: '[data-widget="bloch-sphere"]',
                title: 'Bloch Sphere',
                content: 'Visualize qubit states on the Bloch sphere. Understand superposition and quantum state evolution in 3D space.',
                position: 'top',
                icon: 'fas fa-globe'
            },
            {
                target: '[data-widget="ai-chat"]',
                title: 'AI Quantum Assistant',
                content: 'Your intelligent quantum companion! Ask questions, get circuit suggestions, and receive expert guidance powered by advanced AI.',
                position: 'left',
                icon: 'fas fa-robot'
            },
            {
                target: '#customize-btn',
                title: 'Customize Your Dashboard',
                content: 'Personalize your workspace! Drag and drop widgets, resize them, and create your perfect quantum computing environment.',
                position: 'bottom',
                icon: 'fas fa-sliders-h'
            },
            {
                target: '#theme-switcher-btn',
                title: 'Theme Selector',
                content: 'Choose from multiple beautiful themes: Modern, Professional, Advanced, or Hackathon. Each with unique styles and features!',
                position: 'bottom',
                icon: 'fas fa-palette'
            },
            {
                target: '#refresh-all-btn',
                title: 'Refresh Data',
                content: 'Manually refresh all widgets to get the latest data from quantum backends and job statuses.',
                position: 'bottom',
                icon: 'fas fa-sync'
            },
            {
                target: '#logout-btn',
                title: 'Logout Button',
                content: 'Click here to logout from IBM Quantum. You can always log back in to access real quantum hardware.',
                position: 'bottom',
                icon: 'fas fa-sign-out-alt'
            },
            {
                target: 'body',
                title: 'Ready to Start!',
                content: 'You are all set! Start building quantum circuits, running experiments, and exploring the quantum realm. Need help? Click the tutorial button anytime!',
                position: 'center',
                icon: 'fas fa-check-circle'
            }
        ];
        
        this.init();
    }

    init() {
        this.createOverlay();
        this.createTooltip();
        this.attachEventListeners();
    }

    createOverlay() {
        // Create main overlay
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'tutorial-overlay';
        document.body.appendChild(overlay);

        // Create spotlight (hole in overlay)
        const spotlight = document.createElement('div');
        spotlight.id = 'tutorial-spotlight';
        spotlight.className = 'tutorial-spotlight';
        overlay.appendChild(spotlight);
    }

    createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.id = 'tutorial-tooltip';
        tooltip.className = 'tutorial-tooltip';
        tooltip.innerHTML = `
            <div class="tutorial-tooltip-header">
                <div class="tutorial-icon-container">
                    <i class="tutorial-icon"></i>
                </div>
                <div class="tutorial-step-counter">
                    <span class="current-step">1</span> / <span class="total-steps">${this.steps.length}</span>
                </div>
            </div>
            <div class="tutorial-tooltip-content">
                <h3 class="tutorial-title"></h3>
                <p class="tutorial-description"></p>
            </div>
            <div class="tutorial-progress-bar">
                <div class="tutorial-progress-fill"></div>
            </div>
            <div class="tutorial-tooltip-footer">
                <button class="tutorial-btn tutorial-btn-skip" id="tutorial-skip">
                    Skip Tour
                </button>
                <div class="tutorial-nav-buttons">
                    <button class="tutorial-btn tutorial-btn-secondary" id="tutorial-prev" style="display: none;">
                        <i class="fas fa-arrow-left"></i> Previous
                    </button>
                    <button class="tutorial-btn tutorial-btn-primary" id="tutorial-next">
                        Next <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(tooltip);
    }

    attachEventListeners() {
        const nextBtn = document.getElementById('tutorial-next');
        const prevBtn = document.getElementById('tutorial-prev');
        const skipBtn = document.getElementById('tutorial-skip');

        if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousStep());
        if (skipBtn) skipBtn.addEventListener('click', () => this.end());

        // Close on overlay click
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.end();
                }
            });
        }

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.end();
            } else if (e.key === 'ArrowRight' && this.isActive) {
                this.nextStep();
            } else if (e.key === 'ArrowLeft' && this.isActive) {
                this.previousStep();
            }
        });
    }

    start() {
        this.isActive = true;
        this.currentStep = 0;
        
        const overlay = document.getElementById('tutorial-overlay');
        const tooltip = document.getElementById('tutorial-tooltip');
        
        if (overlay) overlay.classList.add('active');
        if (tooltip) tooltip.classList.add('active');
        
        this.showStep(this.currentStep);
        
        // Track tutorial start
        console.log('Tutorial started');
        localStorage.setItem('tutorialCompleted', 'false');
    }

    end() {
        this.isActive = false;
        
        const overlay = document.getElementById('tutorial-overlay');
        const tooltip = document.getElementById('tutorial-tooltip');
        const spotlight = document.getElementById('tutorial-spotlight');
        
        if (overlay) overlay.classList.remove('active');
        if (tooltip) tooltip.classList.remove('active');
        if (spotlight) spotlight.classList.remove('active');
        
        // Remove highlight from any element
        document.querySelectorAll('.tutorial-highlighted').forEach(el => {
            el.classList.remove('tutorial-highlighted');
        });
        
        console.log('Tutorial ended');
        localStorage.setItem('tutorialCompleted', 'true');
    }

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showStep(this.currentStep);
        } else {
            this.end();
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    showStep(stepIndex) {
        const step = this.steps[stepIndex];
        if (!step) return;

        // Check if target element exists, skip if not
        const targetElement = document.querySelector(step.target);
        if (!targetElement) {
            console.log(`Tutorial step ${stepIndex + 1}: Target element '${step.target}' not found, skipping...`);
            // Skip to next step if current target doesn't exist
            if (stepIndex < this.steps.length - 1) {
                this.nextStep();
                return;
            } else {
                this.end();
                return;
            }
        }

        // Update tooltip content
        const tooltip = document.getElementById('tutorial-tooltip');
        const title = tooltip.querySelector('.tutorial-title');
        const description = tooltip.querySelector('.tutorial-description');
        const icon = tooltip.querySelector('.tutorial-icon');
        const currentStepEl = tooltip.querySelector('.current-step');
        const progressFill = tooltip.querySelector('.tutorial-progress-fill');
        const nextBtn = document.getElementById('tutorial-next');
        const prevBtn = document.getElementById('tutorial-prev');

        if (title) title.textContent = step.title;
        if (description) description.textContent = step.content;
        if (icon) icon.className = `tutorial-icon ${step.icon}`;
        if (currentStepEl) currentStepEl.textContent = stepIndex + 1;
        
        // Update progress bar
        const progress = ((stepIndex + 1) / this.steps.length) * 100;
        if (progressFill) progressFill.style.width = `${progress}%`;

        // Update button visibility and text
        if (prevBtn) {
            prevBtn.style.display = stepIndex === 0 ? 'none' : 'flex';
        }
        
        if (nextBtn) {
            if (stepIndex === this.steps.length - 1) {
                nextBtn.innerHTML = 'Finish <i class="fas fa-check"></i>';
            } else {
                nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
            }
        }

        // Position tooltip and spotlight
        this.positionElements(step);

        // Add animation
        tooltip.classList.remove('slide-in');
        void tooltip.offsetWidth; // Trigger reflow
        tooltip.classList.add('slide-in');
    }

    positionElements(step) {
        const tooltip = document.getElementById('tutorial-tooltip');
        const spotlight = document.getElementById('tutorial-spotlight');
        
        // Remove previous highlights
        document.querySelectorAll('.tutorial-highlighted').forEach(el => {
            el.classList.remove('tutorial-highlighted');
        });

        let targetElement = null;
        
        if (step.position !== 'center') {
            targetElement = document.querySelector(step.target);
            
            if (!targetElement) {
                console.warn(`Tutorial target not found: ${step.target}`);
                // Fallback to center position
                this.positionCenter(tooltip, spotlight);
                return;
            }

            // Scroll element into view smoothly
            targetElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'center'
            });

            // Highlight the target element
            setTimeout(() => {
                targetElement.classList.add('tutorial-highlighted');
            }, 300);

            // Position spotlight with extra padding for better visibility
            const rect = targetElement.getBoundingClientRect();
            const padding = 15;
            
            spotlight.style.left = `${rect.left - padding}px`;
            spotlight.style.top = `${rect.top - padding}px`;
            spotlight.style.width = `${rect.width + padding * 2}px`;
            spotlight.style.height = `${rect.height + padding * 2}px`;
            spotlight.classList.add('active');

            // Position tooltip relative to target
            this.positionTooltip(tooltip, targetElement, step.position);
        } else {
            // Center position
            spotlight.classList.remove('active');
            this.positionCenter(tooltip, spotlight);
        }
    }

    positionTooltip(tooltip, targetElement, position) {
        const rect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const offset = 30; // Increased offset to avoid overlap
        const padding = 20;
        let left, top;
        let finalPosition = position;

        // Calculate initial position
        switch (position) {
            case 'top':
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                top = rect.top - tooltipRect.height - offset;
                break;
            case 'bottom':
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                top = rect.bottom + offset;
                break;
            case 'left':
                left = rect.left - tooltipRect.width - offset;
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                break;
            case 'right':
                left = rect.right + offset;
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                break;
            default:
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                top = rect.bottom + offset;
        }

        // Smart positioning: Try to find best position that doesn't overlap
        // Prefer left/right for widgets to avoid covering content
        const positions = ['left', 'right', 'bottom', 'top'];
        const positionAttempts = [finalPosition, ...positions.filter(p => p !== finalPosition)];
        
        let bestPosition = null;
        for (const pos of positionAttempts) {
            let testLeft, testTop;
            
            switch (pos) {
                case 'top':
                    testLeft = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    testTop = rect.top - tooltipRect.height - offset;
                    break;
                case 'bottom':
                    testLeft = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    testTop = rect.bottom + offset;
                    break;
                case 'left':
                    testLeft = rect.left - tooltipRect.width - offset;
                    testTop = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                    break;
                case 'right':
                    testLeft = rect.right + offset;
                    testTop = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                    break;
            }
            
            // Check if this position fits in viewport and doesn't overlap target
            const fitsInViewport = 
                testLeft >= padding && 
                testLeft + tooltipRect.width <= window.innerWidth - padding &&
                testTop >= padding && 
                testTop + tooltipRect.height <= window.innerHeight - padding;
            
            // Check if tooltip doesn't overlap with target element
            const tooltipBounds = {
                left: testLeft,
                right: testLeft + tooltipRect.width,
                top: testTop,
                bottom: testTop + tooltipRect.height
            };
            
            const targetBounds = {
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom
            };
            
            const overlaps = !(
                tooltipBounds.right < targetBounds.left ||
                tooltipBounds.left > targetBounds.right ||
                tooltipBounds.bottom < targetBounds.top ||
                tooltipBounds.top > targetBounds.bottom
            );
            
            if (fitsInViewport && !overlaps) {
                bestPosition = { left: testLeft, top: testTop, position: pos };
                break;
            }
        }

        // Use best position or constrained original position
        if (bestPosition) {
            left = bestPosition.left;
            top = bestPosition.top;
        } else {
            // Constrain to viewport even if it might overlap slightly
            left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
            top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
            
            // If still overlapping, try to shift away from target
            const tooltipCenter = {
                x: left + tooltipRect.width / 2,
                y: top + tooltipRect.height / 2
            };
            const targetCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
            
            // Push away from target center
            if (Math.abs(tooltipCenter.x - targetCenter.x) < tooltipRect.width / 2) {
                if (tooltipCenter.x < targetCenter.x) {
                    left = Math.max(padding, rect.left - tooltipRect.width - offset);
                } else {
                    left = Math.min(window.innerWidth - tooltipRect.width - padding, rect.right + offset);
                }
            }
            
            if (Math.abs(tooltipCenter.y - targetCenter.y) < tooltipRect.height / 2) {
                if (tooltipCenter.y < targetCenter.y) {
                    top = Math.max(padding, rect.top - tooltipRect.height - offset);
                } else {
                    top = Math.min(window.innerHeight - tooltipRect.height - padding, rect.bottom + offset);
                }
            }
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.transform = 'none';
        
        // Add arrow direction indicator
        const arrowPosition = bestPosition ? bestPosition.position : position;
        tooltip.setAttribute('data-arrow', arrowPosition);
    }

    positionCenter(tooltip, spotlight) {
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
        tooltip.setAttribute('data-arrow', 'center');
        spotlight.classList.remove('active');
    }

    // Check if user wants to see tutorial on first visit
    static shouldShowOnFirstVisit() {
        return !localStorage.getItem('tutorialCompleted');
    }

    // Show tutorial on first visit
    static showOnFirstVisit() {
        if (this.shouldShowOnFirstVisit()) {
            setTimeout(() => {
                if (window.quantumTutorial) {
                    window.quantumTutorial.start();
                }
            }, 1500); // Show after 1.5 seconds
        }
    }
}

// Initialize tutorial system
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== Quantum Tutorial System Initializing ===');
    try {
        window.quantumTutorial = new QuantumTutorial();
        console.log('=== Quantum Tutorial System Ready! ===');
        console.log('Tutorial steps:', window.quantumTutorial.steps.length);
        
        // Add immediate click handler as backup
        const tutorialBtn = document.getElementById('tutorial-btn');
        if (tutorialBtn) {
            console.log('Tutorial button found!');
        } else {
            console.warn('Tutorial button NOT found on page load!');
        }
    } catch (error) {
        console.error('=== Error initializing tutorial:', error);
    }
    
    // Optionally show on first visit
    // QuantumTutorial.showOnFirstVisit();
});

// Export for use globally
window.QuantumTutorial = QuantumTutorial;

// Fallback: Initialize immediately if DOM already loaded
if (document.readyState === 'loading') {
    // DOM still loading, wait for event
    console.log('Waiting for DOM to load...');
} else {
    // DOM already loaded, initialize now
    console.log('=== DOM Already Loaded - Initializing Tutorial Now ===');
    if (!window.quantumTutorial) {
        try {
            window.quantumTutorial = new QuantumTutorial();
            console.log('=== Quantum Tutorial System Ready (Immediate)! ===');
        } catch (error) {
            console.error('Error in immediate tutorial init:', error);
        }
    }
}

