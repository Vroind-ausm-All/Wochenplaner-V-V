import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { fmt } from '../../lib/date';
import { uid } from '../../lib/id';
import { regenerateGroceries, useStore } from '../../store/store';
import type { GfStatus } from '../../store/types';
import { Chips, Segmented } from '../../ui/Segmented';
import './shopping.css';
import { Icon } from '../../ui/Icon';

const CATS = ['Lebensmittel', 'Drogerie', 'Haushalt', 'Baby', 'Sonstiges'];

export function ShoppingPage() {
  const [tab, setTab] = useState<'list' | 'stock'>('list');
  return (
    <div className="shop">
      <header className="row wrap">
        <h2 className="grow">Einkaufen & Vorräte</h2>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'list', label: 'Einkaufsliste', icon: 'cart' }, { value: 'stock', label: 'Vorräte', icon: 'basket' }]} />
      </header>
      {tab === 'list' ? <ShoppingList /> : <Inventory />}
    </div>
  );
}

function ShoppingList() {
  const items = useStore((s) => s.data.shopping);
  const week = useStore((s) => s.groceryWeek);
  const mutate = useStore((s) => s.mutate);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [cat, setCat] = useState('Lebensmittel');
  const open = items.filter((x) => !x.done).length;
  const groups = CATS.map((c) => [c, items.filter((x) => (CATS.includes(x.category) ? x.category : 'Sonstiges') === c).sort((a, b) => Number(a.done) - Number(b.done) || a.name.localeCompare(b.name, 'de'))] as const).filter(([, l]) => l.length);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutate((d) => void d.shopping.push({ id: uid(), name: name.trim(), qty: qty.trim() || '1', category: cat, done: false }), `${name.trim()} hinzugefügt`);
    setName('');
    setQty('');
  };

  return (
    <div className="stack">
      <div className="safe">
        <b>Zöliakie-Schutz:</b> Zutaten auf glutenfreie Kennzeichnung (durchgestrichene Ähre) und mögliche Kreuzkontakte prüfen. Vorräte zählen beim Rezept-Einkauf nur, wenn sie als geprüft markiert sind.
      </div>
      <form className="card shop__add" onSubmit={add}>
        <input className="input grow" placeholder="Was fehlt?" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" style={{ width: 140 }} placeholder="Menge" value={qty} onChange={(e) => setQty(e.target.value)} />
        <Chips value={cat} onChange={setCat} options={CATS.map((c) => ({ value: c, label: c }))} />
        <button className="btn primary">+ Hinzufügen</button>
      </form>
      <div className="row wrap">
        <b className="grow">
          {open} offen · Rezeptbedarf für Woche ab {fmt.short(week)}
        </b>
        <button className="btn sm" onClick={() => regenerateGroceries(week)}>
          <Icon name="refresh" size={16} /> Aus Essensplan neu berechnen
        </button>
        <button className="btn sm" onClick={() => mutate((d) => void (d.shopping = d.shopping.filter((x) => !x.done)), 'Erledigte entfernt')}>
          Erledigte entfernen
        </button>
      </div>
      {groups.map(([c, list]) => (
        <section key={c} className="stack">
          <div className="eyebrow">{c}</div>
          <AnimatePresence initial={false}>
            {list.map((x) => (
              <motion.label layout key={x.id} className={`shop__item ${x.done ? 'is-done' : ''}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}>
                <input type="checkbox" checked={x.done} onChange={(e) => mutate((d) => void (d.shopping.find((y) => y.id === x.id)!.done = e.target.checked))} />
                <span className="grow">
                  <b>{x.name}</b> <span className="muted">{x.qty}</span>
                </span>
                {x.origin === 'meal-plan' && <span className="badge" title="Aus dem Essensplan"><Icon name="plate" size={14} /> Plan</span>}
                <button type="button" className="btn sm ghost" aria-label="Entfernen" onClick={() => mutate((d) => void (d.shopping = d.shopping.filter((y) => y.id !== x.id)))}>
                  <Icon name="close" size={16} />
                </button>
              </motion.label>
            ))}
          </AnimatePresence>
        </section>
      ))}
      {!items.length && <div className="empty">Alles da! Plant ein paar Abendessen – die Zutaten landen automatisch hier.</div>}
    </div>
  );
}

const GF: { value: GfStatus; label: string; icon?: string }[] = [
  { value: 'verified', label: 'GF geprüft', icon: 'check' },
  { value: 'unverified', label: 'ungeprüft' },
  { value: 'not-applicable', label: 'kein Lebensmittel' },
];

function Inventory() {
  const items = useStore((s) => s.data.inventory);
  const mutate = useStore((s) => s.mutate);
  const [name, setName] = useState('');
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutate((d) => void d.inventory.push({ id: uid(), name: name.trim(), qty: 1, min: 1, unit: 'Stück', category: 'Lebensmittel', gfStatus: 'unverified' }));
    setName('');
  };
  const upd = (id: string, p: Partial<(typeof items)[number]>) => mutate((d) => void Object.assign(d.inventory.find((x) => x.id === id)!, p));
  return (
    <div className="stack">
      <form className="card shop__add" onSubmit={add}>
        <input className="input grow" placeholder="Neuer Vorrat, z. B. Reismehl" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary">+ Vorrat</button>
      </form>
      {items.map((x) => {
        const low = x.qty <= x.min;
        return (
          <div key={x.id} className={`card stock ${low ? 'is-low' : ''}`}>
            <div className="row wrap">
              <b className="grow">{x.name}</b>
              {low && (
                <button
                  className="btn sm"
                  onClick={() => mutate((d) => void d.shopping.push({ id: uid(), name: x.name, qty: `${Math.max(1, x.min * 2 - x.qty)} ${x.unit}`, category: x.category, done: false }), `${x.name} auf die Liste gesetzt`)}
                >
                  <Icon name="cart" size={16} /> Auf die Liste
                </button>
              )}
              <button className="btn sm ghost" onClick={() => mutate((d) => void (d.inventory = d.inventory.filter((y) => y.id !== x.id)))} aria-label="Löschen">
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="row wrap">
              <div className="row">
                <button className="btn icon" onClick={() => upd(x.id, { qty: Math.max(0, x.qty - 1) })} aria-label="Weniger">−</button>
                <b className="stock__qty">
                  {x.qty} {x.unit}
                </b>
                <button className="btn icon" onClick={() => upd(x.id, { qty: x.qty + 1 })} aria-label="Mehr">+</button>
              </div>
              <span className="small muted">Mindestens {x.min}</span>
              <span className="grow" />
              <Chips value={x.gfStatus} onChange={(g) => upd(x.id, { gfStatus: g })} options={GF} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
