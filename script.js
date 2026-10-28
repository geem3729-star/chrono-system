import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
let pdfFiles = [];

const ADMIN_EMAIL = "keketsokagiso25@gmail.com";

window.switchView = function(viewName, el) {
    if (viewName === 'school-calendar') renderSchoolCalendar();
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const view = document.getElementById('view-' + viewName);
    if (view) view.classList.add('active');
    if (el) el.classList.add('active');

    if (viewName === 'modules') renderModulesList();
    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'calendar') renderCalendar();
    if (viewName === 'countdowns') { renderFullCountdowns(); populateCdDropdown(); }
    if (viewName === 'general') renderGeneralPage();
    if (viewName === 'examelig') renderExamEligFull();
    if (viewName === 'admin') renderAdminPanel();
    if (viewName === 'assessments') {
        renderAssessmentsPage();
        loadPdfs();
    }
};

document.getElementById('googleSignInBtn').addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (e) {
        if (e.code === 'auth/popup-blocked') {
            alert('Please allow popups for this site, then try again.\n\nSafari: Settings → Safari → Block Pop-ups → OFF');
        } else if (e.code === 'auth/popup-closed-by-user') {
            // silent
        } else {
            alert('Sign-in failed: ' + e.message);
        }
    }
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
        try {
            const userRef = ref(db, `allUsers/${user.uid}`);
            const existing = await get(userRef);
            const now = new Date().toISOString();
            if (existing.exists()) {
                const data = existing.val();
                await set(userRef, { ...data, lastSeen: now, loginCount: (data.loginCount || 0) + 1 });
            } else {
                await set(userRef, { uid: user.uid, name: name, email: user.email, photo: user.photoURL || '', firstSeen: now, lastSeen: now, loginCount: 1 });
            }
        } catch (e) { console.error('Log user error:', e); }
        if (user.email === ADMIN_EMAIL) {
            const adminBtn = document.getElementById('adminNavBtn');
            if (adminBtn) adminBtn.style.display = 'flex';
        }
        document.getElementById('userName').textContent = name;
        document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
        // NOTE: #greeting element does not exist in the HTML - removed the crash line.
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('app').style.display = 'grid';
        loadData();
        renderDashboard();
        setupModuleForm();
    } else {
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
});

function loadData() {
    if (!currentUser) return;
    onValue(ref(db, `users/${currentUser.uid}/events`), (snapshot) => {
        const val = snapshot.val();
        events = val ? (Array.isArray(val) ? val.filter(x => x) : Object.values(val).filter(x => x)) : [];
        renderDashboard();
        renderUpcoming();
        if (document.getElementById('view-countdowns')?.classList.contains('active')) renderFullCountdowns();
        if (document.getElementById('view-general')?.classList.contains('active')) renderGeneralPage();
        if (document.getElementById('view-assessments')?.classList.contains('active')) renderAssessmentsPage();
    });
    onValue(ref(db, `users/${currentUser.uid}/modules`), (snapshot) => {
        const val = snapshot.val();
        modules = val ? (Array.isArray(val) ? val.filter(x => x) : Object.values(val).filter(x => x)) : [];
        renderDashboard();
        renderModulesList();
        if (document.getElementById('view-assessments')?.classList.contains('active')) renderAssessmentsPage();
    });
    if (currentUser.email === ADMIN_EMAIL) {
        onValue(ref(db, `allUsers`), (snapshot) => {
            allUsers = snapshot.exists() ? Object.values(snapshot.val()).filter(x => x) : [];
            if (document.getElementById('view-admin')?.classList.contains('active')) renderAdminPanel();
        });
    }
}

async function saveEvents() {
    if (!currentUser) return;
    try { await set(ref(db, `users/${currentUser.uid}/events`), events); }
    catch (e) { console.error('Save events error:', e); alert('Could not save countdowns: ' + e.message); }
}

async function saveModules() {
    if (!currentUser) return;
    try { await set(ref(db, `users/${currentUser.uid}/modules`), modules); }
    catch (e) { console.error('Save modules error:', e); alert('Could not save modules: ' + e.message); }
}

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

function getTimeRemaining(iso) {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return { days:0, hours:0, minutes:0, seconds:0, isOverdue:true };
    const s = Math.floor(diff/1000);
    return { days: Math.floor(s/86400), hours: Math.floor((s%86400)/3600), minutes: Math.floor((s%3600)/60), seconds: s%60, isOverdue:false };
}

function renderDashboard() {
    renderModules();
    renderUpcoming();
    renderABList();
}

function renderModules() {
    const row = document.getElementById('modulesRow');
    if (!row) return;
    if (!modules.length) {
        row.innerHTML = '<div class="module-card" style="grid-column:1/-1;"><p style="color:#888;padding:24px;text-align:center;">No modules yet. Go to Modules to add them.</p></div>' +
            '<div class="overall-card"><div class="trophy">🏆</div><div class="overall-pct">0%</div><div class="overall-label">Overall Average</div><div class="overall-tagline">Add modules to begin</div></div>';
        return;
    }
    let html = '';
    let total = 0;
    modules.forEach(function(m) {
        const mark = m.currentMark || 0;
        total += mark;
        const circ = 2 * Math.PI * 36;
        const off = circ - (Math.min(100, mark) / 100) * circ;
        const color = m.color || '#ff8c00';
        let bc = 'eligible'; let bt = '✅ Qualify';
        if (mark < 40) { bc = 'atrisk'; bt = '⚠️ Dont Qualify'; }
        else if (mark < 60) { bc = 'warning'; bt = '🟡 Warning'; }
        html += '<div class="module-card" style="--module-color:' + color + '; position:relative;">';
        html += '<div class="card-actions">';
        html += '<button onclick="event.stopPropagation(); viewModuleAssessments(\'' + m.code + '\')" title="View">⛶</button>';
        html += '<button onclick="event.stopPropagation(); editModule(' + m.id + ')" title="Edit">✎</button>';
        html += '<button class="danger" onclick="event.stopPropagation(); deleteModule(' + m.id + ')" title="Delete">✕</button>';
        html += '</div>';
        html += '<div class="module-header"><div><span class="module-name">' + m.code + '</span><span class="module-full">' + m.name + '</span></div></div>';
        html += '<div class="module-ring"><svg viewBox="0 0 90 90"><circle class="ring-bg" cx="45" cy="45" r="36"/><circle class="ring-progress" cx="45" cy="45" r="36" stroke="' + color + '" stroke-dasharray="' + circ + '" stroke-dashoffset="' + off + '"/></svg>';
        html += '<div class="center"><div class="pct">' + mark + '%</div><div class="pct-label">CURRENT</div></div></div>';
        html += '<div class="module-mark">' + mark + ' / 100</div>';
        html += '<div class="module-badge ' + bc + '">' + bt + '</div>';
        html += '</div>';
    });
    const avg = Math.round(total / modules.length);
    let tag = 'Needs Focus!';
    if (avg >= 75) tag = 'Excellent!';
    else if (avg >= 60) tag = 'Good Progress!';
    else if (avg >= 40) tag = 'Keep Pushing!';
    html += '<div class="overall-card"><div class="trophy">🏆</div><div class="overall-pct">' + avg + '%</div><div class="overall-label">Overall Average</div><div class="overall-tagline">' + tag + '</div></div>';
    row.innerHTML = html;
}

function renderModulesList() {
    const list = document.getElementById('modulesList');
    if (!list) return;
    if (!modules.length) {
        list.innerHTML = '<p style="color:#888;padding:20px;grid-column:1/-1;">No modules yet. Add one above.</p>';
        return;
    }
    let html = '';
    modules.forEach(function(m) {
        const mark = m.currentMark || 0;
        const circ = 2 * Math.PI * 36;
        const off = circ - (Math.min(100, mark) / 100) * circ;
        const color = m.color || '#ff8c00';
        let bc = 'eligible'; let bt = '✅ Qualify';
        if (mark < 40) { bc = 'atrisk'; bt = '⚠️ Dont Qualify'; }
        else if (mark < 60) { bc = 'warning'; bt = '🟡 Warning'; }
        html += '<div class="module-card" style="--module-color:' + color + '; position:relative;">';
        html += '<div class="card-actions">';
        html += '<button onclick="event.stopPropagation(); viewModuleAssessments(\'' + m.code + '\')" title="View">⛶</button>';
        html += '<button onclick="event.stopPropagation(); editModule(' + m.id + ')" title="Edit">✎</button>';
        html += '<button class="danger" onclick="event.stopPropagation(); deleteModule(' + m.id + ')" title="Delete">✕</button>';
        html += '</div>';
        html += '<div class="module-header"><div><span class="module-name">' + m.code + '</span><span class="module-full">' + m.name + '</span></div></div>';
        html += '<div class="module-ring"><svg viewBox="0 0 90 90"><circle class="ring-bg" cx="45" cy="45" r="36"/><circle class="ring-progress" cx="45" cy="45" r="36" stroke="' + color + '" stroke-dasharray="' + circ + '" stroke-dashoffset="' + off + '"/></svg>';
        html += '<div class="center"><div class="pct">' + mark + '%</div><div class="pct-label">CURRENT</div></div></div>';
        html += '<div class="module-mark">' + mark + ' / 100</div>';
        html += '<div class="module-badge ' + bc + '">' + bt + '</div>';
        html += '</div>';
    });
    list.innerHTML = html;
}

