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
});

function setupListeners() {
    document.querySelectorAll('.btn-global-reset').forEach(btn => {
        btn.onclick = () => {
            if (state.users.length === 0 || confirm("Reset app and clear batch data?")) {
                resetEverything();
            }
        };
    });

    document.getElementById('sys-btn-both').onclick = () => selectTargetSystem('both');
    document.getElementById('sys-btn-1look').onclick = () => selectTargetSystem('1look');
    document.getElementById('sys-btn-estimator').onclick = () => selectTargetSystem('estimator');

    document.getElementById('btn-parse').onclick = parseAndInit;
    document.getElementById('btn-back-parser').onclick = () => {
        state.status = 'wizard';
        saveState();
        render();
    };
    document.getElementById('btn-apply-config').onclick = applyConfigAndStart;
    document.getElementById('btn-skip').onclick = nextUser;

    const copyTsvBtn = document.getElementById('btn-copy-all-tsv');
    if (copyTsvBtn) copyTsvBtn.onclick = copyUserTSV;

    const copySummaryBtn = document.getElementById('btn-copy-summary');
    if (copySummaryBtn) copySummaryBtn.onclick = copyUserSummaryBlock;

    document.getElementById('btn-reset').onclick = () => {
        if (confirm("Clear batch progress and start fresh?")) {
            resetEverything();
        }
    };

    // Drag & Drop File Handlers
    const dropZone = document.getElementById('drop-zone');
    const dropOverlay = document.getElementById('drop-overlay');
    const fileInput = document.getElementById('file-upload-input');

    if (dropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dropOverlay) dropOverlay.style.display = 'flex';
                dropZone.style.borderColor = '#7c3aed';
                dropZone.style.background = '#f3e8ff';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dropOverlay) dropOverlay.style.display = 'none';
                dropZone.style.borderColor = '#c4b5fd';
                dropZone.style.background = '#faf5ff';
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files.length > 0) {
                handleFileDrop(files[0]);
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
        try {
            state = JSON.parse(saved);
        } catch (e) { }
    }
}

function resetEverything() {
    state = {
        users: [],
        currentIndex: 0,
        adminUnit: "",
        sendWelcome: true,
        targetSystem: "both",
        status: "wizard"
    };
    localStorage.removeItem('tablet_app_state');
    localStorage.removeItem('tablet_current_user');
    if (document.getElementById('wiz-data')) document.getElementById('wiz-data').value = "";
    render();
}

function selectTargetSystem(sys) {
    state.targetSystem = sys;
    updateTargetSystemUI();
    saveState();
}

function updateTargetSystemUI() {
    const sys = state.targetSystem || 'both';
    const btnBoth = document.getElementById('sys-btn-both');
    const btn1Look = document.getElementById('sys-btn-1look');
    const btnEstimator = document.getElementById('sys-btn-estimator');

    if (btnBoth) {
        btnBoth.style.background = sys === 'both' ? '#7c3aed' : '#f3e8ff';
        btnBoth.style.color = sys === 'both' ? '#ffffff' : '#6d28d9';
    }
    if (btn1Look) {
        btn1Look.style.background = sys === '1look' ? '#16a34a' : '#f3e8ff';
        btn1Look.style.color = sys === '1look' ? '#ffffff' : '#6d28d9';
    }
    if (btnEstimator) {
        btnEstimator.style.background = sys === 'estimator' ? '#ea580c' : '#f3e8ff';
        btnEstimator.style.color = sys === 'estimator' ? '#ffffff' : '#6d28d9';
    }

    const sec1Look = document.getElementById('sec-1look-options');
    if (sec1Look) {
        if (sys === 'estimator') sec1Look.classList.add('hidden');
        else sec1Look.classList.remove('hidden');
    }
}

