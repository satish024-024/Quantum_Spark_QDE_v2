/**
 * Bloch Sphere Visualization
 * 3D visualization of single qubit quantum states
 */

class BlochSphere {
    constructor(canvasOrId) {
        if (typeof canvasOrId === 'string') {
            this.canvas = document.getElementById(canvasOrId);
        } else {
            this.canvas = canvasOrId; // assume HTMLCanvasElement
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
        // Set canvas size
        this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
        this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Update center coordinates
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
            };
            
            this.draw();
            
            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
            }
        };
        
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
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, this.radius
        );
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.1)');
        gradient.addColorStop(0.7, 'rgba(0, 212, 255, 0.05)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0.02)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw sphere outline
        this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Draw grid lines
        this.drawGridLines();
    }

    drawGridLines() {
        this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Horizontal grid lines
        for (let i = -1; i <= 1; i += 0.5) {
            const y = this.centerY + i * this.radius;
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX - this.radius, y);
            this.ctx.lineTo(this.centerX + this.radius, y);
            this.ctx.stroke();
        }
        
        // Vertical grid lines
        for (let i = -1; i <= 1; i += 0.5) {
            const x = this.centerX + i * this.radius;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.centerY - this.radius);
            this.ctx.lineTo(x, this.centerY + this.radius);
            this.ctx.stroke();
        }
    }

    drawAxes() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 2;
        
        // X-axis (red)
        this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX - this.radius, this.centerY);
        this.ctx.lineTo(this.centerX + this.radius, this.centerY);
        this.ctx.stroke();
        
        // Y-axis (green)
        this.ctx.strokeStyle = 'rgba(100, 255, 100, 0.6)';
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, this.centerY - this.radius);
        this.ctx.lineTo(this.centerX, this.centerY + this.radius);
        this.ctx.stroke();
        
        // Z-axis (blue) - represented as depth
        this.ctx.strokeStyle = 'rgba(100, 100, 255, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius * 0.3, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    drawStateVector() {
        // Calculate 2D projection of 3D state vector
        const x2d = this.state.x * this.radius;
        const y2d = -this.state.y * this.radius; // Flip Y for screen coordinates
        const z2d = this.state.z * this.radius;
        
        // Draw state vector line
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, this.centerY);
        this.ctx.lineTo(this.centerX + x2d, this.centerY + y2d);
        this.ctx.stroke();
        
        // Draw state point
        const pointX = this.centerX + x2d;
        const pointY = this.centerY + y2d;
        
        // Glow effect
        const glowGradient = this.ctx.createRadialGradient(
            pointX, pointY, 0,
            pointX, pointY, 15
        );
        glowGradient.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
        glowGradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.4)');
        glowGradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
        
        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(pointX, pointY, 15, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // State point
        this.ctx.fillStyle = '#00d4ff';
        this.ctx.beginPath();
        this.ctx.arc(pointX, pointY, 6, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw probability circles
        this.drawProbabilityCircles();
    }

    drawProbabilityCircles() {
        // |0⟩ probability circle
        const prob0 = (1 + this.state.z) / 2;
        const prob1 = (1 - this.state.z) / 2;
        
        // |0⟩ circle (top)
        this.ctx.strokeStyle = `rgba(0, 255, 100, ${prob0})`;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY - this.radius * 0.7, 8, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // |1⟩ circle (bottom)
        this.ctx.strokeStyle = `rgba(255, 100, 100, ${prob1})`;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY + this.radius * 0.7, 8, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    drawLabels() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'center';
        
        // Axis labels
        this.ctx.fillText('|0⟩', this.centerX, this.centerY - this.radius - 10);
        this.ctx.fillText('|1⟩', this.centerX, this.centerY + this.radius + 20);
        this.ctx.fillText('X', this.centerX + this.radius + 10, this.centerY + 5);
        this.ctx.fillText('Y', this.centerX - 5, this.centerY - this.radius - 10);
        
        // State coordinates
        this.ctx.fillStyle = '#00d4ff';
        this.ctx.font = '10px Inter';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(
            `X: ${this.state.x.toFixed(2)}`,
            this.centerX - this.radius,
            this.centerY + this.radius + 15
        );
        this.ctx.fillText(
            `Y: ${this.state.y.toFixed(2)}`,
            this.centerX - this.radius,
            this.centerY + this.radius + 30
        );
        this.ctx.fillText(
            `Z: ${this.state.z.toFixed(2)}`,
            this.centerX - this.radius,
            this.centerY + this.radius + 45
        );
    }

    // Convert quantum state to Bloch coordinates
    static stateToBloch(alpha, beta) {
        // alpha and beta are complex amplitudes
        const alphaReal = alpha.real || alpha;
        const alphaImag = alpha.imag || 0;
        const betaReal = beta.real || beta;
        const betaImag = beta.imag || 0;
        
        const x = 2 * (alphaReal * betaReal + alphaImag * betaImag);
        const y = 2 * (alphaImag * betaReal - alphaReal * betaImag);
        const z = Math.pow(Math.abs(alpha), 2) - Math.pow(Math.abs(beta), 2);
        
        return { x, y, z };
    }

    // Handle window resize
    handleResize() {
        this.setupCanvas();
        this.draw();
    }
}

// Export for use in other modules
window.BlochSphere = BlochSphere;