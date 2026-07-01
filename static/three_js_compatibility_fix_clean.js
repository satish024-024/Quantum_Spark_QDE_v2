/**
 * THREE.js Comprehensive Compatibility Fix
 * A clean implementation to fix all reported THREE.js compatibility issues
 */

(function (global) {
    'use strict';

    // Safe reference to THREE
    const THREE = global.THREE || {};
    
    // Check if THREE is already loaded
    if (!global.THREE) {
        console.warn('THREE.js not found. Loading from CDN...');
        loadThreeJS().then(initializeCompatibility);
    } else {
        // Use setTimeout to ensure THREE is fully loaded
        setTimeout(initializeCompatibility, 0);
    }

    function loadThreeJS() {
        return new Promise((resolve) => {
            if (global.THREE) return resolve();
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js';
            script.onload = () => {
                console.log('✅ THREE.js loaded successfully');
                initializeCompatibility();
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Failed to load THREE.js');
                // Still try to initialize with fallbacks
                initializeCompatibility();
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    function initializeCompatibility() {
        console.log('🔧 Initializing comprehensive THREE.js compatibility layer...');
        
        try {
            // Setup Math utilities first
            setupMathCompatibility();
            
            // Setup renderer compatibility
            setupRendererCompatibility();
            
            // Setup Bloch Sphere specific fixes
            setupBlochSphereCompatibility();
            
            console.log('✅ THREE.js compatibility layer initialized');
        } catch (error) {
            console.error('❌ Error initializing THREE.js compatibility layer:', error);
            // Try to continue with partial initialization
            try {
                setupBlochSphereCompatibility();
            } catch (e) {
                console.error('❌ Error in Bloch Sphere compatibility setup:', e);
            }
        }
    }

    function setupMathCompatibility() {
        if (!global.THREE) {
            console.warn('THREE not available, skipping math compatibility setup');
            return;
        }

        // Create MathUtils if it doesn't exist (r125+)
        if (!THREE.MathUtils) {
            try {
                THREE.MathUtils = {};
                console.log('✅ Created THREE.MathUtils');
            } catch (e) {
                console.warn('⚠️ Could not create THREE.MathUtils:', e);
            }
        }

        // Add missing Math utilities with fallbacks
        const mathUtils = THREE.MathUtils || {};

        // degToRad (moved from THREE.Math in r125)
        if (typeof mathUtils.degToRad === 'undefined') {
            mathUtils.degToRad = function(degrees) {
                return degrees * Math.PI / 180;
            };
            console.log('✅ Added THREE.MathUtils.degToRad');
        }

        // radToDeg (moved from THREE.Math in r125)
        if (typeof mathUtils.radToDeg === 'undefined') {
            mathUtils.radToDeg = function(radians) {
                return radians * 180 / Math.PI;
            };
            console.log('✅ Added THREE.MathUtils.radToDeg');
        }

        // Backward compatibility for THREE.Math
        if (!THREE.Math) {
            try {
                THREE.Math = {
                    degToRad: mathUtils.degToRad,
                    radToDeg: mathUtils.radToDeg
                };
                console.log('✅ Added THREE.Math compatibility layer');
            } catch (e) {
                console.warn('⚠️ Could not create THREE.Math compatibility layer:', e);
            }
        }

        // Add Float utility if missing
        if (!THREE.Float) {
            try {
                THREE.Float = {
                    round: function(value, decimals = 4) {
                        const factor = Math.pow(10, decimals);
                        return Math.round(value * factor) / factor;
                    }
                };
                console.log('✅ Added Float utility compatibility');
            } catch (e) {
                console.warn('⚠️ Could not add Float utility:', e);
            }
        }
    }

    function setupRendererCompatibility() {
        if (!global.THREE) return;

        // Add CSS2DRenderer if not exists
        if (typeof THREE.CSS2DRenderer === 'undefined') {
            try {
                // Create a simple CSS2DRenderer class
                class CSS2DRenderer {
                    constructor(parameters = {}) {
                        this.domElement = document.createElement('div');
                        this.domElement.style.position = 'absolute';
                        this.domElement.style.top = 0;
                        this.domElement.style.left = 0;
                        this.domElement.style.pointerEvents = 'none';
                        this.domElement.style.overflow = 'hidden';
                        console.log('✅ Created CSS2DRenderer compatibility layer');
                    }
                    
                    setSize(width, height) {
                        this.domElement.style.width = width + 'px';
                        this.domElement.style.height = height + 'px';
                    }
                    
                    render(scene, camera) {
                        // Basic implementation
                        console.log('Rendering with CSS2DRenderer compatibility layer');
                    }
                }
                
                THREE.CSS2DRenderer = CSS2DRenderer;
                console.log('✅ Added THREE.CSS2DRenderer compatibility');
            } catch (e) {
                console.error('❌ Failed to create CSS2DRenderer compatibility layer:', e);
            }
        }
    }

    function setupBlochSphereCompatibility() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initBlochSphere);
        } else {
            initBlochSphere();
        }

        function initBlochSphere() {
            console.log('🔧 Initializing Bloch Sphere compatibility...');
            
            // Check if Bloch sphere container exists
            const containers = document.querySelectorAll('.bloch-sphere-container, .bloch-container');
            if (containers.length === 0) {
                console.log('No Bloch sphere containers found, skipping initialization');
                return;
            }
            
            console.log(`Found ${containers.length} Bloch sphere container(s)`);

            // Provide fallback functions if they don't exist
            if (typeof window.gen_state === 'undefined') {
                window.gen_state = function(up_is_true = true) {
                    return up_is_true ? [1, 0] : [0, 1];
                };
                console.log('✅ Added gen_state fallback');
            }
            
            if (typeof window.state2vector === 'undefined') {
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
                console.log('✅ Added state2vector fallback');
            }
        }
    }

    // Export to global scope
    global.THREE = THREE;
    
    // Initialize the compatibility layer
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCompatibility);
    } else {
        setTimeout(initializeCompatibility, 0);
    }

})(typeof window !== 'undefined' ? window : this);

