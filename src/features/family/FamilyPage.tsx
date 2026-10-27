import { useState } from 'react';
import { daysBetween, fmt } from '../../lib/date';
import { uid } from '../../lib/id';
import { useToday } from '../../lib/useClock';
import { useStore } from '../../store/store';
import { Chips } from '../../ui/Segmented';

const DOC_CATS = ['Versicherung', 'Antrag', 'Rechnung', 'Vertrag', 'Sonstiges'];
const BABY_GROUPS = ['Vorsorge', 'Anschaffungen', 'Organisation', 'Betreuung', 'Routinen'];

/** Dokumente & Fristen sowie Baby & Familie aus dem alten Board – kompakt zusammengefasst. */
export function FamilyPage() {
  const data = useStore((s) => s.data);
  const { mutate, addEvent } = useStore.getState();
  const today = useToday();
  const [doc, setDoc] = useState({ title: '', due: today, category: 'Antrag' });
  const [baby, setBaby] = useState({ title: '', date: today, group: 'Anschaffungen' });
  const docs = [...data.documents].sort((a, b) => a.due.localeCompare(b.due));

  return (
    <div className="shop">
      <h2>Familie & Fristen</h2>
      <p className="small muted">Aus Datenschutzgründen nur Metadaten – keine Dateien und keine medizinischen Details auf dem für alle sichtbaren Display.</p>

      <section className="stack">
        <h3>Dokumente & Fristen</h3>
        <form
          className="card shop__add"
          onSubmit={(e) => {
            e.preventDefault();
            if (!doc.title.trim()) return;
            mutate((d) => void d.documents.push({ id: uid(), ...doc, title: doc.title.trim(), done: false }), 'Frist gespeichert');
            setDoc({ ...doc, title: '' });
          }}
        >
          <input className="input grow" placeholder="z. B. Elterngeldantrag" value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} />
          <input className="input" style={{ width: 170 }} type="date" value={doc.due} onChange={(e) => setDoc({ ...doc, due: e.target.value })} />
          <Chips value={doc.category} onChange={(c) => setDoc({ ...doc, category: c })} options={DOC_CATS.map((c) => ({ value: c, label: c }))} />
          <button className="btn primary">+ Frist</button>
        </form>
        {docs.map((x) => {
          const left = daysBetween(today, x.due);
          return (
            <label key={x.id} className={`shop__item ${x.done ? 'is-done' : ''}`}>
              <input type="checkbox" checked={!!x.done} onChange={(e) => mutate((d) => void (d.documents.find((y) => y.id === x.id)!.done = e.target.checked))} />
              <span className="grow">
                <b>{x.title}</b> <span className="small muted">· {x.category} · {fmt.short(x.due)}</span>
              </span>
              {!x.done && <span className={`badge ${left <= 7 ? 'warn' : ''}`}>{left < 0 ? `${-left} Tage überfällig` : left === 0 ? 'heute' : `in ${left} Tagen`}</span>}
              <button type="button" className="btn sm" onClick={(e) => { e.preventDefault(); addEvent({ title: `Frist: ${x.title}`, date: x.due, time: '09:00', duration: 30, category: 'Frist', owner: x.owner ?? 'Beide', allDay: true, repeat: 'none', reminder: 'none' }, 'Frist im Kalender'); }}>
                📅
              </button>
              <button type="button" className="btn sm ghost" onClick={(e) => { e.preventDefault(); mutate((d) => void (d.documents = d.documents.filter((y) => y.id !== x.id))); }} aria-label="Löschen">
                ✕
              </button>
            </label>
          );
        })}
      </section>

      <section className="stack">
        <h3>Baby & Familie</h3>
        <form
          className="card shop__add"
          onSubmit={(e) => {
            e.preventDefault();
            if (!baby.title.trim()) return;
            mutate((d) => void d.baby.push({ id: uid(), ...baby, title: baby.title.trim(), owner: 'Beide', done: false, notes: '' }), 'Eintrag gespeichert');
            setBaby({ ...baby, title: '' });
          }}
        >
          <input className="input grow" placeholder="z. B. Kinderwagen ansehen" value={baby.title} onChange={(e) => setBaby({ ...baby, title: e.target.value })} />
          <input className="input" style={{ width: 170 }} type="date" value={baby.date} onChange={(e) => setBaby({ ...baby, date: e.target.value })} />
          <Chips value={baby.group} onChange={(g) => setBaby({ ...baby, group: g })} options={BABY_GROUPS.map((g) => ({ value: g, label: g }))} />
          <button className="btn primary">+ Eintrag</button>
        </form>
        {BABY_GROUPS.map((g) => {
          const list = data.baby.filter((x) => x.group === g);
          return list.length ? (
            <div key={g} className="stack">
              <div className="eyebrow">{g}</div>
              {list.map((x) => (
                <label key={x.id} className={`shop__item ${x.done ? 'is-done' : ''}`}>
                  <input type="checkbox" checked={x.done} onChange={(e) => mutate((d) => void (d.baby.find((y) => y.id === x.id)!.done = e.target.checked))} />
                  <span className="grow">
                    <b>{x.title}</b> <span className="small muted">· {fmt.short(x.date)}</span>
                  </span>
                  <button type="button" className="btn sm" onClick={(e) => { e.preventDefault(); addEvent({ title: x.title, date: x.date, time: '17:00', duration: 45, category: 'Baby', owner: x.owner, allDay: false, repeat: 'none', reminder: 'none' }, 'In den Kalender übernommen'); }}>
                    📅
                  </button>
                  <button type="button" className="btn sm ghost" onClick={(e) => { e.preventDefault(); mutate((d) => void (d.baby = d.baby.filter((y) => y.id !== x.id))); }} aria-label="Löschen">
                    ✕
                  </button>
                </label>
              ))}
            </div>
          ) : null;
        })}
      </section>
    </div>
  );
}