function renderUpcoming() {
    const c = document.getElementById('upcomingCountdowns');
    if (!c) return;
    const now = Date.now();
    const up = events.filter(e => new Date(e.deadline).getTime() > now).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    if (!up.length) {
        c.innerHTML = '<p style="color:#888;">No upcoming deadlines</p>';
        return;
    }
    let html = '';
    up.forEach(e => {
        const r = getTimeRemaining(e.deadline);
        const d = new Date(e.deadline);
        const color = e.color || '#ff8c00';
        html += '<div class="countdown-mini" data-cd-target="' + e.deadline + '" style="--card-color:' + color + '; position:relative;">';
        html += '<div class="card-actions">';
        html += '<button onclick="event.stopPropagation(); zoomCountdown(' + e.id + ')" title="Fullscreen">⛶</button>';
        html += '<button onclick="event.stopPropagation(); editCountdown(' + e.id + ')" title="Edit">✎</button>';
        html += '<button class="danger" onclick="event.stopPropagation(); deleteEvent(' + e.id + ')" title="Delete">✕</button>';
        html += '</div>';
        html += '<div class="cm-header">';
        html += '<span class="cm-title">' + (e.title || 'Deadline') + '</span>';
        html += '<span class="cm-date">' + d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + '</span>';
        html += '</div>';
        const pad2 = n => String(n).padStart(2, '0');
        html += '<div class="cc-grid">';
        html += '<div class="cc-box"><div class="cc-box-num" data-unit="days">' + pad2(r.days) + '</div><div class="cc-box-lbl">DAYS</div></div>';
        html += '<div class="cc-box"><div class="cc-box-num" data-unit="hours">' + pad2(r.hours) + '</div><div class="cc-box-lbl">HRS</div></div>';
        html += '<div class="cc-box"><div class="cc-box-num" data-unit="mins">' + pad2(r.minutes) + '</div><div class="cc-box-lbl">MIN</div></div>';
        html += '<div class="cc-box"><div class="cc-box-num" data-unit="secs">' + pad2(r.seconds) + '</div><div class="cc-box-lbl">SEC</div></div>';
        html += '</div>';
        html += '</div>';
    });
    c.innerHTML = html;
    attachCardTickers();
}

function renderFullCountdowns() {
    const list = document.getElementById('fullCountdownsList');
    const hist = document.getElementById('historyList');
    if (!list) return;
    const now = Date.now();
    const up = events.filter(e => new Date(e.deadline).getTime() > now).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const past = events.filter(e => new Date(e.deadline).getTime() <= now).sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
    if (!up.length) {
        list.innerHTML = '<p style="color:#888;padding:20px;grid-column:1/-1;">No active countdowns.</p>';
    } else {
        list.innerHTML = up.map(e => buildCard(e, false)).join('');
    }
    if (hist) {
        if (!past.length) {
            hist.innerHTML = '<p style="color:#888;padding:20px;">No past deadlines.</p>';
        } else {
            hist.innerHTML = past.map(e => {
                const d = new Date(e.deadline);
                const color = e.color || '#ff8c00';
                return '<div style="background:linear-gradient(90deg, color-mix(in srgb, ' + color + ' 25%, #0a0a0a) 0%, #0a0a0a 100%); border:1px solid color-mix(in srgb, ' + color + ' 40%, #262626); border-left:5px solid ' + color + '; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:12px;">' +
                    '<div style="flex:1; text-align:center; min-width:0;">' +
                        '<div style="color:#fff;font-weight:600;font-size:0.95rem;display:flex;align-items:center;justify-content:center;gap:8px;"><span style="color:' + color + ';font-weight:700;">✓</span> ' + (e.title || 'Deadline') + '</div>' +
                        '<div style="color:#888;font-size:0.75rem;margin-top:4px;">' + (e.module || 'General') + ' · ' + d.toLocaleDateString('en-US', {day:'2-digit', month:'short', year:'numeric'}) + '</div>' +
                    '</div>' +
                    '<div style="font-size:0.7rem;font-weight:700;color:' + color + ';background:color-mix(in srgb, ' + color + ' 15%, transparent);padding:4px 12px;border-radius:50px;white-space:nowrap;flex-shrink:0;">COMPLETED</div>' +
                    '<button onclick="editCountdown(' + e.id + ')" title="Edit" style="background:rgba(255,140,0,0.1);border:1px solid rgba(255,140,0,0.3);color:#ff8c00;width:28px;height:28px;border-radius:50%;cursor:pointer;flex-shrink:0;">✎</button>' +
                    '<button onclick="deleteEvent(' + e.id + ')" style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);color:#f87171;width:28px;height:28px;border-radius:50%;cursor:pointer;flex-shrink:0;">✕</button>' +
                '</div>';
            }).join('');
        }
    }
    attachCardTickers();
}

function attachCardTickers() {
    if (window._cardTickers) window._cardTickers.forEach(fn => fn());
    window._cardTickers = [];
    const pad = n => String(n).padStart(2, '0');
    document.querySelectorAll('.countdown-card[data-cd-target], .countdown-mini[data-cd-target]').forEach(card => {
        const end = new Date(card.dataset.cdTarget).getTime();
        const update = () => {
            const ms = Math.max(0, end - Date.now());
            const s = Math.floor(ms / 1000);
            const daysEl = card.querySelector('[data-unit="days"]');
            const hrsEl  = card.querySelector('[data-unit="hours"]');
            const minEl  = card.querySelector('[data-unit="mins"]');
            const secEl  = card.querySelector('[data-unit="secs"]');
            if (daysEl) daysEl.textContent = pad(Math.floor(s / 86400));
            if (hrsEl)  hrsEl.textContent  = pad(Math.floor(s % 86400 / 3600));
            if (minEl)  minEl.textContent  = pad(Math.floor(s % 3600 / 60));
            if (secEl)  secEl.textContent  = pad(s % 60);
        };
        update();
        const id = setInterval(update, 1000);
        window._cardTickers.push(() => clearInterval(id));
    });
}

function buildCard(e, isPast) {
    const r = getTimeRemaining(e.deadline);
    const d = new Date(e.deadline);
    const color = e.color || '#ff8c00';

    let blinkClass = '';
    if (!isPast) {
        if (r.days < 1) blinkClass = 'cc-urgent';
        else if (r.days < 3) blinkClass = 'cc-warning';
        else if (r.days < 7) blinkClass = 'cc-soon';
    }

    const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const title = e.title || 'Deadline';
    const module = e.module || 'General';
    const opacity = isPast ? 0.5 : 1;

    const pad = n => String(n).padStart(2, '0');

    return '<div class="countdown-card ' + blinkClass + '" data-cd-id="' + e.id + '" data-cd-target="' + e.deadline + '" style="opacity:' + opacity + ';position:relative;--card-color:' + color + ';">' +
        '<div class="cc-actions">' +
            '<button class="cc-action-btn" onclick="event.stopPropagation(); zoomCountdown(' + e.id + ')" title="Fullscreen">⛶</button>' +
            '<button class="cc-action-btn" onclick="event.stopPropagation(); editCountdown(' + e.id + ')" title="Edit">✎</button>' +
            '<button class="cc-action-btn cc-delete" data-id="' + e.id + '" title="Delete">✕</button>' +
        '</div>' +
        '<div class="cc-header"><div style="padding-right:120px;"><div class="cc-title">' + title + '</div></div></div>' +
        '<div class="cc-grid">' +
            '<div class="cc-box"><div class="cc-box-num" data-unit="days">' + pad(r.days) + '</div><div class="cc-box-lbl">DAYS</div></div>' +
            '<div class="cc-box"><div class="cc-box-num" data-unit="hours">' + pad(r.hours) + '</div><div class="cc-box-lbl">HRS</div></div>' +
            '<div class="cc-box"><div class="cc-box-num" data-unit="mins">' + pad(r.minutes) + '</div><div class="cc-box-lbl">MIN</div></div>' +
            '<div class="cc-box"><div class="cc-box-num" data-unit="secs">' + pad(r.seconds) + '</div><div class="cc-box-lbl">SEC</div></div>' +
        '</div>' +
        '<div class="cc-footer">' + module + ' · ' + dateStr + ' at ' + timeStr + '</div>' +
    '</div>';
}

window.toggleHistory = function() {
    const h = document.getElementById('historyList');
    const a = document.getElementById('historyArrow');
    if (!h) return;
    if (h.style.display === 'none' || h.style.display === '') { h.style.display = 'flex'; a.textContent = '▲'; }
    else { h.style.display = 'none'; a.textContent = '▼'; }
};

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
    renderFullCountdowns(); renderUpcoming(); renderDashboard();
    alert('Countdown added!');
});

window.deleteEvent = async function(id) {
    if (!confirm('Delete this deadline?')) return;
    events = events.filter(e => e.id !== id);
    await saveEvents();
    renderFullCountdowns(); renderDashboard(); renderUpcoming();
};

document.addEventListener('click', function(ev) {
    const btn = ev.target.closest('.cc-delete');
    if (btn) {
        ev.stopPropagation();
        const id = Number(btn.dataset.id);
        if (id) deleteEvent(id);
    }
});

setInterval(() => {
    if (!currentUser) return;
    renderUpcoming();
    const cd = document.getElementById('view-countdowns');
    if (cd && cd.classList.contains('active')) renderFullCountdowns();
    if (window._zoomId) {
        const zoomed = events.find(ev => ev.id === window._zoomId);
        if (zoomed) renderZoomContent(zoomed);
    }
}, 1000);

function renderExamElig() {}

