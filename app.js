// --- CONFIGURATION ---
const CONFIG = {
    keywords: {
        firstName: ["first name", "firstname", "first", "primer nombre", "given name"],
        lastName: ["last name", "lastname", "last", "apellido", "apellidos", "family name"],
        fullName: ["full name", "fullname", "name", "nombre completo", "employee", "person", "user"],
        email: ["email", "e-mail", "mail", "correo"],
        phone: ["phone number", "phone", "mobile", "cell", "contact", "teléfono", "celular"],
        role: ["role", "job", "title", "position", "permissions", "cargo", "puesto"],
        branch: ["main branch", "branch", "location", "office", "site", "city", "county", "town", "territory", "area", "locations"]
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

let screens = {};

document.addEventListener('DOMContentLoaded', () => {
    screens = {
        wizard: document.getElementById('ui-wizard'),
        config: document.getElementById('ui-config'),
        queue: document.getElementById('ui-queue')
    };

    loadState();
    render();
    setupListeners();
    setupBookmarklet();
});

function setupListeners() {
    document.querySelectorAll('.btn-global-reset').forEach(btn => {
        btn.onclick = resetEverything;
    });

    document.getElementById('btn-parse').onclick = parseAndInit;
    document.getElementById('btn-back-parser').onclick = () => {
        state.status = 'wizard';
        saveState();
        render();
    };
    document.getElementById('btn-apply-config').onclick = applyConfigAndStart;

    // Drag & Drop File Handlers
    const dropZone = document.getElementById('drop-zone');
    const dropOverlay = document.getElementById('drop-overlay');
    const fileInput = document.getElementById('file-upload-input');

    if (dropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault(); e.stopPropagation();
                if (dropOverlay) dropOverlay.style.display = 'flex';
                dropZone.style.borderColor = '#7c3aed';
                dropZone.style.background = '#f3e8ff';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault(); e.stopPropagation();
                if (dropOverlay) dropOverlay.style.display = 'none';
                dropZone.style.borderColor = '#ddd6fe';
                dropZone.style.background = '#faf5ff';
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
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

async function handleFileDrop(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    showToast(`📂 Processing file: "${file.name}"...`, "info");

    try {
        let tsvText = "";
        if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            if (typeof XLSX === 'undefined') {
                return showToast("⚠️ Excel parser loading. Please try again.", "error");
            }
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            tsvText = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
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
    const incompleteCount = state.users.filter(u => !u.completed).length;
    if (state.users.length > 0) {
        let msg = "Clear batch progress and start fresh?";
        if (incompleteCount > 0) {
            msg = `⚠️ Warning: You have ${incompleteCount} user(s) that are NOT marked as completed!\n\nAre you sure you want to reset and clear all data?`;
        }
        if (!confirm(msg)) return;
    }

    state = { users: [], currentIndex: 0, sendWelcome: true, status: "wizard" };
    localStorage.removeItem('tablet_app_state');
    localStorage.removeItem('tablet_current_user');
    if (document.getElementById('wiz-data')) document.getElementById('wiz-data').value = "";
    render();
    showToast("🔄 App reset to Step 1", "info");
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
}

function parseSmartData(raw) {
    if (raw.includes('\t') || raw.includes(',')) return parseExcelTsvData(raw);
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

    firstLineCols.forEach((col, idx) => {
        if (CONFIG.keywords.firstName.some(w => col.includes(w) || col === w)) { mapping.firstName = idx; hasHeaders = true; }
        else if (CONFIG.keywords.lastName.some(w => col.includes(w) || col === w)) { mapping.lastName = idx; hasHeaders = true; }
        else if (CONFIG.keywords.fullName.some(w => col.includes(w) || col === w) && mapping.fullName === -1) { mapping.fullName = idx; hasHeaders = true; }
        else if (CONFIG.keywords.email.some(w => col.includes(w) || col === w)) { mapping.email = idx; hasHeaders = true; }
        else if (CONFIG.keywords.phone.some(w => col.includes(w) || col === w)) { mapping.phone = idx; hasHeaders = true; }
        else if (CONFIG.keywords.role.some(w => col.includes(w) || col === w)) { mapping.role = idx; hasHeaders = true; }
    });

    const branchIndices = [];
    firstLineCols.forEach((col, idx) => {
        if (col.includes('manager')) return;
        if (CONFIG.keywords.branch.some(w => col.includes(w) || col === w)) branchIndices.push(idx);
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
            const nameIdx = mapping.fullName > -1 ? mapping.fullName : 0;
            const rawName = getVal(nameIdx);
            const nameParts = rawName.split(/\s+/).filter(p => p);
            if (nameParts.length > 1) {
                rawLastName = nameParts.pop();
                rawFirstName = nameParts.join(' ');
            } else {
                rawFirstName = rawName;
            }
        }

        const firstName = rawFirstName.split(/\s+/).filter(Boolean).join('.');
        const lastName = rawLastName;
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

        const lines = block.split(/\r?\n/);
        for (const line of lines) {
            const kvMatch = line.match(/^\s*([^:\-=]+)[:\-=]\s*(.+)$/);
            if (kvMatch) {
                const key = kvMatch[1].trim().toLowerCase();
                const val = kvMatch[2].trim();
                if (key.match(/first\s*name|primer\s*nombre/)) rawFirstName = val;
                else if (key.match(/last\s*name|apellido/)) rawLastName = val;
                else if (key.match(/full\s*name|^name$|^nombre$/)) {
                    const parts = val.split(/\s+/).filter(p => p);
                    rawFirstName = parts[0] || val;
                    rawLastName = parts.length > 1 ? parts.slice(1).join(' ') : "";
                }
                else if (key.match(/email|mail|correo/)) email = val;
                else if (key.match(/phone|mobile|cell|tel[ée]fono/)) {
                    if (val.replace(/\D/g, '').length >= 7) rawPhone = val;
                }
                else if (key.match(/role|position|job|title/)) role = val;
                else if (key.match(/branch|location|office|site/)) branch = val;
            } else {
                const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                if (emailMatch && !email) email = emailMatch[0];
                const phoneMatch = line.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/);
                if (phoneMatch && !rawPhone) rawPhone = phoneMatch[0];
            }
        }

        const firstName = rawFirstName.split(/\s+/).filter(Boolean).join('.');
        const lastName = rawLastName;

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
    if (!u.firstName && !u.email) return false;

    const junk = [
        "first name", "last name", "given name", "family name", "name", "full name",
        "permissions", "role", "email", "phone", "mobile phone", "manager", "branch",
        "location", "locations", "sales rep", "sales representative", "sales manager",
        "finance manager", "installer", "admin", "user", "dealer name", "licensed",
        "platform", "active", "deactivated"
    ];

    const fullName = (u.firstName + " " + u.lastName).toLowerCase().trim();
    if (junk.includes(fullName) || junk.includes(u.firstName.toLowerCase()) || junk.includes(u.email.toLowerCase())) {
        return false;
    }
    return true;
}

function renderConfigUI() {
    const summaryHeader = document.getElementById('summary-header');
    if (summaryHeader) summaryHeader.innerText = `PARSED USERS (${state.users.length})`;

    const previewBox = document.getElementById('parsed-users-preview');
    if (previewBox) {
        previewBox.innerHTML = state.users.map((u, i) => `
            <div style="background:#faf5ff; border:1px solid #e9d5ff; border-radius:10px; padding:8px 10px; margin-bottom:6px;">
                <b style="color:#2e1065;">${i + 1}. ${u.firstName} ${u.lastName}</b>
                <div style="color:#64748b; font-size:11px; margin-top:2px;">📧 ${u.email || 'No email'} | 📱 ${u.phone || 'No phone'}</div>
                <div style="color:#6d28d9; font-weight:600; font-size:11px; margin-top:2px;">💼 Role: ${u.role || 'Not specified'} | 🏢 Location: ${u.branch || 'None'}</div>
            </div>
        `).join('');
    }

    const list = document.getElementById('mapping-list');
    if (!list) return;
    list.innerHTML = "";

    const rolesFound = [...new Set(state.users.map(u => u.role))];
    if (rolesFound.length === 0) rolesFound[0] = "";

    rolesFound.forEach(role => {
        const div = document.createElement('div');
        div.style.cssText = "margin-bottom:10px; padding:10px; background:#faf5ff; border:1px solid #e9d5ff; border-radius:10px;";

        const rLower = (role || "").toLowerCase();
        let def1Look = 'Sales Representative';

        if (rLower.includes('install')) { def1Look = 'Installer'; }
        else if (rLower.includes('finance') || rLower === 'fm') { def1Look = 'Finance Manager'; }
        else if ((rLower.includes('sales') && rLower.includes('manager')) || rLower === 'sm') { def1Look = 'Sales Manager'; }
        else if (rLower.includes('sales') || rLower.includes('rep') || rLower === 'sr') { def1Look = 'Sales Representative'; }
        else if (rLower.includes('admin')) { def1Look = 'Admin'; }
        else if (rLower.includes('user')) { def1Look = 'User'; }

        div.innerHTML = `
            <div style="margin-bottom:4px; font-weight:700; font-size:11px; color:#4c1d95;">Parsed Role: "${role || '(Default / Empty)'}"</div>
            <div>
                <label style="color:#16a34a; font-size:10px; font-weight:700;">🟢 1LOOK ROLE</label>
                <select class="map-select-1look" data-original="${role}">
                    ${CONFIG.roles1Look.map(r => `<option value="${r}" ${r === def1Look ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
            </div>
        `;
        list.appendChild(div);
    });
}

function applyConfigAndStart() {
    const map1Look = {};
    document.querySelectorAll('.map-select-1look').forEach(s => map1Look[s.dataset.original] = s.value);

    state.users.forEach(u => {
        const origKey = u.originalRole || u.role || "";
        u.role1Look = map1Look[origKey] || map1Look[""] || 'Sales Representative';
    });

    state.status = 'active';
    saveState();
    render();
}

function renderQueue() {
    const listContainer = document.getElementById('full-user-list');
    if (!listContainer) return;

    const total = state.users.length;
    const completedCount = state.users.filter(u => u.completed).length;
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    const progressText = document.getElementById('progress-text');
    if (progressText) progressText.innerText = `Progress: ${completedCount} / ${total} Completed`;

    const progressPercent = document.getElementById('progress-percent');
    if (progressPercent) progressPercent.innerText = `${percent}%`;

    const progressFill = document.getElementById('progress-fill');
    if (progressFill) progressFill.style.width = `${percent}%`;

    const listCount = document.getElementById('user-list-count');
    if (listCount) listCount.innerText = `${completedCount}/${total} Completed`;

    if (total === 0) {
        listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">No users in batch.</div>`;
        return;
    }

    listContainer.innerHTML = state.users.map((u, i) => {
        const isCompleted = !!u.completed;

        let cardClass = "user-card-item";
        if (isCompleted) cardClass += " completed-user";

        return `
            <div class="${cardClass}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                    <span style="font-size:14px; font-weight:700; color:#1e1b4b;">${i + 1}. ${u.firstName} ${u.lastName}</span>
                    <button type="button" class="btn-check-toggle ${isCompleted ? 'completed' : ''}" onclick="toggleUserComplete(${i})">
                        ${isCompleted ? '✓ Created' : '☐ Mark Done'}
                    </button>
                </div>
                <div style="font-size:12px; color:#475569; display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                    <div>📧 ${u.email || '-'}</div>
                    <div>📱 ${u.phone || '-'}</div>
                    <div style="grid-column: span 2; color:#16a34a; font-weight:700;">🟢 Role: ${u.role1Look || 'Sales Representative'}</div>
                    ${u.branch ? `<div style="grid-column: span 2; color:#6d28d9; font-weight:600;">🏢 Location: ${u.branch}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

window.toggleUserComplete = function(idx) {
    if (state.users[idx]) {
        state.users[idx].completed = !state.users[idx].completed;
        saveState();
        renderQueue();
    }
};

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
        t.style.background = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#7c3aed');
        t.style.opacity = '1';
        setTimeout(() => { t.style.opacity = '0'; }, 3000);
    }
}
