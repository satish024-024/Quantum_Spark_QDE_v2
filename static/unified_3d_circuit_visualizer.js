// @ts-nocheck
// @ts-ignore
/**
 * @fileoverview Unified 3D Quantum Circuit Visualizer
 * @description Consolidated implementation combining all essential functionality
 * from the standalone 3D circuit visualizer
 * @author Quantum Dashboard Team
 * @version 1.0.0
 */

// Global variables for unified visualizer
let unifiedQuantumApp = null;
let unifiedCircuitContainer = null;

// Memory management for 3D objects
class MemoryManager {
    constructor() {
        this.objects = new Set();
        this.geometries = new Set();
        this.materials = new Set();
        this.textures = new Set();
    }

    addObject(object) {
        this.objects.add(object);
    }

    addGeometry(geometry) {
        this.geometries.add(geometry);
    }

    addMaterial(material) {
        this.materials.add(material);
    }

    addTexture(texture) {
        this.textures.add(texture);
    }

    cleanup() {
        // Dispose geometries
        this.geometries.forEach(geometry => {
            if (geometry.dispose) geometry.dispose();
        });

        // Dispose materials
        this.materials.forEach(material => {
            if (material.dispose) material.dispose();
        });

        // Dispose textures
        this.textures.forEach(texture => {
            if (texture.dispose) texture.dispose();
        });

        // Remove objects from scene
        this.objects.forEach(obj => {
            if (obj.parent) obj.parent.remove(obj);
        });

        // Clear all sets
        this.objects.clear();
        this.geometries.clear();
        this.materials.clear();
        this.textures.clear();
    }
}

// Global memory manager instance
const memoryManager = new MemoryManager();

// Optimized 3D renderer with performance improvements
class Optimized3DRenderer {
    constructor() {
        this.renderQueue = [];
        this.isRendering = false;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
    }

    scheduleRender() {
        if (!this.isRendering) {
            this.isRendering = true;
            requestAnimationFrame(() => this.render());
        }
    }

    render() {
        const currentTime = performance.now();

        // Throttle rendering to target FPS
        if (currentTime - this.lastFrameTime >= this.frameInterval) {
            this.processRenderQueue();
            this.lastFrameTime = currentTime;
            this.frameCount++;
        }

        this.isRendering = false;
    }

    processRenderQueue() {
        // Process queued render operations
        while (this.renderQueue.length > 0) {
            const operation = this.renderQueue.shift();
            if (operation && typeof operation === 'function') {
                operation();
            }
        }
    }

    addToRenderQueue(operation) {
        this.renderQueue.push(operation);
        this.scheduleRender();
    }
}

// Global optimized renderer instance
const optimizedRenderer = new Optimized3DRenderer();

// Utility function to ensure Three.js is loaded
function ensureThreeJSLoaded(timeout = 15000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        // First, check if THREE is already available
        if (typeof window !== 'undefined' && window.THREE) {
            console.log('Three.js already loaded');
            resolve(window.THREE);
            return;
        }

        // If not available, check if script is already in DOM
        let script = document.querySelector('script[src="/static/three.min.js"]');
        if (!script) {
            // Create and load the script
            console.log('Loading Three.js script from /static/three.min.js...');
            script = document.createElement('script');
            script.src = '/static/three.min.js';
            script.async = true;

            // Add debugging for script loading
            console.log('Script element created, src:', script.src);

            script.onload = function () {
                console.log('Three.js script loaded successfully');
                if (typeof window !== 'undefined' && window.THREE) {
                    resolve(window.THREE);
                } else {
                    // Poll a bit more in case THREE isn't immediately available
                    let attempts = 0;
                    const checkAfterLoad = () => {
                        if (typeof window !== 'undefined' && window.THREE) {
                            resolve(window.THREE);
                        } else if (attempts < 10) {
                            attempts++;
                            setTimeout(checkAfterLoad, 100);
                        } else {
                            reject(new Error('Three.js script loaded but THREE object not found'));
                        }
                    }
                    checkAfterLoad();
                }
            }

            script.onerror = function () {
                console.error('Failed to load Three.js from /static/three.min.js, trying CDN...');
                // Try loading from CDN as fallback
                const cdnScript = document.createElement('script');
                cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r150/three.min.js';
                cdnScript.async = true;

                cdnScript.onload = function () {
                    console.log('Three.js loaded from CDN');
                    if (typeof window !== 'undefined' && window.THREE) {
                        resolve(window.THREE);
                    } else {
                        reject(new Error('Three.js loaded from CDN but THREE object not found'));
                    }
                }

                cdnScript.onerror = function () {
                    reject(new Error('Failed to load Three.js from both local file and CDN'));
                }

                document.head.appendChild(cdnScript);
            }

            console.log('Adding script to document head...');
            document.head.appendChild(script);
        }

        // Poll for THREE to become available
        const checkThreeJS = () => {
            if (typeof window !== 'undefined' && window.THREE) {
                console.log('Three.js now available');
                resolve(window.THREE);
                return;
            }

            if (Date.now() - startTime > timeout) {
                reject(new Error(`Three.js not loaded within ${timeout}ms. Please check that three.min.js is accessible.`));
                return;
            }

            setTimeout(checkThreeJS, 100);
        }

        checkThreeJS();
    });
}

// ==================== QUANTUM SIMULATOR ====================

class QuantumSimulator {
    constructor() {
        this.qubits = 3;
        this.stateVector = this.initializeStateVector();
        this.gates = new Map();
        this.measurementResults = [];
        this.circuit = [];
        this.isRealTime = true;
        this.simulationSpeed = 1.0;

        // Real-time simulation callbacks
        this.onStateChange = null;
        this.onMeasurementUpdate = null;
        this.initializeGates();
    }

    initializeStateVector() {
        // Initialize |000⟩ state
        const state = new Array(Math.pow(2, this.qubits)).fill(0);
        state[0] = 1; // |000⟩ = [1, 0, 0, 0, 0, 0, 0, 0]
        return state;
    }

    initializeGates() {
        // Single qubit gates
        this.gates.set('X', this.createXGate());
        this.gates.set('Y', this.createYGate());
        this.gates.set('Z', this.createZGate());
        this.gates.set('H', this.createHGate());
        this.gates.set('S', this.createSGate());
        this.gates.set('T', this.createTGate());
        this.gates.set('I', this.createIGate());
        this.gates.set('SDG', this.createSDGGate());
        this.gates.set('TDG', this.createTDGGate());
        this.gates.set('SX', this.createSXGate());
        this.gates.set('SY', this.createSYGate());
        this.gates.set('U1', this.createU1Gate());
        this.gates.set('U2', this.createU2Gate());
        this.gates.set('U3', this.createU3Gate());
        this.gates.set('RX', this.createRXGate());
        this.gates.set('RY', this.createRYGate());
        this.gates.set('RZ', this.createRZGate());

        // Two qubit gates
        this.gates.set('CNOT', this.createCNOTGate());
        this.gates.set('CZ', this.createCZGate());
        this.gates.set('SWAP', this.createSWAPGate());
        this.gates.set('CRX', this.createCRXGate());
        this.gates.set('CRY', this.createCRYGate());
        this.gates.set('CRZ', this.createCRZGate());
        this.gates.set('CU1', this.createCRZGate()); // U1 is RZ
        this.gates.set('CU3', this.createCRXGate()); // placeholder
        this.gates.set('CCX', this.createCCXGate());
        this.gates.set('CSWAP', this.createCSWAPGate());
    }

    // Single qubit gate matrices
    createXGate() {
        return [
            [0, 1],
            [1, 0]
        ];
    }

    createYGate() {
        return [
            [0, -1],
            [1, 0]
        ];
    }

    createZGate() {
        return [
            [1, 0],
            [0, -1]
        ];
    }

    createHGate() {
        const sqrt2 = 1 / Math.sqrt(2);
        return [
            [sqrt2, sqrt2],
            [sqrt2, -sqrt2]
        ];
    }

    createSGate() {
        return [
            [1, 0],
            [0, 0] // Simplified: S gate phase (normally i, but using real approximation)
        ];
    }

    createTGate() {
        const phase = Math.PI / 4;
        return [
            [1, 0],
            [0, Math.cos(phase)] // Simplified: T gate phase (normally complex, using real part)
        ];
    }

    createIGate() {
        return [
            [1, 0],
            [0, 1]
        ];
    }

    createSDGGate() {
        return [
            [1, 0],
            [0, 0] // Simplified: S-dagger gate phase (normally -i, using real approximation)
        ];
    }

    createTDGGate() {
        const phase = -Math.PI / 4;
        return [
            [1, 0],
            [0, Math.cos(phase)] // Simplified: T-dagger gate phase (normally complex, using real part)
        ];
    }

    createSXGate() {
        const half = 0.5;
        return [
            [half, half], // Simplified: SX gate (normally complex, using real approximation)
            [half, half]
        ];
    }

    createSYGate() {
        const half = 0.5;
        return [
            [half, -half], // Simplified: SY gate (normally complex, using real approximation)
            [0, half]
        ];
    }

    createU1Gate(lambda = 0) {
        return [
            [1, 0],
            [0, Math.cos(lambda)] // Simplified: U1 gate phase (normally complex, using real part)
        ];
    }

    createU2Gate(phi = 0, lambda = 0) {
        const sqrt2 = 1 / Math.sqrt(2);
        const e1 = Math.cos(phi); // Simplified: using real part
        const e2 = Math.cos(lambda); // Simplified: using real part
        return [
            [sqrt2, -sqrt2 * e2],
            [sqrt2 * e1, sqrt2 * e1 * e2]
        ];
    }

    createU3Gate(theta = 0, phi = 0, lambda = 0) {
        const cos = Math.cos(theta / 2);
        const sin = Math.sin(theta / 2);
        const e1 = Math.cos(phi); // Simplified: using real part
        const e2 = Math.cos(lambda); // Simplified: using real part
        return [
            [cos, -sin * e2],
            [sin * e1, cos * e1 * e2]
        ];
    }

    createRXGate(theta = 0) {
        const cos = Math.cos(theta / 2);
        const sin = Math.sin(theta / 2);
        return [
            [cos, -sin], // Simplified: RX gate (normally complex, using real approximation)
            [-sin, cos]
        ];
    }

    createRYGate(theta = 0) {
        const cos = Math.cos(theta / 2);
        const sin = Math.sin(theta / 2);
        return [
            [cos, -sin],
            [sin, cos]
        ];
    }

    createRZGate(theta = 0) {
        const cos = Math.cos(theta / 2);
        const sin = Math.sin(theta / 2);
        const e = cos; // Simplified: RZ gate (normally complex, using real approximation)
        const ne = -sin; // Simplified: using real part
        return [
            [e, 0],
            [0, ne]
        ];
    }

    // Two qubit gates
    createCNOTGate() {
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1],
            [0, 0, 1, 0]
        ];
    }

    createCZGate() {
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, -1]
        ];
    }

    createSWAPGate() {
        return [
            [1, 0, 0, 0],
            [0, 0, 1, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1]
        ];
    }

    createCRXGate(theta = Math.PI) {
        const cos = Math.cos(theta / 2);
        const sin = Math.sin(theta / 2);
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, cos, -sin], // Simplified: CRX gate (normally complex, using real approximation)
            [0, 0, -sin, cos]
        ];
    }

    createCRYGate(theta = Math.PI) {
        const cos = Math.cos(theta / 2);
        const sin = Math.sin(theta / 2);
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, cos, -sin],
            [0, 0, sin, cos]
        ];
    }

    createCRZGate(theta = Math.PI) {
        const cos = Math.cos(theta / 2);
        const sin = Math.sin(theta / 2);
        const e = cos; // Simplified: CRZ gate (normally complex, using real approximation)
        const ne = -sin; // Simplified: using real part
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, e, 0],
            [0, 0, 0, ne]
        ];
    }

    createCCXGate() {
        return [
            [1, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 1],
            [0, 0, 0, 0, 0, 0, 1, 0]
        ];
    }

    createCSWAPGate() {
        return [
            [1, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 1]
        ];
    }

    applyGate(gateName, targetQubit, controlQubit = null) {
        const gate = this.gates.get(gateName);
        if (!gate) {
            console.error(`Gate ${gateName} not found`);
            return;
        }

        let newState;
        if (controlQubit !== null) {
            // Two-qubit gate
            newState = this.applyTwoQubitGate(gate, controlQubit, targetQubit);
        } else {
            // Single-qubit gate
            newState = this.applySingleQubitGate(gate, targetQubit);
        }

        this.stateVector = newState;

        if (this.onStateChange) {
            this.onStateChange(this.stateVector);
        }
    }

    applySingleQubitGate(gate, qubit) {
        const newState = new Array(this.stateVector.length).fill(0);
        const n = Math.log2(this.stateVector.length);

        for (let i = 0; i < this.stateVector.length; i++) {
            const bitString = i.toString(2).padStart(n, '0');
            const bit = parseInt(bitString[n - 1 - qubit]);

            if (bit === 0) {
                const j = i;
                const k = i | (1 << (n - 1 - qubit));
                newState[j] += gate[0][0] * this.stateVector[j] + gate[0][1] * this.stateVector[k];
                newState[k] += gate[1][0] * this.stateVector[j] + gate[1][1] * this.stateVector[k];
            }
        }

        return newState;
    }

    applyTwoQubitGate(gate, control, target) {
        // Simplified two-qubit gate application
        const newState = [...this.stateVector];

        // For now, just return the current state
        // Full implementation would require tensor products
        console.log(`Applying ${gate} gate with control=${control}, target=${target}`);
        return newState;
    }

    measure(qubit) {
        // Proper quantum measurement based on state vector probabilities
        if (qubit >= this.qubits) return 0;

        // Calculate probability of measuring |1⟩ for this qubit
        let prob1 = 0;
        const numStates = Math.pow(2, this.qubits);

        for (let state = 0; state < numStates; state++) {
            // Check if this state has qubit in |1⟩ state
            if ((state >> qubit) & 1) {
                prob1 += Math.pow(Math.abs(this.stateVector[state]), 2);
            }
        }

        // Measure based on actual quantum probability
        const result = Math.random() < prob1 ? 1 : 0;
        this.measurementResults.push(result);

        if (this.onMeasurementUpdate) {
            this.onMeasurementUpdate(this.measurementResults);
        }

        return result;
    }

    reset() {
        this.stateVector = this.initializeStateVector();
        this.measurementResults = [];
        this.circuit = [];

        if (this.onStateChange) {
            this.onStateChange(this.stateVector);
        }
    }
}

// ==================== GATE MODELS ====================

class GateModels {
    // Singleton support
    static getInstance(scene) {
        if (!GateModels._instance) {
            GateModels._instance = new GateModels(scene);
        }
        return GateModels._instance;
    }

    constructor(scene) {
        // Enforce singleton pattern
        if (GateModels._instance) {
            return GateModels._instance;
        }
        GateModels._instance = this;
        this.scene = scene;
        this.gateMeshes = new Map();
        this.gateMaterials = new Map();
        this.initializeMaterials();
        this.createGateModels();
    }

    initializeMaterials() {
        // Base material for gates
        this.gateMaterials.set('base', new THREE.MeshPhongMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.8,
            shininess: 100
        }));

        // Control qubit material
        this.gateMaterials.set('control', new THREE.MeshPhongMaterial({
            color: 0xff6b6b,
            transparent: true,
            opacity: 0.9,
            shininess: 100
        }));

        // Target qubit material
        this.gateMaterials.set('target', new THREE.MeshPhongMaterial({
            color: 0x4ecdc4,
            transparent: true,
            opacity: 0.9,
            shininess: 100
        }));

        // Measurement material
        this.gateMaterials.set('measure', new THREE.MeshPhongMaterial({
            color: 0xffd93d,
            transparent: true,
            opacity: 0.9,
            shininess: 100
        }));

        // Text material
        this.gateMaterials.set('text', new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        }));
    }

    createGateModels() {
        // Single qubit gates
        this.createXGate();
        this.createYGate();
        this.createZGate();
        this.createHGate();
        this.createSGate();
        this.createTGate();
        this.createIGate();
        this.createSDGGate();
        this.createTDGGate();
        this.createSXGate();
        this.createSYGate();
        this.createU1Gate();
        this.createU2Gate();
        this.createU3Gate();
        this.createRXGate();
        this.createRYGate();
        this.createRZGate();
        this.createPGate();    // Phase gate
        this.createUGate();    // Universal gate (alias for U3)

        // Two qubit gates
        this.createCNOTGate();
        this.createCZGate();
        this.createCYGate();   // Controlled-Y
        this.createCHGate();   // Controlled-Hadamard
        this.createSWAPGate();
        this.createISWAPGate(); // iSWAP
        this.createCRXGate();
        this.createCRYGate();
        this.createCRZGate();
        this.createCU1Gate();
        this.createCU3Gate();

        // Three qubit gates
        this.createCCXGate();
        this.createCCZGate();   // Controlled-Controlled-Z
        this.createCSWAPGate();

        // Measurement & Control
        this.createMeasureGate();
        this.createBarrierGate();
        this.createResetGate();

        // Aliases for commonly used names
        this.gateMeshes.set('TOFFOLI', this.gateMeshes.get('CCX'));
        this.gateMeshes.set('FREDKIN', this.gateMeshes.get('CSWAP'));
    }

    createGateBase(name, color = 0x00d4ff) {
        const group = new THREE.Group();

        // Create flat gate box (2D-style, very thin)
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.02);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            shininess: 80
        });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);

        // Add edge outline for authentic circuit look
        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 2
        });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        group.add(edges);

        this.gateMeshes.set(name, group);
        return group;
    }

    createXGate() {
        const mesh = this.createGateBase('X', 0xff6b6b);
        this.addGateLabel(mesh, 'X');
        return mesh;
    }

    createYGate() {
        const mesh = this.createGateBase('Y', 0x4ecdc4);
        this.addGateLabel(mesh, 'Y');
        return mesh;
    }

    createZGate() {
        const mesh = this.createGateBase('Z', 0xa855f7);
        this.addGateLabel(mesh, 'Z');
        return mesh;
    }

    createHGate() {
        const mesh = this.createGateBase('H', 0x00d4ff);
        this.addGateLabel(mesh, 'H');
        return mesh;
    }

    createSGate() {
        const mesh = this.createGateBase('S', 0xffd93d);
        this.addGateLabel(mesh, 'S');
        return mesh;
    }

    createTGate() {
        const mesh = this.createGateBase('T', 0xffd93d);
        this.addGateLabel(mesh, 'T');
        return mesh;
    }

    createIGate() {
        const mesh = this.createGateBase('I', 0x64748b);
        this.addGateLabel(mesh, 'I');
        return mesh;
    }

    createSDGGate() {
        const mesh = this.createGateBase('SDG', 0xffd93d);
        this.addGateLabel(mesh, 'S†');
        return mesh;
    }

    createTDGGate() {
        const mesh = this.createGateBase('TDG', 0xffd93d);
        this.addGateLabel(mesh, 'T†');
        return mesh;
    }

    createSXGate() {
        const mesh = this.createGateBase('SX', 0xff6b6b);
        this.addGateLabel(mesh, '√X');
        return mesh;
    }

    createSYGate() {
        const mesh = this.createGateBase('SY', 0x4ecdc4);
        this.addGateLabel(mesh, '√Y');
        return mesh;
    }

    createU1Gate() {
        const mesh = this.createGateBase('U1', 0xa855f7);
        this.addGateLabel(mesh, 'U1');
        return mesh;
    }

    createU2Gate() {
        const mesh = this.createGateBase('U2', 0xa855f7);
        this.addGateLabel(mesh, 'U2');
        return mesh;
    }

    createU3Gate() {
        const mesh = this.createGateBase('U3', 0xa855f7);
        this.addGateLabel(mesh, 'U3');
        return mesh;
    }

    createRXGate() {
        const mesh = this.createGateBase('RX', 0xff6b6b);
        this.addGateLabel(mesh, 'RX');
        return mesh;
    }

    createRYGate() {
        const mesh = this.createGateBase('RY', 0x4ecdc4);
        this.addGateLabel(mesh, 'RY');
        return mesh;
    }

    createRZGate() {
        const mesh = this.createGateBase('RZ', 0xa855f7);
        this.addGateLabel(mesh, 'RZ');
        return mesh;
    }

    createPGate() {
        const mesh = this.createGateBase('P', 0xa855f7);
        this.addGateLabel(mesh, 'P');
        return mesh;
    }

    createUGate() {
        const mesh = this.createGateBase('U', 0xa855f7);
        this.addGateLabel(mesh, 'U');
        return mesh;
    }

    createCYGate() {
        const geometry = new THREE.Group();
        const controlGeometry = new THREE.SphereGeometry(0.1);
        const controlMaterial = this.gateMaterials.get('control');
        const controlMesh = new THREE.Mesh(controlGeometry, controlMaterial);
        controlMesh.position.y = 0.3;
        geometry.add(controlMesh);
        const targetGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.1);
        const targetMaterial = new THREE.MeshPhongMaterial({ color: 0x4ecdc4, transparent: true, opacity: 0.8 });
        const targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
        targetMesh.position.y = -0.3;
        geometry.add(targetMesh);
        const lineGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
        geometry.add(lineMesh);
        this.gateMeshes.set('CY', geometry);
        return geometry;
    }

    createCHGate() {
        const geometry = new THREE.Group();
        const controlGeometry = new THREE.SphereGeometry(0.1);
        const controlMaterial = this.gateMaterials.get('control');
        const controlMesh = new THREE.Mesh(controlGeometry, controlMaterial);
        controlMesh.position.y = 0.3;
        geometry.add(controlMesh);
        const targetGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.1);
        const targetMaterial = new THREE.MeshPhongMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.8 });
        const targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
        targetMesh.position.y = -0.3;
        geometry.add(targetMesh);
        const lineGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
        geometry.add(lineMesh);
        this.gateMeshes.set('CH', geometry);
        return geometry;
    }

    createISWAPGate() {
        const geometry = new THREE.Group();
        const marker1Geometry = new THREE.SphereGeometry(0.15);
        const marker1Material = new THREE.MeshPhongMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.8 });
        const marker1Mesh = new THREE.Mesh(marker1Geometry, marker1Material);
        marker1Mesh.position.y = 0.3;
        geometry.add(marker1Mesh);
        const marker2Mesh = marker1Mesh.clone();
        marker2Mesh.position.y = -0.3;
        geometry.add(marker2Mesh);
        const line1Geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
        const line1Material = new THREE.MeshBasicMaterial({ color: 0xffd93d });
        const line1Mesh = new THREE.Mesh(line1Geometry, line1Material);
        line1Mesh.rotation.z = Math.PI / 4;
        geometry.add(line1Mesh);
        const line2Mesh = new THREE.Mesh(line1Geometry, line1Material);
        line2Mesh.rotation.z = -Math.PI / 4;
        geometry.add(line2Mesh);
        this.gateMeshes.set('ISWAP', geometry);
        return geometry;
    }

    createCCZGate() {
        const geometry = new THREE.Group();
        const control1Geometry = new THREE.SphereGeometry(0.1);
        const controlMaterial = this.gateMaterials.get('control');
        const control1Mesh = new THREE.Mesh(control1Geometry, controlMaterial);
        control1Mesh.position.y = 0.4;
        geometry.add(control1Mesh);
        const control2Mesh = control1Mesh.clone();
        control2Mesh.position.y = 0;
        geometry.add(control2Mesh);
        const targetGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.1);
        const targetMaterial = new THREE.MeshPhongMaterial({ color: 0xa855f7, transparent: true, opacity: 0.8 });
        const targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
        targetMesh.position.y = -0.4;
        geometry.add(targetMesh);
        const lineGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
        geometry.add(lineMesh);
        this.gateMeshes.set('CCZ', geometry);
        return geometry;
    }

    createResetGate() {
        const geometry = new THREE.Group();
        const boxGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.1);
        const boxMaterial = new THREE.MeshPhongMaterial({ color: 0xef4444, transparent: true, opacity: 0.8 });
        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
        geometry.add(boxMesh);
        const arrowGeometry = new THREE.ConeGeometry(0.15, 0.3, 6);
        const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrowMesh.rotation.z = Math.PI;
        arrowMesh.position.y = 0.1;
        geometry.add(arrowMesh);
        this.gateMeshes.set('RESET', geometry);
        return geometry;
    }

    createCNOTGate() {
        const geometry = new THREE.Group();

        // Control qubit (top) - filled black sphere (●)
        const controlGeometry = new THREE.SphereGeometry(0.12);
        const controlMaterial = new THREE.MeshPhongMaterial({
            color: 0x000000,
            shininess: 100
        });
        const controlMesh = new THREE.Mesh(controlGeometry, controlMaterial);
        controlMesh.position.y = 0.4;
        geometry.add(controlMesh);

        // Target qubit (bottom) - Circle with plus (⊕) symbol
        // Outer ring (torus for the circle)
        const ringGeometry = new THREE.TorusGeometry(0.2, 0.03, 16, 32);
        const ringMaterial = new THREE.MeshPhongMaterial({
            color: 0x00d4ff,
            shininess: 100
        });
        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.position.y = -0.4;
        ringMesh.rotation.x = Math.PI / 2;
        geometry.add(ringMesh);

        // Horizontal line of plus
        const hLineGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.35);
        const plusMaterial = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
        const hLineMesh = new THREE.Mesh(hLineGeometry, plusMaterial);
        hLineMesh.position.y = -0.4;
        hLineMesh.rotation.z = Math.PI / 2;
        geometry.add(hLineMesh);

        // Vertical line of plus
        const vLineGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.35);
        const vLineMesh = new THREE.Mesh(vLineGeometry, plusMaterial);
        vLineMesh.position.y = -0.4;
        geometry.add(vLineMesh);

        // Connection line between control and target
        const lineGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.6);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
        geometry.add(lineMesh);

        this.gateMeshes.set('CNOT', geometry);
        return geometry;
    }

    createCZGate() {
        const geometry = new THREE.Group();

        // Control qubit (top)
        const controlGeometry = new THREE.SphereGeometry(0.1);
        const controlMaterial = this.gateMaterials.get('control');
        const controlMesh = new THREE.Mesh(controlGeometry, controlMaterial);
        controlMesh.position.y = 0.3;
        geometry.add(controlMesh);

        // Target qubit (bottom) - Z gate
        const targetGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
        const targetMaterial = new THREE.MeshPhongMaterial({
            color: 0xa855f7,
            transparent: true,
            opacity: 0.8,
            shininess: 100
        });
        const targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
        targetMesh.position.y = -0.3;
        geometry.add(targetMesh);

        // Connection line
        const lineGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
        geometry.add(lineMesh);

        this.gateMeshes.set('CZ', geometry);
        return geometry;
    }

    createSWAPGate() {
        const geometry = new THREE.Group();

        // Two crossing lines
        const line1Geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6);
        const line1Material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const line1Mesh = new THREE.Mesh(line1Geometry, line1Material);
        line1Mesh.rotation.z = Math.PI / 4;
        geometry.add(line1Mesh);

        const line2Geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6);
        const line2Material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const line2Mesh = new THREE.Mesh(line2Geometry, line2Material);
        line2Mesh.rotation.z = -Math.PI / 4;
        geometry.add(line2Mesh);

        this.gateMeshes.set('SWAP', geometry);
        return geometry;
    }

    createCRXGate() {
        const geometry = this.createCNOTGate();
        this.gateMeshes.set('CRX', geometry);
        return geometry;
    }

    createCRYGate() {
        const geometry = this.createCNOTGate();
        this.gateMeshes.set('CRY', geometry);
        return geometry;
    }

    createCRZGate() {
        const geometry = this.createCZGate();
        this.gateMeshes.set('CRZ', geometry);
        return geometry;
    }

    createCU1Gate() {
        const geometry = this.createCZGate();
        this.gateMeshes.set('CU1', geometry);
        return geometry;
    }

    createCU3Gate() {
        const geometry = this.createCZGate();
        this.gateMeshes.set('CU3', geometry);
        return geometry;
    }

    createCCXGate() {
        const geometry = new THREE.Group();

        // Two control qubits (top)
        const controlGeometry = new THREE.SphereGeometry(0.08);
        const controlMaterial = this.gateMaterials.get('control');

        const control1Mesh = new THREE.Mesh(controlGeometry, controlMaterial);
        control1Mesh.position.set(-0.2, 0.4, 0);
        geometry.add(control1Mesh);

        const control2Mesh = new THREE.Mesh(controlGeometry, controlMaterial);
        control2Mesh.position.set(0.2, 0.4, 0);
        geometry.add(control2Mesh);

        // Target qubit (bottom) - X gate
        const targetGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
        const targetMaterial = this.gateMaterials.get('target');
        const targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
        targetMesh.position.y = -0.4;
        geometry.add(targetMesh);

        // Connection lines
        const lineGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const line1Mesh = new THREE.Mesh(lineGeometry, lineMaterial);
        line1Mesh.position.x = -0.2;
        geometry.add(line1Mesh);

        const line2Mesh = new THREE.Mesh(lineGeometry, lineMaterial);
        line2Mesh.position.x = 0.2;
        geometry.add(line2Mesh);

        const line3Mesh = new THREE.Mesh(lineGeometry, lineMaterial);
        geometry.add(line3Mesh);

        this.gateMeshes.set('CCX', geometry);
        return geometry;
    }

    createCSWAPGate() {
        const geometry = new THREE.Group();

        // Control qubit
        const controlGeometry = new THREE.SphereGeometry(0.1);
        const controlMaterial = this.gateMaterials.get('control');
        const controlMesh = new THREE.Mesh(controlGeometry, controlMaterial);
        controlMesh.position.y = 0.4;
        geometry.add(controlMesh);

        // SWAP symbol (two crossing lines)
        const line1Geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4);
        const line1Material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const line1Mesh = new THREE.Mesh(line1Geometry, line1Material);
        line1Mesh.position.y = -0.2;
        line1Mesh.rotation.z = Math.PI / 4;
        geometry.add(line1Mesh);

        const line2Geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4);
        const line2Material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const line2Mesh = new THREE.Mesh(line2Geometry, line2Material);
        line2Mesh.position.y = -0.2;
        line2Mesh.rotation.z = -Math.PI / 4;
        geometry.add(line2Mesh);

        this.gateMeshes.set('CSWAP', geometry);
        return geometry;
    }

    createMeasureGate() {
        const geometry = new THREE.Group();

        // Measurement box - yellow/amber color
        const boxGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.12);
        const boxMaterial = new THREE.MeshPhongMaterial({
            color: 0xfbbf24,
            transparent: true,
            opacity: 0.9,
            shininess: 100
        });
        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
        geometry.add(boxMesh);

        // Add edge outline
        const edgeGeometry = new THREE.EdgesGeometry(boxGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        geometry.add(edges);

        // Meter arc (semicircle)
        const arcGeometry = new THREE.TorusGeometry(0.15, 0.02, 8, 16, Math.PI);
        const arcMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const arcMesh = new THREE.Mesh(arcGeometry, arcMaterial);
        arcMesh.position.y = -0.05;
        arcMesh.position.z = 0.07;
        arcMesh.rotation.z = Math.PI / 2;
        geometry.add(arcMesh);

        // Pointer/needle
        const needleGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.2);
        const needleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const needleMesh = new THREE.Mesh(needleGeometry, needleMaterial);
        needleMesh.position.y = 0.05;
        needleMesh.position.z = 0.07;
        needleMesh.rotation.z = -Math.PI / 4; // Tilted pointer
        geometry.add(needleMesh);

        this.gateMeshes.set('MEASURE', geometry);
        return geometry;
    }

    createBarrierGate() {
        const geometry = new THREE.Group();

        // Vertical line
        const lineGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.0);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
        geometry.add(lineMesh);

        this.gateMeshes.set('BARRIER', geometry);
        return geometry;
    }

    addGateLabel(mesh, label) {
        // Create text sprite for gate label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 128;

        // Clear canvas
        context.clearRect(0, 0, 128, 128);

        // Set text properties
        context.font = 'Bold 48px Arial';
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Add text with outline for better visibility
        context.strokeStyle = '#000000';
        context.lineWidth = 4;
        context.strokeText(label, 64, 64);
        context.fillText(label, 64, 64);

        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);

        // Position sprite on the gate
        sprite.position.set(0, 0, 0.1);
        sprite.scale.set(0.6, 0.6, 1);

        // Add sprite to the gate mesh
        mesh.add(sprite);

        // Store label for reference
        mesh.userData.label = label;
    }

    getGateMesh(gateName) {
        return this.gateMeshes.get(gateName);
    }

    cloneGateMesh(gateName) {
        const original = this.gateMeshes.get(gateName);
        if (!original) return null;

        return original.clone();
    }
}

