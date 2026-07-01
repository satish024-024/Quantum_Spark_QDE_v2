/**
 * 3D Quantum Gate Models
 * Creates and manages 3D representations of quantum gates
 */

class GateModels {
    // --- Singleton support ---
    /**
     * Returns the shared GateModels instance. Creates one if it does not exist yet.
     * @param {THREE.Scene} [scene] Optional scene reference used on first creation.
     */
    static getInstance(scene) {
        if (!GateModels._instance) {
            GateModels._instance = new GateModels(scene);
        }
        return GateModels._instance;
    }

    constructor(scene) {
        // Enforce singleton pattern – if an instance already exists, return it.
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

        // Two qubit gates
        this.createCNOTGate();
        this.createCZGate();
        this.createSWAPGate();
        this.createCRXGate();
        this.createCRYGate();
        this.createCRZGate();
        this.createCU1Gate();
        this.createCU3Gate();

        // Three-qubit gates
        this.createCCXGate();
        this.createCSWAPGate();

        // Measurement gates
        this.createMeasureGate();
        this.createBarrierGate();
    }

    // Helper to create a flat gate (thin box) with text label
    createFlatGate(label, width = 0.6, height = 0.4, depth = 0.05) {
        const group = new THREE.Group();

        const geometry = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geometry, this.gateMaterials.get('base'));
        group.add(mesh);

        const textMesh = this.createTextMesh(label, width * 0.8, height * 0.8);
        textMesh.position.set(0, 0, depth * 0.6);
        group.add(textMesh);

