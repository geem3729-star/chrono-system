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
        html += `<div class="module-card"><div class="module-header"><div><span class="module-name">${m.code}</span><span class="module-full">${m.name}</span></div></div>
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
                '<div class="cc-subtitle">' + module + ' · ' + dateStr + ' at ' + timeStr + '</div>' +
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

console.log('👑 Golden Plan loaded!');