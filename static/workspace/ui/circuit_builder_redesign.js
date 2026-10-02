/* ==========================================================================
   Circuit Builder — UI shell (2026-10-02 redesign)
   Additive-only layer: builds the Apple liquid-glass workspace chrome around the
   EXISTING builder DOM. No element IDs are changed or removed, no application
   logic is altered. All buttons proxy the original controls, so every feature
   keeps working exactly as before.
   ========================================================================== */
(function () {
    'use strict';
    if (!/\/circuit-builder/.test(window.location.pathname || '')) return;
    if (document.body.dataset.cbShell) return;

    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var isMobile = function () { return window.matchMedia('(max-width: 767px)').matches; };

    function el(html) {
        var t = document.createElement('template');
        t.innerHTML = html.trim();
        return t.content.firstChild;
    }

    function card(icon, title, extra) {
        return el(
            '<section class="cb-card">' +
            '<div class="cb-card-h"><i class="fas ' + icon + '"></i><h3>' + title + '</h3>' +
            '<div class="cb-sp"></div>' + (extra || '') + '</div>' +
            '<div class="cb-card-b"></div></section>'
        );
    }

    /* ---------------- 1. Workspace skeleton ---------------- */
    function buildWorkspace() {
        var main = $('main.main-content');
        var sidebar = main ? main.querySelector('aside.sidebar') : $('.sidebar');
        var canvas = $('#canvas-container');
        if (!main || !sidebar || !canvas) return false;

        var ws = el('<div class="cb-workspace"></div>');
        main.before(ws);

        var nav = el(
            '<nav class="cb-leftnav" aria-label="Builder navigation">' +
            '<div class="cb-nav-title">Workspace</div>' +
            '<button class="cb-nav-item active" data-nav="builder"><i class="fas fa-cube"></i><span>Builder</span></button>' +
            '<button class="cb-nav-item" data-nav="library"><i class="fas fa-book-open"></i><span>Circuit Library</span></button>' +
            '<button class="cb-nav-item" data-nav="queue"><i class="fas fa-layer-group"></i><span>Execution Queue</span></button>' +
            '<button class="cb-nav-item" data-nav="ai"><i class="fas fa-wand-magic-sparkles"></i><span>AI Generator</span></button>' +
            '<button class="cb-nav-item" data-nav="code"><i class="fas fa-code"></i><span>Qiskit Code</span></button>' +
            '<div class="cb-nav-foot"><div class="cb-avatar">Q</div>' +
            '<div class="cb-who"><b>Quantum Lab</b><span>Builder workspace</span></div></div>' +
            '</nav>'
        );

        var center = el('<div class="cb-center"></div>');
        ws.appendChild(nav);
        ws.appendChild(center);
        ws.appendChild(sidebar);
        center.appendChild(canvas);
        main.remove();

        document.body.dataset.cbShell = '1';
        return true;
    }

    /* ---------------- 2. Slim header + control card ---------------- */
    function buildControlCard() {
        var header = $('header.header');
        if (!header) return;
        var infoInline = header.querySelector('.circuit-info-inline');
        var controls = header.querySelector('.circuit-controls');
        var center = $('.cb-center');
        if (!infoInline || !controls || !center) return;

        // Connection pill
        var conn = $('#connection-status');
        if (conn) conn.classList.add('cb-conn');

        // Camera buttons stay in the header: the visualizer binds them by ID at
        // init time AND wipes #canvas-container (innerHTML=''), so moving them
        // into the viewport would destroy them. Just give them icon styling.
        ['#resetCamera', '#toggleAnimation'].forEach(function (sel) {
            var b = $(sel);
            if (b) { b.classList.add('btn', 'btn-icon'); }
        });

        // Control card
        var cc = card('fa-sliders', 'Circuit Controls');
        cc.classList.add('cb-control-card');
        var body = cc.querySelector('.cb-card-b');

        // Identity row: name + cost + qubit stepper
        var nameDisplay = $('#circuit-name-display');
        var costBadge = $('#headerCostBadge');
        var qMinus = infoInline.querySelector('button[onclick*="decreaseQubits"]');
        var qPlus = infoInline.querySelector('button[onclick*="increaseQubits"]');
        var qCount = $('#circuit-qubits');
        var gatesChip = $('#circuit-gates');
        var depthChip = $('#circuit-depth');

        var ident = el('<div class="cb-identity"></div>');
        if (nameDisplay) {
            var nm = el('<span class="cb-circuit-name"></span>');
            nm.appendChild(nameDisplay);
            nm.insertAdjacentHTML('beforeend', '<i class="fas fa-pen"></i>');
            ident.appendChild(nm);
        }
        if (costBadge) { costBadge.classList.add('cb-cost'); ident.appendChild(costBadge); }
        if (qMinus && qPlus && qCount) {
            var stepper = el('<span class="cb-stepper" aria-label="Qubit count"></span>');
            stepper.appendChild(qMinus); stepper.appendChild(qCount); stepper.appendChild(qPlus);
            ident.appendChild(stepper);
        }
        body.appendChild(ident);

        var chips = el('<div class="cb-stat-chips" style="margin-top:0.7rem"></div>');
        if (gatesChip) chips.appendChild(el('<span class="cb-chip">Gates <b></b></span>')).querySelector('b').appendChild(gatesChip);
        if (depthChip) chips.appendChild(el('<span class="cb-chip">Depth <b></b></span>')).querySelector('b').appendChild(depthChip);
        body.appendChild(chips);

        // Provider / backend grid
        var provSel = $('#headerProviderSelect');
        var backSel = $('#headerBackendSelect');
        var grid = el('<div class="cb-control-grid" style="margin-top:0.9rem"></div>');
        if (provSel) {
            var f1 = el('<div class="cb-field"><label>Provider</label></div>');
            f1.appendChild(provSel); grid.appendChild(f1);
        }
        if (backSel) {
            var f2 = el('<div class="cb-field"><label>Backend</label></div>');
            f2.appendChild(backSel); grid.appendChild(f2);
        }
        body.appendChild(grid);
        var provWrap = $('#headerProviderSelector');
        if (provWrap && !provWrap.hasChildNodes()) provWrap.remove();

        // Run row
        var runRow = el('<div class="cb-run-row"></div>');
        var runBtn = $('#runCircuit');
        var checkBtn = $('#checkAuth');
        if (runBtn) { runBtn.classList.add('btn', 'btn-primary'); runRow.appendChild(runBtn); }
        if (checkBtn) { checkBtn.classList.add('btn', 'btn-secondary', 'btn-icon'); checkBtn.title = 'Check connection'; runRow.appendChild(checkBtn); }
        body.appendChild(runRow);

        // Secondary action tiles (proxy the originals)
        var actions = el('<div class="cb-actions" style="margin-top:0.7rem"></div>');
        var tiles = [
            ['#clearCircuit', 'fa-trash', 'Clear', 'danger'],
            ['#saveCircuit', 'fa-save', 'Save', 'accent'],
            ['#loadCircuit', 'fa-book-open', 'Library', 'purple'],
            ['#validateCircuit', 'fa-shield-halved', 'Validate', 'green'],
            ['#exportQiskit', 'fa-code', 'Export', 'amber']
        ];
        tiles.forEach(function (t) {
            var orig = $(t[0]);
            if (!orig) return;
            orig.style.display = 'none';
            var tile = el('<button class="cb-action-tile ' + t[3] + '"><i class="fas ' + t[1] + '"></i>' + t[2] + '</button>');
            tile.addEventListener('click', function () { orig.click(); });
            actions.appendChild(tile);
        });
        body.appendChild(actions);

        // Dynamic run options
        var ro = el(
            '<div style="margin-top:0.9rem"><div class="cb-field"><label>Run options</label></div>' +
            '<div class="cb-runopts" id="cb-runopts"></div></div>'
        );
        body.appendChild(ro);

        center.insertBefore(cc, center.firstChild);

        // Remove emptied wrappers
        [infoInline, controls].forEach(function (n) { if (n && !n.hasChildNodes()) n.remove(); });

        if (provSel) provSel.addEventListener('change', renderRunOpts);
        renderRunOpts();
        watchCostBadge();
    }

    /* ---------------- 3. Dynamic run options per provider ---------------- */
    function execButton(match) {
        return $$('#ibm-execution-controls button').find(function (b) {
            return b.textContent.toLowerCase().indexOf(match.toLowerCase()) !== -1;
        });
    }

    function renderRunOpts() {
        var box = $('#cb-runopts');
        if (!box) return;
        var provSel = $('#headerProviderSelect');
        var provider = provSel ? provSel.value : 'ibm';
        var labels = { ibm: 'IBM Quantum', ionq: 'IonQ', rigetti: 'Rigetti', aws_braket: 'AWS Braket' };
        var label = labels[provider] || provider;
        box.innerHTML = '';

        function opt(icon, title, sub, primary, fn) {
            var b = el('<button class="cb-runopt' + (primary ? ' primary' : '') + '"><i class="fas ' + icon + '"></i><b>' + title + '</b><span>' + sub + '</span></button>');
            b.addEventListener('click', fn);
            box.appendChild(b);
        }

        if (provider === 'ibm') {
            opt('fa-cloud', 'Run on IBM Quantum', 'Real quantum hardware', true, function () {
                var b = execButton('run on ibm quantum');
                if (b) b.click();
                else if (typeof window.runIBMQuantumJob === 'function') window.runIBMQuantumJob();
            });
            opt('fa-bolt', 'IBM Direct', 'Direct execution path', false, function () {
                var b = execButton('direct');
                if (b) b.click();
            });
        } else {
            opt('fa-cloud', 'Run on ' + label, 'Submit via provider', true, function () {
                submitViaProvider(provider);
            });
        }
        opt('fa-laptop', 'Run Locally', 'Free simulator', false, function () {
            var b = execButton('run locally');
            if (b) b.click();
        });
    }

    function submitViaProvider(provider) {
        try {
            var mpProv = $('#mpProviderSelect');
            var mpBack = $('#mpBackendSelect');
            var hdrBack = $('#headerBackendSelect');
            if (mpProv) {
                mpProv.value = provider;
                mpProv.dispatchEvent(new Event('change'));
            }
            if (mpBack && hdrBack && hdrBack.value) {
                // backends populate synchronously from cache on change
                mpBack.value = hdrBack.value;
                mpBack.dispatchEvent(new Event('change'));
            }
            if (typeof window.submitMultiProviderJob === 'function') {
                window.submitMultiProviderJob();
            } else if (typeof submitMultiProviderJob === 'function') {
                submitMultiProviderJob();
            } else {
                var fallback = $('#mpSubmitBtn');
                if (fallback) fallback.click();
            }
        } catch (e) { console.error('Provider submit failed', e); }
    }

    function watchCostBadge() {
        var badge = $('#headerCostBadge');
        var val = $('#headerCostValue');
        if (!badge || !val) return;
        function sync() { badge.classList.toggle('paid', val.textContent.trim() !== 'FREE'); }
        new MutationObserver(sync).observe(val, { childList: true, characterData: true, subtree: true });
        sync();
    }

    /* ---------------- 4. Hero + stats row ---------------- */
    function buildHeroAndStats() {
        var center = $('.cb-center');
        var canvas = $('#canvas-container');
        if (!center || !canvas) return;

        var hero = el(
            '<section class="cb-card cb-hero">' +
            '<div class="cb-hero-bar"><h3><i class="fas fa-cube"></i>3D Circuit View</h3>' +
            '<div class="cb-sp"></div>' +
            '<span class="cb-chip" id="cb-depth-chip">Depth <b>–</b></span></div>' +
            '</section>'
        );
        canvas.before(hero);
        hero.appendChild(canvas);
        // The template carries inline height:100% on #canvas-container, which beats
        // stylesheets and collapses the viewport inside the auto-height hero.
        // Clear it so the shell's CSS height (vh/dvh) controls the box.
        canvas.style.height = '';
        canvas.style.minHeight = '';

        // Keep hero-bar depth chip in sync with the real depth value (number only)
        var depthVal = $('#circuit-depth');
        var chipB = hero.querySelector('#cb-depth-chip b');
        if (depthVal && chipB) {
            var syncDepth = function () {
                var m = (depthVal.textContent || '').match(/[0-9]+/);
                chipB.textContent = m ? m[0] : '–';
            };
            if (typeof MutationObserver !== 'undefined') {
                new MutationObserver(syncDepth).observe(depthVal, { childList: true, characterData: true, subtree: true });
            }
            syncDepth();
        }

        var row = el('<div class="cb-stats-row"></div>');
        var statsCard = card('fa-chart-column', 'Circuit Stats');
        statsCard.classList.add('cb-stats-card');
        var overlayInfo = canvas.querySelector('.canvas-overlay .circuit-info');
        if (overlayInfo) {
            statsCard.querySelector('.cb-card-b').appendChild(overlayInfo);
            mirrorStats(overlayInfo);
        }
        else statsCard.querySelector('.cb-card-b').appendChild(el('<p style="color:var(--cb-text-2);font-size:0.85rem">Build a circuit to see live statistics.</p>'));

        var qsCard = card('fa-atom', 'Qubit States');
        qsCard.classList.add('cb-qs-card');
        qsCard.querySelector('.cb-card-b').appendChild(
            el('<div id="cb-qs-slot"><p style="color:var(--cb-text-2);font-size:0.85rem">Preparing qubit states…</p></div>')
        );

        row.appendChild(statsCard);
        row.appendChild(qsCard);
        hero.after(row);

        pollForInjected();
    }

    /* Mirror live circuit numbers into the stats card.
       The template carries two sets of #circuit-qubits/#circuit-gates/#circuit-depth
       (a pre-existing duplicate-ID quirk); updateCircuitInfo only ever updates the
       first set (now in the control card), so mirror those into the stats card. */
    function mirrorStats(statsInfo) {
        if (!statsInfo || typeof MutationObserver === 'undefined') return;
        ['circuit-qubits', 'circuit-gates', 'circuit-depth'].forEach(function (id) {
            var all = document.querySelectorAll('#' + id);
            if (all.length < 2) return;
            var src = all[0];
            var dst = statsInfo.querySelector('#' + id) || all[1];
            if (src === dst) return;
            var sync = function () {
                var m = (src.textContent || '').match(/[0-9]+/);
                dst.textContent = m ? m[0] : '0';
            };
            new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true });
            sync();
        });
    }

    function pollForInjected() {
        var tries = 0;
        var timer = setInterval(function () {
            tries++;
            var moved = false;
            var bloch = $('#mini-bloch-panel');
            var slot = $('#cb-qs-slot');
            if (bloch && slot && !slot.dataset.done) {
                slot.innerHTML = '';
                slot.appendChild(bloch);
                bloch.style.position = 'static';
                slot.dataset.done = '1';
                moved = true;
            }
            var code = $('#live-code-panel');
            if (code && !code.dataset.placed) {
                placeCodeCard(code);
                moved = true;
            }
            // The visualizer re-asserts inline min-height on #canvas-container at
            // init; keep the shell's CSS height in charge of the viewport box.
            var cc = $('#canvas-container');
            if (cc && cc.style.height) { cc.style.height = ''; moved = true; }
            if ((slot && slot.dataset.done && code && code.dataset.placed) || tries > 60) {
                clearInterval(timer);
            }
        }, 500);
    }

    function placeCodeCard(codeNode) {
        codeNode.dataset.placed = '1';
        var sidebar = $('.sidebar');
        var cardEl = el('<div class="cb-card cb-code-card" style="overflow:hidden;margin-bottom:1rem"></div>');
        var head = el(
            '<div class="cb-card-h"><i class="fas fa-code"></i><h3>Qiskit Code</h3><div class="cb-sp"></div></div>'
        );
        cardEl.appendChild(head);
        cardEl.appendChild(codeNode);
        var cats = sidebar.querySelector('.gate-categories');
        if (cats) cats.appendChild(cardEl);
    }

    /* ---------------- 5. Gate palette: search, chips, collapse ---------------- */
    function enhancePalette() {
        var sidebar = $('.sidebar');
        var header = sidebar ? sidebar.querySelector('.sidebar-header') : null;
        if (!sidebar || !header || header.dataset.enhanced) return;
        header.dataset.enhanced = '1';
        if (!header.querySelector('i')) header.insertAdjacentHTML('afterbegin', '<i class="fas fa-shapes"></i>');

        var tools = el(
            '<div class="cb-gate-tools">' +
            '<label class="cb-search"><i class="fas fa-search"></i><input id="cb-gate-search" type="search" placeholder="Search gates…" aria-label="Search gates"></label>' +
            '<div class="cb-chips" role="tablist" aria-label="Gate categories">' +
            '<button class="cb-chipbtn active" data-cat="all">All</button>' +
            '<button class="cb-chipbtn" data-cat="basicGates">Basic</button>' +
            '<button class="cb-chipbtn" data-cat="phaseGates">Phase</button>' +
            '<button class="cb-chipbtn" data-cat="rotationGates">Rotation</button>' +
            '<button class="cb-chipbtn" data-cat="twoQubitGates">Two-Qubit</button>' +
            '<button class="cb-chipbtn" data-cat="threeQubitGates">Three-Qubit</button>' +
            '<button class="cb-chipbtn" data-cat="measurementGates">Measure</button>' +
            '</div></div>'
        );
        header.after(tools);

        var search = tools.querySelector('#cb-gate-search');
        search.addEventListener('input', function () { applyGateFilter(); });

        $$('.cb-chipbtn', tools).forEach(function (chip) {
            chip.addEventListener('click', function () {
                $$('.cb-chipbtn', tools).forEach(function (c) { c.classList.remove('active'); });
                chip.classList.add('active');
                applyGateFilter();
            });
        });

        // Collapsible categories (skip ones with their own toggle, e.g. AI generator)
        $$('.gate-category > h4', sidebar).forEach(function (h) {
            if (h.hasAttribute('onclick') || h.dataset.cbCollapse) return;
            h.dataset.cbCollapse = '1';
            h.setAttribute('role', 'button');
            h.setAttribute('tabindex', '0');
            h.setAttribute('aria-expanded', 'true');
            var cat = h.parentElement;
            function toggle() {
                var closed = cat.classList.toggle('closed');
                h.setAttribute('aria-expanded', String(!closed));
            }
            h.addEventListener('click', toggle);
            h.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
            });
        });
    }

    function applyGateFilter() {
        var tools = $('.cb-gate-tools');
        if (!tools) return;
        var q = (tools.querySelector('#cb-gate-search').value || '').trim().toLowerCase();
        var active = tools.querySelector('.cb-chipbtn.active');
        var cat = active ? active.dataset.cat : 'all';
        $$('.gate-category', $('.sidebar')).forEach(function (section) {
            var pal = section.querySelector('.gate-palette');
            if (!pal) return; // AI / config sections stay visible
            var showCat = (cat === 'all') || (pal.id === cat);
            var anyVisible = false;
            $$('.gate-item', pal).forEach(function (g) {
                var name = (g.textContent || '').toLowerCase();
                var show = showCat && (!q || name.indexOf(q) !== -1);
                g.style.display = show ? '' : 'none';
                if (show) anyVisible = true;
            });
            section.style.display = (showCat && (anyVisible || !q)) ? '' : 'none';
            if (cat !== 'all' && showCat) section.classList.remove('closed');
        });
    }

    /* ---------------- 6. Mobile: tabs, sheets, FAB ---------------- */
    var scrim = null;
    function ensureScrim() {
        if (scrim) return scrim;
        scrim = el('<div class="cb-scrim"></div>');
        scrim.addEventListener('click', closeAllSheets);
        document.body.appendChild(scrim);
        return scrim;
    }
    function closeAllSheets() {
        $$('.cb-sheet.show').forEach(function (s) { s.classList.remove('show'); });
        var sb = $('.sidebar');
        if (sb) sb.classList.remove('cb-sheet-open');
        if (scrim) scrim.classList.remove('show');
        $$('.cb-tab').forEach(function (t) { t.classList.remove('active'); });
        var ct = $('.cb-tab[data-tab="circuit"]');
        if (ct) ct.classList.add('active');
    }

    function openSheet(title, icon, node) {
        closeAllSheets();
        var sheet = el(
            '<div class="cb-sheet" role="dialog" aria-label="' + title + '">' +
            '<div class="cb-sheet-h"><i class="fas ' + icon + '"></i><h3>' + title + '</h3>' +
            '<div class="cb-sp"></div>' +
            '<button class="btn btn-ghost btn-icon cb-sheet-close" aria-label="Close"><i class="fas fa-xmark"></i></button></div>' +
            '<div class="cb-sheet-b"></div></div>'
        );
        var placeholder = document.createComment('cb-sheet-home');
        node.before(placeholder);
        sheet.querySelector('.cb-sheet-b').appendChild(node);
        sheet.querySelector('.cb-sheet-close').addEventListener('click', function () {
            placeholder.before(node);
            sheet.remove();
            closeAllSheets();
        });
        // restore on close-all too
        sheet.dataset.homeRestored = '';
        var obs = new MutationObserver(function () {
            if (!sheet.classList.contains('show') && !sheet.dataset.homeRestored) {
                sheet.dataset.homeRestored = '1';
                if (placeholder.parentNode) placeholder.before(node);
                setTimeout(function () { sheet.remove(); }, 350);
            }
        });
        obs.observe(sheet, { attributes: true, attributeFilter: ['class'] });
        document.body.appendChild(sheet);
        requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add('show'); }); });
        ensureScrim().classList.add('show');
    }

    function buildMobileChrome() {
        if ($('.cb-tabbar')) return;
        var center = $('.cb-center');
        if (!center) return;

        var bar = el(
            '<nav class="cb-tabbar" aria-label="Primary">' +
            '<button class="cb-tab active" data-tab="circuit"><i class="fas fa-cube"></i>Circuit</button>' +
            '<button class="cb-tab" data-tab="code"><i class="fas fa-code"></i>Code</button>' +
            '<button class="cb-tab" data-tab="results"><i class="fas fa-chart-column"></i>Results</button>' +
            '<button class="cb-tab" data-tab="queue"><i class="fas fa-layer-group"></i>Queue</button>' +
            '</nav>'
        );
        center.appendChild(bar);

        var fab = el('<button class="cb-gates-fab" aria-label="Open gate palette"><i class="fas fa-shapes"></i></button>');
        document.body.appendChild(fab);
        fab.addEventListener('click', function () {
            var sb = $('.sidebar');
            var open = sb.classList.toggle('cb-sheet-open');
            ensureScrim().classList.toggle('show', open);
            // Hide the FAB while the sheet is open (it would float over the sheet).
            fab.style.visibility = open ? 'hidden' : 'visible';
        });

        $$('.cb-tab', bar).forEach(function (tab) {
            tab.addEventListener('click', function () {
                var name = tab.dataset.tab;
                if (name === 'circuit') { closeAllSheets(); return; }
                if (name === 'queue') {
                    if (typeof window.showExecutionProgress === 'function') window.showExecutionProgress();
                    return;
                }
                if (name === 'code') {
                    var code = $('#live-code-panel');
                    if (code) openSheet('Qiskit Code', 'fa-code', code);
                    return;
                }
                if (name === 'results') {
                    var res = $('#executionResults');
                    if (res) openSheet('Results', 'fa-chart-column', res);
                    return;
                }
            });
        });
    }

    /* ---------------- 7. Desktop left nav wiring ---------------- */
    function wireLeftNav() {
        var nav = $('.cb-leftnav');
        if (!nav || nav.dataset.wired) return;
        nav.dataset.wired = '1';
        function setActive(btn) {
            $$('.cb-nav-item', nav).forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
        }
        nav.addEventListener('click', function (e) {
            var btn = e.target.closest('.cb-nav-item');
            if (!btn) return;
            setActive(btn);
            var key = btn.dataset.nav;
            if (key === 'builder') {
                closeAllSheets();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (key === 'library') {
                var lib = $('#loadCircuit');
                if (lib) lib.click();
            } else if (key === 'queue') {
                if (typeof window.showExecutionProgress === 'function') window.showExecutionProgress();
            } else if (key === 'ai') {
                var ai = $('#aiGenerator');
                if (ai) {
                    var cat = ai.closest('.gate-category');
                    if (cat) cat.classList.remove('closed');
                    ai.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    if (ai.style.display === 'none' && typeof window.toggleAISection === 'function') window.toggleAISection('aiGenerator');
                }
            } else if (key === 'code') {
                if (isMobile()) {
                    var code = $('#live-code-panel');
                    if (code) openSheet('Qiskit Code', 'fa-code', code);
                } else {
                    var cc = $('.cb-code-cat');
                    if (cc) cc.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    }

    /* ---------------- 8. Connection pill ---------------- */
    function watchConnection() {
        var ind = $('#status-indicator');
        var conn = $('#connection-status');
        if (!ind || !conn) return;
        function sync() {
            conn.classList.toggle('ok', ind.classList.contains('connected'));
        }
        new MutationObserver(sync).observe(ind, { attributes: true, attributeFilter: ['class'] });
        sync();
    }

    /* ---------------- init ---------------- */
    function init() {
        try {
            if (buildWorkspace() === false) return;
        } catch (e) { console.error('[cb-shell] buildWorkspace failed:', e); return; }
        [
            buildControlCard,
            buildHeroAndStats,
            enhancePalette,
            wireLeftNav,
            watchConnection,
            buildMobileChrome
        ].forEach(function (fn) {
            try { fn(); }
            catch (e) { console.error('[cb-shell] step failed:', fn.name, e); }
        });
        // Keep canvas fitted after structural changes
        setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
