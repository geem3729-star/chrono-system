import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB3YOrV6h6gYkPa6O1SaSJXbAemmfMu3Lg",
    authDomain: "chronos-system-e3d4c.firebaseapp.com",
    databaseURL: "https://chronos-system-e3d4c-default-rtdb.firebaseio.com",
    projectId: "chronos-system-e3d4c",
    storageBucket: "chronos-system-e3d4c.firebasestorage.app",
    messagingSenderId: "314230379065",
    appId: "1:314230379065:web:22827183f5e4cb7f7173e8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let events = [];
let modules = [];
let allUsers = [];

// ⚠️ CHANGE THIS TO YOUR EMAIL
const ADMIN_EMAIL = "keketsokagiso25@gmail.com";

// ===============================
// VIEW SWITCHER
// ===============================
window.switchView = function(viewName, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const view = document.getElementById('view-' + viewName);
    if (view) view.classList.add('active');
    if (el) el.classList.add('active');

    if (viewName === 'modules') renderModulesList();
    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'countdowns') { renderFullCountdowns(); populateCdDropdown(); }
    if (viewName === 'examelig') renderExamEligFull();
if (viewName === 'admin') renderAdminPanel();
};


// ===============================
// AUTH
// ===============================
document.getElementById('googleSignInBtn').addEventListener('click', async () => {
    try { await signInWithPopup(auth, provider); }
    catch (e) { alert('Sign-in failed: ' + e.message); }
});

window.handleLogout = async function() {
    if (confirm('Logout?')) await signOut(auth);
};


