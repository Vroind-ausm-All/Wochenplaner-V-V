import { describe, expect, it } from 'vitest';
import { alertCovers, normalizeAlerts, relevantAlerts } from './alerts';

const fixture = {
  alerts: [
    {
      id: 297, alert_id: '2.49.0.0.276.0.DWD.PVW.1', status: 'actual', effective: '2026-10-29T08:00:00+00:00', onset: '2026-10-29T14:00:00+00:00', expires: '2026-10-29T22:00:00+00:00',
      category: 'met', response_type: 'prepare', urgency: 'immediate', severity: 'moderate', certainty: 'likely', event_code: 52,
      event_en: 'gale-force gusts', event_de: 'STURMBÖEN', headline_en: 'Official WARNING', headline_de: 'Amtliche WARNUNG vor STURMBÖEN',
      description_de: 'Es treten Sturmböen mit Geschwindigkeiten um 70 km/h auf.', instruction_de: 'Achten Sie auf herabstürzende Äste.',
    },
    { id: 298, severity: 'Severe', event_de: 'ORKANBÖEN', headline_de: 'Amtliche UNWETTERWARNUNG vor ORKANBÖEN', onset: '2026-10-29T18:00:00+00:00', expires: '2026-10-30T02:00:00+00:00' },
    { id: 299, severity: 'minor', event_de: 'FROST', onset: '2026-11-02T00:00:00+00:00', expires: '2026-11-02T08:00:00+00:00' },
    { id: 300, severity: 'minor', event_de: 'GLÄTTE', onset: '2026-10-28T00:00:00+00:00', expires: '2026-10-28T08:00:00+00:00' },
    { foo: 'kaputt' },
    { id: 301, status: 'Test', severity: 'extreme', event_de: 'TESTMELDUNG', onset: '2026-10-29T10:00:00+00:00' },
  ],
  location: { warn_cell_id: 811000000, name: 'Berlin', state: 'Berlin' },
};

describe('Unwetterwarnungen', () => {
  const list = normalizeAlerts(fixture);
  it('liest die Bright-Sky-Antwort tolerant ein', () => {
    expect(list).toHaveLength(4);
    expect(list[0]).toMatchObject({ severity: 'moderate', event: 'STURMBÖEN', headline: 'Amtliche WARNUNG vor STURMBÖEN', region: 'Berlin', instruction: 'Achten Sie auf herabstürzende Äste.' });
    expect(list[1].severity).toBe('severe');
    expect(normalizeAlerts(null)).toEqual([]);
    expect(normalizeAlerts({ alerts: 'x' })).toEqual([]);
  });
  it('zeigt nur aktuelle und baldige Warnungen, schwerste zuerst', () => {
    const now = Date.parse('2026-10-29T12:00:00Z');
    expect(relevantAlerts(list, now).map((a) => a.event)).toEqual(['ORKANBÖEN', 'STURMBÖEN']);
  });
  it('erkennt Überschneidungen mit Terminen', () => {
    expect(alertCovers(list[0], Date.parse('2026-10-29T15:00:00Z'), Date.parse('2026-10-29T16:00:00Z'))).toBe(true);
    expect(alertCovers(list[0], Date.parse('2026-10-29T22:00:00Z'), Date.parse('2026-10-29T23:00:00Z'))).toBe(false);
  });
});