function renderExamEligFull() {
    const list = document.getElementById('examEligListFull');
    if (!list) return;
    if (!modules.length) {
        list.innerHTML = '<p style="color:#888;padding:20px;">Add modules first.</p>';
        return;
    }
    let html = '';
    modules.forEach(m => {
        const mark = m.currentMark || 0;
        const eligible = mark >= 40;
        const color = eligible ? '#4ade80' : '#fb923c';
        const text = eligible ? '✅ Eligible for exam' : '⚠️ Not yet (need 40%)';
        html += '<div class="eligibility-item">' +
            '<div><div class="elig-name">' + m.code + ' — ' + (m.name || m.code) + '</div>' +
            '<div class="elig-note">Current mark: ' + mark + '%</div></div>' +
            '<div class="elig-status" style="color:' + color + ';">' + text + '</div>' +
        '</div>';
    });
    list.innerHTML = html;
}

async function renderAdminPanel() {
    const list = document.getElementById('adminUserList');
    const stats = document.getElementById('adminStats');
    if (!list) return;

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

    const sorted = [...allUsers].sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
    const totalUsers = allUsers.length;
    const totalLogins = allUsers.reduce((sum, u) => sum + (u.loginCount || 0), 0);
    const activeToday = allUsers.filter(u => (new Date() - new Date(u.lastSeen)) < 24 * 60 * 60 * 1000).length;

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

    let html = '';
    sorted.forEach(u => {
        const first = new Date(u.firstSeen);
        const last = new Date(u.lastSeen);
        const firstStr = first.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        const lastStr = last.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) + ' at ' + last.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const isMe = u.email === ADMIN_EMAIL;
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
                '<div style="font-size:0.72rem;color:#666;margin-top:6px;">📅 Joined: ' + firstStr + ' &nbsp;·&nbsp; 🔄 Logins: ' + (u.loginCount || 1) + '</div>' +
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
    renderUserActivityChart();
}

let abTab = 'all';
window.setABTab = function(tab) {
    abTab = tab;
    document.querySelectorAll('.ab-tab').forEach(b => b.classList.toggle('ab-tab-active', b.dataset.abTab === tab));
    renderABList();
};

function renderAssessmentsPage() {
    const now = Date.now();
    const total = events.length;
    const completed = events.filter(e => new Date(e.deadline).getTime() <= now).length;
    const upcoming = events.filter(e => e.module && e.module !== 'General' && new Date(e.deadline).getTime() > now).length;

    const el = (id) => document.getElementById(id);
    if (el('statTotal')) el('statTotal').textContent = total;
    if (el('statCompleted')) el('statCompleted').textContent = completed;
    if (el('statUpcoming')) el('statUpcoming').textContent = upcoming;
    if (el('statOverdue')) el('statOverdue').textContent = 0;

    const maxVal = Math.max(total, 1);
    if (el('statTotalBar')) el('statTotalBar').style.width = '100%';
    if (el('statCompletedBar')) el('statCompletedBar').style.width = (completed / maxVal * 100) + '%';
    if (el('statUpcomingBar')) el('statUpcomingBar').style.width = (upcoming / maxVal * 100) + '%';
    if (el('statOverdueBar')) el('statOverdueBar').style.width = '0%';

    const grid = el('modulesAssessList');
    if (grid) {
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
                else if (progress < 100 && progress > 0) { badgeClass = 'inprogress'; badgeText = 'In Progress'; }
                else if (progress === 100) { badgeClass = 'ontrack'; badgeText = 'Complete'; }
                if (modEvents.length === 0) { badgeClass = 'upcoming'; badgeText = 'No Tasks'; }
                const iconChar = (m.code || '?').charAt(0);
                const color = m.color || '#ff8c00';
                const activeEvents = modEvents.filter(e => new Date(e.deadline).getTime() > now);
                const completedEvents = modEvents.filter(e => new Date(e.deadline).getTime() <= now);
                let assessListHtml = '';
                if (activeEvents.length === 0 && completedEvents.length === 0) {
                    assessListHtml = '<li style="color:#666;font-size:0.75rem;">No assessments yet</li>';
                } else {
                    activeEvents.forEach(e => {
                        const dateStr = new Date(e.deadline).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                        assessListHtml += '<li><span class="assess-name-inline">' + (e.title || 'Assessment') + '</span><span class="assess-date">' + dateStr + '</span></li>';
                    });
                    if (completedEvents.length > 0) {
                        assessListHtml += '<li class="completed-divider"><span style="font-size:0.6rem;letter-spacing:1px;color:' + color + ';font-weight:700;">✓ COMPLETED (' + completedEvents.length + ')</span></li>';
                        completedEvents.forEach(e => {
                            const dateStr = new Date(e.deadline).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                            assessListHtml += '<li class="completed-item" style="opacity:0.7;"><span class="assess-name-inline" style="text-decoration:line-through;color:#888;">' + (e.title || 'Assessment') + '</span><span class="assess-date">' + dateStr + '</span></li>';
                        });
                    }
                }
                html += '<div class="module-assess-card" style="--module-color:' + color + ';">' +
                    '<div class="module-assess-header">' +
                        '<div class="module-assess-title"><div class="module-assess-icon">' + iconChar + '</div>' +
                        '<div><div class="module-assess-name">' + (m.name || m.code) + '</div><div class="module-assess-code">' + m.code + '</div></div></div>' +
                        '<span class="module-assess-badge ' + badgeClass + '">' + badgeText + '</span>' +
                    '</div>' +
                    '<ul class="module-assess-list">' + assessListHtml + '</ul>' +
                    '<div class="module-assess-footer">' +
                        '<div class="module-assess-progress">' +
                            '<div class="module-assess-progress-label">' + progress + '% Complete</div>' +
                            '<div class="module-assess-progress-bar"><div class="module-assess-progress-fill" style="width:' + progress + '%;"></div></div>' +
                        '</div>' +
                        '<button class="view-module-btn" onclick="viewModuleAssessments(\'' + m.code + '\')">View →</button>' +
                    '</div>' +
                '</div>';
            });
            grid.innerHTML = html;
        }
    }

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

    if (el('overviewCount')) el('overviewCount').textContent = modOnTrack + '/' + modules.length;
    if (el('legendOnTrack')) el('legendOnTrack').textContent = modOnTrack;
    if (el('legendInProgress')) el('legendInProgress').textContent = modInProgress;
    if (el('legendUpcoming')) el('legendUpcoming').textContent = modUpcoming + modNoTask;
    if (el('legendOverdue')) el('legendOverdue').textContent = 0;

    const pct = modules.length > 0 ? (modOnTrack / modules.length) : 0;
    const circ = 2 * Math.PI * 30;
    if (el('overviewRing')) {
        el('overviewRing').setAttribute('stroke-dasharray', circ);
        el('overviewRing').setAttribute('stroke-dashoffset', circ - (pct * circ));
    }
}

function renderABList() {
    const container = document.getElementById('abList');
    if (!container) return;
    const now = Date.now();
    const searchVal = (document.getElementById('abSearchInput')?.value || '').toLowerCase().trim();
    if (!modules.length) {
        container.innerHTML = '<div style="text-align:center; padding:80px 20px; color:#666;"><div style="font-size:3rem; opacity:0.4; margin-bottom:12px;">📚</div><div>Add modules first to see your assessment plan.</div></div>';
        return;
    }
    let html = '';
    let totalShown = 0;
    html += '<div class="ab-col-head"><div></div><div>ASSESSMENT</div><div>WEIGHT</div><div>DUE DATE</div><div>MY MARK</div><div>STATUS</div></div>';

    let renderList = [...modules];
    const hasGeneral = events.some(e => !e.module || e.module === 'General');
    if (hasGeneral) {
        renderList.push({ code: 'General', name: 'General Tasks', color: '#ff8c00' });
    }

    renderList.forEach(m => {
        let modEvents = events.filter(e => m.code === 'General' ? (!e.module || e.module === 'General') : e.module === m.code).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        if (abTab === 'upcoming') modEvents = modEvents.filter(e => new Date(e.deadline).getTime() > now);
        if (abTab === 'completed') modEvents = modEvents.filter(e => new Date(e.deadline).getTime() <= now);
        if (searchVal) {
            modEvents = modEvents.filter(e => (e.title || '').toLowerCase().includes(searchVal) || (e.module || '').toLowerCase().includes(searchVal) || (m.name || '').toLowerCase().includes(searchVal));
        }
        if (!modEvents.length) return;
        totalShown += modEvents.length;
        const color = m.color || '#ff8c00';
        const iconChar = (m.code || '?').charAt(0);
        html += '<div class="ab-module-group" style="--mod-color:' + color + ';">' +
            '<div class="ab-module-header"><div class="ab-module-title"><div class="ab-module-icon">' + iconChar + '</div>' +
            '<div><div class="ab-module-code">' + m.code + '</div><div class="ab-module-name">' + (m.name || m.code) + '</div></div></div></div>' +
            '<div class="ab-module-body">';
        modEvents.forEach(e => {
            const d = new Date(e.deadline);
            const isPast = d.getTime() <= now;
            const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
            const daysLeft = Math.floor((d.getTime() - now) / 86400000);
            const statusColor = isPast ? '#22c55e' : '#f59e0b';
            const statusText = isPast ? 'Completed' : 'Upcoming';
            const hasMark = Number(e.currentMark) > 0;
            let pct = 0;
            let progressLabel = '';
            if (isPast) {
                pct = hasMark ? Math.min(100, Number(e.currentMark)) : 100;
                progressLabel = hasMark ? '✓ ' + e.currentMark + '%' : '✓ Done';
            } else {
                pct = Math.max(2, Math.min(100, 100 - (daysLeft / 90) * 100));
                progressLabel = '⏱ ' + (daysLeft > 0 ? daysLeft + ' days left' : 'Today');
            }
            const markDisplay = hasMark ? e.currentMark + ' / 100' : '- / 100';
            html += '<div class="ab-row" onclick="viewModuleAssessments(\'' + m.code + '\')">' +
                '<div class="ab-row-main">' +
                    '<div class="ab-row-icon">📄</div>' +
                    '<div class="ab-row-info"><div class="ab-row-name">' + (e.title || 'Assessment') + '</div><div class="ab-row-sub">' + (e.module || '') + '</div></div>' +
                    '<div class="ab-row-meta">' + (e.weight || 0) + '%</div>' +
                    '<div class="ab-row-meta">' + dateStr + '</div>' +
                    '<div class="ab-row-meta">' + markDisplay + '</div>' +
                    '<div class="ab-row-status" style="background:color-mix(in srgb, ' + statusColor + ' 15%, transparent); color:' + statusColor + '; border-color:color-mix(in srgb, ' + statusColor + ' 35%, transparent);">' + statusText + '</div>' +
                '</div>' +
                '<div class="ab-row-progress">' +
                    '<div class="ab-progress-label">' + progressLabel + '</div>' +
                    '<div class="ab-progress-bar"><div class="ab-progress-fill" style="width:' + pct + '%; background:' + (isPast ? '#22c55e' : color) + ';"></div></div>' +
                    '<div class="ab-progress-pct">' + Math.round(pct) + '%</div>' +
                '</div>' +
            '</div>';
        });
        html += '</div></div>';
    });
    if (!totalShown) {
        const hasAny = events.some(ev => modules.some(m => m.code === ev.module));
        const msg = hasAny ? 'Nothing matches your filter.' : 'No assessments yet. Add one on the Countdowns page and pick a module.';
        container.innerHTML = '<div style="text-align:center; padding:80px 20px; color:#666;"><div style="font-size:3rem; opacity:0.4; margin-bottom:12px;">🎉</div><div>' + msg + '</div></div>';
        return;
    }
    container.innerHTML = html;
}
window.renderABList = renderABList;