onAuthStateChanged(auth, async (user) => {
    const ls = document.getElementById('loadingScreen');
    if (ls) ls.style.display = 'none';
    if (user) {
        currentUser = user;
        const name = user.displayName || user.email.split('@')[0];

        // ============ LOG THIS LOGIN ============
        try {
            const userRef = ref(db, `allUsers/${user.uid}`);
            const existing = await get(userRef);
            const now = new Date().toISOString();
            if (existing.exists()) {
                const data = existing.val();
                await set(userRef, {
                    ...data,
                    lastSeen: now,
                    loginCount: (data.loginCount || 0) + 1
                });
            } else {
                await set(userRef, {
                    uid: user.uid,
                    name: name,
                    email: user.email,
                    photo: user.photoURL || '',
                    firstSeen: now,
                    lastSeen: now,
                    loginCount: 1
                });
            }
        } catch (e) { console.error('Log user error:', e); }

        // Show Admin link if this is YOU
        if (user.email === ADMIN_EMAIL) {
            const adminBtn = document.getElementById('adminNavBtn');
            if (adminBtn) adminBtn.style.display = 'flex';
        }
        document.getElementById('userName').textContent = name;
        document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
        document.getElementById('greeting').textContent = `Good evening, ${name}! 👋`;
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('app').style.display = 'grid';
        await loadData();
        renderDashboard();
        setupModuleForm();
    } else {
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
});

// ===============================
// LOAD / SAVE DATA
// ===============================
async function loadData() {
    if (!currentUser) return;
    try {
        const dbRef = ref(db);
        const e = await get(child(dbRef, `users/${currentUser.uid}/events`));
        events = e.exists() ? (Array.isArray(e.val()) ? e.val().filter(x=>x) : Object.values(e.val()).filter(x=>x)) : [];
        const m = await get(child(dbRef, `users/${currentUser.uid}/modules`));
        modules = m.exists() ? (Array.isArray(m.val()) ? m.val().filter(x=>x) : Object.values(m.val()).filter(x=>x)) : [];

        // Load all users (only if admin)
        if (currentUser.email === ADMIN_EMAIL) {
            const u = await get(child(dbRef, `allUsers`));
            allUsers = u.exists() ? Object.values(u.val()).filter(x => x) : [];
        }
    } catch (err) { console.error(err); }
}

async function saveModules() {
    if (!currentUser) return;
    try { await set(ref(db, `users/${currentUser.uid}/modules`), modules); }
    catch (e) { alert('Could not save module.'); }
}

async function saveEvents() {
    if (!currentUser) return;
    try { await set(ref(db, `users/${currentUser.uid}/events`), events); }
    catch (e) { alert('Could not save.'); }
}

// ===============================
// MODULE FORM
// ===============================
function setupModuleForm() {
    const preset = document.getElementById('presetModule');
    if (!preset) return;
    const codeInput = document.getElementById('moduleCode');
    const nameInput = document.getElementById('moduleName');
    const slider = document.getElementById('moduleMarkSlider');
    const num = document.getElementById('moduleMark');
    const disp = document.getElementById('markDisplay');

    preset.addEventListener('change', () => {
        const val = preset.value;
        if (val === '' || val === 'CUSTOM') { codeInput.value=''; nameInput.value=''; return; }
        const [code, name] = val.split('|');
        codeInput.value = code; nameInput.value = name;
    });
    slider.addEventListener('input', () => { num.value = slider.value; disp.textContent = slider.value; });
    num.addEventListener('input', () => {
        let v = Math.max(0, Math.min(100, Number(num.value)||0));
        slider.value = v; disp.textContent = v;
    });
}

document.getElementById('addModuleBtn')?.addEventListener('click', async () => {
    const code = document.getElementById('moduleCode').value.trim().toUpperCase();
    const name = document.getElementById('moduleName').value.trim();
    const mark = Number(document.getElementById('moduleMark').value) || 0;
    const color = document.getElementById('moduleColor').value;
    if (!code) return alert('Enter a module code');
    if (modules.find(m => m.code === code)) return alert('Module already exists');
    modules.push({ id: Date.now(), code, name: name || code, currentMark: mark, color });
    await saveModules();
    document.getElementById('presetModule').value = '';
    document.getElementById('moduleCode').value = '';
    document.getElementById('moduleName').value = '';
    document.getElementById('moduleMarkSlider').value = 50;
    document.getElementById('moduleMark').value = 50;
    document.getElementById('markDisplay').textContent = '50';
    renderModulesList(); renderDashboard();
    alert('Module added!');
});

window.deleteModule = async function(id) {
    if (!confirm('Delete this module?')) return;
    modules = modules.filter(m => m.id !== id);
    await saveModules();
    renderModulesList(); renderDashboard();
};

// ===============================
// TIME HELPER
// ===============================
function getTimeRemaining(iso) {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return { days:0, hours:0, minutes:0, seconds:0, isOverdue:true };
    const s = Math.floor(diff/1000);
    return { days: Math.floor(s/86400), hours: Math.floor((s%86400)/3600), minutes: Math.floor((s%3600)/60), seconds: s%60, isOverdue:false };
}

// ===============================
// RENDER DASHBOARD
// ===============================
function renderDashboard() {
    renderModules(); renderUpcoming(); renderAssessTable(); renderExamElig();
}

function renderModules() {
    const row = document.getElementById('modulesRow');
    if (!row) return;
    if (!modules.length) {
        row.innerHTML = `<div class="module-card" style="grid-column:1/-1;"><p style="color:#888;padding:24px;text-align:center;">No modules yet. Go to Modules to add them.</p></div>
            <div class="overall-card"><div class="trophy">🏆</div><div class="overall-pct">0%</div><div class="overall-label">Overall Average</div><div class="overall-tagline">Add modules to begin</div></div>`;
        return;
    }
    let html = ''; let total = 0;
    modules.forEach(m => {
        const mark = m.currentMark || 0; total += mark;
        const circ = 2 * Math.PI * 36;
        const off = circ - (Math.min(100, mark)/100) * circ;
        const color = m.color || '#ff8c00';
        let bc = 'eligible', bt = '✅ Eligible';
        if (mark < 50) { bc='atrisk'; bt='⚠️ At Risk'; }
        else if (mark < 60) { bc='warning'; bt='🟡 Warning'; }
      html += `<div class="module-card" style="--module-color:${color};"><div class="module-header"><div><span class="module-name">${m.code}</span><span class="module-full">${m.name}</span></div></div>
            <div class="module-ring"><svg viewBox="0 0 90 90"><circle class="ring-bg" cx="45" cy="45" r="36"/><circle class="ring-progress" cx="45" cy="45" r="36" stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${off}"/></svg>
            <div class="center"><div class="pct">${mark}%</div><div class="pct-label">CURRENT</div></div></div>
            <div class="module-mark">${mark} / 100</div><div class="module-badge ${bc}">${bt}</div></div>`;
    });
    const avg = Math.round(total / modules.length);
    let tag = avg >= 75 ? 'Excellent!' : avg >= 60 ? 'Good Progress!' : avg >= 50 ? 'Keep Pushing!' : 'Needs Focus!';
    html += `<div class="overall-card"><div class="trophy">🏆</div><div class="overall-pct">${avg}%</div><div class="overall-label">Overall Average</div><div class="overall-tagline">${tag}</div></div>`;
    row.innerHTML = html;
}

function renderModulesList() {
    const list = document.getElementById('modulesList');
    if (!list) return;
    if (!modules.length) { list.innerHTML = '<p style="color:#888;padding:20px;grid-column:1/-1;">No modules yet.</p>'; return; }
    let html = '';
    modules.forEach(m => {
        const mark = m.currentMark || 0;
        const circ = 2 * Math.PI * 36;
        const off = circ - (Math.min(100, mark)/100) * circ;
        const color = m.color || '#ff8c00';
        html += `<div class="module-card" style="position:relative;">
            <button onclick="deleteModule(${m.id})" style="position:absolute;top:12px;right:12px;width:28px;height:28px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:50%;color:#f87171;cursor:pointer;">✕</button>
            <div class="module-header"><div><span class="module-name">${m.code}</span><span class="module-full">${m.name}</span></div></div>
            <div class="module-ring"><svg viewBox="0 0 90 90"><circle class="ring-bg" cx="45" cy="45" r="36"/><circle class="ring-progress" cx="45" cy="45" r="36" stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${off}"/></svg>
            <div class="center"><div class="pct">${mark}%</div><div class="pct-label">CURRENT</div></div></div>
            <div class="module-mark">${mark} / 100</div></div>`;
    });
    list.innerHTML = html;
}

function renderUpcoming() {
    const c = document.getElementById('upcomingCountdowns');
    if (!c) return;
    const now = Date.now();
    const up = events.filter(e => new Date(e.deadline).getTime() > now).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
    if (!up.length) { c.innerHTML = '<p style="color:#888;">No upcoming deadlines</p>'; return; }
    let html = '';
    up.forEach(e => {
        const r = getTimeRemaining(e.deadline);
        const d = new Date(e.deadline);
        const color = e.color || '#ff8c00';
        html += `<div class="countdown-mini" style="--card-color:${color};">
            <div class="cm-header">
                <span class="cm-title">${e.title||'Deadline'}</span>
                <span class="cm-date">${d.toLocaleDateString('en-US',{day:'2-digit',month:'short',year:'numeric'})} · ${d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false})}</span>
            </div>
            <div class="cm-grid">
                <div class="cm-item"><span class="cm-num">${String(r.days).padStart(2,'0')}</span><span class="cm-lbl">DAYS</span></div>
                <div class="cm-item"><span class="cm-num">${String(r.hours).padStart(2,'0')}</span><span class="cm-lbl">HRS</span></div>
                <div class="cm-item"><span class="cm-num">${String(r.minutes).padStart(2,'0')}</span><span class="cm-lbl">MIN</span></div>
                <div class="cm-item"><span class="cm-num">${String(r.seconds).padStart(2,'0')}</span><span class="cm-lbl">SEC</span></div>
            </div>
        </div>`;
    });
    c.innerHTML = html;
}

function renderAssessTable() {
    const b = document.getElementById('assessBody');
    if (!b) return;
    const recent = [...events].sort((a,b)=>new Date(b.deadline)-new Date(a.deadline)).slice(0,5);
    if (!recent.length) { b.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:20px;">No assessments yet</td></tr>'; return; }
    let html = '';
    recent.forEach(e => {
        const d = new Date(e.deadline);
        const isPast = d.getTime() < Date.now();
        html += `<tr>
            <td><div class="assess-name">${e.title||'Assessment'}</div><div class="assess-module">${e.module||'No module'}</div></td>
            <td>${e.weight||0}%</td>
            <td>${d.toLocaleDateString('en-US',{day:'2-digit',month:'short',year:'numeric'})}</td>
            <td>${e.currentMark||'-'} / 100</td>
            <td class="${isPast?'status-ok':'status-pending'}">${isPast?'✅ Completed':'⏳ Upcoming'}</td>
        </tr>`;
    });
    b.innerHTML = html;
}

function renderExamElig() {
    const list = document.getElementById('examEligList');
    if (!list) return;
    if (!modules.length) { list.innerHTML = '<p style="color:#888;font-size:0.9rem;">Add modules to check</p>'; return; }
    let html = '';
    modules.forEach(m => {
        const ok = (m.currentMark||0) >= 50;
        html += `<div class="eligibility-item"><div><div class="elig-name">${m.code}</div><div class="elig-note">${ok?'Qualifies to write exam':'Need 50% to qualify'}</div></div>
            <div class="elig-status ${ok?'eligible':'notyet'}">${ok?'✅ Eligible':'⚠️ Not Yet'}</div></div>`;
    });
    list.innerHTML = html;
}

function renderExamEligFull() {
    const list = document.getElementById('examEligListFull');
    if (!list) return;
    if (!modules.length) { list.innerHTML = '<p style="color:#888;padding:20px;">Add modules first.</p>'; return; }
    let html = '';
    modules.forEach(m => {
        const ok = (m.currentMark||0) >= 50;
        html += `<div class="eligibility-item"><div><div class="elig-name">${m.code} — ${m.name}</div><div class="elig-note">${ok?'Qualifies to write exam':'Need 50% to qualify'} (${m.currentMark||0}%)</div></div>
            <div class="elig-status ${ok?'eligible':'notyet'}">${ok?'✅ Eligible':'⚠️ Not Yet'}</div></div>`;
    });
    list.innerHTML = html;
}

// ===============================
// FULL COUNTDOWNS PAGE
// ===============================
function renderFullCountdowns() {
    const list = document.getElementById('fullCountdownsList');
    const hist = document.getElementById('historyList');
    if (!list) return;
    const now = Date.now();
    const up = events.filter(e => new Date(e.deadline).getTime() > now).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
    const past = events.filter(e => new Date(e.deadline).getTime() <= now).sort((a,b)=>new Date(b.deadline)-new Date(a.deadline));

    if (!up.length) { list.innerHTML = '<p style="color:#888;padding:20px;grid-column:1/-1;">No active countdowns.</p>'; }
    else { list.innerHTML = up.map(e => buildCard(e, false)).join(''); }

    if (!hist) return;
    if (!past.length) { hist.innerHTML = '<p style="color:#888;padding:20px;">No past deadlines.</p>'; }
    else {
        hist.innerHTML = past.map(e => {
            const d = new Date(e.deadline);
            return `<div style="background:#1a1a1a;border:1px solid #262626;border-left:3px solid ${e.color||'#888'};border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;opacity:0.7;">
                <div><div style="color:#ccc;font-weight:600;">✅ ${e.title}</div><div style="color:#666;font-size:0.72rem;">${e.module||'General'} · ${d.toLocaleDateString()}</div></div>
                <button onclick="deleteEvent(${e.id})" style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);color:#f87171;width:28px;height:28px;border-radius:50%;cursor:pointer;">✕</button></div>`;
        }).join('');
    }
}

// ===============================
// BUILD COUNTDOWN CARD
// ===============================
function buildCard(e, isPast) {
    const r = getTimeRemaining(e.deadline);
    const d = new Date(e.deadline);
    const circ = 2 * Math.PI * 34;
    const pct = r.isOverdue ? 0 : Math.min(100, ((d.getTime()-Date.now())/1000/(90*86400))*100);
    const off = circ - (pct/100) * circ;

    const color = e.color || '#ff8c00';
    let blinkClass = '';
    if (!isPast) {
        if (r.days < 1) blinkClass = 'cc-urgent';
        else if (r.days < 3) blinkClass = 'cc-warning';
        else if (r.days < 7) blinkClass = 'cc-soon';
    }

    const days = String(r.days).padStart(2, '0');
    const hours = String(r.hours).padStart(2, '0');
    const mins = String(r.minutes).padStart(2, '0');
    const secs = String(r.seconds).padStart(2, '0');
    const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const title = e.title || 'Deadline';
    const module = e.module || 'General';
    const dayLabel = r.isOverdue ? 'DONE' : 'DAYS';
    const dayNum = r.isOverdue ? '✓' : days;
    const liveDot = isPast ? '' : '<div class="cc-live-dot"></div>';
    const opacity = isPast ? 0.5 : 1;
    return '<div class="countdown-card ' + blinkClass + '" style="opacity:' + opacity + ';position:relative;--card-color:' + color + ';">' +
        '<button class="cc-delete" data-id="' + e.id + '">✕</button>' +
        '<div class="cc-header">' +
            '<div style="padding-right:40px;">' +
                '<div class="cc-title">' + title + '</div>' +
            '</div>' +
            liveDot +
        '</div>' +
        '<div class="cc-body">' +
            '<div class="cc-ring" style="filter:drop-shadow(0 0 8px ' + color + '40);">' +
                '<svg viewBox="0 0 80 80">' +
                    '<circle class="cc-ring-bg" cx="40" cy="40" r="34"/>' +
                    '<circle class="cc-ring-progress" cx="40" cy="40" r="34" stroke="' + color + '" stroke-dasharray="' + circ + '" stroke-dashoffset="' + off + '"/>' +
                '</svg>' +
                '<div class="cc-ring-center">' +
                    '<div class="cc-ring-num">' + dayNum + '</div>' +
                    '<div class="cc-ring-lbl">' + dayLabel + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="cc-numbers">' +
                '<div class="cc-num-item"><div class="cc-num">' + hours + '</div><div class="cc-num-lbl">HRS</div></div>' +
                '<div class="cc-num-item"><div class="cc-num">' + mins + '</div><div class="cc-num-lbl">MIN</div></div>' +
                '<div class="cc-num-item"><div class="cc-num">' + secs + '</div><div class="cc-num-lbl">SEC</div></div>' +
            '</div>' +
        '</div>' +
        '<div class="cc-footer">' + module + ' · ' + dateStr + ' at ' + timeStr + '</div>' +
    '</div>';
}

// ===============================
// HISTORY TOGGLE
// ===============================
window.toggleHistory = function() {
    const h = document.getElementById('historyList');
    const a = document.getElementById('historyArrow');
    if (!h) return;
    if (h.style.display === 'none' || h.style.display === '') { h.style.display = 'flex'; a.textContent = '▲'; }
    else { h.style.display = 'none'; a.textContent = '▼'; }
};

// ===============================
// COUNTDOWN DROPDOWN
// ===============================
function populateCdDropdown() {
    const s = document.getElementById('cdModule');
    if (!s) return;
    s.innerHTML = '<option value="">-- Select --</option>';
    modules.forEach(m => {
        const o = document.createElement('option');
        o.value = m.code; o.textContent = m.code + ' — ' + m.name;
        s.appendChild(o);
    });
}

// ===============================
// ADD COUNTDOWN
// ===============================
document.getElementById('addCountdownBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('cdTitle').value.trim();
    const module = document.getElementById('cdModule').value || 'General';
    const date = document.getElementById('cdDate').value;
    const time = document.getElementById('cdTime').value;
    const weight = Number(document.getElementById('cdWeight').value) || 0;
    const mark = Number(document.getElementById('cdMark').value) || 0;
    const color = document.getElementById('cdColor').value;
    const consequence = document.getElementById('cdConsequence').value.trim();

    if (!title) return alert('Enter a title');
    if (!date || !time) return alert('Pick date and time');

    events.push({ id: Date.now(), title, module, deadline: date + 'T' + time, weight, currentMark: mark, color, consequence: consequence || 'None' });
    await saveEvents();
    document.getElementById('cdTitle').value = '';
    document.getElementById('cdModule').value = '';
    document.getElementById('cdDate').value = '';
    document.getElementById('cdTime').value = '';
    document.getElementById('cdWeight').value = 0;
    document.getElementById('cdMark').value = 0;
    document.getElementById('cdColor').value = '#ff8c00';
    document.getElementById('cdConsequence').value = '';
    renderFullCountdowns(); renderUpcoming(); renderDashboard(); renderAssessTable();
    alert('Countdown added!');
});

// ===============================
// DELETE EVENT
// ===============================
window.deleteEvent = async function(id) {
    if (!confirm('Delete this deadline?')) return;
    events = events.filter(e => e.id !== id);
    await saveEvents();
    renderFullCountdowns(); renderDashboard(); renderUpcoming(); renderAssessTable();
};

// Delete button handler for countdown cards
document.addEventListener('click', function(ev) {
    const btn = ev.target.closest('.cc-delete');
    if (btn) {
        ev.stopPropagation();
        const id = Number(btn.dataset.id);
        if (id) deleteEvent(id);
    }
});

// ===============================
// LIVE UPDATE
// ===============================
setInterval(() => {
    if (!currentUser) return;
    renderUpcoming();
    const cd = document.getElementById('view-countdowns');
    if (cd && cd.classList.contains('active')) renderFullCountdowns();
}, 1000);
 // ============================================================
// ADMIN PANEL - See who uses your app
// ============================================================
async function renderAdminPanel() {
    const list = document.getElementById('adminUserList');
    const stats = document.getElementById('adminStats');
    if (!list) return;

    // Reload fresh data
    if (currentUser && currentUser.email === ADMIN_EMAIL) {
        try {
            const u = await get(child(ref(db), `allUsers`));
            allUsers = u.exists() ? Object.values(u.val()).filter(x => x) : [];
        } catch (e) { console.error(e); }
    }

    if (!allUsers.length) {
        list.innerHTML = '<p style="color:#888;padding:20px;">No users yet.</p>';
        if (stats) stats.innerHTML = '';
        return;
    }

    // Sort by lastSeen
    const sorted = [...allUsers].sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

    // Stats
    const totalUsers = allUsers.length;
    const totalLogins = allUsers.reduce((sum, u) => sum + (u.loginCount || 0), 0);
    const activeToday = allUsers.filter(u => {
        const last = new Date(u.lastSeen);
        const now = new Date();
        return (now - last) < 24 * 60 * 60 * 1000;
    }).length;

    if (stats) {
        stats.innerHTML = `
            <div style="background:#1a1a1a;border:1px solid #262626;border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:1.8rem;font-weight:700;color:#ff8c00;">${totalUsers}</div>
                <div style="font-size:0.75rem;color:#888;margin-top:4px;">Total Users</div>
            </div>
            <div style="background:#1a1a1a;border:1px solid #262626;border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:1.8rem;font-weight:700;color:#22c55e;">${activeToday}</div>
                <div style="font-size:0.75rem;color:#888;margin-top:4px;">Active Today</div>
            </div>
            <div style="background:#1a1a1a;border:1px solid #262626;border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:1.8rem;font-weight:700;color:#3b82f6;">${totalLogins}</div>
                <div style="font-size:0.75rem;color:#888;margin-top:4px;">Total Logins</div>
            </div>
        `;
    }

    // User list
    let html = '';
    sorted.forEach(u => {
        const first = new Date(u.firstSeen);
        const last = new Date(u.lastSeen);
        const firstStr = first.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        const lastStr = last.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) + ' at ' + last.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

        const isMe = u.email === ADMIN_EMAIL;

        // Activity dot
        const hoursAgo = (Date.now() - last.getTime()) / (1000 * 60 * 60);
        let dot = '#888';
        if (hoursAgo < 1) dot = '#22c55e';
        else if (hoursAgo < 24) dot = '#facc15';
        else if (hoursAgo < 168) dot = '#fb923c';

        html += '<div style="background:#1a1a1a;border:1px solid #262626;border-radius:12px;padding:16px;margin-bottom:10px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">' +
            '<div style="width:44px;height:44px;border-radius:50%;background:' + (isMe ? '#ff8c00' : '#3b82f6') + ';display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:1.1rem;flex-shrink:0;">' +
                (u.name ? u.name.charAt(0).toUpperCase() : '?') +
            '</div>' +
            '<div style="flex:1;min-width:200px;">' +
                '<div style="font-weight:600;color:#f5f5f5;font-size:0.95rem;display:flex;align-items:center;gap:8px;">' +
                    u.name + (isMe ? '<span style="font-size:0.65rem;background:#ff8c00;color:#fff;padding:2px 8px;border-radius:50px;font-weight:700;">YOU</span>' : '') +
                '</div>' +
                '<div style="font-size:0.75rem;color:#888;margin-top:2px;">' + u.email + '</div>' +
                '<div style="font-size:0.72rem;color:#666;margin-top:6px;">' +
                    '📅 Joined: ' + firstStr + ' &nbsp;·&nbsp; 🔄 Logins: ' + (u.loginCount || 1) +
                '</div>' +
            '</div>' +
            '<div style="text-align:right;min-width:180px;">' +
                '<div style="font-size:0.7rem;color:#666;margin-bottom:4px;">LAST SEEN</div>' +
                '<div style="font-size:0.8rem;color:#ccc;font-weight:500;">' + lastStr + '</div>' +
                '<div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;margin-top:6px;">' +
                    '<span style="width:8px;height:8px;border-radius:50%;background:' + dot + ';box-shadow:0 0 8px ' + dot + ';"></span>' +
                    '<span style="font-size:0.7rem;color:#888;">' + (hoursAgo < 1 ? 'Just now' : hoursAgo < 24 ? 'Today' : hoursAgo < 168 ? 'This week' : 'Long ago') + '</span>' +
                '</div>' +
            '</div>' +
        '</div>';
    });

    list.innerHTML = html;
}
// ============================================================
// ASSESSMENTS PAGE
// ============================================================

