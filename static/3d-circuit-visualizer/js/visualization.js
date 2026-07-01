/**
 * 3D Visualization Engine
 * Main Three.js scene management and rendering
 */

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

    // Toggle this to true if you want placeholder objects for debugging the scene
    static DEBUG_SCENE_CONTENT = false;

    initialize() {
        try {
            console.log('🚀 Starting QuantumVisualization initialization...');
            
            // Verify THREE.js is loaded
            if (typeof THREE === 'undefined') {
                throw new Error('THREE.js library not loaded');
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
            
            // Initialize components with error handling
            try {
                console.log('Initializing quantum simulator...');
                if (typeof QuantumSimulator !== 'undefined') {
                    this.quantumSimulator = new QuantumSimulator();
                } else {
                    console.warn('QuantumSimulator not available, using fallback');
                    this.quantumSimulator = { qubits: 3, getBlochCoordinates: () => ({ x: 0, y: 0, z: 1 }) };
                }
            } catch (simError) {
                console.warn('QuantumSimulator initialization failed, using fallback:', simError);
                this.quantumSimulator = { qubits: 3, getBlochCoordinates: () => ({ x: 0, y: 0, z: 1 }) };
            }
            
            try {
                console.log('Initializing circuit builder...');
                if (typeof CircuitBuilder !== 'undefined') {
                    this.circuitBuilder = new CircuitBuilder(this.scene, this.camera, this.quantumSimulator);
                } else {
                    console.warn('CircuitBuilder not available, using fallback');
                    this.circuitBuilder = { circuit: [] };
                }
            } catch (builderError) {
                console.warn('CircuitBuilder initialization failed, using fallback:', builderError);
                this.circuitBuilder = { circuit: [] };
            }
            
            try {
                console.log('Initializing Bloch spheres...');
                this.blochGroup = [];
                const container = document.getElementById('blochSpheresContainer');
                if (container && typeof BlochSphere !== 'undefined') {
                    container.innerHTML = '';
                    for (let i = 0; i < this.quantumSimulator.qubits; i++) {
                        const canvas = document.createElement('canvas');
                        canvas.width = 150; 
                        canvas.height = 150;
                        container.appendChild(canvas);
                        try {
                            const sphere = new BlochSphere(canvas);
                            this.blochGroup.push(sphere);
                        } catch (sphereError) {
                            console.warn(`Failed to create Bloch sphere ${i}:`, sphereError);
                        }
                    }
                } else {
                    console.warn('BlochSphere container or class not available');
                }
            } catch (blochError) {
                console.warn('Bloch sphere initialization failed:', blochError);
                this.blochGroup = [];
            }
            
            // IBM integration graceful fallback: try to initialize only if available
            try {
                const isIframe = window.self !== window.top;
                if (!isIframe) {
                    // In top-level context we may allow IBM integration
                    if ((window.Qiskit || window.qiskit) && typeof IBMIntegration !== 'undefined') {
                        console.log('Initializing IBM integration...');
                        this.ibmIntegration = new IBMIntegration();
                    } else {
                        console.log('Qiskit or IBMIntegration not present; continuing in local mode');
                        this.ibmIntegration = null;
                    }
                } else {
                    console.log('Embedded (iframe) detected; using local mode (no IBM)');
                    this.ibmIntegration = null;
                }
            } catch (e) {
                console.warn('IBM integration disabled due to error; continuing local only:', e.message);
                this.ibmIntegration = null;
            }
            
            // Start animation loop
            console.log('Starting animation loop...');
            this.animate();
            
            // Test render to make sure everything works
            console.log('Testing initial render...');
            if (this.renderer && this.scene && this.camera) {
                try {
                    this.renderer.render(this.scene, this.camera);
                    console.log('✅ Initial test render successful');
                    
                    // Log scene info
                    console.log('Scene children count:', this.scene.children.length);
                    console.log('Camera position:', this.camera.position);
                    console.log('Renderer size:', this.renderer.getSize(new THREE.Vector2()));
                } catch (renderError) {
                    console.error('❌ Test render failed:', renderError);
                    this.showWebGLError();
                    throw renderError;
                }
            } else {
                console.error('❌ Cannot perform test render - missing components:', {
                    renderer: !!this.renderer,
                    scene: !!this.scene,
                    camera: !!this.camera
                });
                throw new Error('Missing essential components for rendering');
            }
            
            // Handle window resize
            window.addEventListener('resize', () => this.handleResize());
            
            console.log('✅ QuantumVisualization initialized successfully');
            
            // Hide loading overlay if present
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize QuantumVisualization:', error);
            
            // Show error in canvas
            const canvas = document.getElementById('quantumCanvas');
            if (canvas) {
                canvas.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ff6b6b; text-align: center; padding: 20px; background: #1a1a1a; border-radius: 8px;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🚫</div>
                        <h3 style="color: #ff6b6b; margin-bottom: 1rem;">Initialization Error</h3>
                        <p style="margin-bottom: 1rem; line-height: 1.5;">Failed to initialize 3D visualizer: ${error.message}</p>
                        <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #4ecdc4; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem;">
                            🔄 Reload Page
                        </button>
                    </div>
                `;
            }
            
            // Hide loading overlay
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            throw error;
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        
        // Add fog for depth
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);
        
        // Add grid
        const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
        this.scene.add(gridHelper);
        
        // Add axes
        const axesHelper = new THREE.AxesHelper(2);
        this.scene.add(axesHelper);
        
        // Optionally add placeholder objects for debugging purposes
        if (QuantumVisualization.DEBUG_SCENE_CONTENT) {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshPhongMaterial({ color: 0x00d4ff });
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(0, 0, 0);
            this.scene.add(cube);

            const sphereGeometry = new THREE.SphereGeometry(0.3, 16, 16);
            const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xff6b6b });
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.set(2, 0, 0);
            this.scene.add(sphere);
            console.log('✅ Scene setup complete with debug objects');
        }

        console.log('✅ Scene setup complete');
    }

    setupCamera() {
        const canvas = document.getElementById('quantumCanvas');
        if (!canvas) {
            throw new Error('Canvas element with ID "quantumCanvas" not found');
        }
        const aspect = canvas.offsetWidth / canvas.offsetHeight;
        
        // Slightly narrower FOV for crisper view of flat plates
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        // Start the camera at an isometric angle so gates aren’t edge-on
        const startDistance = 6;
        const startAzimuth = Math.PI / 6;  // 30°
        const startElevation = Math.PI / 12; // 15°
        const x = startDistance * Math.cos(startElevation) * Math.sin(startAzimuth);
        const y = startDistance * Math.sin(startElevation);
        const z = startDistance * Math.cos(startElevation) * Math.cos(startAzimuth);
        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0, 0);
        
        console.log('✅ Camera setup complete with aspect ratio:', aspect);
    }

    setupRenderer() {
        const canvas = document.getElementById('quantumCanvas');
        
        if (!canvas) {
            throw new Error('Canvas element with ID "quantumCanvas" not found');
        }

        console.log('Canvas found:', canvas);
        console.log('Canvas dimensions:', canvas.offsetWidth, 'x', canvas.offsetHeight);

        // Ensure canvas has proper dimensions
        if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) {
            console.warn('Canvas has zero dimensions, setting default size');
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            // Force a reflow to get actual dimensions
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                canvas.style.width = '800px';
                canvas.style.height = '600px';
            }
        }

        // Check WebGL support before creating renderer
        if (!this.checkWebGLSupport()) {
            this.showWebGLError();
            throw new Error('WebGL not supported');
        }

        try {
            // Verify THREE is available
            if (typeof THREE === 'undefined') {
                throw new Error('THREE.js library not loaded');
            }

            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: false,
                powerPreference: "high-performance"
            });
            
            this.renderer.setSize(canvas.offsetWidth || 800, canvas.offsetHeight || 600);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Enable shadows with fallback
            try {
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            } catch (shadowError) {
                console.warn('Shadow mapping not supported, continuing without shadows');
            }
            
            // Color-space handling (use modern API, polyfill if needed)
            try {
                if (!('outputColorSpace' in this.renderer)) {
                    // Polyfill outputColorSpace so codebase can rely on it everywhere
                    Object.defineProperty(this.renderer, 'outputColorSpace', {
                        configurable: true,
                        enumerable: true,
                        get() { return this.outputEncoding; },
                        set(v) { this.outputEncoding = v; }
                    });
                }
                if (typeof THREE.SRGBColorSpace === 'undefined') {
                    // Define constant matching r152 value so code compiles on older builds
                    THREE.SRGBColorSpace = THREE.sRGBEncoding || 3000;
                }
                this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            } catch (colorError) {
                console.warn('Color space configuration failed, using defaults');
            }
            
            // Tone mapping with fallback
            try {
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                this.renderer.toneMappingExposure = 1.2;
            } catch (toneError) {
                console.warn('Tone mapping not supported, using defaults');
            }
            
            console.log('✅ Renderer created successfully');
            console.log('Renderer info:', {
                width: canvas.offsetWidth,
                height: canvas.offsetHeight,
                pixelRatio: this.renderer.getPixelRatio(),
                context: this.renderer.getContext()
            });
        } catch (error) {
            console.error('Failed to create WebGL renderer:', error);
            this.showWebGLError();
            throw new Error('WebGL renderer creation failed: ' + error.message);
        }
    }

    // Check WebGL support
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                return false;
            }
            
            // Check for required extensions
            const requiredExtensions = ['OES_element_index_uint'];
            for (const ext of requiredExtensions) {
                if (!gl.getExtension(ext)) {
                    console.warn(`WebGL extension ${ext} not supported`);
                }
            }
            
            return true;
        } catch (e) {
            console.error('WebGL support check failed:', e);
            return false;
        }
    }

    // Show WebGL error in canvas
    showWebGLError() {
        const canvas = document.getElementById('quantumCanvas');
        if (canvas) {
            canvas.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ff6b6b; text-align: center; padding: 20px; background: #1a1a1a; border-radius: 8px;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="color: #ff6b6b; margin-bottom: 1rem;">WebGL Error</h3>
                    <p style="margin-bottom: 1rem; line-height: 1.5;">Unable to initialize 3D graphics. Please check WebGL support.</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #4ecdc4; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem;">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    }

    setupLighting() {
        // Slightly brighter ambient so flat tiles are readable
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Key light – cyan tint from upper right
        const keyLight = new THREE.DirectionalLight(0x00d4ff, 0.9);
        keyLight.position.set(4, 4, 6);
        keyLight.castShadow = true;
        this.scene.add(keyLight);

        // Fill light – soft white from left to reduce harsh shadows
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
        fillLight.position.set(-4, 2, 3);
        this.scene.add(fillLight);

        // Rim/back light – subtle teal for edge highlight
        const rimLight = new THREE.DirectionalLight(0x4ecdc4, 0.25);
        rimLight.position.set(-3, 4, -4);
        this.scene.add(rimLight);

        // Configure shadows on key light only
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 50;
        keyLight.shadow.camera.left = -10;
        keyLight.shadow.camera.right = 10;
        keyLight.shadow.camera.top = 10;
        keyLight.shadow.camera.bottom = -10;
        
        // Point lights for quantum effects
        const pointLight1 = new THREE.PointLight(0x00d4ff, 0.5, 10);
        pointLight1.position.set(-3, 2, 3);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xff6b6b, 0.3, 8);
        pointLight2.position.set(3, -2, 2);
        this.scene.add(pointLight2);
        
        // previous rim light replaced above
    }

    setupControls() {
        const canvas = document.getElementById('quantumCanvas');
        
        // Try to use OrbitControls if available
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, canvas);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.enableZoom = true;
            this.controls.enablePan = true;
            this.controls.enableRotate = true;
            this.controls.maxDistance = 20;
            this.controls.minDistance = 2;
            console.log('✅ OrbitControls initialized');
        } else {
            // Fallback to simple controls
            console.warn('⚠️ OrbitControls not available, using simple controls');
            this.controls = {
                target: new THREE.Vector3(0, 0, 0),
                distance: 5,
                azimuth: 0,
                elevation: 0,
                minDistance: 2,
                maxDistance: 20,
                update: () => {
                    // Simple auto-rotation for demo
                    this.controls.azimuth += 0.005;
                    this.updateCameraPosition();
                }
            };
            this.updateCameraPosition();
        }
    }

    setupEventListeners() {
        const canvas = document.getElementById('quantumCanvas');
        
        // Mouse controls
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        
        canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (isMouseDown) {
                const deltaX = e.clientX - mouseX;
                const deltaY = e.clientY - mouseY;
                
                this.controls.azimuth -= deltaX * 0.01;
                this.controls.elevation += deltaY * 0.01;
                this.controls.elevation = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.controls.elevation));
                
                this.updateCameraPosition();
                
                mouseX = e.clientX;
                mouseY = e.clientY;
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
        
        // Wheel zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.controls.distance += e.deltaY * 0.01;
            this.controls.distance = Math.max(this.controls.minDistance, Math.min(this.controls.maxDistance, this.controls.distance));
            this.updateCameraPosition();
        });
        
        // Touch controls for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            
            this.controls.azimuth -= deltaX * 0.01;
            this.controls.elevation += deltaY * 0.01;
            this.controls.elevation = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.controls.elevation));
            
            this.updateCameraPosition();
            
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        });
    }

    updateCameraPosition() {
        const x = this.controls.distance * Math.cos(this.controls.elevation) * Math.sin(this.controls.azimuth);
        const y = this.controls.distance * Math.sin(this.controls.elevation);
        const z = this.controls.distance * Math.cos(this.controls.elevation) * Math.cos(this.controls.azimuth);
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.controls.target);
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        if (this.isAnimating) {
            // Update quantum effects
            this.updateQuantumEffects();
            
            // Update circuit animations
            this.updateCircuitAnimations();
        }
        
        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        } else {
            console.warn('Missing renderer, scene, or camera:', {
                renderer: !!this.renderer,
                scene: !!this.scene,
                camera: !!this.camera
            });
        }

        if (this.blochGroup && document.getElementById('showBlochSpheres').checked) {
            this.blochGroup.forEach((sphere, idx) => {
                const coords = this.quantumSimulator.getBlochCoordinates(idx);
                sphere.animateToState(coords, 400);
            });
        }
    }

    updateQuantumEffects() {
        const time = Date.now() * 0.001 * this.animationSpeed;
        
        // Animate qubit meshes
        if (this.circuitBuilder && this.circuitBuilder.qubitMeshes) {
            this.circuitBuilder.qubitMeshes.forEach((qubitMesh, index) => {
                // Gentle floating animation
                qubitMesh.position.y += Math.sin(time + index) * 0.001;
                
                // Pulsing glow
                const glowMesh = qubitMesh.children.find(child => child.material && child.material.opacity === 0.3);
                if (glowMesh) {
                    glowMesh.material.opacity = 0.3 + Math.sin(time * 2 + index) * 0.1;
                }
            });
        }
        
        // Animate gate meshes
        if (this.circuitBuilder && this.circuitBuilder.circuit) {
            this.circuitBuilder.circuit.forEach(gate => {
                // Subtle rotation for active gates
                if (gate.mesh) {
                    gate.mesh.rotation.y += 0.005 * this.animationSpeed;
                }
            });
        }
    }

    updateCircuitAnimations() {
        // Update any running circuit animations
        // This would be called when executing circuits step by step
    }

    handleResize() {
        const canvas = document.getElementById('quantumCanvas');
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        
        // Update Bloch sphere
        if (this.blochGroup) {
            this.blochGroup.forEach(sphere => {
                sphere.handleResize();
            });
        }
    }

    // Reset camera to default position
    resetCamera() {
        this.controls.azimuth = 0;
        this.controls.elevation = 0;
        this.controls.distance = 5;
        this.updateCameraPosition();
    }

    // Toggle animation
    toggleAnimation() {
        this.isAnimating = !this.isAnimating;
        const button = document.getElementById('toggleAnimation');
        if (button) {
            const icon = button.querySelector('i');
            icon.className = this.isAnimating ? 'fas fa-pause' : 'fas fa-play';
        }
    }

    // Set animation speed
    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
    }

    // Add quantum particle effects
    addQuantumParticles() {
        const particleCount = 100;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random positions
            positions[i3] = (Math.random() - 0.5) * 20;
            positions[i3 + 1] = (Math.random() - 0.5) * 20;
            positions[i3 + 2] = (Math.random() - 0.5) * 20;
            
            // Quantum colors
            const color = new THREE.Color();
            color.setHSL(Math.random() * 0.3 + 0.5, 0.8, 0.6);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6
        });
        
        const particleSystem = new THREE.Points(particles, particleMaterial);
        this.scene.add(particleSystem);
        
        // Animate particles
        const animateParticles = () => {
            const positions = particles.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                positions[i3 + 1] += 0.01;
                if (positions[i3 + 1] > 10) {
                    positions[i3 + 1] = -10;
                }
            }
            particles.attributes.position.needsUpdate = true;
            
            if (this.isAnimating) {
                requestAnimationFrame(animateParticles);
            }
        };
        
        animateParticles();
    }

    // Add quantum field visualization
    addQuantumField() {
        const fieldGeometry = new THREE.PlaneGeometry(20, 20, 50, 50);
        const fieldMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0x00d4ff) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color;
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                    float wave = sin(vPosition.x * 0.5 + time) * cos(vPosition.y * 0.5 + time);
                    float alpha = (wave + 1.0) * 0.1;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const fieldMesh = new THREE.Mesh(fieldGeometry, fieldMaterial);
        fieldMesh.rotation.x = -Math.PI / 2;
        fieldMesh.position.y = -2;
        this.scene.add(fieldMesh);
        
        // Animate field
        const animateField = () => {
            fieldMaterial.uniforms.time.value = Date.now() * 0.001;
            if (this.isAnimating) {
                requestAnimationFrame(animateField);
            }
        };
        
        animateField();
    }

    // Cleanup
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Dispose of geometries and materials
        this.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }
}

// Export for use in other modules
window.QuantumVisualization = QuantumVisualization;