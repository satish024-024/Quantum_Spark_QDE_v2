// Diagnostic script for 3D Quantum Circuit Visualizer
// Run this to identify potential issues

class DiagnosticTool {
    constructor() {
        this.results = {};
    }

    async runDiagnostics() {
        console.log('🔍 Running Quantum Visualizer Diagnostics...\n');

        await this.checkBrowserCompatibility();
        await this.checkWebGLSupport();
        await this.checkThreeJS();
        await this.checkCanvasElement();
        await this.checkScriptLoading();
        await this.checkNetworkConnectivity();

        this.displayResults();
    }

    async checkBrowserCompatibility() {
        console.log('📋 Checking browser compatibility...');

        this.results.browser = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine
        };

        // Check for modern browser features
        this.results.browser.webGL = !!window.WebGLRenderingContext;
        this.results.browser.webWorkers = !!window.Worker;
        this.results.browser.localStorage = !!window.localStorage;
        this.results.browser.fetch = !!window.fetch;

        console.log('✅ Browser info collected');
    }

    async checkWebGLSupport() {
        console.log('🎮 Checking WebGL support...');

        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

            if (!gl) {
                this.results.webGL = { supported: false, error: 'WebGL not supported' };
                return;
            }

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
            const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';

            this.results.webGL = {
                supported: true,
                renderer: renderer,
                vendor: vendor,
                version: gl.getParameter(gl.VERSION),
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
            };

            console.log('✅ WebGL support detected');
        } catch (error) {
            this.results.webGL = { supported: false, error: error.message };
            console.log('❌ WebGL check failed:', error.message);
        }
    }

    async checkThreeJS() {
        console.log('🎲 Checking Three.js...');

        this.results.threeJS = {
            loaded: typeof THREE !== 'undefined',
            version: typeof THREE !== 'undefined' ? THREE.REVISION : 'Not loaded'
        };

        if (this.results.threeJS.loaded) {
            console.log('✅ Three.js loaded (version:', THREE.REVISION + ')');
        } else {
            console.log('❌ Three.js not loaded');
        }
    }

    async checkCanvasElement() {
        console.log('🖼️ Checking canvas element...');

        const canvas = document.getElementById('threejs-canvas');

        this.results.canvas = {
            exists: !!canvas,
            dimensions: canvas ? {
                clientWidth: canvas.clientWidth,
                clientHeight: canvas.clientHeight,
                offsetWidth: canvas.offsetWidth,
                offsetHeight: canvas.offsetHeight
            } : null,
            visible: canvas ? canvas.offsetWidth > 0 && canvas.offsetHeight > 0 : false
        };

        if (canvas) {
            console.log('✅ Canvas found, dimensions:', canvas.clientWidth, 'x', canvas.clientHeight);
        } else {
            console.log('❌ Canvas element not found');
        }
    }

    async checkScriptLoading() {
        console.log('📜 Checking script loading...');

        const scripts = [
            'THREE',
            'QuantumVisualizer',
            'QuantumCircuit',
            'QuantumSimulator',
            'Gate3D',
            'IBMIntegration',
            'QuantumVisualizerApp'
        ];

        this.results.scripts = {};

        scripts.forEach(script => {
            const loaded = typeof window[script] !== 'undefined';
            this.results.scripts[script] = loaded;

            if (loaded) {
                console.log('✅', script, 'loaded');
            } else {
                console.log('❌', script, 'not loaded');
            }
        });
    }

    async checkNetworkConnectivity() {
        console.log('🌐 Checking network connectivity...');

        try {
            const response = await fetch(window.location.origin + '/favicon.ico', { method: 'HEAD' });
            this.results.network = {
                connected: true,
                status: response.status,
                serverReachable: response.ok
            };
            console.log('✅ Server reachable');
        } catch (error) {
            this.results.network = {
                connected: false,
                error: error.message
            };
            console.log('❌ Network error:', error.message);
        }
    }

    displayResults() {
        console.log('\n📊 DIAGNOSTIC RESULTS:');
        console.log('====================');

        console.log('\nBrowser:', this.results.browser);
        console.log('\nWebGL:', this.results.webGL);
        console.log('\nThree.js:', this.results.threeJS);
        console.log('\nCanvas:', this.results.canvas);
        console.log('\nScripts:', this.results.scripts);
        console.log('\nNetwork:', this.results.network);

        console.log('\n🎯 RECOMMENDATIONS:');

        if (!this.results.webGL.supported) {
            console.log('❌ Enable WebGL in your browser or update your graphics drivers');
        }

        if (!this.results.threeJS.loaded) {
            console.log('❌ Three.js failed to load - check your internet connection');
        }

        if (!this.results.canvas.exists) {
            console.log('❌ Canvas element missing from HTML');
        }

        if (!this.results.canvas.visible) {
            console.log('❌ Canvas element has zero dimensions - check CSS');
        }

        const unloadedScripts = Object.entries(this.results.scripts)
            .filter(([name, loaded]) => !loaded)
            .map(([name]) => name);

        if (unloadedScripts.length > 0) {
            console.log('❌ Missing scripts:', unloadedScripts.join(', '));
        }

        if (!this.results.network.connected) {
            console.log('❌ Network connectivity issues');
        }

        console.log('\n🔧 For help, check the browser console for detailed error messages.');
    }
}

// Auto-run diagnostics when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const diagnostic = new DiagnosticTool();
            diagnostic.runDiagnostics();
        }, 1000); // Wait for all scripts to load
    });
} else {
    setTimeout(() => {
        const diagnostic = new DiagnosticTool();
        diagnostic.runDiagnostics();
    }, 1000);
}

// Export for manual testing
window.runDiagnostics = () => {
    const diagnostic = new DiagnosticTool();
    diagnostic.runDiagnostics();
};