let pdfFiles = []; // Store uploaded PDFs

async function loadPdfs() {
    if (!currentUser) return;
    try {
        const snap = await get(child(ref(db), `users/${currentUser.uid}/pdfs`));
        pdfFiles = snap.exists() ? Object.values(snap.val()).filter(x => x) : [];
    } catch (e) { console.error(e); }
}

async function savePdfs() {
    if (!currentUser) return;
    try { await set(ref(db, `users/${currentUser.uid}/pdfs`), pdfFiles); }
    catch (e) { alert('Could not save PDF.'); }
}

function renderAssessmentsPage() {
    const now = Date.now();
    const total = events.length;
    const completed = events.filter(e => new Date(e.deadline).getTime() <= now).length;
    const upcoming = events.filter(e => new Date(e.deadline).getTime() > now).length;
    const overdue = 0;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statCompleted').textContent = completed;
    document.getElementById('statUpcoming').textContent = upcoming;
    document.getElementById('statOverdue').textContent = overdue;

    const maxVal = Math.max(total, 1);
    document.getElementById('statTotalBar').style.width = '100%';
    document.getElementById('statCompletedBar').style.width = (completed / maxVal * 100) + '%';
    document.getElementById('statUpcomingBar').style.width = (upcoming / maxVal * 100) + '%';
    document.getElementById('statOverdueBar').style.width = (overdue / maxVal * 100) + '%';

    // Modules grid
    const grid = document.getElementById('modulesAssessList');
    if (!modules.length) {
        grid.innerHTML = '<p style="color:#888;padding:20px;">Add modules first to see your assessment plan.</p>';
    } else {
        let html = '';
        modules.forEach(m => {
            const modEvents = events.filter(e => e.module === m.code).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
            const modCompleted = modEvents.filter(e => new Date(e.deadline).getTime() <= now).length;
            const progress = modEvents.length > 0 ? Math.round((modCompleted / modEvents.length) * 100) : 0;

            let badgeClass = 'ontrack', badgeText = 'On Track';
            if (progress === 0 && modEvents.length > 0) { badgeClass = 'upcoming'; badgeText = 'Upcoming'; }
            else if (progress < 100) { badgeClass = 'inprogress'; badgeText = 'In Progress'; }
            else if (progress === 100) { badgeClass = 'ontrack'; badgeText = 'Complete'; }
            if (modEvents.length === 0) { badgeClass = 'upcoming'; badgeText = 'No Tasks'; }

            const iconChar = (m.code || '?').charAt(0);
            const color = m.color || '#ff8c00';

            let assessListHtml = '';
            if (modEvents.length === 0) {
                assessListHtml = '<li style="color:#666;font-size:0.75rem;">No assessments yet</li>';
            } else {
                modEvents.forEach(e => {
                    const isPast = new Date(e.deadline).getTime() <= now;
                    const statusIcon = isPast ? '✅' : '⏳';
                    const dateStr = new Date(e.deadline).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                    assessListHtml += '<li>' +
                        '<span class="assess-status">' + statusIcon + '</span>' +
                        '<span class="assess-name-inline">' + (e.title || 'Assessment') + '</span>' +
                        '<span class="assess-date">📅 ' + dateStr + '</span>' +
                    '</li>';
                });
            }

            // ═══ Files for this module ═══
            const moduleFiles = pdfFiles.filter(f => f.module === m.code);
            let filesHTML = '';
            if (moduleFiles.length) {
                filesHTML = '<div class="module-files-section">' +
                    '<div class="module-files-title">📎 Study Material (' + moduleFiles.length + ')</div>' +
                    '<div class="module-files-grid">';
                moduleFiles.forEach(f => {
                    const isImage = f.type && f.type.startsWith('image/');
                    const thumbStyle = isImage
                        ? 'background-image:url(' + f.data + '); background-size:cover; background-position:center;'
                        : 'background:linear-gradient(135deg,#1f1f1f,#0f0f0f);';
                    const iconOverlay = isImage ? '' : '<span class="file-icon">📄</span>';
                    filesHTML += '<div class="module-file-thumb" onclick="openFileViewer(' + f.id + ')" style="' + thumbStyle + '">' +
                        iconOverlay +
                        '<div class="file-name-overlay">' + f.name + '</div>' +
                        '<button class="file-delete-btn" onclick="event.stopPropagation(); deleteModuleFile(' + f.id + ')" title="Delete">✕</button>' +
                    '</div>';
                });
                filesHTML += '</div></div>';
            }

            html += '<div class="module-assess-card" style="--module-color:' + color + ';">' +
                '<div class="module-assess-header">' +
                    '<div class="module-assess-title">' +
                        '<div class="module-assess-icon">' + iconChar + '</div>' +
                        '<div>' +
                            '<div class="module-assess-name">' + (m.name || m.code) + '</div>' +
                            '<div class="module-assess-code">' + m.code + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<span class="module-assess-badge ' + badgeClass + '">' + badgeText + '</span>' +
                '</div>' +

                '<ul class="module-assess-list">' + assessListHtml + '</ul>' +

                filesHTML +

                '<div class="module-assess-footer">' +
                    '<div class="module-assess-progress">' +
                        '<div class="module-assess-progress-label">' + progress + '% Complete</div>' +
                        '<div class="module-assess-progress-bar">' +
                            '<div class="module-assess-progress-fill" style="width:' + progress + '%;"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display:flex; gap:8px;">' +
                        '<button class="upload-module-btn" onclick="uploadModuleFile(\'' + m.code + '\')">📤 Upload</button>' +
                        '<button class="view-module-btn" onclick="viewModuleAssessments(\'' + m.code + '\')">View →</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        });
        grid.innerHTML = html;
    }

    // Overview donut
    const modOnTrack = modules.filter(m => {
        const modEvs = events.filter(e => e.module === m.code);
        const done = modEvs.filter(e => new Date(e.deadline).getTime() <= now).length;
        return modEvs.length > 0 && done === modEvs.length;
    }).length;
    const modInProgress = modules.filter(m => {
        const modEvs = events.filter(e => e.module === m.code);
        const done = modEvs.filter(e => new Date(e.deadline).getTime() <= now).length;
        return modEvs.length > 0 && done > 0 && done < modEvs.length;
    }).length;
    const modUpcoming = modules.filter(m => {
        const modEvs = events.filter(e => e.module === m.code);
        const done = modEvs.filter(e => new Date(e.deadline).getTime() <= now).length;
        return modEvs.length > 0 && done === 0;
    }).length;
    const modNoTask = modules.filter(m => events.filter(e => e.module === m.code).length === 0).length;

    document.getElementById('overviewCount').textContent = modOnTrack + '/' + modules.length;
    document.getElementById('legendOnTrack').textContent = modOnTrack;
    document.getElementById('legendInProgress').textContent = modInProgress;
    document.getElementById('legendUpcoming').textContent = modUpcoming + modNoTask;
    document.getElementById('legendOverdue').textContent = 0;

    const pct = modules.length > 0 ? (modOnTrack / modules.length) : 0;
    const circ = 2 * Math.PI * 30;
    document.getElementById('overviewRing').setAttribute('stroke-dasharray', circ);
    document.getElementById('overviewRing').setAttribute('stroke-dashoffset', circ - (pct * circ));

    // Populate PDF module select
    const pdfSel = document.getElementById('pdfModuleSelect');
    if (pdfSel) {
        pdfSel.innerHTML = '<option value="">-- Select Module --</option>';
        modules.forEach(m => {
            const o = document.createElement('option');
            o.value = m.code;
            o.textContent = m.code + ' — ' + m.name;
            pdfSel.appendChild(o);
        });
    }

    renderPdfList();
}

function renderPdfList() {
    const list = document.getElementById('uploadedFilesList');
    if (!list) return;
    if (!pdfFiles.length) {
        list.innerHTML = '';
        return;
    }
    let html = '';
    pdfFiles.forEach((f, idx) => {
        html += '<div class="pdf-file-item">' +
            '<span class="pdf-icon">📄</span>' +
            '<span class="pdf-name">' + f.name + ' <span style="color:#666;font-size:0.7rem;">(' + f.module + ')</span></span>' +
            '<a href="' + f.data + '" download="' + f.name + '">Download</a>' +
            '<button class="pdf-delete" onclick="deletePdf(' + idx + ')">✕</button>' +
        '</div>';
    });
    list.innerHTML = html;
}

window.deletePdf = async function(idx) {
    if (!confirm('Delete this file?')) return;
    pdfFiles.splice(idx, 1);
    await savePdfs();
    renderPdfList();
};

window.viewModuleAssessments = function(moduleCode) {
    // Filter to just this module - for now just alert
    alert('Showing assessments for ' + moduleCode + '\n\n' + events.filter(e => e.module === moduleCode).map(e => '• ' + e.title).join('\n'));
};

// PDF upload handling
function setupPdfUpload() {
    const dropZone = document.getElementById('pdfDropZone');
    const fileInput = document.getElementById('pdfFileInput');
    if (!dropZone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
    });
    ['dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file) handlePdfFile(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handlePdfFile(file);
    });
}

