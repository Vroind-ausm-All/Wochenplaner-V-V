import { ICON_NAMES, Icon, OwnerMark, WirMark } from '../../ui/Icon';
import './design.css';

/** Übersicht aller Piktogramme (Aufruf über …/#piktogramme) – Grundlage für docs/DESIGN.md. */
export function IconSheet() {
  return (
    <div className="sheet-page">
      <header className="sheet-page__head">
        <div className="row">
          <WirMark size={48} closeness={0.6} filled />
          <div>
            <div className="eyebrow">WIR. Wochenplaner</div>
            <h1>Piktogramme</h1>
          </div>
        </div>
        <p className="muted">24 px Raster · 1,5 px Linie · runde Enden · keine Füllungen · eine Sprache für alle Bereiche</p>
      </header>
      <section className="sheet-page__owners">
        <div className="eyebrow">Personen-Marken</div>
        <div className="row" style={{ gap: 32 }}>
          <span className="who"><OwnerMark owner="Person A" size={18} /> Person A</span>
          <span className="who"><OwnerMark owner="Person B" size={18} /> Person B</span>
          <span className="who"><OwnerMark owner="Beide" size={18} /> Beide</span>
          <span className="who"><WirMark size={28} closeness={0.1} /> getrennt</span>
          <span className="who"><WirMark size={28} closeness={0.6} /> verbunden</span>
          <span className="who"><WirMark size={28} closeness={1} filled /> ganz nah</span>
        </div>
      </section>
      <div className="sheet-page__grid">
        {ICON_NAMES.map((n) => (
          <figure key={n}>
            <Icon name={n} size={32} />
            <figcaption>{n}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