let currentViewerModule = null;
window.viewModuleAssessments = function(moduleCode) {
    currentViewerModule = moduleCode;
    renderModuleViewer();
    const m = document.getElementById('moduleViewerModal');
    if (m) m.style.display = 'block';
};
window.closeModuleViewer = function() {
    const m = document.getElementById('moduleViewerModal');
    if (m) m.style.display = 'none';
    currentViewerModule = null;
};

function renderModuleViewer() {
    if (!currentViewerModule) return;
    const m = modules.find(mod => mod.code === currentViewerModule);
    if (!m) return;
    const now = Date.now();
    const allModEvents = events.filter(e => e.module === m.code).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const completed = allModEvents.filter(e => new Date(e.deadline).getTime() <= now);
    const upcoming = allModEvents.filter(e => new Date(e.deadline).getTime() > now);
    const color = m.color || '#ff8c00';
    const iconChar = (m.code || '?').charAt(0);
    let html = '';
    html += '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:20px;">' +
        '<div style="display:flex; align-items:center; gap:16px;">' +
            '<div style="width:56px; height:56px; border-radius:14px; background:color-mix(in srgb, ' + color + ' 15%, #141414); display:flex; align-items:center; justify-content:center; font-size:1.6rem; color:' + color + '; font-weight:800;">' + iconChar + '</div>' +
            '<div>' +
                '<div style="font-size:1.4rem; font-weight:700; color:#f5f5f5;">' + (m.name || m.code) + '</div>' +
                '<div style="font-size:0.8rem; color:#888; margin-top:4px; display:flex; align-items:center; gap:8px;"><span>' + m.code + '</span><span style="color:#333;">•</span><span>' + allModEvents.length + ' Assessments</span></div>' +
            '</div>' +
        '</div>' +
        '<div style="display:flex; align-items:center; gap:12px;">' +
            '<div style="background:#141414; border:1px solid #262626; border-radius:12px; padding:10px 14px; display:flex; align-items:center; gap:10px;">' +
                '<div style="width:32px; height:32px; border-radius:8px; background:rgba(255,140,0,0.1); display:flex; align-items:center; justify-content:center; font-size:1rem;">📅</div>' +
                '<div><div style="font-size:0.65rem; color:#888; text-transform:uppercase; letter-spacing:0.05em;">Today</div>' +
                '<div style="font-size:0.8rem; color:#f5f5f5; font-weight:600;">' + new Date().toLocaleDateString('en-US', {day:'2-digit', month:'short', year:'numeric'}) + '</div></div>' +
            '</div>' +
            '<button onclick="closeModuleViewer()" style="background:#1a1a1a; border:1px solid #262626; color:#ccc; width:42px; height:42px; border-radius:50%; cursor:pointer; font-weight:700; font-size:1rem;">✕</button>' +
        '</div>' +
    '</div>';
    html += '<div style="margin-bottom:22px;">' +
        '<div style="font-size:0.75rem; font-weight:700; color:#f5f5f5; margin-bottom:12px; display:flex; align-items:center; gap:8px;">⚡ Quick Actions</div>' +
        '<div class="mv-actions-grid">' +
            '<button onclick="viewImagesFor(\'' + m.code + '\')" class="mv-action-btn"><span class="mv-action-icon" style="background:rgba(59,130,246,0.15);">🖼️</span><div style="text-align:left; min-width:0;"><div style="color:#f5f5f5; font-weight:600; font-size:0.8rem;">View Images</div><div style="font-size:0.68rem; color:#888; font-weight:400;">Open all images</div></div></button>' +
            '<button onclick="viewPdfsFor(\'' + m.code + '\')" class="mv-action-btn"><span class="mv-action-icon" style="background:rgba(239,68,68,0.15);">📄</span><div style="text-align:left; min-width:0;"><div style="color:#f5f5f5; font-weight:600; font-size:0.8rem;">View PDFs</div><div style="font-size:0.68rem; color:#888; font-weight:400;">Open all PDFs</div></div></button>' +
            '<button onclick="uploadModuleFile(\'' + m.code + '\')" class="mv-action-btn"><span class="mv-action-icon" style="background:rgba(139,92,246,0.15);">📤</span><div style="text-align:left; min-width:0;"><div style="color:#f5f5f5; font-weight:600; font-size:0.8rem;">Upload Files</div><div style="font-size:0.68rem; color:#888; font-weight:400;">Add study materials</div></div></button>' +
        '</div>' +
    '</div>';
    html += '<div style="display:flex; gap:24px; border-bottom:1px solid #1f1f1f; margin-bottom:20px;">' +
        '<button onclick="setModuleTab(\'all\')" id="mvTabAll" class="mv-tab mv-tab-active" style="background:none; border:none; padding:12px 0; font-size:0.85rem; font-weight:700; color:' + color + '; cursor:pointer; border-bottom:2px solid ' + color + '; margin-bottom:-1px;">All Assessments</button>' +
        '<button onclick="setModuleTab(\'completed\')" id="mvTabCompleted" class="mv-tab" style="background:none; border:none; padding:12px 0; font-size:0.85rem; font-weight:700; color:#888; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px;">Completed (' + completed.length + ')</button>' +
    '</div>';
    const progressPct = allModEvents.length > 0 ? Math.round((completed.length / allModEvents.length) * 100) : 0;
    const circ = 2 * Math.PI * 40;
    const offset = circ - (progressPct / 100) * circ;
    html += '<div class="mv-grid">';
    html += '<div class="mv-left" id="mvAssessList"></div>';
    html += '<div class="mv-right">' +
        '<div style="background:#141414; border:1px solid #1f1f1f; border-radius:14px; padding:18px; margin-bottom:16px;">' +
            '<div style="font-size:0.75rem; font-weight:700; color:#f5f5f5; margin-bottom:16px; display:flex; align-items:center; gap:8px;">📊 Progress Overview</div>' +
            '<div style="display:flex; align-items:center; justify-content:center; margin-bottom:18px;">' +
                '<div style="position:relative; width:120px; height:120px;">' +
                    '<svg viewBox="0 0 100 100" style="width:100%; height:100%; transform:rotate(-90deg);">' +
                        '<circle cx="50" cy="50" r="40" fill="none" stroke="#262626" stroke-width="8"/>' +
                        '<circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '"/>' +
                    '</svg>' +
                    '<div style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">' +
                        '<div style="font-size:1.5rem; font-weight:700; color:#f5f5f5;">' + completed.length + '/' + allModEvents.length + '</div>' +
                        '<div style="font-size:0.6rem; color:#888; letter-spacing:1px; text-transform:uppercase;">Completed</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div style="display:flex; flex-direction:column; gap:10px;">' +
                '<div style="display:flex; justify-content:space-between; font-size:0.78rem;"><span style="color:#22c55e;">● Completed</span><strong style="color:#f5f5f5;">' + completed.length + '</strong></div>' +
                '<div style="display:flex; justify-content:space-between; font-size:0.78rem;"><span style="color:#3b82f6;">● Upcoming</span><strong style="color:#f5f5f5;">' + upcoming.length + '</strong></div>' +
                '<div style="display:flex; justify-content:space-between; font-size:0.78rem;"><span style="color:#888;">● Total Assessments</span><strong style="color:#f5f5f5;">' + allModEvents.length + '</strong></div>' +
            '</div>' +
        '</div>' +
        '<div style="background:linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02)); border:1px solid rgba(59,130,246,0.25); border-radius:14px; padding:16px;">' +
            '<div style="font-size:0.75rem; font-weight:700; color:#60a5fa; margin-bottom:6px; display:flex; align-items:center; gap:8px;">💡 Stay on track!</div>' +
            '<div style="font-size:0.72rem; color:#888; line-height:1.5;">Keep up with your assessments, view your resources, and make sure to upload your files where needed.</div>' +
        '</div>' +
    '</div>';
    html += '</div>';
    document.getElementById('moduleViewerBody').innerHTML = html;
    window.mvAllEvents = allModEvents;
    window.mvCompletedEvents = completed;
    window.mvCurrentTab = 'all';
    renderModuleAssessmentList();
}

