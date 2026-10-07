// --- CONFIGURATION ---
const CONFIG = {
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

// --- STATE ---
let state = {
    users: [],
    currentIndex: 0,
    sendWelcome: true,
    status: "wizard"
};

let screens = {};

function initApp() {
    screens = {
        wizard: document.getElementById('ui-wizard'),
        config: document.getElementById('ui-config'),
        queue: document.getElementById('ui-queue')
    };

    loadState();
    render();
    setupListeners();
    setupBookmarklet();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function setupListeners() {
    const dropdown = document.getElementById('user-select-dropdown');
    if (dropdown) {
        dropdown.onchange = (e) => {
            state.currentIndex = parseInt(e.target.value, 10) || 0;
            saveState();
            renderQueue();
        };
    }

    // Prevent browser default open-file behavior on window
    window.addEventListener("dragover", (e) => e.preventDefault(), false);
    window.addEventListener("drop", (e) => e.preventDefault(), false);

    // Drag & Drop File Handlers
    const dropZone = document.getElementById('drop-zone');
    const dropOverlay = document.getElementById('drop-overlay');
    const fileInput = document.getElementById('file-upload-input');

    if (dropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault(); e.stopPropagation();
                if (dropOverlay) dropOverlay.style.display = 'flex';
                dropZone.style.borderColor = '#1e2838';
                dropZone.style.background = '#f1f5f9';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault(); e.stopPropagation();
                if (dropOverlay) dropOverlay.style.display = 'none';
                dropZone.style.borderColor = '#cbd5e1';
                dropZone.style.background = '#f8fafc';
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (dropOverlay) dropOverlay.style.display = 'none';
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                handleFileDrop(dt.files[0]);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFileDrop(e.target.files[0]);
            }
        });
    }
}

async function loadXlsxLibrary() {
    if (typeof XLSX !== 'undefined') return true;
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
}

async function handleFileDrop(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    showToast(`📂 Processing file: "${file.name}"...`, "info");

    try {
        let tsvText = "";
        if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') || name.endsWith('.tsv')) {
            const loaded = await loadXlsxLibrary();
            if (loaded && typeof XLSX !== 'undefined') {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                tsvText = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
            } else {
                tsvText = await file.text();
            }
        } else {
            tsvText = await file.text();
        }

        if (tsvText.trim()) {
            document.getElementById('wiz-data').value = tsvText;
            showToast(`✅ Loaded "${file.name}"! Parsing...`, "success");
            parseAndInit();
        } else {
            showToast("⚠️ File appears to be empty.", "error");
        }
    } catch (err) {
        console.error("Error reading file:", err);
        showToast(`❌ Error reading file: ${err.message}`, "error");
    }
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

window.copyText = function(text, label = "") {
    if (!text || text === '-' || text === 'N/A') {
        showToast("⚠️ Field is empty", "error");
        return;
    }
    const cleanStr = String(text).trim();

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cleanStr).then(() => {
            showToast(`📋 Copied ${label}: "${cleanStr}"`, "success");
        }).catch(() => fallbackCopyText(cleanStr, label));
    } else {
        fallbackCopyText(cleanStr, label);
    }
};

function fallbackCopyText(cleanStr, label) {
    try {
        const ta = document.createElement('textarea');
        ta.value = cleanStr;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(ta);
        if (successful) {
            showToast(`📋 Copied ${label}: "${cleanStr}"`, "success");
        } else {
            showToast(`❌ Copy failed`, "error");
        }
    } catch (e) {
        showToast(`❌ Copy failed: ${e.message}`, "error");
    }
}

window.copyUserRow = function(idx) {
    if (idx >= state.users.length) return;
    const u = state.users[idx];
    const roleDisplay = u.branch ? `${u.role1Look || u.role || 'Sales Representative'} (${u.branch})` : (u.role1Look || u.role || 'Sales Representative');
    const row = [u.firstName, u.lastName, u.email, u.phone, roleDisplay].join('\t');
    window.copyText(row, `1LOOK Row for ${u.firstName}`);
};