// ==================== BLOCH SPHERE ====================

class BlochSphere {
    constructor(canvasOrId) {
        if (typeof canvasOrId === 'string') {
            this.canvas = document.getElementById(canvasOrId);
        } else {
            this.canvas = canvasOrId;
        }

        if (!this.canvas) {
            console.warn(`Bloch sphere canvas with ID "${canvasOrId}" not found`);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.radius = 80;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.state = { x: 0, y: 0, z: 1 }; // |0⟩ state
        this.animationFrame = null;
        this.isAnimating = false;

        this.setupCanvas();
        this.draw();
    }

    setupCanvas() {
        this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
        this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        this.centerX = this.canvas.offsetWidth / 2;
        this.centerY = this.canvas.offsetHeight / 2;
    }

    updateState(x, y, z) {
        this.state = { x, y, z };
        this.draw();
    }

    animateToState(targetState, duration = 1000) {
        if (this.isAnimating) {
            cancelAnimationFrame(this.animationFrame);
        }

        this.isAnimating = true;
        const startState = { ...this.state };
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Smooth easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            this.state = {
                x: startState.x + (targetState.x - startState.x) * easeProgress,
                y: startState.y + (targetState.y - startState.y) * easeProgress,
                z: startState.z + (targetState.z - startState.z) * easeProgress
            }

            this.draw();

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
            }
        }

        animate();
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);

        // Draw sphere outline
        this.drawSphere();

        // Draw axes
        this.drawAxes();

        // Draw state vector
        this.drawStateVector();

        // Draw labels
        this.drawLabels();
    }

    drawSphere() {
        // Draw sphere as a circle with gradient
        const gradient = this.ctx.createRadialGradient(
            this.centerX - this.radius * 0.3, this.centerY - this.radius * 0.3, 0,
            this.centerX, this.centerY, this.radius
        );
        gradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(50, 100, 200, 0.4)');

        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Draw sphere outline
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawAxes() {
        const axisLength = this.radius * 0.9;

        // Z axis (vertical)
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, this.centerY - axisLength);
        this.ctx.lineTo(this.centerX, this.centerY + axisLength);
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // X axis (horizontal)
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX - axisLength, this.centerY);
        this.ctx.lineTo(this.centerX + axisLength, this.centerY);
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        this.ctx.stroke();

        // Y axis (diagonal)
        const yAxisX = Math.cos(Math.PI / 4) * axisLength;
        const yAxisY = Math.sin(Math.PI / 4) * axisLength;
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX - yAxisX, this.centerY - yAxisY);
        this.ctx.lineTo(this.centerX + yAxisX, this.centerY + yAxisY);
        this.ctx.strokeStyle = 'rgba(0, 0, 255, 0.7)';
        this.ctx.stroke();
    }

    drawStateVector() {
        const x = this.state.x * this.radius;
        const y = -this.state.y * this.radius; // Flip Y for canvas coordinates
        const z = this.state.z;

        // Project 3D point to 2D using simple projection
        const projectedX = this.centerX + x * 0.8;
        const projectedY = this.centerY + y * 0.8;

        // Draw state vector
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, this.centerY);
        this.ctx.lineTo(projectedX, projectedY);
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 1)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Draw state point
        this.ctx.beginPath();
        this.ctx.arc(projectedX, projectedY, 6, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(255, 255, 0, 1)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawLabels() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';

        // |0⟩ label (top)
        this.ctx.fillText('|0⟩', this.centerX, this.centerY - this.radius - 10);

        // |1⟩ label (bottom)
        this.ctx.fillText('|1⟩', this.centerX, this.centerY + this.radius + 20);

        // |+⟩ label (right)
        this.ctx.fillText('|+⟩', this.centerX + this.radius + 20, this.centerY + 5);

        // |-⟩ label (left)
        this.ctx.fillText('|-⟩', this.centerX - this.radius - 20, this.centerY + 5);
    }
}

// ==================== CIRCUIT BUILDER ====================

class CircuitBuilder {
    constructor(scene, camera, quantumSimulator, parentApp = null) {
        this.scene = scene;
        this.camera = camera;
        this.quantumSimulator = quantumSimulator;
        this.parentApp = parentApp; // Reference to parent app for UI updates
        this.gateModels = GateModels.getInstance(this.scene);
        this.circuit = [];
        this.SPACING_Y = 0.6;
        this.SPACING_X = 0.8;
        this.OFFSET_X = -1;

        this.qubits = 3;
        this.minQubits = 1;
        this.maxQubits = 10;
        this.qubitMeshes = [];
        this.gateInstances = [];
        this.isDragging = false;
        this.dragOffset = new THREE.Vector3();
        this.selectedGate = null;
        this.circuitDepth = 0;

        // Undo/Redo system
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;

        // Group for grid helper lines
        this.gridGroup = new THREE.Group();
        this.scene.add(this.gridGroup);

        // Add missing methods before using them
        this.getMaxCircuitDepth = this.getMaxCircuitDepth.bind(this);

        this.initializeQubits();
        this.updateGrid();
        this.setupEventListeners();

        // Initialize circuit database and Hugging Face integration
        this.initializeCircuitDatabase();

        // Add some default gates for demonstration
        this.addDefaultCircuit();

        // Add IBM execution button
        this.addIBMExecutionButton();
        this.addDirectIBMButton(); // Add the new direct execution button

        // Add circuit selection interface
        this.addCircuitSelectionInterface();

        // Initialize circuit suggestions UI
        this.initializeCircuitSuggestionsUI();

        // Add IBM-style mini Bloch spheres panel
        this.addMiniBlochSpheresPanel();

        // Add live code panel
        this.addLiveCodePanel();
    }

    initializeQubits() {
        console.log('Creating qubit rails for', this.qubits, 'qubits');

        // Create qubit rails
        for (let i = 0; i < this.qubits; i++) {
            // Make qubit lines more visible (length = 14 to cover large circuits)
            const geometry = new THREE.CylinderGeometry(0.05, 0.05, 14);
            const material = new THREE.MeshPhongMaterial({
                color: 0x00d4ff,  // Bright cyan color
                transparent: false,
                opacity: 1.0,
                emissive: 0x001122  // Slight glow
            });
            const rail = new THREE.Mesh(geometry, material);
            rail.rotation.z = Math.PI / 2;
            rail.position.y = ((this.qubits - 1) / 2 - i) * this.SPACING_Y;
            rail.position.x = 0;  // Center the rails
            rail.position.z = 0;

            console.log(` Created qubit rail ${i} at position:`, rail.position);

            this.scene.add(rail);
            this.qubitMeshes.push(rail);

            // Add qubit labels at the start of the rails
            this.addQubitLabel(i, rail.position.y);
        }

        console.log(' Created', this.qubitMeshes.length, 'qubit rails');
    }

    addQubitLabel(qubitIndex, yPosition, xPosition = -4.5) {
        // Create text label for qubit
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;

        context.font = 'Bold 24px Arial';
        context.fillStyle = '#00d4ff';
        context.textAlign = 'center';
        context.fillText(`|q${qubitIndex}⟩`, 64, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);

        sprite.position.set(xPosition, yPosition, 0.1);
        sprite.scale.set(1, 0.5, 1);

        this.scene.add(sprite);
        this.qubitMeshes.push(sprite);
    }

    addDefaultCircuit() {
        // Add default circuit after a short delay to ensure everything is initialized
        setTimeout(() => {
            console.log('  Adding default circuit for demonstration');

            try {
                // Check if gate models are available
                if (!this.gateModels) {
                    console.error(' Gate models not initialized');
                    return;
                }

                if (!this.gateModels.gateMeshes || this.gateModels.gateMeshes.size === 0) {
                    console.warn(' Gate models not ready, retrying in 1 second...');
                    setTimeout(() => this.addDefaultCircuit(), 1000);
                    return;
                }

                console.log('  Available gate types:', Array.from(this.gateModels.gateMeshes.keys()));
                console.log('  Scene children before adding gates:', this.scene.children.length);

                // Add a proper Bell state circuit: H + CNOT
                // This creates the entangled Bell state: |Bell⟩ = 1/√2(|00⟩ + |11⟩)
                console.log('Creating proper Bell state circuit...');

                // Step 1: H gate on qubit 0 (first qubit, y=0)
                const hPosition = new THREE.Vector3(0, 0, 0);
                console.log('  Adding H gate on qubit 0...');
                const hGate = this.addGate('H', hPosition);
                if (hGate) {
                    console.log(' Added H gate at position:', hPosition);
                } else {
                    console.error(' Failed to create H gate');
                }

                // Step 2: CNOT gate between qubit 0 (control) and qubit 1 (target)
                // Position it at depth 1 (x=2) and between the qubits (y=0.75)
                const cnotPosition = new THREE.Vector3(2, 0.75, 0);
                console.log('  Adding CNOT gate (control: q0, target: q1)...');
                const cnotGate = this.addGate('CNOT', cnotPosition);
                if (cnotGate) {
                    console.log(' Added CNOT gate at position:', cnotPosition);
                } else {
                    console.error(' Failed to create CNOT gate');
                }

                console.log(' Bell state circuit complete: H(q0) → CNOT(q0,q1)');
                console.log('  Result: |Bell⟩ = 1/√2(|00⟩ + |11⟩) - maximally entangled state');

                console.log('  Default circuit addition completed');
                console.log('  Total gates in scene:', this.gateInstances.length);
                console.log('  Total circuit gates:', this.circuit.length);
                console.log('  Scene children after adding gates:', this.scene.children.length);

                // Force a render update
                if (this.scene && this.scene.userData && this.scene.userData.needsUpdate) {
                    this.scene.userData.needsUpdate = true;
                }

            } catch (error) {
                console.error(' Failed to add default circuit:', error);
                console.error(' Error stack:', error.stack);
            }
        }, 1000); // Increased delay to 1 second
    }

    updateGrid() {
        // Clear existing grid
        while (this.gridGroup.children.length > 0) {
            this.gridGroup.remove(this.gridGroup.children[0]);
        }

        // Create grid lines with dynamic size based on circuit depth
        const maxDepth = this.getMaxCircuitDepth();
        const gridSize = Math.max(maxDepth * 2, 20); // Dynamic grid size
        const gridSpacing = 0.5;

        // Vertical lines (time steps)
        for (let i = 0; i <= gridSize; i++) {
            const geometry = new THREE.CylinderGeometry(0.005, 0.005, this.qubits * this.SPACING_Y);
            const material = new THREE.MeshBasicMaterial({
                color: 0x374151,
                transparent: true,
                opacity: 0.3
            });
            const line = new THREE.Mesh(geometry, material);
            line.position.x = (i - gridSize / 2) * gridSpacing;
            line.position.y = 0;
            this.gridGroup.add(line);
        }

        // Horizontal lines (qubit rails)
        for (let i = 0; i < this.qubits; i++) {
            const geometry = new THREE.CylinderGeometry(0.005, 0.005, gridSize * gridSpacing);
            const material = new THREE.MeshBasicMaterial({
                color: 0x374151,
                transparent: true,
                opacity: 0.3
            });
            const line = new THREE.Mesh(geometry, material);
            line.rotation.z = Math.PI / 2;
            line.position.y = ((this.qubits - 1) / 2 - i) * this.SPACING_Y;
            this.gridGroup.add(line);
        }
    }

    setupEventListeners() {
        // Mouse events for drag and drop within 3D scene
        const canvas = this.scene.userData.canvas || document.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('mousedown', this.onMouseDown);
            canvas.addEventListener('mousemove', this.onMouseMove);
            canvas.addEventListener('mouseup', this.onMouseUp);

            // Drag and drop from HTML palette to 3D scene
            canvas.addEventListener('dragover', this.onCanvasDragOver);
            canvas.addEventListener('drop', this.onCanvasDrop);
        }