function renderModuleAssessmentList() {
    const list = document.getElementById('mvAssessList');
    if (!list) return;
    const color = (modules.find(x => x.code === currentViewerModule) || {}).color || '#ff8c00';
    const now = Date.now();
    const items = window.mvCurrentTab === 'completed' ? window.mvCompletedEvents : window.mvAllEvents;

    if (!items.length) {
        list.innerHTML = '<div style="text-align:center; padding:60px 20px; color:#666;">🎉 Nothing here yet.</div>';
        return;
    }

    let html = '';
    items.forEach(e => {
        const d = new Date(e.deadline);
        const isPast = d.getTime() <= now;
        const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const statusColor = isPast ? '#22c55e' : '#3b82f6';
        const statusText  = isPast ? 'COMPLETED' : 'UPCOMING';

        const files = pdfFiles.filter(f => f.eventId === e.id);
        let filesHTML = '';

        if (files.length) {
         filesHTML = '<div style="display:flex; flex-wrap:wrap; gap:16px; margin-top:12px; justify-content: center;">';
            files.forEach(f => {
                const isImg = f.type && f.type.startsWith('image/');
                const ext = isImg ? 'IMG' : 'PDF';
                const sizeMB = (f.size / (1024*1024)).toFixed(1);
                const thumbStyle = isImg
                    ? 'background-image:url(' + f.data + '); background-size:cover; background-position:center;'
                    : 'background:linear-gradient(135deg,#1f1f1f,#0f0f0f);';

                filesHTML += '<div onclick="openFileViewer(' + f.id + ')" style="position:relative; border-radius:12px; overflow:hidden; cursor:pointer; border:1px solid #262626; width: 200px; height: 200px; display:flex; align-items:flex-start; ' + thumbStyle + '">' +
                    (isImg ? '' : '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:5rem; opacity:0.4;">📄</div>') +
                    '<div style="position:absolute; bottom:0; left:0; right:0; padding:8px 10px; background:rgba(0,0,0,0.85); display:flex; align-items:center; gap:8px;">' +
                        '<div style="width:20px; height:20px; border-radius:4px; background:' + (isImg ? '#3b82f6' : '#ef4444') + '; display:flex; align-items:center; justify-content:center; font-size:0.55rem; font-weight:800; color:#fff;">' + ext + '</div>' +
                        '<div style="flex:1; min-width:0;">' +
                            '<div style="font-size:0.8rem; color:#fff; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + f.name + '</div>' +
                            '<div style="font-size:0.65rem; color:#888;">' + sizeMB + ' MB</div>' +
                        '</div>' +
                    '</div>' +
                    '<button onclick="event.stopPropagation(); deleteModuleFile(' + f.id + ')" style="position:absolute; top:8px; right:8px; width:24px; height:24px; background:rgba(239,68,68,0.95); border:2px solid #fff; border-radius:50%; color:#fff; font-size:0.7rem; cursor:pointer; font-weight:700; display:flex; align-items:center; justify-content:center;">✕</button>' +
                '</div>';
            });
            filesHTML += '</div>';
        } else {
            filesHTML = '<div style="margin-top:12px; padding:14px; background:rgba(255,255,255,0.02); border:1px dashed #262626; border-radius:10px; display:flex; align-items:center; gap:10px;">' +
                '<span style="font-size:1.2rem; opacity:0.4;">☁️</span>' +
                '<span style="font-size:0.75rem; color:#666;">No scope or materials uploaded yet.</span>' +
            '</div>';
        }

        html += '<div style="background:#141414; border:1px solid #1f1f1f; border-left:3px solid ' + color + '; border-radius:12px; padding:16px 18px; margin-bottom:12px; width: 100%; box-sizing: border-box;">' +
            '<div style="display:flex; justify-content:flex-start; align-items:center; gap:16px; flex-wrap:wrap;">' +
                '<div style="display:flex; align-items:center; gap:12px;">' +
                    '<div style="width:40px; height:40px; border-radius:10px; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; font-size:1rem;">📝</div>' +
                    '<div>' +
                        '<div style="font-weight:700; color:#f5f5f5; font-size:0.95rem;">' + (e.title || 'Assessment') + '</div>' +
                        '<div style="font-size:0.7rem; color:#888; margin-top:2px;">📅 ' + dateStr + ' at ' + timeStr + '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">' +
                    '<div style="font-size:0.6rem; font-weight:700; color:' + statusColor + '; background:color-mix(in srgb, ' + statusColor + ' 15%, transparent); padding:4px 12px; border-radius:50px; border:1px solid color-mix(in srgb, ' + statusColor + ' 30%, transparent);">' + statusText + '</div>' +
                    '<button onclick="uploadScopeFor(\'' + currentViewerModule + '\', ' + e.id + ')" style="padding:7px 14px; background:rgba(255,140,0,0.1); border:1px solid rgba(255,140,0,0.4); color:#ff8c00; border-radius:8px; font-size:0.7rem; font-weight:700; cursor:pointer; white-space:nowrap;">+ Upload</button>' +
                '</div>' +
            '</div>' +
            '<div style="display:flex; align-items:center; gap:8px; margin-top:16px; margin-bottom: 8px;">' +
                '<span style="font-size:1rem;">📎</span>' +
                '<span style="font-size:0.68rem; font-weight:700; color:#888; letter-spacing:0.05em; text-transform:uppercase;">Scope & Materials</span>' +
            '</div>' +
            filesHTML +
        '</div>';
    });

    list.innerHTML = html;
}

window.setModuleTab = function(tab) {
    window.mvCurrentTab = tab;
    const allBtn = document.getElementById('mvTabAll');
    const compBtn = document.getElementById('mvTabCompleted');
    const color = (modules.find(x => x.code === currentViewerModule) || {}).color || '#ff8c00';
    if (allBtn) { allBtn.style.color = tab === 'all' ? color : '#888'; allBtn.style.borderBottom = tab === 'all' ? '2px solid ' + color : '2px solid transparent'; }
    if (compBtn) { compBtn.style.color = tab === 'completed' ? color : '#888'; compBtn.style.borderBottom = tab === 'completed' ? '2px solid ' + color : '2px solid transparent'; }
    renderModuleAssessmentList();
};

window.viewImagesFor = function(moduleCode) {
    const imgs = pdfFiles.filter(f => f.module === moduleCode && f.type && f.type.startsWith('image/'));
    if (!imgs.length) return alert('No images uploaded for this module yet.');
    openFileViewer(imgs[0].id);
};
window.viewPdfsFor = function(moduleCode) {
    const pdfs = pdfFiles.filter(f => f.module === moduleCode && f.type === 'application/pdf');
    if (!pdfs.length) return alert('No PDFs uploaded for this module yet.');
    openFileViewer(pdfs[0].id);
};

window.uploadScopeFor = function(moduleCode, eventId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) handleScopeFile(file, moduleCode, eventId);
    };
    input.click();
};

async function handleScopeFile(file, moduleCode, eventId) {
    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) return alert('⚠️ Only PDF or image files allowed');
    if (file.size > 3 * 1024 * 1024) return alert('⚠️ File too big (max 3MB)');
    const reader = new FileReader();
    reader.onload = async (e) => {
        pdfFiles.push({ id: Date.now(), name: file.name, module: moduleCode, eventId: eventId, type: file.type, size: file.size, data: e.target.result, uploadedAt: new Date().toISOString() });
        await savePdfs();
        renderModuleViewer();
        renderAssessmentsPage();
        alert('✅ Uploaded for this assessment!');
    };
    reader.readAsDataURL(file);
}

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
        pdfFiles.push({ id: Date.now(), name: file.name, module: moduleCode, type: file.type, size: file.size, data: e.target.result, uploadedAt: new Date().toISOString() });
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
        content.innerHTML = '<img src="' + file.data + '" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:8px;">';
    } else {
        const base64 = file.data.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        content.innerHTML = '<iframe src="' + blobUrl + '" style="width:100%; height:100%; border:none; border-radius:8px; min-height:600px;"></iframe>';
    }
    document.getElementById('fileViewerModal').style.display = 'block';
};

window.closeFileViewer = function() {
    const content = document.getElementById('viewerContent');
    const iframe = content.querySelector('iframe');
    if (iframe && iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src);
    document.getElementById('fileViewerModal').style.display = 'none';
    content.innerHTML = '';
};

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFileViewer(); });

window.toggleMobileSidebar = function() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;
    const isOpen = sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active', isOpen);
};

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

window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
    }
});

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
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
            buckets.push({ start: d.getTime(), end: d.getTime() + 86400000, count: 0 });
            labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        }
    } else if (chartRange === 'weeks') {
        for (let i = 7; i >= 0; i--) {
            const d = new Date(now); d.setDate(d.getDate() - (i * 7)); d.setHours(0, 0, 0, 0);
            buckets.push({ start: d.getTime(), end: d.getTime() + (7 * 86400000), count: 0 });
            labels.push('W' + (8 - i));
        }
    } else {
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            buckets.push({ start: d.getTime(), end: next.getTime(), count: 0 });
            labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
        }
    }
    allUsers.forEach(u => {
        const t = new Date(u.firstSeen).getTime();
        buckets.forEach(b => { if (t >= b.start && t < b.end) b.count++; });
    });
    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    let chartHTML = '';
    let labelsHTML = '';
    buckets.forEach((b, i) => {
        const heightPct = (b.count / maxCount) * 100;
        chartHTML += '<div class="chart-bar-wrap"><div class="chart-bar-count">' + b.count + '</div><div class="chart-bar" style="height:' + Math.max(heightPct, 2) + '%;" title="' + b.count + ' users"></div></div>';
        labelsHTML += '<div class="chart-label">' + labels[i] + '</div>';
    });
    chartEl.innerHTML = chartHTML;
    labelsEl.innerHTML = labelsHTML;
}