async function handlePdfFile(file) {
    if (file.type !== 'application/pdf') return alert('⚠️ Only PDF files allowed');
    if (file.size > 2 * 1024 * 1024) return alert('⚠️ File too big (max 2MB)');

    const module = document.getElementById('pdfModuleSelect').value;
    if (!module) return alert('⚠️ Please select which module this file is for');

    const reader = new FileReader();
    reader.onload = async (e) => {
        pdfFiles.push({
            id: Date.now(),
            name: file.name,
            module: module,
            size: file.size,
            data: e.target.result,
            uploadedAt: new Date().toISOString()
        });
        await savePdfs();
        renderPdfList();
        alert('✅ File uploaded!');
    };
    reader.readAsDataURL(file);
}

// Hook into switchView
const _origSwitchView = window.switchView;
window.switchView = function(viewName, el) {
    _origSwitchView(viewName, el);
    if (viewName === 'assessments') {
        loadPdfs().then(() => renderAssessmentsPage());
    }
};

// Init on load
window.addEventListener('load', () => {
    setTimeout(() => {
        setupPdfUpload();
    }, 500);
});
// ============================================================
// MODULE FILE UPLOAD + VIEWER
// ============================================================

window.uploadModuleFile = function(moduleCode) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) handleModuleFile(file, moduleCode);
    };
    input.click();
};

