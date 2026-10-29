import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../store/types';
import { normalizeAlerts } from './alerts';
import { eventRisk, findDrierSlot, isOutdoor, rainSoon, weatherConcerns, weatherFor } from './eventWeather';
import type { Forecast } from './weather';

const NOW = new Date('2026-10-29T09:00:00').getTime();

// Wetter: Samstag 31.10. verregnet ab 9 Uhr, Sonntag trocken, Freitag Nieselregen nachmittags.
const days = ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'];
const forecast: Forecast = {
  fetchedAt: Date.now(),
  location: { name: 'Berlin', latitude: 52.5, longitude: 13.4 },
  current: { temp: 10, code: 2, isDay: true, wind: 10 },
  daily: days.map((date) => ({ date, code: date === '2026-10-31' ? 63 : 2, max: 12, min: 4, rain: date === '2026-10-31' ? 90 : 10, sunrise: '07:00', sunset: '16:40' })),
  hourly: days.flatMap((d) =>
    Array.from({ length: 24 }, (_, h) => {
      const sat = d === '2026-10-31' && h >= 9 && h < 18;
      const fri = d === '2026-10-30' && h >= 14 && h < 16;
      return { time: `${d}T${String(h).padStart(2, '0')}:00`, temp: 9, code: sat ? 63 : fri ? 51 : 2, rain: sat ? 85 : fri ? 40 : 5 };
    }),
  ),
};
const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'w', title: 'Spaziergang', date: '2026-10-31', time: '10:00', duration: 45, category: 'Wir', owner: 'Beide', allDay: false, repeat: 'none', reminder: 'none', ...p,
});

describe('Wetter an Terminen', () => {
  it('erkennt Unternehmungen draußen', () => {
    expect(isOutdoor(ev({}))).toBe(true);
    expect(isOutdoor(ev({ title: 'Picknick im Park' }))).toBe(true);
    expect(isOutdoor(ev({ title: 'Zahnarzt' }))).toBe(false);
    expect(isOutdoor(ev({ title: 'Treffen', notes: 'draußen am See' }))).toBe(true);
    expect(isOutdoor(ev({ allDay: true }))).toBe(false);
  });

  it('bewertet das Wetter zur Terminzeit', () => {
    expect(weatherFor(forecast, '2026-10-31', '10:00', 45)).toMatchObject({ rain: 85, wet: true });
    expect(eventRisk({ on: '2026-10-31', time: '10:00', duration: 45 }, forecast)).toMatchObject({ level: 'bad', reason: '85 % Regen' });
    expect(eventRisk({ on: '2026-10-30', time: '14:30', duration: 60 }, forecast).level).toBe('watch');
    expect(eventRisk({ on: '2026-11-01', time: '10:00', duration: 45 }, forecast).level).toBe('ok');
  });

  it('meldet Warnungen auch ohne Regen', () => {
    const alerts = normalizeAlerts({ alerts: [{ id: 1, severity: 'moderate', event_de: 'STURMBÖEN', onset: '2026-11-01T08:00:00+01:00', expires: '2026-11-01T14:00:00+01:00' }] });
    expect(eventRisk({ on: '2026-11-01', time: '10:00', duration: 45 }, forecast, alerts)).toMatchObject({ level: 'bad', icon: '⚠️', reason: 'Wetterwarnung: Sturmböen' });
  });

  it('schlägt einen trockeneren, freien Zeitpunkt vor', () => {
    const walk = { ...ev({}), on: '2026-10-31' };
    // Sonntag 10:00 ist belegt → nächstbeste trockene Option
    const others = [ev({ id: 'x', title: 'Brunch', date: '2026-11-01', time: '09:30', duration: 120 })];
    const alt = findDrierSlot(walk, forecast, [walk, ...others], [], '2026-10-29', NOW);
    expect(alt).toMatchObject({ date: '2026-10-31', time: '08:00' });
    const free = findDrierSlot({ ...walk, time: '12:00' }, forecast, [walk], [], '2026-10-29', NOW);
    expect(free).toMatchObject({ date: '2026-11-01', time: '12:00', rain: 5 });
  });

  it('listet riskante Draußen-Termine und kündigt Regen an', () => {
    const list = weatherConcerns([ev({}), ev({ id: 'z', title: 'Zahnarzt' })], forecast, [], '2026-10-29', NOW);
    expect(list.map((x) => `${x.event.title} ${x.risk.level}`)).toEqual(['Spaziergang bad']);
    expect(rainSoon(forecast, new Date('2026-10-31T07:30:00'))).toEqual({ hour: '09:00', rain: 85 });
    expect(rainSoon(forecast, new Date('2026-11-01T07:30:00'))).toBeNull();
  });
});