window.toggleCountdownForm = function() {
    const body = document.getElementById('countdownFormBody');
    const arrow = document.getElementById('cdFormArrow');
    if (!body) return;
    if (body.style.display === 'none' || body.style.display === '') {
        body.style.display = 'block';
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    } else {
        body.style.display = 'none';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    }
};

window.toggleModuleForm = function() {
    const body = document.getElementById('moduleFormBody');
    const arrow = document.getElementById('moduleFormArrow');
    if (!body) return;
    if (body.style.display === 'none' || body.style.display === '') {
        body.style.display = 'block';
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    } else {
        body.style.display = 'none';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    }
};

function renderModalList(list, emptyMessage) {
    if (!list || !list.length) {
        return '<p style="color:#888; text-align:center; padding:40px;">' + emptyMessage + '</p>';
    }
    let html = '';
    list.forEach(function(e) {
        const color = e.color || '#ff8c00';
        const d = new Date(e.deadline);
        const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const isPast = d.getTime() <= Date.now();
        const tag = isPast ? 'COMPLETED' : 'UPCOMING';

        html += '<div style="background:linear-gradient(90deg, color-mix(in srgb, ' + color + ' 20%, #141414) 0%, #141414 100%); border:1px solid color-mix(in srgb, ' + color + ' 35%, #262626); border-left:4px solid ' + color + '; border-radius:12px; padding:14px 18px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">' +
            '<div style="flex:1; min-width:180px;">' +
                '<div style="color:#fff; font-weight:700; font-size:0.95rem;">' + (e.title || 'Deadline') + '</div>' +
                '<div style="color:#888; font-size:0.72rem; margin-top:4px;">' + (e.module || 'General') + ' · ' + dateStr + ' at ' + timeStr + '</div>' +
            '</div>' +
            '<div style="font-size:0.7rem; font-weight:700; color:' + color + '; background:color-mix(in srgb, ' + color + ' 15%, transparent); padding:5px 14px; border-radius:50px; border:1px solid color-mix(in srgb, ' + color + ' 30%, transparent);">' + tag + '</div>' +
            '<button onclick="editCountdown(' + e.id + '); closeCompletedModal();" style="background:rgba(255,140,0,0.1); border:1px solid rgba(255,140,0,0.3); color:#ff8c00; width:30px; height:30px; border-radius:50%; cursor:pointer; flex-shrink:0; font-weight:700; margin-right:4px;">✎</button>' +
            '<button onclick="deleteEvent(' + e.id + '); closeCompletedModal();" style="background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.3); color:#f87171; width:30px; height:30px; border-radius:50%; cursor:pointer; flex-shrink:0; font-weight:700;">✕</button>' +
        '</div>';
    });
    return html;
}

window.openTotalModal = function() {
    const modal = document.getElementById('completedModal');
    const list = document.getElementById('completedModalList');
    const title = document.getElementById('modalTitle');
    const sub = document.getElementById('modalSubtitle');
    if (!modal || !list) return;
    if (title) title.textContent = '📝 All Assessments';
    if (sub) sub.textContent = 'Every single deadline across your account';
    const all = events.filter(e => e.module && e.module !== 'General').sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    list.innerHTML = renderModalList(all, '🎉 No assessments yet.');
    modal.style.display = 'block';
};

window.openUpcomingModal = function() {
    const modal = document.getElementById('completedModal');
    const list = document.getElementById('completedModalList');
    const title = document.getElementById('modalTitle');
    const sub = document.getElementById('modalSubtitle');
    if (!modal || !list) return;
    if (title) title.textContent = '⏰ Upcoming Assessments';
    if (sub) sub.textContent = 'Deadlines coming up, sorted by date';
    const now = Date.now();
    const upcoming = events.filter(e => e.module && e.module !== 'General' && new Date(e.deadline).getTime() > now).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    list.innerHTML = renderModalList(upcoming, '🎉 No upcoming deadlines.');
    modal.style.display = 'block';
};

window.openOverdueModal = function() {
    const modal = document.getElementById('completedModal');
    const list = document.getElementById('completedModalList');
    const title = document.getElementById('modalTitle');
    const sub = document.getElementById('modalSubtitle');
    if (!modal || !list) return;
    if (title) title.textContent = '⚠️ Overdue Assessments';
    if (sub) sub.textContent = 'Deadlines that need attention';
    list.innerHTML = renderModalList([], '🎉 You have no overdue assessments!');
    modal.style.display = 'block';
};

window.openCompletedModal = function() {
    const modal = document.getElementById('completedModal');
    const list = document.getElementById('completedModalList');
    const title = document.getElementById('modalTitle');
    const sub = document.getElementById('modalSubtitle');
    if (!modal || !list) return;
    if (title) title.textContent = '✅ Completed Deadlines';
    if (sub) sub.textContent = 'All the assessments you have finished';
    const now = Date.now();
    const completed = events.filter(function(e) { return e.module && e.module !== 'General' && new Date(e.deadline).getTime() <= now; }).sort(function(a, b) { return new Date(b.deadline) - new Date(a.deadline); });
    list.innerHTML = renderModalList(completed, '🎉 No completed deadlines yet.');
    modal.style.display = 'block';
};

window.closeCompletedModal = function() {
    const modal = document.getElementById('completedModal');
    if (modal) modal.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', function() {
    const totalCard = document.getElementById('totalCardBtn');
    const completedCard = document.getElementById('completedCardBtn');
    const upcomingCard = document.getElementById('upcomingCardBtn');
    function bindTap(el, fn) {
        if (!el) return;
        const handler = function(e) { e.preventDefault(); e.stopPropagation(); fn(); };
        el.addEventListener('click', handler);
        el.addEventListener('touchend', handler);
    }
    const overdueCard = document.getElementById('overdueCardBtn');

    bindTap(totalCard, function() { window.openTotalModal(); });
    bindTap(completedCard, function() { window.openCompletedModal(); });
    bindTap(upcomingCard, function() { window.openUpcomingModal(); });
    bindTap(overdueCard, function() { window.openOverdueModal(); });
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (typeof closeModuleViewer === 'function') closeModuleViewer();
        if (typeof closeCompletedModal === 'function') closeCompletedModal();
        if (typeof closeFileViewer === 'function') closeFileViewer();
    }
});

(function() {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isSafari && isIOS) {
        const warning = document.getElementById('safariWarning');
        if (warning) warning.style.display = 'block';
    }
})();

console.log('👑 Golden Plan loaded!');

window.zoomCountdown = function(id) {
    const e = events.find(ev => ev.id === id);
    if (!e) return;
    window._zoomId = id;
    renderZoomContent(e);
    const modal = document.getElementById('zoomModal');
    if (modal) modal.style.display = 'flex';
};

function renderZoomContent(e) {
    const color = e.color || '#ff8c00';
    const d = new Date(e.deadline);
    const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('zoomTitle', e.title || 'Countdown');
    setTxt('zoomModule', e.module || 'General');
    setTxt('zoomFooter', dateStr + ' at ' + timeStr);

    const modal = document.getElementById('zoomModal');
    if (!modal) return;

    const inner = modal.querySelector('.zoom-inner');
    if (inner) inner.style.setProperty('--card-color', color);

    const grid = document.getElementById('zoomGrid');
    if (grid) grid.dataset.cdTarget = e.deadline;

    if (window._zoomTicker) clearInterval(window._zoomTicker);
    const end = new Date(e.deadline).getTime();
    const pad = n => String(n).padStart(2, '0');
    const update = () => {
        const ms = Math.max(0, end - Date.now());
        const s = Math.floor(ms / 1000);
        const g = document.getElementById('zoomGrid');
        if (!g) return;
        const dEl = g.querySelector('[data-unit="days"]');
        const hEl = g.querySelector('[data-unit="hours"]');
        const mEl = g.querySelector('[data-unit="mins"]');
        const sEl = g.querySelector('[data-unit="secs"]');
        if (dEl) dEl.textContent = pad(Math.floor(s / 86400));
        if (hEl) hEl.textContent = pad(Math.floor(s % 86400 / 3600));
        if (mEl) mEl.textContent = pad(Math.floor(s % 3600 / 60));
        if (sEl) sEl.textContent = pad(s % 60);
    };
    update();
    window._zoomTicker = setInterval(update, 1000);
}

window.closeZoom = function() {
    const modal = document.getElementById('zoomModal');
    if (modal) modal.style.display = 'none';
    if (window._zoomTicker) { clearInterval(window._zoomTicker); window._zoomTicker = null; }
    window._zoomId = null;
};

window.editCountdown = function(id) {
    const e = events.find(ev => ev.id === id);
    if (!e) return;
    const d = new Date(e.deadline);
    const pad = n => String(n).padStart(2, '0');
    const dateVal = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
    const timeVal = pad(d.getHours()) + ':' + pad(d.getMinutes());
    document.getElementById('editId').value = e.id;
    document.getElementById('editTitle').value = e.title || '';
    document.getElementById('editModule').value = e.module || 'General';
    document.getElementById('editDate').value = dateVal;
    document.getElementById('editTime').value = timeVal;
    document.getElementById('editWeight').value = e.weight || 0;
    document.getElementById('editMark').value = e.currentMark || 0;
    document.getElementById('editColor').value = e.color || '#ff8c00';
    document.getElementById('editConsequence').value = e.consequence || '';
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'flex';
};

