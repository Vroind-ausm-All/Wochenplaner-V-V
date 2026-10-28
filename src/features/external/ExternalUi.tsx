import { create } from 'zustand';
import { fmt } from '../../lib/date';
import type { Occurrence } from '../../lib/recurrence';
import { useStore } from '../../store/store';
import { Sheet } from '../../ui/Sheet';
import { timeRange } from '../calendar/EventChip';
import './external.css';

/** Abo-Termine und Feiertage sind nur lesbar: antippen zeigt Details statt sie auszuwählen. */
export const useExternalDetail = create<{ open: Occurrence | null }>(() => ({ open: null }));
const show = (e: Occurrence) => (ev: React.MouseEvent) => {
  ev.stopPropagation();
  useExternalDetail.setState({ open: e });
};

const style = (e: Occurrence) => ({ '--h': e.external?.hue ?? 210 }) as React.CSSProperties;
const icon = (e: Occurrence) => (e.external?.kind === 'holiday' ? (e.external.official ? '🎉' : '✨') : '📅');
const spanLabel = (e: Occurrence) => (e.external?.span ? ` (${e.external.span.day}/${e.external.span.of})` : '');

export function ExternalChip({ e, showTime = true }: { e: Occurrence; showTime?: boolean }) {
  return (
    <button type="button" className={`ev-chip ext-chip ${e.external?.kind === 'holiday' ? 'is-holiday' : ''}`} style={style(e)} onClick={show(e)} title={`${e.title} · ${e.external?.calendarName}`}>
      <span className="ev-chip__emoji">{icon(e)}</span>
      {showTime && !e.allDay && <span className="ev-chip__time">{e.time}</span>}
      <span className="ellipsis">{e.title}</span>
    </button>
  );
}

export function ExternalBlock({ e, style: pos }: { e: Occurrence; style: React.CSSProperties }) {
  return (
    <button type="button" className="ev-block ext-block" style={{ ...style(e), ...pos }} onClick={show(e)} title={`${e.title} · ${timeRange(e)} · ${e.external?.calendarName}`}>
      <div className="ev-block__title ellipsis">📅 {e.title}</div>
      <div className="ev-block__meta row">
        <span>{timeRange(e)}</span>
        <span className="grow" />
        <span className="ellipsis small">{e.external?.calendarName}</span>
      </div>
    </button>
  );
}

export function ExternalAgendaItem({ e }: { e: Occurrence }) {
  return (
    <button type="button" className="agenda__item ext-chip" style={style(e)} onClick={show(e)}>
      <span className="agenda__time">{e.allDay ? 'ganztags' : timeRange(e)}</span>
      <span className="agenda__emoji">{icon(e)}</span>
      <span className="grow">
        <b>
          {e.title}
          {spanLabel(e)}
        </b>
        <span className="small muted"> · {e.external?.calendarName}</span>
        {e.external?.location && <div className="small muted ellipsis">📍 {e.external.location}</div>}
      </span>
    </button>
  );
}

export function ExternalSheet() {
  const e = useExternalDetail((s) => s.open);
  const { addEvent } = useStore.getState();
  const close = () => useExternalDetail.setState({ open: null });
  return (
    <Sheet
      open={!!e}
      onClose={close}
      title={e ? e.title + (e ? spanLabel(e) : '') : ''}
      footer={
        e && e.external?.kind === 'ics' ? (
          <>
            <button
              className="btn"
              onClick={() => {
                addEvent(
                  { title: e.title, date: e.on, time: e.time, duration: e.allDay ? 60 : e.duration, allDay: e.allDay, category: 'Termin', owner: e.owner, repeat: 'none', reminder: 'none', notes: [e.external?.location, e.external?.description].filter(Boolean).join('\n') },
                  'In den eigenen Plan kopiert',
                );
                close();
              }}
            >
              In eigenen Plan kopieren
            </button>
            <span className="grow" />
            <button className="btn" onClick={close}>
              Schließen
            </button>
          </>
        ) : (
          <button className="btn" onClick={close}>
            Schließen
          </button>
        )
      }
    >
      {e && (
        <div className="stack">
          <p>
            <b>{fmt.long(e.on)}</b> · {e.allDay ? 'ganztägig' : timeRange(e)}
          </p>
          <p className="row">
            <span className="ext-dot" style={style(e)} /> {e.external?.calendarName}
            {e.external?.kind === 'holiday' && (e.external.official ? ' – gesetzlicher Feiertag' : ' – kein Feiertag, aber ein besonderer Tag')}
          </p>
          {e.external?.location && <p>📍 {e.external.location}</p>}
          {e.external?.description && <p className="small muted" style={{ whiteSpace: 'pre-wrap' }}>{e.external.description}</p>}
          {e.external?.kind === 'ics' && <p className="small muted">Abo-Termine werden im Ursprungskalender geändert und hier automatisch aktualisiert.</p>}
        </div>
      )}
    </Sheet>
  );
}
