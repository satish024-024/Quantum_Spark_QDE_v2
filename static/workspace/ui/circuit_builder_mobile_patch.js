/* Circuit builder mobile patch — small runtime helpers, no visual changes on desktop.
 * - Adds a collapse/expand toggle to the gate palette sheet on small screens.
 * - Nudges the 3D canvas to refit after the sheet toggles or orientation changes.
 * Original builder code and all functions are left untouched. */
(function () {
    'use strict';

    if (!/\/circuit-builder/.test(window.location.pathname || '')) return;

    function isMobile() {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    function refitCanvas() {
        // Give the layout a beat to settle, then let the visualizer's resize handler run.
        setTimeout(function () {
            window.dispatchEvent(new Event('resize'));
            window.dispatchEvent(new Event('orientationchange'));
        }, 80);
    }

    function addSheetToggle() {
        var sidebar = document.querySelector('.main-content .sidebar');
        var header = sidebar ? sidebar.querySelector('.sidebar-header') : null;
        if (!sidebar || !header || header.querySelector('.cb-sheet-toggle')) return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cb-sheet-toggle btn btn-ghost';
        btn.setAttribute('aria-label', 'Collapse gate palette');
        btn.setAttribute('aria-expanded', 'true');
        btn.innerHTML = '<i class="fas fa-chevron-up"></i>';

        btn.addEventListener('click', function () {
            var collapsed = sidebar.classList.toggle('cb-gates-collapsed');
            var icon = btn.querySelector('i');
            if (icon) icon.className = collapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            btn.setAttribute('aria-label', collapsed ? 'Expand gate palette' : 'Collapse gate palette');
            btn.setAttribute('aria-expanded', String(!collapsed));
            refitCanvas();
        });

        header.appendChild(btn);
    }

    function init() {
        addSheetToggle();

        var lastW = window.innerWidth;
        var t = null;
        window.addEventListener('resize', function () {
            if (!isMobile()) return;
            if (window.innerWidth === lastW) return;
            lastW = window.innerWidth;
            if (t) clearTimeout(t);
            t = setTimeout(refitCanvas, 150);
        });
        window.addEventListener('orientationchange', function () {
            if (isMobile()) refitCanvas();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
