let calCurrentDate = new Date();

export function renderCalendar() {
    // Read events directly from the window object to prevent circular import crashes
    const events = window.appEvents || []; 
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
            <div class="cal-day-name">Mon</div><div class="cal-day-name">Tue</div>
            <div class="cal-day-name">Wed</div><div class="cal-day-name">Thu</div>
            <div class="cal-day-name">Fri</div><div class="cal-day-name">Sat</div>
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
        if (d >= todayStart && d < tomorrowStart) todayEvents.push(e);
        else if (d >= tomorrowStart && d < dayAfterStart) tomorrowEvents.push(e);
        else if (d >= dayAfterStart) upcomingEvents.push(e);
        else pastEvents.push(e);
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

    if (todayEvents.length === 0) listHTML += `<div class="cal-group-title">Today</div><div class="cal-empty-msg">No pending event for today</div>`;
    else { listHTML += `<div class="cal-group-title">Today</div>`; todayEvents.forEach(e => listHTML += buildEventRow(e, false)); }

    if (tomorrowEvents.length > 0) { listHTML += `<div class="cal-group-title">Tomorrow</div>`; tomorrowEvents.forEach(e => listHTML += buildEventRow(e, false)); }

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
            <div class="calendar-right panel">${listHTML}</div>
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
    if (list.style.display === 'none') { list.style.display = 'flex'; arrow.textContent = '▲'; } 
    else { list.style.display = 'none'; arrow.textContent = '▼'; }
};

window.toggleCalCompleted = function() {
    const list = document.getElementById('calCompletedList');
    const arrow = document.getElementById('calCompArrow');
    if (list.style.display === 'none') { list.style.display = 'flex'; arrow.textContent = '▲'; } 
    else { list.style.display = 'none'; arrow.textContent = '▼'; }
};

let schoolCalDate = new Date(2026, 1, 1); 

function getNWUStatus(dateStr, dayOfWeek) {
    const blackDays = ['2026-01-01', '2026-03-21', '2026-04-03', '2026-04-06', '2026-04-27', '2026-05-01', '2026-06-15', '2026-06-16', '2026-08-10', '2026-09-24', '2026-12-16', '2026-12-25', '2026-12-26'];
    if (blackDays.includes(dateStr)) return { color: '#1f1f1f', text: '#ffffff', border: '#1f1f1f' };
    if (dateStr >= '2026-12-25' && dateStr <= '2026-12-31' && dayOfWeek !== 0 && dayOfWeek !== 6) return { color: '#1f1f1f', text: '#ffffff', border: '#1f1f1f' };
    if (dateStr === '2026-04-08' || dateStr === '2026-10-20') return { color: '#fdba74', text: '#000000', border: '#fdba74' };
    if ((dateStr >= '2026-04-28' && dateStr <= '2026-04-30') || (dateStr >= '2026-06-25' && dateStr <= '2026-06-26')) return { color: '#facc15', text: '#000000', border: '#facc15' };
    if ((dateStr >= '2026-03-30' && dateStr <= '2026-04-02') || (dateStr >= '2026-04-09' && dateStr <= '2026-04-13') || (dateStr === '2026-04-24') || (dateStr >= '2026-09-25' && dateStr <= '2026-10-02')) return { color: '#fb923c', text: '#000000', border: '#fb923c' };
    if (((dateStr >= '2026-05-25' && dateStr <= '2026-06-12') || (dateStr >= '2026-11-16' && dateStr <= '2026-12-08')) && dayOfWeek !== 0 && dayOfWeek !== 6) return { color: '#ef4444', text: '#ffffff', border: '#ef4444' };
    if (((dateStr >= '2026-06-17' && dateStr <= '2026-06-24') || (dateStr >= '2026-06-29' && dateStr <= '2026-06-30') || (dateStr >= '2026-12-09' && dateStr <= '2026-12-18')) && dayOfWeek !== 0 && dayOfWeek !== 6) return { color: '#93c5fd', text: '#000000', border: '#93c5fd' };
    if (((dateStr >= '2026-02-09' && dateStr <= '2026-03-27') || (dateStr >= '2026-04-07' && dateStr <= '2026-04-23') || (dateStr >= '2026-05-04' && dateStr <= '2026-05-22') || (dateStr >= '2026-07-13' && dateStr <= '2026-09-18') || (dateStr >= '2026-10-05' && dateStr <= '2026-11-13')) && dayOfWeek !== 0 && dayOfWeek !== 6) return { color: '#4ade80', text: '#000000', border: '#4ade80' };
    return null;
}

export function renderSchoolCalendar() {
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
            cellBgStyle = `style="background: ${status.color}33; border-color: ${status.border};"`;
            circleStyle = `style="border: 2px solid ${status.border}; color: ${status.text}; background: ${status.color};"`;
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
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 16px; font-size: 0.75rem; color: #ccc;">
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #4ade80;"></span> Classes</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #fb923c;"></span> University recess</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #ef4444;"></span> 1st examination opportunity</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #93c5fd;"></span> 2nd examination opportunity</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #facc15;"></span> Distance learning / Interchanges</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #fdba74;"></span> Assessment</div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 4px; background: #1f1f1f; border: 1px solid #333;"></span> Public holiday / Closed</div>
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