window.copyEstimatorRow = function(idx) {
    if (idx >= state.users.length) return;
    const u = state.users[idx];
    const roleDisplay = u.roleEstimator || u.role || 'Salesrep';
    const row = [u.firstName, u.lastName, u.email, u.phone, roleDisplay, u.branch || ''].join('\t');
    window.copyText(row, `Estimator Row for ${u.firstName}`);
};

document.addEventListener('click', (e) => {
    const resetBtn = e.target.closest('.btn-global-reset');
    if (resetBtn) {
        resetEverything();
        return;
    }

    const applyBtn = e.target.closest('#btn-apply-config');
    if (applyBtn) {
        applyConfigAndStart();
        return;
    }

    const parseBtn = e.target.closest('#btn-parse');
    if (parseBtn) {
        parseAndInit();
        return;
    }

    const backBtn = e.target.closest('#btn-back-parser');
    if (backBtn) {
        state.status = 'wizard';
        saveState();
        render();
        return;
    }

    const prevBtn = e.target.closest('#btn-prev-user');
    if (prevBtn) {
        prevUser();
        return;
    }

    const nextBtn = e.target.closest('#btn-next-user');
    if (nextBtn) {
        nextUser();
        return;
    }

    const chip = e.target.closest('.copy-field-box, .copy-field-chip');
    if (chip) {
        const val = chip.getAttribute('data-copy-val');
        const label = chip.getAttribute('data-copy-label') || 'Field';
        if (val) {
            window.copyText(val, label);
        }
        return;
    }

    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
        const action = actionBtn.getAttribute('data-action');
        const idx = parseInt(actionBtn.getAttribute('data-idx'), 10);
        if (action === 'fill-1look') {
            triggerFillUser(idx);
        } else if (action === 'toggle-complete') {
            toggleUserComplete(idx);
        } else if (action === 'copy-row') {
            copyUserRow(idx);
        } else if (action === 'copy-estimator') {
            copyEstimatorRow(idx);
        }
    }
});

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function saveState() {
    localStorage.setItem('tablet_app_state', JSON.stringify(state));
    if (state.users && state.users[state.currentIndex]) {
        localStorage.setItem('tablet_current_user', JSON.stringify(state.users[state.currentIndex]));
    }
}

function loadState() {
    const saved = localStorage.getItem('tablet_app_state');
    if (saved) {
        try { state = JSON.parse(saved); } catch (e) { }
    }
}

function resetEverything() {
    try {
        state = { users: [], currentIndex: 0, sendWelcome: true, status: "wizard" };
        localStorage.removeItem('tablet_app_state');
        localStorage.removeItem('tablet_current_user');
        if (document.getElementById('wiz-data')) document.getElementById('wiz-data').value = "";
        if (document.getElementById('parse-error')) document.getElementById('parse-error').innerText = "";
        render();
        if (typeof showToast === 'function') showToast("🔄 App reset to Step 1", "info");
    } catch (err) {
        console.error("Error in resetEverything:", err);
    }
}

function render() {
    Object.values(screens).forEach(el => {
        if (el) el.classList.add('hidden');
    });

    if (state.status === 'wizard') {
        if (screens.wizard) screens.wizard.classList.remove('hidden');
    } else if (state.status === 'config') {
        if (screens.config) screens.config.classList.remove('hidden');
        renderConfigUI();
    } else if (state.status === 'active') {
        if (screens.queue) screens.queue.classList.remove('hidden');
        renderQueue();
    }
}