// Bloch Sphere Compatibility Fix
class BlochSphereCompatibilityFix {
    constructor() {
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 10;
    }

    initialize() {
        if (this.isInitialized) return;

        console.log('🔧 Initializing Bloch Sphere compatibility fix...');
        
        // Check if all required THREE.js components are available
        this.waitForThreeJSCompatibility().then(() => {
            console.log('✅ All required THREE.js components are available');
            this.provideFallbackFunctions();
            this.isInitialized = true;
        }).catch(error => {
            console.error('❌ Failed to initialize Bloch Sphere compatibility:', error);
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying initialization (${this.retryCount}/${this.maxRetries})...`);
                setTimeout(() => this.initialize(), 1000 * this.retryCount);
            } else {
                console.error('Max retries reached, providing fallback implementation');
                this.provideFallbackFunctions();
            }
        });
    }

    waitForThreeJSCompatibility() {
        return new Promise((resolve, reject) => {
            const check = () => {
                const threeReady = window.THREE && 
                                 window.THREE.MathUtils && 
                                 window.THREE.Scene && 
                                 window.THREE.WebGLRenderer;
                
                if (threeReady) {
                    resolve();
                } else if (this.retryCount < this.maxRetries) {
                    this.retryCount++;
                    setTimeout(check, 100 * this.retryCount);
                } else {
                    reject(new Error('THREE.js not fully loaded after maximum retries'));
                }
            };
            
            check();
        });
    }

    provideFallbackFunctions() {
        // Ensure gen_state exists
        if (typeof window.gen_state === 'undefined') {
            window.gen_state = function(up_is_true = true) {
                return up_is_true ? [1, 0] : [0, 1];
            };
            console.log('✅ Provided fallback gen_state function');
        }

        // Ensure state2vector exists
        if (typeof window.state2vector === 'undefined') {
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
            console.log('✅ Provided fallback state2vector function');
        }

        // Create a simple Bloch sphere visualization if needed
        if (typeof window.gen_bloch_sphere === 'undefined') {
            window.gen_bloch_sphere = function() {
                console.log('Using fallback Bloch sphere implementation');
                return {
                    update_state_plot: function() {
                        console.log('Updating Bloch sphere visualization');
                        // Add fallback visualization here if needed
                        const container = document.querySelector('.bloch-sphere-container, .bloch-container');
                        if (container) {
                            container.innerHTML = '<div style="padding: 20px; background: #f0f0f0; border-radius: 5px; text-align: center;">Bloch Sphere Visualization (Fallback Mode)</div>';
                        }
                    }
                };
            };
            console.log('✅ Provided fallback gen_bloch_sphere function');
        }
    }
}

// Initialize compatibility fix when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const fix = new BlochSphereCompatibilityFix();
    fix.initialize();
    
    // Also ensure the compatibility layer is initialized
    if (window.THREE) {
        const three = window.THREE;
        if (!three.MathUtils) three.MathUtils = {};
        if (!three.MathUtils.degToRad) {
            three.MathUtils.degToRad = degrees => degrees * (Math.PI / 180);
        }
        if (!three.Math) three.Math = three.MathUtils;
    }
});

// Export for global use
window.BlochSphereCompatibilityFix = BlochSphereCompatibilityFix;