window.closeEditModal = function() {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
};

window.saveCountdownEdit = async function() {
    const id = Number(document.getElementById('editId').value);
    const e = events.find(ev => ev.id === id);
    if (!e) return;
    const title = document.getElementById('editTitle').value.trim();
    const date = document.getElementById('editDate').value;
    const time = document.getElementById('editTime').value;
    if (!title || !date || !time) return alert('Title, date and time are required');
    e.title = title;
    e.module = document.getElementById('editModule').value.trim() || 'General';
    e.deadline = date + 'T' + time;
    e.weight = Number(document.getElementById('editWeight').value) || 0;
    e.currentMark = Number(document.getElementById('editMark').value) || 0;
    e.color = document.getElementById('editColor').value;
    e.consequence = document.getElementById('editConsequence').value.trim() || 'None';
    await saveEvents();
    closeEditModal();
    renderFullCountdowns();
    renderUpcoming();
    renderDashboard();
    alert('✅ Countdown updated');
};

window.editModule = function(id) {
    const m = modules.find(mod => mod.id === id);
    if (!m) return;
    document.getElementById('editModId').value = m.id;
    document.getElementById('editModCode').value = m.code || '';
    document.getElementById('editModName').value = m.name || '';
    document.getElementById('editModMark').value = m.currentMark || 0;
    document.getElementById('editModColor').value = m.color || '#ff8c00';
    const modal = document.getElementById('editModuleModal');
    if (modal) modal.style.display = 'flex';
};

window.closeEditModuleModal = function() {
    const modal = document.getElementById('editModuleModal');
    if (modal) modal.style.display = 'none';
};

window.saveModuleEdit = async function() {
    const id = Number(document.getElementById('editModId').value);
    const m = modules.find(mod => mod.id === id);
    if (!m) return;
    const code = document.getElementById('editModCode').value.trim().toUpperCase();
    if (!code) return alert('Module code is required');
    m.code = code;
    m.name = document.getElementById('editModName').value.trim() || code;
    m.currentMark = Number(document.getElementById('editModMark').value) || 0;
    m.color = document.getElementById('editModColor').value;
    await saveModules();
    closeEditModuleModal();
    renderModules();
    renderModulesList();
    renderDashboard();
    alert('✅ Module updated');
};

function makeFlip() {
    const el = document.createElement('div');
    el.className = 'flip';
    el.innerHTML =
        '<div class="half top"><span></span></div>' +
        '<div class="half bottom"><span></span></div>' +
        '<div class="half top flap-top"><span></span></div>' +
        '<div class="half bottom flap-bottom"><span></span></div>' +
        '<div class="seam"></div>';
    const spans = el.querySelectorAll('.half span');
    const [top, bottom, flapTop, flapBottom] = spans;
    let current = null, timer = null;
    function set(value) {
        if (value === current) return;
        if (current === null) {
            top.textContent = bottom.textContent = flapTop.textContent = flapBottom.textContent = value;
            current = value;
            return;
        }
        top.textContent = value;
        bottom.textContent = current;
        flapTop.textContent = current;
        flapBottom.textContent = value;
        el.classList.remove('go');
        void el.offsetWidth;
        el.classList.add('go');
        current = value;
        clearTimeout(timer);
        timer = setTimeout(() => {
            bottom.textContent = value;
            el.classList.remove('go');
        }, 620);
    }
    return { el, set };
}