function parseAndInit() {
    try {
        const raw = document.getElementById('wiz-data').value;
        document.getElementById('parse-error').innerText = "";

        if (!raw.trim()) {
            document.getElementById('parse-error').innerText = "Please paste user data to continue.";
            return;
        }

        const users = parseSmartData(raw);
        if (users.length === 0) {
            document.getElementById('parse-error').innerText = "Could not parse any user information. Check input format.";
            return;
        }

        state.users = users;
        state.currentIndex = 0;
        state.status = 'config';
        saveState();
        render();
    } catch (err) {
        console.error("Parse error:", err);
        const errEl = document.getElementById('parse-error');
        if (errEl) errEl.innerText = "Error parsing data: " + err.message;
        if (typeof showToast === 'function') showToast("❌ Error parsing data: " + err.message, "error");
    }
}

function parseSmartData(raw) {
    if (raw.includes('\t')) return parseExcelTsvData(raw);
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    if (lines.length > 0 && lines[0].split(',').length > 2) {
        return parseExcelTsvData(raw);
    }
    return parseTextOrEmailData(raw);
}

function parseExcelTsvData(raw) {
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return [];

    const isTab = lines[0].includes('\t');
    const delim = isTab ? '\t' : ',';
    const firstLineCols = lines[0].split(delim).map(c => c.trim().toLowerCase());
    const mapping = { firstName: -1, lastName: -1, fullName: -1, email: -1, phone: -1, role: -1, branch: -1, managerName: -1, managerEmail: -1 };
    let hasHeaders = false;

    const branchIndices = [];
    firstLineCols.forEach((col, idx) => {
        if (col.includes('manager')) return;

        if (mapping.email === -1 && (CONFIG.keywords.email || []).some(w => col.includes(w) || col === w)) { mapping.email = idx; hasHeaders = true; }
        else if (mapping.phone === -1 && (CONFIG.keywords.phone || []).some(w => col.includes(w) || col === w)) { mapping.phone = idx; hasHeaders = true; }
        else if (mapping.role === -1 && (CONFIG.keywords.role || []).some(w => col.includes(w) || col === w)) { mapping.role = idx; hasHeaders = true; }
        else if (mapping.firstName === -1 && (CONFIG.keywords.firstName || []).some(w => col.includes(w) || col === w)) { mapping.firstName = idx; hasHeaders = true; }
        else if (mapping.lastName === -1 && (CONFIG.keywords.lastName || []).some(w => col.includes(w) || col === w)) { mapping.lastName = idx; hasHeaders = true; }
        else if (mapping.fullName === -1 && (CONFIG.keywords.fullName || []).some(w => col.includes(w) || col === w)) { mapping.fullName = idx; hasHeaders = true; }

        if ((CONFIG.keywords.branch || []).some(w => col.includes(w) || col === w)) branchIndices.push(idx);
    });

    const dataRows = hasHeaders ? lines.slice(1) : lines;
    return dataRows.map(line => {
        const cols = line.split(delim);
        const getVal = (idx) => (idx > -1 && cols[idx]) ? cols[idx].trim() : "";

        let rawFirstName = "";
        let rawLastName = "";

        if (mapping.firstName > -1 && mapping.lastName > -1) {
            rawFirstName = getVal(mapping.firstName);
            rawLastName = getVal(mapping.lastName);
        } else {
            const nameIdx = mapping.fullName > -1 ? mapping.fullName : (mapping.firstName > -1 ? mapping.firstName : 0);
            const rawName = getVal(nameIdx);
            const nameParts = rawName.split(/\s+/).filter(p => p);
            if (nameParts.length > 1) {
                rawLastName = nameParts.pop();
                rawFirstName = nameParts.join(' ');
            } else {
                rawFirstName = rawName;
            }
        }

        let firstName = rawFirstName.replace(/[:]/g, '').split(/\s+/).filter(Boolean).join('.');
        let lastName = rawLastName.replace(/[:]/g, '').trim();
        if (firstName.includes('@')) firstName = "";
        if (lastName.includes('@')) lastName = "";

        const email = getVal(mapping.email > -1 ? mapping.email : (isTab ? 1 : -1)) || cols.find(c => c.includes('@'))?.trim() || "";

        let rawPhone = "";
        if (mapping.phone > -1) {
            const candidate = getVal(mapping.phone);
            if (candidate.replace(/\D/g, '').length >= 7) rawPhone = candidate;
        }
        if (!rawPhone) {
            const foundCell = cols.find(c => {
                const d = c.trim().replace(/\D/g, '');
                return d.length >= 7 && d.length <= 15 && /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/.test(c);
            });
            if (foundCell) rawPhone = foundCell.trim();
        }

        return {
            firstName, lastName,
            email,
            phone: cleanPhone(rawPhone),
            role: getVal(mapping.role),
            branch: branchIndices.length > 0 ? branchIndices.map(i => cols[i]?.trim()).filter(x => x).join(', ') : getVal(mapping.branch),
            originalRole: getVal(mapping.role),
            completed: false
        };
    }).filter(u => isValidUser(u));
}

