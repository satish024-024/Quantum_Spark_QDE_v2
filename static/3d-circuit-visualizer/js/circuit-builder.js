/**
 * Circuit Builder
 * Handles drag-and-drop circuit construction and management
 */

class CircuitBuilder {
    constructor(scene, camera, quantumSimulator) {
        this.scene = scene;
        this.camera = camera;
        this.quantumSimulator = quantumSimulator;
        // new: single shared gate model cache
        this.gateModels = GateModels.getInstance(this.scene);
        this.circuit = [];
        // Layout constants
        this.SPACING_Y = 0.6; // distance between qubit rails
        this.SPACING_X = 0.8; // distance between depth columns
        this.OFFSET_X = -1;   // starting X offset so first column is visible

        this.qubits = 3;
        this.qubitMeshes = [];
        this.gateInstances = [];
        this.isDragging = false;
        this.dragOffset = new THREE.Vector3();
        this.selectedGate = null;
        this.circuitDepth = 0;
        
        // Undo/Redo system inspired by Quirk
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        // Group for grid helper lines
        this.gridGroup = new THREE.Group();
        this.scene.add(this.gridGroup);

        this.initializeQubits();
        this.updateGrid();
        this.setupEventListeners();
        
        // AI circuit integration
        this.aiGeneratedCircuit = null;
        this.setupAIIntegration();
    }

    setupAIIntegration() {
        // Listen for AI circuit loading events
        window.addEventListener('loadAICircuit', (event) => {
            this.loadAICircuit(event.detail);
        });
        
        // Check for pending AI circuit on initialization
        if (window.dashboard && window.dashboard.state.pendingCircuit) {
            this.loadAICircuit(window.dashboard.state.pendingCircuit);
        }
    }

    loadAICircuit(circuit_3d) {
        try {
            console.log('🎨 Loading AI-generated circuit in 3D builder:', circuit_3d);
            
            this.aiGeneratedCircuit = circuit_3d;
            
            // Clear existing circuit
            this.clearCircuit();
            
            // Set number of qubits
            this.qubits = circuit_3d.qubits;
            this.initializeQubits();
            
            // Add gates to circuit
            circuit_3d.gates.forEach((gate, index) => {
                this.addAIGateToCircuit(gate, index);
            });
            
            // Update visualization
            this.updateCircuitVisualization();
            
            console.log(`✅ Loaded AI circuit: ${circuit_3d.name} with ${circuit_3d.gates.length} gates`);
            
            // Show success notification
            if (window.dashboard) {
                window.dashboard.showNotification(`🎨 AI Circuit "${circuit_3d.name}" loaded!`, 'success', 3000);
            }
            
        } catch (error) {
            console.error('❌ Error loading AI circuit:', error);
            if (window.dashboard) {
                window.dashboard.showNotification('❌ Error loading AI circuit', 'error', 3000);
            }
        }
    }

    addAIGateToCircuit(gate, depth) {
        try {
            const gateInstance = {
                type: gate.type,
                qubits: gate.qubits,
                depth: depth,
                params: gate.params || [],
                aiGenerated: true
            };
            
            // Add to circuit array
            this.circuit.push(gateInstance);
            
            // Create 3D gate object
            this.createGate3D(gateInstance);
            
            // Update circuit depth
            this.circuitDepth = Math.max(this.circuitDepth, depth + 1);
            
        } catch (error) {
            console.error('❌ Error adding AI gate to circuit:', error);
        }
    }

    createGate3D(gateInstance) {
        try {
            const gateModel = this.gateModels.getGateModel(gateInstance.type);
            if (!gateModel) {
                console.warn(`⚠️ Gate model not found: ${gateInstance.type}`);
                return;
            }
            
            // Calculate position
            const x = this.OFFSET_X + (gateInstance.depth * this.SPACING_X);
            const y = gateInstance.qubits[0] * this.SPACING_Y;
            
            // Clone the gate model
            const gateMesh = gateModel.clone();
            gateMesh.position.set(x, y, 0);
            gateMesh.userData = {
                type: gateInstance.type,
                qubits: gateInstance.qubits,
                depth: gateInstance.depth,
                aiGenerated: true
            };
            
            // Add to scene
            this.scene.add(gateMesh);
            this.gateInstances.push(gateMesh);
            
            // Add special styling for AI-generated gates
            if (gateInstance.aiGenerated) {
                gateMesh.material = gateMesh.material.clone();
                gateMesh.material.emissive = new THREE.Color(0x00ff88);
                gateMesh.material.emissiveIntensity = 0.3;
            }
            
        } catch (error) {
            console.error('❌ Error creating 3D gate:', error);
        }
    }

