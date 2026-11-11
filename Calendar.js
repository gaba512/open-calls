function getCalendar() { if (CONFIG.CALENDAR_ID) { const c = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID); if (c) return c; } const props = PropertiesService.getScriptProperties(), saved = props.getProperty('OPEN_CALLS_CALENDAR_ID'); if (saved) { const c = CalendarApp.getCalendarById(saved); if (c) return c; } let cal = CalendarApp.getOwnedCalendarsByName(CONFIG.CALENDAR_NAME)[0]; if (!cal) cal = CalendarApp.createCalendar(CONFIG.CALENDAR_NAME, { summary: 'Open call deadlines', timeZone: CONFIG.TIMEZONE, color: CalendarApp.Color.PURPLE }); props.setProperty('OPEN_CALLS_CALENDAR_ID', cal.getId()); return cal; }
function getEventSafe_(id) { let ev = null; try { ev = getCalendar().getEventById(id); } catch (e) {} if (!ev) { try { ev = CalendarApp.getDefaultCalendar().getEventById(id); } catch (e) {} } return ev; }
function eventTitle_(title, artists, time) { return 'DEADLINE: ' + (title || 'Open call') + (artists && artists.length ? ' - ' + artists.join(', ') : '') + (time ? ' (' + time + ')' : ''); }
function dateText_(v, fmt) { return v instanceof Date ? Utilities.formatDate(v, CONFIG.TIMEZONE, fmt || 'd MMM yyyy') : String(v || ''); }
function eventDescription_(d, link, artists) { return [artists.length && 'Artists: ' + artists.join(', '), d.organiser && 'Organiser: ' + d.organiser, d.type && 'Category: ' + d.type, d.location && 'Location: ' + d.location, d.fee && 'Fee: ' + d.fee, d.eligibility && 'Eligibility: ' + d.eligibility, d.event_dates && 'Event dates: ' + d.event_dates, d.announcement_date && 'Results announced: ' + d.announcement_date, d.summary, link && 'Application link: ' + link, 'Open in the Open Calls app: ' + CONFIG.APP_URL].filter(Boolean).join('\n'); }
function syncCalendar_(inbox, rowNum) {
  try {
    const hi = headerIndex(inbox), cell = function (h) { const i = hi.map[h]; return i === undefined ? '' : inbox.getRange(rowNum, i + 1).getValue(); };
    const title = String(cell('title') || '').trim(), status = String(cell('status') || '').trim(), deadline = validDate_(dateText_(cell('deadline'), 'yyyy-MM-dd')), artists = splitNames(cell('artists')), want = !!deadline && artists.length > 0 && status !== 'Archived';
    const oldId = String(cell('calendar event id') || ''), existing = oldId && oldId.indexOf('error') === -1 ? getEventSafe_(oldId) : null; let eventId = '';
    if (!want) { if (existing) existing.deleteEvent(); } 
    else {
      const d = { title: title, deadline: deadline, type: String(cell('category') || ''), organiser: String(cell('organiser') || ''), location: String(cell('location') || ''), fee: String(cell('application fee') || ''), eligibility: String(cell('eligibility') || ''), event_dates: dateText_(cell('event dates')), announcement_date: dateText_(cell('announcement date')), summary: String(cell('summary') || '') };
      const link = String(cell('application link') || ''), description = eventDescription_(d, link, artists);
      if (existing) { existing.setTitle(eventTitle_(title, artists)); existing.setAllDayDate(toDate(deadline)); existing.setDescription(description); eventId = existing.getId(); } 
      else { const ev = getCalendar().createAllDayEvent(eventTitle_(title, artists), toDate(deadline), { description: description }); ev.removeAllReminders(); CONFIG.REMINDER_DAYS.forEach(function (n) { ev.addPopupReminder(n * 24 * 60); }); eventId = ev.getId(); }
    }
    if (hi.map['calendar event id'] !== undefined && eventId !== oldId) inbox.getRange(rowNum, hi.map['calendar event id'] + 1).setValue(eventId);
  } catch (err) { logProblem('Calendar', 'warning', err.message, { title: 'row ' + rowNum }); }
}
// Retired: calendar events are now created per artist application when that artist becomes Interested (see setArtistCallEvent_).
