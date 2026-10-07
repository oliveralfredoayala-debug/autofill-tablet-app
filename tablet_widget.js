(function() {
    // 1. Avoid duplicate injections
    if (document.getElementById('um-tablet-widget')) {
        const w = document.getElementById('um-tablet-widget');
        w.style.display = w.style.display === 'none' ? 'flex' : 'none';
        return;
    }

    // 2. Configuration & State
    const UM_CONFIG = {
        keywords: {
            firstName: ["first name", "firstname", "first", "primer nombre", "given name"],
            lastName: ["last name", "lastname", "last", "apellido", "apellidos", "family name"],
            fullName: ["full name", "fullname", "name", "nombre completo", "employee", "person", "user"],
            email: ["email", "e-mail", "mail", "correo"],
            phone: ["phone number", "phone", "mobile", "cell", "contact", "teléfono", "celular"],
            role: ["role", "job", "title", "position", "permissions", "cargo", "puesto"],
            branch: ["branch", "location", "locations", "office", "site", "sucursal", "oficina"]
        },
        roles1Look: ["Sales Representative", "Installer", "Sales Manager", "Finance Manager", "Admin", "User"],
        rolesEstimator: ["Salesrep", "Admin", "Org Admin", "User", "sales_manager", "Custom"]
    };

    let umState = {
        users: [],
        currentIndex: 0
    };

    // 3. Inject UI
    const container = document.createElement('div');
    container.id = 'um-tablet-widget';
    container.innerHTML = `
        <style>
            #um-tablet-widget { position: fixed; top: 20px; right: 20px; width: 340px; max-height: 85vh; background: #ffffff; box-shadow: 0 15px 35px rgba(0,0,0,0.25); z-index: 2147483647; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0; }
            #um-header { background: linear-gradient(135deg, #6d28d9, #4f46e5); color: white; padding: 14px 16px; font-weight: 700; font-size: 14px; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none; }
            #um-body { padding: 16px; overflow-y: auto; flex: 1; }
            .um-btn { background: #6d28d9; color: white; border: none; padding: 10px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; width: 100%; margin-top: 8px; font-size: 13px; transition: opacity 0.2s; }
            .um-btn:active { opacity: 0.8; }
            .um-textarea { width: 100%; height: 140px; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 10px; font-size: 13px; box-sizing: border-box; resize: vertical; margin-bottom: 8px; }
            .um-select { width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 12px; margin-top: 4px; }
            .um-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:12px; }
            #um-toast { position: absolute; bottom: 10px; left: 10px; right: 10px; background: #1e293b; color: white; padding: 10px; border-radius: 8px; font-size: 12px; text-align: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; z-index: 10; }
        </style>
        <div id="um-header">
            <span>⚡ 1LOOK Tablet Fill</span>
            <div>
                <button id="um-btn-min" style="background:none;border:none;color:white;font-size:18px;font-weight:bold;cursor:pointer;">−</button>
                <button id="um-btn-close" style="background:none;border:none;color:white;font-size:18px;font-weight:bold;cursor:pointer;margin-left:8px;">×</button>
            </div>
        </div>
        <div id="um-body">
            <!-- STEP 1 -->
            <div id="um-step-1">
                <div style="font-size:13px; color:#475569; margin-bottom:8px; font-weight:600;">Paste user data (Text/TSV):</div>
                <textarea id="um-input-data" class="um-textarea" placeholder="First Name: John\nLast Name: Doe\n..."></textarea>
                <button id="um-btn-parse" class="um-btn">Parse Data</button>
                <div id="um-error" style="color:#ef4444; font-size:12px; margin-top:8px; font-weight:600;"></div>
            </div>
            <!-- STEP 2 -->
            <div id="um-step-2" style="display:none;">
                <div style="font-size:13px; font-weight:700; margin-bottom:10px; color:#1e293b;" id="um-mapping-header">Mapping</div>
                <div id="um-mapping-list" style="max-height:220px; overflow-y:auto; margin-bottom:10px;"></div>
                <button id="um-btn-apply" class="um-btn" style="background:#10b981;">Confirm & Start</button>
                <button id="um-btn-reset-1" class="um-btn" style="background:#64748b;">Cancel</button>
            </div>
            <!-- STEP 3 -->
            <div id="um-step-3" style="display:none;">
                <div id="um-queue-container"></div>
                <button id="um-btn-fill" class="um-btn" style="background:#16a34a; font-size:14px; padding:14px; margin-top:12px;">⚡ AUTO-FILL 1LOOK FORM</button>
                <div style="display:flex; gap:8px; margin-top:12px;">
                    <button id="um-btn-prev" class="um-btn" style="background:#cbd5e1; color:#0f172a;">◀ Prev</button>
                    <button id="um-btn-next" class="um-btn" style="background:#cbd5e1; color:#0f172a;">Next ▶</button>
                </div>
                <button id="um-btn-reset-2" class="um-btn" style="background:#ef4444; margin-top:16px;">Reset All</button>
            </div>
        </div>
        <div id="um-toast"></div>
    `;
    document.body.appendChild(container);

    // 4. Toast Logic
    function showToast(msg, type = 'info') {
        const t = document.getElementById('um-toast');
        t.innerText = msg;
        t.style.background = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#1e293b');
        t.style.opacity = '1';
        setTimeout(() => { t.style.opacity = '0'; }, 3000);
    }

    // 5. Drag Logic (Touch + Mouse)
    const header = document.getElementById('um-header');
    let isDragging = false, startX, startY, initialX, initialY;

    function onDragStart(e) {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        startX = clientX; startY = clientY;
        const rect = container.getBoundingClientRect();
        initialX = rect.left; initialY = rect.top;
    }
    function onDragMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const dx = clientX - startX; const dy = clientY - startY;
        container.style.left = `${initialX + dx}px`;
        container.style.top = `${initialY + dy}px`;
        container.style.right = 'auto'; // Reset right anchor
    }
    function onDragEnd() { isDragging = false; }

    header.addEventListener('mousedown', onDragStart);
    header.addEventListener('touchstart', onDragStart, {passive: false});
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove, {passive: false});
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);

    // Window controls
    document.getElementById('um-btn-close').onclick = () => container.remove();
    document.getElementById('um-btn-min').onclick = () => {
        const b = document.getElementById('um-body');
        b.style.display = b.style.display === 'none' ? 'block' : 'none';
    };

    // 6. Parsers (Adapted from Web App)
    function cleanPhone(p) { return p ? p.replace(/[^0-9+() -]/g, '').trim() : ""; }
    
    function parseTextData(text) {
        let blocks = text.split(/\n\s*\n|\n(?=-{3,}|\={3,})\n/).map(b => b.trim()).filter(b => b);
        const users = [];
        for (const block of blocks) {
            let rawFirstName = "", rawLastName = "", email = "", rawPhone = "", role = "", branch = "", nameFound = false;
            const lines = block.split(/\r?\n/);
            for (const line of lines) {
                const kvMatch = line.match(/^([^:]+):\s*(.*)$/);
                if (kvMatch) {
                    const key = kvMatch[1].trim().toLowerCase(), val = kvMatch[2].trim();
                    if (key.match(/first\s*name|primer\s*nombre/)) { rawFirstName = val; nameFound = true; }
                    else if (key.match(/last\s*name|apellido/)) { rawLastName = val; nameFound = true; }
                    else if (key.match(/full\s*name|^name$|^nombre$/)) {
                        const parts = val.split(/\s+/).filter(p => p);
                        rawFirstName = parts[0] || val;
                        rawLastName = parts.length > 1 ? parts.slice(1).join(' ') : "";
                        nameFound = true;
                    }
                    else if (key.match(/email|mail|correo/)) email = val;
                    else if (key.match(/phone|mobile|cell|tel[ée]fono/)) {
                        if (!rawPhone || val.replace(/\D/g, '').length >= 7) rawPhone = val;
                    }
                    else if (key.match(/role|title|cargo/)) role = val;
                    else if (key.match(/branch|location|office|site/)) branch = val;
                } else {
                    const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                    const phoneMatch = line.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/);
                    if (emailMatch && !email) email = emailMatch[0];
                    if (phoneMatch && !rawPhone) rawPhone = phoneMatch[0];
                    
                    const cleanLine = line.trim();
                    if (cleanLine && !nameFound && cleanLine.split(/\s+/).length <= 4 && !emailMatch && !phoneMatch) {
                        const parts = cleanLine.split(/\s+/);
                        rawFirstName = parts[0]; rawLastName = parts.slice(1).join(' '); nameFound = true;
                    } else if (cleanLine && !role && cleanLine.length > 2 && !emailMatch && !phoneMatch) { role = cleanLine; }
                }
            }
            let firstName = rawFirstName.replace(/[:]/g, '').split(/\s+/).filter(Boolean).join('.');
            let lastName = rawLastName.replace(/[:]/g, '').trim();
            if (firstName.includes('@')) firstName = "";
            if (lastName.includes('@')) lastName = "";
            if (firstName || lastName || email || rawPhone) {
                users.push({ firstName, lastName, email, phone: cleanPhone(rawPhone), role, branch, originalRole: role, completed: false });
            }
        }
        return users;
    }

    function parseExcelData(raw) {
        const lines = raw.split(/\r?\n/).filter(l => l.trim());
        if (lines.length === 0) return [];
        const isTab = lines[0].includes('\t');
        const delim = isTab ? '\t' : ',';
        const headers = lines[0].split(delim).map(h => h.toLowerCase().trim());
        const mapping = { firstName: -1, lastName: -1, fullName: -1, email: -1, phone: -1, role: -1, branch: -1 };
        
        headers.forEach((col, idx) => {
            if (mapping.email === -1 && UM_CONFIG.keywords.email.some(w => col.includes(w) || col === w)) mapping.email = idx;
            else if (mapping.phone === -1 && UM_CONFIG.keywords.phone.some(w => col.includes(w) || col === w)) mapping.phone = idx;
            else if (mapping.role === -1 && UM_CONFIG.keywords.role.some(w => col.includes(w) || col === w)) mapping.role = idx;
            else if (mapping.firstName === -1 && UM_CONFIG.keywords.firstName.some(w => col.includes(w) || col === w)) mapping.firstName = idx;
            else if (mapping.lastName === -1 && UM_CONFIG.keywords.lastName.some(w => col.includes(w) || col === w)) mapping.lastName = idx;
            else if (mapping.fullName === -1 && UM_CONFIG.keywords.fullName.some(w => col.includes(w) || col === w)) mapping.fullName = idx;
            else if (mapping.branch === -1 && UM_CONFIG.keywords.branch.some(w => col.includes(w) || col === w)) mapping.branch = idx;
        });

        return lines.slice(1).map(line => {
            const cols = line.split(delim);
            const getVal = (idx) => idx > -1 && cols[idx] ? cols[idx].trim() : "";
            
            let rawFirstName = getVal(mapping.firstName), rawLastName = getVal(mapping.lastName);
            if (!rawFirstName && !rawLastName && mapping.fullName > -1) {
                const parts = getVal(mapping.fullName).split(/\s+/);
                rawFirstName = parts[0] || ""; rawLastName = parts.slice(1).join(' ');
            }
            
            let firstName = rawFirstName.replace(/[:]/g, '').split(/\s+/).filter(Boolean).join('.');
            let lastName = rawLastName.replace(/[:]/g, '').trim();
            
            let rawPhone = getVal(mapping.phone);
            if (!rawPhone) {
                const foundCell = cols.find(c => {
                    const d = c.trim().replace(/\D/g, '');
                    return d.length >= 7 && d.length <= 15 && /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/.test(c);
                });
                if (foundCell) rawPhone = foundCell.trim();
            }

            return {
                firstName, lastName,
                email: getVal(mapping.email) || cols.find(c => c.includes('@')) || "",
                phone: cleanPhone(rawPhone),
                role: getVal(mapping.role),
                branch: getVal(mapping.branch),
                originalRole: getVal(mapping.role),
                completed: false
            };
        }).filter(u => u.firstName || u.lastName || u.email || u.phone);
    }

    // 7. UI Transitions
    function showScreen(id) {
        ['um-step-1', 'um-step-2', 'um-step-3'].forEach(s => document.getElementById(s).style.display = (s === id ? 'block' : 'none'));
    }

    document.getElementById('um-btn-parse').onclick = () => {
        const raw = document.getElementById('um-input-data').value;
        if (!raw.trim()) { document.getElementById('um-error').innerText = "Please paste data."; return; }
        
        const lines = raw.split(/\r?\n/).filter(l => l.trim());
        const isExcel = raw.includes('\t') || (lines.length > 0 && lines[0].split(',').length > 2);
        umState.users = isExcel ? parseExcelData(raw) : parseTextData(raw);
        
        if (umState.users.length === 0) { document.getElementById('um-error').innerText = "No valid data found."; return; }
        document.getElementById('um-error').innerText = "";
        
        // Render Step 2
        document.getElementById('um-mapping-header').innerText = `Role Mapping (${umState.users.length} users)`;
        const list = document.getElementById('um-mapping-list');
        list.innerHTML = "";
        const uniqueRoles = [...new Set(umState.users.map(u => u.role || ""))];
        
        uniqueRoles.forEach(role => {
            const rLower = role.toLowerCase();
            let d1 = 'Sales Representative', dE = 'Salesrep';
            if (rLower.includes('install')) { d1 = 'Installer'; dE = 'User'; }
            else if (rLower.includes('finance') || rLower === 'fm') { d1 = 'Finance Manager'; dE = 'Org Admin'; }
            else if (rLower.includes('sales') && rLower.includes('manager')) { d1 = 'Sales Manager'; dE = 'sales_manager'; }
            else if (rLower.includes('sales') || rLower.includes('rep')) { d1 = 'Sales Representative'; dE = 'Salesrep'; }
            else if (rLower.includes('admin')) { d1 = 'Admin'; dE = 'Admin'; }
            else if (rLower.includes('user')) { d1 = 'User'; dE = 'User'; }

            const div = document.createElement('div');
            div.className = 'um-card';
            div.innerHTML = `
                <div style="font-weight:700; margin-bottom:4px; color:#475569;">"${role || 'Default'}"</div>
                <label style="font-size:10px; color:#e87a47; font-weight:700;">1LOOK ROLE</label>
                <select class="um-select um-1look-sel" data-orig="${role}">
                    ${UM_CONFIG.roles1Look.map(r => `<option value="${r}" ${r===d1?'selected':''}>${r}</option>`).join('')}
                </select>
                <label style="font-size:10px; color:#ea580c; font-weight:700; display:block; margin-top:6px;">ESTIMATOR ROLE</label>
                <select class="um-select um-est-sel" data-orig="${role}">
                    ${UM_CONFIG.rolesEstimator.map(r => `<option value="${r}" ${r===dE?'selected':''}>${r}</option>`).join('')}
                </select>
            `;
            list.appendChild(div);
        });
        showScreen('um-step-2');
    };

    document.getElementById('um-btn-apply').onclick = () => {
        const m1 = {}, mE = {};
        document.querySelectorAll('.um-1look-sel').forEach(s => m1[s.getAttribute('data-orig')] = s.value);
        document.querySelectorAll('.um-est-sel').forEach(s => mE[s.getAttribute('data-orig')] = s.value);
        
        umState.users.forEach(u => {
            u.role1Look = m1[u.originalRole] || 'Sales Representative';
            u.roleEstimator = mE[u.originalRole] || 'Salesrep';
        });
        umState.currentIndex = 0;
        renderQueue();
        showScreen('um-step-3');
    };

    function renderQueue() {
        if (umState.currentIndex >= umState.users.length) return;
        const u = umState.users[umState.currentIndex];
        document.getElementById('um-queue-container').innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-size:12px; font-weight:700; color:#64748b;">USER ${umState.currentIndex + 1} OF ${umState.users.length}</span>
                ${u.completed ? '<span style="background:#10b981; color:white; padding:2px 6px; border-radius:10px; font-size:10px; font-weight:bold;">DONE</span>' : ''}
            </div>
            <div class="um-card">
                <div style="font-size:16px; font-weight:800; color:#1e293b; margin-bottom:4px;">${u.firstName} ${u.lastName}</div>
                <div style="font-size:12px; color:#475569;">📧 ${u.email || 'N/A'}</div>
                <div style="font-size:12px; color:#475569;">📞 ${u.phone || 'N/A'}</div>
                <hr style="border:0; border-top:1px solid #e2e8f0; margin:8px 0;">
                <div style="font-size:12px; color:#15803d; font-weight:600;">1LOOK: ${u.role1Look}</div>
                <div style="font-size:12px; color:#c2410c; font-weight:600;">Estimator: ${u.roleEstimator}</div>
            </div>
        `;
    }

    document.getElementById('um-btn-prev').onclick = () => { if(umState.currentIndex > 0) { umState.currentIndex--; renderQueue(); } };
    document.getElementById('um-btn-next').onclick = () => { if(umState.currentIndex < umState.users.length - 1) { umState.currentIndex++; renderQueue(); } };
    document.getElementById('um-btn-reset-1').onclick = document.getElementById('um-btn-reset-2').onclick = () => {
        umState.users = []; umState.currentIndex = 0; showScreen('um-step-1');
    };

    // 8. Auto-fill Execution (Direct DOM Manipulation)
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    async function findAndFillInput(keywords, val, isEmail = false) {
        if (!val) return false;
        if (!Array.isArray(keywords)) keywords = [keywords];
        
        const allInputs = Array.from(document.querySelectorAll('input'));
        if (allInputs.length === 0) return false;
        let inputs = allInputs.filter(e => e.type !== 'hidden' && getComputedStyle(e).display !== 'none');
        if (inputs.length === 0) inputs = allInputs;

        let input = null;
        if (isEmail) input = inputs.find(e => e.type === "email" || (e.name||"").toLowerCase().includes("email") || (e.placeholder||"").toLowerCase().includes("email"));
        
        const isPhone = keywords.some(k => k.includes("phone") || k.includes("mobile"));
        if (!input && isPhone) input = inputs.find(e => e.type === "tel" || (e.name||"").toLowerCase().includes("phone") || (e.placeholder||"").toLowerCase().includes("phone"));

        if (!input) input = inputs.find(e => {
            const ph = (e.placeholder||"").toLowerCase(), name = (e.name||"").toLowerCase(), aria = (e.getAttribute('aria-label')||"").toLowerCase();
            return keywords.some(k => ph.includes(k) || name.includes(k) || aria.includes(k));
        });

        if (!input) {
            const labels = Array.from(document.querySelectorAll('label, div, span')).filter(e => {
                const txt = (e.innerText||"").trim().toLowerCase();
                return keywords.some(k => txt === k || txt.startsWith(k)) && e.children.length === 0;
            });
            for (const label of labels) {
                if (label.htmlFor) { input = document.getElementById(label.htmlFor); if(input) break; }
                const parent = label.closest('div, section, .form-group');
                if (parent) { input = parent.querySelector('input:not([type="hidden"])'); if(input) break; }
            }
        }

        if (input) {
            input.focus(); input.click();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            if (nativeSetter) nativeSetter.call(input, val); else input.value = val;
            ['focus', 'input', 'change', 'blur'].forEach(evt => input.dispatchEvent(new Event(evt, { bubbles: true })));
            
            const digitsOnly = val.replace(/\D/g, '');
            if ((!input.value || input.value.trim() === "") && digitsOnly) {
                await sleep(50);
                if (nativeSetter) nativeSetter.call(input, digitsOnly); else input.value = digitsOnly;
                ['input', 'change', 'blur'].forEach(evt => input.dispatchEvent(new Event(evt, { bubbles: true })));
            }
            await sleep(100);
            return true;
        }
        return false;
    }

    async function fill1LookRole(targetRole) {
        if (!targetRole) return;
        const label = Array.from(document.querySelectorAll('label, span, div')).find(el => ["Role", "Role *"].includes(el.innerText.trim()));
        if (label) {
            let trigger = label.nextElementSibling || label.querySelector('[role="combobox"]') || label.parentElement.querySelector('kendo-dropdownlist');
            if (!trigger) trigger = Array.from(document.querySelectorAll('kendo-dropdownlist, .ng-select-container')).find(e => e.offsetParent);
            if (trigger) {
                trigger.click(); await sleep(500);
                let opts = Array.from(document.querySelectorAll('li, div[role="option"], span.ng-option-label, .k-item'));
                if (opts.length === 0) { label.click(); await sleep(300); opts = Array.from(document.querySelectorAll('li, div[role="option"], span.ng-option-label, .k-item')); }
                const match = opts.find(o => o.innerText.trim().toLowerCase() === targetRole.toLowerCase()) || opts.find(o => o.innerText.toLowerCase().includes(targetRole.toLowerCase()));
                if (match) {
                    match.scrollIntoView({ block: 'center' });
                    ['mousedown', 'mouseup', 'click'].forEach(evt => match.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window })));
                    await sleep(100);
                    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                }
            }
        }
    }

    document.getElementById('um-btn-fill').onclick = async () => {
        const btn = document.getElementById('um-btn-fill');
        btn.innerText = "⏳ Filling...";
        btn.style.opacity = "0.7";
        
        try {
            const u = umState.users[umState.currentIndex];
            await findAndFillInput(["first name", "firstname", "first"], u.firstName);
            await findAndFillInput(["last name", "lastname", "last"], u.lastName);
            await findAndFillInput(["email", "e-mail", "mail"], u.email, true);
            await findAndFillInput(["mobile phone", "phone number", "phone", "mobile"], u.phone);
            await fill1LookRole(u.role1Look || u.role);

            showToast("✅ Auto-filled!", "success");
            umState.users[umState.currentIndex].completed = true;
            renderQueue();
        } catch (e) {
            console.error(e);
            showToast("⚠️ Error filling form", "error");
        } finally {
            btn.innerText = "⚡ AUTO-FILL 1LOOK FORM";
            btn.style.opacity = "1";
        }
    };

})();