        // Setup HTML palette drag and drop
        this.setupPaletteDragDrop();
    };

    setupPaletteDragDrop = () => {
        // Find gate items in the HTML palette - try multiple selectors
        const selectors = [
            '.gate-item[draggable="true"]',
            '.gate-item[data-gate]',
            '.gate-item',
            '[data-gate]'
        ];

        let gateItems = [];
        for (const selector of selectors) {
            gateItems = document.querySelectorAll(selector);
            if (gateItems.length > 0) {
                console.log(`Found ${gateItems.length} gate items with selector: ${selector}`);
                break;
            }
        }

        if (gateItems.length === 0) {
            console.warn(' No gate items found for drag and drop. Creating fallback buttons.');
            this.createFallbackGateButtons();
            return;
        }

        // Track the currently selected gate for click-to-place
        let selectedGateType = null;

        gateItems.forEach(item => {
            // Make sure the item is draggable
            item.draggable = true;

            // Drag start handler
            item.addEventListener('dragstart', (e) => {
                const gateType = item.dataset.gate || item.textContent.trim();
                e.dataTransfer.setData('text/plain', gateType);
                e.dataTransfer.effectAllowed = 'copy';
                console.log('Started dragging gate:', gateType);
            });

            // Click handler - adds gate at a smart position on the circuit
            item.addEventListener('click', (e) => {
                // Prevent drag from triggering
                if (e.detail === 1) {
                    const gateType = item.dataset.gate || item.textContent.trim();
                    console.log('Gate clicked:', gateType);

                    // Find the next available position on the circuit
                    let nextDepth = 0;
                    let nextQubit = 0;

                    // Get current circuit depth
                    if (this.circuit && this.circuit.length > 0) {
                        // Find max depth in current circuit
                        nextDepth = Math.max(...this.circuit.map(g => g.depth || 0)) + 1;
                        // Cycle through qubits for variety
                        const lastGate = this.circuit[this.circuit.length - 1];
                        nextQubit = lastGate ? ((lastGate.qubit || 0) + 1) % this.qubits : 0;
                    }

                    // Calculate the 3D position
                    const x = nextDepth * this.SPACING_X;
                    const y = ((this.qubits - 1) / 2 - nextQubit) * this.SPACING_Y;
                    const position = new THREE.Vector3(x, y, 0);

                    // Add the gate
                    const gateMesh = this.addGate(gateType, position);
                    if (gateMesh) {
                        console.log(`✅ Added ${gateType} gate at position (${nextDepth}, qubit ${nextQubit})`);

                        // Visual feedback - highlight the clicked gate item briefly
                        item.style.transform = 'scale(0.95)';
                        item.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.8)';
                        setTimeout(() => {
                            item.style.transform = '';
                            item.style.boxShadow = '';
                        }, 200);
                    }
                }
            });

            // Add hover effect
            item.style.cursor = 'pointer';
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'translateY(-2px)';
                item.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.4)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.transform = '';
                item.style.boxShadow = '';
            });
        });

        console.log(`✅ Set up drag, drop, and click for ${gateItems.length} gate items`);
    };

    createFallbackGateButtons = () => {
        // Create a simple gate palette if none exists
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        const paletteDiv = document.createElement('div');
        paletteDiv.id = 'fallback-gate-palette';
        paletteDiv.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px;
            border-radius: 8px;
            display: flex;
            gap: 5px;
            z-index: 1000;
        `;

        const gates = ['H', 'X', 'Y', 'Z', 'CNOT', 'S', 'T'];
        gates.forEach(gate => {
            const button = document.createElement('button');
            button.textContent = gate;
            button.dataset.gate = gate;
            button.style.cssText = `
                padding: 8px 12px;
                background: #00d4ff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            `;

            button.addEventListener('click', () => {
                // Add gate at a default position
                const position = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, 0);
                this.addGate(gate, position);
                console.log(`Added ${gate} gate via fallback button`);
            });

            paletteDiv.appendChild(button);
        });

        canvas.parentElement.appendChild(paletteDiv);
        console.log(' Created fallback gate palette');
    }; addIBMExecutionButton = () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        // Check if button already exists
        if (document.getElementById('ibm-execution-controls')) return;

        const controlsDiv = document.createElement('div');
        controlsDiv.id = 'ibm-execution-controls';
        controlsDiv.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 1000;
            min-width: 200px;
        `;

        // IBM Quantum execution button
        const ibmButton = document.createElement('button');
        ibmButton.textContent = '🌐 Run on IBM Quantum';
        ibmButton.style.cssText = `
            padding: 10px 15px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            transition: all 0.3s ease;
        `;

        ibmButton.addEventListener('mouseover', () => {
            ibmButton.style.transform = 'scale(1.05)';
            ibmButton.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.4)';
        });

        ibmButton.addEventListener('mouseout', () => {
            ibmButton.style.transform = 'scale(1)';
            ibmButton.style.boxShadow = 'none';
        });

        ibmButton.addEventListener('click', () => {
            if (typeof window.runIBMQuantumJob === 'function') {
                window.runIBMQuantumJob();
            } else {
                alert('IBM Quantum execution not available');
            }
        });

        // Local execution button
        const localButton = document.createElement('button');
        localButton.textContent = '💻 Run Locally';
        localButton.style.cssText = `
            padding: 10px 15px;
            background: linear-gradient(45deg, #00d4ff, #0891b2);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            transition: all 0.3s ease;
        `;

        localButton.addEventListener('mouseover', () => {
            localButton.style.transform = 'scale(1.05)';
            localButton.style.boxShadow = '0 4px 15px rgba(0, 212, 255, 0.4)';
        });

        localButton.addEventListener('mouseout', () => {
            localButton.style.transform = 'scale(1)';
            localButton.style.boxShadow = 'none';
        });

        localButton.addEventListener('click', () => {
            this.executeLocally();
        });

        // Status display
        const statusDiv = document.createElement('div');
        statusDiv.id = 'execution-status';
        statusDiv.style.cssText = `
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            color: #00d4ff;
            font-size: 12px;
            text-align: center;
            min-height: 20px;
        `;
        statusDiv.textContent = 'Ready to execute';

        controlsDiv.appendChild(ibmButton);
        controlsDiv.appendChild(localButton);
        controlsDiv.appendChild(statusDiv);

        canvas.parentElement.appendChild(controlsDiv);
        console.log('Added IBM execution controls');
    };

    saveCurrentCircuitToDatabase = async () => {
        try {
            const circuit = this.getCircuit();
            if (!circuit || circuit.length === 0) {
                throw new Error('No circuit to save');
            }

            // Convert circuit to the format expected by the backend
            // CRITICAL FIX: Use gate.qubits for 2-qubit gates like CNOT
            const circuitData = {
                gates: circuit.map(gate => ({
                    type: gate.gate,
                    qubits: gate.qubits || [gate.qubit],
                    angle: gate.angle || 0
                })),
                qubits: Math.max(...circuit.map(g => Math.max(...(g.qubits || [g.qubit])))) + 1
            };

            // Save circuit to database
            const response = await fetch('/api/circuit/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    circuit_data: circuitData,
                    circuit_name: '3D Circuit Widget Circuit',
                    circuit_type: 'custom'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || 'Failed to save circuit to database';

                if (response.status === 401) {
                    console.error('❌ Not authenticated - user must log in');
                    throw new Error('Authentication required. Please log in to save circuits.');
                }

                console.error(`❌ Save failed (${response.status}):`, errorMessage);
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('✅ Circuit saved to database:', result);
            return result;
        } catch (error) {
            console.error('Error saving circuit to database:', error);
            throw error;
        }
    };

    addDirectIBMButton = () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        // Check if controls div exists
        let controlsDiv = document.getElementById('ibm-execution-controls');
        if (!controlsDiv) {
            console.warn('IBM execution controls div not found, creating it');
            return; // Will rely on existing button creation
        }

        // Add the direct IBM button
        const directButton = document.createElement('button');
        directButton.textContent = '🚀 Run on IBM (Direct)';
        directButton.style.cssText = `
            padding: 10px 15px;
            background: linear-gradient(45deg, #0f62fe, #0043ce);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            transition: all 0.3s ease;
            margin-top: 5px;
        `;

        directButton.addEventListener('mouseover', () => {
            directButton.style.transform = 'scale(1.05)';
            directButton.style.boxShadow = '0 4px 15px rgba(15, 98, 254, 0.4)';
        });

        directButton.addEventListener('mouseout', () => {
            directButton.style.transform = 'scale(1)';
            directButton.style.boxShadow = 'none';
        });

        directButton.addEventListener('click', () => {
            this.executeDirectOnIBM();
        });

        controlsDiv.appendChild(directButton);
    };

    executeDirectOnIBM = async () => {
        console.log('🚀 Initiating Direct IBM Execution...');

        try {
            console.log('1️⃣ Preparing circuit data...');

            // Prepare Circuit Data (Transforming for Backend)
            const circuitGates = this.getCircuit();
            if (!circuitGates || circuitGates.length === 0) {
                throw new Error('Circuit is empty. Add some gates first!');
            }

            const formattedGates = circuitGates.map(g => ({
                type: g.gate,
                // CRITICAL FIX: Use proper qubits array for 2-qubit gates like CNOT
                qubits: g.qubits || [g.qubit],
                params: g.params || []
            }));

            const circuitData = {
                gates: formattedGates,
                qubits: this.getQubitCount(),
                depth: this.getCircuitDepth()
            };

            console.log(`📊 Circuit: ${formattedGates.length} gates, ${circuitData.qubits} qubits, depth ${circuitData.depth}`);
            console.log('2️⃣ Sending to IBM Quantum...');

            // Submit to Backend
            const response = await fetch('/api/circuit/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    backend: 'auto',
                    shots: 1024,
                    source: '3D_Visualizer_Direct',
                    circuit_data: circuitData,
                    circuit_name: 'Direct IBM Run',
                    circuit_type: 'custom'
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Execution failed');
            }

            // Success
            console.log('✅ IBM Execution Successful:', result);
            alert(`✅ Job Submitted Successfully!\n\nJob ID: ${result.job_id}\nStatus: ${result.status}\n\nCheck the dashboard for results.`);

        } catch (error) {
            console.error('❌ Direct Execution Failed:', error);
            alert(`❌ Execution Failed:\n${error.message}`);
        }
    };

    // ==================== IBM-STYLE MINI BLOCH SPHERES ====================

    addMiniBlochSpheresPanel = () => {
        // Delay to ensure DOM is ready
        setTimeout(() => {
            const canvas = document.querySelector('#quantumCanvas') || document.querySelector('canvas');
            if (!canvas) {
                console.warn('⚠️ Canvas not found for Bloch panel');
                return;
            }

            // Check if panel already exists
            if (document.getElementById('mini-bloch-panel')) {
                console.log('ℹ️ Bloch panel already exists');
                return;
            }

            const blochPanel = document.createElement('div');
            blochPanel.id = 'mini-bloch-panel';
            blochPanel.style.cssText = `
                position: absolute;
                top: 10px;
                right: 220px;
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid rgba(0, 212, 255, 0.4);
                border-radius: 10px;
                padding: 10px;
                z-index: 1000;
                backdrop-filter: blur(10px);
                min-width: 180px;
            `;

            blochPanel.innerHTML = `
                <div style="color: #00d4ff; font-weight: bold; margin-bottom: 8px; font-size: 12px; text-align: center;">
                    ⚛️ Qubit States
                </div>
                <div id="mini-bloch-container" style="display: flex; flex-wrap: wrap; gap: 5px; justify-content: center;">
                </div>
            `;

            // Find container - try multiple options
            let container = document.getElementById('canvas-container');
            if (!container) {
                container = canvas.parentElement;
            }
            if (!container) {
                container = document.body;
            }

            if (container) {
                container.appendChild(blochPanel);
                console.log('✅ Added mini Bloch spheres panel');

                // Initialize with current qubit count
                this.updateMiniBlochSpheres();
            } else {
                console.error('❌ Could not find container for Bloch panel');
            }
        }, 500); // Wait 500ms for DOM to be ready
    };

    updateMiniBlochSpheres = () => {
        const container = document.getElementById('mini-bloch-container');
        if (!container) {
            console.warn('⚠️ Bloch container not found');
            return;
        }

        console.log(`🔄 Updating ${this.qubits} Bloch spheres...`);
        container.innerHTML = '';

        // Get qubit states from the quantum simulator
        const states = this.calculateQubitStates();
        console.log('📊 Calculated states:', states);

        for (let i = 0; i < this.qubits; i++) {
            const state = states[i] || { theta: 0, phi: 0, label: '|0⟩' };
            console.log(`  q${i}: θ=${(state.theta / Math.PI).toFixed(2)}π, φ=${(state.phi / Math.PI).toFixed(2)}π, label=${state.label}`);

            const sphereDiv = document.createElement('div');
            sphereDiv.style.cssText = `
                width: 50px;
                height: 60px;
                background: rgba(0, 20, 40, 0.8);
                border: 1px solid rgba(0, 212, 255, 0.3);
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 4px;
            `;

            // Mini Bloch sphere canvas
            const miniCanvas = document.createElement('canvas');
            miniCanvas.width = 44;
            miniCanvas.height = 44;
            miniCanvas.style.cssText = 'border-radius: 50%;';

            this.drawMiniBlochSphere(miniCanvas, state.theta, state.phi);

            // Qubit label
            const label = document.createElement('div');
            label.style.cssText = 'color: #00d4ff; font-size: 9px; margin-top: 2px;';
            label.textContent = `q${i}: ${state.label}`;

            sphereDiv.appendChild(miniCanvas);
            sphereDiv.appendChild(label);
            container.appendChild(sphereDiv);
        }
    };

    drawMiniBlochSphere = (canvas, theta, phi) => {
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 18;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw sphere background
        const gradient = ctx.createRadialGradient(
            centerX - radius * 0.3, centerY - radius * 0.3, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, 'rgba(0, 150, 200, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 50, 100, 0.3)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(centerX, centerY + radius);
        ctx.moveTo(centerX - radius, centerY);
        ctx.lineTo(centerX + radius, centerY);
        ctx.stroke();

        // Calculate state vector position
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        const stateX = centerX + sinTheta * Math.cos(phi) * radius * 0.8;
        const stateY = centerY - cosTheta * radius * 0.8;

        // Draw state vector line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(stateX, stateY);
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw state point
        ctx.beginPath();
        ctx.arc(stateX, stateY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff6b6b';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    };

    calculateQubitStates = () => {
        console.log(`🧮 Calculating states for ${this.qubits} qubits from ${this.circuit.length} gates`);
        const states = [];

        for (let i = 0; i < this.qubits; i++) {
            // Find gates applied to this qubit
            const gatesOnQubit = this.circuit.filter(g =>
                g.qubit === i || (g.qubits && g.qubits.includes(i))
            ).sort((a, b) => a.depth - b.depth);
            console.log(`  q${i}: ${gatesOnQubit.length} gates applied`, gatesOnQubit.map(g => g.gate));

            // Start with |0⟩ state (theta = 0, phi = 0)
            let theta = 0;
            let phi = 0;
            let label = '|0⟩';

            // Apply gate effects
            for (const gate of gatesOnQubit) {
                switch (gate.gate) {
                    case 'H':
                        // Hadamard puts qubit in superposition
                        theta = Math.PI / 2;
                        phi = 0;
                        label = '|+⟩';
                        break;
                    case 'X':
                        // X gate flips the state
                        theta = Math.PI - theta;
                        label = theta > Math.PI / 2 ? '|1⟩' : '|0⟩';
                        break;
                    case 'Y':
                        theta = Math.PI - theta;
                        phi += Math.PI / 2;
                        label = '|i⟩';
                        break;
                    case 'Z':
                        phi += Math.PI;
                        break;
                    case 'S':
                        phi += Math.PI / 2;
                        break;
                    case 'T':
                        phi += Math.PI / 4;
                        break;
                    case 'CNOT':
                    case 'CX':
                        // If this is control qubit and was in superposition, stays
                        // If target, entanglement occurs
                        if (gate.qubits && gate.qubits[1] === i) {
                            label = 'Ent';
                        }
                        break;
                }
            }

            states.push({ theta, phi, label });
        }

        return states;
    };

    // ==================== IBM-STYLE LIVE CODE PANEL ====================

    addLiveCodePanel = () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        // Check if panel already exists
        if (document.getElementById('live-code-panel')) return;

        const codePanel = document.createElement('div');
        codePanel.id = 'live-code-panel';
        codePanel.style.cssText = `
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.95);
            border: 1px solid rgba(0, 212, 255, 0.4);
            border-radius: 10px;
            padding: 12px;
            z-index: 1000;
            backdrop-filter: blur(10px);
            width: 320px;
            max-height: 300px;
            overflow-y: auto;
        `;

        codePanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="color: #00d4ff; font-weight: bold; font-size: 12px;">📝 Qiskit Code</span>
                <button id="copy-code-btn" style="
                    background: rgba(0, 212, 255, 0.2);
                    border: 1px solid rgba(0, 212, 255, 0.4);
                    color: #00d4ff;
                    padding: 4px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 10px;
                ">📋 Copy</button>
            </div>
            <pre id="live-code-display" style="
                background: rgba(0, 20, 40, 0.8);
                color: #66ff66;
                padding: 10px;
                border-radius: 6px;
                font-size: 10px;
                font-family: 'Consolas', 'Monaco', monospace;
                overflow-x: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
                margin: 0;
                line-height: 1.4;
            ">from qiskit import QuantumCircuit

# Create circuit
qc = QuantumCircuit(${this.qubits}, ${this.qubits})

# Add gates here...</pre>
        `;

        const container = document.getElementById('canvas-container') || canvas.parentElement;
        if (container) {
            container.appendChild(codePanel);
        }

        // Add copy functionality
        const copyBtn = document.getElementById('copy-code-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const codeDisplay = document.getElementById('live-code-display');
                if (codeDisplay) {
                    navigator.clipboard.writeText(codeDisplay.textContent).then(() => {
                        copyBtn.textContent = '✅ Copied!';
                        setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
                    });
                }
            });
        }

        // Update code display
        this.updateLiveCodePanel();
        console.log('✅ Added live code panel');
    };

    updateLiveCodePanel = () => {
        const codeDisplay = document.getElementById('live-code-display');
        if (!codeDisplay) return;

        // Generate current Qiskit code
        const code = this.generateQiskitCode(this.circuit);

        if (code) {
            codeDisplay.textContent = code;
        } else {
            codeDisplay.textContent = `from qiskit import QuantumCircuit

# Create circuit
qc = QuantumCircuit(${this.qubits}, ${this.qubits})

# Add gates by clicking or dragging...`;
        }
    };

    // Override saveState to update UI panels
    _originalSaveState = this.saveState;

    saveState = () => {
        // Call original save state logic
        const state = {
            gates: this.gateInstances.map(gate => ({
                type: gate.userData.gate.type,
                position: gate.position.clone(),
                id: gate.userData.gate.id
            }))
        };

        // Remove any states after current index (for new branch)
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Add new state
        this.history.push(state);
        this.historyIndex++;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }

        // Update UI panels
        this.updateMiniBlochSpheres();
        this.updateLiveCodePanel();
    };

    executeOnIBMQuantum = async () => {
        console.log('Executing circuit on IBM Quantum...');
        const statusDiv = document.getElementById('execution-status');

        try {
            if (statusDiv) statusDiv.textContent = 'Submitting to IBM Quantum...';

            // Get current circuit (Array of gates)
            const circuitGates = this.getCircuit();
            if (!circuitGates || circuitGates.length === 0) {
                throw new Error('No circuit to execute. Please add some gates first.');
            }

            console.log('Circuit gates to execute:', circuitGates);

            // Construct proper circuit data object
            // Transform gates to match backend expectation: {type: 'H', qubits: [0]} instead of {gate: 'H', qubit: 0}
            // CRITICAL FIX: Use g.qubits for 2-qubit gates like CNOT
            const formattedGates = circuitGates.map(g => ({
                type: g.gate,
                qubits: g.qubits || [g.qubit],
                // Add any other properties if needed, e.g. params for rotation gates
                params: g.params || []
            }));

            const circuitData = {
                gates: formattedGates,
                qubits: this.getQubitCount(),
                depth: this.getCircuitDepth()
            };

            // First save the circuit to the database
            try {
                await this.saveCurrentCircuitToDatabase();
            } catch (saveError) {
                // If it's an authentication error, show a more helpful message
                if (saveError.message.includes('Authentication required')) {
                    throw new Error('Please log in to execute circuits on IBM Quantum. Go to the dashboard and click "Login" to authenticate with your account.');
                }
                throw saveError;
            }

            // Convert circuit to executable Qiskit code for IBM
            const qiskitCode = this.generateQiskitCode(circuitGates);

            // Submit to IBM Quantum via API
            let response;
            let result;

            try {
                // Use the new circuit execution API that handles authentication and credentials
                // Send the actual circuit data along with execution parameters
                const circuitInfo = {
                    backend: 'auto', // Let the API decide between simulator and real hardware
                    shots: 1024,
                    source: '3D_Visualizer',
                    circuit_data: circuitData,
                    circuit_name: '3D Circuit Widget Circuit',
                    circuit_type: 'custom',
                    qubits: this.getQubitCount(),
                    depth: this.getCircuitDepth()
                };

                console.log('Sending circuit data to IBM Quantum:', circuitInfo);

                response = await fetch('/api/circuit/execute', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(circuitInfo)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch (e) {
                        errorData = { error: errorText };
                    }
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                result = await response.json();

            } catch (primaryError) {
                console.error('IBM Quantum endpoint failed:', primaryError.message);

                // Check if it's a network connectivity issue
                if (primaryError.message.includes('getaddrinfo failed') ||
                    primaryError.message.includes('NameResolutionError') ||
                    primaryError.message.includes('Failed to resolve') ||
                    primaryError.message.includes('Connection refused') ||
                    primaryError.message.includes('timeout')) {

                    console.log('Network connectivity issue detected, falling back to local execution...');

                    // Fall back to local execution instead of showing error
                    if (statusDiv) statusDiv.textContent = 'IBM Quantum unavailable, running locally...';

                    // Execute locally as fallback
                    try {
                        const localResult = await this.executeLocally();
                        return; // Success, exit early
                    } catch (localError) {
                        console.error('Local execution also failed:', localError);
                        throw new Error(`IBM Quantum is not accessible due to network connectivity issues. Please check your internet connection and try again. Local execution also failed: ${localError.message}`);
                    }
                }

                // Try to get error message from the response if available
                if (primaryError.response) {
                    try {
                        const errorData = await primaryError.response.json();
                        if (errorData.error) {
                            throw new Error(`IBM Quantum connection failed: ${errorData.error}. Please check your IBM Quantum credentials and try again.`);
                        }
                    } catch (jsonError) {
                        // Use original error if JSON parsing fails
                    }
                }

                // Show the actual error instead of falling back to demo mode
                throw new Error(`IBM Quantum connection failed: ${primaryError.message}. Please ensure you are logged in and have configured your IBM Quantum API token in your account settings. Go to /auth to log in and add your credentials.`);
            }

            if (result.success) {
                if (statusDiv) statusDiv.textContent = `Job submitted: ${result.job_id}`;
                console.log('IBM job submitted:', result.job_id);

                // Show success message
                this.showExecutionResult({
                    type: 'ibm',
                    jobId: result.job_id,
                    status: 'submitted',
                    message: result.message || 'Circuit submitted to IBM Quantum successfully!',
                    backend: result.backend,
                    executionId: result.execution_id
                });

                // CRITICAL: Immediately refresh widgets to show new job
                console.log('Refreshing Quantum Jobs widget to display new job...');

                // Clear cache and force refresh of jobs widget
                if (window.quantumWidgets) {
                    // Clear jobs cache to force fresh fetch
                    delete window.quantumWidgets.cache['jobs'];
                    delete window.quantumWidgets.cache['active-jobs'];

                    // Immediate refresh
                    setTimeout(async () => {
                        console.log('Triggering jobs widget refresh after job submission...');
                        await window.quantumWidgets.updateJobsWidget();
                    }, 500);

                    // Second refresh to catch status updates
                    setTimeout(async () => {
                        console.log('Second refresh to catch job status updates...');
                        await window.quantumWidgets.updateJobsWidget();
                    }, 3000);
                }

                // Also refresh via dashboard if available
                if (window.dashboard && window.dashboard.updateWidget) {
                    setTimeout(() => {
                        console.log('Refreshing via dashboard...');
                        window.dashboard.updateWidget('jobs');
                    }, 1000);
                }

            } else {
                throw new Error(result.error || 'Failed to submit job');
            }

        } catch (error) {
            console.error('IBM execution failed:', error);
            if (statusDiv) statusDiv.textContent = 'IBM execution failed';

            this.showExecutionResult({
                type: 'error',
                message: 'IBM execution failed: ' + error.message
            });
        }
    };

    executeLocally = async () => {
        console.log('Executing circuit on quantum backend...');
        const statusDiv = document.getElementById('execution-status');

        try {
            if (statusDiv) statusDiv.textContent = 'Submitting to quantum backend...';

            // Get current circuit
            const circuit = this.getCircuit();
            if (!circuit || circuit.length === 0) {
                throw new Error('No circuit to execute. Please add some gates first.');
            }

            console.log('Circuit to execute:', circuit);

            // Convert circuit to executable Qiskit code
            const qiskitCode = this.generateQiskitCode(circuit);

            // Submit to backend API for real execution and database storage
            const response = await fetch('/api/execute-circuit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: qiskitCode,
                    shots: 1024,
                    backend: 'local_quantum_backend'
                })
            });

            if (!response.ok) {
                throw new Error(`Backend API error: HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                if (statusDiv) statusDiv.textContent = 'Execution completed';

                this.showExecutionResult({
                    type: 'success',
                    title: 'Quantum Backend Results',
                    results: { counts: result.counts },
                    backend: result.backend || 'Local Quantum Backend',
                    job_id: result.job_id
                });

                console.log(' Quantum execution successful:', result);
            } else {
                throw new Error(result.error || 'Quantum execution failed');
            }

        } catch (error) {
            console.error('Quantum execution failed:', error);
            if (statusDiv) statusDiv.textContent = 'Execution failed';

            this.showExecutionResult({
                type: 'error',
                message: 'Quantum execution failed: ' + error.message
            });
        }
    };

    // REMOVED: No local simulation with fake results
    // All quantum execution should go through proper APIs and database storage

    getCircuitType = (circuit) => {
        const gateTypes = circuit.map(gate => gate.gate);

        // Bell state circuit: H gate followed by CNOT creates |Bell⟩ = 1/√2(|00⟩ + |11⟩)
        if (gateTypes.includes('H') && gateTypes.includes('CNOT')) {
            return 'Bell State Circuit';
        } else if (gateTypes.includes('H')) {
            return 'Superposition Circuit';
        } else if (gateTypes.includes('CNOT')) {
            return 'Entanglement Circuit';
        } else {
            return 'Custom Circuit';
        }
    };

    // REMOVED: No localStorage storage - all results come from database APIs


    initializeCircuitDatabase = () => {
        console.log('🔄 Attempting to initialize circuit database...');

        const tryInitializeDatabase = () => {
            // Check if QuantumCircuitDatabase is available
            if (typeof QuantumCircuitDatabase !== 'undefined') {
                try {
                    this.circuitDatabase = new QuantumCircuitDatabase();
                    console.log(' Quantum circuit database initialized');

                    const categories = this.circuitDatabase.getAllCategories();
                    const circuits = this.circuitDatabase.getAllCircuits();

                    console.log('  Available categories:', categories);
                    console.log('  Total circuits:', circuits.length);

                    if (circuits.length === 0) {
                        console.warn(' Circuit database initialized but no circuits found!');
                    }

                    // Update the circuit selection interface now that database is ready
                    setTimeout(() => {
                        this.updateCircuitSelectionInterface();
                        // Also initialize circuit suggestions UI now that database is ready
                        this.initializeCircuitSuggestionsUI();
                    }, 100);

                    return true;
                } catch (error) {
                    console.error(' Error initializing circuit database:', error);
                    return false;
                }
            }
            return false;
        };

        // Try to initialize immediately
        if (!tryInitializeDatabase()) {
            // If not ready, try again after a short delay
            console.warn(' QuantumCircuitDatabase not available, retrying...');
            setTimeout(() => {
                if (tryInitializeDatabase()) {
                    console.log(' Circuit database initialized after retry');
                    // Initialize circuit suggestions UI now that database is ready
                    setTimeout(() => {
                        this.initializeCircuitSuggestionsUI();
                    }, 100);
                } else {
                    console.warn(' QuantumCircuitDatabase still not available after retry');
                    console.warn('Available globals:', Object.keys(window).filter(k => k.includes('Circuit') || k.includes('Database')));
                }
            }, 1000);
        }

        // Initialize existing AI integration
        if (typeof window.quantumAI !== 'undefined' || typeof window.cloudFirstAI !== 'undefined') {
            this.existingAI = window.quantumAI || window.cloudFirstAI;
            console.log(' Existing AI integration found');

            // Load AI-generated circuits in background
            this.loadAIGeneratedCircuits();
        } else {
            console.warn(' Existing AI integration not available');
        }
    };

    loadAIGeneratedCircuits = async () => {
        try {
            console.log('🔄 Loading AI-generated quantum circuits...');

            // Generate circuits using existing AI
            this.aiGeneratedCircuits = [];

            const circuitPrompts = [
                'Create a Bell state quantum circuit',
                'Generate a 3-qubit GHZ state circuit',
                'Create a quantum teleportation circuit',
                'Generate a Grover search algorithm circuit',
                'Create a quantum Fourier transform circuit',
                'Generate a variational quantum circuit for optimization'
            ];

            for (const prompt of circuitPrompts) {
                try {
                    const aiResponse = await this.generateCircuitWithAI(prompt);
                    if (aiResponse) {
                        this.aiGeneratedCircuits.push(aiResponse);
                        console.log(` Generated AI circuit: ${aiResponse.name}`);
                    }
                } catch (error) {
                    console.warn(` Failed to generate circuit for prompt: ${prompt}`, error.message);
                }
            }

            console.log(`  Total AI-generated circuits loaded: ${this.aiGeneratedCircuits.length}`);

            // Update circuit selection interface
            this.updateCircuitSelectionInterface();

        } catch (error) {
            console.error(' Error loading AI-generated circuits:', error);
            this.aiGeneratedCircuits = [];
        }
    };

    addCircuitSelectionInterface = () => {
        const canvas = document.querySelector('canvas');
        const container = document.getElementById('canvas-container') || document.querySelector('.canvas-container');

        // If no canvas but we have a container, wait for canvas
        if (!canvas && container) {
            console.log('⏳ Canvas not ready, retrying in 500ms...');
            setTimeout(() => this.addCircuitSelectionInterface(), 500);
            return;
        }

        if (!canvas && !container) {
            console.log('⏳ No canvas or container found, retrying in 1000ms...');
            setTimeout(() => this.addCircuitSelectionInterface(), 1000);
            return;
        }

        // Check if interface already exists
        if (document.getElementById('circuit-selection-interface')) return;

        const interfaceDiv = document.createElement('div');
        interfaceDiv.id = 'circuit-selection-interface';
        interfaceDiv.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 10px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            max-width: 320px;
            z-index: 1000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 212, 255, 0.3);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        interfaceDiv.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #00d4ff;">🔬 Quantum Circuit Library</h3>
            
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">Category:</label>
                <select id="circuit-category-select" style="width: 100%; padding: 5px; border-radius: 5px; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.3);">
                    <option value="">Select Category</option>
                </select>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">Circuit:</label>
                <select id="circuit-select" style="width: 100%; padding: 5px; border-radius: 5px; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.3);">
                    <option value="">Select Circuit</option>
                </select>
            </div>
            
            <div style="margin-bottom: 10px;">
                <button id="load-circuit-btn" style="width: 100%; padding: 8px; background: #00d4ff; color: black; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    Load Circuit
                </button>
            </div>
            
            <div style="margin-bottom: 10px;">
                <button id="random-circuit-btn" style="width: 100%; padding: 8px; background: #ff6b00; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    🎲 Random Circuit
                </button>
            </div>
            
            <div style="margin-bottom: 10px;">
                <button id="ai-circuit-btn" style="width: 100%; padding: 8px; background: #ff9500; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    🤖 AI Circuits
                </button>
            </div>
            
            <div style="margin-bottom: 10px;">
                <button id="circuit-suggestions-btn" style="width: 100%; padding: 8px; background: linear-gradient(45deg, #00d4ff, #0099cc); color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);">
                    🔬 Browse All Circuits
                </button>
            </div>
            
            <div style="margin-bottom: 10px;">
                <input id="ai-prompt-input" type="text" placeholder="Describe circuit to generate..." style="width: 100%; padding: 5px; border-radius: 5px; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.3); margin-bottom: 5px;">
                <button id="generate-ai-circuit-btn" style="width: 100%; padding: 6px; background: #00ff88; color: black; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 11px;">
                    ✨ Generate with AI
                </button>
            </div>
            
            <div id="circuit-info" style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 5px; font-size: 10px; display: none;">
                <div id="circuit-description"></div>
                <div id="circuit-stats" style="margin-top: 5px; color: #00d4ff;"></div>
            </div>
        `;

        // Append to container or canvas parent
        const targetElement = container || canvas.parentElement || document.body;
        targetElement.appendChild(interfaceDiv);

        // Add event listeners
        this.setupCircuitSelectionEventListeners();

        // Populate categories
        this.updateCircuitSelectionInterface();

        console.log(' Added circuit selection interface');
    };

    setupCircuitSelectionEventListeners = () => {
        const categorySelect = document.getElementById('circuit-category-select');
        const circuitSelect = document.getElementById('circuit-select');
        const loadBtn = document.getElementById('load-circuit-btn');
        const randomBtn = document.getElementById('random-circuit-btn');
        const aiBtn = document.getElementById('ai-circuit-btn');
        const generateAIBtn = document.getElementById('generate-ai-circuit-btn');
        const aiPromptInput = document.getElementById('ai-prompt-input');
        const suggestionsBtn = document.getElementById('circuit-suggestions-btn');

        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                this.updateCircuitsByCategory(e.target.value);
            });
        }

        if (circuitSelect) {
            circuitSelect.addEventListener('change', (e) => {
                this.showCircuitInfo(e.target.value);
            });
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                this.loadSelectedCircuit();
            });
        }

        if (randomBtn) {
            randomBtn.addEventListener('click', () => {
                this.loadRandomCircuit();
            });
        }

        if (aiBtn) {
            aiBtn.addEventListener('click', () => {
                this.showAICircuits();
            });
        }

        if (generateAIBtn) {
            generateAIBtn.addEventListener('click', () => {
                this.generateCustomAICircuit();
            });
        }

        if (aiPromptInput) {
            aiPromptInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.generateCustomAICircuit();
                }
            });
        }

        if (suggestionsBtn) {
            suggestionsBtn.addEventListener('click', () => {
                this.showCircuitSuggestions();
            });
        }
    };

    updateCircuitSelectionInterface = () => {
        const categorySelect = document.getElementById('circuit-category-select');
        if (!categorySelect) {
            console.warn(' Category select element not found');
            return;
        }

        if (!this.circuitDatabase) {
            if (!this._retryCount) this._retryCount = 0;
            this._retryCount++;
            if (this._retryCount < 3) { // Reduced from 10 to 3 retries
                console.warn(' Circuit database not initialized, retrying in 500ms...');
                setTimeout(() => {
                    this.updateCircuitSelectionInterface();
                }, 500);
            } else if (this._retryCount === 3) {
                // Only log once when giving up
                console.log('ℹ️ Circuit database not available - using built-in circuits only');
            }
            return;
        }

        console.log('🔄 Updating circuit selection interface...');

        // Clear existing options
        categorySelect.innerHTML = '<option value="">Select Category</option>';

        // Add categories from database
        const categories = this.circuitDatabase.getAllCategories();
        console.log('  Available categories:', categories);

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });

        // Add AI Generated category if circuits are loaded
        if (this.aiGeneratedCircuits && this.aiGeneratedCircuits.length > 0) {
            const option = document.createElement('option');
            option.value = 'AI Generated';
            option.textContent = '🤖 AI Generated';
            categorySelect.appendChild(option);
        }

        console.log(' Updated circuit selection interface with', categories.length, 'categories');
    };

    updateCircuitsByCategory = (category) => {
        const circuitSelect = document.getElementById('circuit-select');
        if (!circuitSelect) return;

        // Clear existing options
        circuitSelect.innerHTML = '<option value="">Select Circuit</option>';

        let circuits = [];

        if (category === 'AI Generated' && this.aiGeneratedCircuits) {
            circuits = this.aiGeneratedCircuits.map((circuit, index) => ({
                id: `ai_${index}`,
                name: circuit.name,
                ...circuit
            }));
        } else if (category && this.circuitDatabase) {
            circuits = this.circuitDatabase.getCircuitsByCategory(category);
        }

        circuits.forEach(circuit => {
            const option = document.createElement('option');
            option.value = circuit.id;
            option.textContent = circuit.name;
            circuitSelect.appendChild(option);
        });

        console.log(`  Updated circuit list: ${circuits.length} circuits in ${category}`);
    };

    showCircuitInfo = (circuitId) => {
        const infoDiv = document.getElementById('circuit-info');
        const descDiv = document.getElementById('circuit-description');
        const statsDiv = document.getElementById('circuit-stats');

        if (!infoDiv || !descDiv || !statsDiv) return;

        if (!circuitId) {
            infoDiv.style.display = 'none';
            return;
        }

        let circuit = null;

        if (circuitId.startsWith('hf_')) {
            const index = parseInt(circuitId.replace('hf_', ''));
            circuit = this.huggingFaceCircuits[index];
        } else if (this.circuitDatabase) {
            circuit = this.circuitDatabase.getCircuit(circuitId);
        }

        if (circuit) {
            descDiv.textContent = circuit.description;
            statsDiv.innerHTML = `
                  ${circuit.qubits} qubits • ${circuit.depth} depth • ${circuit.gates.length} gates<br>
                ${circuit.reference ? `📚 ${circuit.reference}` : ''}
            `;
            infoDiv.style.display = 'block';
        } else {
            infoDiv.style.display = 'none';
        }
    };

    loadSelectedCircuit = () => {
        console.log('🔄 Loading selected circuit...');
        const circuitSelect = document.getElementById('circuit-select');
        if (!circuitSelect) {
            console.error(' Circuit select element not found');
            alert('Circuit selection interface not available');
            return;
        }

        if (!circuitSelect.value) {
            console.warn(' No circuit selected');
            alert('Please select a circuit first');
            return;
        }

        const circuitId = circuitSelect.value;
        console.log('  Selected circuit ID:', circuitId);
        let circuit = null;

        if (circuitId.startsWith('hf_')) {
            const index = parseInt(circuitId.replace('hf_', ''));
            circuit = this.huggingFaceCircuits[index];
        } else if (this.circuitDatabase) {
            circuit = this.circuitDatabase.getCircuit(circuitId);
        }

        if (circuit) {
            console.log(`🔄 Loading circuit: ${circuit.name}`);
            this.loadCircuitFromDatabase(circuit);
        } else {
            console.error(' Circuit not found:', circuitId);
        }
    };

    loadRandomCircuit = () => {
        console.log('🎲 Loading random circuit...');
        if (!this.circuitDatabase) {
            console.error(' Circuit database not available');
            alert('Circuit database not loaded. Please refresh the page.');
            return;
        }

        try {
            console.log('🎲 Circuit database available, getting random circuit...');
            const allCircuits = this.circuitDatabase.getAllCircuits();
            console.log(`🎲 Total circuits available: ${allCircuits.length}`);

            if (allCircuits.length === 0) {
                console.error('🎲 No circuits available in database');
                alert('No circuits available. Please refresh the page.');
                return;
            }

            const randomCircuit = this.circuitDatabase.getRandomCircuit();
            console.log(`🎲 Loading random circuit: ${randomCircuit.name}`, randomCircuit);

            if (!randomCircuit || !randomCircuit.name) {
                console.error('🎲 Invalid random circuit returned:', randomCircuit);
                alert('Failed to get valid random circuit. Please try again.');
                return;
            }

            this.loadCircuitFromDatabase(randomCircuit);
        } catch (error) {
            console.error(' Error loading random circuit:', error);
            alert('Failed to load random circuit. Please try again.');
        }
    };

    showAICircuits = () => {
        if (!this.aiGeneratedCircuits || this.aiGeneratedCircuits.length === 0) {
            alert('AI circuits are still loading. Please wait...');
            return;
        }

        const categorySelect = document.getElementById('circuit-category-select');
        if (categorySelect) {
            categorySelect.value = 'AI Generated';
            this.updateCircuitsByCategory('AI Generated');
        }
    };

    generateCustomAICircuit = async () => {
        const promptInput = document.getElementById('ai-prompt-input');
        const generateBtn = document.getElementById('generate-ai-circuit-btn');

        if (!promptInput || !promptInput.value.trim()) {
            alert('Please enter a description for the circuit to generate');
            return;
        }

        const prompt = promptInput.value.trim();

        // Show loading state
        const originalText = generateBtn.textContent;
        generateBtn.textContent = '⏳ Generating...';
        generateBtn.disabled = true;

        try {
            console.log(`🤖 Generating custom AI circuit: ${prompt}`);

            const aiCircuit = await this.generateCircuitWithAI(prompt);
            console.log('🔍 AI Circuit generation returned:', aiCircuit);

            if (aiCircuit) {
                console.log('✅ AI Circuit valid, proceeding to load...');
                console.log('   Name:', aiCircuit.name);
                console.log('   Qubits:', aiCircuit.qubits);
                console.log('   Gates:', aiCircuit.gates?.length || 0);
                console.log('   Depth:', aiCircuit.depth);

                // Add to AI generated circuits
                if (!this.aiGeneratedCircuits) {
                    this.aiGeneratedCircuits = [];
                }
                this.aiGeneratedCircuits.unshift(aiCircuit); // Add to beginning

                // Update interface
                this.updateCircuitSelectionInterface();

                // Load the generated circuit immediately
                console.log('📍 About to call loadCircuitFromDatabase...');
                this.loadCircuitFromDatabase(aiCircuit);
                console.log('📍 loadCircuitFromDatabase call completed');

                // Clear input
                promptInput.value = '';

                console.log(`✅ Generated and loaded custom AI circuit: ${aiCircuit.name}`);

            } else {
                alert('Failed to generate circuit. Please try a different description.');
            }

        } catch (error) {
            console.error(' Error generating custom AI circuit:', error);
            alert('Error generating circuit. Please try again.');
        } finally {
            // Restore button state
            generateBtn.textContent = originalText;
            generateBtn.disabled = false;
        }
    };

    // Generate circuit using Gemini AI API
    generateCircuitWithAI = async (prompt) => {
        try {
            console.log(`🤖 Calling Gemini AI to generate circuit for: "${prompt}"`);

            // Parse qubit count from prompt
            const parseQubitsFromPrompt = (text) => {
                const lowerText = text.toLowerCase();

                // Look for explicit qubit counts like "3-qubit", "4 qubits", "5 qubit"
                const qubitMatch = lowerText.match(/(\d+)[\s-]*qubit/);
                if (qubitMatch) {
                    return parseInt(qubitMatch[1]);
                }

                // Look for number words
                const numberWords = {
                    'two': 2, 'three': 3, 'four': 4, 'five': 5,
                    'six': 6, 'seven': 7, 'eight': 8
                };
                for (const [word, num] of Object.entries(numberWords)) {
                    if (lowerText.includes(word + ' qubit') || lowerText.includes(word + '-qubit')) {
                        return num;
                    }
                }

                // Infer from circuit type
                if (lowerText.includes('ghz')) return 3;
                if (lowerText.includes('teleport')) return 3;
                if (lowerText.includes('qft') || lowerText.includes('fourier')) return 4;
                if (lowerText.includes('grover')) return 3;
                if (lowerText.includes('shor')) return 5;
                if (lowerText.includes('bell') || lowerText.includes('entangle')) return 2;

                // Use visualizer's current qubit count if available, otherwise default to 3
                return this.qubits || 3;
            };

            const qubits = parseQubitsFromPrompt(prompt);
            console.log(`🔢 Parsed qubit count: ${qubits} from prompt`);

            const response = await fetch('/api/ai/generate_circuit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: prompt,
                    qubits: qubits,
                    circuit_type: 'custom'
                })
            });

            const result = await response.json();
            console.log('📦 Full API response:', result);

            // Check for circuit in different response formats
            const circuitData = result.circuit || result.circuit_data;
            console.log('📊 Extracted circuit data:', circuitData);

            if (result.success && circuitData) {
                console.log('✅ Gemini AI generated circuit:', circuitData);
                console.log('   Circuit has', circuitData.gates?.length || 0, 'gates');
                console.log('   Circuit qubits:', circuitData.qubits);

                // Convert API response to circuit format
                const circuit = {
                    name: circuitData.name || `AI: ${prompt.substring(0, 30)}`,
                    description: circuitData.description || prompt,
                    category: 'AI Generated',
                    qubits: circuitData.qubits || result.qubits || 3,
                    gates: circuitData.gates || [],
                    depth: circuitData.depth || circuitData.gates?.length || 0,
                    aiGenerated: true,
                    generatedBy: result.generated_by || 'gemini'
                };

                console.log('🎯 Final circuit object to return:', circuit);
                return circuit;
            } else {
                console.error('❌ AI circuit generation failed:', result.error || 'Unknown error');

                // Fallback: Generate a simple circuit based on keywords
                return this.generateFallbackCircuit(prompt);
            }
        } catch (error) {
            console.error('❌ Error calling AI API:', error);

            // Fallback: Generate a simple circuit based on keywords
            return this.generateFallbackCircuit(prompt);
        }
    };

    // Fallback circuit generation when AI API fails
    generateFallbackCircuit = (prompt) => {
        console.log('🔄 Using fallback circuit generation for:', prompt);
        const promptLower = prompt.toLowerCase();

        let circuit = {
            name: `AI: ${prompt.substring(0, 30)}`,
            description: prompt,
            category: 'AI Generated',
            qubits: 2,
            gates: [],
            depth: 0,
            aiGenerated: true
        };

        // Detect circuit type from prompt
        if (promptLower.includes('bell') || promptLower.includes('entangle')) {
            circuit.name = 'Bell State (AI)';
            circuit.qubits = 2;
            circuit.gates = [
                { gate: 'H', qubits: [0], depth: 0 },
                { gate: 'CNOT', qubits: [0, 1], depth: 1 }
            ];
            circuit.depth = 2;
        } else if (promptLower.includes('ghz')) {
            circuit.name = 'GHZ State (AI)';
            circuit.qubits = 3;
            circuit.gates = [
                { gate: 'H', qubits: [0], depth: 0 },
                { gate: 'CNOT', qubits: [0, 1], depth: 1 },
                { gate: 'CNOT', qubits: [1, 2], depth: 2 }
            ];
            circuit.depth = 3;
        } else if (promptLower.includes('superposition') || promptLower.includes('hadamard')) {
            circuit.name = 'Superposition (AI)';
            circuit.qubits = 3;
            circuit.gates = [
                { gate: 'H', qubits: [0], depth: 0 },
                { gate: 'H', qubits: [1], depth: 0 },
                { gate: 'H', qubits: [2], depth: 0 }
            ];
            circuit.depth = 1;
        } else if (promptLower.includes('random') || promptLower.includes('qrng')) {
            circuit.name = 'Quantum RNG (AI)';
            circuit.qubits = 4;
            circuit.gates = [
                { gate: 'H', qubits: [0], depth: 0 },
                { gate: 'H', qubits: [1], depth: 0 },
                { gate: 'H', qubits: [2], depth: 0 },
                { gate: 'H', qubits: [3], depth: 0 }
            ];
            circuit.depth = 1;
        } else if (promptLower.includes('grover') || promptLower.includes('search')) {
            circuit.name = 'Grover Search (AI)';
            circuit.qubits = 3;
            circuit.gates = [
                { gate: 'H', qubits: [0], depth: 0 },
                { gate: 'H', qubits: [1], depth: 0 },
                { gate: 'H', qubits: [2], depth: 0 },
                { gate: 'X', qubits: [2], depth: 1 },
                { gate: 'CNOT', qubits: [0, 2], depth: 2 },
                { gate: 'H', qubits: [0], depth: 3 },
                { gate: 'H', qubits: [1], depth: 3 }
            ];
            circuit.depth = 4;
        } else {
            // Default: Simple 2-qubit circuit
            circuit.name = `Custom: ${prompt.substring(0, 20)}`;
            circuit.qubits = 2;
            circuit.gates = [
                { gate: 'H', qubits: [0], depth: 0 },
                { gate: 'X', qubits: [1], depth: 0 },
                { gate: 'CNOT', qubits: [0, 1], depth: 1 }
            ];
            circuit.depth = 2;
        }

        console.log('✅ Fallback circuit generated:', circuit);
        return circuit;
    };

    loadCircuit(circuitData) {
        try {
            console.log(`🔄 Loading circuit into 3D visualizer:`, circuitData);
            console.log(`   Qubits: ${circuitData.qubits}, Gates: ${circuitData.gates.length}, Depth: ${circuitData.depth}`);

            // Use the global loadCircuitIn3D function if available
            if (typeof window.loadCircuitIn3D === 'function') {
                console.log('   Using global loadCircuitIn3D function...');
                window.loadCircuitIn3D(circuitData);
                return;
            }

            // Fallback: Use window.unifiedQuantumApp directly
            const app = window.unifiedQuantumApp || this.parentApp;

            if (!app) {
                console.error('❌ No quantum app instance found');
                console.warn('   window.unifiedQuantumApp:', window.unifiedQuantumApp);
                console.warn('   this.parentApp:', this.parentApp);
                return;
            }

            console.log('   Using app instance:', app);

            // Update the visualizer's qubit count
            if (app.qubits !== circuitData.qubits) {
                console.log(`   Updating qubit count from ${app.qubits} to ${circuitData.qubits}`);
                app.qubits = circuitData.qubits;

                // Reinitialize the 3D scene with new qubit count
                if (app.initializeScene) {
                    app.initializeScene();
                } else if (app.init) {
                    app.init();
                }
            }

            // Clear existing gates from the scene
            if (app.gateInstances) {
                app.gateInstances.forEach(gate => {
                    if (app.scene) {
                        app.scene.remove(gate);
                    }
                });
                app.gateInstances = [];
            }

            // Add gates to the 3D scene
            if (circuitData.gates && circuitData.gates.length > 0) {
                console.log(`   Adding ${circuitData.gates.length} gates to 3D scene...`);

                circuitData.gates.forEach((gate, index) => {
                    if (gate.position && app.addGate) {
                        const position = new THREE.Vector3(
                            gate.position.x || 0,
                            gate.position.y || 0,
                            gate.position.z || 0
                        );

                        console.log(`     Gate ${index + 1}: ${gate.gate} at position (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);

                        app.addGate(gate.gate, position);
                    }
                });

                console.log(`✅ Successfully loaded ${circuitData.gates.length} gates into 3D scene`);
            } else {
                console.warn('⚠️ No gates to load in circuit data');
            }

            // Store circuit data
            if (app) {
                app.circuitData = circuitData;
            }

        } catch (error) {
            console.error('❌ Error in loadCircuit:', error);
            console.error('   Stack:', error.stack);
        }
    };

    loadCircuitFromDatabase(circuit) {
        try {
            console.log(`🔄 Loading circuit from database: "${circuit.name}"`)
            console.log('Circuit data:', circuit);

            // Validate circuit has required properties
            if (!circuit || !circuit.gates) {
                throw new Error('Invalid circuit data: missing gates array');
            }

            // Convert database format to visualizer format
            const visualizerCircuit = this.convertDatabaseCircuitToVisualizer(circuit);
            console.log('Converted circuit name:', visualizerCircuit.name);

            // Suppress validation warnings for library circuits (they are pre-designed)
            this.loadingFromLibrary = true;

            // Use the standard loadCircuit method which handles qubit count properly
            this.loadCircuit(visualizerCircuit);

            // Directly update circuit info DOM elements
            this.updateCircuitInfoDOM(visualizerCircuit);

            // Immediately update the header display
            const nameDisplay = document.getElementById('circuit-name-display');
            const qubitsDisplay = document.getElementById('circuit-qubits');
            const gatesDisplay = document.getElementById('circuit-gates');
            const depthDisplay = document.getElementById('circuit-depth');

            if (nameDisplay) {
                nameDisplay.textContent = circuit.name || visualizerCircuit.name || 'Custom Circuit';
                console.log('✅ Updated header name display to:', nameDisplay.textContent);
            } else {
                console.warn('❌ circuit-name-display element not found in DOM');
            }

            if (qubitsDisplay) {
                qubitsDisplay.textContent = `${visualizerCircuit.qubits} qubits`;
            }

            if (gatesDisplay) {
                gatesDisplay.textContent = `${visualizerCircuit.gates.length} gates`;
            }

            if (depthDisplay) {
                depthDisplay.textContent = `${visualizerCircuit.depth} depth`;
            }

            // Dispatch event to update header circuit name
            window.dispatchEvent(new CustomEvent('circuitLoaded', {
                detail: {
                    circuit: {
                        name: circuit.name || visualizerCircuit.name,
                        qubits: visualizerCircuit.qubits,
                        num_qubits: visualizerCircuit.qubits,
                        gates: visualizerCircuit.gates || [],
                        depth: visualizerCircuit.depth || 0
                    }
                }
            }));
            console.log('📤 Circuit loaded event dispatched for:', circuit.name);

            // Also update parent app circuit data if available
            if (this.parentApp) {
                this.parentApp.circuitData = visualizerCircuit;
            }

        } catch (error) {
            console.error('Error loading circuit from database:', error);
            alert(`Failed to load circuit: ${error.message}`);
        } finally {
            // ALWAYS re-enable warnings for user interactions
            this.loadingFromLibrary = false;
        }
    };

    convertDatabaseCircuitToVisualizer(circuit) {
        // Use the same spacing values as CircuitBuilder
        const SPACING_X = 0.8;
        const SPACING_Y = 0.6;

        // Ensure gates array exists
        const circuitGates = circuit.gates || [];

        // Calculate qubit count if not provided
        let numQubits = circuit.qubits;
        if (!numQubits || numQubits <= 0) {
            // Calculate from gates
            numQubits = 1;
            circuitGates.forEach(gate => {
                const gateQubits = gate.qubits || [gate.qubit || 0];
                gateQubits.forEach(q => {
                    if (q !== undefined && q >= numQubits) {
                        numQubits = q + 1;
                    }
                });
            });
            console.log(`📊 Calculated qubit count from gates: ${numQubits}`);
        }

        // Find maximum depth in the circuit
        let maxDepth = 0;
        circuitGates.forEach(gate => {
            if (gate.depth > maxDepth) maxDepth = gate.depth;
        });

        // Convert existing gates with defensive null checks
        const gates = circuitGates.map(gate => {
            // Safely get qubit - default to 0 if not defined
            const qubits = gate.qubits || [gate.qubit || 0];
            const primaryQubit = qubits[0] !== undefined ? qubits[0] : 0;
            const gateDepth = gate.depth !== undefined ? gate.depth : 0;

            return {
                gate: gate.gate,
                position: {
                    x: gateDepth * SPACING_X,
                    y: (primaryQubit - (numQubits - 1) / 2) * SPACING_Y,
                    z: 0
                },
                qubit: primaryQubit,
                qubits: qubits,
                depth: gateDepth,
                params: gate.params || []
            };
        });

        // AUTO-ADD MEASURE gates for IBM Quantum compliance (Rule I2)
        // Every qubit must terminate with measurement or reset
        const measureDepth = maxDepth + 1;
        for (let q = 0; q < numQubits; q++) {
            // Check if this qubit already has a measurement (with null check)
            const hasMeasure = circuitGates.some(g =>
                g.gate === 'MEASURE' && g.qubits && g.qubits.includes(q)
            );

            if (!hasMeasure) {
                gates.push({
                    gate: 'MEASURE',
                    position: {
                        x: measureDepth * SPACING_X,
                        y: (q - (numQubits - 1) / 2) * SPACING_Y,
                        z: 0
                    },
                    qubit: q,
                    qubits: [q],
                    depth: measureDepth,
                    params: [],
                    autoAdded: true // Flag for IBM compliance
                });
            }
        }

        console.log(`✅ Added MEASURE gates to ${circuit.name} for IBM compliance`);

        return {
            name: circuit.name || `Circuit: ${circuit.category || 'Unknown'}`,
            description: circuit.description || `Quantum circuit from ${circuit.category || 'database'} category`,
            qubits: numQubits,
            depth: measureDepth, // Updated to include measurement depth
            gates: gates,
            category: circuit.category,
            source: circuit.source || 'database',
            ibmStyleFormatted: true // IBM-style (has measurements), not fully compliant
        };
    };

    updateCircuitInfoDOM(circuitData) {
        console.log('Directly updating circuit info DOM:', circuitData);

        // Update circuit name and description elements
        const circuitName = document.getElementById('circuit-name');
        const circuitDescription = document.getElementById('circuit-description');
        const circuitQubits = document.getElementById('circuit-qubits');
        const circuitDepth = document.getElementById('circuit-depth');
        const circuitGates = document.getElementById('circuit-gates');

        if (circuitName && circuitData.name) {
            circuitName.textContent = circuitData.name;
            console.log('Updated circuit name to:', circuitData.name);
        }

        if (circuitDescription && circuitData.description) {
            circuitDescription.textContent = circuitData.description;
            console.log('Updated circuit description to:', circuitData.description);
        }

        if (circuitQubits && circuitData.qubits) {
            circuitQubits.textContent = circuitData.qubits;
            console.log('Updated circuit qubits to:', circuitData.qubits);
        }

        if (circuitDepth && circuitData.depth) {
            circuitDepth.textContent = circuitData.depth;
            console.log('Updated circuit depth to:', circuitData.depth);
        }

        if (circuitGates && circuitData.gates) {
            circuitGates.textContent = circuitData.gates.length;
            console.log('Updated circuit gates to:', circuitData.gates.length);
        }

        // Also update main circuit name display
        const mainCircuitName = document.getElementById('main-circuit-name');
        const circuitTitle = document.getElementById('circuit-title');

        if (mainCircuitName && circuitTitle && circuitData.name) {
            mainCircuitName.textContent = circuitData.name;
            circuitTitle.style.display = 'block';
            console.log('Updated main circuit name display');
        }
    };

    initializeCircuitSuggestionsUI = () => {
        // Initialize the circuit suggestions UI with retry logic
        const tryInitialize = () => {
            if (typeof CircuitSuggestionsUI !== 'undefined' && this.circuitDatabase) {
                try {
                    this.circuitSuggestionsUI = new CircuitSuggestionsUI(this.circuitDatabase, this);
                    console.log(' Circuit suggestions UI initialized');
                    return true;
                } catch (error) {
                    console.error(' Error initializing circuit suggestions UI:', error);
                    return false;
                }
            }
            return false;
        };

        // Try to initialize immediately
        if (!tryInitialize()) {
            console.warn(' CircuitSuggestionsUI or circuit database not available, retrying...');
            // Try multiple times with increasing delays
            setTimeout(() => {
                if (!tryInitialize()) {
                    setTimeout(() => {
                        if (!tryInitialize()) {
                            setTimeout(() => {
                                if (tryInitialize()) {
                                    console.log(' Circuit suggestions UI initialized after multiple retries');
                                } else {
                                    // Changed from error to info - this is optional functionality
                                    console.log('ℹ️ Circuit suggestions UI not available - using basic interface');
                                }
                            }, 2000);
                        } else {
                            console.log(' Circuit suggestions UI initialized after second retry');
                        }
                    }, 1500);
                } else {
                    console.log(' Circuit suggestions UI initialized after first retry');
                }
            }, 1000);
        }
    };

    showCircuitSuggestions = () => {
        // Create an inline circuit browser if CircuitSuggestionsUI isn't available
        if (!this.circuitDatabase) {
            alert('Circuit database not loaded. Please refresh the page.');
            return;
        }

        // Create modal for browsing all circuits
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, rgba(10, 25, 47, 0.95), rgba(22, 33, 62, 0.95));
            border: 2px solid #00d4ff;
            border-radius: 15px;
            width: 90%;
            max-width: 1200px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 50px rgba(0, 212, 255, 0.3);
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid rgba(0, 212, 255, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <h2 style="margin: 0; color: #00d4ff; font-size: 1.5rem;">
                🔬 Browse Quantum Circuits
            </h2>
            <button id="close-browser" style="background: transparent; border: none; color: #fff; font-size: 1.5rem; cursor: pointer; padding: 0; width: 32px; height: 32px;">×</button>
        `;

        // Body with categories
        const body = document.createElement('div');
        body.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        `;

        // Get all categories and circuits
        const categories = this.circuitDatabase.getAllCategories();
        console.log('Categories:', categories);

        categories.forEach(category => {
            const circuits = this.circuitDatabase.getCircuitsByCategory(category);
            if (circuits.length === 0) return;

            const categorySection = document.createElement('div');
            categorySection.style.cssText = `
                margin-bottom: 30px;
            `;

            const categoryTitle = document.createElement('h3');
            categoryTitle.style.cssText = `
                color: #06b6d4;
                font-size: 1.2rem;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(6, 182, 212, 0.3);
            `;
            categoryTitle.textContent = `${category} (${circuits.length})`;

            const circuitsGrid = document.createElement('div');
            circuitsGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 15px;
            `;

            circuits.forEach(circuit => {
                const circuitCard = document.createElement('div');
                circuitCard.style.cssText = `
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(0, 212, 255, 0.2);
                    border-radius: 10px;
                    padding: 15px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                `;

                circuitCard.innerHTML = `
                    <h4 style="margin: 0 0 10px 0; color: #00d4ff; font-size: 1rem;">${circuit.name}</h4>
                    <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 0.85rem; line-height: 1.4;">${circuit.description || 'Quantum circuit'}</p>
                    <div style="display: flex; gap: 10px; font-size: 0.8rem;">
                        <span style="background: rgba(6, 182, 212, 0.2); color: #06b6d4; padding: 3px 8px; border-radius: 4px;">${circuit.qubits} qubits</span>
                        <span style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; padding: 3px 8px; border-radius: 4px;">${circuit.depth} depth</span>
                        <span style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 3px 8px; border-radius: 4px;">${circuit.gates.length} gates</span>
                    </div>
                `;

                circuitCard.addEventListener('mouseenter', () => {
                    circuitCard.style.background = 'rgba(0, 212, 255, 0.1)';
                    circuitCard.style.borderColor = '#00d4ff';
                    circuitCard.style.transform = 'translateY(-2px)';
                    circuitCard.style.boxShadow = '0 4px 20px rgba(0, 212, 255, 0.3)';
                });

                circuitCard.addEventListener('mouseleave', () => {
                    circuitCard.style.background = 'rgba(255, 255, 255, 0.05)';
                    circuitCard.style.borderColor = 'rgba(0, 212, 255, 0.2)';
                    circuitCard.style.transform = 'translateY(0)';
                    circuitCard.style.boxShadow = 'none';
                });

                circuitCard.addEventListener('click', () => {
                    console.log('Loading circuit:', circuit.name);
                    this.loadCircuitFromDatabase(circuit);
                    modal.remove();
                });

                circuitsGrid.appendChild(circuitCard);
            });

            categorySection.appendChild(categoryTitle);
            categorySection.appendChild(circuitsGrid);
            body.appendChild(categorySection);
        });

        // Assemble modal
        content.appendChild(header);
        content.appendChild(body);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Close handlers
        document.getElementById('close-browser').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    };

    generateCircuitWithAI = async (prompt) => {
        try {
            console.log(`Generating circuit with AI for prompt: ${prompt}`);

            // Parse qubit count from prompt
            const parseQubitsFromPrompt = (text) => {
                const lowerText = text.toLowerCase();

                // Look for explicit qubit counts like "3-qubit", "4 qubits", "5 qubit"
                const qubitMatch = lowerText.match(/(\d+)[\s-]*qubit/);
                if (qubitMatch) {
                    return parseInt(qubitMatch[1]);
                }

                // Look for number words
                const numberWords = {
                    'two': 2, 'three': 3, 'four': 4, 'five': 5,
                    'six': 6, 'seven': 7, 'eight': 8
                };
                for (const [word, num] of Object.entries(numberWords)) {
                    if (lowerText.includes(word + ' qubit') || lowerText.includes(word + '-qubit')) {
                        return num;
                    }
                }

                // Infer from circuit type
                if (lowerText.includes('ghz')) return 3;
                if (lowerText.includes('teleport')) return 3;
                if (lowerText.includes('qft') || lowerText.includes('fourier')) return 4;
                if (lowerText.includes('grover')) return 3;
                if (lowerText.includes('shor')) return 5;
                if (lowerText.includes('bell') || lowerText.includes('entangle')) return 2;

                // Use visualizer's current qubit count if available, otherwise default to 3
                return this.qubits || 3;
            };

            const qubits = parseQubitsFromPrompt(prompt);
            console.log(`🔢 Parsed qubit count: ${qubits} from prompt`);

            // Try to use existing AI service
            let aiResponse = null;

            // Method 1: Try cloud-first AI service
            if (typeof window.cloudFirstAI !== 'undefined') {
                try {
                    console.log('Trying cloudFirstAI...');
                    aiResponse = await window.cloudFirstAI.generateResponse(
                        `Generate a quantum circuit for: ${prompt}. Provide the circuit as a list of gates with qubits and positions.`,
                        'circuit_gen'
                    );
                    console.log('✅ cloudFirstAI response:', aiResponse);
                } catch (error) {
                    console.warn('Cloud-first AI failed:', error.message);
                }
            }

            // Method 2: Try quantum AI service
            if (!aiResponse && typeof window.quantumAI !== 'undefined') {
                try {
                    console.log('Trying quantumAI...');
                    aiResponse = await window.quantumAI.generateCircuit(prompt);
                    console.log('✅ quantumAI response:', aiResponse);
                } catch (error) {
                    console.warn('Quantum AI failed:', error.message);
                }
            }

            // Method 3: Try direct API call to your existing AI endpoint
            if (!aiResponse) {
                try {
                    console.log('Trying direct API call...');
                    const response = await fetch('/api/ai/generate_circuit', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            description: prompt,
                            qubits: qubits
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        // Backend returns circuit_data with structured circuit info
                        aiResponse = data.circuit_data || data.circuit_code || data.response || data.circuit;
                        console.log('✅ Direct API response:', aiResponse);
                    } else {
                        console.warn('Direct API failed with status:', response.status);
                    }
                } catch (error) {
                    console.warn('Direct API call failed:', error.message);
                }
            }

            // Parse AI response into circuit format
            if (aiResponse) {
                console.log('Parsing AI response to circuit...');
                return this.parseAIResponseToCircuit(aiResponse, prompt);
            } else {
                console.log('No AI response, using fallback circuit generation...');
                // Fallback: Generate circuit based on keywords in prompt
                return this.generateFallbackCircuit(prompt);
            }

        } catch (error) {
            console.error(' Error in generateCircuitWithAI:', error);
            console.log('Using fallback circuit generation due to error...');
            return this.generateFallbackCircuit(prompt);
        }
    };

    parseAIResponseToCircuit = (aiResponse, originalPrompt) => {
        try {
            console.log('Parsing AI response to circuit format');

            const gates = [];
            let qubits = 2; // Default

            // Try to parse structured response
            if (typeof aiResponse === 'object' && aiResponse.gates) {
                gates.push(...aiResponse.gates);
                qubits = aiResponse.qubits || 2;
            } else if (typeof aiResponse === 'string') {
                // Parse text response for gate patterns
                const lines = aiResponse.toLowerCase().split('\n');
                let depth = 0;

                for (const line of lines) {
                    const trimmed = line.trim();

                    // Look for gate patterns
                    if (trimmed.includes('hadamard') || trimmed.includes('h gate') || trimmed.includes('h ')) {
                        gates.push({ gate: 'H', qubits: [0], depth: depth++ });
                    }
                    if (trimmed.includes('cnot') || trimmed.includes('controlled-not') || trimmed.includes('cx')) {
                        gates.push({ gate: 'CNOT', qubits: [0, 1], depth: depth++ });
                    }
                    if (trimmed.includes('pauli-x') || trimmed.includes('x gate') || trimmed.includes(' x ')) {
                        gates.push({ gate: 'X', qubits: [0], depth: depth++ });
                    }
                    if (trimmed.includes('pauli-y') || trimmed.includes('y gate') || trimmed.includes(' y ')) {
                        gates.push({ gate: 'Y', qubits: [0], depth: depth++ });
                    }
                    if (trimmed.includes('pauli-z') || trimmed.includes('z gate') || trimmed.includes(' z ')) {
                        gates.push({ gate: 'Z', qubits: [0], depth: depth++ });
                    }
                    if (trimmed.includes('3-qubit') || trimmed.includes('three qubit')) {
                        qubits = 3;
                    }
                    if (trimmed.includes('4-qubit') || trimmed.includes('four qubit')) {
                        qubits = 4;
                    }
                }
            }

            // If no gates found, create a basic circuit based on prompt
            if (gates.length === 0) {
                return this.generateFallbackCircuit(originalPrompt);
            }

            return {
                name: `AI: ${originalPrompt.substring(0, 30)}...`,
                description: `Circuit generated by AI for: ${originalPrompt}`,
                category: 'AI Generated',
                qubits: qubits,
                depth: Math.max(...gates.map(g => g.depth)) + 1,
                gates: gates,
                source: 'ai_generated',
                ai_response: aiResponse
            };

        } catch (error) {
            console.error(' Error parsing AI response:', error);
            return this.generateFallbackCircuit(originalPrompt);
        }
    };

    generateFallbackCircuit = (prompt) => {
        console.log('Generating fallback circuit for:', prompt);

        const lowerPrompt = prompt.toLowerCase();
        let gates = [];
        let qubits = 2;
        let name = 'AI Generated Circuit';

        // Generate circuit based on keywords
        if (lowerPrompt.includes('bell') || lowerPrompt.includes('entangl')) {
            name = 'AI: Bell State Circuit';
            gates = [
                { gate: 'H', qubits: [0], depth: 0 },
                { gate: 'CNOT', qubits: [0, 1], depth: 1 }
            ];
        } else if (lowerPrompt.includes('ghz') || lowerPrompt.includes('3-qubit')) {
            name = 'AI: GHZ State Circuit';
            qubits = 3;
            gates = [
                { gate: 'H', qubits: [0], depth: 0 },
                { gate: 'CNOT', qubits: [0, 1], depth: 1 },
                { gate: 'CNOT', qubits: [1, 2], depth: 2 }
            ];
        } else if (lowerPrompt.includes('teleport')) {
            name = 'AI: Teleportation Circuit';
            qubits = 3;
            gates = [
                { gate: 'H', qubits: [1], depth: 0 },
                { gate: 'CNOT', qubits: [1, 2], depth: 1 },
                { gate: 'CNOT', qubits: [0, 1], depth: 2 },
                { gate: 'H', qubits: [0], depth: 3 }
            ];
        } else if (lowerPrompt.includes('grover') || lowerPrompt.includes('search')) {
            name = 'AI: Grover Search Circuit';
            gates = [
                { gate: 'H', qubits: [0], depth: 0 },
                { gate: 'H', qubits: [1], depth: 0 },
                { gate: 'CZ', qubits: [0, 1], depth: 1 },
                { gate: 'H', qubits: [0], depth: 2 },
                { gate: 'H', qubits: [1], depth: 2 }
            ];
        } else if (lowerPrompt.includes('superposition')) {
            name = 'AI: Superposition Circuit';
            gates = [
                { gate: 'H', qubits: [0], depth: 0 },
                { gate: 'H', qubits: [1], depth: 0 }
            ];
        } else {
            // Default: simple circuit with H and CNOT
            name = 'AI: Basic Quantum Circuit';
            gates = [
                { gate: 'H', qubits: [0], depth: 0 },
                { gate: 'CNOT', qubits: [0, 1], depth: 1 }
            ];
        }

        return {
            name: name,
            description: `Fallback circuit generated for: ${prompt}`,
            category: 'AI Generated',
            qubits: qubits,
            depth: gates.length,
            gates: gates,
            source: 'ai_fallback'
        };
    };

    showExecutionResult = (result) => {
        // Create a popup to show execution results
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid ${result.type === 'error' ? '#ff6b6b' : result.type === 'ibm' ? '#4ecdc4' : '#00d4ff'};
            z-index: 10000;
            max-width: 500px;
            min-width: 300px;
        `;

        const icon = result.type === 'error' ? '' : result.type === 'ibm' ? '🌐' : '💻';
        const title = result.type === 'error' ? 'Execution Error' : result.type === 'ibm' ? 'IBM Quantum' : 'Local Simulation';

        popup.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: ${result.type === 'error' ? '#ff6b6b' : result.type === 'ibm' ? '#4ecdc4' : '#00d4ff'};">
                ${icon} ${title}
            </h3>
            <p style="margin: 0 0 15px 0;">${result.message}</p>
            ${result.results && result.results.counts ? `
                <div style="background: rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 5px; margin: 10px 0;">
                    <strong>Results:</strong><br>
                    ${Object.entries(result.results.counts).map(([state, count]) =>
            `|${state}⟩: ${count} (${((count / (result.results.shots || 1024)) * 100).toFixed(1)}%)`
        ).join('<br>')}
                </div>
                <div style="font-size: 12px; color: #aaa;">
                    Shots: ${result.results.shots || 1024} | Backend: ${result.results.backend || 'Local Simulator'}
                    ${result.results.execution_time ? ` | Time: ${result.results.execution_time}s` : ''}
                </div>
            ` : ''}
            ${result.jobId ? `<div style="font-size: 12px; color: #aaa; margin-top: 10px;">Job ID: ${result.jobId}</div>` : ''}
            <button onclick="this.parentElement.remove()" style="
                margin-top: 15px;
                padding: 8px 15px;
                background: #00d4ff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                float: right;
            ">Close</button>
        `;

        document.body.appendChild(popup);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (popup.parentElement) {
                popup.remove();
            }
        }, 10000);
    };

    onCanvasDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    };

    onCanvasDrop = (event) => {
        event.preventDefault();
        const gateType = event.dataTransfer.getData('text/plain');
        console.log('Drop event received for gate:', gateType);

        if (gateType) {
            // Convert screen coordinates to 3D world coordinates
            const rect = event.target.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            const mouse = new THREE.Vector2(x, y);
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);

            // Create a plane at z=0 for intersection
            const planeGeometry = new THREE.PlaneGeometry(100, 100);
            const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
            plane.position.z = 0;

            const intersects = raycaster.intersectObject(plane);
            if (intersects.length > 0) {
                const dropPosition = intersects[0].point;
                console.log('Dropping gate', gateType, 'at position:', dropPosition);

                // Use the addGate method which handles everything properly
                const gateMesh = this.addGate(gateType, dropPosition);
                if (gateMesh) {
                    console.log('Gate added successfully via drag and drop');
                } else {
                    console.error('Failed to add gate via drag and drop');
                }
            } else {
                console.warn('No intersection found for drop position');
                // Add at a default position if intersection fails
                const defaultPosition = new THREE.Vector3(0, 0, 0);
                const gateMesh = this.addGate(gateType, defaultPosition);
                if (gateMesh) {
                    console.log('Gate added at default position');
                }
            }
        } else {
            console.warn('No gate type received in drop event');
        }
    };


    getMousePosition(event) {
        // Try multiple ways to get canvas
        const canvas = this.parentApp?.renderer?.domElement ||
            this.scene?.userData?.canvas ||
            document.querySelector('canvas');

        console.log('   Canvas element:', canvas);

        if (!canvas) {
            console.error('   ❌ No canvas found!');
            return { x: 0, y: 0 };
        }

        const rect = canvas.getBoundingClientRect();
        const mousePos = {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((event.clientY - rect.top) / rect.height) * 2 + 1
        };
        console.log('   Rect:', rect);
        console.log('   Computed mouse:', mousePos);
        return mousePos;
    }

    getIntersects(mouse) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        console.log('   Camera:', this.camera.position);
        console.log('   Scene children count:', this.scene.children.length);

        // Raycast against all children in the scene (gates should be there)
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        console.log('   Raw intersects:', intersects.length);

        if (intersects.length > 0) {
            console.log('   First intersect:', intersects[0].object.name, intersects[0].object.userData);
        }

        return intersects;
    }

    onMouseDown = (event) => {
        console.log('🖱️ [Capture] onMouseDown', event.type);
        const mouse = this.getMousePosition(event);
        const intersects = this.getIntersects(mouse);
        console.log('   Hit items:', intersects.length);

        // Deselect previous gate
        if (this.selectedGate) {
            this.setGateHighlight(this.selectedGate, false);
        }

        let gateClicked = false;

        for (let intersect of intersects) {
            // CRITICAL FIX: Climb up parents to find the object that has userData.gate
            let obj = intersect.object;
            while (obj && !obj.userData.gate && obj.parent) {
                obj = obj.parent;
            }

            if (obj && obj.userData.gate) {
                console.log('✅ Gate detected:', obj.userData.gate.type);
                this.selectedGate = obj;

                // Visual feedback for selection (cyan glow)
                this.setGateHighlight(this.selectedGate, true);

                this.isDragging = true;
                this.dragOffset.copy(intersect.point).sub(this.selectedGate.position);
                console.log('Gate selected (press Delete to remove)');

                gateClicked = true;

                // Stop propagation to prevent camera movement
                event.stopPropagation();
                // event.preventDefault(); // Don't prevent default, might break keyboard focus

                if (this.controls) this.controls.enabled = false;
                break;
            }
        }

        if (!gateClicked) {
            console.log('   Clicked empty space');
            this.selectedGate = null;
        }
    };

    // Helper to highlight a gate (Group or Mesh)
    setGateHighlight(obj, highlighted) {
        const color = highlighted ? 0x00ffff : 0x000000;
        obj.traverse((child) => {
            if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissive.setHex(color);
            }
        });
    }

    onMouseMove = (event) => {
        if (!this.isDragging || !this.selectedGate) return;

        const mouse = this.getMousePosition(event);
        const planeGeometry = new THREE.PlaneGeometry(100, 100);
        const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.position.z = this.selectedGate.position.z;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObject(plane);

        if (intersects.length > 0) {
            this.selectedGate.position.copy(intersects[0].point.sub(this.dragOffset));
            this.snapToGrid(this.selectedGate);
        }
    };

    onMouseUp = (event) => {
        if (this.isDragging) {
            this.isDragging = false;
            if (this.selectedGate) {
                this.snapToGrid(this.selectedGate);
                this.saveState();
            }
            // Don't deselect - keep selection for deletion
        }

        // Re-enable camera controls
        if (this.controls) {
            this.controls.enabled = true;
        }
    };



    snapToGrid = (mesh) => {
        // Snap to nearest grid position and qubit line
        const gridSize = this.SPACING_X; // 0.8 - matches horizontal spacing
        const qubitSpacing = this.SPACING_Y; // 0.6 - matches qubit line spacing

        // Snap X to grid (time steps)
        mesh.position.x = Math.round(mesh.position.x / gridSize) * gridSize;

        // Snap Y to nearest qubit line
        const qubitIndex = Math.round(mesh.position.y / qubitSpacing);
        const maxQubitIndex = (this.qubits - 1) / 2;
        const clampedIndex = Math.max(-maxQubitIndex, Math.min(maxQubitIndex, qubitIndex));
        mesh.position.y = clampedIndex * qubitSpacing;

        // Ensure gate stays within circuit bounds
        mesh.position.x = Math.max(-4, Math.min(4, mesh.position.x));
    };

    addGate = (gateType, position) => {
        // Calculate qubit and depth from position
        const qubit = Math.round(((this.qubits - 1) * this.SPACING_Y / 2 - position.y) / this.SPACING_Y);
        const depth = Math.round(position.x / this.SPACING_X);

        // === CIRCUIT VALIDATION ===

        // Rule 1: Check if this qubit has been measured (no gates after measurement)
        const measuredQubits = this.getMeasuredQubits();
        if (measuredQubits.has(qubit) && gateType !== 'RESET') {
            const measureDepth = measuredQubits.get(qubit);
            if (depth > measureDepth) {
                console.error(`❌ Invalid: Cannot add ${gateType} after MEASURE on qubit ${qubit}`);
                this.showValidationError(`Cannot add gate after measurement on qubit q${qubit}. Measurement must be the LAST operation unless you RESET.`);
                return null;
            }
        }

        // Rule 2: Warn about control qubits needing preparation (H gate)
        // Skip this check when loading from library (pre-designed circuits)
        const controlGates = ['CNOT', 'CZ', 'CY', 'CH', 'TOFFOLI', 'CCX', 'CCZ', 'FREDKIN', 'CSWAP', 'CRX', 'CRZ'];
        if (controlGates.includes(gateType) && !this.loadingFromLibrary) {
            // Check if any qubit has H gate applied (preparation for superposition)
            const hasPreparation = this.circuit.some(g =>
                g.gate === 'H' && g.depth < depth
            );
            if (!hasPreparation) {
                console.warn(`⚠️ Warning: Adding ${gateType} without control qubit preparation (H gate)`);
                this.showValidationWarning(`Control qubit needs preparation: Add H gate first or the ${gateType} won't have effect (control stuck at |0⟩)`);
            }
        }

        // === ADD THE GATE ===
        const gateMesh = this.gateModels.cloneGateMesh(gateType);
        if (!gateMesh) {
            console.warn('⚠️ Gate type not supported:', gateType, 'at position:', position);
            return null;
        }

        gateMesh.position.copy(position);
        gateMesh.userData.gate = {
            type: gateType,
            position: position.clone(),
            id: Date.now()
        }

        this.scene.add(gateMesh);
        this.gateInstances.push(gateMesh);

        // Add gate to circuit array for execution
        // CRITICAL FIX: Handle 2-qubit gates (CNOT, CZ, etc.) with both control and target
        const twoQubitGates = ['CNOT', 'CX', 'CZ', 'CY', 'CH', 'SWAP', 'ISWAP', 'CRX', 'CRY', 'CRZ', 'CSWAP', 'FREDKIN'];
        const threeQubitGates = ['TOFFOLI', 'CCX', 'CCZ', 'CSWAP', 'FREDKIN'];

        let qubits;
        if (twoQubitGates.includes(gateType.toUpperCase())) {
            // For 2-qubit gates, calculate control and target from position
            // Control qubit = lower y position, Target qubit = higher y position
            // Position.y between qubits means it spans them
            const controlQubit = Math.floor((position.y + (this.qubits - 1) * this.SPACING_Y / 2) / this.SPACING_Y);
            const targetQubit = Math.ceil((position.y + (this.qubits - 1) * this.SPACING_Y / 2) / this.SPACING_Y);

            // Ensure we have two different qubits
            if (controlQubit === targetQubit) {
                // If same qubit, target the next one
                qubits = [controlQubit, Math.min(controlQubit + 1, this.qubits - 1)];
            } else {
                qubits = [controlQubit, targetQubit];
            }
            console.log(`  2-qubit gate ${gateType}: control=${qubits[0]}, target=${qubits[1]}`);
        } else if (threeQubitGates.includes(gateType.toUpperCase())) {
            // For 3-qubit gates, use nearby qubits
            qubits = [Math.max(0, qubit - 1), qubit, Math.min(qubit + 1, this.qubits - 1)];
            console.log(`  3-qubit gate ${gateType}: qubits=${qubits}`);
        } else {
            // Single qubit gate
            qubits = [qubit];
        }

        const circuitGate = {
            gate: gateType,
            qubit: qubit,  // Keep for backwards compatibility
            qubits: qubits, // NEW: Proper qubit array for all gate types
            depth: depth,
            position: position.clone()
        }

        this.circuit.push(circuitGate);
        console.log('➕ Added gate to circuit array:', circuitGate);
        console.log('  Circuit now has', this.circuit.length, 'gates');

        // Update rails if circuit depth increased
        this.updateRailsForNewDepth();

        this.saveState();

        // Update live UI elements
        if (typeof this.updateMiniBlochSpheres === 'function') {
            this.updateMiniBlochSpheres();
        }
        if (typeof this.updateLiveCodePanel === 'function') {
            this.updateLiveCodePanel();
        }

        return gateMesh;
    }

    // Get map of qubit -> depth where it was measured
    getMeasuredQubits = () => {
        const measured = new Map();
        for (const gate of this.circuit) {
            if (gate.gate === 'MEASURE') {
                if (!measured.has(gate.qubit) || gate.depth < measured.get(gate.qubit)) {
                    measured.set(gate.qubit, gate.depth);
                }
            }
        }
        return measured;
    }

    // Show validation error to user
    showValidationError = (message) => {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); background: linear-gradient(45deg, #ef4444, #dc2626); color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000; font-weight: 500; box-shadow: 0 4px 20px rgba(239,68,68,0.4); max-width: 500px; text-align: center;';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    // Show validation warning to user
    showValidationWarning = (message) => {
        const warnDiv = document.createElement('div');
        warnDiv.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); background: linear-gradient(45deg, #f59e0b, #d97706); color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000; font-weight: 500; box-shadow: 0 4px 20px rgba(245,158,11,0.4); max-width: 500px; text-align: center;';
        warnDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        document.body.appendChild(warnDiv);
        setTimeout(() => warnDiv.remove(), 5000);
    }

    // ==================== IBM QUANTUM VALIDATION ENGINE ====================
    // Comprehensive validation for IBM Quantum compatibility

    validateCircuit = () => {
        const errors = [];      // HARD errors - block export
        const warnings = [];    // Soft warnings - allow but warn
        const ibmWarnings = []; // IBM-specific hardware warnings

        console.log('🔍 Running IBM Quantum Validation Engine...');

        if (this.circuit.length === 0) {
            errors.push('Circuit is empty. Add gates to build a quantum circuit.');
            return this.formatValidationResult(false, errors, warnings, ibmWarnings);
        }

        // Get circuit metadata
        const usedQubits = new Set(this.circuit.map(g => g.qubit));
        const measuredQubits = this.getMeasuredQubits();
        const resetQubits = this.getResetQubits();
        const sortedCircuit = [...this.circuit].sort((a, b) => a.depth - b.depth);
        const maxDepth = Math.max(...this.circuit.map(g => g.depth));
        const cnotCount = this.circuit.filter(g =>
            ['CNOT', 'CZ', 'CY', 'CH', 'SWAP', 'ISWAP', 'CRX', 'CRZ'].includes(g.gate)
        ).length;

        // === RULE I1: No gates after measurement (STRICT) ===
        for (const gate of this.circuit) {
            if (gate.gate === 'MEASURE' || gate.gate === 'RESET') continue;

            if (measuredQubits.has(gate.qubit)) {
                const measureDepth = measuredQubits.get(gate.qubit);
                if (gate.depth > measureDepth) {
                    // Check if there's a RESET between measure and this gate
                    const hasResetBetween = this.circuit.some(g =>
                        g.gate === 'RESET' &&
                        g.qubit === gate.qubit &&
                        g.depth > measureDepth &&
                        g.depth < gate.depth
                    );
                    if (!hasResetBetween) {
                        errors.push(`RULE I1 VIOLATION: ${gate.gate} on q${gate.qubit} placed AFTER measurement. Measurement must be LAST unless you RESET.`);
                    }
                }
            }
        }

        // === RULE I2: Every qubit must terminate ===
        for (let q = 0; q < this.qubits; q++) {
            if (usedQubits.has(q)) {
                const terminated = measuredQubits.has(q) || resetQubits.has(q);
                if (!terminated) {
                    errors.push(`RULE I2 VIOLATION: Qubit q${q} is used but not terminated. Add MEASURE or RESET.`);
                }
            }
        }

        // === RULE I3: Classical bits tracking ===
        // IBM Quantum requires classical bits for measurements
        // We auto-allocate them in Qiskit export, so this is just informational
        const measureCount = this.circuit.filter(g => g.gate === 'MEASURE').length;
        if (measureCount > 0) {
            // Classical bits are auto-allocated in export - just note it
            console.log(`📊 I3: ${measureCount} measurements detected, classical bits will be auto-allocated in export`);
        }

        // === RULE G2: One gate per rail per time slice ===
        const gatePositions = new Map(); // "qubit-depth" -> gate
        for (const gate of this.circuit) {
            const key = `${gate.qubit}-${gate.depth}`;
            if (gatePositions.has(key)) {
                const existing = gatePositions.get(key);
                errors.push(`RULE G2 VIOLATION: Overlapping gates on q${gate.qubit} at depth ${gate.depth}: ${existing.gate} and ${gate.gate}`);
            } else {
                gatePositions.set(key, gate);
            }
        }

        // === RULE P2: Phase gates must have extraction ===
        const phaseGates = ['Z', 'S', 'T', 'SDG', 'TDG', 'P', 'RZ'];
        for (const gate of this.circuit) {
            if (phaseGates.includes(gate.gate)) {
                // Check if there's an H gate after this phase gate (before measurement)
                const hasExtraction = this.circuit.some(g =>
                    g.gate === 'H' &&
                    g.qubit === gate.qubit &&
                    g.depth > gate.depth &&
                    (!measuredQubits.has(gate.qubit) || g.depth < measuredQubits.get(gate.qubit))
                );
                if (!hasExtraction) {
                    warnings.push(`RULE P2: ${gate.gate} on q${gate.qubit} has no phase extraction (H gate after). Phase is invisible without interference.`);
                }
            }
        }

        // === RULE D4: Unused qubits ===
        for (let q = 0; q < this.qubits; q++) {
            if (!usedQubits.has(q)) {
                warnings.push(`RULE D4: Qubit q${q} has no operations. Remove it or add gates.`);
            }
        }

        // === IBM HARDWARE WARNINGS ===

        // Circuit depth warning
        if (maxDepth > 15) {
            ibmWarnings.push(`⚠️ IBM HARDWARE: Circuit depth ${maxDepth} exceeds recommended limit (15). Noise will dominate results.`);
        }

        // CNOT count warning
        if (cnotCount > 50) {
            ibmWarnings.push(`⚠️ IBM HARDWARE: ${cnotCount} two-qubit gates may cause unreliable results on real hardware (>50 threshold).`);
        }

        // Qubit count warning for real hardware
        if (this.qubits > 5) {
            ibmWarnings.push(`⚠️ IBM HARDWARE: ${this.qubits} qubits may exceed connectivity limits. Check coupling map.`);
        }

        const valid = errors.length === 0;
        return this.formatValidationResult(valid, errors, warnings, ibmWarnings);
    }

    // Get map of qubit -> depth where it was reset
    getResetQubits = () => {
        const reset = new Map();
        for (const gate of this.circuit) {
            if (gate.gate === 'RESET') {
                if (!reset.has(gate.qubit) || gate.depth > reset.get(gate.qubit)) {
                    reset.set(gate.qubit, gate.depth);
                }
            }
        }
        return reset;
    }

    // Format and display validation results
    formatValidationResult = (valid, errors, warnings, ibmWarnings) => {
        console.log('=== IBM QUANTUM VALIDATION RESULTS ===');
        console.log('Valid:', valid);
        console.log('Errors:', errors);
        console.log('Warnings:', warnings);
        console.log('IBM Warnings:', ibmWarnings);

        // Display to user
        if (errors.length > 0) {
            this.showValidationError(`❌ CIRCUIT INVALID\n\n${errors.join('\n\n')}`);
        } else if (ibmWarnings.length > 0) {
            this.showValidationWarning(`${ibmWarnings.join('\n\n')}`);
        } else if (warnings.length > 0) {
            this.showValidationWarning(`⚠️ Circuit Warnings:\n\n${warnings.join('\n\n')}`);
        } else {
            this.showValidationSuccess('✅ Circuit is valid for IBM Quantum!');
        }

        return { valid, errors, warnings, ibmWarnings };
    }

    // Show validation success
    showValidationSuccess = (message) => {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); background: linear-gradient(45deg, #10b981, #059669); color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000; font-weight: 500; box-shadow: 0 4px 20px rgba(16,185,129,0.4); max-width: 500px; text-align: center;';
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 4000);
    }

    updateRailsForNewDepth = () => {
        const maxDepth = this.getMaxCircuitDepth();
        const currentRailLength = this.qubitMeshes.length > 0 && this.qubitMeshes[0].geometry ?
            this.qubitMeshes[0].geometry.parameters.height : 0;

        const targetRailLength = maxDepth * this.SPACING_X + 2;

        // Only update if rails need to be longer
        if (targetRailLength > currentRailLength) {
            console.log('Updating rail length for new circuit depth:', maxDepth);

            // Remove old rails
            this.qubitMeshes.forEach(rail => this.scene.remove(rail));

            // Create new rails with updated length
            this.qubitMeshes = [];
            this.initializeQubits();

            // Update grid as well
            this.updateGridForNewDepth();
        }
    }

    updateGridForNewDepth = () => {
        // Remove old grid
        if (this.gridGroup) {
            while (this.gridGroup.children.length > 0) {
                this.gridGroup.remove(this.gridGroup.children[0]);
            }
        }

        // Create new grid with updated size
        const maxDepth = this.getMaxCircuitDepth();
        const gridSize = Math.max(maxDepth * 2, 20);
        const gridSpacing = 0.5;

        // Vertical lines (time steps)
        for (let i = 0; i <= gridSize; i++) {
            const geometry = new THREE.CylinderGeometry(0.005, 0.005, this.qubits * this.SPACING_Y);
            const material = new THREE.MeshBasicMaterial({
                color: 0x374151,
                transparent: true,
                opacity: 0.3
            });
            const line = new THREE.Mesh(geometry, material);
            line.position.x = (i - gridSize / 2) * gridSpacing;
            line.position.y = 0;
            if (this.gridGroup) {
                this.gridGroup.add(line);
            }
        }

        // Horizontal lines (qubit rails)
        for (let i = 0; i < this.qubits; i++) {
            const geometry = new THREE.CylinderGeometry(0.005, 0.005, gridSize * gridSpacing);
            const material = new THREE.MeshBasicMaterial({
                color: 0x374151,
                transparent: true,
                opacity: 0.3
            });
            const line = new THREE.Mesh(geometry, material);
            line.rotation.z = Math.PI / 2;
            line.position.y = (i - (this.qubits - 1) / 2) * this.SPACING_Y;
            line.position.x = 0;
            if (this.gridGroup) {
                this.gridGroup.add(line);
            }
        }

        if (this.gridGroup) {
            this.scene.add(this.gridGroup);
        }
    }

    removeGate = (gateMesh) => {
        const index = this.gateInstances.indexOf(gateMesh);
        if (index > -1) {
            this.scene.remove(gateMesh);
            this.gateInstances.splice(index, 1);

            // Remove from circuit array as well
            const circuitIndex = this.circuit.findIndex(gate =>
                gate.id === gateMesh.userData.gate.id
            );
            if (circuitIndex > -1) {
                this.circuit.splice(circuitIndex, 1);

                // Update rails and grid if circuit depth changed
                this.updateRailsForNewDepth();
            }

            this.saveState();
        }
    };

    saveState = () => {
        // Save current state for undo/redo
        const state = {
            gates: this.gateInstances.map(gate => ({
                type: gate.userData.gate.type,
                position: gate.position.clone(),
                id: gate.userData.gate.id
            }))
        };

        // Remove any states after current index (for new branch)
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Add new state
        this.history.push(state);
        this.historyIndex++;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    };

    undo = () => {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }

    redo = () => {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }

    restoreState = (state) => {
        console.log('🔄 Restoring state from history', state);
        // Clear current gates
        this.gateInstances.forEach(gate => this.scene.remove(gate));
        this.gateInstances = [];
        this.circuit = []; // Reset circuit logic array

        // Restore gates from state
        state.gates.forEach(gateData => {
            const gateMesh = this.gateModels.cloneGateMesh(gateData.type);
            if (gateMesh) {
                gateMesh.position.copy(gateData.position);

                // Reconstruct userData
                gateMesh.userData.gate = {
                    type: gateData.type,
                    position: gateData.position.clone(),
                    id: gateData.id
                };

                this.scene.add(gateMesh);
                this.gateInstances.push(gateMesh);

                // Reconstruct circuit logic entry
                // Calculate qubit and depth from position to keep it consistent with addGate logic
                const qubit = Math.round(((this.qubits - 1) * this.SPACING_Y / 2 - gateData.position.y) / this.SPACING_Y);
                const depth = Math.round(gateData.position.x / this.SPACING_X);

                // For multi-qubit gates, we need a similar logic as addGate
                const twoQubitGates = ['CNOT', 'CX', 'CZ', 'CY', 'CH', 'SWAP', 'ISWAP', 'CRX', 'CRY', 'CRZ', 'CSWAP', 'FREDKIN'];
                const threeQubitGates = ['TOFFOLI', 'CCX', 'CCZ', 'CSWAP', 'FREDKIN'];

                let qubits;
                if (twoQubitGates.includes(gateData.type.toUpperCase())) {
                    // Logic from addGate: calculate control and target from position
                    const controlQubit = Math.floor(((this.qubits - 1) * this.SPACING_Y / 2 - gateData.position.y) / this.SPACING_Y);
                    const targetQubit = Math.ceil(((this.qubits - 1) * this.SPACING_Y / 2 - gateData.position.y) / this.SPACING_Y);
                    qubits = (controlQubit === targetQubit)
                        ? [controlQubit, Math.min(controlQubit + 1, this.qubits - 1)]
                        : [controlQubit, targetQubit];
                } else if (threeQubitGates.includes(gateData.type.toUpperCase())) {
                    qubits = [Math.max(0, qubit - 1), qubit, Math.min(qubit + 1, this.qubits - 1)];
                } else {
                    qubits = [qubit];
                }

                this.circuit.push({
                    gate: gateData.type,
                    qubit: qubit,
                    qubits: qubits,
                    depth: depth,
                    position: gateData.position.clone(),
                    id: gateData.id
                });
            }
        });

        // Trigger UI updates
        if (typeof this.updateMiniBlochSpheres === 'function') {
            this.updateMiniBlochSpheres();
        }
        if (typeof this.updateLiveCodePanel === 'function') {
            this.updateLiveCodePanel();
        }

        console.log('✅ State restored, circuit depth:', this.circuit.length);
    }

    clear = () => {
        this.gateInstances.forEach(gate => this.scene.remove(gate));
        this.gateInstances = [];
        this.circuit = []; // Clear the circuit array as well
        this.saveState();
    }

    // Add or remove qubits dynamically
    addQubit = () => {
        if (this.qubits >= this.maxQubits) {
            console.warn('Maximum qubits reached');
            return false;
        }

        this.qubits++;
        this.updateQubits();
        this.updateGrid();
        this.saveState();
        console.log('Added qubit, total:', this.qubits);
        return true;
    }

    removeQubit = () => {
        if (this.qubits <= this.minQubits) {
            console.warn('Minimum qubits reached');
            return false;
        }

        // Check if any gates are on the last qubit
        const lastQubitY = ((this.qubits - 1) / 2) * this.SPACING_Y;
        const gatesOnLastQubit = this.gateInstances.filter(gate =>
            Math.abs(gate.position.y - lastQubitY) < this.SPACING_Y / 2
        );

        if (gatesOnLastQubit.length > 0) {
            console.warn('Cannot remove qubit with gates on it');
            return false;
        }

        this.qubits--;
        this.updateQubits();
        this.updateGrid();
        this.saveState();
        console.log('Removed qubit, total:', this.qubits);
        return true;
    };

    updateQubits = () => {
        // Remove existing qubit rails
        this.qubitMeshes.forEach(rail => this.scene.remove(rail));
        this.qubitMeshes = [];

        // Create new qubit rails with dynamic length
        this.initializeQubits();

        // Update grid as well
        this.updateGridForNewDepth();

        // Update quantum simulator qubits
        if (this.quantumSimulator) {
            this.quantumSimulator.qubits = this.qubits;
            this.quantumSimulator.stateVector = this.quantumSimulator.initializeStateVector();
        }

        // Update Bloch spheres if they exist
        if (window.unifiedQuantumApp && window.unifiedQuantumApp.blochSphere) {
            const container = document.getElementById('blochSpheresContainer');
            if (container) {
                container.innerHTML = '';
                for (let i = 0; i < this.qubits; i++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 150; canvas.height = 150;
                    container.appendChild(canvas);
                    const sphere = new BlochSphere(canvas);
                    window.unifiedQuantumApp.blochSphere.push(sphere);
                }
            }
        }

        if (this.parentApp && typeof this.parentApp.updateCircuitInfo === 'function') {
            this.parentApp.updateCircuitInfo();
        } else {
            console.log('Parent app updateCircuitInfo not available, skipping...');
        }
    };

    // Load circuit from AI-generated data
    loadCircuit = (circuitData) => {
        console.log('Loading circuit:', circuitData);

        // Store circuit data for name/description display
        this.circuitData = circuitData;
        this.currentCircuit = circuitData; // Store for auto-update access

        // Clear current circuit
        this.clear();

        // Set number of qubits if specified, otherwise calculate from gates
        let targetQubits = circuitData.qubits;
        if (!targetQubits && circuitData.gates && Array.isArray(circuitData.gates)) {
            // Calculate qubits from gate data
            let maxQubit = 0;
            circuitData.gates.forEach(gate => {
                if (gate.qubits && Array.isArray(gate.qubits)) {
                    gate.qubits.forEach(qubit => {
                        if (typeof qubit === 'number' && qubit > maxQubit) {
                            maxQubit = qubit;
                        }
                    });
                }
            });
            targetQubits = Math.max(1, maxQubit + 1);
        }

        if (targetQubits && targetQubits !== this.qubits) {
            this.qubits = Math.max(this.minQubits, Math.min(this.maxQubits, targetQubits));
            this.updateQubits();
        }

        // Ensure circuit data has proper defaults
        if (circuitData) {
            circuitData.name = circuitData.name || 'Unnamed Circuit';
            circuitData.description = circuitData.description || 'Quantum circuit visualization';
        }

        // Add gates
        if (circuitData.gates && Array.isArray(circuitData.gates)) {
            circuitData.gates.forEach(gateData => {
                if (gateData.gate && gateData.position) {
                    const position = new THREE.Vector3(
                        gateData.position.x || 0,
                        gateData.position.y || 0,
                        gateData.position.z || 0
                    );

                    const gateMesh = this.addGate(gateData.gate, position);
                    if (gateMesh) {
                        console.log('Added gate:', gateData.gate, 'at', position);
                    }
                } else if (gateData.qubit !== undefined && gateData.gate) {
                    // Convert qubit index to position
                    const y = ((this.qubits - 1) / 2 - gateData.qubit) * this.SPACING_Y;
                    const x = gateData.depth ? gateData.depth * this.SPACING_X : 0;
                    const position = new THREE.Vector3(x, y, 0);

                    const gateMesh = this.addGate(gateData.gate, position);
                    if (gateMesh) {
                        console.log('Added gate:', gateData.gate, 'at qubit', gateData.qubit);
                    }
                }
            });
        }

        // Update parent app circuit data if available
        if (this.parentApp) {
            this.parentApp.circuitData = circuitData;
        }

        // Directly update circuit info DOM elements
        this.updateCircuitInfoDOM(circuitData);

        if (this.parentApp && typeof this.parentApp.updateCircuitInfo === 'function') {
            this.parentApp.updateCircuitInfo();
        }
        console.log('Circuit loaded successfully');

        // Trigger re-render of the scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
            console.log('Scene re-rendered after loading circuit');
        }

        // If animation is running, ensure it continues
        if (this.isAnimating) {
            this.animate();
        }

        // Force a render update to ensure circuit is visible
        setTimeout(() => {
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
                console.log('Final render update for circuit visibility');
            }
        }, 100);
    };

    getCircuit = () => {
        console.log('✅ Unified Quantum Circuit: initialized successfully');
        console.log('   ├─ 3D Scene:', this.qubits, 'qubits');
        console.log('   ├─ Circuit depth:', this.getCircuitDepth());
        console.log('   └─ Ready for gate placement');

        // Add keyboard listener for gate deletion
        this.setupKeyboardListeners();

        // Add mouse listeners for gate selection
        this.setupMouseListeners();

        //  Return the circuit array that we've been building
        return this.circuit || [];
    };

    setupKeyboardListeners = () => {
        document.addEventListener('keydown', (event) => {
            // Delete or Backspace key
            if (event.key === 'Delete' || event.key === 'Backspace') {
                // Don't delete if typing in input field
                if (event.target.matches('input, textarea')) {
                    return;
                }

                if (this.selectedGate) {
                    event.preventDefault();
                    console.log('🗑️ Deleting selected gate');
                    this.removeGate(this.selectedGate);
                    this.selectedGate = null;
                }
            }

            // Undo: Ctrl + Z
            if (event.ctrlKey && event.key === 'z') {
                event.preventDefault();
                console.log('🔄 Keyboard Undo triggered');
                this.undo();
            }

            // Redo: Ctrl + Y or Ctrl + Shift + Z
            if (event.ctrlKey && (event.key === 'y' || (event.shiftKey && event.key === 'z'))) {
                event.preventDefault();
                console.log('🔄 Keyboard Redo triggered');
                this.redo();
            }
        });
        console.log('✅ Keyboard listener setup (Delete key for gate removal)');
    }

    setupMouseListeners = () => {
        // Get the canvas element directly (renderer is in parent, not in CircuitBuilder)
        const canvas = document.querySelector('canvas');

        if (!canvas) {
            console.error('❌ Cannot find canvas element for mouse listeners');
            return;
        }

        // Attach mouse event handlers
        canvas.addEventListener('mousedown', this.onMouseDown, false);
        canvas.addEventListener('mousemove', this.onMouseMove, false);
        canvas.addEventListener('mouseup', this.onMouseUp, false);

        console.log('✅ Mouse listeners attached to canvas for gate selection');
    }

    clearCircuit = () => {
        console.log('🧹 CircuitBuilder.clearCircuit() called');

        // Clear the circuit array
        this.circuit = [];

        // Remove all gate instances from the scene
        this.gateInstances.forEach(gateInstance => {
            if (gateInstance.mesh) {
                this.scene.remove(gateInstance.mesh);
            }
        });
        this.gateInstances = [];

        // Reset circuit depth
        this.circuitDepth = 0;

        // Update grid to reflect the cleared state
        this.updateGrid();

        console.log('🧹 Circuit cleared successfully');
    };

    generateQiskitCode = (circuitData) => {
        console.log('Generating Qiskit code for:', circuitData);
        if (!circuitData || (Array.isArray(circuitData) && circuitData.length === 0)) {
            return '';
        }

        // Ensure circuitData is an array
        const gates = Array.isArray(circuitData) ? circuitData : [];

        // Determine number of qubits needed
        let maxQubit = 0;
        gates.forEach(gate => {
            if (!gate) return; // Skip undefined gates

            // Handle different gate data formats
            const qubits = gate.qubits || (gate.qubit !== undefined ? [gate.qubit] : []);
            if (qubits.length > 0) {
                qubits.forEach(qubit => {
                    if (typeof qubit === 'number' && qubit > maxQubit) {
                        maxQubit = qubit;
                    }
                });
            }
        });

        const numQubits = Math.max(2, maxQubit + 1);

        // Generate Qiskit code - Using simpler format that's more compatible
        let code = `from qiskit import QuantumCircuit

# Circuit generated from 3D Visualizer
qc = QuantumCircuit(${numQubits}, ${numQubits})
`;

        // Add gates
        gates.forEach(gate => {
            // Handle different gate data formats
            const qubits = gate.qubits || (gate.qubit !== undefined ? [gate.qubit] : []);

            if (gate.gate === 'H' && qubits.length > 0) {
                code += `qc.h(${qubits[0]})  # Hadamard gate on qubit ${qubits[0]}\n`;
            } else if ((gate.gate === 'CNOT' || gate.gate === 'CX') && qubits.length >= 2) {
                // Skip invalid CNOT gates where control and target are the same qubit
                if (qubits[0] === qubits[1]) {
                    console.warn(`Skipping invalid CNOT gate: control and target are both qubit ${qubits[0]}`);
                } else {
                    code += `qc.cx(${qubits[0]}, ${qubits[1]})  # CNOT: control=${qubits[0]}, target=${qubits[1]}\n`;
                }
            } else if (gate.gate === 'X' && qubits.length > 0) {
                code += `qc.x(${qubits[0]})  # Pauli-X gate on qubit ${qubits[0]}\n`;
            } else if (gate.gate === 'Y' && qubits.length > 0) {
                code += `qc.y(${qubits[0]})  # Pauli-Y gate on qubit ${qubits[0]}\n`;
            } else if (gate.gate === 'Z' && qubits.length > 0) {
                code += `qc.z(${qubits[0]})  # Pauli-Z gate on qubit ${qubits[0]}\n`;
            } else if (gate.gate === 'S' && qubits.length > 0) {
                code += `qc.s(${qubits[0]})  # S gate on qubit ${qubits[0]}\n`;
            } else if (gate.gate === 'T' && qubits.length > 0) {
                code += `qc.t(${qubits[0]})  # T gate on qubit ${qubits[0]}\n`;
            } else if (gate.gate === 'RX' && qubits.length > 0) {
                const angle = gate.params && gate.params[0] !== undefined ? gate.params[0] : 'pi/2';
                code += `qc.rx(${angle}, ${qubits[0]})  # RX rotation on qubit ${qubits[0]}\n`;
            } else if (gate.gate === 'RY' && qubits.length > 0) {
                const angle = gate.params && gate.params[0] !== undefined ? gate.params[0] : 'pi/2';
                code += `qc.ry(${angle}, ${qubits[0]})  # RY rotation on qubit ${qubits[0]}\n`;
            } else if (gate.gate === 'RZ' && qubits.length > 0) {
                const angle = gate.params && gate.params[0] !== undefined ? gate.params[0] : 'pi/2';
                code += `qc.rz(${angle}, ${qubits[0]})  # RZ rotation on qubit ${qubits[0]}\n`;
            }
        });

        // Add measurement using simple format
        code += `\n# Measure all qubits\n`;
        for (let i = 0; i < numQubits; i++) {
            code += `qc.measure(${i}, ${i})\n`;
        }

        return code;
    };

    storeDemoIBMJob = (result, circuit) => {
        console.log('Storing demo IBM job:', result, circuit);
        // Store demo job data for widgets to display
        if (window.quantumWidgets && window.quantumWidgets.storeDemoJob) {
            window.quantumWidgets.storeDemoJob({
                jobId: result.job_id,
                circuit: circuit,
                status: 'completed',
                results: result.results || {},
                executionTime: result.execution_time || 0
            });
        }
    };

    // Get maximum circuit depth for grid sizing
    getMaxCircuitDepth() {
        if (!this.circuit || this.circuit.length === 0) {
            return 0;
        }

        let maxDepth = 0;
        this.circuit.forEach(gate => {
            if (gate && gate.depth !== undefined) {
                maxDepth = Math.max(maxDepth, gate.depth);
            }
        });

        return maxDepth;
    };

    // Get qubit count for circuit
    getQubitCount() {
        return this.qubits;
    }

    // Get circuit depth
    getCircuitDepth() {
        return this.getMaxCircuitDepth();
    }
}