    clearCircuit() {
        // Remove all gate instances from scene
        this.gateInstances.forEach(gate => {
            this.scene.remove(gate);
        });
        this.gateInstances = [];
        
        // Clear circuit array
        this.circuit = [];
        this.circuitDepth = 0;
        
        // Clear AI circuit
        this.aiGeneratedCircuit = null;
        
        // Update visualization
        this.updateCircuitVisualization();
    }

    updateCircuitVisualization() {
        // Update grid based on circuit depth
        this.updateGrid();
        
        // Update quantum simulator if available
        if (this.quantumSimulator) {
            this.quantumSimulator.updateCircuit(this.circuit);
        }
    }

    createDragPreview(gateType) {
        // Create a floating preview of the gate being dragged
        const preview = document.createElement('div');
        preview.className = 'drag-preview';
        preview.innerHTML = `
            <div class="gate-icon">${gateType}</div>
            <span>${gateType}</span>
        `;
        preview.style.cssText = `
            position: fixed;
            top: -100px;
            left: -100px;
            background: rgba(0, 212, 255, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            border: 2px solid #00d4ff;
            transition: all 0.1s ease;
        `;
        document.body.appendChild(preview);
        this.dragPreview = preview;
        
        // Update preview position on mouse move
        document.addEventListener('dragover', this.updateDragPreview.bind(this));
    }

    updateDragPreview(e) {
        if (this.dragPreview) {
            this.dragPreview.style.left = (e.clientX + 10) + 'px';
            this.dragPreview.style.top = (e.clientY - 10) + 'px';
        }
    }

    removeDragPreview() {
        if (this.dragPreview) {
            document.body.removeChild(this.dragPreview);
            this.dragPreview = null;
        }
        document.removeEventListener('dragover', this.updateDragPreview.bind(this));
    }