function render() {
    Object.values(screens).forEach(el => {
        if (el) el.classList.add('hidden');
    });

    updateTargetSystemUI();

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
    if (raw.includes('\t')) return parseExcelTsvData(raw);
    return parseTextOrEmailData(raw);
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

function parseExcelTsvData(raw) {
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return [];
    const firstLineCols = lines[0].split('\t').map(c => c.trim().toLowerCase());
    const mapping = { fullName: -1, email: -1, phone: -1, role: -1, branch: -1, managerName: -1, managerEmail: -1 };
    let hasHeaders = false;

    for (const key in CONFIG.keywords) {
        const idx = firstLineCols.findIndex(col => CONFIG.keywords[key].some(k => col.includes(k) || col === k));
        if (idx !== -1) { mapping[key] = idx; hasHeaders = true; }
    }

    const branchIndices = [];
    firstLineCols.forEach((col, idx) => {
        if (col.includes('manager')) return;
        if (CONFIG.keywords.branch.some(w => col.includes(w) || col === w)) branchIndices.push(idx);
    });

    const dataRows = hasHeaders ? lines.slice(1) : lines;
    return dataRows.map(line => {
        const cols = line.split('\t');
        const val = (k) => cols[mapping[k]]?.trim() || "";
        const rawName = val('fullName').replace(/[^a-zA-Z\s\-]/g, '').trim();
        const nameParts = rawName.split(' ').filter(p => p);
        let firstName = nameParts[0] || "";
        let lastName = nameParts.length > 1 ? nameParts.pop() : "";

        let rawPhone = "";
        if (mapping.phone > -1) {
            const candidate = val('phone');
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
            email: val('email'),
            phone: cleanPhone(rawPhone),
            role: val('role'),
            branch: branchIndices.length > 0 ? branchIndices.map(i => cols[i]?.trim()).filter(x => x).join(', ') : val('branch'),
            managerName: mapping.managerName > -1 ? cols[mapping.managerName]?.trim() : "",
            managerEmail: mapping.managerEmail > -1 ? cols[mapping.managerEmail]?.trim() : "",
            originalRole: val('role')
        };
    }).filter(u => u.firstName || u.email);
}

function parseTextOrEmailData(text) {
    let blocks = text.split(/\n\s*\n|\n(?=-{3,}|\={3,})\n/).map(b => b.trim()).filter(b => b);
    const users = [];

    for (const block of blocks) {
        const user = { firstName: "", lastName: "", email: "", phone: "", role: "", managerName: "", managerEmail: "", branch: "", originalRole: "" };
        const lines = block.split(/\r?\n/);
        let rawPhone = "";

        for (const line of lines) {
            const kvMatch = line.match(/^\s*([^:\-=]+)[:\-=]\s*(.+)$/);
            if (kvMatch) {
                const key = kvMatch[1].trim().toLowerCase();
                const val = kvMatch[2].trim();
                if (key.match(/first\s*name|primer\s*nombre/)) user.firstName = val;
                else if (key.match(/last\s*name|apellido/)) user.lastName = val;
                else if (key.match(/full\s*name|^name$|^nombre$/)) {
                    const parts = val.split(' ').filter(p => p);
                    user.firstName = parts[0] || val;
                    user.lastName = parts.length > 1 ? parts.slice(1).join(' ') : "";
                }
                else if (key.match(/email|mail|correo/)) user.email = val;
                else if (key.match(/phone|mobile|cell|tel[ée]fono/)) {
                    if (val.replace(/\D/g, '').length >= 7) rawPhone = val;
                }
                else if (key.match(/role|position|job|title/)) { user.role = val; user.originalRole = val; }
                else if (key.match(/branch|location|office|site/)) user.branch = val;
            } else {
                const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                if (emailMatch && !user.email) user.email = emailMatch[0];
                const phoneMatch = line.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/);
                if (phoneMatch && !rawPhone) rawPhone = phoneMatch[0];
            }
        }
        user.phone = cleanPhone(rawPhone);
        if (user.firstName || user.email) users.push(user);
    }
    return users;
}

