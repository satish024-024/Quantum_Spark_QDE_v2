/**
 * 3D Quantum Circuit Loader Fix
 * This prevents redeclaration errors by checking if the script is already loaded
 */

(function () {
    'use strict';

    // Check if already loaded - if so, exit immediately
    if (window.__3d_circuit_fully_loaded__) {
        console.log('✅ 3D Circuit script already loaded, skipping');
        return;
    }

    // Mark as loaded
    window.__3d_circuit_fully_loaded__ = true;

    console.log('🎨 Loading 3D Circuit script...');

    // Now load the actual script
    const script = document.createElement('script');
    script.src = '/static/3d_quantum_circuit.js?v=' + Date.now(); // Cache bust
    script.async = false; // Load synchronously

    script.onload = function () {
        console.log('✅ 3D Circuit script loaded successfully');
    };

    script.onerror = function () {
        console.error('❌ Failed to load 3D Circuit script');
        window.__3d_circuit_fully_loaded__ = false; // Allow retry
    };

    // Only append if not already in document
    const existingScript = document.querySelector('script[src*="3d_quantum_circuit.js"]');
    if (!existingScript) {
        document.head.appendChild(script);
    } else {
        console.log('✅ 3D Circuit script tag already exists');
    }
})();