function parseTextOrEmailData(text) {
    let blocks = text.split(/\n\s*\n|\n(?=-{3,}|\={3,})\n/).map(b => b.trim()).filter(b => b);
    const users = [];

    for (const block of blocks) {
        let rawFirstName = "";
        let rawLastName = "";
        let email = "";
        let rawPhone = "";
        let role = "";
        let branch = "";
        let nameFound = false;

        const lines = block.split(/\r?\n/);
        for (const line of lines) {
            const kvMatch = line.match(/^\s*([^:\-=]+)[:\-=]\s*(.+)$/);
            if (kvMatch) {
                const key = kvMatch[1].trim().toLowerCase();
                const val = kvMatch[2].trim();
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
                    if (val.replace(/\D/g, '').length >= 7) rawPhone = val;
                }
                else if (key.match(/role|position|job|title/)) role = val;
                else if (key.match(/branch|location|office|site/)) branch = val;
            } else {
                const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                const phoneMatch = line.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/);
                
                if (emailMatch && !email) {
                    email = emailMatch[0];
                } else if (phoneMatch && !rawPhone) {
                    rawPhone = phoneMatch[0];
                } else {
                    const cleanLine = line.trim();
                    if (cleanLine) {
                        if (!nameFound && cleanLine.split(/\s+/).length <= 4) {
                            const parts = cleanLine.split(/\s+/);
                            rawFirstName = parts[0];
                            rawLastName = parts.slice(1).join(' ');
                            nameFound = true;
                        } else if (!role && cleanLine.length > 2) {
                            role = cleanLine;
                        }
                    }
                }
            }
        }

        let firstName = rawFirstName.replace(/[:]/g, '').split(/\s+/).filter(Boolean).join('.');
        let lastName = rawLastName.replace(/[:]/g, '').trim();
        if (firstName.includes('@')) firstName = "";
        if (lastName.includes('@')) lastName = "";

        const u = {
            firstName, lastName,
            email,
            phone: cleanPhone(rawPhone),
            role,
            branch,
            originalRole: role,
            completed: false
        };

        if (isValidUser(u)) users.push(u);
    }
    return users;
}

function isValidUser(u) {
    if (!u) return false;
    const fName = (u.firstName || "").toLowerCase().trim();
    const lName = (u.lastName || "").toLowerCase().trim();
    const email = (u.email || "").toLowerCase().trim();

    if (!fName && !email) return false;

    const junk = [
        "first name", "last name", "given name", "family name", "name", "full name",
        "permissions", "role", "email", "phone", "mobile phone", "manager", "branch",
        "location", "locations", "sales rep", "sales representative", "sales manager",
        "finance manager", "installer", "admin", "user", "dealer name", "licensed",
        "platform", "active", "deactivated"
    ];

    const fullName = (fName + " " + lName).trim();
    if (junk.includes(fullName) || (fName && junk.includes(fName)) || (email && junk.includes(email))) {
        return false;
    }
    return true;
}