function renderConfigUI() {
    updateTargetSystemUI();
    const summaryHeader = document.getElementById('summary-header');
    if (summaryHeader) summaryHeader.innerText = `PARSED USERS (${state.users.length})`;

    const previewBox = document.getElementById('parsed-users-preview');
    if (previewBox) {
        previewBox.innerHTML = state.users.map((u, i) => `
            <div style="background:#faf5ff; border:1px solid #e9d5ff; border-radius:8px; padding:8px 10px; margin-bottom:6px;">
                <b style="color:#2e1065;">${i + 1}. ${u.firstName} ${u.lastName}</b>
                <div style="color:#6b7280; font-size:11px;">📧 ${u.email || 'No email'} | 📱 ${u.phone || 'No phone'}</div>
                <div style="color:#6d28d9; font-weight:600; font-size:11px;">💼 Role: ${u.role || 'Not specified'} | 🏢 Branch: ${u.branch || 'None'}</div>
            </div>
        `).join('');
    }

    const list = document.getElementById('mapping-list');
    if (!list) return;
    list.innerHTML = "";
    const sys = state.targetSystem || 'both';
    const rolesFound = [...new Set(state.users.map(u => u.role))];
    if (rolesFound.length === 0) rolesFound[0] = "";

    rolesFound.forEach(role => {
        const div = document.createElement('div');
        div.style.cssText = "margin-bottom:10px; padding:10px; background:#faf5ff; border:1px solid #e9d5ff; border-radius:10px;";
        const rLower = (role || "").toLowerCase();
        let def1Look = 'Sales Representative';
        let defEstimator = 'Salesrep';

        if (rLower.includes('install')) { def1Look = 'Installer'; defEstimator = 'User'; }
        else if (rLower.includes('finance') || rLower === 'fm') { def1Look = 'Finance Manager'; defEstimator = 'Org Admin'; }
        else if ((rLower.includes('sales') && rLower.includes('manager')) || rLower === 'sm') { def1Look = 'Sales Manager'; defEstimator = 'sales_manager'; }
        else if (rLower.includes('sales') || rLower.includes('rep') || rLower === 'sr') { def1Look = 'Sales Representative'; defEstimator = 'Salesrep'; }
        else if (rLower.includes('admin')) { def1Look = 'Admin'; defEstimator = 'Admin'; }
        else if (rLower.includes('user')) { def1Look = 'User'; defEstimator = 'User'; }

        let roleHTML = `<div style="margin-bottom:6px; font-weight:bold; font-size:12px; color:#4c1d95;">Parsed Role: "${role || '(Default)'}"</div>`;
        if (sys === 'both' || sys === '1look') {
            roleHTML += `<div style="margin-bottom:6px;"><label style="color:#16a34a;">🟢 1LOOK ROLE</label><select class="map-select-1look" data-original="${role}">${CONFIG.roles1Look.map(r => `<option value="${r}" ${r === def1Look ? 'selected' : ''}>${r}</option>`).join('')}</select></div>`;
        }
        if (sys === 'both' || sys === 'estimator') {
            roleHTML += `<div><label style="color:#ea580c;">🟧 ESTIMATOR ROLE</label><select class="map-select-estimator" data-original="${role}">${CONFIG.rolesEstimator.map(r => `<option value="${r}" ${r === defEstimator ? 'selected' : ''}>${r}</option>`).join('')}</select></div>`;
        }
        div.innerHTML = roleHTML;
        list.appendChild(div);
    });
}

function applyConfigAndStart() {
    state.adminUnit = document.getElementById('wiz-admin')?.value || "";
    const map1Look = {};
    const mapEstimator = {};

    document.querySelectorAll('.map-select-1look').forEach(s => map1Look[s.dataset.original] = s.value);
    document.querySelectorAll('.map-select-estimator').forEach(s => mapEstimator[s.dataset.original] = s.value);

    state.users.forEach(u => {
        const origKey = u.originalRole || u.role || "";
        u.role1Look = map1Look[origKey] || 'Sales Representative';
        u.roleEstimator = mapEstimator[origKey] || 'Salesrep';
    });

    state.status = 'active';
    saveState();
    render();
}

