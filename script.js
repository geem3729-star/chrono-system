/*
===========================================
CHRONOS SYSTEM V4 - WITH CARD THUMBNAILS
Live Countdown + Accountability System
===========================================
*/

// ===============================
// HTML ELEMENTS
// ===============================

const eventTitle = document.getElementById("eventTitle");
const category = document.getElementById("category");
const moduleSelect = document.getElementById("module");
const assessmentType = document.getElementById("assessmentType");
const weight = document.getElementById("weight");
const currentMark = document.getElementById("currentMark");
const targetMark = document.getElementById("targetMark");
const eventDate = document.getElementById("eventDate");
const eventTime = document.getElementById("eventTime");
const consequence = document.getElementById("consequence");
const severity = document.getElementById("severity");
const thumbnail = document.getElementById("thumbnail");
const addButton = document.getElementById("addButton");
const eventsContainer = document.getElementById("eventsContainer");
const totalAssessments = document.getElementById("totalAssessments");
const averageMark = document.getElementById("averageMark");
const upcomingCount = document.getElementById("upcomingCount");
const targetAverage = document.getElementById("targetAverage");

// ===============================
// MODULE COLORS
// ===============================

const moduleColors = {
    CMPG172: "#ff8c00",
    MTHS171: "#4ade80",
    MTHS172: "#22c55e",
    APPM172: "#ef4444",
    NPHY172: "#e91e63",
    STTN111: "#8b5cf6",
    Other: "#607d8b"
};

// ===============================
// SEVERITY CONFIG
// ===============================

const severityConfig = {
    low: { label: "🟢 Low", color: "#4ade80", stakes: 20, icon: "⚡" },
    medium: { label: "🟡 Medium", color: "#facc15", stakes: 50, icon: "🔥" },
    high: { label: "🟠 High", color: "#fb923c", stakes: 80, icon: "💀" },
    critical: { label: "🔴 CRITICAL", color: "#ef4444", stakes: 100, icon: "☠️" }
};

// ===============================
// LOAD EVENTS
// ===============================

let events = JSON.parse(localStorage.getItem("chronosEvents")) || [];

// ===============================
// SAVE EVENTS
// ===============================

function saveEvents() {
    localStorage.setItem("chronosEvents", JSON.stringify(events));
}

// ===============================
// CLEAR FORM
// ===============================

function clearForm() {
    eventTitle.value = "";
    category.selectedIndex = 0;
    moduleSelect.selectedIndex = 0;
    assessmentType.selectedIndex = 0;
    weight.value = "";
    currentMark.value = "";
    targetMark.value = "";
    eventDate.value = "";
    eventTime.value = "";
    consequence.value = "";
    severity.value = "medium";
    thumbnail.value = "";
}

// ===============================
// ADD EVENT
// ===============================

function addEvent() {
    if (eventTitle.value.trim() === "" || eventDate.value === "" || eventTime.value === "") {
        alert("⚠️ Please complete all required fields.");
        return;
    }

    const selectedModule = moduleSelect.value;
    const severityLevel = severity.value;
    
    const event = {
        id: Date.now(),
        title: eventTitle.value.trim(),
        category: category.value,
        module: selectedModule,
        assessmentType: assessmentType.value,
        weight: Number(weight.value) || 0,
        currentMark: Number(currentMark.value) || 0,
        targetMark: Number(targetMark.value) || 0,
        color: moduleColors[selectedModule] || "#ff8c00",
        deadline: eventDate.value + "T" + eventTime.value,
        createdAt: new Date().toISOString(),
        consequence: consequence.value.trim() || "No consequence specified",
        severity: severityLevel,
        severityConfig: severityConfig[severityLevel],
        thumbnail: null // Will be set if image uploaded
    };

    // Handle thumbnail upload
    if (thumbnail.files && thumbnail.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            event.thumbnail = e.target.result;
            events.push(event);
            saveEvents();
            displayEvents();
            updateDashboard();
            clearForm();
        };
        reader.readAsDataURL(thumbnail.files[0]);
    } else {
        events.push(event);
        saveEvents();
        displayEvents();
        updateDashboard();
        clearForm();
    }
}

// ===============================
// DELETE EVENT
// ===============================

function deleteEvent(id) {
    if (confirm("Delete this assessment?")) {
        events = events.filter(event => event.id !== id);
        saveEvents();
        displayEvents();
        updateDashboard();
    }
}

// ===============================
// GET TIME REMAINING
// ===============================

function getTimeRemaining(deadlineISO) {
    const now = new Date().getTime();
    const deadline = new Date(deadlineISO).getTime();
    const diff = deadline - now;

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isOverdue: true };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds, totalSeconds, isOverdue: false };
}