function renderConfigUI() {
    const summaryHeader = document.getElementById('summary-header');
    if (summaryHeader) summaryHeader.innerText = `PARSED USERS (${state.users.length})`;

    const previewBox = document.getElementById('parsed-users-preview');
    if (previewBox) {
        previewBox.innerHTML = state.users.map((u, i) => {
            const roleDisplay = u.branch ? `${u.role || 'Sales Rep'} (${u.branch})` : (u.role || 'Sales Rep');
            return `
                <div style="background:#fbf8f4; border:1px solid #e6ded3; border-radius:10px; padding:8px 10px; margin-bottom:6px;">
                    <b style="color:#0f4c47;">${i + 1}. ${u.firstName} ${u.lastName}</b>
                    <div style="color:#5c6f6a; font-size:11px; margin-top:2px;">📧 ${u.email || 'No email'} | 📱 ${u.phone || 'No phone'}</div>
                    <div style="color:#0d9488; font-weight:600; font-size:11px; margin-top:2px;">💼 Role: ${roleDisplay}</div>
                </div>
            `;
        }).join('');
    }

    const list = document.getElementById('mapping-list');
    if (!list) return;
    list.innerHTML = "";

    const rolesFound = [...new Set(state.users.map(u => u.role))];
    if (rolesFound.length === 0) rolesFound[0] = "";

    rolesFound.forEach(role => {
        const div = document.createElement('div');
        div.style.cssText = "margin-bottom:10px; padding:10px; background:#fbf8f4; border:1px solid #e6ded3; border-radius:10px;";

        const rLower = (role || "").toLowerCase();
        let def1Look = 'Sales Representative';
        let defEstimator = 'Salesrep';

        if (rLower.includes('install')) { def1Look = 'Installer'; defEstimator = 'User'; }
        else if (rLower.includes('finance') || rLower === 'fm') { def1Look = 'Finance Manager'; defEstimator = 'Org Admin'; }
        else if ((rLower.includes('sales') && rLower.includes('manager')) || rLower === 'sm') { def1Look = 'Sales Manager'; defEstimator = 'sales_manager'; }
        else if (rLower.includes('sales') || rLower.includes('rep') || rLower === 'sr') { def1Look = 'Sales Representative'; defEstimator = 'Salesrep'; }
        else if (rLower.includes('admin')) { def1Look = 'Admin'; defEstimator = 'Admin'; }
        else if (rLower.includes('user')) { def1Look = 'User'; defEstimator = 'User'; }

        div.innerHTML = `
            <div style="margin-bottom:4px; font-weight:700; font-size:11px; color:#0f4c47;">Parsed Role: "${role || '(Default / Empty)'}"</div>
            <div>
                <label style="color:#e87a47; font-size:10px; font-weight:700;">⚡ 1LOOK ROLE</label>
                <select class="map-select-1look" data-original="${role}">
                    ${CONFIG.roles1Look.map(r => `<option value="${r}" ${r === def1Look ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
            </div>
            <div style="margin-top:6px;">
                <label style="color:#ea580c; font-size:10px; font-weight:700;">🟧 ESTIMATOR ROLE</label>
                <select class="map-select-estimator" data-original="${role}">
                    ${CONFIG.rolesEstimator.map(r => `<option value="${r}" ${r === defEstimator ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
            </div>
        `;
        list.appendChild(div);
    });
}

function applyConfigAndStart() {
    try {
        const map1Look = {};
        const mapEstimator = {};
        document.querySelectorAll('.map-select-1look').forEach(s => {
            const orig = s.getAttribute('data-original') || "";
            map1Look[orig] = s.value;
        });
        document.querySelectorAll('.map-select-estimator').forEach(s => {
            const orig = s.getAttribute('data-original') || "";
            mapEstimator[orig] = s.value;
        });

        if (state.users && state.users.length > 0) {
            state.users.forEach(u => {
                const origKey = u.originalRole || u.role || "";
                u.role1Look = map1Look[origKey] || map1Look[""] || map1Look["undefined"] || 'Sales Representative';
                u.roleEstimator = mapEstimator[origKey] || mapEstimator[""] || mapEstimator["undefined"] || 'Salesrep';
            });
        }

        state.status = 'active';
        saveState();
        render();
    } catch (err) {
        console.error("Error in applyConfigAndStart:", err);
        if (typeof showToast === 'function') showToast("❌ Error starting batch: " + err.message, "error");
    }
}

function renderQueue() {
    const singleContainer = document.getElementById('single-user-view-container');
    if (!singleContainer) return;

    const total = state.users.length;
    const completedCount = state.users.filter(u => u.completed).length;
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    const progressText = document.getElementById('progress-text');
    if (progressText) progressText.innerText = `Progress: ${completedCount} / ${total} Completed`;

    const progressPercent = document.getElementById('progress-percent');
    if (progressPercent) progressPercent.innerText = `${percent}%`;

    const progressFill = document.getElementById('progress-fill');
    if (progressFill) progressFill.style.width = `${percent}%`;

    const dropdown = document.getElementById('user-select-dropdown');
    if (dropdown) {
        dropdown.innerHTML = state.users.map((u, i) => `
            <option value="${i}" ${i === state.currentIndex ? 'selected' : ''}>
                ${u.completed ? '✓ ' : ''}${i + 1}. ${u.firstName} ${u.lastName}
            </option>
        `).join('');
    }

    if (total === 0) {
        singleContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b; font-weight:700;">No users in batch.</div>`;
        return;
    }

    if (state.currentIndex >= total) state.currentIndex = total - 1;
    if (state.currentIndex < 0) state.currentIndex = 0;

    const i = state.currentIndex;
    const u = state.users[i];
    const isCompleted = !!u.completed;

    const roleDisplay = u.branch ? `${u.role1Look || u.role || 'Sales Representative'} (${u.branch})` : (u.role1Look || u.role || 'Sales Representative');

    singleContainer.innerHTML = `
        <div class="focused-user-card ${isCompleted ? 'completed' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; padding-bottom:10px; border-bottom:1.5px solid ${isCompleted ? '#bbf7d0' : '#e9d5ff'};">
                <div>
                    <div style="font-size:11px; color:#7c3aed; font-weight:800; text-transform:uppercase; margin-bottom:2px;">
                        USER ${i + 1} OF ${total}
                    </div>
                    <div style="font-size:18px; font-weight:800; color:${isCompleted ? '#166534' : '#1e1b4b'};">
                        ${u.firstName} ${u.lastName}
                    </div>
                </div>
                <button type="button" class="btn-check-toggle ${isCompleted ? 'completed' : ''}" data-action="toggle-complete" data-idx="${i}">
                    ${isCompleted ? '✓ Created' : '☐ Mark Done'}
                </button>
            </div>

            <div style="margin-bottom:16px;">
                <div style="font-size:11px; color:#64748b; font-weight:800; text-transform:uppercase; margin-bottom:8px;">💡 TAP ANY FIELD BELOW TO COPY</div>

                <div class="copy-field-box" data-copy-val="${escapeHtml(u.firstName)}" data-copy-label="First Name">
                    <span style="color:#64748b; font-weight:700;">First Name:</span>
                    <span style="font-weight:800; color:#1e1b4b; font-size:14px;">${u.firstName} 📋</span>
                </div>

                <div class="copy-field-box" data-copy-val="${escapeHtml(u.lastName)}" data-copy-label="Last Name">
                    <span style="color:#64748b; font-weight:700;">Last Name:</span>
                    <span style="font-weight:800; color:#1e1b4b; font-size:14px;">${u.lastName} 📋</span>
                </div>

                <div class="copy-field-box" data-copy-val="${escapeHtml(u.email)}" data-copy-label="Email">
                    <span style="color:#64748b; font-weight:700;">Email:</span>
                    <span style="font-weight:800; color:#1e1b4b; font-size:13px;">${u.email || '-'} 📋</span>
                </div>

                <div class="copy-field-box" data-copy-val="${escapeHtml(u.phone)}" data-copy-label="Phone">
                    <span style="color:#64748b; font-weight:700;">Mobile Phone:</span>
                    <span style="font-weight:800; color:#1e1b4b; font-size:13px;">${u.phone || '-'} 📋</span>
                </div>

                <div class="copy-field-box" data-copy-val="${escapeHtml(roleDisplay)}" data-copy-label="1LOOK Role" style="background:#f0fdf4; border-color:#bbf7d0;">
                    <span style="color:#15803d; font-weight:700;">1LOOK Role:</span>
                    <span style="font-weight:800; color:#166534; font-size:13px;">${roleDisplay} 📋</span>
                </div>

                <div class="copy-field-box" data-copy-val="${escapeHtml(u.roleEstimator || u.role)}" data-copy-label="Estimator Role" style="background:#fff7ed; border-color:#fed7aa;">
                    <span style="color:#c2410c; font-weight:700;">Estimator Role:</span>
                    <span style="font-weight:800; color:#9a3412; font-size:13px;">${escapeHtml(u.roleEstimator || u.role)} 📋</span>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:8px;">
                <button type="button" class="btn-primary" style="background:#16a34a; font-size:13px; padding:12px;" data-action="fill-1look" data-idx="${i}">
                    📋 COPY DATA TO CLIPBOARD
                </button>
                <div style="display:flex; gap:8px;">
                    <button type="button" class="btn-secondary" style="flex:1; padding:10px; font-size:11px;" data-action="copy-row" data-idx="${i}">
                        📋 Copy 1LOOK (TSV)
                    </button>
                    <button type="button" class="btn-secondary" style="flex:1; padding:10px; font-size:11px;" data-action="copy-estimator" data-idx="${i}">
                        📋 Copy Estimator (TSV)
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.toggleUserComplete = function(idx) {
    if (state.users[idx]) {
        state.users[idx].completed = !state.users[idx].completed;
        saveState();
        renderQueue();
    }
};

window.triggerFillUser = function(idx) {
    if (idx >= state.users.length) return;
    state.currentIndex = idx;
    saveState();
    renderQueue();

    const u = state.users[idx];
    copyUserRow(idx);
    showToast(`📋 Copied row for ${u.firstName}! Switch to 1LOOK form & paste.`, "success");
};

function nextUser() {
    if (state.currentIndex < state.users.length - 1) {
        state.currentIndex++;
    } else {
        state.currentIndex = 0;
    }
    saveState();
    renderQueue();
}

function prevUser() {
    if (state.currentIndex > 0) {
        state.currentIndex--;
    } else {
        state.currentIndex = state.users.length - 1;
    }
    saveState();
    renderQueue();
}

function setupBookmarklet() {
    const origin = window.location.origin;
    const widgetUrl = `${origin}/widget.js`;
    const code = `javascript:(function(){if(window.oneLookWidgetLoaded){const w=document.getElementById('one-look-floating-widget');if(w)w.style.display=w.style.display==='none'?'block':'none';}else{window.oneLookWidgetLoaded=true;var s=document.createElement('script');s.src='${widgetUrl}?v='+Date.now();document.body.appendChild(s);}})();`;

    const a = document.getElementById('bookmarklet-link');
    if (a) {
        a.href = code;
    }
}

function showToast(msg, type = 'info') {
    const t = document.getElementById('panel-toast');
    if (t) {
        t.innerText = msg;
        t.style.background = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#1e2838');
        t.style.opacity = '1';
        setTimeout(() => { t.style.opacity = '0'; }, 3000);
    }
}