// Export CircuitBuilder for use in other modules (browser-safe)
if (typeof window !== 'undefined' && !window.CircuitBuilder) {
    window.CircuitBuilder = CircuitBuilder;
}

// ==================== VISUALIZATION ====================

class QuantumVisualization {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.quantumSimulator = null;
        this.circuitBuilder = null;
        this.blochSphere = null;
        this.ibmIntegration = null;

        this.animationId = null;
        this.isAnimating = true;
        this.animationSpeed = 1.0;

        this.initialize();
    }

    initialize() {
        try {
            // Check if Three.js is loaded
            const THREE = window.THREE || (typeof global !== 'undefined' ? global.THREE : null);
            if (typeof THREE === 'undefined' || THREE === null) {
                console.error('THREE object check failed in QuantumVisualization');
                throw new Error('Three.js library not loaded. This may be due to network connectivity issues or CDN problems. Please check your internet connection and try refreshing the page.');
            }

            console.log('Setting up Three.js scene...');
            this.setupScene();

            console.log('Setting up camera...');
            this.setupCamera();

            console.log('Setting up renderer...');
            this.setupRenderer();

            console.log('Setting up lighting...');
            this.setupLighting();

            console.log('Setting up controls...');
            this.setupControls();

            console.log('Setting up event listeners...');
            this.setupEventListeners();

            // Initialize components
            console.log('Initializing quantum simulator...');
            this.quantumSimulator = new QuantumSimulator();

            console.log('Initializing circuit builder...');
            this.circuitBuilder = new CircuitBuilder(this.scene, this.camera, this.quantumSimulator, this);

            // Capture reference for setTimeout closure
            const circuitBuilder = this.circuitBuilder;

            // Directly attach mouse listeners for gate selection (delayed to ensure canvas exists)
            setTimeout(() => {
                console.log('🔧 Attempting to attach mouse listeners...');
                const canvas = document.querySelector('canvas');
                console.log('   Canvas found:', !!canvas);
                console.log('   CircuitBuilder available:', !!circuitBuilder);

                if (canvas && circuitBuilder) {
                    // Use capture phase and arrow functions to preserve 'this' context
                    canvas.addEventListener('mousedown', (e) => circuitBuilder.onMouseDown(e), true);
                    canvas.addEventListener('mousemove', (e) => circuitBuilder.onMouseMove(e), true);
                    canvas.addEventListener('mouseup', (e) => circuitBuilder.onMouseUp(e), true);
                    console.log('✅ Mouse listeners attached with correct context (capture phase)');
                } else {
                    console.error('❌ Failed to attach mouse listeners');
                    console.error('   Canvas:', canvas);
                    console.error('   CircuitBuilder:', circuitBuilder);
                }
            }, 200);

            console.log('Initializing Bloch spheres...');
            this.blochGroup = [];
            const container = document.getElementById('blochSpheresContainer');
            if (container) {
                container.innerHTML = '';
                for (let i = 0; i < this.quantumSimulator.qubits; i++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 150; canvas.height = 150;
                    container.appendChild(canvas);
                    const sphere = new BlochSphere(canvas);
                    this.blochGroup.push(sphere);
                }
            }

            // Start animation loop
            console.log('Starting animation loop...');
            this.animate();

            // Test render immediately to ensure something is visible
            if (this.renderer && this.scene && this.camera) {
                console.log('Performing initial render...');
                this.renderer.render(this.scene, this.camera);

                // Add visual indicators to confirm 3D scene is working
                this.addVisualIndicators();

                this.renderer.render(this.scene, this.camera);
                console.log('Initial test render successful');
            }

            // Handle window resize
            window.addEventListener('resize', () => this.handleResize());

            console.log('QuantumVisualization initialized successfully');
        } catch (error) {
            console.error('Failed to initialize QuantumVisualization:', error);
            throw error;
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 3, 5);
        this.camera.lookAt(0, 0, 0);
    }

    setupRenderer() {
        const canvas = document.getElementById('quantumCanvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }

        console.log('Canvas dimensions:', canvas.offsetWidth, 'x', canvas.offsetHeight);

        // Ensure canvas has proper dimensions
        if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) {
            console.warn('Canvas has zero dimensions, setting fallback size');
            canvas.style.width = '100%';
            canvas.style.height = '400px';
            canvas.width = canvas.offsetWidth || 800;
            canvas.height = canvas.offsetHeight || 400;
        }

        try {
            // Try WebGL renderer first
            let THREE;
            if (typeof window !== 'undefined' && window.THREE) {
                THREE = window.THREE;
            } else if (typeof global !== 'undefined' && global.THREE) {
                THREE = global.THREE;
            } else {
                // Try to find THREE in any available scope
                THREE = (function () {
                    try { return THREE; } catch (e) { }
                    try { return window.THREE; } catch (e) { }
                    try { return global.THREE; } catch (e) { }
                    return undefined;
                })();
            }

            if (!THREE) {
                console.error('THREE object not found in any scope');
                console.log('Available globals:', Object.keys(window || global || this));
                throw new Error('THREE object not available');
            }

            this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
            console.log('WebGL renderer created successfully');
        } catch (error) {
            console.error('WebGL renderer failed:', error);
            // Show error message since Canvas renderer is deprecated in newer Three.js
            this.showWebGLError();
            return;
        }

        this.renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Store canvas reference for event handling
        this.scene.userData.canvas = canvas;
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Point lights for quantum effects
        const pointLight1 = new THREE.PointLight(0x00d4ff, 0.5, 50);
        pointLight1.position.set(5, 5, 5);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xff6b6b, 0.3, 50);
        pointLight2.position.set(-5, -5, -5);
        this.scene.add(pointLight2);
    }

    setupControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            try {
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
                this.controls.enableZoom = true;
                this.controls.enablePan = true;
                console.log('OrbitControls initialized');
            } catch (error) {
                console.warn('Failed to initialize OrbitControls:', error);
                this.setupBasicControls();
            }
        } else {
            console.warn(' OrbitControls not available, using basic controls');
            this.setupBasicControls();
        }
    }

    setupBasicControls() {
        // Basic mouse controls as fallback
        this.isMouseDown = false;
        this.previousMousePosition = { x: 0, y: 0 };

        const canvas = this.renderer.domElement;
        canvas.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.isMouseDown) return;

            const deltaX = e.clientX - this.previousMousePosition.x;
            const deltaY = e.clientY - this.previousMousePosition.y;

            // Simple orbit controls
            this.camera.position.x += deltaX * 0.01;
            this.camera.position.y -= deltaY * 0.01;
            this.camera.lookAt(0, 0, 0);

            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        // Mouse wheel for zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSpeed = 0.1;
            const direction = e.deltaY > 0 ? 1 : -1;
            const distance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));

            if (distance > 1 || direction > 0) {
                this.camera.position.multiplyScalar(1 + direction * zoomSpeed);
            }
        });

        console.log('Basic mouse controls initialized');
    }

    setupEventListeners() {
        // Add any visualization-specific event listeners here
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        if (this.controls && typeof this.controls.update === 'function') {
            this.controls.update();
        }

        // Update quantum particles
        this.updateQuantumParticles();

        // Update quantum field
        this.updateQuantumField();

        this.renderer.render(this.scene, this.camera);
    }

    addQuantumParticles() {
        // Add floating quantum particles
        this.quantumParticles = [];
        for (let i = 0; i < 20; i++) {
            const geometry = new THREE.SphereGeometry(0.05);
            const material = new THREE.MeshPhongMaterial({
                color: 0x00d4ff,
                transparent: true,
                opacity: 0.6
            });
            const particle = new THREE.Mesh(geometry, material);

            particle.position.set(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            );

            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            );

            this.scene.add(particle);
            this.quantumParticles.push(particle);
        }
    }

    addQuantumField() {
        // Add quantum field effect
        const geometry = new THREE.PlaneGeometry(50, 50, 50, 50);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.1,
            wireframe: true
        });
        this.quantumField = new THREE.Mesh(geometry, material);
        this.quantumField.rotation.x = -Math.PI / 2;
        this.quantumField.position.y = -5;
        this.scene.add(this.quantumField);
    }

    updateQuantumParticles() {
        if (!this.quantumParticles) return;

        this.quantumParticles.forEach(particle => {
            particle.position.add(particle.userData.velocity);

            // Bounce off boundaries
            if (Math.abs(particle.position.x) > 10) particle.userData.velocity.x *= -1;
            if (Math.abs(particle.position.y) > 10) particle.userData.velocity.y *= -1;
            if (Math.abs(particle.position.z) > 10) particle.userData.velocity.z *= -1;

            // Add some quantum jitter
            particle.position.x += (Math.random() - 0.5) * 0.01;
            particle.position.y += (Math.random() - 0.5) * 0.01;
            particle.position.z += (Math.random() - 0.5) * 0.01;
        });
    }

    updateQuantumField() {
        if (!this.quantumField) return;

        // Animate the quantum field
        this.quantumField.material.opacity = 0.05 + Math.sin(Date.now() * 0.001) * 0.05;
    }

    handleResize() {
        if (!this.camera || !this.renderer) return;

        const canvas = this.renderer.domElement;
        this.camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    }

    resetCamera() {
        this.camera.position.set(0, 3, 5);
        this.camera.lookAt(0, 0, 0);
        if (this.controls && typeof this.controls.reset === 'function') {
            this.controls.reset();
        }
    }

    toggleAnimation() {
        this.isAnimating = !this.isAnimating;
        if (this.isAnimating) {
            this.animate();
        } else {
            cancelAnimationFrame(this.animationId);
        }
    }

    updateAnimationSpeed(speed) {
        this.animationSpeed = speed;
    }

    getCircuit() {
        const circuit = this.circuitBuilder ? this.circuitBuilder.getCircuit() : [];
        console.log('  getCircuit() called, returning:', circuit);
        console.log('  Circuit length:', circuit.length);
        return circuit;
    }

    clearCircuit() {
        if (this.circuitBuilder) {
            this.circuitBuilder.clear();
        }
    }

    runCircuit() {
        console.log('  runCircuit() called');
        const circuit = this.getCircuit();
        console.log('  Circuit to run:', circuit);
        console.log('  Circuit length:', circuit.length);

        if (circuit.length === 0) {
            console.warn(' No gates in circuit');
            this.showResults({
                error: 'No gates in circuit to execute'
            });
            return;
        }

        console.log('  Executing circuit with', circuit.length, 'gates');

        // Reset quantum simulator
        this.quantumSimulator.reset();

        // Apply each gate in order
        circuit.forEach((gate, index) => {
            console.log(`Applying gate ${index + 1}: ${gate.gate} on qubit ${gate.qubit}`);
            this.quantumSimulator.applyGate(gate.gate, gate.qubit);
        });

        // Calculate measurement probabilities
        const stateVector = this.quantumSimulator.stateVector;
        const probabilities = stateVector.map(amplitude => Math.pow(Math.abs(amplitude), 2));

        // Generate measurement results (sample from probability distribution)
        const measurements = this.generateMeasurements(probabilities, 1000);

        // Update Bloch spheres with actual quantum states
        this.updateBlochSpheres(stateVector);

        // Show comprehensive results
        const results = {
            circuit: circuit,
            stateVector: stateVector,
            probabilities: probabilities,
            measurements: measurements,
            fidelity: this.calculateFidelity(stateVector),
            entanglement: this.calculateEntanglement(circuit, stateVector)
        }

        this.showResults(results);
        console.log('Circuit execution completed with results:', results);
    }

    updateBlochSpheres(stateVector) {
        if (!this.blochGroup || !stateVector) return;

        // Update Bloch spheres with actual quantum states
        for (let qubitIndex = 0; qubitIndex < Math.min(this.blochGroup.length, this.quantumSimulator.qubits); qubitIndex++) {
            const sphere = this.blochGroup[qubitIndex];

            // Extract single-qubit state from multi-qubit state vector
            const qubitState = this.extractSingleQubitState(stateVector, qubitIndex, this.quantumSimulator.qubits);

            // Convert to Bloch sphere coordinates
            const blochCoords = this.stateToBloch(qubitState);
            sphere.animateToState(blochCoords, 1000);
        }
    }

    extractSingleQubitState(stateVector, targetQubit, totalQubits) {
        // Extract the reduced density matrix for a single qubit
        // This is a simplified implementation
        let prob0 = 0, prob1 = 0;

        for (let i = 0; i < stateVector.length; i++) {
            const bitString = i.toString(2).padStart(totalQubits, '0');
            const qubitBit = parseInt(bitString[totalQubits - 1 - targetQubit]);
            const amplitude = stateVector[i];

            if (qubitBit === 0) {
                prob0 += Math.pow(Math.abs(amplitude), 2);
            } else {
                prob1 += Math.pow(Math.abs(amplitude), 2);
            }
        }

        // Simplified: return probabilities (should be full density matrix)
        return { prob0, prob1 };
    }

    stateToBloch(qubitState) {
        // Convert qubit state probabilities to Bloch sphere coordinates
        const p0 = qubitState.prob0;
        const p1 = qubitState.prob1;

        // For pure states, this would be more complex
        // Simplified approximation for visualization
        const z = p0 - p1; // |0⟩ - |1⟩ expectation
        const xy_magnitude = Math.sqrt(1 - z * z);

        return {
            x: xy_magnitude * Math.cos(Date.now() * 0.001), // Demo rotation
            y: xy_magnitude * Math.sin(Date.now() * 0.001), // Demo rotation
            z: z
        }
    }

    generateMeasurements(probabilities, numSamples) {
        const measurements = {};
        const outcomes = [];

        // Sample from probability distribution
        for (let i = 0; i < numSamples; i++) {
            let rand = Math.random();
            let cumulativeProb = 0;

            for (let j = 0; j < probabilities.length; j++) {
                cumulativeProb += probabilities[j];
                if (rand <= cumulativeProb) {
                    outcomes.push(j);
                    break;
                }
            }
        }

        // Count occurrences
        outcomes.forEach(outcome => {
            const bitString = outcome.toString(2).padStart(this.quantumSimulator.qubits, '0');
            measurements[bitString] = (measurements[bitString] || 0) + 1;
        });

        return measurements;
    }

    calculateFidelity(stateVector) {
        // Calculate fidelity with |00...0⟩ state
        const overlap = Math.abs(stateVector[0]); // Amplitude of |00...0⟩
        return Math.pow(overlap, 2);
    }

    calculateEntanglement(circuit, stateVector) {
        // Simplified entanglement detection
        // Check if circuit has multi-qubit gates
        const hasMultiQubitGates = circuit.some(gate =>
            ['CNOT', 'CZ', 'SWAP', 'CRX', 'CRY', 'CRZ', 'CCX'].includes(gate.gate)
        );

        if (!hasMultiQubitGates) return 0;

        // Simple heuristic: check if state has non-zero amplitudes in entangled subspace
        let entangledAmplitude = 0;
        for (let i = 1; i < stateVector.length; i++) {
            entangledAmplitude += Math.pow(Math.abs(stateVector[i]), 2);
        }

        return Math.min(entangledAmplitude * 100, 100); // Percentage
    }

    showResults(results) {
        console.log('Showing results:', results);

        // Create or update results display
        let resultsContainer = document.getElementById('circuit-results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'circuit-results';
            resultsContainer.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 400px;
                max-height: 300px;
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid #06b6d4;
                border-radius: 8px;
                padding: 15px;
                color: white;
                font-family: monospace;
                font-size: 12px;
                overflow-y: auto;
                z-index: 1000;
            `;
            document.body.appendChild(resultsContainer);
        }

        if (results.error) {
            resultsContainer.innerHTML = `
                <h4 style="color: #ff6b6b; margin: 0 0 10px 0;">Execution Error</h4>
                <p>${results.error}</p>
            `;
            return;
        }

        const topMeasurements = Object.entries(results.measurements)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        resultsContainer.innerHTML = `
            <h4 style="color: #06b6d4; margin: 0 0 10px 0;">Circuit Results</h4>
            <div style="margin-bottom: 10px;">
                <strong>Measurements (1000 samples):</strong>
                ${topMeasurements.map(([state, count]) =>
            `<div>${state}: ${count} (${(count / 10).toFixed(1)}%)</div>`
        ).join('')}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Metrics:</strong>
                <div>Fidelity: ${(results.fidelity * 100).toFixed(1)}%</div>
                <div>Entanglement: ${results.entanglement.toFixed(1)}%</div>
            </div>
            <div style="font-size: 10px; color: #94a3b8;">
                Circuit depth: ${results.circuit.length} gates
            </div>
        `;
    }

    addVisualIndicators() {
        // Add a simple grid or reference object to confirm 3D scene is working
        const gridGeometry = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
        gridGeometry.position.set(0, -2, 0);
        this.scene.add(gridGeometry);

        // Add some reference axes
        const axesHelper = new THREE.AxesHelper(2);
        axesHelper.position.set(-2, -2, -2);
        this.scene.add(axesHelper);

        // Add a simple cube to show 3D space is working
        const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
        const cubeMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3 });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.set(1, 0, 0);
        this.scene.add(cube);

        console.log('Visual indicators added to scene');
    }

    clearCircuit() {
        if (this.circuitBuilder) {
            this.circuitBuilder.clear();
        }
    }
}

// ==================== IBM INTEGRATION ====================

class UnifiedIBMIntegration {
    constructor() {
        this.apiToken = null;
        this.hub = 'ibm-q';
        this.group = 'open';
        this.project = 'main';
        this.provider = null;
        this.backend = null;
        this.jobs = new Map();
        this.isConnected = false;

        // Dynamically resolve Qiskit global
        this.Q = window.Qiskit || window.qiskit || null;

        // Attempt auto-load saved credentials
        const saved = localStorage.getItem('ibmCredsX');
        if (saved) {
            try {
                const parsed = JSON.parse(this._xorDecode(saved));
                if (parsed.token) {
                    this.connect(parsed.token, parsed.hub, parsed.group, parsed.project);
                }
            } catch (e) { console.warn('Stored IBM creds invalid', e); }
        }

        // Setup histogram resize observer
        this.setupHistogramResize();
        this._lastCounts = null;
    }

    setupHistogramResize() {
        const canvas = document.getElementById('resultsHistogram');
        if (!canvas || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => {
            if (this._lastCounts) this.updateResultsHistogram(this._lastCounts);
        });
        observer.observe(canvas);
    }

    async initializeQiskit() {
        try {
            if (!this.Q) {
                console.warn('Qiskit SDK not detected');
                this.updateJobStatus('Qiskit SDK not available', 'error');
                return;
            }

            // Ensure credentials are loaded/valid; enable_account returns provider
            this.provider = await this.Q.IBMQ.enable_account();
            this.isConnected = true;
            this.updateJobStatus('Connected to IBM Quantum', 'success');
            this.loadAvailableBackends();
        } catch (error) {
            console.error('Failed to initialize IBM Quantum:', error);
            this.updateJobStatus('Connection failed', 'error');
        }
    }

    async connect(apiToken, hub = 'ibm-q', group = 'open', project = 'main') {
        try {
            this.apiToken = apiToken;
            this.hub = hub;
            this.group = group;
            this.project = project;

            if (this.Q) {
                // Save credentials
                await this.Q.IBMQ.save_account(apiToken, hub, group, project);

                // Load account
                this.provider = await this.Q.IBMQ.load_account();
                this.isConnected = true;

                this.updateJobStatus('Connected to IBM Quantum', 'success');
                this.loadAvailableBackends();

                // Persist credentials
                localStorage.setItem('ibmCredsX', this._xorEncode(JSON.stringify({ token: apiToken, hub, group, project })));

                return true;
            } else {
                throw new Error('Qiskit.js not available');
            }
        } catch (error) {
            console.error('IBM Quantum connection failed:', error);
            this.updateJobStatus('Connection failed: ' + error.message, 'error');
            return false;
        }
    }

    async loadAvailableBackends() {
        try {
            if (!this.provider) return;

            const backends = await this.provider.backends();
            console.log('Available backends:', backends);

            // Update device selector
            this.updateDeviceSelector(backends);
        } catch (error) {
            console.error('Failed to load backends:', error);
        }
    }

    updateDeviceSelector(backends) {
        const selector = document.getElementById('deviceSelectCustom');
        if (!selector) return;

        const menu = selector.querySelector('.dropdown-menu');
        if (!menu) return;

        // Clear existing options except the first
        while (menu.children.length > 1) {
            menu.removeChild(menu.lastChild);
        }

        // Add backend options
        backends.forEach(backend => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" data-value="${backend.name()}">${backend.name()} (${backend.configuration().n_qubits} qubits)</a>`;
            menu.appendChild(li);
        });

        // Update label
        const label = selector.querySelector('.dropdown-label');
        if (label) {
            label.textContent = backends.length > 0 ? backends[0].name() : 'Local Simulator';
        }
    }

    async submitCircuit(circuit, backendName = null) {
        try {
            if (!this.isConnected) {
                throw new Error('Not connected to IBM Quantum');
            }

            const backend = backendName ? this.provider.get_backend(backendName) :
                this.provider.backends()[0];

            // Convert circuit to Qiskit format
            const qiskitCircuit = this.convertToQiskitCircuit(circuit);

            // Submit job
            const job = await backend.run(qiskitCircuit, { shots: 1024 });

            // Store job
            const jobId = job.job_id();
            this.jobs.set(jobId, {
                job: job,
                circuit: circuit,
                submittedAt: new Date(),
                status: 'running'
            });

            this.updateJobStatus(`Job ${jobId} submitted`, 'running');

            // Monitor job
            this.monitorJob(jobId);

            return jobId;
        } catch (error) {
            console.error('Failed to submit circuit:', error);
            this.updateJobStatus('Job submission failed: ' + error.message, 'error');
            return null;
        }
    }

    convertToQiskitCircuit(circuit) {
        // Convert our circuit format to Qiskit
        // This is a simplified conversion
        if (!this.Q) throw new Error('Qiskit not available');

        const qCircuit = new this.Q.QuantumCircuit(circuit.length || 3);

        circuit.forEach(gate => {
            switch (gate.gate) {
                case 'X':
                    qCircuit.x(gate.qubit);
                    break;
                case 'Y':
                    qCircuit.y(gate.qubit);
                    break;
                case 'Z':
                    qCircuit.z(gate.qubit);
                    break;
                case 'H':
                    qCircuit.h(gate.qubit);
                    break;
                case 'CNOT':
                    qCircuit.cnot(gate.control, gate.target);
                    break;
                // Add more gate conversions as needed
            }
        });

        return qCircuit;
    }

    async monitorJob(jobId) {
        const jobData = this.jobs.get(jobId);
        if (!jobData) return;

        try {
            const status = await jobData.job.status();

            if (status === 'DONE') {
                const result = await jobData.job.result();
                const counts = result.get_counts();

                jobData.status = 'completed';
                jobData.result = counts;

                this.updateJobStatus(`Job ${jobId} completed`, 'success');
                this.updateResultsHistogram(counts);

                // Store results
                this._lastCounts = counts;

            } else if (status === 'ERROR') {
                jobData.status = 'error';
                this.updateJobStatus(`Job ${jobId} failed`, 'error');

            } else {
                // Still running, check again later
                setTimeout(() => this.monitorJob(jobId), 5000);
            }
        } catch (error) {
            console.error('Error monitoring job:', error);
            this.updateJobStatus(`Error monitoring job ${jobId}`, 'error');
        }
    }

    updateJobStatus(message, status) {
        const statusElement = document.getElementById('jobStatus');
        if (!statusElement) return;

        const indicator = statusElement.querySelector('.status-indicator i');
        const text = statusElement.querySelector('.status-indicator span');
        const details = statusElement.querySelector('.job-details');

        if (indicator && text) {
            text.textContent = message;

            switch (status) {
                case 'success':
                    indicator.className = 'fas fa-check-circle';
                    indicator.style.color = '#10b981';
                    break;
                case 'error':
                    indicator.className = 'fas fa-times-circle';
                    indicator.style.color = '#ef4444';
                    break;
                case 'running':
                    indicator.className = 'fas fa-spinner fa-spin';
                    indicator.style.color = '#f59e0b';
                    break;
                default:
                    indicator.className = 'fas fa-circle';
                    indicator.style.color = '#6b7280';
            }
        }

        if (details) {
            details.textContent = message;
        }
    }

    updateResultsHistogram(counts) {
        const canvas = document.getElementById('resultsHistogram');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Simple histogram drawing
        const entries = Object.entries(counts);
        const maxCount = Math.max(...entries.map(([_, count]) => count));
        const barWidth = canvas.width / entries.length;

        entries.forEach(([state, count], index) => {
            const barHeight = (count / maxCount) * (canvas.height - 40);
            const x = index * barWidth;
            const y = canvas.height - barHeight - 20;

            // Draw bar
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(x + 5, y, barWidth - 10, barHeight);

            // Draw label
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(state, x + barWidth / 2, canvas.height - 5);

            // Draw count
            ctx.fillText(count.toString(), x + barWidth / 2, y - 5);
        });
    }

    _xorEncode(text) {
        const key = 'quantumVisualizer2024';
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(result);
    }

    _xorDecode(encoded) {
        const key = 'quantumVisualizer2024';
        const decoded = atob(encoded);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    }
}

