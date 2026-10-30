import { describe, expect, it } from 'vitest';
import { expandIcs } from './ical';

const cal = (...events: string[]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Test//DE', ...events, 'END:VCALENDAR'].join('\r\n');
const ev = (...lines: string[]) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n');
const brief = (o: ReturnType<typeof expandIcs>) => o.map((x) => `${x.date} ${x.allDay ? 'ganztags' : x.time} ${x.title}${x.span ? ` ${x.span.day}/${x.span.of}` : ''}`);

describe('iCalendar-Abos', () => {
  it('liest Einzeltermine mit Zeitzone, UTC, Dauer und Escapes', () => {
    const text = cal(
      ev('UID:1', 'SUMMARY:Elternabend\\, Klasse 2a', 'DTSTART;TZID=Europe/Berlin:20261103T190000', 'DTEND;TZID=Europe/Berlin:20261103T203000', 'LOCATION:Schule'),
      ev('UID:2', 'SUMMARY:Call', 'DTSTART:20260715T080000Z', 'DURATION:PT45M'),
      ev('UID:3', 'SUMMARY:Outlook', 'DTSTART;TZID=W. Europe Standard Time:20261104T090000', 'DTEND;TZID=W. Europe Standard Time:20261104T100000'),
    );
    const o = expandIcs(text, '2026-07-01', '2026-11-30');
    expect(brief(o)).toEqual(['2026-07-15 10:00 Call', '2026-11-03 19:00 Elternabend, Klasse 2a', '2026-11-04 09:00 Outlook']);
    expect(o[1]).toMatchObject({ duration: 90, location: 'Schule' });
    expect(o[0].duration).toBe(45);
  });

  it('verteilt mehrtägige Ganztagstermine (z. B. Ferien) auf jeden Tag', () => {
    const text = cal(ev('UID:f', 'SUMMARY:Herbstferien', 'DTSTART;VALUE=DATE:20261026', 'DTEND;VALUE=DATE:20261031'));
    expect(brief(expandIcs(text, '2026-10-28', '2026-11-05'))).toEqual([
      '2026-10-28 ganztags Herbstferien 3/5', '2026-10-29 ganztags Herbstferien 4/5', '2026-10-30 ganztags Herbstferien 5/5',
    ]);
  });

  it('entfaltet gefaltete Zeilen und überspringt Alarme', () => {
    const text = cal(['BEGIN:VEVENT', 'UID:x', 'SUMMARY:Sehr langer', '  Titel', 'DTSTART;VALUE=DATE:20261201', 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'SUMMARY:Alarm', 'END:VALARM', 'END:VEVENT'].join('\r\n'));
    expect(brief(expandIcs(text, '2026-12-01', '2026-12-01'))).toEqual(['2026-12-01 ganztags Sehr langer Titel']);
  });

  it('wiederholt wöchentlich mit BYDAY, Intervall, Ausnahme und geändertem Einzeltermin', () => {
    const text = cal(
      ev('UID:s', 'SUMMARY:Schwimmen', 'DTSTART;TZID=Europe/Berlin:20261005T170000', 'DURATION:PT1H', 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH', 'EXDATE;TZID=Europe/Berlin:20261019T170000'),
      ev('UID:s', 'RECURRENCE-ID;TZID=Europe/Berlin:20261022T170000', 'SUMMARY:Schwimmen (später)', 'DTSTART;TZID=Europe/Berlin:20261022T183000', 'DURATION:PT1H'),
    );
    expect(brief(expandIcs(text, '2026-10-01', '2026-11-05'))).toEqual([
      '2026-10-05 17:00 Schwimmen', '2026-10-08 17:00 Schwimmen', '2026-10-22 18:30 Schwimmen (später)', '2026-11-02 17:00 Schwimmen', '2026-11-05 17:00 Schwimmen',
    ]);
  });

  it('hält die Uhrzeit über die Zeitumstellung (TZID) und rechnet UTC-Serien korrekt um', () => {
    const text = cal(
      ev('UID:a', 'SUMMARY:Yoga', 'DTSTART;TZID=Europe/Berlin:20261020T183000', 'RRULE:FREQ=WEEKLY;COUNT=3'),
      ev('UID:b', 'SUMMARY:UTC', 'DTSTART:20261020T160000Z', 'RRULE:FREQ=WEEKLY;COUNT=3'),
    );
    const o = brief(expandIcs(text, '2026-10-01', '2026-12-31'));
    expect(o.filter((x) => x.includes('Yoga'))).toEqual(['2026-10-20 18:30 Yoga', '2026-10-27 18:30 Yoga', '2026-11-03 18:30 Yoga']);
    // 16:00 UTC = 18:00 Sommerzeit, 17:00 Winterzeit (Umstellung am 25.10.2026)
    expect(o.filter((x) => x.includes('UTC'))).toEqual(['2026-10-20 18:00 UTC', '2026-10-27 17:00 UTC', '2026-11-03 17:00 UTC']);
  });

  it('kennt monatliche und jährliche Regeln, UNTIL und Absagen', () => {
    const text = cal(
      ev('UID:m', 'SUMMARY:Müll', 'DTSTART;VALUE=DATE:20260101', 'RRULE:FREQ=MONTHLY;BYDAY=2TU'),
      ev('UID:l', 'SUMMARY:Letzter Freitag', 'DTSTART;VALUE=DATE:20260130', 'RRULE:FREQ=MONTHLY;BYDAY=-1FR;UNTIL=20261130'),
      ev('UID:g', 'SUMMARY:Geburtstag Oma', 'DTSTART;VALUE=DATE:19500312', 'RRULE:FREQ=YEARLY'),
      ev('UID:c', 'SUMMARY:Abgesagt', 'STATUS:CANCELLED', 'DTSTART;VALUE=DATE:20261110'),
    );
    const o = brief(expandIcs(text, '2026-11-01', '2027-03-31'));
    expect(o.filter((x) => x.includes('Müll')).slice(0, 3)).toEqual(['2026-11-10 ganztags Müll', '2026-12-08 ganztags Müll', '2027-01-12 ganztags Müll']);
    expect(o.filter((x) => x.includes('Letzter'))).toEqual(['2026-11-27 ganztags Letzter Freitag']);
    expect(o.filter((x) => x.includes('Oma'))).toEqual(['2027-03-12 ganztags Geburtstag Oma']);
    expect(o.some((x) => x.includes('Abgesagt'))).toBe(false);
  });

  it('verkraftet kaputte Zeilen ohne Absturz', () => {
    expect(expandIcs('Unsinn\nBEGIN:VEVENT\nSUMMARY:ohne Datum\nEND:VEVENT', '2026-01-01', '2026-12-31')).toEqual([]);
  });
});
