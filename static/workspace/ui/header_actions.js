/* Header action buttons + scroll-aware auto-hide for the pantone dashboard.
   Added 2026-10-02: wires the four header buttons to the existing app
   features (no new backend code), and gives the header a "near vanishing"
   effect while scrolling that reverses the moment scrolling stops. */
(function () {
    'use strict';

    function onReady(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    /* ---------- 1. Header buttons ---------- */
    onReady(function () {
        // Refresh all widgets (spins while working, falls back to reload)
        var refreshBtn = document.getElementById('refresh-all-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () {
                refreshBtn.classList.add('spinning');
                var done = function () { refreshBtn.classList.remove('spinning'); };
                try {
                    var dash = window.hackathonDashboard || window.dashboard;
                    if (dash && typeof dash.refreshAllData === 'function') {
                        Promise.resolve(dash.refreshAllData()).then(done).catch(function () { location.reload(); });
                    } else {
                        location.reload();
                    }
                } catch (e) { location.reload(); }
                setTimeout(done, 5000); // safety: never spin forever
            });
        }

        // Command palette (same as Ctrl+K)
        var paletteBtn = document.getElementById('command-palette-btn');
        if (paletteBtn) {
            paletteBtn.addEventListener('click', function () {
                if (window.KeyboardShortcuts && typeof window.KeyboardShortcuts.toggleCommandPalette === 'function') {
                    window.KeyboardShortcuts.toggleCommandPalette();
                }
            });
        }

        // Guided tutorial
        var tutorialBtn = document.getElementById('tutorial-btn');
        if (tutorialBtn) {
            tutorialBtn.addEventListener('click', function () {
                if (window.quantumTutorial && typeof window.quantumTutorial.start === 'function') {
                    window.quantumTutorial.start();
                }
            });
        }

        // Layout preferences popover
        var customizeBtn = document.getElementById('customize-btn');
        if (customizeBtn) {
            customizeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleLayoutPopover(customizeBtn);
            });
            document.addEventListener('click', function (e) {
                var pop = document.getElementById('layout-popover');
                if (pop && !pop.contains(e.target)) pop.classList.remove('open');
            });
        }
    });

    /* ---------- 2. Layout preferences popover (uses existing LayoutManager) ---------- */
    function toggleLayoutPopover(anchor) {
        var pop = document.getElementById('layout-popover');
        if (!pop) {
            pop = document.createElement('div');
            pop.id = 'layout-popover';
            pop.innerHTML =
                '<div class="layout-popover-title">Layout preferences</div>' +
                '<button class="layout-popover-row" data-panel="rightSidebar"><i class="fas fa-columns"></i><span>Inspector panel</span><span class="layout-toggle"></span></button>' +
                '<button class="layout-popover-row" data-panel="bottom"><i class="fas fa-chart-line"></i><span>Bottom charts</span><span class="layout-toggle"></span></button>' +
                '<button class="layout-popover-row" data-action="reset"><i class="fas fa-undo"></i><span>Reset layout</span></button>';
            var host = anchor.closest('.workspace-header-right') || anchor.parentElement;
            host.style.position = 'relative';
            host.appendChild(pop);
            pop.querySelectorAll('.layout-popover-row').forEach(function (row) {
                row.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var panel = row.getAttribute('data-panel');
                    if (row.getAttribute('data-action') === 'reset') { location.reload(); return; }
                    if (panel && window.LayoutManager && typeof window.LayoutManager.togglePanel === 'function') {
                        window.LayoutManager.togglePanel(panel);
                        syncToggles();
                    }
                });
            });
        }
        pop.classList.toggle('open');
        if (pop.classList.contains('open')) syncToggles();

        function syncToggles() {
            try {
                var layout = (window.WorkspaceState && window.WorkspaceState.state.layout) || {};
                pop.querySelectorAll('.layout-popover-row[data-panel]').forEach(function (row) {
                    var panel = row.getAttribute('data-panel');
                    var isOn = panel === 'rightSidebar' ? !!layout.rightSidebarOpen : !!layout.bottomPanelOpen;
                    row.querySelector('.layout-toggle').classList.toggle('on', isOn);
                });
            } catch (e) { /* layout state unavailable; toggles still work */ }
        }
    }

    /* ---------- 3. Scroll-aware header: near-vanish on scroll down,
                      reappear on scroll up or when scrolling stops ---------- */
    onReady(function () {
        var header = document.querySelector('.workspace-header');
        if (!header) return;
        header.classList.add('header-animated');

        var lastY = window.scrollY || 0;
        var ticking = false;
        var showTimer = null;

        function update() {
            var y = window.scrollY || 0;
            var delta = y - lastY;
            if (y > 160 && delta > 3) {
                header.classList.add('header-hidden');      // scrolling down -> near vanish
            } else if (delta < -3 || y <= 160) {
                header.classList.remove('header-hidden');  // scrolling up / near top -> show
            }
            lastY = y;
            ticking = false;
            clearTimeout(showTimer);
            showTimer = setTimeout(function () {
                header.classList.remove('header-hidden');  // show again when scroll stops
            }, 650);
        }

        window.addEventListener('scroll', function () {
            if (!ticking) { requestAnimationFrame(update); ticking = true; }
        }, { passive: true });
    });
})();