        return group;
    }

    createXGate() {
        const group = this.createFlatGate('X');
        this.gateMeshes.set('X', group);
    }

    createYGate() {
        this.gateMeshes.set('Y', this.createFlatGate('Y'));
    }

    createZGate() {
        this.gateMeshes.set('Z', this.createFlatGate('Z'));
    }

    createHGate() {
        this.gateMeshes.set('H', this.createFlatGate('H'));
    }

    createSGate() {
        this.gateMeshes.set('S', this.createFlatGate('S'));
    }

    createTGate() {
        this.gateMeshes.set('T', this.createFlatGate('T'));
    }

    // Extra single-qubit gates
    createIGate() { this.gateMeshes.set('I', this.createFlatGate('I')); }
    createSDGGate() { this.gateMeshes.set('SDG', this.createFlatGate('S†')); }
    createTDGGate() { this.gateMeshes.set('TDG', this.createFlatGate('T†')); }
    createSXGate() { this.gateMeshes.set('SX', this.createFlatGate('√X')); }
    createSYGate() { this.gateMeshes.set('SY', this.createFlatGate('√Y')); }
    createU1Gate() { this.gateMeshes.set('U1', this.createFlatGate('U1')); }
    createU2Gate() { this.gateMeshes.set('U2', this.createFlatGate('U2')); }
    createU3Gate() { this.gateMeshes.set('U3', this.createFlatGate('U3')); }

    createRXGate() {
        this.gateMeshes.set('RX', this.createFlatGate('RX'));
    }

    createRYGate() {
        this.gateMeshes.set('RY', this.createFlatGate('RY'));
    }

    createRZGate() {
        this.gateMeshes.set('RZ', this.createFlatGate('RZ'));
    }

    createCNOTGate() {
        const group = this.createTwoQubitGate('•', '+');
        this.gateMeshes.set('CNOT', group);
    }

    createCZGate() {
        this.gateMeshes.set('CZ', this.createTwoQubitGate('•', 'Z'));
    }

    createSWAPGate() {
        // SWAP represented by two flat gates with X symbols plus crossing line
        const group = new THREE.Group();
        const plat1 = this.createFlatGate('X', 0.4, 0.4, 0.05);
        plat1.position.set(-0.25, 0.3, 0);
        group.add(plat1);

        const plat2 = this.createFlatGate('X', 0.4, 0.4, 0.05);
        plat2.position.set(0.25, -0.3, 0);
        group.add(plat2);

        // connecting line
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-0.25, 0.3, 0),
            new THREE.Vector3(0.25, -0.3, 0)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        group.add(line);

        this.gateMeshes.set('SWAP', group);
    }

    createCRXGate() {
        this.gateMeshes.set('CRX', this.createTwoQubitGate('•', 'RX'));
    }

    createCRYGate() { this.gateMeshes.set('CRY', this.createTwoQubitGate('•', 'RY')); }
    createCRZGate() { this.gateMeshes.set('CRZ', this.createTwoQubitGate('•', 'RZ')); }
    createCU1Gate() { this.gateMeshes.set('CU1', this.createTwoQubitGate('•', 'U1')); }
    createCU3Gate() { this.gateMeshes.set('CU3', this.createTwoQubitGate('•', 'U3')); }

    // Three-qubit visuals (simplified): two controls and one target
    createCCXGate() {
        const group = new THREE.Group();
        const control1 = this.createFlatGate('•', 0.4, 0.4, 0.05);
        control1.position.set(0, 0.6, 0);
        group.add(control1);

        const control2 = this.createFlatGate('•', 0.4, 0.4, 0.05);
        control2.position.set(0, 0, 0);
        group.add(control2);

        const target = this.createFlatGate('X', 0.4, 0.4, 0.05);
        target.position.set(0, -0.6, 0);
        group.add(target);

        // vertical line connecting plates
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0.4, 0),
            new THREE.Vector3(0, -0.4, 0)
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        group.add(new THREE.Line(lineGeo, lineMat));

        this.gateMeshes.set('CCX', group);
    }

    createCSWAPGate() {
        const group = new THREE.Group();
        const control = this.createFlatGate('•', 0.4, 0.4, 0.05);
        control.position.set(0, 0.6, 0);
        group.add(control);

        const swap1 = this.createFlatGate('X', 0.4, 0.4, 0.05);
        swap1.position.set(0, 0, 0);
        group.add(swap1);

        const swap2 = this.createFlatGate('X', 0.4, 0.4, 0.05);
        swap2.position.set(0, -0.6, 0);
        group.add(swap2);

        // connector lines
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0.4, 0), new THREE.Vector3(0, -0.4, 0)
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        group.add(new THREE.Line(lineGeo, lineMat));

        this.gateMeshes.set('CSWAP', group);
    }

    // helper for generic two-qubit gate visuals
    createTwoQubitGate(controlLabel, targetLabel) {
        const group = new THREE.Group();

        // Control flat plate
        const control = this.createFlatGate(controlLabel, 0.4, 0.4, 0.05);
        control.position.set(0, 0.3, 0);
        group.add(control);

        // Target flat plate
        const target = this.createFlatGate(targetLabel, 0.4, 0.4, 0.05);
        target.position.set(0, -0.3, 0);
        group.add(target);

        // connector line
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0.1, 0),
            new THREE.Vector3(0, -0.1, 0)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        group.add(line);

        return group;
    }

    createMeasureGate() {
        const group = new THREE.Group();

        // Measurement gate has a distinctive shape
        const geometry = new THREE.BoxGeometry(0.4, 0.1, 0.1);
        const mesh = new THREE.Mesh(geometry, this.gateMaterials.get('measure'));
        group.add(mesh);

        // Measurement symbol
        const measureSymbol = this.createMeasureSymbolGroup();
        measureSymbol.position.set(0, 0, 0.06);
        measureSymbol.scale.set(0.1, 0.1, 0.1);
        group.add(measureSymbol);

        this.gateMeshes.set('MEASURE', group);
    }

    createBarrierGate() {
        const group = new THREE.Group();
        
        // Barrier is a vertical line
        const geometry = new THREE.BoxGeometry(0.05, 0.8, 0.05);
        const mesh = new THREE.Mesh(geometry, this.gateMaterials.get('base'));
        group.add(mesh);
        
        this.gateMeshes.set('BARRIER', group);
    }

    /**
     * Creates a plane mesh with a CanvasTexture label. Text is auto-scaled & centered.
     * @param {string} text Label to draw
     * @param {number} planeW Width of plane in world units
     * @param {number} planeH Height of plane in world units
     */
    createTextMesh(text, planeW = 1, planeH = 1) {
        const size = 512; // higher resolution for crispness
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Clear & style background (transparent)
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#ffffff';

        // Determine font size based on text length
        const len = text.length;
        const maxFont = 360;
        const minFont = 140;
        const fontSize = len === 1 ? maxFont : Math.max(minFont, maxFont - (len - 1) * 60);
        ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, size / 2, size / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const geometry = new THREE.PlaneGeometry(planeW, planeH);
        return new THREE.Mesh(geometry, material);
    }

    createPlusGeometry() {
        const group = new THREE.Group();
        
        // Horizontal line
        const hGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.1);
        const hMesh = new THREE.Mesh(hGeometry, this.gateMaterials.get('text'));
        group.add(hMesh);
        
        // Vertical line
        const vGeometry = new THREE.BoxGeometry(0.1, 0.6, 0.1);
        const vMesh = new THREE.Mesh(vGeometry, this.gateMaterials.get('text'));
        group.add(vMesh);
        
        return group;
    }

    createSwapArrowGeometry() {
        const group = new THREE.Group();
        
        // Create swap arrows using basic shapes
        const arrowGeometry = new THREE.ConeGeometry(0.1, 0.3, 3);
        const arrow1 = new THREE.Mesh(arrowGeometry, this.gateMaterials.get('text'));
        arrow1.position.set(-0.2, 0, 0);
        arrow1.rotation.z = Math.PI / 2;
        group.add(arrow1);
        
        const arrow2 = new THREE.Mesh(arrowGeometry, this.gateMaterials.get('text'));
        arrow2.position.set(0.2, 0, 0);
        arrow2.rotation.z = -Math.PI / 2;
        group.add(arrow2);
        
        return group;
    }

    createMeasureSymbolGroup() {
        const group = new THREE.Group();

        // Create a simple measurement symbol
        const geometry = new THREE.BoxGeometry(0.3, 0.1, 0.1);
        const mesh = new THREE.Mesh(geometry, this.gateMaterials.get('text'));
        group.add(mesh);

        return group;
    }

    getGateModel(gateType) {
        return this.gateMeshes.get(gateType);
    }

    cloneGateModel(gateType) {
        const original = this.gateMeshes.get(gateType);
        if (original) {
            return original.clone();
        }
        return null;
    }

    // Animate gate application
    animateGateApplication(gateMesh, duration = 1000) {
        const startScale = gateMesh.scale.clone();
        const targetScale = startScale.clone().multiplyScalar(1.2);
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            gateMesh.scale.lerpVectors(startScale, targetScale, easeProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Return to original scale
                gateMesh.scale.copy(startScale);
            }
        };
        
        animate();
    }

    // Create qubit representation
    createQubitMesh(index) {
        const group = new THREE.Group();
        
        // Qubit sphere
        const geometry = new THREE.SphereGeometry(0.1, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.8,
            emissive: 0x001122
        });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
        
        // Qubit label
        const textMesh = this.createTextMesh(index.toString(), 0.1, 0.1);
        textMesh.position.set(0, -0.2, 0.05);
        textMesh.scale.set(0.05, 0.05, 0.05);
        group.add(textMesh);
        
        // Glow effect
        const glowGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.3
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glowMesh);
        
        return group;
    }
}

// Export for use in other modules
window.GateModels = GateModels;