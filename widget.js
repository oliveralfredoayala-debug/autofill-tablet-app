(function () {
    if (document.getElementById('one-look-floating-widget')) {
        const w = document.getElementById('one-look-floating-widget');
        w.style.display = w.style.display === 'none' ? 'block' : 'none';
        return;
    }

    // --- CONFIGURATION ---
    const CONFIG = {
        keywords: {
            fullName: ["name", "full name", "employee", "person", "user"],
            email: ["email", "e-mail", "mail"],
            phone: ["phone", "mobile", "cell", "contact"],
            role: ["role", "job", "title", "position", "permissions"],
            branch: ["main branch", "branch", "location", "office", "site", "city", "county", "town", "territory", "area"]
        },
        roles1Look: ["Sales Representative", "Installer", "Sales Manager", "Finance Manager", "Admin", "User"],
        rolesEstimator: ["Salesrep", "Admin", "Org Admin", "User", "sales_manager", "Custom"]
    };

    // --- STATE ---
    let state = {
        users: [],
        currentIndex: 0,
        adminUnit: "",
        sendWelcome: true,
        targetSystem: "both",
        status: "wizard"
    };

    const saved = localStorage.getItem('widget_app_state');
    if (saved) {
        try { state = JSON.parse(saved); } catch (e) { }
    }

    // --- CREATE FLOATING UI CONTAINER ---
    const widget = document.createElement('div');
    widget.id = 'one-look-floating-widget';
    widget.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 350px;
        max-width: 90vw;
        max-height: 85vh;
        background: #ffffff;
        border: 2px solid #c4b5fd;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(109, 40, 217, 0.25);
        z-index: 9999999;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-size: 12px;
        color: #1e1b4b;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.2s ease;
    `;

    widget.innerHTML = `
        <div id="widget-header" style="background: #f3e8ff; border-bottom: 1.5px solid #e9d5ff; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none;">
            <div style="font-weight: 700; color: #6d28d9; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                ⚡ 1Look & Estimator Widget
            </div>
            <div style="display: flex; gap: 6px;">
                <button type="button" id="btn-widget-reset" style="background:#ede9fe; border:1px solid #c4b5fd; color:#6d28d9; padding:2px 8px; border-radius:6px; font-size:10px; cursor:pointer; font-weight:600;">🔄 Reset</button>
                <button type="button" id="btn-widget-close" style="background:#fee2e2; border:1px solid #fca5a5; color:#dc2626; padding:2px 8px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:bold;">✖</button>
            </div>
        </div>

        <div id="widget-body" style="padding: 14px; overflow-y: auto; flex: 1;">
            <!-- STEP 1: PARSER -->
            <div id="w-step-1">
                <div style="margin-bottom: 10px;">
                    <label style="display:block; font-size:10px; color:#5b21b6; font-weight:700; margin-bottom:4px; text-transform:uppercase;">Target System(s)</label>
                    <div style="display:flex; gap:4px;">
                        <button type="button" class="w-sys-btn" id="wsys-both" style="flex:1; padding:6px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;">Both</button>
                        <button type="button" class="w-sys-btn" id="wsys-1look" style="flex:1; padding:6px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;">1Look</button>
                        <button type="button" class="w-sys-btn" id="wsys-estimator" style="flex:1; padding:6px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;">Estimator</button>
                    </div>
                </div>

                <div style="margin-bottom: 10px;">
                    <label style="display:block; font-size:10px; color:#5b21b6; font-weight:700; margin-bottom:4px; text-transform:uppercase;">Paste User Data (Excel / Email Text)</label>
                    <textarea id="w-data" style="width:100%; height:140px; background:#faf5ff; border:1.5px solid #ddd6fe; border-radius:8px; padding:8px; font-size:11px; color:#1e1b4b; resize:vertical;" placeholder="Paste data here...&#10;Supports Excel tables or key-value text"></textarea>
                </div>

                <button type="button" id="w-btn-parse" style="width:100%; background:#7c3aed; color:white; border:none; padding:10px; border-radius:8px; font-weight:700; cursor:pointer; font-size:12px;">PARSE & REVIEW INFO ➡️</button>
                <div id="w-error" style="color:#dc2626; font-size:11px; font-weight:600; margin-top:4px;"></div>
            </div>

            <!-- STEP 2: MAPPING -->
            <div id="w-step-2" style="display:none;">
                <div style="font-weight:700; color:#6d28d9; margin-bottom:6px;" id="w-summary-header">PARSED USERS (0)</div>
                <div id="w-preview" style="max-height:100px; overflow-y:auto; margin-bottom:10px;"></div>
                
                <div id="w-sec-1look" style="margin-bottom:10px;">
                    <label style="display:block; font-size:10px; color:#6b7280;">Admin Unit</label>
                    <input type="text" id="w-admin" placeholder="e.g. Finance Dept" style="width:100%; padding:6px 8px; background:#faf5ff; border:1px solid #ddd6fe; border-radius:6px; font-size:11px;">
                </div>

                <label style="display:block; font-size:10px; color:#5b21b6; font-weight:700; margin-bottom:4px; text-transform:uppercase;">Role Mappings</label>
                <div id="w-mapping-list" style="max-height:120px; overflow-y:auto; margin-bottom:10px;"></div>

                <div style="display:flex; gap:6px;">
                    <button type="button" id="w-btn-back" style="flex:1; background:#f3e8ff; border:1px solid #ddd6fe; color:#6d28d9; padding:8px; border-radius:8px; font-weight:600; cursor:pointer;">⬅️ Back</button>
                    <button type="button" id="w-btn-start" style="flex:2; background:#7c3aed; color:white; border:none; padding:8px; border-radius:8px; font-weight:700; cursor:pointer;">PROCEED TO BATCH 🚀</button>
                </div>
            </div>

            <!-- STEP 3: QUEUE & DIRECT ON-PAGE FILLER -->
            <div id="w-step-3" style="display:none;">
                <div style="display:flex; gap:4px; margin-bottom:8px;">
                    <button type="button" id="w-btn-fill-page" style="flex:2; background:#16a34a; color:white; border:none; padding:10px 4px; border-radius:8px; font-weight:700; cursor:pointer; font-size:12px; box-shadow:0 3px 10px rgba(22,163,74,0.25);">📝 FILL FORM NOW</button>
                    <button type="button" id="w-btn-skip" style="flex:1; background:#f3e8ff; border:1px solid #ddd6fe; color:#6d28d9; padding:10px 4px; border-radius:8px; font-weight:600; cursor:pointer; font-size:11px;">NEXT ⏭</button>
                </div>

                <!-- QUICK COPY CHIPS -->
                <div style="background:#f5f3ff; border:1px solid #ddd6fe; border-radius:8px; padding:8px; margin-bottom:8px;">
                    <div style="font-size:10px; color:#6d28d9; font-weight:700; margin-bottom:4px;">📋 1-TOUCH QUICK COPY</div>
                    <div id="w-copy-chips" style="display:flex; flex-wrap:wrap; gap:3px;"></div>
                </div>

                <div style="border:1.5px solid #c4b5fd; border-radius:10px; padding:10px; background:#ffffff; margin-bottom:8px;">
                    <div id="wc-name" style="font-size:14px; font-weight:700; color:#2e1065; margin-bottom:4px;">-</div>
                    <div style="font-size:11px; color:#1e1b4b;">📧 <span id="wc-email">-</span></div>
                    <div style="font-size:11px; color:#1e1b4b;">📱 <span id="wc-phone">-</span></div>
                    <div style="font-size:11px; color:#16a34a; font-weight:700; margin-top:2px;">🟢 1LOOK: <span id="wc-role-1look">-</span></div>
                    <div style="font-size:11px; color:#ea580c; font-weight:700;">🟧 ESTIMATOR: <span id="wc-role-estimator">-</span></div>
                </div>

                <div style="text-align:center; padding:6px; background:#ede9fe; border-radius:6px; font-weight:700; color:#5b21b6; font-size:11px;" id="w-counter">0 Remaining</div>
            </div>
        </div>
        <div id="w-toast" style="position:absolute; bottom:8px; left:50%; transform:translateX(-50%); padding:6px 12px; background:#6d28d9; color:white; border-radius:15px; font-size:11px; font-weight:700; opacity:0; pointer-events:none; transition:all 0.2s ease;"></div>
    `;

    document.body.appendChild(widget);

    // --- DRAGGABLE HANDLER ---
    const header = document.getElementById('widget-header');
    let isDragging = false, startX, startY, initialLeft, initialTop;

    header.onmousedown = (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = widget.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        document.onmousemove = (e) => {
            if (!isDragging) return;
            widget.style.left = (initialLeft + (e.clientX - startX)) + 'px';
            widget.style.top = (initialTop + (e.clientY - startY)) + 'px';
            widget.style.right = 'auto';
        };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; };
    };

    // --- LISTENERS ---
    document.getElementById('btn-widget-close').onclick = () => widget.style.display = 'none';
    document.getElementById('btn-widget-reset').onclick = resetWidget;

    document.getElementById('wsys-both').onclick = () => setSys('both');
    document.getElementById('wsys-1look').onclick = () => setSys('1look');
    document.getElementById('wsys-estimator').onclick = () => setSys('estimator');

    document.getElementById('w-btn-parse').onclick = parseAndInit;
    document.getElementById('w-btn-back').onclick = () => { state.status = 'wizard'; saveState(); render(); };
    document.getElementById('w-btn-start').onclick = applyConfigAndStart;
    document.getElementById('w-btn-fill-page').onclick = fillFormOnPage;
    document.getElementById('w-btn-skip').onclick = nextUser;

    render();

    function setSys(sys) {
        state.targetSystem = sys;
        saveState();
        render();
    }

    function saveState() {
        localStorage.setItem('widget_app_state', JSON.stringify(state));
    }

    function resetWidget() {
        if (confirm("Reset widget data?")) {
            state = { users: [], currentIndex: 0, adminUnit: "", sendWelcome: true, targetSystem: "both", status: "wizard" };
            localStorage.removeItem('widget_app_state');
            document.getElementById('w-data').value = "";
            render();
        }
    }

    function render() {
        const sys = state.targetSystem || 'both';
        document.getElementById('wsys-both').style.background = sys === 'both' ? '#7c3aed' : '#f3e8ff';
        document.getElementById('wsys-both').style.color = sys === 'both' ? '#fff' : '#6d28d9';
        document.getElementById('wsys-1look').style.background = sys === '1look' ? '#16a34a' : '#f3e8ff';
        document.getElementById('wsys-1look').style.color = sys === '1look' ? '#fff' : '#6d28d9';
        document.getElementById('wsys-estimator').style.background = sys === 'estimator' ? '#ea580c' : '#f3e8ff';
        document.getElementById('wsys-estimator').style.color = sys === 'estimator' ? '#fff' : '#6d28d9';

        document.getElementById('w-step-1').style.display = state.status === 'wizard' ? 'block' : 'none';
        document.getElementById('w-step-2').style.display = state.status === 'config' ? 'block' : 'none';
        document.getElementById('w-step-3').style.display = state.status === 'active' ? 'block' : 'none';

        if (state.status === 'config') renderConfig();
        if (state.status === 'active') renderQueue();
    }

    function parseAndInit() {
        const raw = document.getElementById('w-data').value;
        if (!raw.trim()) { document.getElementById('w-error').innerText = "Please paste data first."; return; }
        const users = raw.includes('\t') ? parseExcel(raw) : parseText(raw);
        if (users.length === 0) { document.getElementById('w-error').innerText = "No user data found."; return; }
        state.users = users;
        state.currentIndex = 0;
        state.status = 'config';
        saveState();
        render();
    }

    function parseExcel(raw) {
        const lines = raw.split(/\r?\n/).filter(l => l.trim());
        if (lines.length === 0) return [];
        const cols = lines[0].split('\t').map(c => c.trim().toLowerCase());
        const mapping = { fullName: cols.findIndex(c => c.includes('name')), email: cols.findIndex(c => c.includes('email')), phone: cols.findIndex(c => c.includes('phone')), role: cols.findIndex(c => c.includes('role')) };
        const data = lines[0].includes('\t') && (mapping.fullName > -1 || mapping.email > -1) ? lines.slice(1) : lines;

        return data.map(line => {
            const parts = line.split('\t');
            const name = parts[mapping.fullName > -1 ? mapping.fullName : 0] || "";
            const nameParts = name.trim().split(' ');
            return {
                firstName: nameParts[0] || "",
                lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : "",
                email: parts[mapping.email > -1 ? mapping.email : 1] || "",
                phone: parts[mapping.phone > -1 ? mapping.phone : 2] || "",
            const uObj = {
                firstName: nameParts[0] || "",
                lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : "",
                email: parts[mapping.email > -1 ? mapping.email : 1] || "",
                phone: parts[mapping.phone > -1 ? mapping.phone : 2] || "555-555-5555",
                role: parts[mapping.role > -1 ? mapping.role : 3] || "",
                originalRole: parts[mapping.role > -1 ? mapping.role : 3] || ""
            };
            if (!uObj.phone) uObj.phone = "555-555-5555";
            return uObj;
        }).filter(u => u.firstName || u.email);
    }

    function parseText(text) {
        const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
        return blocks.map(b => {
            const u = { firstName: "", lastName: "", email: "", phone: "", role: "" };
            b.split('\n').forEach(l => {
                if (l.match(/first/i)) u.firstName = l.split(':')[1]?.trim() || "";
                else if (l.match(/last/i)) u.lastName = l.split(':')[1]?.trim() || "";
                else if (l.match(/email/i)) u.email = l.split(':')[1]?.trim() || "";
                else if (l.match(/phone|mobile|cell|tel/i)) u.phone = l.split(':')[1]?.trim() || "";
                else if (l.match(/role/i)) { u.role = l.split(':')[1]?.trim() || ""; u.originalRole = u.role; }
            });
            if (!u.phone) u.phone = "555-555-5555";
            return u;
        }).filter(u => u.firstName || u.email);
    }

    function renderConfig() {
        document.getElementById('w-summary-header').innerText = `PARSED USERS (${state.users.length})`;
        document.getElementById('w-preview').innerHTML = state.users.map((u, i) => `
            <div style="font-size:11px; padding:4px 6px; background:#faf5ff; border:1px solid #e9d5ff; border-radius:6px; margin-bottom:4px;">
                <b>${i + 1}. ${u.firstName} ${u.lastName}</b> (${u.email || 'No email'})
            </div>
        `).join('');

        const list = document.getElementById('w-mapping-list');
        list.innerHTML = "";
        const roles = [...new Set(state.users.map(u => u.role))];
        if (roles.length === 0) roles[0] = "";

        roles.forEach(r => {
            const d = document.createElement('div');
            d.style.cssText = "margin-bottom:6px; padding:6px; background:#faf5ff; border:1px solid #e9d5ff; border-radius:6px;";
            d.innerHTML = `
                <div style="font-weight:bold; font-size:11px; color:#4c1d95;">Role: "${r || 'Default'}"</div>
                <div style="margin-top:2px;">
                    <label style="font-size:9px; color:#16a34a;">1LOOK ROLE</label>
                    <select class="w-map-1look" data-orig="${r}" style="width:100%; font-size:11px; padding:3px; border-radius:4px; border:1px solid #ddd6fe;">
                        ${CONFIG.roles1Look.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                </div>
                <div style="margin-top:2px;">
                    <label style="font-size:9px; color:#ea580c;">ESTIMATOR ROLE</label>
                    <select class="w-map-estimator" data-orig="${r}" style="width:100%; font-size:11px; padding:3px; border-radius:4px; border:1px solid #ddd6fe;">
                        ${CONFIG.rolesEstimator.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                </div>
            `;
            list.appendChild(d);
        });
    }

    function applyConfigAndStart() {
        const m1 = {}, me = {};
        document.querySelectorAll('.w-map-1look').forEach(s => m1[s.dataset.orig] = s.value);
        document.querySelectorAll('.w-map-estimator').forEach(s => me[s.dataset.orig] = s.value);

        state.users.forEach(u => {
            const k = u.originalRole || u.role || "";
            u.role1Look = m1[k] || 'Sales Representative';
            u.roleEstimator = me[k] || 'Salesrep';
        });

        state.status = 'active';
        saveState();
        render();
    }

    function renderQueue() {
        if (state.currentIndex >= state.users.length) {
            document.getElementById('w-step-3').innerHTML = `<div style="text-align:center; padding:20px; color:#16a34a; font-weight:bold; font-size:14px;">✅ BATCH COMPLETE</div>`;
            return;
        }

        const user = state.users[state.currentIndex];
        document.getElementById('wc-name').innerText = `${user.firstName} ${user.lastName}`;
        document.getElementById('wc-email').innerText = user.email || "-";
        document.getElementById('wc-phone').innerText = user.phone || "-";
        document.getElementById('wc-role-1look').innerText = user.role1Look || "Sales Representative";
        document.getElementById('wc-role-estimator').innerText = user.roleEstimator || "Salesrep";

        const chips = document.getElementById('w-copy-chips');
        chips.innerHTML = '';
        [
            { l: 'First', v: user.firstName }, { l: 'Last', v: user.lastName },
            { l: 'Email', v: user.email }, { l: 'Phone', v: user.phone },
            { l: 'Role Est.', v: user.roleEstimator }, { l: 'Role 1L', v: user.role1Look }
        ].filter(f => f.v).forEach(f => {
            const c = document.createElement('span');
            c.style.cssText = 'padding:3px 7px; background:#fff; border:1px solid #c4b5fd; color:#5b21b6; border-radius:12px; font-size:10px; cursor:pointer; font-weight:600;';
            c.innerText = `📋 ${f.l}: ${f.v}`;
            c.onclick = () => {
                navigator.clipboard.writeText(f.v);
                toast(`Copied ${f.l}: ${f.v}`);
            };
            chips.appendChild(c);
        });

        document.getElementById('w-counter').innerText = `User ${state.currentIndex + 1} of ${state.users.length}`;
    }

    function fillFormOnPage() {
        if (state.currentIndex >= state.users.length) return;
        const u = state.users[state.currentIndex];

        function setInput(keywords, val, isEmail = false) {
            if (!val) return;
            if (!Array.isArray(keywords)) keywords = [keywords];
            const allInputs = Array.from(document.querySelectorAll('input'));
            if (allInputs.length === 0) return;

            let inputs = allInputs.filter(e => e.type !== 'hidden' && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden');
            if (inputs.length === 0) inputs = allInputs;

            let input = null;

            if (isEmail) {
                input = inputs.find(e => 
                    e.type === "email" || 
                    (e.name || "").toLowerCase().includes("email") || 
                    (e.placeholder || "").toLowerCase().includes("email") ||
                    (e.id || "").toLowerCase().includes("email")
                );
            }

            const isPhone = keywords.some(k => k.includes("phone") || k.includes("mobile") || k.includes("cell") || k.includes("tel"));
            if (!input && isPhone) {
                input = inputs.find(e => 
                    e.type === "tel" || 
                    (e.name || "").toLowerCase().includes("phone") || (e.name || "").toLowerCase().includes("mobile") ||
                    (e.placeholder || "").toLowerCase().includes("phone") || (e.placeholder || "").toLowerCase().includes("mobile") ||
                    (e.id || "").toLowerCase().includes("phone") || (e.id || "").toLowerCase().includes("mobile") ||
                    (e.getAttribute('aria-label') || "").toLowerCase().includes("phone")
                );
            }

            if (!input) {
                input = inputs.find(e => {
                    const ph = (e.placeholder || "").toLowerCase();
                    const name = (e.name || "").toLowerCase();
                    const id = (e.id || "").toLowerCase();
                    const aria = (e.getAttribute('aria-label') || "").toLowerCase();
                    return keywords.some(k => ph.includes(k) || name.includes(k) || id.includes(k) || aria.includes(k));
                });
            }

            if (!input) {
                const labels = Array.from(document.querySelectorAll('label, div, span, p, th, td')).filter(e => {
                    const txt = (e.innerText || "").trim().toLowerCase();
                    return keywords.some(k => txt === k || txt.startsWith(k) || txt.includes(k)) && e.children.length === 0;
                });

                for (const label of labels) {
                    if (label.htmlFor) {
                        input = document.getElementById(label.htmlFor);
                        if (input) break;
                    }
                    if (label.getAttribute('for')) {
                        input = document.getElementById(label.getAttribute('for'));
                        if (input) break;
                    }
                    const inside = label.querySelector('input:not([type="hidden"])');
                    if (inside) { input = inside; break; }

                    const parent = label.closest('div, section, td, tr, form, fieldset, .form-group, .field');
                    if (parent) {
                        input = parent.querySelector('input:not([type="hidden"])');
                        if (input) break;
                    }
                }
            }

            if (!input && isPhone) {
                input = inputs.find(e => (e.placeholder || "").includes('_') || (e.value || "").includes('_')) || inputs[3];
            }

            if (input) {
                input.focus();
                input.click();
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                if (nativeSetter) nativeSetter.call(input, val);
                else input.value = val;

                ['focus', 'keydown', 'keypress', 'input', 'change', 'keyup', 'blur'].forEach(evt => 
                    input.dispatchEvent(new Event(evt, { bubbles: true, cancelable: true }))
                );

                const digitsOnly = val.replace(/\D/g, '');
                if ((!input.value || input.value.trim() === "") && digitsOnly) {
                    if (nativeSetter) nativeSetter.call(input, digitsOnly);
                    else input.value = digitsOnly;
                    ['input', 'change', 'blur'].forEach(evt => input.dispatchEvent(new Event(evt, { bubbles: true })));
                }
            }
        }

        setInput(["first name", "firstname", "first", "primer nombre"], u.firstName);
        setInput(["last name", "lastname", "last", "apellido"], u.lastName);
        setInput(["email", "mail", "correo"], u.email, true);
        setInput(["phone", "mobile", "cell", "teléfono"], u.phone);

        toast(`✅ Form Filled for ${u.firstName}!`, 'success');
    }

    function nextUser() {
        state.currentIndex++;
        saveState();
        render();
    }

    function toast(msg, type = 'info') {
        const t = document.getElementById('w-toast');
        t.innerText = msg;
        t.style.background = type === 'success' ? '#16a34a' : '#6d28d9';
        t.style.opacity = '1';
        setTimeout(() => t.style.opacity = '0', 2500);
    }
})();