// ==================== MAIN APPLICATION ====================

class UnifiedQuantumCircuitApp {
    constructor() {
        this.visualization = null;
        this.quantumSimulator = null;
        this.circuitBuilder = null;
        this.blochSphere = null;
        this.ibmIntegration = null;

        this.isRunning = false;
        this.currentStep = 0;
        this.circuitSteps = [];
        this.threeJS = null;

        // Initialize asynchronously
        this.initializeAsync();
    }

    async initializeAsync() {
        try {
            console.log('Starting async Unified Quantum Circuit App initialization...');

            // Ensure Three.js is loaded
            console.log('Ensuring Three.js is loaded...');
            this.threeJS = await ensureThreeJSLoaded(15000);
            console.log('Three.js loaded successfully (v' + this.threeJS.REVISION + ')');

            // Now proceed with the rest of initialization
            await this.initialize();

        } catch (error) {
            console.error('Failed to initialize Unified Quantum Circuit App:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    async initialize() {
        try {
            console.log('Starting Unified Quantum Circuit App initialization...');

            // Three.js is already loaded and available as this.threeJS
            console.log('Three.js already loaded (v' + this.threeJS.REVISION + ')');

            // Check if canvas element exists
            const canvas = document.getElementById('quantumCanvas');
            if (!canvas) {
                throw new Error('Canvas element not found. Please check the HTML structure.');
            }
            console.log('Canvas element found');

            // Initialize main visualization
            console.log('Initializing visualization...');
            this.visualization = new QuantumVisualization();
            console.log('Visualization created:', this.visualization);

            // Get references to components
            this.quantumSimulator = this.visualization.quantumSimulator;
            this.circuitBuilder = this.visualization.circuitBuilder;
            this.blochSphere = this.visualization.blochGroup;
            this.ibmIntegration = new UnifiedIBMIntegration();

            // Setup event listeners
            console.log('Setting up event listeners...');
            this.setupEventListeners();

            // Initialize UI
            console.log('Initializing UI...');
            this.initializeUI();

            console.log('Unified Quantum Circuit Visualizer initialized successfully');

            // Setup mouse listeners for gate selection and deletion
            if (this.circuitBuilder && typeof this.circuitBuilder.setupMouseListeners === 'function') {
                this.circuitBuilder.setupMouseListeners();
                console.log('✅ Circuit builder mouse listeners setup');
            }

            // Add success indicator to canvas
            if (canvas) {
                canvas.style.border = '2px solid #00d4ff';
                console.log('Canvas border updated to indicate success');
            }
        } catch (error) {
            console.error('Failed to initialize Unified Quantum Circuit App:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    showError(message) {
        // Hide loading overlay if it exists
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            loadingOverlay.innerHTML = `
                <div style="text-align: center; color: #ff6b6b; padding: 20px; max-width: 500px;">
                    <h3 style="margin-bottom: 15px; color: #ff6b6b;">🚫 Application Error</h3>
                    <p style="margin-bottom: 15px; line-height: 1.5;">${message}</p>
                    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin: 15px 0; text-align: left;">
                        <h4 style="color: #4ecdc4; margin-bottom: 10px;"> Troubleshooting Steps:</h4>
                        <ul style="color: #94a3b8; font-size: 0.9em; line-height: 1.6;">
                            <li>• Check your internet connection</li>
                            <li>• Try refreshing the page (Ctrl+F5)</li>
                            <li>• Disable ad blockers or VPN temporarily</li>
                            <li>• Check browser console (F12) for detailed errors</li>
                        </ul>
                    </div>
                    <div style="margin-top: 20px;">
                        <button onclick="location.reload()" style="padding: 12px 24px; background: #4ecdc4; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 10px; font-weight: 500;">🔄 Reload Page</button>
                        <button onclick="window.open('https://threejs.org/docs/', '_blank')" style="padding: 12px 24px; background: #ff6b6b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">📖 Three.js Help</button>
                    </div>
                </div>
            `;
        }

        // Also log to console
        console.error('Application Error:', message);

        // Log diagnostic information
        console.log('=== DIAGNOSTIC INFORMATION ===');
        console.log('THREE object:', typeof THREE !== 'undefined' ? 'Loaded (v' + THREE.REVISION + ')' : 'Not loaded');
        console.log('Canvas element:', document.getElementById('quantumCanvas') ? 'Found' : 'Not found');
        console.log('Container element:', document.getElementById('canvas-container') ? 'Found' : 'Not found');
        console.log('User agent:', navigator.userAgent);
        console.log('============================');
    }

    showWebGLError() {
        const container = document.getElementById('canvas-container');
        if (container) {
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ff6b6b; text-align: center; padding: 20px;">
                    <h3 style="margin-bottom: 15px; color: #ff6b6b;">🌐 WebGL Not Available</h3>
                    <p style="margin-bottom: 15px; line-height: 1.5;">Your browser doesn't support WebGL, which is required for 3D visualization.</p>
                    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin: 15px 0; text-align: left;">
                        <h4 style="color: #4ecdc4; margin-bottom: 10px;"> Solutions:</h4>
                        <ul style="color: #94a3b8; font-size: 0.9em; line-height: 1.6;">
                            <li>• Update your browser to the latest version</li>
                            <li>• Enable hardware acceleration in browser settings</li>
                            <li>• Try using Chrome, Firefox, or Edge</li>
                            <li>• Check if graphics drivers are up to date</li>
                        </ul>
                    </div>
                    <div style="margin-top: 20px;">
                        <button onclick="location.reload()" style="padding: 12px 24px; background: #4ecdc4; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 10px; font-weight: 500;">🔄 Try Again</button>
                        <button onclick="window.open('https://get.webgl.org/', '_blank')" style="padding: 12px 24px; background: #ff6b6b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">🧪 Test WebGL</button>
                    </div>
                </div>
            `;
        }
    }


    setupEventListeners() {
        // Circuit controls
        this.addEventListener('runCircuit', () => this.runCircuit());
        this.addEventListener('clearCircuit', () => this.clearCircuit());
        this.addEventListener('saveCircuit', () => this.saveCircuit());
        this.addEventListener('loadCircuit', () => this.loadCircuit());

        // Camera controls
        this.addEventListener('resetCamera', () => this.resetCamera());
        this.addEventListener('toggleAnimation', () => this.toggleAnimation());

        // Overlay camera controls
        this.addEventListener('resetCameraOverlay', () => this.resetCamera());
        this.addEventListener('toggleAnimationOverlay', () => this.toggleAnimation());

        // Settings
        this.addEventListener('settingsBtn', () => this.openSettings());
        this.addEventListener('closeSettings', () => this.closeSettings());

        // Device selection
        this.addEventListener('deviceSelect', (e) => this.changeDevice(e.target.value));
    }

    addEventListener(eventId, callback) {
        const element = document.getElementById(eventId);
        if (element) {
            element.addEventListener('click', callback.bind(this));
        }
    }

    initializeUI() {
        // Update circuit info display
        if (this.parentApp && typeof this.parentApp.updateCircuitInfo === 'function') {
            this.parentApp.updateCircuitInfo();
        } else {
            console.log('Parent app updateCircuitInfo not available, skipping...');
        }
    }

    updateCircuitInfo() {
        console.log('updateCircuitInfo called, circuit data:', this.circuitData?.name);

        // Check for both naming conventions
        const circuitName = document.getElementById('circuit-name');
        const mainCircuitName = document.getElementById('main-circuit-name');
        const circuitTitle = document.getElementById('circuit-title');
        const circuitDescription = document.getElementById('circuit-description');
        const qubitCount = document.getElementById('qubitCount') || document.getElementById('circuit-qubits');
        const circuitDepth = document.getElementById('circuitDepth') || document.getElementById('circuit-depth');
        const gateCount = document.getElementById('gateCount') || document.getElementById('circuit-gates');
        const gateList = document.getElementById('gate-list');

        console.log('DOM elements found:', {
            circuitName: !!circuitName,
            circuitDescription: !!circuitDescription,
            qubitCount: !!qubitCount,
            circuitDepth: !!circuitDepth,
            gateCount: !!gateCount
        });

        let circuit = [];

        if (this.circuitBuilder && typeof this.circuitBuilder.getCircuit === 'function') {
            circuit = this.circuitBuilder.getCircuit();
            console.log('  Circuit from getCircuit():', circuit);
        } else if (this.circuitBuilder && this.circuitBuilder.circuit) {
            // Fallback to direct circuit access
            circuit = this.circuitBuilder.circuit || [];
            console.log('  Circuit from direct access:', circuit);
        } else {
            console.warn(' Circuit builder not available or getCircuit method missing');
            circuit = [];
            console.log('  Using empty circuit as fallback');
        }

        // Update circuit name and description if available
        if (this.circuitData && this.circuitData.name) {
            // Update prominent circuit name display
            if (mainCircuitName && circuitTitle) {
                mainCircuitName.textContent = this.circuitData.name;
                circuitTitle.style.display = 'block';
            }

            if (circuitName) {
                const name = this.circuitData.name;
                circuitName.textContent = name.length > 20 ? name.substring(0, 17) + '...' : name;
            }

            if (circuitDescription) {
                const description = this.circuitData.description;
                circuitDescription.textContent = description.length > 25 ? description.substring(0, 22) + '...' : description;
            }
        }

        // Update basic circuit info using circuit data
        if (qubitCount && this.circuitData?.qubits) {
            qubitCount.textContent = this.circuitData.qubits;
        }
        if (circuitDepth && this.circuitData?.depth) {
            circuitDepth.textContent = this.circuitData.depth;
        }
        if (gateCount && this.circuitData?.gates) {
            gateCount.textContent = this.circuitData.gates.length;
        }

        // Update circuit name (determine from gates or use default)
        if (circuitName) {
            let name = 'Custom Circuit';
            if (circuit.length === 0) {
                name = 'Empty Circuit';
            } else if (this.isBellState(circuit)) {
                name = 'Bell State';
            } else if (this.isGHZState(circuit)) {
                name = 'GHZ State';
            }
            circuitName.textContent = name;
        }

        // Update gate list
        if (gateList) {
            if (circuit.length === 0) {
                gateList.textContent = 'None';
            } else {
                const gateNames = circuit.map(gate => `${gate.gate} (q${gate.qubit || 0})`);
                gateList.textContent = gateNames.join(', ');
            }
        }
    }

    runCircuit() {
        if (this.visualization) {
            this.visualization.runCircuit();
            if (this.parentApp && typeof this.parentApp.updateCircuitInfo === 'function') {
                this.parentApp.updateCircuitInfo();
            } else {
                console.log('Parent app updateCircuitInfo not available, skipping...');
            }
        }
    }

    clearCircuit() {
        if (this.visualization) {
            this.visualization.clearCircuit();
            if (this.parentApp && typeof this.parentApp.updateCircuitInfo === 'function') {
                this.parentApp.updateCircuitInfo();
            } else {
                console.log('Parent app updateCircuitInfo not available, skipping...');
            }
        }
    }

    saveCircuit() {
        if (!this.circuitBuilder) return;

        const circuit = this.circuitBuilder.getCircuit();
        const circuitData = {
            qubits: this.quantumSimulator ? this.quantumSimulator.qubits : 3,
            gates: circuit,
            timestamp: new Date().toISOString()
        }

        const dataStr = JSON.stringify(circuitData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'quantum_circuit.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    loadCircuit() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const circuitData = JSON.parse(event.target.result);
                        this.loadCircuitData(circuitData);
                    } catch (error) {
                        console.error('Error loading circuit:', error);
                        alert('Error loading circuit file');
                    }
                }
                reader.readAsText(file);
            }
        }
        input.click();
    }

    loadCircuitData(circuitData) {
        console.log('📥 loadCircuitData called with:', circuitData);
        if (!this.circuitBuilder) {
            console.error(' Circuit builder not available in loadCircuitData');
            return;
        }

        console.log('📥 Loading circuit data in visualization:', circuitData);

        // Store circuit data for later use (name, description, etc.)
        this.circuitData = circuitData;
        console.log('📥 Stored circuit data:', this.circuitData);

        // Clear current circuit
        console.log('📥 Clearing existing circuit before loading new one');
        this.clearCircuit();
        console.log('📥 Circuit cleared, now has', this.circuit.length, 'gates');

        // Load gates
        if (circuitData.gates && Array.isArray(circuitData.gates)) {
            console.log('📥 Processing', circuitData.gates.length, 'gates');
            let loadedGates = 0;
            let failedGates = [];

            circuitData.gates.forEach((gate, index) => {
                console.log('📥 Processing gate', index, ':', gate);
                let position;

                // Handle different gate formats - prioritize depth-based positioning
                if (gate.depth !== undefined && gate.qubits && gate.qubits.length > 0) {
                    // New AI format with depth and qubits
                    const x = gate.depth * 2; // Horizontal position based on depth
                    const y = gate.qubits[0] * 1.5; // Vertical position based on first qubit
                    const z = 0; // Depth
                    position = new THREE.Vector3(x, y, z);
                    console.log('📥 Using depth-based position for gate:', position);
                } else if (gate.position) {
                    // Visualizer format with position
                    position = new THREE.Vector3(
                        gate.position.x,
                        gate.position.y,
                        gate.position.z
                    );
                    console.log('📥 Using position from gate data:', position);
                } else if (gate.qubits && gate.qubits.length > 0) {
                    // Fallback: Calculate position based on index and qubits
                    const x = index * 2; // Horizontal position
                    const y = gate.qubits[0] * 1.5; // Vertical position based on first qubit
                    const z = 0; // Depth
                    position = new THREE.Vector3(x, y, z);
                    console.log('📥 Calculated position for gate:', position);
                } else {
                    // Final fallback position
                    position = new THREE.Vector3(index * 2, 0, 0);
                    console.log('📥 Using fallback position:', position);
                }

                console.log('📥 Adding gate:', gate.gate, 'at position:', position);
                const gateMesh = this.circuitBuilder.addGate(gate.gate, position);
                if (gateMesh) {
                    loadedGates++;
                    console.log('📥 Gate loaded successfully:', gate.gate);
                } else {
                    failedGates.push(gate.gate);
                    console.warn('📥 Failed to load gate:', gate.gate, 'at position:', position);
                }
            });

            // Summary of loading results
            console.log('📥 Circuit loading complete:');
            console.log('📥 - Successfully loaded:', loadedGates, 'gates');
            if (failedGates.length > 0) {
                console.warn('📥 - Failed to load:', failedGates.length, 'gates:', failedGates);
            }
        } else {
            console.warn(' No gates found in circuit data');
        }

        console.log('📥 Finished loading gates, circuit now has', this.circuit.length, 'gates');
        console.log('📥 Current circuit state:', this.circuit);

        // Update qubits if specified
        if (circuitData.qubits && circuitData.qubits !== this.circuitBuilder.qubits) {
            console.log('Updating qubits to:', circuitData.qubits);
            this.circuitBuilder.qubits = circuitData.qubits;
            this.circuitBuilder.updateQubits();
        }

        console.log('📥 Calling updateCircuitInfo');
        if (this.parentApp && typeof this.parentApp.updateCircuitInfo === 'function') {
            this.parentApp.updateCircuitInfo();
        } else {
            console.log('Parent app updateCircuitInfo not available, skipping...');
        }
    }

    resetCamera() {
        if (this.visualization) {
            this.visualization.resetCamera();
        }
    }

    toggleAnimation() {
        if (this.visualization) {
            this.visualization.toggleAnimation();
        }
    }

    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    changeDevice(deviceName) {
        console.log('Changing device to:', deviceName);
        // Device change logic would go here
    }

    // Helper methods to detect common circuit patterns
    isBellState(circuit) {
        if (circuit.length !== 2) return false;
        const gates = circuit.map(g => g.gate);
        return (gates.includes('H') && gates.includes('CNOT')) ||
            (gates.includes('H') && gates.includes('CX'));
    }

    isGHZState(circuit) {
        if (circuit.length < 3) return false;
        const gates = circuit.map(g => g.gate);
        const hCount = gates.filter(g => g === 'H').length;
        const cnotCount = gates.filter(g => g === 'CNOT' || g === 'CX').length;
        return hCount >= 1 && cnotCount >= 2;
    }
}

// ==================== INITIALIZATION ====================

window.initUnified3DQuantumCircuit = function (containerId = 'canvas-container') {
    return new Promise((resolve, reject) => {
        console.log('Initializing Unified 3D Quantum Circuit...');

        // SINGLETON CHECK: If app already exists, don't recreate it
        if (window.unifiedQuantumApp) {
            console.log('🔄 UnifiedQuantumApp already exists, returning existing instance');
            resolve(window.unifiedQuantumApp);
            return;
        }

        let unifiedCircuitContainer = document.getElementById(containerId);
        if (!unifiedCircuitContainer) {
            console.error('Container not found, trying fallback selectors...');
            // Try alternative container IDs
            unifiedCircuitContainer = document.getElementById('3d-quantum-circuit') ||
                document.querySelector('.canvas-container') ||
                document.body;
        }

        if (!unifiedCircuitContainer) {
            console.error('No suitable container found');
            reject(new Error('No suitable container found'));
            return;
        }

        console.log('Container found:', unifiedCircuitContainer);

        // Ensure proper styling
        unifiedCircuitContainer.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
        unifiedCircuitContainer.style.color = 'white';
        unifiedCircuitContainer.style.position = 'relative';
        unifiedCircuitContainer.style.overflow = 'hidden';
        unifiedCircuitContainer.style.minHeight = '400px';
        unifiedCircuitContainer.style.borderRadius = '8px';

        // Clear any existing content
        unifiedCircuitContainer.innerHTML = '';

        // Create the quantum canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'quantumCanvas';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        unifiedCircuitContainer.appendChild(canvas);

        // Create canvas overlay
        const canvasOverlay = document.createElement('div');
        canvasOverlay.className = 'canvas-overlay';
        canvasOverlay.style.cssText = `
        position: absolute;
        top: 1rem;
        left: 1rem;
        right: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        pointer-events: none;
    `;

        // Create circuit info
        const circuitInfo = document.createElement('div');
        circuitInfo.className = 'circuit-info';
        circuitInfo.style.cssText = `
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(6, 182, 212, 0.3);
        border-radius: 8px;
        padding: 1rem;
        display: flex;
        gap: 2rem;
        pointer-events: auto;
    `;

        // Qubits info
        const qubitsItem = document.createElement('div');
        qubitsItem.className = 'info-item';
        qubitsItem.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
            <span class="label" style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.25rem;">Qubits</span>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button onclick="changeQubits(-1)" style="padding: 2px 8px; font-size: 14px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">−</button>
                <span class="value" id="qubitCount" style="font-size: 1.5rem; font-weight: 600; color: #06b6d4; min-width: 20px;">3</span>
                <button onclick="changeQubits(1)" style="padding: 2px 8px; font-size: 14px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">+</button>
            </div>
        </div>
    `;

        // Depth info
        const depthItem = document.createElement('div');
        depthItem.className = 'info-item';
        depthItem.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
            <span class="label" style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.25rem;">Depth</span>
            <span class="value" id="circuitDepth" style="font-size: 1.5rem; font-weight: 600; color: #06b6d4;">0</span>
        </div>
    `;

        // Gates info
        const gatesItem = document.createElement('div');
        gatesItem.className = 'info-item';
        gatesItem.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
            <span class="label" style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.25rem;">Gates</span>
            <span class="value" id="gateCount" style="font-size: 1.5rem; font-weight: 600; color: #06b6d4;">0</span>
        </div>
    `;

        circuitInfo.appendChild(qubitsItem);
        circuitInfo.appendChild(depthItem);
        circuitInfo.appendChild(gatesItem);

        // Create camera controls
        const cameraControls = document.createElement('div');
        cameraControls.className = 'camera-controls';
        cameraControls.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    `;

        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn btn-ghost';
        resetBtn.id = 'resetCameraOverlay';
        resetBtn.innerHTML = '<i class="fas fa-home"></i>';
        resetBtn.style.cssText = `
        padding: 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: transparent;
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
    `;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn btn-ghost';
        toggleBtn.id = 'toggleAnimationOverlay';
        toggleBtn.innerHTML = '<i class="fas fa-pause"></i>';
        toggleBtn.style.cssText = `
        padding: 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: transparent;
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
    `;

        cameraControls.appendChild(resetBtn);
        cameraControls.appendChild(toggleBtn);

        canvasOverlay.appendChild(circuitInfo);
        canvasOverlay.appendChild(cameraControls);
        unifiedCircuitContainer.appendChild(canvasOverlay);

        // Create Bloch spheres container
        const blochContainer = document.createElement('div');
        blochContainer.id = 'blochSpheresContainer';
        blochContainer.style.display = 'none'; // Hidden by default, can be shown in sidebar
        unifiedCircuitContainer.appendChild(blochContainer);

        // Initialize the unified app
        try {
            console.log('Creating UnifiedQuantumCircuitApp instance...');
            unifiedQuantumApp = new UnifiedQuantumCircuitApp();

            // Wait for the app to be fully initialized (Three.js loaded and ready)
            const waitForInitialization = () => {
                const checkInit = () => {
                    return unifiedQuantumApp && unifiedQuantumApp.threeJS && unifiedQuantumApp.visualization;
                }

                if (checkInit()) {
                    // Export to window for global access
                    window.unifiedQuantumApp = unifiedQuantumApp;
                    console.log(' UnifiedQuantumApp exported to window');

                    // Hide loading overlay if it exists
                    const loadingOverlay = document.getElementById('loadingOverlay');
                    if (loadingOverlay) {
                        loadingOverlay.style.display = 'none';
                    }

                    // Signal to parent that initialization is complete
                    if (window.parent !== window) {
                        window.parent.postMessage({
                            type: '3dVisualizerReady',
                            status: 'success'
                        }, '*');
                    }

                    resolve(unifiedQuantumApp);
                    return;
                }

                // Poll for initialization
                const initInterval = setInterval(() => {
                    if (checkInit()) {
                        clearInterval(initInterval);
                        // Export to window for global access
                        window.unifiedQuantumApp = unifiedQuantumApp;
                        console.log(' UnifiedQuantumApp exported to window');

                        // Hide loading overlay if it exists
                        const loadingOverlay = document.getElementById('loadingOverlay');
                        if (loadingOverlay) {
                            loadingOverlay.style.display = 'none';
                        }

                        // Signal to parent that initialization is complete
                        if (window.parent !== window) {
                            window.parent.postMessage({
                                type: '3dVisualizerReady',
                                status: 'success'
                            }, '*');
                        }

                        resolve(unifiedQuantumApp);
                    }
                }, 100);
            }

            waitForInitialization();
            console.log('Unified 3D Circuit initialized successfully');

        } catch (error) {
            console.error('Failed to initialize unified circuit:', error);
            unifiedCircuitContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ff6b6b; text-align: center; padding: 20px;">
                <h3>3D Circuit Failed to Load</h3>
                <p>Error: ${error.message}</p>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #4ecdc4; color: white; border: none; border-radius: 5px; cursor: pointer;">Retry</button>
            </div>
        `;

            // Signal error to parent
            if (window.parent !== window) {
                window.parent.postMessage({
                    type: '3dVisualizerReady',
                    status: 'error',
                    error: error.message
                }, '*');
            }

            reject(error);
        }
    });
}

// Global functions for UI interaction
window.changeQubits = function (delta) {
    if (window.unifiedQuantumApp && window.unifiedQuantumApp.circuitBuilder) {
        if (delta > 0) {
            window.unifiedQuantumApp.circuitBuilder.addQubit();
        } else {
            window.unifiedQuantumApp.circuitBuilder.removeQubit();
        }
    }
};

// Gate name mapping for AI-generated circuit names
function mapGateName(gateName) {
    const gateMapping = {
        // Direct gate names (what backend returns)
        'H': 'H',
        'X': 'X',
        'Y': 'Y',
        'Z': 'Z',
        'S': 'S',
        'T': 'T',
        'I': 'I',
        'RX': 'RX',
        'RY': 'RY',
        'RZ': 'RZ',
        'CNOT': 'CNOT',
        'CZ': 'CZ',
        'SWAP': 'SWAP',

        // Single qubit gates (verbose names)
        'Pauli-X': 'X',
        'Pauli-Y': 'Y',
        'Pauli-Z': 'Z',
        'pauli-x': 'X',
        'pauli-y': 'Y',
        'pauli-z': 'Z',
        'PauliX': 'X',
        'PauliY': 'Y',
        'PauliZ': 'Z',
        'pauliX': 'X',
        'pauliY': 'Y',
        'pauliZ': 'Z',
        'Hadamard': 'H',
        'hadamard': 'H',
        'HadamardH': 'H',
        'hadamardH': 'H',
        'SGate': 'S',
        'sGate': 'S',
        'S Gate': 'S',
        'T Gate': 'T',
        'TGate': 'T',
        'tGate': 'T',
        'RotationX': 'RX',
        'RotationY': 'RY',
        'RotationZ': 'RZ',
        'rotationX': 'RX',
        'rotationY': 'RY',
        'rotationZ': 'RZ',
        'RotX': 'RX',
        'RotY': 'RY',
        'RotZ': 'RZ',

        // Two qubit gates
        'CNOT': 'CNOT',
        'Controlled-NOT': 'CNOT',
        'controlled-not': 'CNOT',
        'ControlledNot': 'CNOT',
        'controlledNot': 'CNOT',
        'CX': 'CNOT',
        'cx': 'CNOT',
        'ControlledZ': 'CZ',
        'controlledZ': 'CZ',
        'Controlled-Z': 'CZ',
        'controlled-z': 'CZ',
        'CZGate': 'CZ',
        'czGate': 'CZ',
        'SWAP': 'SWAP',
        'swap': 'SWAP',
        'SwapGate': 'SWAP',
        'swapGate': 'SWAP',

        // Measurement
        'Measure': 'MEASURE',
        'measure': 'MEASURE',
        'Measurement': 'MEASURE',
        'measurement': 'MEASURE',
        'MEAS': 'MEASURE',
        'meas': 'MEASURE'
    }

    // Try direct mapping first
    if (gateMapping[gateName]) {
        return gateMapping[gateName];
    }

    // Try case-insensitive mapping
    const lowerGateName = gateName.toLowerCase();
    for (const [key, value] of Object.entries(gateMapping)) {
        if (key.toLowerCase() === lowerGateName) {
            return value;
        }
    }

    // If no mapping found, return original name and log warning
    console.warn(' Unknown gate type:', gateName, 'keeping original name');
    return gateName;
}

window.loadCircuitIn3D = function (circuitData) {
    try {
        console.log('🚀 loadCircuitIn3D called with data:', circuitData);

        if (!circuitData) {
            console.error(' No circuit data provided');
            return;
        }

        console.log('🚀 Circuit data structure:', {
            hasGates: circuitData.gates && Array.isArray(circuitData.gates),
            gateCount: circuitData.gates ? circuitData.gates.length : 0,
            hasName: !!circuitData.name,
            hasQubits: !!circuitData.qubits
        });

        if (window.unifiedQuantumApp && window.unifiedQuantumApp.circuitBuilder) {
            console.log('Unified app and circuit builder found');
            // Convert AI circuit format to visualizer format
            console.log('🚀 Converting circuit data to visualizer format');
            console.log('🚀 Original circuit data:', circuitData);

            if (circuitData.gates && Array.isArray(circuitData.gates)) {
                console.log('🚀 Converting', circuitData.gates.length, 'gates to visualizer format');

                // Convert AI format to visualizer format
                const convertedGates = circuitData.gates.map((gate, index) => {
                    console.log('🚀 Converting gate', index, ':', gate);

                    // Map gate name to supported visualizer gate
                    const mappedGateName = mapGateName(gate.gate);
                    console.log('🚀 Mapped gate name:', gate.gate, '→', mappedGateName);

                    // Use depth if available, otherwise use index
                    const x = (gate.depth !== undefined) ? gate.depth * 2 : index * 2;
                    const y = gate.qubits && gate.qubits[0] !== undefined ? gate.qubits[0] * 1.5 : 0;
                    const z = 0; // Depth

                    const convertedGate = {
                        gate: mappedGateName,
                        qubit: gate.qubits && gate.qubits[0] !== undefined ? gate.qubits[0] : 0,
                        depth: gate.depth !== undefined ? gate.depth : index,
                        qubits: gate.qubits || []
                    }

                    console.log('🚀 Converted gate:', convertedGate);
                    return convertedGate;
                });

                const visualizerFormat = {
                    qubits: circuitData.qubits || 2,
                    gates: convertedGates,
                    name: circuitData.name || 'AI Generated Circuit',
                    depth: circuitData.depth || circuitData.gates.length
                }

                console.log('🚀 Converted to visualizer format:', visualizerFormat);
                console.log('🚀 Visualizer format has', visualizerFormat.gates.length, 'gates');

                // Load circuit using the available method
                console.log('Attempting to load circuit into circuit builder');
                if (typeof window.unifiedQuantumApp.circuitBuilder.loadCircuit === 'function') {
                    console.log('Using loadCircuit method with visualizer format');
                    window.unifiedQuantumApp.circuitBuilder.loadCircuit(visualizerFormat);
                } else {
                    console.error('loadCircuit method not found on circuit builder');
                    console.log('Available methods:', Object.getOwnPropertyNames(window.unifiedQuantumApp.circuitBuilder));
                }

                // Update circuit info display after loading
                console.log('🚀 Updating circuit info display');
                if (window.unifiedQuantumApp && typeof window.unifiedQuantumApp.updateCircuitInfo === 'function') {
                    try {
                        window.unifiedQuantumApp.updateCircuitInfo();
                    } catch (error) {
                        console.error(' Error updating circuit info:', error);
                    }
                } else {
                    console.warn(' updateCircuitInfo method not available');
                }
            } else {
                console.error('Invalid circuit data format');
            }
        } else {
            console.error('Circuit builder not available');
            console.log('Available objects:', {
                unifiedQuantumApp: !!window.unifiedQuantumApp,
                circuitBuilder: !!(window.unifiedQuantumApp && window.unifiedQuantumApp.circuitBuilder)
            });

            // Try alternative approaches
            if (window.unifiedQuantumApp && window.unifiedQuantumApp.visualization && window.unifiedQuantumApp.visualization.circuitBuilder) {
                console.log('Trying alternative circuit builder path...');
                try {
                    window.unifiedQuantumApp.visualization.circuitBuilder.loadCircuit(circuitData);
                } catch (altError) {
                    console.error('Alternative circuit builder also failed:', altError);
                }
            }
        }
    } catch (error) {
        console.error(' Error in loadCircuitIn3D:', error);
    }
};

window.openCircuitIn3D = function (circuitData) {
    // Open circuit builder if not already open
    if (window.location.pathname !== '/circuit-builder') {
        // Store circuit data for loading after navigation
        sessionStorage.setItem('pendingCircuit', JSON.stringify(circuitData));
        window.location.href = '/circuit-builder';
    } else {
        // Already on circuit builder, load directly
        loadCircuitIn3D(circuitData);
    }
};

// Load pending circuit on page load
window.addEventListener('load', function () {
    const pendingCircuit = sessionStorage.getItem('pendingCircuit');
    if (pendingCircuit) {
        try {
            const circuitData = JSON.parse(pendingCircuit);
            loadCircuitIn3D(circuitData);
            sessionStorage.removeItem('pendingCircuit');
        } catch (error) {
            console.error('Error loading pending circuit:', error);
        }
    }
});

// Export functions and objects for global access
// Ensure no conflicts by checking if already defined
if (typeof window.initUnified3DQuantumCircuit === 'undefined') {
    window.initUnified3DQuantumCircuit = initUnified3DQuantumCircuit;
    console.log('initUnified3DQuantumCircuit function exported');
} else {
    console.warn('initUnified3DQuantumCircuit already defined, skipping export');
}

// Global Job Registry
window.activeQuantumJobs = window.activeQuantumJobs || {};

// Initialize Hide All button once
document.addEventListener('DOMContentLoaded', () => {
    const hideAllBtn = document.getElementById('hide-all-jobs-btn');
    if (hideAllBtn) {
        hideAllBtn.addEventListener('click', () => {
            const progressModal = document.getElementById('execution-progress');
            const miniContainer = document.getElementById('mini-progress-container');
            if (progressModal) progressModal.style.display = 'none';
            if (miniContainer) miniContainer.style.display = 'flex';
            
            // Mark all active jobs as minimized
            Object.keys(window.activeQuantumJobs).forEach(trackId => {
                window.activeQuantumJobs[trackId].minimized = true;
                const miniCard = document.getElementById(`mini-${trackId}`);
                if (miniCard) miniCard.style.display = 'flex';
                const card = document.getElementById(`card-${trackId}`);
                if (card) card.style.display = 'none';
            });
        });
    }
});

window.runIBMQuantumJob = async function () {
    console.log('🚀 Starting Quantum Job Submission...');

    // Check header provider selection first
    const headerProvider = document.getElementById('headerProviderSelect');
    const headerBackend = document.getElementById('headerBackendSelect');
    const selectedProvider = headerProvider ? headerProvider.value : 'ibm';
    const selectedBackend = headerBackend ? headerBackend.value : '';

    console.log(`📋 Header selection: Provider=${selectedProvider}, Backend=${selectedBackend}`);

    // If a non-IBM provider is selected, use the Run Circuit button logic instead
    if (selectedProvider !== 'ibm') {
        console.log(`🔄 Routing to ${selectedProvider} instead of IBM...`);
        // Trigger the header Run Circuit button click
        const runBtn = document.getElementById('runCircuit');
        if (runBtn) {
            runBtn.click();
            return;
        }
    }

    // 1. Get current circuit data
    if (!window.unifiedQuantumApp || !window.unifiedQuantumApp.circuitBuilder) {
        alert('Circuit builder not initialized');
        return;
    }

    const circuit = window.unifiedQuantumApp.circuitBuilder.getCircuit();
    if (!circuit || circuit.length === 0) {
        alert('Please build a circuit first!');
        return;
    }

    const qubits = window.unifiedQuantumApp.circuitBuilder.qubits;

    // Prepare circuit data for backend
    const circuitData = {
        qubits: qubits,
        gates: circuit.map(g => ({
            gate: g.gate,
            qubits: g.qubits || [g.qubit]
        })),
        name: '3D Builder Circuit',
        description: 'Created with 3D Quantum Circuit Builder'
    };

    // Enhance gate data for multi-qubit gates
    circuitData.gates = circuit.map(g => {
        const gateObj = {
            gate: g.gate,
            qubits: g.qubits || [g.qubit]
        };
        // Add parameters if any (e.g. rotation angles)
        if (g.params) gateObj.params = g.params;
        return gateObj;
    });

    // 2. Generate unique tracking ID and title
    const trackId = 'job-' + Date.now();
    const jobTitle = `Circuit #${Date.now().toString().slice(-4)} (${circuitData.qubits}Q, ${circuitData.gates.length}G)`;

    // 3. Create active job entry
    const abortController = new AbortController();
    window.activeQuantumJobs = window.activeQuantumJobs || {};
    window.activeQuantumJobs[trackId] = {
        trackId: trackId,
        title: jobTitle,
        minimized: false,
        controller: abortController,
        percent: 0,
        backend: selectedBackend || 'auto',
        elapsed: 0
    };

    // 4. Get Modal Containers
    const progressModal = document.getElementById('execution-progress');
    const jobsProgressList = document.getElementById('jobs-progress-list');
    const miniContainer = document.getElementById('mini-progress-container');

    // 5. Render Job Cards
    if (progressModal && jobsProgressList) {
        // Show main modal if not minimized
        progressModal.style.display = 'block';
        if (miniContainer) miniContainer.style.display = 'flex';

        // Inject Card HTML
        const cardHTML = `
            <div id="card-${trackId}" class="job-card" style="background: rgba(25, 25, 45, 0.85); border: 1px solid rgba(6, 182, 212, 0.4); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; transition: all 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                    <span style="color: #fff; font-size: 0.95rem; font-weight: 700;">${jobTitle}</span>
                    <span id="status-${trackId}" style="color: #06b6d4; font-size: 0.85rem; font-weight: 600;">Initializing...</span>
                </div>
                
                <div class="steps-container" style="display: flex; justify-content: space-between; position: relative; margin: 0.5rem 0;">
                    <div style="position: absolute; top: 15px; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.1); z-index: 0;"></div>
                    
                    <div class="step-item" id="step-transpilation-${trackId}" style="position: relative; z-index: 1; text-align: center; width: 25%;">
                        <div class="step-icon" style="width: 32px; height: 32px; background: #1a1a2e; border: 2px solid #334155; border-radius: 50%; margin: 0 auto 0.25rem; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.8rem; transition: all 0.3s ease;">
                           <i class="fas fa-code"></i>
                        </div>
                        <div style="font-size: 0.7rem; color: #94a3b8;">Transpile</div>
                    </div>

                    <div class="step-item" id="step-validation-${trackId}" style="position: relative; z-index: 1; text-align: center; width: 25%;">
                        <div class="step-icon" style="width: 32px; height: 32px; background: #1a1a2e; border: 2px solid #334155; border-radius: 50%; margin: 0 auto 0.25rem; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.8rem; transition: all 0.3s ease;">
                           <i class="fas fa-check-circle"></i>
                        </div>
                        <div style="font-size: 0.7rem; color: #94a3b8;">Validate</div>
                    </div>

                    <div class="step-item" id="step-execution-${trackId}" style="position: relative; z-index: 1; text-align: center; width: 25%;">
                        <div class="step-icon" style="width: 32px; height: 32px; background: #1a1a2e; border: 2px solid #334155; border-radius: 50%; margin: 0 auto 0.25rem; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.8rem; transition: all 0.3s ease;">
                           <i class="fas fa-microchip"></i>
                        </div>
                        <div style="font-size: 0.7rem; color: #94a3b8;">Execute</div>
                    </div>

                    <div class="step-item" id="step-analysis-${trackId}" style="position: relative; z-index: 1; text-align: center; width: 25%;">
                        <div class="step-icon" style="width: 32px; height: 32px; background: #1a1a2e; border: 2px solid #334155; border-radius: 50%; margin: 0 auto 0.25rem; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.8rem; transition: all 0.3s ease;">
                           <i class="fas fa-chart-bar"></i>
                        </div>
                        <div style="font-size: 0.7rem; color: #94a3b8;">Analyze</div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #94a3b8; padding: 0 0.1rem;">
                    <div>Backend: <span id="backend-${trackId}" style="color: #a855f7; font-weight: 600;">auto</span></div>
                    <div>Est. Queue: <span id="eta-${trackId}" style="color: #fbbf24; font-weight: 600;">Calculating...</span></div>
                </div>

                <div id="details-${trackId}" style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 8px; font-size: 0.8rem; color: #cbd5e1; min-height: 45px; display: flex; align-items: center; justify-content: center;">
                    Waiting to start...
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.25rem;">
                    <button id="cancel-${trackId}" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 0.4rem 1.25rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; transition: all 0.2s;">
                        Cancel
                    </button>
                    <button id="hide-${trackId}" style="background: rgba(6, 182, 212, 0.15); border: 1px solid #06b6d4; color: #06b6d4; padding: 0.4rem 1.25rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; transition: all 0.2s;">
                        Hide
                    </button>
                </div>
            </div>
        `;
        jobsProgressList.insertAdjacentHTML('beforeend', cardHTML);
    }

    // 6. Inject Mini Card HTML
    if (miniContainer) {
        const miniCardHTML = `
            <div id="mini-${trackId}" style="background: rgba(15, 15, 35, 0.95); border: 1px solid rgba(6, 182, 212, 0.5); border-radius: 12px; padding: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); cursor: pointer; backdrop-filter: blur(8px); display: none; flex-direction: column; gap: 0.5rem; pointer-events: auto; transition: all 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.8rem; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${jobTitle}</span>
                    <span id="mini-percent-${trackId}" style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">0%</span>
                </div>
                <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                    <div id="mini-progress-fill-${trackId}" style="width: 0%; height: 100%; background: linear-gradient(90deg, #06b6d4, #3b82f6); transition: width 0.3s ease;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.4rem; margin-top: 0.2rem;">
                    <span id="mini-backend-text-${trackId}"><i class="fas fa-server"></i> auto</span>
                    <span id="mini-eta-text-${trackId}"><i class="fas fa-clock"></i> Calculating...</span>
                </div>
            </div>
        `;
        miniContainer.insertAdjacentHTML('beforeend', miniCardHTML);
    }

    // 7. Bind Minimize / Maximize click events for this job
    const hideBtn = document.getElementById(`hide-${trackId}`);
    const cardEl = document.getElementById(`card-${trackId}`);
    const miniCardEl = document.getElementById(`mini-${trackId}`);
    const cancelBtn = document.getElementById(`cancel-${trackId}`);

    if (hideBtn) {
        hideBtn.onclick = function () {
            window.activeQuantumJobs[trackId].minimized = true;
            if (cardEl) cardEl.style.display = 'none';
            if (miniCardEl) miniCardEl.style.display = 'flex';
            
            // If all active jobs are minimized, hide the main progress modal
            const allMinimized = Object.values(window.activeQuantumJobs).every(job => job.minimized);
            if (allMinimized && progressModal) {
                progressModal.style.display = 'none';
            }
        };
    }

    if (miniCardEl) {
        miniCardEl.onclick = function () {
            window.activeQuantumJobs[trackId].minimized = false;
            if (miniCardEl) miniCardEl.style.display = 'none';
            if (cardEl) cardEl.style.display = 'flex';
            if (progressModal) progressModal.style.display = 'block';
        };
    }

    const cleanUpJobUi = () => {
        delete window.activeQuantumJobs[trackId];
        if (cardEl) cardEl.remove();
        if (miniCardEl) miniCardEl.remove();
        
        // Hide containers if no active jobs left
        if (Object.keys(window.activeQuantumJobs).length === 0) {
            if (progressModal) progressModal.style.display = 'none';
            if (miniContainer) miniContainer.style.display = 'none';
        }
    };

    if (cancelBtn) {
        cancelBtn.onclick = function () {
            abortController.abort();
            cleanUpJobUi();
        };
    }

    // Helper function to update single-job UI components
    function updateIndividualJobTracker(data) {
        // Update Step Icon
        const stepEl = document.getElementById(`step-${data.step}-${trackId}`);
        if (stepEl) {
            const icon = stepEl.querySelector('.step-icon');
            if (icon) {
                if (data.status === 'running') {
                    icon.style.borderColor = '#06b6d4';
                    icon.style.color = '#06b6d4';
                    icon.style.boxShadow = '0 0 10px rgba(6, 182, 212, 0.5)';
                    icon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                } else if (data.status === 'completed' || data.status === 'complete') {
                    icon.style.background = '#06b6d4';
                    icon.style.borderColor = '#06b6d4';
                    icon.style.color = '#fff';
                    icon.style.boxShadow = 'none';
                    icon.innerHTML = '<i class="fas fa-check"></i>';
                }
            }
        }

        // Update Backend
        const backendEl = document.getElementById(`backend-${trackId}`);
        if (backendEl && data.backend) {
            backendEl.textContent = data.backend;
        }

        // Update ETA
        const etaEl = document.getElementById(`eta-${trackId}`);
        if (etaEl) {
            if (data.queue !== undefined) {
                etaEl.textContent = `Position #${data.queue} (Est: ${data.est_wait}s)`;
            } else if (data.elapsed) {
                etaEl.textContent = `${data.elapsed}s elapsed`;
            } else {
                etaEl.textContent = 'Calculating...';
            }
        }

        // Update status label
        const statusEl = document.getElementById(`status-${trackId}`);
        if (statusEl) {
            statusEl.textContent = data.step.charAt(0).toUpperCase() + data.step.slice(1);
        }

        // Update details text box
        const detailsEl = document.getElementById(`details-${trackId}`);
        if (detailsEl) {
            let detailMsg = data.message || '';
            if (data.elapsed) detailMsg += ` (${data.elapsed}s elapsed)`;
            if (data.job_id) detailMsg += ` • Job: ${data.job_id.substring(0, 10)}`;
            detailsEl.textContent = detailMsg;
            detailsEl.style.color = data.status === 'running' ? '#06b6d4' : '#cbd5e1';
        }

        // Calculate progress percentage
        let percent = 0;
        if (data.step === 'transpilation') percent = (data.status === 'completed' || data.status === 'complete') ? 25 : 10;
        else if (data.step === 'validation') percent = (data.status === 'completed' || data.status === 'complete') ? 50 : 35;
        else if (data.step === 'execution') {
            if (data.status === 'completed' || data.status === 'complete') percent = 90;
            else if (data.queue !== undefined) {
                percent = Math.max(55, Math.min(88, 88 - data.queue * 4));
            } else {
                percent = 70;
            }
        }
        else if (data.step === 'analysis') percent = (data.status === 'completed' || data.status === 'complete') ? 100 : 95;

        // Update Mini Card elements
        const miniPercentEl = document.getElementById(`mini-percent-${trackId}`);
        const miniFillEl = document.getElementById(`mini-progress-fill-${trackId}`);
        const miniStatusTextEl = document.getElementById(`mini-status-text-${trackId}`);
        const miniBackendTextEl = document.getElementById(`mini-backend-text-${trackId}`);
        const miniEtaTextEl = document.getElementById(`mini-eta-text-${trackId}`);

        if (miniPercentEl) miniPercentEl.textContent = `${percent}%`;
        if (miniFillEl) miniFillEl.style.width = `${percent}%`;

        if (miniStatusTextEl) {
            let label = 'Running...';
            if (data.step === 'transpilation') label = data.status === 'running' ? '<i class="fas fa-spinner fa-spin"></i> Transpiling...' : 'Transpiled';
            else if (data.step === 'validation') label = data.status === 'running' ? '<i class="fas fa-spinner fa-spin"></i> Validating...' : 'Validated';
            else if (data.step === 'execution') {
                if (data.status === 'completed' || data.status === 'complete') label = 'Executed';
                else label = data.queue !== undefined ? `<i class="fas fa-clock fa-spin"></i> Queued (#${data.queue})` : '<i class="fas fa-spinner fa-spin"></i> Executing...';
            }
            else if (data.step === 'analysis') label = data.status === 'running' ? '<i class="fas fa-spinner fa-spin"></i> Analyzing...' : 'Completed';
            miniStatusTextEl.innerHTML = label;
        }

        if (miniBackendTextEl && data.backend) {
            miniBackendTextEl.innerHTML = `<i class="fas fa-server"></i> ${data.backend}`;
        }
        if (miniEtaTextEl) {
            if (data.queue !== undefined) {
                miniEtaTextEl.innerHTML = `<i class="fas fa-clock"></i> ${data.est_wait}s`;
            } else if (data.elapsed) {
                miniEtaTextEl.innerHTML = `<i class="fas fa-clock"></i> ${data.elapsed}s`;
            } else {
                miniEtaTextEl.innerHTML = `<i class="fas fa-clock"></i> --`;
            }
        }
    }

    // 8. Submit Circuit Stream Submission via Fetch API
    try {
        const response = await fetch('/api/ibm/run-circuit-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                circuit: circuitData,
                backend: selectedBackend || 'auto',
                shots: 1024
            }),
            signal: abortController.signal
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to start execution');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    console.log(`📥 [${trackId}] Event:`, data);

                    if (data.step) {
                        updateIndividualJobTracker(data);
                    }

                    // Success handling
                    if (data.step === 'analysis' && (data.status === 'completed' || data.status === 'complete') && data.data) {
                        console.log(`✅ [${trackId}] Complete! Data:`, data.data);
                        cleanUpJobUi();
                        showResultsModal(data.data);
                    }

                    // Error handling
                    if (data.error) {
                        console.error(`❌ [${trackId}] Error:`, data.error);
                        const detailsEl = document.getElementById(`details-${trackId}`);
                        if (detailsEl) {
                            detailsEl.textContent = `Error: ${data.error}`;
                            detailsEl.style.color = '#ef4444';
                        }
                        setTimeout(() => {
                            cleanUpJobUi();
                        }, 5000);
                    }
                }
            }
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`[${trackId}] Execution aborted by user.`);
            return;
        }
        console.error(`[${trackId}] Connection error:`, error);
        const detailsEl = document.getElementById(`details-${trackId}`);
        if (detailsEl) {
            detailsEl.textContent = `Failed: ${error.message}`;
            detailsEl.style.color = '#ef4444';
        }
        setTimeout(() => {
            cleanUpJobUi();
        }, 5000);
    }
};

