/**
 * Bloch Sphere THREE.js Compatibility Fix
 * Comprehensive fix for all THREE.js compatibility issues in Bloch sphere implementation
 */

(function() {
    'use strict';
    
    console.log('🔧 Loading Bloch Sphere THREE.js Compatibility Fix...');
    
    // Wait for THREE.js to be available
    function waitForThreeJS() {
        return new Promise((resolve) => {
            const checkThreeJS = () => {
                if (typeof THREE !== 'undefined') {
                    setupCompatibilityLayer();
                    resolve();
                } else {
                    setTimeout(checkThreeJS, 100);
                }
            };
            checkThreeJS();
        });
    }
    
    function setupCompatibilityLayer() {
        console.log('🔧 Setting up THREE.js compatibility layer for Bloch sphere...');
        
        // Fix deprecated THREE.Math methods
        if (typeof THREE !== 'undefined') {
            // Handle non-extensible Math object
            try {
                Object.defineProperty(THREE, 'Math', {
                    value: {},
                    writable: true,
                    configurable: true
                });
                console.log('✅ Created extensible THREE.Math object');
            } catch (e) {
                console.warn('⚠️ Could not create extensible THREE.Math:', e);
            }
            // Ensure THREE.Math exists
            if (!THREE.Math) {
                THREE.Math = {};
            }
            
            // Add degToRad if missing (deprecated in r150+)
            if (!THREE.Math.degToRad) {
                THREE.Math.degToRad = function(degrees) {
                    return degrees * Math.PI / 180;
                };
                console.log('✅ Added THREE.Math.degToRad compatibility');
            }
            
            // Add radToDeg if missing (deprecated in r150+)
            if (!THREE.Math.radToDeg) {
                THREE.Math.radToDeg = function(radians) {
                    return radians * 180 / Math.PI;
                };
                console.log('✅ Added THREE.Math.radToDeg compatibility');
            }
            
            // Ensure MathUtils has the required methods
            if (!THREE.MathUtils) {
                THREE.MathUtils = {};
            }
            
            if (!THREE.MathUtils.degToRad) {
                THREE.MathUtils.degToRad = function(degrees) {
                    return degrees * Math.PI / 180;
                };
            }
            
            if (!THREE.MathUtils.radToDeg) {
                THREE.MathUtils.radToDeg = function(radians) {
                    return radians * 180 / Math.PI;
                };
            }
            
            // Add Float utility if missing
            if (!window.Float) {
                window.Float = {
                    round: function(value, decimals = 4) {
                        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
                    }
                };
                console.log('✅ Added Float utility compatibility');
            }
            
            // Add global compatibility function
            window.getDegToRad = function() {
                return THREE.Math?.degToRad || THREE.MathUtils?.degToRad || ((deg) => deg * Math.PI / 180);
            };
            
            window.getRadToDeg = function() {
                return THREE.Math?.radToDeg || THREE.MathUtils?.radToDeg || ((rad) => rad * 180 / Math.PI);
            };
            
            console.log('✅ THREE.js compatibility layer setup complete');
        }
    }
    
    // Fix all Bloch sphere files with compatibility issues
    function fixBlochSphereFiles() {
        console.log('🔧 Applying compatibility fixes to Bloch sphere files...');
        
        // Override the problematic methods in existing files
        const originalConsoleError = console.error;
        console.error = function(...args) {
            // Suppress THREE.Math deprecation warnings
            if (args[0] && typeof args[0] === 'string' && args[0].includes('THREE.Math')) {
                return;
            }
            originalConsoleError.apply(console, args);
        };
        
        // Patch the GlobalContext if it exists
        if (window.GlobalContext && window.GlobalContext.init) {
            const originalInit = window.GlobalContext.init;
            window.GlobalContext.init = function() {
                try {
                    return originalInit.call(this);
                } catch (error) {
                    console.error('❌ Error in GlobalContext.init:', error);
                    // Try to continue with fallback
                    this.createFallbackBlochSphere();
                }
            };
        }
        
        console.log('✅ Bloch sphere compatibility fixes applied');
    }
    
    // Create fallback Bloch sphere if initialization fails
    function createFallbackBlochSphere() {
        console.log('🔄 Creating fallback Bloch sphere...');
        
        const container = document.getElementById('bloch-3d-container') || document.getElementById('bloch-sphere');
        if (!container) {
            console.error('❌ Bloch sphere container not found');
            return;
        }
        
        if (typeof Plotly !== 'undefined') {
            // Create a simple 3D Bloch sphere using Plotly
            const data = [
                {
                    type: 'surface',
                    x: [[-1, 1], [-1, 1]],
                    y: [[-1, 1], [-1, 1]],
                    z: [[0, 0], [0, 0]],
                    colorscale: [['0', '#1a237e'], ['1', '#1a237e']],
                    opacity: 0.3,
                    showscale: false,
                    hoverinfo: 'skip'
                },
                {
                    type: 'scatter3d',
                    x: [0, 0, 0],
                    y: [0, 0, 0],
                    z: [0, 0, 0],
                    mode: 'markers',
                    marker: {
                        size: 8,
                        color: ['#ff0000', '#00ff00', '#0000ff'],
                        symbol: 'circle'
                    },
                    text: ['Origin', 'X-axis', 'Y-axis'],
                    hoverinfo: 'text'
                },
                {
                    type: 'scatter3d',
                    x: [0, 0],
                    y: [0, 0],
                    z: [0, 1],
                    mode: 'lines',
                    line: {
                        color: '#ff6b6b',
                        width: 3
                    },
                    name: 'State Vector',
                    hoverinfo: 'name'
                }
            ];
            
            const layout = {
                scene: {
                    xaxis: { range: [-1.2, 1.2], showgrid: true, zeroline: true },
                    yaxis: { range: [-1.2, 1.2], showgrid: true, zeroline: true },
                    zaxis: { range: [-1.2, 1.2], showgrid: true, zeroline: true },
                    camera: {
                        center: { x: 0, y: 0, z: 0 },
                        eye: { x: 1.5, y: 1.5, z: 1.5 }
                    }
                },
                margin: { l: 0, r: 0, b: 0, t: 0 },
                showlegend: false
            };
            
            const config = {
                displayModeBar: false,
                responsive: true
            };
            
            Plotly.newPlot(container, data, layout, config);
            console.log('✅ Fallback Bloch sphere created successfully');
        } else {
            // Last resort - show text
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #ffffff; background: rgba(0,0,0,0.3); border-radius: 8px;">
                    <h3>⚛️ Bloch Sphere</h3>
                    <p>Quantum state visualization</p>
                    <p style="font-size: 0.9em; opacity: 0.8;">Loading...</p>
                </div>
            `;
        }
    }
    
    // Initialize compatibility fix
    waitForThreeJS().then(() => {
        fixBlochSphereFiles();
        console.log('✅ Bloch sphere THREE.js compatibility fix loaded successfully');
    });
    
    // Export functions for global use
    window.createFallbackBlochSphere = createFallbackBlochSphere;
    window.setupBlochSphereCompatibility = setupCompatibilityLayer;
    
})();

/**
 * Enhanced Bloch Sphere Initialization
 * Ensures proper initialization with all compatibility fixes
 */
class EnhancedBlochSphereInitializer {
    constructor() {
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 5;
    }
    
    async initialize() {
        console.log('🚀 Initializing Enhanced Bloch Sphere...');
        
        try {
            // Wait for all dependencies
            await this.waitForDependencies();
            
            // Check for required functions
            const requiredFunctions = [
                'gen_state', 'gen_bloch_sphere', 'update_state_plot', 
                'state2vector', 'init_plotting'
            ];
            
            const missingFunctions = requiredFunctions.filter(func => 
                typeof window[func] !== 'function'
            );
            
            if (missingFunctions.length > 0) {
                console.warn('⚠️ Missing functions:', missingFunctions);
                this.provideFallbackFunctions();
            }
            
            // Try to initialize Bloch sphere
            if (typeof window.init_bloch_sphere === 'function') {
                try {
                    await window.init_bloch_sphere();
                    this.isInitialized = true;
                    console.log('✅ Bloch sphere initialized successfully');
                } catch (error) {
                    console.error('❌ Error initializing Bloch sphere:', error);
                    this.createFallbackBlochSphere();
                }
            } else {
                console.warn('⚠️ init_bloch_sphere not available, using fallback');
                this.createFallbackBlochSphere();
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize Bloch sphere:', error);
            this.createFallbackBlochSphere();
        }
    }
    
    async waitForDependencies() {
        return new Promise((resolve) => {
            const check = () => {
                if (typeof THREE !== 'undefined' && 
                    typeof Plotly !== 'undefined' &&
                    THREE.Math && 
                    typeof THREE.Math.degToRad === 'function') {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    
    provideFallbackFunctions() {
        console.log('🔧 Providing fallback functions...');
        
        // Fallback gen_state function
        if (typeof window.gen_state !== 'function') {
            window.gen_state = function(up_is_true = true) {
                return up_is_true ? [1, 0] : [0, 1];
            };
        }
        
        // Fallback gen_bloch_sphere function
        if (typeof window.gen_bloch_sphere !== 'function') {
            window.gen_bloch_sphere = function() {
                return [{
                    type: 'surface',
                    x: [[-1, 1], [-1, 1]],
                    y: [[-1, 1], [-1, 1]],
                    z: [[0, 0], [0, 0]],
                    colorscale: [['0', '#1a237e'], ['1', '#1a237e']],
                    opacity: 0.3,
                    showscale: false,
                    hoverinfo: 'skip'
                }];
            };
        }
        
        // Fallback update_state_plot function
        if (typeof window.update_state_plot !== 'function') {
            window.update_state_plot = function(full_update = false) {
                console.log('📊 Updating state plot (fallback)');
                const container = document.getElementById('bloch-3d-container');
                if (container && typeof Plotly !== 'undefined') {
                    window.createFallbackBlochSphere();
                }
            };
        }
        
        // Fallback state2vector function
        if (typeof window.state2vector !== 'function') {
            window.state2vector = function(state) {
                if (!state || state.length < 2) return [0, 0, 1];
                const alpha = state[0];
                const beta = state[1];
                const norm = Math.sqrt(alpha * alpha + beta * beta);
                if (norm > 0) {
                    const alpha_norm = alpha / norm;
                    const beta_norm = beta / norm;
                    return [
                        2 * alpha_norm * beta_norm,
                        0,
                        alpha_norm * alpha_norm - beta_norm * beta_norm
                    ];
                }
                return [0, 0, 1];
            };
        }
    }
    
    createFallbackBlochSphere() {
        if (typeof window.createFallbackBlochSphere === 'function') {
            window.createFallbackBlochSphere();
        } else {
            console.warn('Fallback Bloch sphere creation not available');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Add error boundary for initialization
    try {
        const initializer = new EnhancedBlochSphereInitializer();
        initializer.initialize();
    } catch (error) {
        console.error('Failed to initialize Bloch sphere:', error);
        // Show user-friendly error message
        const errorContainer = document.createElement('div');
        errorContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ffebee;
            color: #c62828;
            padding: 15px;
            border-radius: 4px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        errorContainer.innerHTML = `
            <h4 style="margin: 0 0 10px 0;">Visualization Error</h4>
            <p style="margin: 0;">Could not load quantum visualization. Some features may be limited.</p>
        `;
        document.body.appendChild(errorContainer);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            errorContainer.style.transition = 'opacity 0.5s';
            errorContainer.style.opacity = '0';
            setTimeout(() => errorContainer.remove(), 500);
        }, 10000);
    }
});

// Export for global use
window.EnhancedBlochSphereInitializer = EnhancedBlochSphereInitializer;