function flipCountdown(container, target) {
    const end = new Date(target).getTime();
    const root = document.createElement('div');
    root.className = 'flipcd flipcd-trio';
    const units = ['HRS', 'MIN', 'SEC'].map(label => {
        const wrap = document.createElement('div');
        wrap.className = 'flipcd-unit';
        const flip = makeFlip();
        const lab = document.createElement('div');
        lab.className = 'flipcd-label';
        lab.textContent = label;
        wrap.append(flip.el, lab);
        root.append(wrap);
        return flip;
    });
    container.replaceChildren(root);
    const card = container.closest('[data-cd-target]');
    const daysRing = card ? card.querySelector('[data-days-target]') : null;
    const ringCirc = 2 * Math.PI * 40;
    const pad = n => String(n).padStart(2, '0');
    function updateDaysRing(days) {
        if (!daysRing) return;
        const num = daysRing.querySelector('.ring-num');
        if (num) num.textContent = pad(days);
        const pct = Math.min(100, (days / 30) * 100);
        const offset = ringCirc - (pct / 100) * ringCirc;
        const progress = daysRing.querySelector('.ring-progress');
        if (progress) progress.setAttribute('stroke-dashoffset', offset);
    }
    function tick() {
        const ms = Math.max(0, end - Date.now());
        const s = Math.floor(ms / 1000);
        const days = Math.floor(s / 86400);
        updateDaysRing(days);
        units[0].set(pad(Math.floor(s % 86400 / 3600)));
        units[1].set(pad(Math.floor(s % 3600 / 60)));
        units[2].set(pad(s % 60));
        const daysFloat = ms / 86400000;
        root.dataset.urgency = daysFloat < 1 ? 'red' : daysFloat < 3 ? 'orange' : daysFloat < 7 ? 'yellow' : 'green';
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
}

function renderGeneralPage() {
    const list = document.getElementById('generalTasksList');
    if (!list) return;

    const generalEvents = events
        .filter(e => !e.module || e.module === 'General')
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    if (!generalEvents.length) {
        list.innerHTML = '<p style="color:#888;padding:20px;">No General tasks yet.</p>';
        return;
    }

    list.innerHTML = generalEvents.map(e => buildCard(e, false)).join('');
    attachCardTickers();
}

// ==========================================
// CALENDAR PAGE LOGIC
// ==========================================
let calCurrentDate = new Date();

function renderCalendar() {
    const container = document.getElementById('view-calendar');
    if (!container) return;

    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const now = new Date();

    let rawFirstDay = new Date(year, month, 1).getDay();
    let firstDay = (rawFirstDay === 0) ? 6 : rawFirstDay - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let gridHTML = `
        <div class="cal-header">
            <button class="cal-nav-btn" onclick="changeMonth(-1)">‹</button>
            <h2>${monthNames[month]} ${year}</h2>
            <button class="cal-nav-btn" onclick="changeMonth(1)">›</button>
        </div>
        <div class="cal-grid">
            <div class="cal-day-name">Mon</div>
            <div class="cal-day-name">Tue</div>
            <div class="cal-day-name">Wed</div>
            <div class="cal-day-name">Thu</div>
            <div class="cal-day-name">Fri</div>
            <div class="cal-day-name">Sat</div>
            <div class="cal-day-name">Sun</div>
    `;

    for (let i = 0; i < firstDay; i++) gridHTML += `<div class="cal-cell cal-empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const dayDate = new Date(year, month, d);
        const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();

        const dayEvents = events.filter(e => {
            const eDate = new Date(e.deadline);
            return eDate.getDate() === d && eDate.getMonth() === month && eDate.getFullYear() === year;
        });

        let cellBgStyle = '';
        let circleStyle = '';
        let dotsHTML = '';

        if (dayEvents.length > 0) {
            const upcomingEv = dayEvents.find(e => new Date(e.deadline) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()));
            const targetEvent = upcomingEv || dayEvents[0];
            const c = targetEvent.color || '#ff8c00';

            circleStyle = `style="border: 2px solid ${c}; color: #ffffff; ${!upcomingEv ? 'opacity: 0.6;' : ''}"`;

            if (dayEvents.length > 1) {
                const c1 = dayEvents[0].color || '#ff8c00';
                const c2 = dayEvents[1].color || '#ff8c00';
                cellBgStyle = `style="background: linear-gradient(135deg, ${c1}22 0%, ${c2}22 100%); border-color: #333;"`;
            } else {
                cellBgStyle = `style="background: ${c}11; border-color: #333;"`;
            }

            dotsHTML = `<div style="position:absolute; bottom: 8px; display: flex; gap: 4px; justify-content: center; width: 100%; z-index: 10;">`;
            dayEvents.slice(0, 5).forEach(ev => {
                const dotColor = ev.color || '#ff8c00';
                dotsHTML += `<div style="width: 6px; height: 6px; border-radius: 50%; background: ${dotColor}; box-shadow: 0 0 4px ${dotColor};"></div>`;
            });
            dotsHTML += `</div>`;
        }

        gridHTML += `
            <div class="cal-cell ${isToday ? 'cal-today' : ''}" ${cellBgStyle}>
                <div class="cal-date-num" ${circleStyle}>${d}</div>
                ${dotsHTML}
            </div>
        `;
    }
    gridHTML += `</div>`;

    const todayEvents = [];
    const tomorrowEvents = [];
    const upcomingEvents = [];
    const pastEvents = [];

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterStart = new Date(tomorrowStart);
    dayAfterStart.setDate(dayAfterStart.getDate() + 1);

    events.forEach(e => {
        const d = new Date(e.deadline);
        if (d >= todayStart && d < tomorrowStart) {
            todayEvents.push(e);
        } else if (d >= tomorrowStart && d < dayAfterStart) {
            tomorrowEvents.push(e);
        } else if (d >= dayAfterStart) {
            upcomingEvents.push(e);
        } else {
            pastEvents.push(e);
        }
    });

    upcomingEvents.sort((a,b) => new Date(a.deadline) - new Date(b.deadline));
    pastEvents.sort((a,b) => new Date(b.deadline) - new Date(a.deadline));

    const searchIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
    const settingsIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;

    let listHTML = `
        <div class="cal-list-header">
            <div>
                <h3>Events</h3>
                <p>${monthNames[month]} ${year}</p>
            </div>
            <div class="cal-list-icons" style="display:flex; align-items:center; gap:16px;">
                <span style="cursor:pointer; display:flex;">${searchIcon}</span>
                <span style="cursor:pointer; display:flex;">${settingsIcon}</span>
                <button class="cal-header-add-btn" onclick="switchView('countdowns', document.querySelector('[data-view=countdowns]'))" title="Add Event">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
        </div>
    `;

    const buildEventRow = (e, isCompleted) => {
        const d = new Date(e.deadline);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

        const eventColor = e.color || '#ff8c00';
        const dynamicCalIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${eventColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

        return `
            <div class="cal-event-row" onclick="zoomCountdown(${e.id})">
                <div class="cal-event-icon" style="background: color-mix(in srgb, ${eventColor} 15%, transparent); border-color: color-mix(in srgb, ${eventColor} 30%, transparent);">
                    ${dynamicCalIcon}
                </div>
                <div class="cal-event-date">
                    <div class="cal-event-day">${dayName}</div>
                    <div class="cal-event-dmy">${dateStr}</div>
                    <div class="cal-event-time" style="color: ${eventColor};">${timeStr}</div>
                </div>
                <div class="cal-event-info">
                    <div class="cal-event-title">${e.title || 'Deadline'}</div>
                    <div class="cal-event-module">${e.module || 'General'}</div>
                </div>
                <div class="cal-event-check">
                    ${isCompleted ? '<span style="color:#ef4444; background:#1a1a1a; padding:2px 6px; border-radius:4px; font-size:0.8rem;">✓</span>' : '☐'}
                </div>
            </div>
        `;
    };

    if (todayEvents.length === 0) {
        listHTML += `<div class="cal-group-title">Today</div><div class="cal-empty-msg">No pending event for today</div>`;
    } else {
        listHTML += `<div class="cal-group-title">Today</div>`;
        todayEvents.forEach(e => listHTML += buildEventRow(e, false));
    }

    if (tomorrowEvents.length > 0) {
        listHTML += `<div class="cal-group-title">Tomorrow</div>`;
        tomorrowEvents.forEach(e => listHTML += buildEventRow(e, false));
    }

    if (upcomingEvents.length > 0) {
        listHTML += `<div class="cal-group-title" style="cursor: pointer;" onclick="toggleCalUpcoming()">Upcoming events <span id="calUpcomingArrow">▲</span></div>`;
        listHTML += `<div id="calUpcomingList" style="display: flex; flex-direction: column;">`;
        upcomingEvents.forEach(e => listHTML += buildEventRow(e, false));
        listHTML += `</div>`;
    }

    if (pastEvents.length > 0) {
        listHTML += `<div class="cal-group-title" style="cursor: pointer;" onclick="toggleCalCompleted()">Completed <span id="calCompArrow">▲</span></div>`;
        listHTML += `<div id="calCompletedList" style="display: flex; flex-direction: column;">`;
        pastEvents.forEach(e => listHTML += buildEventRow(e, true));
        listHTML += `</div>`;
    }

    container.innerHTML = `
        <div class="calendar-layout">
            <div class="calendar-left panel">${gridHTML}</div>
            <div class="calendar-right panel">
                ${listHTML}
            </div>
        </div>
    `;
}

window.changeMonth = function(dir) {
    calCurrentDate.setMonth(calCurrentDate.getMonth() + dir);
    renderCalendar();
};

window.toggleCalUpcoming = function() {
    const list = document.getElementById('calUpcomingList');
    const arrow = document.getElementById('calUpcomingArrow');
    if (list.style.display === 'none') {
        list.style.display = 'flex';
        arrow.textContent = '▲';
    } else {
        list.style.display = 'none';
        arrow.textContent = '▼';
    }
};

window.toggleCalCompleted = function() {
    const list = document.getElementById('calCompletedList');
    const arrow = document.getElementById('calCompArrow');
    if (list.style.display === 'none') {
        list.style.display = 'flex';
        arrow.textContent = '▲';
    } else {
        list.style.display = 'none';
        arrow.textContent = '▼';
    }
};

// ==========================================
// SCHOOL CALENDAR (NWU 2026 FRAMEWORK)
// ==========================================
let schoolCalDate = new Date(2026, 3, 1);

function getNWUStatus(dateStr, dayOfWeek) {
    if (dayOfWeek === 0 || dayOfWeek === 6) return null;

    if (dateStr >= '2026-04-01' && dateStr <= '2026-04-30') {
        if (['2026-04-01', '2026-04-02', '2026-04-07', '2026-04-09', '2026-04-10', '2026-04-13'].includes(dateStr)) {
            return { color: '#fb923c', text: '#000000', border: '#fb923c' };
        }
        if (['2026-04-03', '2026-04-06', '2026-04-27'].includes(dateStr)) {
            return { color: '#1f1f1f', text: '#ffffff', border: '#1f1f1f' };
        }
        if (dateStr === '2026-04-08') {
            return { color: 'transparent', text: '#ef4444', border: '#ef4444' };
        }
        if (['2026-04-28', '2026-04-29', '2026-04-30'].includes(dateStr)) {
            return { color: '#facc15', text: '#000000', border: '#facc15' };
        }
        return { color: '#4ade80', text: '#000000', border: '#4ade80' };
    }

    const holidays = ['2026-01-01', '2026-03-21', '2026-05-01', '2026-06-16', '2026-08-09', '2026-09-24', '2026-12-16', '2026-12-25', '2026-12-26'];
    if (holidays.includes(dateStr)) return { color: '#1f1f1f', text: '#ffffff', border: '#1f1f1f' };

    if (dateStr >= '2026-05-18' && dateStr <= '2026-06-12') return { color: '#ef4444', text: '#ffffff', border: '#ef4444' };
    if (dateStr >= '2026-11-16' && dateStr <= '2026-12-08') return { color: '#ef4444', text: '#ffffff', border: '#ef4444' };

    if ((dateStr >= '2026-02-09' && dateStr <= '2026-03-27') ||
        (dateStr >= '2026-05-01' && dateStr <= '2026-05-15') ||
        (dateStr >= '2026-07-06' && dateStr <= '2026-09-18') ||
        (dateStr >= '2026-10-05' && dateStr <= '2026-11-13')) {
        return { color: '#4ade80', text: '#000000', border: '#4ade80' };
    }

    return null;
}

function renderSchoolCalendar() {
    const container = document.getElementById('view-school-calendar');
    if (!container) return;

    const year = schoolCalDate.getFullYear();
    const month = schoolCalDate.getMonth();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const now = new Date();

    let rawFirstDay = new Date(year, month, 1).getDay();
    let firstDay = (rawFirstDay === 0) ? 6 : rawFirstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let gridHTML = `
        <div class="cal-header">
            <button class="cal-nav-btn" onclick="changeSchoolMonth(-1)">‹</button>
            <h2>${monthNames[month]} ${year}</h2>
            <button class="cal-nav-btn" onclick="changeSchoolMonth(1)">›</button>
        </div>
        <div class="cal-grid">
            <div class="cal-day-name">Mon</div><div class="cal-day-name">Tue</div>
            <div class="cal-day-name">Wed</div><div class="cal-day-name">Thu</div>
            <div class="cal-day-name">Fri</div><div class="cal-day-name">Sat</div>
            <div class="cal-day-name">Sun</div>
    `;

    for (let i = 0; i < firstDay; i++) gridHTML += `<div class="cal-cell cal-empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
        const dayOfWeek = new Date(year, month, d).getDay();
        const status = getNWUStatus(dateStr, dayOfWeek);

        let cellBgStyle = '';
        let circleStyle = '';

        if (status) {
            const bgColor = status.color === 'transparent' ? 'transparent' : `color-mix(in srgb, ${status.color} 25%, #0f0f0f)`;
            cellBgStyle = `style="background: ${bgColor}; border-color: ${status.border};"`;
            circleStyle = `style="border: 2px solid ${status.border}; color: ${status.text};"`;
        }

        gridHTML += `
            <div class="cal-cell ${isToday ? 'cal-today' : ''}" ${cellBgStyle}>
                <div class="cal-date-num" ${circleStyle}>${d}</div>
            </div>
        `;
    }
    gridHTML += `</div>`;

    const legendHTML = `
        <div class="cal-list-header">
            <div>
                <h3>NWU 2026</h3>
                <p>Academic Framework</p>
            </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px; font-size: 0.75rem; color: #ccc;">
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #fb923c;"></span> University recess</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #ef4444;"></span> 1st examination opportunity</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #93c5fd;"></span> 2nd examination opportunity</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #fdba74;"></span> Assessment</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #1e3a8a;"></span> Inter-campus sports day</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #facc15;"></span> Interchanges of days</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #1f1f1f; border: 1px solid #333;"></span> Public holiday</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #3b82f6;"></span> University closed</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #4ade80;"></span> Term / Normal day</div>
        </div>
    `;

    container.innerHTML = `
        <div class="calendar-layout">
            <div class="calendar-left panel">${gridHTML}</div>
            <div class="calendar-right panel">${legendHTML}</div>
        </div>
    `;
}

window.changeSchoolMonth = function(dir) {
    schoolCalDate.setMonth(schoolCalDate.getMonth() + dir);
    renderSchoolCalendar();
};

// ==========================================
// THEME TOGGLE (single clean implementation)
// ==========================================
(function() {
    const savedTheme = localStorage.getItem('goldenPlanTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('themeToggleBtn');
        if (btn) btn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    });
})();

window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('goldenPlanTheme', newTheme);

    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
};

// Alias in case any old markup still references it
window.forceThemeToggle = window.toggleTheme;