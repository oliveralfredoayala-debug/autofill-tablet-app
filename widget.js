(function () {
    if (document.getElementById('one-look-floating-widget')) {
        const w = document.getElementById('one-look-floating-widget');
        w.style.display = w.style.display === 'none' ? 'block' : 'none';
        return;
    }

    // --- CONFIGURATION ---
    const CONFIG = {
        keywords: {
            firstName: ["first name", "firstname", "first", "primer nombre", "given name"],
            lastName: ["last name", "lastname", "last", "apellido", "family name"],
            fullName: ["full name", "fullname", "name", "nombre completo", "employee", "person", "user"],
            email: ["email", "e-mail", "mail", "correo"],
            phone: ["phone number", "phone", "mobile", "cell", "contact", "teléfono", "celular"],
            role: ["role", "job", "title", "position", "permissions", "cargo", "puesto", "main branch", "branch", "location", "locations"]
        },
        roles1Look: ["Sales Representative", "Installer", "Sales Manager", "Finance Manager", "Admin", "User"]
    };

    // --- STATE ---
    let state = {
        users: [],
        currentIndex: 0,
        sendWelcome: true,
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
        width: 370px;
        max-width: 92vw;
        max-height: 85vh;
        background: #ffffff;
        border: 1.5px solid #ddd6fe;
        border-radius: 18px;
        box-shadow: 0 12px 36px rgba(109, 40, 217, 0.22);
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
        <div id="widget-header" style="background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%); border-bottom: 1px solid #ddd6fe; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none;">
            <div style="font-weight: 800; color: #6d28d9; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                ⚡ 1Look Auto-Fill Widget
            </div>
            <div style="display: flex; gap: 6px;">
                <button type="button" id="btn-widget-reset" style="background:#ffffff; border:1px solid #cbd5e1; color:#475569; padding:3px 9px; border-radius:15px; font-size:10px; cursor:pointer; font-weight:700;">🔄 Reset</button>
                <button type="button" id="btn-widget-close" style="background:#fee2e2; border:1px solid #fca5a5; color:#dc2626; padding:3px 9px; border-radius:15px; font-size:11px; cursor:pointer; font-weight:bold;">✖</button>
            </div>
        </div>

        <div id="widget-body" style="padding: 14px; overflow-y: auto; flex: 1;">
            <!-- STEP 1: PARSER -->
            <div id="w-step-1">
                <div style="margin-bottom: 10px;">
                    <label style="display:block; font-size:10px; color:#6d28d9; font-weight:800; margin-bottom:4px; text-transform:uppercase;">Paste User Data (Excel / Text)</label>
                    <textarea id="w-data" style="width:100%; height:160px; background:#faf5ff; border:1.5px solid #ddd6fe; border-radius:10px; padding:10px; font-size:11.5px; color:#1e1b4b; resize:vertical;" placeholder="Paste Excel rows or key-value text here..."></textarea>
                </div>

                <button type="button" id="w-btn-parse" style="width:100%; background:linear-gradient(135deg, #7c3aed, #9333ea); color:white; border:none; padding:10px; border-radius:10px; font-weight:700; cursor:pointer; font-size:12px;">PARSE & REVIEW INFO ➡️</button>
                <div id="w-error" style="color:#dc2626; font-size:11px; font-weight:700; margin-top:4px;"></div>
            </div>

            <!-- STEP 2: MAPPING -->
            <div id="w-step-2" style="display:none;">
                <div style="font-weight:800; color:#6d28d9; margin-bottom:6px;" id="w-summary-header">PARSED USERS (0)</div>
                <div id="w-preview" style="max-height:110px; overflow-y:auto; margin-bottom:10px;"></div>

                <label style="display:block; font-size:10px; color:#6d28d9; font-weight:800; margin-bottom:4px; text-transform:uppercase;">1LOOK Role Mappings</label>
                <div id="w-mapping-list" style="max-height:140px; overflow-y:auto; margin-bottom:10px;"></div>

                <div style="display:flex; gap:6px;">
                    <button type="button" id="w-btn-back" style="flex:1; background:#f3e8ff; border:1px solid #ddd6fe; color:#6d28d9; padding:8px; border-radius:8px; font-weight:700; cursor:pointer;">⬅️ Back</button>
                    <button type="button" id="w-btn-start" style="flex:2; background:linear-gradient(135deg, #7c3aed, #9333ea); color:white; border:none; padding:8px; border-radius:8px; font-weight:700; cursor:pointer;">START BATCH 🚀</button>
                </div>
            </div>

            <!-- STEP 3: QUEUE & FULL USER LIST WITH CLICKABLE FIELDS -->
            <div id="w-step-3" style="display:none;">
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:8px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700;">
                        <span id="w-progress-text">0 / 0 Completed</span>
                        <span id="w-progress-percent" style="color:#10b981;">0%</span>
                    </div>
                    <div style="height:5px; background:#e2e8f0; border-radius:10px; overflow:hidden; margin-top:4px;">
                        <div id="w-progress-fill" style="height:100%; background:#10b981; width:0%; transition:width 0.3s ease;"></div>
                    </div>
                </div>

                <div style="font-size:10px; color:#64748b; font-weight:800; margin-bottom:6px; text-transform:uppercase;">USER BATCH LIST - 💡 TAP FIELD TO COPY</div>
                <div id="w-full-user-list" style="max-height:320px; overflow-y:auto;"></div>
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

    document.getElementById('w-btn-parse').onclick = parseAndInit;
    document.getElementById('w-btn-back').onclick = () => { state.status = 'wizard'; saveState(); render(); };
    document.getElementById('w-btn-start').onclick = applyConfigAndStart;

    render();

    function saveState() {
        localStorage.setItem('widget_app_state', JSON.stringify(state));
    }

    function resetWidget() {
        const incompleteCount = state.users.filter(u => !u.completed).length;
        if (state.users.length > 0) {
            let msg = "Reset widget data?";
            if (incompleteCount > 0) {
                msg = `⚠️ Warning: You have ${incompleteCount} user(s) that are NOT marked as completed!\n\nAre you sure you want to reset and clear all data?`;
            }
            if (!confirm(msg)) return;
        }

        state = { users: [], currentIndex: 0, sendWelcome: true, status: "wizard" };
        localStorage.removeItem('widget_app_state');
        document.getElementById('w-data').value = "";
        render();
    }

    function render() {
        document.getElementById('w-step-1').style.display = state.status === 'wizard' ? 'block' : 'none';
        document.getElementById('w-step-2').style.display = state.status === 'config' ? 'block' : 'none';
        document.getElementById('w-step-3').style.display = state.status === 'active' ? 'block' : 'none';

        if (state.status === 'config') renderConfig();
        if (state.status === 'active') renderQueue();
    }

    function cleanPhone(raw) {
        if (!raw) return "555-555-5555";
        const str = String(raw).trim();
        const digits = str.replace(/\D/g, '');
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        if (digits.length === 11 && digits.startsWith('1')) {
            return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        }
        if (digits.length >= 7 && digits.length <= 15) {
            return str;
        }
        return "555-555-5555";
    }

    function parseAndInit() {
        const raw = document.getElementById('w-data').value;
        if (!raw.trim()) { document.getElementById('w-error').innerText = "Please paste data first."; return; }
        const users = raw.includes('\t') || raw.includes(',') ? parseExcel(raw) : parseText(raw);
        if (users.length === 0) { document.getElementById('w-error').innerText = "No user data found."; return; }
        state.users = users;
        state.currentIndex = 0;
        state.status = 'config';
        saveState();
        render();
    }

    function isValidUser(u) {
        if (!u.firstName && !u.email) return false;
        const junk = [
            "first name", "last name", "given name", "family name", "name", "full name",
            "permissions", "role", "email", "phone", "mobile phone", "manager", "branch",
            "location", "locations", "sales rep", "sales representative", "sales manager",
            "finance manager", "installer", "admin", "user", "dealer name", "licensed",
            "platform", "active", "deactivated"
        ];
        const fullName = (u.firstName + " " + u.lastName).toLowerCase().trim();
        if (junk.includes(fullName) || junk.includes(u.firstName.toLowerCase()) || junk.includes(u.email.toLowerCase())) return false;
        return true;
    }

    function parseExcel(raw) {
        const lines = raw.split(/\r?\n/).filter(l => l.trim());
        if (lines.length === 0) return [];

        const isTab = lines[0].includes('\t');
        const delim = isTab ? '\t' : ',';
        const cols = lines[0].split(delim).map(c => c.trim().toLowerCase());
        const mapping = {
            firstName: cols.findIndex(c => c.includes('first')),
            lastName: cols.findIndex(c => c.includes('last')),
            fullName: cols.findIndex(c => c.includes('name')),
            email: cols.findIndex(c => c.includes('email')),
            phone: cols.findIndex(c => c.includes('phone') || c.includes('mobile')),
            role: cols.findIndex(c => c.includes('role')),
            branch: cols.findIndex(c => c.includes('location') || c.includes('branch'))
        };
        const data = (mapping.fullName > -1 || mapping.email > -1 || mapping.firstName > -1) ? lines.slice(1) : lines;

        return data.map(line => {
            const parts = line.split(delim);
            let rawFirstName = "";
            let rawLastName = "";

            if (mapping.firstName > -1 && mapping.lastName > -1) {
                rawFirstName = parts[mapping.firstName]?.trim() || "";
                rawLastName = parts[mapping.lastName]?.trim() || "";
            } else {
                const rawName = parts[mapping.fullName > -1 ? mapping.fullName : 0]?.trim() || "";
                const nameParts = rawName.split(/\s+/).filter(Boolean);
                if (nameParts.length > 1) {
                    rawLastName = nameParts.pop();
                    rawFirstName = nameParts.join(' ');
                } else {
                    rawFirstName = rawName;
                }
            }

            const firstName = rawFirstName.split(/\s+/).filter(Boolean).join('.');
            const lastName = rawLastName;

            let rawPhone = "";
            if (mapping.phone > -1) {
                const candidate = parts[mapping.phone]?.trim() || "";
                if (candidate.replace(/\D/g, '').length >= 7) rawPhone = candidate;
            }
            if (!rawPhone) {
                const foundCell = parts.find(c => {
                    const d = c.trim().replace(/\D/g, '');
                    return d.length >= 7 && d.length <= 15 && /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/.test(c);
                });
                if (foundCell) rawPhone = foundCell.trim();
            }

            return {
                firstName,
                lastName,
                email: parts[mapping.email > -1 ? mapping.email : 1]?.trim() || "",
                phone: cleanPhone(rawPhone),
                role: parts[mapping.role > -1 ? mapping.role : 3]?.trim() || "",
                branch: mapping.branch > -1 ? parts[mapping.branch]?.trim() : "",
                originalRole: parts[mapping.role > -1 ? mapping.role : 3]?.trim() || "",
                completed: false
            };
        }).filter(u => isValidUser(u));
    }

    function parseText(text) {
        const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
        return blocks.map(b => {
            let rawFirstName = "", rawLastName = "", email = "", rawPhone = "", role = "", branch = "";
            b.split('\n').forEach(l => {
                if (l.match(/first/i)) rawFirstName = l.split(':')[1]?.trim() || "";
                else if (l.match(/last/i)) rawLastName = l.split(':')[1]?.trim() || "";
                else if (l.match(/email/i)) email = l.split(':')[1]?.trim() || "";
                else if (l.match(/phone|mobile|cell|tel/i)) rawPhone = l.split(':')[1]?.trim() || "";
                else if (l.match(/role/i)) role = l.split(':')[1]?.trim() || "";
                else if (l.match(/branch|location/i)) branch = l.split(':')[1]?.trim() || "";
            });

            const firstName = rawFirstName.split(/\s+/).filter(Boolean).join('.');
            const lastName = rawLastName;

            return {
                firstName, lastName, email,
                phone: cleanPhone(rawPhone),
                role, branch,
                originalRole: role,
                completed: false
            };
        }).filter(u => isValidUser(u));
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
                    <label style="font-size:9px; color:#16a34a; font-weight:700;">1LOOK ROLE</label>
                    <select class="w-map-1look" data-orig="${r}" style="width:100%; font-size:11px; padding:3px; border-radius:4px; border:1px solid #ddd6fe;">
                        ${CONFIG.roles1Look.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                </div>
            `;
            list.appendChild(d);
        });
    }

    function applyConfigAndStart() {
        const m1 = {};
        document.querySelectorAll('.w-map-1look').forEach(s => m1[s.dataset.orig] = s.value);

        state.users.forEach(u => {
            const k = u.originalRole || u.role || "";
            u.role1Look = m1[k] || 'Sales Representative';
        });

        state.status = 'active';
        saveState();
        render();
    }

    function renderQueue() {
        const container = document.getElementById('w-full-user-list');
        if (!container) return;

        const total = state.users.length;
        const completed = state.users.filter(u => u.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('w-progress-text').innerText = `${completed} / ${total} Completed`;
        document.getElementById('w-progress-percent').innerText = `${percent}%`;
        document.getElementById('w-progress-fill').style.width = `${percent}%`;

        if (total === 0) {
            container.innerHTML = `<div style="text-align:center; padding:15px; color:#64748b;">No users in batch.</div>`;
            return;
        }

        container.innerHTML = state.users.map((u, i) => {
            const isDone = !!u.completed;
            const roleDisplay = u.branch ? `${u.role1Look || u.role || 'Sales Representative'} (${u.branch})` : (u.role1Look || u.role || 'Sales Representative');

            return `
                <div style="background:${isDone ? '#f0fdf4' : '#ffffff'}; border:1px solid ${isDone ? '#bbf7d0' : '#e2e8f0'}; border-radius:10px; padding:10px; margin-bottom:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <b style="font-size:12px; color:${isDone ? '#166534' : '#1e1b4b'};">${i + 1}. ${u.firstName} ${u.lastName}</b>
                        <button type="button" style="padding:3px 8px; border-radius:12px; font-size:10px; font-weight:700; border:1px solid ${isDone ? '#059669' : '#cbd5e1'}; background:${isDone ? '#10b981' : '#ffffff'}; color:${isDone ? '#ffffff' : '#64748b'}; cursor:pointer;" onclick="window.widgetToggleDone(${i})">
                            ${isDone ? '✓ Created' : '☐ Mark Done'}
                        </button>
                    </div>

                    <!-- CLICKABLE COPY FIELDS FOR EVERY FIELD -->
                    <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;">
                        <span style="display:inline-flex; align-items:center; background:#faf5ff; border:1px solid #ddd6fe; color:#1e1b4b; padding:3px 7px; border-radius:6px; font-size:10.5px; cursor:pointer;" onclick="window.widgetCopyText('${escapeHtml(u.firstName)}', 'First Name')">
                            <span style="color:#64748b;">First:</span> <b style="margin-left:3px;">${u.firstName}</b> 📋
                        </span>
                        <span style="display:inline-flex; align-items:center; background:#faf5ff; border:1px solid #ddd6fe; color:#1e1b4b; padding:3px 7px; border-radius:6px; font-size:10.5px; cursor:pointer;" onclick="window.widgetCopyText('${escapeHtml(u.lastName)}', 'Last Name')">
                            <span style="color:#64748b;">Last:</span> <b style="margin-left:3px;">${u.lastName}</b> 📋
                        </span>
                        <span style="display:inline-flex; align-items:center; background:#faf5ff; border:1px solid #ddd6fe; color:#1e1b4b; padding:3px 7px; border-radius:6px; font-size:10.5px; cursor:pointer;" onclick="window.widgetCopyText('${escapeHtml(u.email)}', 'Email')">
                            <span style="color:#64748b;">Email:</span> <b style="margin-left:3px;">${u.email || '-'}</b> 📋
                        </span>
                        <span style="display:inline-flex; align-items:center; background:#faf5ff; border:1px solid #ddd6fe; color:#1e1b4b; padding:3px 7px; border-radius:6px; font-size:10.5px; cursor:pointer;" onclick="window.widgetCopyText('${escapeHtml(u.phone)}', 'Phone')">
                            <span style="color:#64748b;">Phone:</span> <b style="margin-left:3px;">${u.phone || '-'}</b> 📋
                        </span>
                        <span style="display:inline-flex; align-items:center; background:#faf5ff; border:1px solid #ddd6fe; color:#1e1b4b; padding:3px 7px; border-radius:6px; font-size:10.5px; cursor:pointer;" onclick="window.widgetCopyText('${escapeHtml(roleDisplay)}', 'Role')">
                            <span style="color:#16a34a;">Role:</span> <b style="margin-left:3px;">${roleDisplay}</b> 📋
                        </span>
                    </div>

                    <button type="button" style="width:100%; background:#16a34a; color:white; border:none; padding:6px; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer;" onclick="window.widgetFillUser(${i})">
                        📝 FILL 1LOOK FORM NOW
                    </button>
                </div>
            `;
        }).join('');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    window.widgetCopyText = function(text, label) {
        if (!text || text === '-') return;
        navigator.clipboard.writeText(text).then(() => {
            toast(`Copied ${label}: "${text}"`, 'success');
        });
    };

    window.widgetToggleDone = function(i) {
        if (state.users[i]) {
            state.users[i].completed = !state.users[i].completed;
            saveState();
            renderQueue();
        }
    };

    window.widgetFillUser = function(i) {
        if (i >= state.users.length) return;
        state.currentIndex = i;
        const u = state.users[i];

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
                    (e.id || "").toLowerCase().includes("phone")
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

        setInput(["first name", "firstname", "first", "primer nombre", "given name"], u.firstName);
        setInput(["last name", "lastname", "last", "apellido", "family name"], u.lastName);
        setInput(["email", "mail", "correo"], u.email, true);
        setInput(["phone", "mobile", "cell", "teléfono"], u.phone);

        // Auto mark as completed
        state.users[i].completed = true;
        saveState();
        renderQueue();

        toast(`✅ Form Filled for ${u.firstName}!`, 'success');
    };

    function toast(msg, type = 'info') {
        const t = document.getElementById('w-toast');
        if (t) {
            t.innerText = msg;
            t.style.background = type === 'success' ? '#10b981' : '#7c3aed';
            t.style.opacity = '1';
            setTimeout(() => t.style.opacity = '0', 2500);
        }
    }
})();
