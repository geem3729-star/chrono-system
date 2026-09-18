/* ============================================================
   GOLDEN PLAN - Main JavaScript
   Firebase Auth + Database
   ============================================================ */

// ---------- FIREBASE IMPORTS ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ---------- FIREBASE CONFIG ----------
const firebaseConfig = {
    apiKey: "AIzaSyB3YOrV6h6gYkPa6O1SaSJXbAemmfMu3Lg",
    authDomain: "chronos-system-e3d4c.firebaseapp.com",
    databaseURL: "https://chronos-system-e3d4c-default-rtdb.firebaseio.com",
    projectId: "chronos-system-e3d4c",
    storageBucket: "chronos-system-e3d4c.firebasestorage.app",
    messagingSenderId: "314230379065",
    appId: "1:314230379065:web:22827183f5e4cb7f7173e8"
};

// ---------- INITIALIZE ----------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// ---------- STATE ----------
let currentUser = null;
let events = [];
let modules = [];

// ============================================================
// VIEW SWITCHER - changes which view is visible
// ============================================================
window.switchView = function(viewName, el) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Show the target view
    const view = document.getElementById('view-' + viewName);
    if (view) view.classList.add('active');

    // Highlight the clicked nav item
    if (el) el.classList.add('active');
};

// ============================================================
// AUTHENTICATION
// ============================================================

// Google Sign-In button
document.getElementById('googleSignInBtn').addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (e) {
        alert('Sign-in failed: ' + e.message);
    }
});

// Logout
window.handleLogout = async function() {
    if (confirm('Logout?')) await signOut(auth);
};

// Watch auth state
onAuthStateChanged(auth, async (user) => {
    document.getElementById('loadingScreen').style.display = 'none';

    if (user) {
        // User is signed in
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
    } else {
        // Not signed in
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
});

// ============================================================
// LOAD DATA FROM FIREBASE
// ============================================================
async function loadData() {
    if (!currentUser) return;

    try {
        const dbRef = ref(db);

        // Load events
        const eventsSnap = await get(child(dbRef, `users/${currentUser.uid}/events`));
        if (eventsSnap.exists()) {
            const data = eventsSnap.val();
            events = Array.isArray(data) ? data.filter(e => e) : Object.values(data).filter(e => e);
        } else {
            events = [];
        }

        // Load modules
        const modSnap = await get(child(dbRef, `users/${currentUser.uid}/modules`));
        if (modSnap.exists()) {
            const data = modSnap.val();
            modules = Array.isArray(data) ? data.filter(m => m) : Object.values(data).filter(m => m);
        } else {
            modules = [];
        }
    } catch (e) {
        console.error('Load error:', e);
    }
}

// ============================================================
// TIME HELPERS
// ============================================================
function getTimeRemaining(iso) {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: true };
    }
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
}

// ---------- MODULES ----------
function renderModules() {
    const row = document.getElementById('modulesRow');

    if (!modules.length) {
        row.innerHTML = `
            <div class="module-card" style="grid-column:1/-1;">
                <p style="color:#666;font-size:0.8rem;padding:20px;">
                    No modules yet. Add modules coming soon.
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

        let color = '#4ade80';
        if (mark < 50) color = '#f87171';
        else if (mark < 60) color = '#fb923c';
        else if (mark < 75) color = '#facc15';

        let badgeClass = 'eligible', badgeText = '✅ Eligible';
        if (mark < 50) { badgeClass = 'atrisk'; badgeText = '⚠️ At Risk'; }
        else if (mark < 60) { badgeClass = 'warning'; badgeText = '🟡 Warning'; }

        html += `
            <div class="module-card">
                <div class="module-header">
                    <div>
                        <span class="module-name">${m.name || 'Module'}</span>
                        <span class="module-full">${m.fullName || ''}</span>
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

// ---------- UPCOMING COUNTDOWNS ----------
function renderUpcoming() {
    const container = document.getElementById('upcomingCountdowns');
    const now = Date.now();

    const upcoming = events
        .filter(e => new Date(e.deadline).getTime() > now)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 4);

    if (!upcoming.length) {
        container.innerHTML = '<p style="color:#666;font-size:0.8rem;">No upcoming deadlines</p>';
        return;
    }

    let html = '';
    upcoming.forEach(e => {
        const r = getTimeRemaining(e.deadline);
        const dateObj = new Date(e.deadline);
        const dateStr = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const color = e.color || '#ff8c00';

        html += `
            <div class="countdown-mini" style="border-left-color:${color};">
                <div class="cm-header">
                    <span class="cm-title">${e.title || 'Deadline'}</span>
                    <span class="cm-date">${dateStr} · ${timeStr}</span>
                </div>
                <div class="cm-grid">
                    <div class="cm-item">
                        <span class="cm-num">${String(r.days).padStart(2, '0')}</span>
                        <span class="cm-lbl">DAYS</span>
                    </div>
                    <div class="cm-item">
                        <span class="cm-num">${String(r.hours).padStart(2, '0')}</span>
                        <span class="cm-lbl">HRS</span>
                    </div>
                    <div class="cm-item">
                        <span class="cm-num">${String(r.minutes).padStart(2, '0')}</span>
                        <span class="cm-lbl">MIN</span>
                    </div>
                    <div class="cm-item">
                        <span class="cm-num">${String(r.seconds).padStart(2, '0')}</span>
                        <span class="cm-lbl">SEC</span>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ---------- ASSESSMENTS TABLE ----------
function renderAssessTable() {
    const body = document.getElementById('assessBody');
    const recent = [...events]
        .sort((a, b) => new Date(b.deadline) - new Date(a.deadline))
        .slice(0, 5);

    if (!recent.length) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:20px;">No assessments yet</td></tr>';
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

// ============================================================
// LIVE UPDATE - updates countdowns every second
// ============================================================
setInterval(() => {
    if (currentUser) {
        renderUpcoming();
    }
}, 1000);

console.log('👑 Golden Plan loaded!');