// ===============================
// GET COUNTDOWN STATUS
// ===============================

function getCountdownStatus(totalSeconds) {
    if (totalSeconds <= 0) return { label: "⏰ OVERDUE", class: "overdue" };
    if (totalSeconds < 86400) return { label: "🔴 URGENT", class: "urgent" };
    if (totalSeconds < 604800) return { label: "🟡 SOON", class: "warning" };
    return { label: "🟢 ON TRACK", class: "" };
}

// ===============================
// GET STATUS
// ===============================

function getStatus(mark) {
    if (mark >= 75) return { label: "🌟 Excellent", class: "excellent" };
    if (mark >= 60) return { label: "✅ Good", class: "good" };
    if (mark >= 50) return { label: "⚠️ Warning", class: "warning" };
    return { label: "🚨 At Risk", class: "risk" };
}

// ===============================
// GET CONSEQUENCE URGENCY
// ===============================

function getConsequenceUrgency(totalSeconds) {
    if (totalSeconds <= 0) return "emergency";
    if (totalSeconds < 86400) return "emergency";
    if (totalSeconds < 604800) return "urgent";
    return "";
}

// ===============================
// DISPLAY EVENTS - WITH THUMBNAILS
// ===============================

function displayEvents() {
    if (events.length === 0) {
        eventsContainer.innerHTML = `
            <div class="empty-state">
                <div class="icon">📋</div>
                <h3>No assessments yet.<br>Add one above to start tracking!</h3>
            </div>
        `;
        return;
    }

    const sorted = [...events].sort((a, b) => 
        new Date(a.deadline) - new Date(b.deadline)
    );

    let html = "";
    sorted.forEach(event => {
        const remaining = getTimeRemaining(event.deadline);
        const status = getStatus(event.currentMark);
        const countdownStatus = getCountdownStatus(remaining.totalSeconds);
        const conUrgency = getConsequenceUrgency(remaining.totalSeconds);
        
        const severityInfo = event.severityConfig || severityConfig.medium;
        const stakesPercent = Math.min(severityInfo.stakes + (remaining.totalSeconds <= 0 ? 20 : 0), 100);

        const d = String(remaining.days).padStart(2, '0');
        const h = String(remaining.hours).padStart(2, '0');
        const m = String(remaining.minutes).padStart(2, '0');
        const s = String(remaining.seconds).padStart(2, '0');

        const dateObj = new Date(event.deadline);
        const dateStr = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        const timeStr = dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // ===== PIE TIMER CALCULATION =====
        const maxSeconds = 90 * 86400;
        const totalSecs = remaining.totalSeconds;
        let percentRemaining = 0;
        let pieClass = "";

        if (remaining.isOverdue) {
            percentRemaining = 0;
            pieClass = "overdue";
        } else if (totalSecs > maxSeconds) {
            percentRemaining = 100;
        } else {
            percentRemaining = (totalSecs / maxSeconds) * 100;
        }

        percentRemaining = Math.max(0, Math.min(100, percentRemaining));
        
        let pieColor = "#4ade80";
        if (remaining.isOverdue) {
            pieColor = "#ef4444";
            pieClass = "overdue";
        } else if (totalSecs < 86400) {
            pieColor = "#f87171";
            pieClass = "danger";
        } else if (totalSecs < 604800) {
            pieColor = "#facc15";
            pieClass = "urgent";
        } else if (totalSecs < 1209600) {
            pieColor = "#fb923c";
            pieClass = "warning";
        }

        const circumference = 2 * Math.PI * 34;
        const offset = circumference - (percentRemaining / 100) * circumference;

        // ===== THUMBNAIL =====
        const hasThumbnail = event.thumbnail && event.thumbnail !== "null";
        const thumbnailHTML = hasThumbnail ? `
            <div class="card-thumbnail" style="background-image: url('${event.thumbnail}');">
                <div class="overlay">
                    <span class="module-tag">${event.module}</span>
                    <span class="category-tag">${event.category}</span>
                </div>
            </div>
        ` : `
            <div class="card-thumbnail no-image"></div>
        `;

        // ===== CONSEQUENCE =====
        let consequenceHTML = `
            <div class="consequence-box severity-${event.severity} ${conUrgency}">
                <span class="label">⚠️ CONSEQUENCE</span>
                <div class="text">
                    ${event.consequence || 'No consequence specified'}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; flex-wrap: wrap; gap: 8px;">
                    <span class="severity-badge">${severityInfo.icon} ${severityInfo.label}</span>
                    <div class="stakes-meter" style="flex:1; min-width:100px;">
                        <span style="font-size:0.6rem; color:#666;">Stakes</span>
                        <div class="bar-track">
                            <div class="bar-fill" style="width: ${stakesPercent}%; background: ${severityInfo.color};"></div>
                        </div>
                        <span class="stakes-label">${stakesPercent}%</span>
                    </div>
                </div>
            </div>
        `;

        html += `
            <div class="card ${hasThumbnail ? 'has-thumbnail' : ''}" style="border-left-color: ${event.color};">
                
                ${thumbnailHTML}

                <div class="card-content">
                    <h2>${event.title}</h2>
                    <p><strong>📚 Module:</strong> ${event.module}</p>
                    <p><strong>📂 Category:</strong> ${event.category}</p>
                    <p><strong>📝 Type:</strong> ${event.assessmentType}</p>
                    <p><strong>🎯 Weight:</strong> ${event.weight}%</p>
                    <p><strong>📊 Current:</strong> ${event.currentMark}%</p>
                    <p><strong>🏆 Target:</strong> ${event.targetMark}%</p>
                    
                    <div class="progress">
                        <div class="progress-bar" style="width: ${Math.min(event.currentMark, 100)}%; background: ${event.color};"></div>
                    </div>

                    ${consequenceHTML}

                    <!-- PIE TIMER + COUNTDOWN -->
                    <div class="countdown-wrapper">
                        <div class="pie-timer ${pieClass}">
                            <svg viewBox="0 0 80 80" width="80" height="80">
                                <circle class="glow" cx="40" cy="40" r="34"/>
                                <circle class="bg" cx="40" cy="40" r="34"/>
                                <circle class="progress" 
                                        cx="40" cy="40" r="34"
                                        stroke="${pieColor}"
                                        stroke-dasharray="${circumference}"
                                        stroke-dashoffset="${offset}"
                                        style="transition: stroke-dashoffset 1s ease, stroke 0.5s ease;"/>
                                <text class="center-text" x="40" y="36" fill="#fff" font-size="18" font-weight="800">
                                    ${remaining.isOverdue ? '0' : remaining.days}
                                </text>
                                <text class="center-label" x="40" y="50" fill="#666" font-size="7">
                                    ${remaining.isOverdue ? 'OVERDUE' : 'DAYS'}
                                </text>
                            </svg>
                        </div>

                        <div class="countdown-numbers">
                            <div class="unit">
                                <span class="number">${d}</span>
                                <span class="label">Days</span>
                            </div>
                            <div class="unit">
                                <span class="number">${h}</span>
                                <span class="label">Hrs</span>
                            </div>
                            <div class="unit">
                                <span class="number">${m}</span>
                                <span class="label">Min</span>
                            </div>
                            <div class="unit">
                                <span class="number">${s}</span>
                                <span class="label">Sec</span>
                            </div>
                        </div>
                    </div>

                    <div class="card-footer">
                        <span class="status-badge ${status.class}">${status.label}</span>
                        <span style="color: #666; font-size: 0.75rem;">${dateStr} · ${timeStr}</span>
                        <button class="delete-btn" onclick="deleteEvent(${event.id})">✕</button>
                    </div>
                </div>
            </div>
        `;
    });

    eventsContainer.innerHTML = html;
}