async function handleModuleFile(file, moduleCode) {
    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) return alert('⚠️ Only PDF or image files allowed');
    if (file.size > 3 * 1024 * 1024) return alert('⚠️ File too big (max 3MB)');

    const reader = new FileReader();
    reader.onload = async (e) => {
        pdfFiles.push({
            id: Date.now(),
            name: file.name,
            module: moduleCode,
            type: file.type,
            size: file.size,
            data: e.target.result,
            uploadedAt: new Date().toISOString()
        });
        await savePdfs();
        renderAssessmentsPage();
        alert('✅ File uploaded to ' + moduleCode);
    };
    reader.readAsDataURL(file);
}

window.deleteModuleFile = async function(fileId) {
    if (!confirm('Delete this file?')) return;
    pdfFiles = pdfFiles.filter(f => f.id !== fileId);
    await savePdfs();
    renderAssessmentsPage();
};

window.openFileViewer = function(fileId) {
    const file = pdfFiles.find(f => f.id === fileId);
    if (!file) return;

    document.getElementById('viewerFileName').textContent = file.name;
    document.getElementById('viewerFileModule').textContent = file.module + ' · ' + (file.type.includes('pdf') ? 'PDF Document' : 'Image');
    document.getElementById('viewerDownloadBtn').href = file.data;
    document.getElementById('viewerDownloadBtn').download = file.name;

    const content = document.getElementById('viewerContent');

    if (file.type.startsWith('image/')) {
        // Image - show directly
        content.innerHTML = '<img src="' + file.data + '" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:8px;">';
    } else {
        // PDF - convert data URL to blob URL (Chrome blocks data URLs in embed)
        const base64 = file.data.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        content.innerHTML = '<iframe src="' + blobUrl + '" style="width:100%; height:100%; border:none; border-radius:8px; min-height:600px;"></iframe>';
    }

    document.getElementById('fileViewerModal').style.display = 'block';
};

