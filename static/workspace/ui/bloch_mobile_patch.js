/* Mobile-optimized Bloch sphere renderer (2026-10-02).
   Runtime patch for QuantumWidgets.drawSimpleBlochSphere (kept as a separate
   small file so the 300KB+ widgets.js never needs a full rewrite):
   - re-fits the canvas on resize / orientation change (debounced)
   - pauses the animation loop while the widget is offscreen (battery saver)
   - honors the OS "reduce motion" preference (single static frame)
   - stronger-contrast strokes and a slightly larger sphere for small screens */
(function () {
    'use strict';

    var _blochResizeBound = false; // module-level: exactly one window resize listener

    function improvedDrawSimpleBlochSphere(canvasId, targetX = 0, targetY = 0, targetZ = 1) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 300;
    const height = canvas.clientHeight || 260;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = width / 2;
    const centerY = height / 2 - 10;
    const radius = Math.min(width, height) * 0.38;

    let rotationAngle = 0;
    const pitch = Math.PI / 10; // 18 degree tilt

    // Clear any existing animation frame
    if (canvas.animationFrameId) {
        cancelAnimationFrame(canvas.animationFrameId);
    }

    // Mobile optimization: pause the render loop while the widget is
    // offscreen, and honor the OS reduced-motion preference.
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let blochRunning = !reduceMotion;


    const tick = () => {
        rotationAngle += 0.005; // speed of rotation

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Get dynamic theme colors
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#ffffff';
        const textColorMuted = getComputedStyle(document.body).getPropertyValue('--text-muted') || '#a0aec0';
        
        // Draw sphere background circle (subtle glassmorphism style)
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(128, 128, 128, 0.03)';
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
        ctx.stroke();

        // 3D coordinate projection helper
        const project = (x, y, z) => {
            // Rotate around Z axis (yaw)
            const xRot = x * Math.cos(rotationAngle) - y * Math.sin(rotationAngle);
            const yRot = x * Math.sin(rotationAngle) + y * Math.cos(rotationAngle);
            const zRot = z;

            // Tilt around X axis (pitch)
            const xProj = xRot;
            const yProj = yRot * Math.cos(pitch) - zRot * Math.sin(pitch);
            
            return {
                x: centerX + radius * xProj,
                y: centerY - radius * yProj
            };
        };

        // Draw rotated grid lines (latitudes / longitudes)
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';

        // Draw Equator (Z = 0 circle)
        ctx.beginPath();
        for (let a = 0; a <= 2 * Math.PI + 0.1; a += 0.1) {
            const eqX = Math.cos(a);
            const eqY = Math.sin(a);
            const pt = project(eqX, eqY, 0);
            if (a === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Draw Prime Meridian (Y = 0 circle)
        ctx.beginPath();
        for (let a = 0; a <= 2 * Math.PI + 0.1; a += 0.1) {
            const mX = Math.cos(a);
            const mZ = Math.sin(a);
            const pt = project(mX, 0, mZ);
            if (a === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Draw Z-axis (pointing from -1 to 1)
        const zTop = project(0, 0, 1.05);
        const zBot = project(0, 0, -1.05);
        ctx.beginPath();
        ctx.moveTo(zBot.x, zBot.y);
        ctx.lineTo(zTop.x, zTop.y);
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Z-axis labels: |0⟩ at top, |1⟩ at bottom
        ctx.fillStyle = textColor;
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('|0⟩', zTop.x, zTop.y - 8);
        ctx.fillText('|1⟩', zBot.x, zBot.y + 14);

        // Draw X and Y axes rotating
        const xEnd = project(1.05, 0, 0);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(xEnd.x, xEnd.y);
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.15)';
        ctx.stroke();
        ctx.fillStyle = textColorMuted;
        ctx.font = '500 10px Inter, sans-serif';
        ctx.fillText('+x', xEnd.x + (xEnd.x > centerX ? 8 : -8), xEnd.y + 3);

        const yEnd = project(0, 1.05, 0);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(yEnd.x, yEnd.y);
        ctx.stroke();
        ctx.fillText('+y', yEnd.x + (yEnd.x > centerX ? 8 : -8), yEnd.y + 3);

        // Draw State Vector
        const vecEnd = project(targetX, targetY, targetZ);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(vecEnd.x, vecEnd.y);
        ctx.strokeStyle = textColor; // Matches the theme color
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Draw Vector endpoint dot
        ctx.beginPath();
        ctx.arc(vecEnd.x, vecEnd.y, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = textColor;
        ctx.fill();

        // Draw state label
        ctx.fillStyle = textColor;
        ctx.font = 'italic 11px Inter, sans-serif';
        ctx.fillText('|ψ⟩', vecEnd.x + (vecEnd.x > centerX ? 10 : -10), vecEnd.y - 6);

        if (blochRunning) canvas.animationFrameId = requestAnimationFrame(tick);
    };

    // Pause rendering while the widget is offscreen (battery saver on mobile)
    if (canvas._blochObserver) canvas._blochObserver.disconnect();
    if ('IntersectionObserver' in window) {
        canvas._blochObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !blochRunning) {
                    blochRunning = true;
                    canvas.animationFrameId = requestAnimationFrame(tick);
                } else if (!entry.isIntersecting && blochRunning) {
                    blochRunning = false;
                    if (canvas.animationFrameId) cancelAnimationFrame(canvas.animationFrameId);
                }
            });
        }, { threshold: 0.05 });
        canvas._blochObserver.observe(canvas);
    }

    // Re-fit the canvas on resize / orientation change (debounced)
    if (!_blochResizeBound) {
        _blochResizeBound = true;
        let _blochResizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(_blochResizeTimer);
            _blochResizeTimer = setTimeout(() => {
                const c = document.getElementById(canvasId);
                if (c) this.drawSimpleBlochSphere(canvasId, targetX, targetY, targetZ);
            }, 250);
        });
    }

    if (blochRunning) {
        canvas.animationFrameId = requestAnimationFrame(tick);
    } else {
        tick(); // single static frame when reduced motion is preferred
    }
}

    function applyPatch() {
        var inst = window.quantumWidgets;
        if (!inst || inst._blochMobilePatched) return !!inst;
        var proto = Object.getPrototypeOf(inst);
        if (!proto || typeof proto.drawSimpleBlochSphere !== 'function') return false;
        proto.drawSimpleBlochSphere = improvedDrawSimpleBlochSphere;
        inst._blochMobilePatched = true;
        // Redraw right away if the widget already rendered with the old code
        try {
            if (document.getElementById('bloch-widget-canvas') &&
                typeof inst.updateBlochSphereWidget === 'function') {
                inst.updateBlochSphereWidget();
            }
        } catch (e) { /* non-fatal */ }
        return true;
    }

    function onReady(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    onReady(function () {
        if (applyPatch()) return;
        var tries = 0;
        var timer = setInterval(function () {
            if (applyPatch() || ++tries > 40) clearInterval(timer);
        }, 250);
    });
})();