// ===============================
// UPDATE DASHBOARD
// ===============================

function updateDashboard() {
    totalAssessments.textContent = events.length;

    let currentTotal = 0;
    let targetTotal = 0;
    let upcoming = 0;
    const now = new Date().getTime();

    events.forEach(event => {
        currentTotal += event.currentMark;
        targetTotal += event.targetMark;
        if (new Date(event.deadline).getTime() > now) {
            upcoming++;
        }
    });

    if (events.length > 0) {
        averageMark.textContent = (currentTotal / events.length).toFixed(1) + "%";
        targetAverage.textContent = (targetTotal / events.length).toFixed(1) + "%";
    } else {
        averageMark.textContent = "0%";
        targetAverage.textContent = "0%";
    }

    upcomingCount.textContent = upcoming;
}

// ===============================
// LIVE UPDATE LOOP
// ===============================

function liveUpdate() {
    displayEvents();
    updateDashboard();
}

// ===============================
// BUTTON EVENT
// ===============================

addButton.addEventListener("click", addEvent);

document.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && e.target.closest(".form")) {
        addEvent();
    }
});

// ===============================
// AUTO-SET DEFAULT DATE
// ===============================

function setDefaultDateTime() {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    now.setHours(23, 59, 0, 0);
    eventDate.value = now.toISOString().split('T')[0];
    eventTime.value = "23:59";
}

// ===============================
// INIT
// ===============================

setDefaultDateTime();
displayEvents();
updateDashboard();

setInterval(liveUpdate, 1000);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        liveUpdate();
    }
});

console.log("⏳ Chronos System V4 - With Card Thumbnails loaded!");
console.log(`📌 Tracking ${events.length} assessments.`);