window.closeFileViewer = function() {
    const content = document.getElementById('viewerContent');
    // Revoke any blob URLs to free memory
    const iframe = content.querySelector('iframe');
    if (iframe && iframe.src.startsWith('blob:')) {
        URL.revokeObjectURL(iframe.src);
    }
    document.getElementById('fileViewerModal').style.display = 'none';
    content.innerHTML = '';
};


// ESC key closes viewer
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeFileViewer();
});

// ============================================================
// MOBILE SIDEBAR TOGGLE
// ============================================================
window.toggleMobileSidebar = function() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;

    const isOpen = sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active', isOpen);
};

// Close sidebar when clicking a nav item (on mobile)
document.addEventListener('click', function(e) {
    const navItem = e.target.closest('.nav-item');
    if (navItem && window.innerWidth <= 900) {
        setTimeout(() => {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('active');
        }, 200);
    }
});

// Close on resize to desktop
window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
    }
});
    // Render chart
    renderUserActivityChart();
    // ============================================================
// USER ACTIVITY CHART
// ============================================================
let chartRange = 'days';

window.setChartRange = function(range) {
    chartRange = range;
    document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('chartBtn' + range.charAt(0).toUpperCase() + range.slice(1))?.classList.add('active');
    renderUserActivityChart();
};

