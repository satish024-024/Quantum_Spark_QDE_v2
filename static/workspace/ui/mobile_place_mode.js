/* ============================================================================
 * Mobile tap-to-place circuit builder.
 *
 * Additive module: drives the existing CircuitBuilder engine through its public
 * API (addGate / removeGate / undo / redo). Activates only on mobile
 * (coarse pointer + narrow viewport) or ?mobile_builder=1. Desktop behavior
 * is untouched: this file returns early before wiring anything.
 *
 * Interaction (Q.js-style, proven on touch):
 *   1. Tap a gate tile in the palette  -> gate is "armed".
 *   2. Tap a qubit rail in the 3D view -> gate snaps to (qubit, depth) and is
 *      placed through the existing addGate() (validation, Qiskit, Bloch, …).
 *   3. Two-qubit gates: tap CONTROL rail, then TARGET rail (explicit order).
 * ========================================================================== */
(function () {
    'use strict';

    /* ---------------- activation ---------------- */
    function isMobileBuilder() {
        try {
            var q = new URLSearchParams(window.location.search);
            if (q.has('mobile_builder')) return q.get('mobile_builder') !== '0';
        } catch (e) { /* ignore */ }
        var coarse = false;
        try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) { /* ignore */ }
        var w = Math.min(window.innerWidth || 9999, (window.screen && window.screen.width) || 9999);
        return coarse && w <= 900;
    }
    if (!isMobileBuilder()) return;

    /* ---------------- gate metadata ---------------- */
    var TWO_QUBIT = ['CNOT', 'CX', 'CZ', 'CY', 'CH', 'SWAP', 'ISWAP', 'CRX', 'CRY', 'CRZ'];
    var THREE_QUBIT = ['TOFFOLI', 'CCX', 'CCZ', 'CSWAP', 'FREDKIN'];
    var PARAMETRIC = ['RX', 'RY', 'RZ']; // angle sheet; Qiskit codegen reads params[0]
    var SPACING_X = 0.8, SPACING_Y = 0.6;

    var GATE_LABELS = {
        I: 'Identity', X: 'Pauli-X', Y: 'Pauli-Y', Z: 'Pauli-Z', H: 'Hadamard',
        S: 'S gate', SDG: 'S-adjoint', T: 'T gate', TDG: 'T-adjoint', P: 'Phase',
        RX: 'X-rotation', RY: 'Y-rotation', RZ: 'Z-rotation', U: 'U gate', SX: '√X',
        CNOT: 'CNOT', CX: 'CNOT', CY: 'Controlled-Y', CZ: 'Controlled-Z', CH: 'Controlled-H',
        CRX: 'Controlled-RX', CRY: 'Controlled-RY', CRZ: 'Controlled-RZ',
        SWAP: 'SWAP', ISWAP: 'iSWAP', TOFFOLI: 'Toffoli', CCX: 'Toffoli', CCZ: 'CCZ',
        CSWAP: 'Fredkin', FREDKIN: 'Fredkin',
        MEASURE: 'Measure', RESET: 'Reset', BARRIER: 'Barrier'
    };

    /* ---------------- state ---------------- */
    var armed = null;        // {type, step, controlQubit, angle}
    var selectedMesh = null; // placed gate mesh selected for delete
    var ui = {};             // hint bar nodes
    var raycaster = null;
    var circuitPlane = null; // THREE.Plane z=0

    /* ---------------- engine access ---------------- */
    function app() { return window.unifiedQuantumApp || null; }
    function builder() { var a = app(); return (a && a.circuitBuilder) ? a.circuitBuilder : null; }
    function three() { return window.THREE || null; }

    function vibrate(ms) {
        try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ }
    }

    /* ---------------- hint bar ---------------- */
    function ensureHintBar() {
        if (ui.bar) return ui.bar;
        var bar = document.createElement('div');
        bar.id = 'mplace-hintbar';
        bar.setAttribute('role', 'status');
        bar.style.display = 'none';

        var txt = document.createElement('span');
        txt.className = 'mplace-hint-text';
        bar.appendChild(txt);
        ui.hintText = txt;

        function mkBtn(label, title, fn) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'mplace-hbtn';
            b.textContent = label;
            b.title = title;
            b.setAttribute('aria-label', title);
            b.addEventListener('click', function (ev) { ev.stopPropagation(); fn(); });
            bar.appendChild(b);
            return b;
        }
        ui.undoBtn = mkBtn('↺', 'Undo', function () { var b = builder(); if (b && b.undo()) { vibrate(10); } });
        ui.redoBtn = mkBtn('↻', 'Redo', function () { var b = builder(); if (b && b.redo()) { vibrate(10); } });
        mkBtn('✕', 'Cancel placement', function () { disarm(); });

        document.body.appendChild(bar);
        ui.bar = bar;
        return bar;
    }

    function setHint(text) {
        ensureHintBar();
        ui.hintText.textContent = text; // textContent: never HTML (user-safe)
        ui.bar.style.display = 'flex';
    }

    function flashHint(text) {
        setHint(text);
        vibrate([20, 40, 20]);
    }

    function hideHintBar() {
        if (ui.bar) ui.bar.style.display = 'none';
    }

    /* ---------------- camera ---------------- */
    function setPlacementCamera(on) {
        var a = app();
        if (!a || !a.controls) return;
        a.controls.enableRotate = !on;
        a.controls.enablePan = !on;
        a.controls.enableZoom = true;
    }

    function snapCameraFront() {
        var a = app(), b = builder(), T = three();
        if (!a || !b || !a.camera || !a.controls || !T) return;
        var n = b.qubits || 3;
        var maxDepth = 0;
        (b.circuit || []).forEach(function (g) { if (g.depth > maxDepth) maxDepth = g.depth; });
        var cx = Math.max(1.5, (maxDepth * SPACING_X) / 2);
        var dist = Math.max(6.5, maxDepth * SPACING_X + 4.5, n * 1.4);
        a.camera.position.set(cx, 0, dist);
        a.controls.target.set(cx, 0, 0);
        a.controls.update();
    }

    /* ---------------- arming ---------------- */
    function kindOf(type) {
        if (TWO_QUBIT.indexOf(type) >= 0) return 'two';
        if (THREE_QUBIT.indexOf(type) >= 0) return 'three';
        return 'one';
    }

    function label(type) { return GATE_LABELS[type] || type; }

    function armGate(type) {
        disarm(true);
        armed = { type: type, kind: kindOf(type), step: 0, controlQubit: null, angle: 'pi/2' };
        // highlight the armed tile
        document.querySelectorAll('.gate-item.mplace-armed').forEach(function (el) {
            el.classList.remove('mplace-armed');
        });
        var tile = document.querySelector('.gate-item[data-gate="' + type + '"]');
        if (tile) tile.classList.add('mplace-armed');

        if (PARAMETRIC.indexOf(type) >= 0) {
            showAngleSheet(type, function (angle) {
                if (!armed) return;
                armed.angle = angle;
                enterPlacement();
            });
        } else {
            enterPlacement();
        }
        vibrate(10);
    }

    function enterPlacement() {
        if (!armed) return;
        setPlacementCamera(true);
        snapCameraFront();
        deselectGate();
        if (armed.kind === 'two') setHint('Tap the CONTROL qubit rail for ' + label(armed.type));
        else if (armed.kind === 'three') setHint('Tap the MIDDLE qubit rail for ' + label(armed.type));
        else setHint('Tap a qubit rail to place ' + label(armed.type));
    }

    function disarm(silent) {
        armed = null;
        setPlacementCamera(false);
        document.querySelectorAll('.gate-item.mplace-armed').forEach(function (el) {
            el.classList.remove('mplace-armed');
        });
        hideAngleSheet();
        if (!silent) hideHintBar();
    }

    /* ---------------- angle sheet (RX/RY/RZ) ---------------- */
    var angleSheet = null, angleCb = null;
    var ANGLE_PRESETS = ['pi/4', 'pi/2', 'pi', '3*pi/2', '2*pi'];

    function showAngleSheet(type, cb) {
        hideAngleSheet();
        angleCb = cb;
        var sh = document.createElement('div');
        sh.id = 'mplace-anglesheet';
        sh.setAttribute('role', 'dialog');
        sh.setAttribute('aria-label', 'Choose rotation angle');

        var h = document.createElement('h4');
        h.textContent = label(type) + ' — rotation angle';
        sh.appendChild(h);

        var row = document.createElement('div');
        row.className = 'mplace-angle-row';
        ANGLE_PRESETS.forEach(function (p) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'mplace-angle-btn';
            b.textContent = p;
            b.addEventListener('click', function () { pickAngle(p); });
            row.appendChild(b);
        });
        sh.appendChild(row);

        var custom = document.createElement('div');
        custom.className = 'mplace-angle-custom';
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.inputMode = 'decimal';
        inp.placeholder = 'Custom (e.g. 1.57)';
        inp.setAttribute('aria-label', 'Custom angle in radians');
        var ok = document.createElement('button');
        ok.type = 'button';
        ok.className = 'mplace-angle-btn primary';
        ok.textContent = 'Use';
        ok.addEventListener('click', function () {
            var v = parseFloat(inp.value);
            if (isFinite(v)) pickAngle(String(v));
            else { inp.value = ''; inp.placeholder = 'Enter a number'; }
        });
        custom.appendChild(inp);
        custom.appendChild(ok);
        sh.appendChild(custom);

        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'mplace-angle-cancel';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', function () { disarm(); });
        sh.appendChild(cancel);

        document.body.appendChild(sh);
        angleSheet = sh;
        // pause placement until an angle is chosen
        if (ui.bar) ui.bar.style.display = 'none';
    }

    function pickAngle(a) {
        hideAngleSheet();
        var cb = angleCb; angleCb = null;
        if (cb) cb(a);
    }

    function hideAngleSheet() {
        if (angleSheet && angleSheet.parentNode) angleSheet.parentNode.removeChild(angleSheet);
        angleSheet = null;
    }

    /* ---------------- tap handling ---------------- */
    function canvas() {
        var a = app();
        return (a && a.renderer) ? a.renderer.domElement : document.getElementById('quantumCanvas');
    }

    function ndcFromEvent(e) {
        var c = canvas();
        var r = c.getBoundingClientRect();
        return {
            x: ((e.clientX - r.left) / r.width) * 2 - 1,
            y: -((e.clientY - r.top) / r.height) * 2 + 1
        };
    }

    function raycastPlane(e) {
        var a = app(), T = three();
        if (!a || !a.camera || !T) return null;
        if (!raycaster) raycaster = new T.Raycaster();
        if (!circuitPlane) circuitPlane = new T.Plane(new T.Vector3(0, 0, 1), 0);
        var ndc = ndcFromEvent(e);
        raycaster.setFromCamera({ x: ndc.x, y: ndc.y }, a.camera);
        var pt = new T.Vector3();
        return raycaster.ray.intersectPlane(circuitPlane, pt) ? { x: pt.x, y: pt.y } : null;
    }

    function railY(n, qubit) { return ((n - 1) / 2 - qubit) * SPACING_Y; }

    function nearestRail(y, n) {
        var best = -1, bestD = Infinity;
        for (var q = 0; q < n; q++) {
            var d = Math.abs(y - railY(n, q));
            if (d < bestD) { bestD = d; best = q; }
        }
        return { qubit: best, dist: bestD };
    }

    function circuitSpan(b) {
        var maxDepth = 0;
        (b.circuit || []).forEach(function (g) { if (g.depth > maxDepth) maxDepth = g.depth; });
        return maxDepth;
    }

    function occupiedAt(b, qubit, depth) {
        return (b.circuit || []).some(function (g) {
            if (g.depth !== depth) return false;
            var qs = g.qubits || [g.qubit];
            return qs.indexOf(qubit) >= 0;
        });
    }

    function nextFreeDepth(b, qubits, fromDepth) {
        var d = Math.max(0, fromDepth);
        var guard = 0;
        while (guard++ < 40) {
            var clash = qubits.some(function (q) { return occupiedAt(b, q, d); });
            if (!clash) return d;
            d++;
        }
        return d;
    }

    function handlePlacementTap(e, b) {
        var T = three();
        var hit = raycastPlane(e);
        if (!hit) { flashHint('Tap a qubit rail'); return; }
        var n = b.qubits || 3;
        var near = nearestRail(hit.y, n);
        var depth = Math.round(hit.x / SPACING_X);
        var maxX = (circuitSpan(b) + 2) * SPACING_X;

        if (near.qubit < 0 || near.dist > 0.45 || depth < 0 || hit.x > maxX || hit.x < -1) {
            flashHint('Tap closer to a qubit rail');
            return;
        }

        if (armed.kind === 'two') {
            handleTwoQubitTap(near.qubit, depth, b, T);
            return;
        }
        if (armed.kind === 'three') {
            var qs3 = [near.qubit - 1, near.qubit, near.qubit + 1].filter(function (q) { return q >= 0 && q < n; });
            if (qs3.length < 2) { flashHint('Need room for 3 qubits here'); return; }
            var d3 = nextFreeDepth(b, qs3, depth);
            placeGate(b, armed.type, d3, qs3, null, T);
            disarm();
            return;
        }
        // single-qubit (or barrier/measure/reset)
        var d1 = nextFreeDepth(b, [near.qubit], depth);
        var params = PARAMETRIC.indexOf(armed.type) >= 0 ? [armed.angle] : undefined;
        placeGate(b, armed.type, d1, [near.qubit], params, T);
        // stay armed for rapid placement
        enterPlacement();
    }

    function handleTwoQubitTap(qubit, depth, b, T) {
        if (armed.step === 0) {
            armed.controlQubit = qubit;
            armed.step = 1;
            armed.depthHint = depth;
            setHint('Control: q' + qubit + ' — now tap the TARGET rail');
            vibrate(10);
            return;
        }
        var c = armed.controlQubit, t = qubit;
        if (t === c) { flashHint('Pick a different rail for the target'); return; }
        var d = nextFreeDepth(b, [c, t], Math.max(depth, armed.depthHint || 0));
        placeGate(b, armed.type, d, [c, t], undefined, T);
        disarm();
    }

    function placeGate(b, type, depth, qubits, params, T) {
        var n = b.qubits || 3;
        // mesh position: x from depth; y = midpoint of involved qubits
        var ySum = 0;
        qubits.forEach(function (q) { ySum += railY(n, q); });
        var pos = new T.Vector3(depth * SPACING_X, ySum / qubits.length, 0);
        var opts = { qubits: qubits.slice() };
        if (params) opts.params = params;
        var mesh = b.addGate(type, pos, opts);
        if (mesh) {
            vibrate(15);
        } else {
            // addGate shows its own validation toast on failure
            vibrate([30, 50, 30]);
        }
    }

    /* ---------------- select / delete placed gate ---------------- */
    function meshRoot(obj) {
        var o = obj;
        while (o) {
            if (o.userData && o.userData.gate) return o;
            o = o.parent;
        }
        return null;
    }

    function selectGateAt(e, b) {
        var a = app(), T = three();
        if (!a || !a.camera || !T) return false;
        if (!raycaster) raycaster = new T.Raycaster();
        var ndc = ndcFromEvent(e);
        raycaster.setFromCamera({ x: ndc.x, y: ndc.y }, a.camera);
        var hits = raycaster.intersectObjects(b.gateInstances || [], true);
        for (var i = 0; i < hits.length; i++) {
            var root = meshRoot(hits[i].object);
            if (root) { showGatePopup(root, e); return true; }
        }
        return false;
    }

    var popup = null;
    function showGatePopup(mesh, e) {
        hideGatePopup();
        deselectGate();
        selectedMesh = mesh;
        var b = builder();
        var rec = b ? (b.circuit || []).find(function (g) { return g.id === mesh.userData.gate.id; }) : null;

        popup = document.createElement('div');
        popup.id = 'mplace-gatepopup';
        popup.setAttribute('role', 'dialog');

        var title = document.createElement('b');
        title.textContent = label(mesh.userData.gate.type);
        popup.appendChild(title);

        var sub = document.createElement('span');
        var qs = rec && rec.qubits ? rec.qubits.join(', ') : '?';
        sub.textContent = 'q[' + qs + '] · depth ' + (rec ? rec.depth : '?');
        popup.appendChild(sub);

        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'mplace-delbtn';
        del.textContent = 'Delete gate';
        del.addEventListener('click', function (ev) {
            ev.stopPropagation();
            var bb = builder();
            if (bb && selectedMesh) {
                bb.removeGate(selectedMesh);
                refreshAfterEdit(bb);
                vibrate(15);
            }
            hideGatePopup();
            deselectGate();
        });
        popup.appendChild(del);

        // clamp inside viewport
        popup.style.left = Math.min(e.clientX, window.innerWidth - 180) + 'px';
        popup.style.top = Math.max(8, e.clientY - 40) + 'px';
        document.body.appendChild(popup);
        vibrate(8);
    }

    function hideGatePopup() {
        if (popup && popup.parentNode) popup.parentNode.removeChild(popup);
        popup = null;
    }

    function deselectGate() {
        selectedMesh = null;
        hideGatePopup();
    }

    function refreshAfterEdit(b) {
        // mirror the refresh tail of addGate
        if (typeof b.updateMiniBlochSpheres === 'function') b.updateMiniBlochSpheres();
        if (typeof b.updateLiveCodePanel === 'function') b.updateLiveCodePanel();
        if (typeof b.saveState === 'function') b.saveState();
    }

    /* ---------------- wire up ---------------- */
    function onPaletteClick(e) {
        var item = e.target && e.target.closest ? e.target.closest('.gate-item') : null;
        if (!item || !item.dataset.gate) return;
        // capture phase: block the engine's click-to-place, arm instead
        e.preventDefault();
        e.stopPropagation();
        // close the mobile sheet if open (user returns to the 3D view)
        var sb = document.querySelector('.sidebar');
        if (sb && sb.classList.contains('cb-sheet-open')) {
            sb.classList.remove('cb-sheet-open');
            var scrim = document.querySelector('.cb-scrim');
            if (scrim) scrim.classList.remove('show');
        }
        armGate(item.dataset.gate);
    }

    function onCanvasPointerDown(e) {
        tapStart = { x: e.clientX, y: e.clientY, t: Date.now() };
    }

    var tapStart = null;
    function onCanvasPointerUp(e) {
        if (!tapStart) return;
        var dx = e.clientX - tapStart.x, dy = e.clientY - tapStart.y;
        var dt = Date.now() - tapStart.t;
        tapStart = null;
        if (dx * dx + dy * dy > 100 || dt > 600) return; // 10px / 600ms tap threshold
        var b = builder();
        if (!b) return;
        if (armed) handlePlacementTap(e, b);
        else if (!selectGateAt(e, b)) deselectGate();
    }

    function boot() {
        // 1. intercept palette taps (capture) so the engine's click-place doesn't fire
        var pal = document.querySelector('.sidebar') || document;
        pal.addEventListener('click', onPaletteClick, true);

        // 2. tap detection on the 3D canvas
        var c = canvas();
        if (c) {
            c.addEventListener('pointerdown', onCanvasPointerDown);
            c.addEventListener('pointerup', onCanvasPointerUp);
            c.style.touchAction = 'pan-y'; // vertical page scroll still works; taps are ours
        }

        // 3. cancel placement on tab switch / hide
        document.querySelectorAll('.cb-tab').forEach(function (t) {
            t.addEventListener('click', function () { disarm(); deselectGate(); });
        });
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) { disarm(); deselectGate(); }
        });

        // 4. cap pixel ratio for mobile GPUs (additive; engine default is uncapped)
        var a = app();
        if (a && a.renderer && a.renderer.setPixelRatio) {
            try { a.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch (e) { /* ignore */ }
        }

        // 5. dismiss popup on any canvas tap handled elsewhere
        document.addEventListener('click', function (e) {
            if (popup && !popup.contains(e.target)) { hideGatePopup(); deselectGate(); }
        }, true);

        window.mplace = {
            arm: armGate,
            disarm: disarm,
            isArmed: function () { return !!armed; }
        };
        console.log('[mplace] mobile tap-to-place builder active');
    }

    // wait for the engine (visualizer inits async after a credentials fetch)
    var tries = 0;
    var timer = setInterval(function () {
        var b = builder();
        var ready = b && b.gateModels && b.gateModels.gateMeshes && b.gateModels.gateMeshes.size > 0 && three();
        if (ready) { clearInterval(timer); boot(); }
        else if (++tries > 120) { clearInterval(timer); console.warn('[mplace] engine not ready'); }
    }, 500);
})();