// Placeholder function to maintain compatibility
function updateProcessTracker(data) {
    const stepMap = {
        'transpilation': 1,
        'validation': 2,
        'execution': 3,
        'analysis': 4
    };

    const currentStepIndex = stepMap[data.step];
    const progressBar = document.getElementById('progress-bar');
    const progressStatus = document.getElementById('progress-status');
    const progressMessage = document.getElementById('progress-message');
    const progressDetails = document.getElementById('progress-details');
    const progressStatusText = document.getElementById('progress-status-text');

    // Update Progress Bar (if exists)
    if (progressBar) {
        const percentage = (currentStepIndex / 4) * 100;
        progressBar.style.width = `${percentage}%`;
    }

    // Update Status Text
    const stepName = data.step.charAt(0).toUpperCase() + data.step.slice(1);
    if (progressStatus) progressStatus.textContent = stepName;
    if (progressStatusText) progressStatusText.textContent = stepName;

    // Build detailed message with ETA
    let detailedMessage = data.message || '';
    if (data.elapsed) {
        detailedMessage += ` (${data.elapsed}s elapsed)`;
    }
    if (data.job_id) {
        detailedMessage += ` • Job: ${data.job_id.substring(0, 12)}...`;
    }

    if (progressMessage) progressMessage.textContent = detailedMessage;
    if (progressDetails) {
        progressDetails.textContent = detailedMessage;
        progressDetails.style.color = data.status === 'running' ? '#06b6d4' : '#cbd5e1';
    }

    // Update Step Icons
    const stepEl = document.getElementById(`step-${data.step}`);
    if (stepEl) {
        const icon = stepEl.querySelector('.step-icon');
        if (icon) {
            if (data.status === 'running') {
                icon.style.borderColor = '#06b6d4';
                icon.style.color = '#06b6d4';
                icon.style.boxShadow = '0 0 10px rgba(6, 182, 212, 0.5)';
                icon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            } else if (data.status === 'completed') {
                icon.style.background = '#06b6d4';
                icon.style.borderColor = '#06b6d4';
                icon.style.color = '#fff';
                icon.style.boxShadow = 'none';
                icon.innerHTML = '<i class="fas fa-check"></i>';
            } else if (data.status === 'error') {
                icon.style.background = '#ef4444';
                icon.style.borderColor = '#ef4444';
                icon.style.color = '#fff';
                icon.style.boxShadow = 'none';
                icon.innerHTML = '<i class="fas fa-times"></i>';
            }
        }
    }

    console.log(`📊 Progress: Step ${currentStepIndex}/4 - ${stepName} (${data.status})`);
}