function renderUserActivityChart() {
    const chartEl = document.getElementById('userActivityChart');
    const labelsEl = document.getElementById('userActivityLabels');
    if (!chartEl || !allUsers.length) return;

    const now = new Date();
    let buckets = [];
    let labels = [];

    if (chartRange === 'days') {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            buckets.push({ start: d.getTime(), end: d.getTime() + 86400000, count: 0 });
            labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        }
    } else if (chartRange === 'weeks') {
        // Last 8 weeks
        for (let i = 7; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - (i * 7));
            d.setHours(0, 0, 0, 0);
            buckets.push({ start: d.getTime(), end: d.getTime() + (7 * 86400000), count: 0 });
            labels.push('W' + (8 - i));
        }
    } else {
        // Last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            buckets.push({ start: d.getTime(), end: next.getTime(), count: 0 });
            labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
        }
    }

    // Count users per bucket (using firstSeen)
    allUsers.forEach(u => {
        const t = new Date(u.firstSeen).getTime();
        buckets.forEach(b => {
            if (t >= b.start && t < b.end) b.count++;
        });
    });

    const maxCount = Math.max(...buckets.map(b => b.count), 1);

    // Build bars
    let chartHTML = '';
    let labelsHTML = '';
    buckets.forEach((b, i) => {
        const heightPct = (b.count / maxCount) * 100;
        chartHTML += '<div class="chart-bar-wrap">' +
            '<div class="chart-bar-count">' + b.count + '</div>' +
            '<div class="chart-bar" style="height:' + Math.max(heightPct, 2) + '%;" title="' + b.count + ' users"></div>' +
        '</div>';
        labelsHTML += '<div class="chart-label">' + labels[i] + '</div>';
    });

    chartEl.innerHTML = chartHTML;
    labelsEl.innerHTML = labelsHTML;
}
// ============================================================
// COLLAPSIBLE ADD COUNTDOWN FORM
// ============================================================
window.toggleCountdownForm = function() {
    const body = document.getElementById('countdownFormBody');
    const arrow = document.getElementById('cdFormArrow');
    if (!body) {
        console.error('countdownFormBody not found!');
        return;
    }
    
    if (body.style.display === 'none' || body.style.display === '') {
        body.style.display = 'block';
        if (arrow) arrow.style.transform = 'rotate(180deg)';
        console.log('✅ Form opened');
    } else {
        body.style.display = 'none';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
        console.log('❌ Form closed');
    }
};
console.log('👑 Golden Plan loaded!');