function renderQueue() {
    if (state.currentIndex >= state.users.length) {
        document.getElementById('ui-queue').innerHTML = `<div style="text-align:center; padding:30px; color:#16a34a; font-weight:bold; font-size:18px; background:#f0fdf4; border-radius:14px;">✅ BATCH COMPLETE</div>`;
        return;
    }

    const user = state.users[state.currentIndex];
    saveState();

    const copyBox = document.getElementById('quick-copy-chips');
    if (copyBox) {
        copyBox.innerHTML = '';
        const fields = [
            { label: 'First', val: user.firstName },
            { label: 'Last', val: user.lastName },
            { label: 'Full Name', val: `${user.firstName} ${user.lastName}`.trim() },
            { label: 'Email', val: user.email },
            { label: 'Phone', val: user.phone },
            { label: 'Estimator Role', val: user.roleEstimator || user.role },
            { label: '1Look Role', val: user.role1Look || user.role },
            { label: 'Branch', val: user.branch },
            { label: 'Manager', val: user.managerName || user.managerEmail }
        ].filter(f => f.val);

        fields.forEach(f => {
            const chip = document.createElement('span');
            chip.className = 'copy-chip';
            chip.innerHTML = `📋 <span style="color:#6b7280; margin-right:4px;">${f.label}:</span> <b>${f.val}</b>`;
            chip.onclick = () => copyText(f.val, f.label);
            copyBox.appendChild(chip);
        });
    }

    const makeClickCopy = (id, val, label) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerText = val || '-';
            if (val && val !== '-') {
                el.style.cursor = 'pointer';
                el.onclick = () => copyText(val, label);
            }
        }
    };

    makeClickCopy('c-name', `${user.firstName} ${user.lastName}`.trim(), 'Full Name');
    makeClickCopy('c-email', user.email, 'Email');
    makeClickCopy('c-phone', user.phone, 'Phone');
    makeClickCopy('c-role-1look', user.role1Look || 'Sales Representative', '1Look Role');
    makeClickCopy('c-role-estimator', user.roleEstimator || 'Salesrep', 'Estimator Role');
    makeClickCopy('c-manager', user.managerName || user.managerEmail, 'Manager');
    makeClickCopy('c-branch', user.branch, 'Branch');
    makeClickCopy('c-admin', state.adminUnit, 'Admin Unit');

    document.getElementById('queue-counter').innerText = `User ${state.currentIndex + 1} of ${state.users.length}`;
}

function copyText(text, label = "") {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showToast(`📋 Copied ${label}: "${text}"`, "success");
    }).catch(e => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(`📋 Copied ${label}: "${text}"`, "success");
    });
}

function copyUserTSV() {
    if (state.currentIndex >= state.users.length) return;
    const u = state.users[state.currentIndex];
    const row = [u.firstName, u.lastName, u.email, u.phone, u.roleEstimator || u.role, u.branch].join('\t');
    copyText(row, "TSV Row");
}

function copyUserSummaryBlock() {
    if (state.currentIndex >= state.users.length) return;
    const u = state.users[state.currentIndex];
    const block = `First Name: ${u.firstName}\nLast Name: ${u.lastName}\nEmail: ${u.email}\nPhone: ${u.phone}\nEstimator Role: ${u.roleEstimator || u.role}\n1Look Role: ${u.role1Look || u.role}\nBranch: ${u.branch || 'None'}`;
    copyText(block, "Summary Block");
}

function nextUser() {
    state.currentIndex++;
    saveState();
    render();
}

function showToast(msg, type = 'info') {
    let t = document.getElementById('panel-toast');
    if (t) {
        t.innerText = msg;
        t.style.background = type === 'error' ? '#dc2626' : (type === 'success' ? '#16a34a' : '#6d28d9');
        t.style.opacity = '1';
        setTimeout(() => { t.style.opacity = '0'; }, 3000);
    }
}
