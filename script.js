/* ============================================================
   GOLDEN PLAN - Main JavaScript
   Firebase Auth + Database + Modules (with Presets)
   ============================================================ */

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

// ============================================================
// VIEW SWITCHER
// ============================================================
window.switchView = function(viewName, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const view = document.getElementById('view-' + viewName);
    if (view) view.classList.add('active');
    if (el) el.classList.add('active');
    if (viewName === 'modules') renderModulesList();
    if (viewName === 'dashboard') renderDashboard();
};

// ============================================================
// AUTH
// ============================================================
document.getElementById('googleSignInBtn').addEventListener('click', async () => {
    try { await signInWithPopup(auth, provider); } 
    catch (e) { alert('Sign-in failed: ' + e.message); }
});

window.handleLogout = async function() {
    if (confirm('Logout?')) await signOut(auth);
};

onAuthStateChanged(auth, async (user) => {
    document.getElementById('loadingScreen').style.display = 'none';
    if (user) {
        currentUser = user;
        const name = user.displayName || user.email.split('@')[0];
        const initial = name.charAt(0).toUpperCase();
        document.getElementById('userName').textContent = name;
        document.getElementById('userAvatar').textContent = initial;
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

// ============================================================
// SETUP MODULE FORM (preset + slider sync)
// ============================================================
function setupModuleForm() {
    const preset = document.getElementById('presetModule');
    const codeInput = document.getElementById('moduleCode');
    const nameInput = document.getElementById('moduleName');
    const markSlider = document.getElementById('moduleMarkSlider');
    const markNum = document.getElementById('moduleMark');
    const markDisplay = document.getElementById('markDisplay');

    // Preset dropdown → auto-fill code + name
    preset.addEventListener('change', () => {
        const val = preset.value;
        if (val === '' || val === 'CUSTOM') {
            codeInput.value = '';
            nameInput.value = '';
            codeInput.focus();
            return;
        }
        const [code, name] = val.split('|');
        codeInput.value = code;
        nameInput.value = name;
    });

    // Slider → sync number + display
    markSlider.addEventListener('input', () => {
        markNum.value = markSlider.value;
        markDisplay.textContent = markSlider.value;
    });

    // Number → sync slider + display
    markNum.addEventListener('input', () => {
        let v = Math.max(0, Math.min(100, Number(markNum.value) || 0));
        markSlider.value = v;
        markDisplay.textContent = v;
    });

    // Also update display when user types in code/name manually
    codeInput.addEventListener('input', () => {
        if (codeInput.value.trim() !== '') {
            // User is typing manually, keep it
        }
    });
}

// ============================================================
// LOAD DATA
// ============================================================
async function loadData() {
    if (!currentUser) return;
    try {
        const dbRef = ref(db);
        const eventsSnap = await get(child(dbRef, `users/${currentUser.uid}/events`));
        if (eventsSnap.exists()) {
            const data = eventsSnap.val();
            events = Array.isArray(data) ? data.filter(e => e) : Object.values(data).filter(e => e);
        } else events = [];

        const modSnap = await get(child(dbRef, `users/${currentUser.uid}/modules`));
        if (modSnap.exists()) {
            const data = modSnap.val();
            modules = Array.isArray(data) ? data.filter(m => m) : Object.values(data).filter(m => m);
        } else modules = [];
    } catch (e) { console.error('Load error:', e); }
}

// ============================================================
// SAVE MODULES
// ============================================================
async function saveModules() {
    if (!currentUser) return;
    try {
        await set(ref(db, `users/${currentUser.uid}/modules`), modules);
    } catch (e) {
        console.error('Save error:', e);
        alert('⚠️ Could not save module. Check internet.');
    }
}

// ============================================================
// ADD MODULE
// ============================================================
document.getElementById('addModuleBtn').addEventListener('click', async () => {
    const code = document.getElementById('moduleCode').value.trim().toUpperCase();
    const name = document.getElementById('moduleName').value.trim();
    const mark = Number(document.getElementById('moduleMark').value) || 0;
    const color = document.getElementById('moduleColor').value;

    if (!code) return alert('⚠️ Please pick from the dropdown or type a module code');
    if (mark < 0 || mark > 100) return alert('⚠️ Mark must be between 0 and 100');
    if (modules.find(m => m.code === code)) {
        return alert('⚠️ Module "' + code + '" already exists');
    }

    const newModule = {
        id: Date.now(),
        code: code,
        name: name || code,
        currentMark: mark,
        color: color,
        createdAt: new Date().toISOString()
    };

    modules.push(newModule);
    await saveModules();

    // Reset form
    document.getElementById('presetModule').value = '';
    document.getElementById('moduleCode').value = '';
    document.getElementById('moduleName').value = '';
    document.getElementById('moduleMarkSlider').value = 50;
    document.getElementById('moduleMark').value = 50;
    document.getElementById('markDisplay').textContent = '50';
    document.getElementById('moduleColor').value = '#ff8c00';

    renderModulesList();
    renderDashboard();
    alert('✅ Module "' + code + '" added!');
});

// ============================================================
// DELETE MODULE
// ============================================================
window.deleteModule = async function(id) {
    if (!confirm('Delete this module?')) return;
    modules = modules.filter(m => m.id !== id);
    await saveModules();
    renderModulesList();
    renderDashboard();
};

// ============================================================
// TIME HELPERS
// ============================================================
function getTimeRemaining(iso) {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: true };
    const s = Math.floor(diff / 1000);
    return {
        days: Math.floor(s / 86400),
        hours: Math.floor((s % 86400) / 3600),
        minutes: Math.floor((s % 3600) / 60),
        seconds: s % 60,
        isOverdue: false
    };
}

// ============================================================
// RENDER DASHBOARD
// ============================================================
function renderDashboard() {
    renderModules();
    renderUpcoming();
    renderAssessTable();
    renderExamEligibility();
}

function renderModules() {
    const row = document.getElementById('modulesRow');
    if (!row) return;

    if (!modules.length) {
        row.innerHTML = `
            <div class="module-card" style="grid-column:1/-1;">
                <p style="color:#888;font-size:0.9rem;padding:24px;text-align:center;">
                    No modules yet. Go to <strong style="color:#ff8c00;">Modules</strong> to add them.
                </p>
            </div>
            <div class="overall-card">
                <div class="trophy">🏆</div>
                <div class="overall-pct">0%</div>
                <div class="overall-label">Overall Average</div>
                <div class="overall-tagline">Add modules to begin</div>
            </div>
        `;
        return;
    }

    let html = '';
    let total = 0;
    modules.forEach(m => {
        const mark = m.currentMark || 0;
        total += mark;
        const pct = Math.min(100, mark);
        const circumference = 2 * Math.PI * 36;
        const offset = circumference - (pct / 100) * circumference;
        const color = m.color || '#ff8c00';
        let badgeClass = 'eligible', badgeText = '✅ Eligible';
        if (mark < 50) { badgeClass = 'atrisk'; badgeText = '⚠️ At Risk'; }
        else if (mark < 60) { badgeClass = 'warning'; badgeText = '🟡 Warning'; }

        html += `
            <div class="module-card">
                <div class="module-header">
                    <div>
                        <span class="module-name">${m.code}</span>
                        <span class="module-full">${m.name}</span>
                    </div>
                </div>
                <div class="module-ring">
                    <svg viewBox="0 0 90 90">
                        <circle class="ring-bg" cx="45" cy="45" r="36"/>
                        <circle class="ring-progress" cx="45" cy="45" r="36"
                                stroke="${color}"
                                stroke-dasharray="${circumference}"
                                stroke-dashoffset="${offset}"/>
                    </svg>
                    <div class="center">
                        <div class="pct">${mark}%</div>
                        <div class="pct-label">CURRENT</div>
                    </div>
                </div>
                <div class="module-mark">${mark} / 100</div>
                <div class="module-badge ${badgeClass}">${badgeText}</div>
            </div>
        `;
    });

    const avg = Math.round(total / modules.length);
    let avgTagline = 'Good Progress!';
    if (avg < 50) avgTagline = 'Needs Focus!';
    else if (avg < 60) avgTagline = 'Keep Pushing!';
    else if (avg >= 75) avgTagline = 'Excellent!';

    html += `
        <div class="overall-card">
            <div class="trophy">🏆</div>
            <div class="overall-pct">${avg}%</div>
            <div class="overall-label">Overall Average</div>
            <div class="overall-tagline">${avgTagline}</div>
        </div>
    `;
    row.innerHTML = html;
}

function renderModulesList() {
    const list = document.getElementById('modulesList');
    if (!list) return;
    if (!modules.length) {
        list.innerHTML = '<p style="color:#888; font-size:0.9rem; grid-column:1/-1; padding:20px;">No modules yet. Add one above.</p>';
        return;
    }
    let html = '';
    modules.forEach(m => {
        const mark = m.currentMark || 0;
        const pct = Math.min(100, mark);
        const circumference = 2 * Math.PI * 36;
        const offset = circumference - (pct / 100) * circumference;
        const color = m.color || '#ff8c00';
        html += `
            <div class="module-card" style="position:relative;">
                <button onclick="deleteModule(${m.id})" 
                        style="position:absolute; top:12px; right:12px; width:28px; height:28px; background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.3); border-radius:50%; color:#f87171; cursor:pointer; font-size:0.8rem;">✕</button>
                <div class="module-header">
                    <div>
                        <span class="module-name">${m.code}</span>
                        <span class="module-full">${m.name}</span>
                    </div>
                </div>
                <div class="module-ring">
                    <svg viewBox="0 0 90 90">
                        <circle class="ring-bg" cx="45" cy="45" r="36"/>
                        <circle class="ring-progress" cx="45" cy="45" r="36"
                                stroke="${color}"
                                stroke-dasharray="${circumference}"
                                stroke-dashoffset="${offset}"/>
                    </svg>
                    <div class="center">
                        <div class="pct">${mark}%</div>
                        <div class="pct-label">CURRENT</div>
                    </div>
                </div>
                <div class="module-mark">${mark} / 100</div>
            </div>
        `;
    });
    list.innerHTML = html;
}

function renderUpcoming() {
    const container = document.getElementById('upcomingCountdowns');
    if (!container) return;
    const now = Date.now();
    const upcoming = events
        .filter(e => new Date(e.deadline).getTime() > now)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 4);
    if (!upcoming.length) {
        container.innerHTML = '<p style="color:#888;font-size:0.9rem;">No upcoming deadlines</p>';
        return;
    }
    let html = '';
    upcoming.forEach(e => {
        const r = getTimeRemaining(e.deadline);
        const dateObj = new Date(e.deadline);
        const dateStr = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        html += `
            <div class="countdown-mini">
                <div class="cm-header">
                    <span class="cm-title">${e.title || 'Deadline'}</span>
                    <span class="cm-date">${dateStr} · ${timeStr}</span>
                </div>
                <div class="cm-grid">
                    <div class="cm-item"><span class="cm-num">${String(r.days).padStart(2, '0')}</span><span class="cm-lbl">DAYS</span></div>
                    <div class="cm-item"><span class="cm-num">${String(r.hours).padStart(2, '0')}</span><span class="cm-lbl">HRS</span></div>
                    <div class="cm-item"><span class="cm-num">${String(r.minutes).padStart(2, '0')}</span><span class="cm-lbl">MIN</span></div>
                    <div class="cm-item"><span class="cm-num">${String(r.seconds).padStart(2, '0')}</span><span class="cm-lbl">SEC</span></div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderAssessTable() {
    const body = document.getElementById('assessBody');
    if (!body) return;
    const recent = [...events].sort((a, b) => new Date(b.deadline) - new Date(a.deadline)).slice(0, 5);
    if (!recent.length) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:20px;">No assessments yet</td></tr>';
        return;
    }
    let html = '';
    recent.forEach(e => {
        const dateObj = new Date(e.deadline);
        const dateStr = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        const isPast = dateObj.getTime() < Date.now();
        const statusClass = isPast ? 'status-ok' : 'status-pending';
        const statusText = isPast ? '✅ Completed' : '⏳ Upcoming';
        html += `
            <tr>
                <td>
                    <div class="assess-name">${e.title || 'Assessment'}</div>
                    <div class="assess-module">${e.module || 'No module'}</div>
                </td>
                <td>${e.weight || 0}%</td>
                <td>${dateStr}</td>
                <td>${e.currentMark || '-'} / 100</td>
                <td class="${statusClass}">${statusText}</td>
            </tr>
        `;
    });
    body.innerHTML = html;
}

function renderExamEligibility() {
    const list = document.getElementById('examEligList');
    if (!list) return;
    if (!modules.length) {
        list.innerHTML = '<p style="color:#888;font-size:0.9rem;">Add modules to check eligibility</p>';
        return;
    }
    let html = '';
    modules.forEach(m => {
        const mark = m.currentMark || 0;
        const eligible = mark >= 50;
        html += `
            <div class="eligibility-item">
                <div>
                    <div class="elig-name">${m.code}</div>
                    <div class="elig-note">${eligible ? 'You qualify to write the exam' : 'Need 50% to qualify'}</div>
                </div>
                <div class="elig-status ${eligible ? 'eligible' : 'notyet'}">
                    ${eligible ? '✅ Eligible' : '⚠️ Not Yet'}
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
}

setInterval(() => { if (currentUser) renderUpcoming(); }, 1000);
console.log('👑 Golden Plan loaded with Modules!');