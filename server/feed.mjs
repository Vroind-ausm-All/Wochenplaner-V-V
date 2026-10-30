// Euer Plan als iCal-Feed – zum Abonnieren in der Kalender-App des Handys (inkl. Erinnerungen).
import { addDays, serverZone } from './time.mjs';

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const compact = (date, time) => date.replace(/-/g, '') + (time ? `T${time.replace(':', '')}00` : '');

/** Zeilen auf 75 Bytes falten (RFC 5545). */
function fold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = '';
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch, 'utf8') > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
    }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const BERLIN = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Berlin',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
];

const ALARM = { 15: '-PT15M', 60: '-PT1H', 1440: '-P1D' };
const RRULE = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' };

export function buildFeed(state, { tz = serverZone(), now = Date.now() } = {}) {
  const s = state?.settings || {};
  const who = (o) => (o === 'Person A' ? s.personA || 'Person A' : o === 'Person B' ? s.personB || 'Person B' : 'Beide');
  const stamp = new Date(now).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WIR Wochenplaner//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:WIR. Familienplan', `X-WR-TIMEZONE:${tz}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT30M', 'X-PUBLISHED-TTL:PT30M',
    ...(tz === 'Europe/Berlin' ? BERLIN : []),
  ];
  for (const e of state?.events || []) {
    if (!e?.id || !e.date) continue;
    lines.push('BEGIN:VEVENT', `UID:${e.id}@wir-wochenplaner`, `DTSTAMP:${stamp}`);
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${compact(e.date)}`, `DTEND;VALUE=DATE:${compact(addDays(e.date, 1))}`);
    } else {
      const [h, m] = (e.time || '12:00').split(':').map(Number);
      const endMin = h * 60 + m + (Number(e.duration) || 60);
      const endDate = addDays(e.date, Math.floor(endMin / 1440));
      const endTime = `${String(Math.floor((endMin % 1440) / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
      lines.push(`DTSTART;TZID=${tz}:${compact(e.date, e.time || '12:00')}`, `DTEND;TZID=${tz}:${compact(endDate, endTime)}`);
    }
    if (RRULE[e.repeat]) lines.push(`RRULE:FREQ=${RRULE[e.repeat]}`);
    for (const x of e.exDates || []) lines.push(e.allDay ? `EXDATE;VALUE=DATE:${compact(x)}` : `EXDATE;TZID=${tz}:${compact(x, e.time || '12:00')}`);
    lines.push(`SUMMARY:${esc(e.title)}`);
    const desc = [e.owner && `Für: ${who(e.owner)}`, e.category && `Kategorie: ${e.category}`, e.notes].filter(Boolean).join('\n');
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
    if (e.category) lines.push(`CATEGORIES:${esc(e.category)}`);
    if (ALARM[e.reminder]) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, `TRIGGER:${ALARM[e.reminder]}`, 'END:VALARM');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
