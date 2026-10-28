import { useState } from 'react';
import { cuisineById } from '../../data/cuisines';
import { recipeById } from '../../data/recipes';
import { hiddenGlutenHint } from '../../data/substitutes';
import { pick } from '../../dnd/state';
import { band, recipeNutrition } from '../../lib/nutrition';
import { useStore } from '../../store/store';
import { Chips } from '../../ui/Segmented';
import { Sheet } from '../../ui/Sheet';
import { DishArt } from './DishArt';

const NUTRIENTS = [
  ['kcal', 'Energie', 'kcal'],
  ['protein', 'Eiweiß', 'g'],
  ['carbs', 'Kohlenhydrate', 'g'],
  ['fat', 'Fett', 'g'],
  ['fiber', 'Ballaststoffe', 'g'],
  ['sugar', 'Zucker', 'g'],
] as const;

const amount = (n: number) => (Number.isInteger(n) ? n : Number(n.toFixed(1))).toLocaleString('de-DE');

/** Rezeptkarte mit skalierbaren Mengen, Glutenfallen, Grundrezept-Links und Nährwert-Schätzung. */
export function RecipeDetail() {
  const id = useStore((s) => s.recipeOpen);
  const favorites = useStore((s) => s.data.favoriteRecipes);
  const { setUi, mutate } = useStore.getState();
  const [portions, setPortions] = useState(2);
  const [meat, setMeat] = useState(false);
  const r = recipeById(id ?? undefined);
  const close = () => setUi({ recipeOpen: null });
  if (!r) return <Sheet open={false} onClose={close} title="" children={null} />;

  const basic = r.group === 'Grundrezept';
  const f = basic ? 1 : portions / 2;
  const fav = favorites.includes(r.id);
  const n = !basic && recipeNutrition(r, meat);
  const cuisine = cuisineById(r.cuisine);

  return (
    <Sheet
      open={!!r}
      onClose={close}
      wide
      title={r.name}
      footer={
        <>
          {!basic && (
            <button
              className="btn primary"
              onClick={() => {
                pick({ type: 'recipe', recipeId: r.id, label: `${r.symbol} ${r.name}` });
                close();
              }}
            >
              🍽 Einplanen – Tag antippen
            </button>
          )}
          <button className="btn" onClick={() => mutate((d) => void (d.favoriteRecipes = fav ? d.favoriteRecipes.filter((x) => x !== r.id) : [...d.favoriteRecipes, r.id]))}>
            {fav ? '♥ Favorit' : '♡ Merken'}
          </button>
          <span className="grow" />
          <button className="btn" onClick={close}>
            Schließen
          </button>
        </>
      }
    >
      <div className="recipe">
        <div className="recipe__art">
          <DishArt recipe={r} size="lg" />
          <div className="row wrap">
            <span className="badge">✓ glutenfrei</span>
            <span className="badge">⏱ {r.minutes} Min.</span>
            {cuisine && <span className="badge">{cuisine.flag} {cuisine.name}</span>}
            {r.technique && <span className="badge">{r.technique}</span>}
            {r.yields && <span className="badge">Ergibt {r.yields}</span>}
          </div>
          <p className="muted">{r.description}</p>
          {!basic && (
            <>
              <div className="field">
                <span>Personen</span>
                <Chips value={portions} onChange={setPortions} options={[1, 2, 3, 4, 6].map((p) => ({ value: p, label: String(p) }))} />
              </div>
              {r.meat && (
                <div className="chips">
                  <button className="chip" aria-pressed={meat} onClick={() => setMeat(!meat)}>
                    🍗 Mit {r.meat.name}
                  </button>
                </div>
              )}
            </>
          )}
          {n && (
            <div className="nutri">
              <div className="eyebrow">Ø je Portion · Schätzbereich{n.complete ? '' : ' (unvollständig)'}</div>
              <div className="nutri__grid">
                {NUTRIENTS.map(([k, label, unit]) => (
                  <div key={k}>
                    <b>{band(n.values[k], k)}</b>
                    <span className="small muted">
                      {unit} {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="recipe__text">
          <h3>Zutaten{basic ? '' : ` für ${portions}`}</h3>
          <ul className="ingredients">
            {[...r.ingredients, ...(meat && r.meat ? [r.meat] : [])].map((x) => {
              const hint = hiddenGlutenHint(x.name);
              return (
                <li key={x.name}>
                  <span className="ingredients__amt">
                    {amount(x.amount * f)} {x.unit}
                  </span>
                  <span className="grow">
                    {x.name}
                    {hint && (
                      <span className="gf-hint">
                        ⚠ {hint.hint}
                        {hint.diy && recipeById(hint.diy) && hint.diy !== r.id && (
                          <button className="linklike" onClick={() => setUi({ recipeOpen: hint.diy! })}>
                            Selbst machen →
                          </button>
                        )}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <h3>Zubereitung</h3>
          <ol className="steps">
            {r.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
            {meat && r.meat && <li>{r.meat.instruction}</li>}
          </ol>
          {!!r.swaps?.length && (
            <div className="safe">
              <b>Zöliakie-Hinweise</b>
              <ul>
                {r.swaps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {!!r.homemade?.length && (
            <div className="stack">
              <h3>Selbst gemacht dazu</h3>
              <div className="row wrap">
                {r.homemade.map((h) => {
                  const b = recipeById(h);
                  return b ? (
                    <button key={h} className="btn sm" onClick={() => setUi({ recipeOpen: h })}>
                      {b.symbol} {b.name}
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