function showResultsModal(data) {
    const modal = document.getElementById('results-modal');
    if (!modal) return;

    // Populate Data
    document.getElementById('result-job-id').textContent = data.job_id;
    document.getElementById('result-fidelity').textContent = data.results.fidelity.toFixed(1) + '%';
    document.getElementById('result-depth').textContent = data.metrics.depth;
    document.getElementById('result-gates').textContent = Object.values(data.metrics.gates).reduce((a, b) => a + b, 0);
    document.getElementById('result-shots').textContent = data.results.shots;
    document.getElementById('result-backend').textContent = data.backend;
    document.getElementById('result-timestamp').textContent = new Date(data.timestamp).toLocaleTimeString();
    document.getElementById('result-multi-qubit').textContent = data.metrics.multi_qubit_gates;

    // Render Histogram (Simple Bar Chart)
    renderHistogram(data.results.counts);

    // Find Dominant State
    let maxCount = 0;
    let topState = '-';
    for (const [state, count] of Object.entries(data.results.counts)) {
        if (count > maxCount) {
            maxCount = count;
            topState = state;
        }
    }
    document.getElementById('top-state').textContent = `|${topState}⟩ (${((maxCount / data.results.shots) * 100).toFixed(1)}%)`;

    // Show Modal
    modal.style.display = 'flex';
    document.getElementById('execution-progress').style.display = 'none'; // Hide progress

    // Send Browser Notification
    if ("Notification" in window) {
        if (Notification.permission === "granted") {
            new Notification("🎉 Quantum Results Ready!", {
                body: `Job completed! Fidelity: ${data.results.fidelity.toFixed(1)}% | Dominant state: |${topState}⟩`,
                icon: '/static/favicon.ico',
                tag: 'quantum-job-' + data.job_id,
                requireInteraction: false
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("🎉 Quantum Results Ready!", {
                        body: `Job completed! Fidelity: ${data.results.fidelity.toFixed(1)}%`,
                        tag: 'quantum-job-' + data.job_id
                    });
                }
            });
        }
    }

    // Play notification sound (optional)
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBztRxfLCdSYFKv');
        audio.volume = 0.3;
        audio.play().catch(() => { }); // Silent fail if autoplay blocked
    } catch (e) { }
}