    showDropPreview(e) {
        // Show a preview of where the gate will be placed
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert screen coordinates to 3D world coordinates
        const worldPos = this.screenToWorld(x, y);
        const snappedPos = this.snapToGrid(worldPos);
        
        // Create or update drop preview
        if (!this.dropPreview) {
            this.dropPreview = new THREE.Group();
            this.scene.add(this.dropPreview);
        }
        
        // Create a ghost gate at the drop position
        this.dropPreview.clear();
        const gateModel = this.gateModels.cloneGateModel(this.selectedGate);
        if (gateModel) {
            gateModel.position.copy(snappedPos);
            // Make materials transparent for preview
            gateModel.traverse((child) => {
                if (child.material) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0.6;
                }
            });
            this.dropPreview.add(gateModel);
        }
    }

    hideDropPreview() {
        if (this.dropPreview) {
            this.scene.remove(this.dropPreview);
            this.dropPreview = null;
        }
    }

    screenToWorld(screenX, screenY) {
        // Convert screen coordinates to 3D world coordinates
        const canvas = document.getElementById('quantumCanvas');
        const rect = canvas.getBoundingClientRect();
        
        // Normalize screen coordinates to [-1, 1]
        const x = (screenX / rect.width) * 2 - 1;
        const y = -(screenY / rect.height) * 2 + 1;
        
        // Create a raycaster
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        
        // Create a plane at z=0 to intersect with
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersectionPoint = new THREE.Vector3();
        
        raycaster.ray.intersectPlane(plane, intersectionPoint);
        
        return intersectionPoint;
    }

    snapToGrid(position) {
        // Snap position to the grid
        const depthIdx = Math.round((position.x - this.OFFSET_X) / this.SPACING_X);
        const qubitIdx = Math.round(position.y / this.SPACING_Y);
        
        return new THREE.Vector3(
            this.getColumnX(depthIdx),
            qubitIdx * this.SPACING_Y - (this.qubits - 1) * this.SPACING_Y / 2,
            0.05
        );
    }

    initializeQubits() {
        // Clear existing qubits
        this.qubitMeshes.forEach(mesh => this.scene.remove(mesh));
        this.qubitMeshes = [];
        
        // Create qubit representations
        for (let i = 0; i < this.qubits; i++) {
            const qubitMesh = this.createQubitMesh(i);
            qubitMesh.position.set(0, i * this.SPACING_Y - (this.qubits - 1) * this.SPACING_Y / 2, 0);
            this.scene.add(qubitMesh);
            this.qubitMeshes.push(qubitMesh);
        }

        // Build instanced rail lines (single draw-call)
        if (this.railMesh) {
            this.scene.remove(this.railMesh);
            this.railMesh.geometry.dispose();
        }

        const railGeometry = new THREE.BoxGeometry(4, 0.01, 0.01);
        const railMaterial = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.4 });
        this.railMesh = new THREE.InstancedMesh(railGeometry, railMaterial, this.qubits);

        const dummy = new THREE.Object3D();
        for (let i = 0; i < this.qubits; i++) {
            dummy.position.set(0, i * this.SPACING_Y - (this.qubits - 1) * this.SPACING_Y / 2, 0);
            dummy.updateMatrix();
            this.railMesh.setMatrixAt(i, dummy.matrix);
        }
        this.railMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(this.railMesh);

        // Dynamically reposition camera so all qubit rails remain visible
        if (this.camera && this.camera.isPerspectiveCamera) {
            const verticalSpan = Math.max(1, (this.qubits - 1) * this.SPACING_Y);
            // target distance keeps gates ~60% of viewport height
            const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
            const desiredVisible = verticalSpan * 1.6;
            const dist = desiredVisible / (2 * Math.tan(fovRad / 2));
            this.camera.position.y = 0;
            this.camera.position.z = dist;
            this.camera.updateProjectionMatrix();
        }
    }

    createQubitMesh(index) {
        const group = new THREE.Group();
        
        // Qubit sphere
        const geometry = new THREE.SphereGeometry(0.08, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.8,
            emissive: 0x001122
        });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
        
        // Qubit label
        const textGeometry = new THREE.PlaneGeometry(0.2, 0.1);
        const textMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(-0.3, 0, 0.1);
        group.add(textMesh);
        
        // Qubit line
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-2, 0, 0),
            new THREE.Vector3(2, 0, 0)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00d4ff, 
            transparent: true,
            opacity: 0.5
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        group.add(line);
        
        // Store qubit index
        group.userData = { type: 'qubit', index: index };
        
        return group;
    }

    setupEventListeners() {
        // Gate palette drag events
        const gateItems = document.querySelectorAll('.gate-item');
        gateItems.forEach(item => {
            // Ensure element is draggable
            if (!item.hasAttribute('draggable')) {
                item.setAttribute('draggable', 'true');
            }
            item.addEventListener('dragstart', (e) => {
                const gateType = item.dataset.gate;
                e.dataTransfer.setData('text/plain', gateType);
                this.selectedGate = gateType;
                
                // Enhanced visual feedback inspired by Quirk
                item.style.opacity = '0.5';
                item.style.transform = 'scale(0.95)';
                item.style.transition = 'all 0.2s ease';
                item.style.boxShadow = '0 8px 25px rgba(0, 212, 255, 0.4)';
                
                // Create floating drag preview
                this.createDragPreview(gateType);
            });
            
            item.addEventListener('dragend', (e) => {
                item.style.opacity = '1';
                item.style.transform = 'scale(1)';
                item.style.boxShadow = '';
                this.removeDragPreview();
            });
        });

        // Enhanced canvas drop events with Quirk-style feedback
        const canvas = document.getElementById('quantumCanvas');
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            
            // Show drop zone highlight
            canvas.style.border = '2px dashed #00d4ff';
            canvas.style.backgroundColor = 'rgba(0, 212, 255, 0.05)';
            
            // Show potential drop position
            this.showDropPreview(e);
        });

        canvas.addEventListener('dragleave', (e) => {
            // Remove drop zone highlight
            canvas.style.border = '';
            canvas.style.backgroundColor = '';
            this.hideDropPreview();
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const gateType = e.dataTransfer.getData('text/plain');
            if (gateType) {
                this.addGateToCircuit(gateType, e);
            }
            
            // Clean up visual feedback
            canvas.style.border = '';
            canvas.style.backgroundColor = '';
            this.hideDropPreview();
        });

        // Mouse events for 3D interaction
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }

    addGateToCircuit(gateType, event) {
        // Get mouse position relative to canvas
        const canvas = document.getElementById('quantumCanvas');
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Convert screen coordinates to 3D world coordinates using proper raycasting
        const worldPos = this.screenToWorld(mouseX, mouseY);
        const snappedPos = this.snapToGrid(worldPos);
        
        // Determine which qubit this gate should be placed on
        const qubitIndex = this.getNearestQubit(snappedPos.y);
        const depth = this.getNextDepth(qubitIndex);
        
        // Create gate instance with proper positioning
        const gateInstance = this.createGateInstance(gateType, qubitIndex, depth);
        if (gateInstance) {
            // Position the gate correctly
            gateInstance.mesh.position.copy(snappedPos);
            gateInstance.mesh.position.z = 0.1; // Ensure it's above the qubit rail
            
            // Add to circuit and scene
            this.gateInstances.push(gateInstance);
            this.scene.add(gateInstance.mesh);
            
            // Save state for undo/redo
            this.saveState();
            
            // Update circuit depth and info
            this.updateCircuitDepth();
            this.updateCircuitInfo();
            
            console.log(`Gate ${gateType} added at position:`, gateInstance.mesh.position);
            this.updateCircuitInfo();
        }
    }

    getNearestQubit(y) {
        // Find the closest qubit to the Y position
        let nearestIndex = 0;
        let minDistance = Infinity;
        
        for (let i = 0; i < this.qubits; i++) {
            const qubitY = i * this.SPACING_Y - (this.qubits - 1) * this.SPACING_Y / 2;
            const distance = Math.abs(y - qubitY);
            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = i;
            }
        }
        
        return nearestIndex;
    }

    getColumnX(depth){
        return depth * this.SPACING_X + this.OFFSET_X;
    }

    getNextDepth(qubitIndex) {
        // Find the next available depth for this qubit
        let maxDepth = -1;
        
        this.gateInstances.forEach(gate => {
            if (gate.qubitIndex === qubitIndex || 
                (gate.controlQubit === qubitIndex) ||
                (gate.targetQubit === qubitIndex)) {
                maxDepth = Math.max(maxDepth, gate.depth);
            }
        });
        
        return maxDepth + 1;
    }

    getGateType(gateName) {
        // Determine if gate is single or two-qubit
        const twoQubitGates = ['CNOT', 'CZ', 'SWAP', 'CRX', 'CRY', 'CRZ', 'CU1', 'CU3'];
        const threeQubitGates = ['CCX', 'CSWAP'];
        if (threeQubitGates.includes(gateName)) return 'three';
        return twoQubitGates.includes(gateName) ? 'two' : 'single';
    }

    isTwoQubitGate(gateName) {
        const twoQubitGates = ['CNOT', 'CZ', 'SWAP', 'CRX', 'CRY', 'CRZ', 'CU1', 'CU3'];
        return twoQubitGates.includes(gateName);
    }

    getTargetQubit(controlQubit) {
        // For two-qubit gates, target is usually the next qubit
        return Math.min(controlQubit + 1, this.qubits - 1);
    }

    createGateInstance(gateType, qubitIndex, depth) {
        // Clone cached gate mesh
        const gateMesh = this.gateModels.cloneGateModel(gateType);
        
        if (!gateMesh) {
            console.error(`Gate model not found: ${gateType}`);
            return null;
        }
        
        // Position the gate
        const x = this.getColumnX(depth);
        const y = qubitIndex * this.SPACING_Y - (this.qubits - 1) * this.SPACING_Y / 2;
        gateMesh.position.set(x, y, 0.1); // Ensure it's above the qubit rail
        
        // Store gate information
        const gateInstance = {
            type: this.getGateType(gateType),
            name: gateType,
            qubitIndex: qubitIndex,
            qubit: qubitIndex,
            depth: depth,
            mesh: gateMesh,
            parameters: {}
        };
        
        // Handle two-qubit gates
        if (this.isTwoQubitGate(gateType)) {
            gateInstance.controlQubit = qubitIndex;
            gateInstance.targetQubit = this.getTargetQubit(qubitIndex);
        } else if (gateType === 'CCX') { // Toffoli: 2 controls 1 target
            gateInstance.controlQubit1 = qubitIndex;
            gateInstance.controlQubit2 = Math.min(qubitIndex + 1, this.qubits - 2);
            gateInstance.targetQubit   = Math.min(qubitIndex + 2, this.qubits - 1);
        } else if (gateType === 'CSWAP') { // Fredkin: 1 control 2 targets (swap)
            gateInstance.controlQubit  = qubitIndex;
            gateInstance.targetQubit1  = Math.min(qubitIndex + 1, this.qubits - 2);
            gateInstance.targetQubit2  = Math.min(qubitIndex + 2, this.qubits - 1);
        }
        
        // Make gate interactive
        gateMesh.userData = { 
            type: 'gate', 
            gateInstance: gateInstance 
        };
        
        return gateInstance;
    }

    isTwoQubitGate(gateType) {
        const twoQubitGates = ['CNOT', 'CZ', 'SWAP', 'CRX', 'CRY', 'CRZ', 'CU1', 'CU3'];
        return twoQubitGates.includes(gateType);
    }

    getTargetQubit(controlQubit) {
        // For two-qubit gates, find the nearest target qubit
        if (controlQubit === 0) return 1;
        if (controlQubit === this.qubits - 1) return this.qubits - 2;
        return controlQubit + 1;
    }

    onMouseDown(event) {
        const canvas = document.getElementById('quantumCanvas');
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Convert to normalized device coordinates
        const x = (mouseX / rect.width) * 2 - 1;
        const y = -(mouseY / rect.height) * 2 + 1;
        
        // Raycast to find clicked object
        const raycaster = new THREE.Raycaster();
        if (this.camera) {
            raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        }
        
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData.type === 'gate') {
                this.isDragging = true;
                this.draggedGate = object.userData.gateInstance;
                this.dragOffset.copy(intersects[0].point).sub(object.position);
            }
        }
    }

    onMouseMove(event) {
        if (!this.isDragging || !this.draggedGate) return;
        
        const canvas = document.getElementById('quantumCanvas');
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Convert to 3D coordinates
        const x = (mouseX / rect.width) * 4 - 2;
        const y = -(mouseY / rect.height) * 3 + 1.5;
        
        // Update gate position
        this.draggedGate.mesh.position.set(x, y, 0);
        
        // Snap to qubit line
        const nearestQubit = this.getNearestQubit(y);
        this.draggedGate.mesh.position.y = nearestQubit * this.SPACING_Y - (this.qubits - 1) * this.SPACING_Y / 2;
    }

    onMouseUp(event) {
        if (this.isDragging && this.draggedGate) {
            // Snap to grid
            const depthIdx = Math.round((this.draggedGate.mesh.position.x - this.OFFSET_X) / this.SPACING_X);
            const x = this.getColumnX(depthIdx);
            const y = this.draggedGate.mesh.position.y;
            
            this.draggedGate.mesh.position.x = x;
            this.draggedGate.depth = depthIdx;
            
            // Update qubit index
            const qubitIndex = this.getNearestQubit(y);
            this.draggedGate.qubitIndex = qubitIndex;
            
            this.isDragging = false;
            this.draggedGate = null;
        }
    }

    updateCircuitDepth() {
        let maxDepth = 0;
        this.gateInstances.forEach(gate => {
            maxDepth = Math.max(maxDepth, gate.depth);
        });
        this.circuitDepth = maxDepth + 1;
        this.updateGrid();
    }

    // Draw faint grid rails for columns
    updateGrid(){
        // clear previous
        while(this.gridGroup.children.length>0){
            const obj=this.gridGroup.children.pop();
            obj.geometry.dispose();
            if(obj.material) obj.material.dispose();
        }

        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x444444, transparent:true, opacity:0.15 });

        // horizontal qubit rails are already on each qubit mesh line so skip

        // vertical columns
        for(let d=0; d<=this.circuitDepth; d++){
            const x=this.getColumnX(d);
            const yTop = this.SPACING_Y*(this.qubits-1)/2;
            const yBottom = -yTop;
            const geo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, yTop+0.3, -0.01),
                new THREE.Vector3(x, yBottom-0.3, -0.01)
            ]);
            const line=new THREE.Line(geo, lineMaterial);
            this.gridGroup.add(line);
        }
    }

    updateCircuitInfo() {
        document.getElementById('qubitCount').textContent = this.qubits;
        document.getElementById('circuitDepth').textContent = this.circuitDepth;
        document.getElementById('gateCount').textContent = this.circuit.length;
    }

    clearCircuit() {
        // Remove all gates from scene
        this.circuit.forEach(gate => {
            this.scene.remove(gate.mesh);
        });
        
        this.circuit = [];
        this.gateInstances = [];
        this.circuitDepth = 0;
        this.updateCircuitInfo();
        
        // Reset quantum simulator
        this.quantumSimulator.reset();
    }

    addQubit() {
        if (this.qubits < 10) { // Limit to 10 qubits for performance
            this.qubits++;
            this.quantumSimulator.addQubit();
            this.initializeQubits();
            this.updateCircuitInfo();
            this.updateGrid();
        }
    }

    removeQubit() {
        if (this.qubits > 1) {
            // Remove gates on the last qubit
            this.circuit = this.circuit.filter(gate => {
                if (gate.qubitIndex === this.qubits - 1) {
                    this.scene.remove(gate.mesh);
                    return false;
                }
                return true;
            });
            
            this.qubits--;
            this.quantumSimulator.removeQubit();
            this.initializeQubits();
            this.updateCircuitInfo();
            this.updateGrid();
        }
    }

    // Execute circuit step by step
    executeCircuit() {
        // Sort circuit by depth
        const sortedCircuit = [...this.circuit].sort((a, b) => a.depth - b.depth);
        
        // Execute each gate
        sortedCircuit.forEach((gate, index) => {
            setTimeout(() => {
                this.executeGate(gate);
            }, index * 500); // 500ms delay between gates
        });
    }

    executeGate(gate) {
        try {
            // Apply gate to quantum simulator
            if (gate.name === 'MEASURE') {
                const bit = this.quantumSimulator.measureSingle(gate.qubitIndex);
                const counts = {};
                counts[bit === 0 ? '0'.repeat(this.qubits) : '1'.padStart(this.qubits,'0')] = 1;
                if (this.visualization && this.visualization.ibmIntegration) {
                    this.visualization.ibmIntegration.updateResultsHistogram(counts);
                }
            } else {
                this.quantumSimulator.applyGate(gate.name, gate.qubitIndex, {
                    ...gate.parameters,
                    controlQubit: gate.controlQubit
                });
            }
            
            // Animate gate
            this.animateGateExecution(gate);
            
            // Update visualizations
            this.updateVisualizations();
            
        } catch (error) {
            console.error('Error executing gate:', error);
        }
    }

    animateGateExecution(gate) {
        // Animate gate mesh
        this.gateModels.animateGateApplication(gate.mesh);
        
        // Animate qubit
        const qubitMesh = this.qubitMeshes[gate.qubitIndex];
        if (qubitMesh) {
            const originalScale = qubitMesh.scale.clone();
            qubitMesh.scale.multiplyScalar(1.5);
            
            setTimeout(() => {
                qubitMesh.scale.copy(originalScale);
            }, 300);
        }
    }

    updateVisualizations() {
        // Update Bloch sphere
        if (window.blochSphere) {
            const blochCoords = this.quantumSimulator.getBlochCoordinates(0);
            window.blochSphere.animateToState(blochCoords, 500);
        }
        
        // Update state vector display
        const stateVectorString = this.quantumSimulator.getStateVectorString();
        document.getElementById('stateVectorDisplay').textContent = stateVectorString;
        
        // Update statistics
        const entanglement = this.quantumSimulator.calculateEntanglement();
        document.getElementById('entanglement').textContent = entanglement.toFixed(3);

        // Local fidelity: compare current state to |0…0⟩ reference
        if (this.quantumSimulator.stateVector && this.quantumSimulator.stateVector.length) {
            const fidelity = Math.pow(Math.abs(this.quantumSimulator.stateVector[0]), 2);
            const fidelityElem = document.getElementById('fidelity');
            if (fidelityElem) fidelityElem.textContent = fidelity.toFixed(3);
        }
    }

    // Save circuit to JSON
    saveCircuit() {
        const circuitData = {
            qubits: this.qubits,
            gates: this.circuit.map(gate => ({
                type: gate.type,
                qubitIndex: gate.qubitIndex,
                depth: gate.depth,
                parameters: gate.parameters,
                controlQubit: gate.controlQubit,
                targetQubit: gate.targetQubit
            }))
        };
        
        const dataStr = JSON.stringify(circuitData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'quantum_circuit.json';
        link.click();
    }

    // Load circuit from JSON
    loadCircuit(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const circuitData = JSON.parse(e.target.result);
                this.loadCircuitData(circuitData);
            } catch (error) {
                console.error('Error loading circuit:', error);
                alert('Error loading circuit file');
            }
        };
        reader.readAsText(file);
    }

    loadCircuitData(circuitData) {
        // Clear existing circuit
        this.clearCircuit();
        
        // Set qubits
        this.qubits = circuitData.qubits;
        this.quantumSimulator.qubits = this.qubits;
        this.quantumSimulator.stateVector = this.quantumSimulator.initializeStateVector();
        
        // Recreate qubits
        this.initializeQubits();
        
        // Add gates
        circuitData.gates.forEach(gateData => {
            const gateInstance = this.createGateInstance(
                gateData.type, 
                gateData.qubitIndex, 
                gateData.depth
            );
            
            if (gateInstance) {
                gateInstance.parameters = gateData.parameters || {};
                gateInstance.controlQubit = gateData.controlQubit;
                gateInstance.targetQubit = gateData.targetQubit;
                
                this.circuit.push(gateInstance);
                this.scene.add(gateInstance.mesh);
            }
        });
        
        this.updateCircuitDepth();
        this.updateCircuitInfo();
    }

    // Undo/Redo system inspired by Quirk
    saveState() {
        // Save current circuit state to history
        const state = {
            gateInstances: this.gateInstances.map(gate => ({
                type: gate.type,
                name: gate.name,
                position: gate.mesh.position.clone(),
                qubit: gate.qubit,
                depth: gate.depth,
                parameters: gate.parameters || {}
            })),
            circuit: JSON.parse(JSON.stringify(this.circuit)),
            circuitDepth: this.circuitDepth,
            timestamp: Date.now()
        };
        
        // Remove any history after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        this.history.push(state);
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }

    restoreState(state) {
        // Clear current circuit
        this.clearCircuit();
        
        // Restore gates and circuit array
        state.gateInstances.forEach(gateData => {
            const gateMesh = this.gateModels.cloneGateModel(gateData.name);
            if (gateMesh) {
                gateMesh.position.copy(gateData.position);

                const gateInstance = {
                    type: gateData.type,
                    name: gateData.name,
                    mesh: gateMesh,
                    qubit: gateData.qubit,
                    depth: gateData.depth,
                    parameters: gateData.parameters
                };

                this.gateInstances.push(gateInstance);
                this.scene.add(gateMesh);
            }
        });
        
        this.circuitDepth = state.circuitDepth;
        this.circuit = state.circuit || [];
        this.updateGrid();
    }

    clearCircuit() {
        // Remove all gates from scene
        this.gateInstances.forEach(gate => {
            this.scene.remove(gate.mesh);
        });
        this.gateInstances = [];
        this.circuitDepth = 0;
        this.updateGrid();
    }

    // Multi-select functionality
    selectGate(gateInstance) {
        if (this.selectedGates) {
            this.selectedGates = [];
        }
        this.selectedGates = [gateInstance];
        this.highlightSelectedGates();
    }

    selectMultipleGates(gateInstances) {
        this.selectedGates = gateInstances;
        this.highlightSelectedGates();
    }

    highlightSelectedGates() {
        // Remove previous highlights
        this.gateInstances.forEach(gate => {
            gate.mesh.material.emissive.setHex(0x000000);
        });
        
        // Highlight selected gates
        if (this.selectedGates) {
            this.selectedGates.forEach(gate => {
                gate.mesh.material.emissive.setHex(0x00ff00);
            });
        }
    }

    deleteSelectedGates() {
        if (this.selectedGates && this.selectedGates.length > 0) {
            this.saveState(); // Save before deletion
            
            this.selectedGates.forEach(gate => {
                const index = this.gateInstances.indexOf(gate);
                if (index > -1) {
                    this.scene.remove(gate.mesh);
                    this.gateInstances.splice(index, 1);
                }
            });
            
            this.selectedGates = [];
            this.updateGrid();
        }
    }
}

// Export for use in other modules
window.CircuitBuilder = CircuitBuilder;