function renderHistogram(counts) {
    const container = document.getElementById('histogram-container');
    if (!container) {
        console.error('Histogram container not found');
        return;
    }

    container.innerHTML = ''; // Clear
    container.style.minHeight = '200px'; // Ensure container has height

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const max = Math.max(...Object.values(counts));

    // Create simple CSS bar chart
    const chart = document.createElement('div');
    chart.style.cssText = 'display: flex; align-items: flex-end; justify-content: space-around; height: 180px; padding: 20px 10px 10px;';

    // Sort states
    const sortedStates = Object.keys(counts).sort();

    sortedStates.forEach(state => {
        const count = counts[state];
        const heightPx = Math.max(10, (count / max) * 140); // Max 140px height, min 10px
        const percentage = ((count / total) * 100).toFixed(1);

        const barWrapper = document.createElement('div');
        barWrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; flex: 1; max-width: 80px;';

        // Percentage value on top
        const value = document.createElement('div');
        value.textContent = `${percentage}%`;
        value.style.cssText = 'font-size: 0.75rem; color: #94a3b8; margin-bottom: 4px; font-weight: 600;';

        // Bar
        const bar = document.createElement('div');
        bar.style.cssText = `
            width: 50px;
            height: ${heightPx}px;
            background: linear-gradient(to top, #3b82f6, #06b6d4);
            border-radius: 4px 4px 0 0;
            position: relative;
            transition: all 0.5s ease;
            box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);
        `;

        // Hover effect
        bar.addEventListener('mouseover', () => {
            bar.style.transform = 'scaleY(1.05)';
            bar.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.5)';
        });
        bar.addEventListener('mouseout', () => {
            bar.style.transform = 'scaleY(1)';
            bar.style.boxShadow = '0 2px 8px rgba(6, 182, 212, 0.3)';
        });

        // Tooltip
        bar.title = `|${state}⟩: ${count} counts (${percentage}%)`;

        // State label
        const label = document.createElement('div');
        label.textContent = `|${state}⟩`;
        label.style.cssText = 'margin-top: 5px; font-size: 0.7rem; color: #06b6d4; font-family: monospace; font-weight: 600;';

        barWrapper.appendChild(value);
        barWrapper.appendChild(bar);
        barWrapper.appendChild(label);
        chart.appendChild(barWrapper);
    });

    container.appendChild(chart);
    console.log('✅ Histogram rendered with', sortedStates.length, 'states');
}

function updateDashboardWidgets(data) {
    // This function updates the global state that widgets read from
    // Since widgets might be on a different page (dashboard), we might need to store this in localStorage/sessionStorage
    // or send it to the backend to persist.

    console.log('Updating dashboard widgets with:', data);

    // 1. Update Recent Jobs (localStorage for demo, ideally backend)
    const recentJobs = JSON.parse(localStorage.getItem('quantum_jobs_history') || '[]');
    recentJobs.unshift({
        id: data.job_id,
        backend: data.backend,
        status: 'COMPLETED',
        timestamp: data.timestamp,
        fidelity: data.results.fidelity,
        circuit_name: '3D Builder Circuit'
    });
    localStorage.setItem('quantum_jobs_history', JSON.stringify(recentJobs.slice(0, 10)));

    // 2. Update Performance Metrics
    const performance = JSON.parse(localStorage.getItem('quantum_performance') || '{}');
    performance.total_jobs = (performance.total_jobs || 0) + 1;
    performance.avg_fidelity = ((performance.avg_fidelity || 0) * (performance.total_jobs - 1) + data.results.fidelity) / performance.total_jobs;
    localStorage.setItem('quantum_performance', JSON.stringify(performance));

    // Notify user
    console.log('Dashboard data updated');
}

// Event Listeners for Modal
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-results-btn');
    const closeFooterBtn = document.getElementById('close-results-footer-btn');
    const modal = document.getElementById('results-modal');
    const cancelBtn = document.getElementById('cancel-execution-btn');
    const progressModal = document.getElementById('execution-progress');

    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    if (closeFooterBtn) closeFooterBtn.onclick = () => modal.style.display = 'none';

    if (cancelBtn) cancelBtn.onclick = () => {
        // In a real app, we would send a cancel request to the backend
        if (progressModal) progressModal.style.display = 'none';
        alert('Execution cancelled');
    };

});

console.log('UnifiedQuantumCircuitApp class exported');
if (typeof window.UnifiedQuantumCircuitApp === 'undefined') {
    window.UnifiedQuantumCircuitApp = UnifiedQuantumCircuitApp;
    console.log('UnifiedQuantumCircuitApp class exported');
} else {
    console.warn('UnifiedQuantumCircuitApp already defined, skipping export');
}

if (typeof window.unifiedQuantumApp === 'undefined') {
    window.unifiedQuantumApp = unifiedQuantumApp;
    console.log('unifiedQuantumApp instance exported');
} else {
    console.warn('unifiedQuantumApp already defined, skipping export');
}
