import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { CUISINE_OUTLOOK, CUISINES } from '../../data/cuisines';
import { BASICS, isVegetarian, RECIPES, recipeById } from '../../data/recipes';
import type { Recipe } from '../../data/recipes/types';
import { HIDDEN_GLUTEN, SUBSTITUTES } from '../../data/substitutes';
import { Pickable } from '../../dnd/Dnd';
import { addDays, fmt, monday, range } from '../../lib/date';
import { band, recipeNutrition } from '../../lib/nutrition';
import { useToday } from '../../lib/useClock';
import { regenerateGroceries, useStore } from '../../store/store';
import { Segmented } from '../../ui/Segmented';
import { DishArt } from './DishArt';
import { MealSlotBox } from './MealSlotBox';
import './meals.css';

type Tab = 'rezepte' | 'selbst' | 'ersatz' | 'kuechen';
const FILTERS = ['Alle', 'Schnell', 'Vegetarisch', 'Airfryer', 'Besonders', 'Favoriten'] as const;
type Filter = (typeof FILTERS)[number];

const ease = (n: 1 | 2 | 3) => '●'.repeat(n) + '○'.repeat(3 - n);

export function MealPlanner() {
  const [tab, setTab] = useState<Tab>('rezepte');
  const favCuisines = useStore((s) => s.data.settings.favoriteCuisines);
  const [cuisine, setCuisine] = useState<string>(favCuisines[0] ?? CUISINES[0].id);
  return (
    <div className="meals">
      <header className="meals__intro">
        <div>
          <div className="eyebrow">Genussvoll · selbst gekocht · zöliakie-bewusst</div>
          <h2>Was kochen wir zusammen?</h2>
          <p className="muted">
            {CUISINES.length} Küchenwelten, {RECIPES.length} glutenfreie Gerichte und {BASICS.length} Grundrezepte zum Selbermachen. Rezept auf einen Tag ziehen – oder erst antippen, dann den Tag.
          </p>
        </div>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'rezepte', label: 'Rezepte' },
            { value: 'selbst', label: 'Selbstgemacht' },
            { value: 'ersatz', label: 'Ersatz-Guide' },
            { value: 'kuechen', label: 'Küchen-Kompass' },
          ]}
        />
      </header>
      <MealWeek />
      {tab === 'rezepte' && <RecipeBrowser cuisine={cuisine} setCuisine={setCuisine} />}
      {tab === 'selbst' && <RecipeGrid recipes={BASICS} />}
      {tab === 'ersatz' && <SubstituteGuide />}
      {tab === 'kuechen' && <CuisineCompass onPick={(id) => { setCuisine(id); setTab('rezepte'); }} />}
    </div>
  );
}

function MealWeek() {
  const today = useToday();
  const [week, setWeek] = useState(() => monday(today));
  const meals = useStore((s) => s.data.meals);
  const days = range(week, 7);
  const planned = days.filter((d) => meals[d]?.Abend).length;
  return (
    <section className="mealweek">
      <div className="row wrap">
        <h3 className="grow">
          Woche ab {fmt.short(week)} · <span className="muted">{planned} von 7 Abendessen geplant</span>
        </h3>
        <button className="btn icon" onClick={() => setWeek(addDays(week, -7))} aria-label="Vorige Woche">
          ‹
        </button>
        <button className="btn" onClick={() => setWeek(monday(today))}>
          Diese Woche
        </button>
        <button className="btn icon" onClick={() => setWeek(addDays(week, 7))} aria-label="Nächste Woche">
          ›
        </button>
        <button className="btn" onClick={() => regenerateGroceries(week)}>
          🛒 Einkaufsliste für diese Woche
        </button>
      </div>
      <div className="mealweek__days">
        {days.map((d) => (
          <div key={d} className={`mealweek__day ${d === today ? 'is-today' : ''}`}>
            <div className="mealweek__date">
              <b>{fmt.weekday(d)}</b> <span className="muted">{Number(d.slice(8))}.</span>
            </div>
            <MealSlotBox day={d} slot="Mittag" compact />
            <MealSlotBox day={d} slot="Abend" compact />
          </div>
        ))}
      </div>
    </section>
  );
}

function RecipeBrowser({ cuisine, setCuisine }: { cuisine: string; setCuisine: (c: string) => void }) {
  const favorites = useStore((s) => s.data.favoriteRecipes);
  const [filter, setFilter] = useState<Filter>('Alle');
  const [q, setQ] = useState('');
  const c = CUISINES.find((x) => x.id === cuisine);

  const list = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('de');
    return RECIPES.filter((r) => (needle ? true : r.cuisine === cuisine))
      .filter((r) => {
        switch (filter) {
          case 'Schnell': return r.minutes <= 30;
          case 'Vegetarisch': return isVegetarian(r);
          case 'Airfryer': return r.technique === 'Airfryer' || r.group === 'Airfryer';
          case 'Besonders': return r.group === 'Besonders';
          case 'Favoriten': return favorites.includes(r.id);
          default: return true;
        }
      })
      .filter((r) => !needle || `${r.name} ${r.description} ${r.ingredients.map((i) => i.name).join(' ')}`.toLocaleLowerCase('de').includes(needle));
  }, [cuisine, filter, q, favorites]);

  return (
    <section className="stack">
      <div className="cuisines" role="tablist" aria-label="Küchenwelten">
        {CUISINES.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === cuisine} className="cuisine" onClick={() => { setCuisine(x.id); setQ(''); }} style={{ '--h': x.hue } as React.CSSProperties}>
            <span className="cuisine__flag">{x.flag}</span>
            <span>
              <b>{x.name}</b>
              <span className="small muted">{x.tagline}</span>
            </span>
          </button>
        ))}
      </div>
      {c && !q && (
        <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="cuisine-note">
          <span title="Wie leicht glutenfrei?">GF-Leichtigkeit {ease(c.gfEase)}</span>
          <span className="grow">{c.gfNote}</span>
        </motion.div>
      )}
      <div className="row wrap">
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f} className="chip" aria-pressed={f === filter} onClick={() => setFilter(f)}>
              {f === 'Favoriten' ? '♥ ' : ''}
              {f}
            </button>
          ))}
        </div>
        <input className="input grow" style={{ minWidth: 200 }} type="search" placeholder="🔍 Alle Küchen durchsuchen (z. B. Kichererbsen)" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <RecipeGrid recipes={list} />
    </section>
  );
}

export function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  const setUi = useStore((s) => s.setUi);
  if (!recipes.length) return <div className="empty">Keine Gerichte für diese Auswahl.</div>;
  return (
    <div className="recipe-grid">
      {recipes.map((r, i) => (
        <motion.article key={r.id} className="dish-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.025 }}>
          {r.group === 'Grundrezept' ? (
            <button className="dish-card__pick" onClick={() => setUi({ recipeOpen: r.id })}>
              <DishArt recipe={r} />
              <DishText r={r} />
            </button>
          ) : (
            <Pickable payload={{ type: 'recipe', recipeId: r.id, label: `${r.symbol} ${r.name}` }} className="dish-card__pick" title="Ziehen oder antippen, dann Tag wählen">
              <DishArt recipe={r} />
              <DishText r={r} />
            </Pickable>
          )}
          <button className="dish-card__info" onClick={() => setUi({ recipeOpen: r.id })} aria-label={`Rezept ${r.name} ansehen`}>
            📖
          </button>
        </motion.article>
      ))}
    </div>
  );
}

function DishText({ r }: { r: Recipe }) {
  const n = r.group !== 'Grundrezept' ? recipeNutrition(r) : null;
  return (
    <span className="dish-card__text">
      <b>{r.name}</b>
      <span className="small muted">{r.description}</span>
      <span className="row wrap small">
        <span className="badge">⏱ {r.minutes} Min.</span>
        {n && <span className="badge">⚡ {band(n.values.kcal, 'kcal')} kcal</span>}
        {isVegetarian(r) && <span className="badge">🌱 veggie</span>}
        {r.meat && <span className="badge">🍗 Fleisch optional</span>}
        {r.yields && <span className="badge">{r.yields}</span>}
      </span>
    </span>
  );
}

function SubstituteGuide() {
  const setUi = useStore((s) => s.setUi);
  return (
    <section className="guide">
      <div className="card">
        <h3>Statt Gluten – das funktioniert</h3>
        <table className="subst">
          <thead>
            <tr>
              <th>Statt</th>
              <th>Nehmt</th>
              <th>Selbst machen</th>
            </tr>
          </thead>
          <tbody>
            {SUBSTITUTES.map((s) => (
              <tr key={s.gluten}>
                <td>
                  <b>{s.gluten}</b>
                </td>
                <td>
                  {s.instead.join(' · ')}
                  {s.note && <div className="small muted">{s.note}</div>}
                </td>
                <td>
                  {s.diy && recipeById(s.diy) && (
                    <button className="btn sm" onClick={() => setUi({ recipeOpen: s.diy! })}>
                      {recipeById(s.diy)!.symbol} {recipeById(s.diy)!.name}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card gold">
        <h3>Versteckte Glutenquellen</h3>
        <ul className="hidden-gluten">
          {HIDDEN_GLUTEN.map((h) => (
            <li key={h.hint}>{h.hint}</li>
          ))}
        </ul>
        <div className="safe">
          <b>Kreuzkontakt in der Küche:</b> eigener Toaster oder Toasttaschen, eigenes Nudelsieb, Holzbretter und Teflon mit Kratzern trennen, Butter & Aufstriche nicht mit Krümelmessern teilen, Frittierfett nie mit paniertem Weizen teilen.
        </div>
      </div>
    </section>
  );
}

function CuisineCompass({ onPick }: { onPick: (id: string) => void }) {
  const fav = useStore((s) => s.data.settings.favoriteCuisines);
  const update = useStore((s) => s.updateSettings);
  return (
    <section className="stack">
      <p className="muted">Wie gut lassen sich Küchen glutenfrei kochen? ●●● = von Natur aus fast immer glutenfrei, ●○○ = viele Ersatzprodukte nötig. Favoriten fließen in die Vorschläge des Begleiters ein.</p>
      <div className="compass">
        {CUISINES.map((c) => (
          <article key={c.id} className="card compass__item" style={{ '--h': c.hue } as React.CSSProperties}>
            <div className="row">
              <span className="cuisine__flag">{c.flag}</span>
              <b className="grow">{c.name}</b>
              <span title="GF-Leichtigkeit">{ease(c.gfEase)}</span>
            </div>
            <p className="small">{c.gfNote}</p>
            <ul className="small muted">
              {c.watchOut.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <div className="row">
              <span className="small muted grow">{RECIPES.filter((r) => r.cuisine === c.id).length} Gerichte</span>
              <button className="chip" aria-pressed={fav.includes(c.id)} onClick={() => update({ favoriteCuisines: fav.includes(c.id) ? fav.filter((x) => x !== c.id) : [...fav, c.id] })}>
                {fav.includes(c.id) ? '♥' : '♡'}
              </button>
              <button className="btn sm" onClick={() => onPick(c.id)}>
                Ansehen
              </button>
            </div>
          </article>
        ))}
      </div>
      <h3>Als Nächstes denkbar</h3>
      <div className="compass">
        {CUISINE_OUTLOOK.map((c) => (
          <article key={c.name} className="card compass__item is-outlook">
            <div className="row">
              <span className="cuisine__flag">{c.flag}</span>
              <b className="grow">{c.name}</b>
              <span>{ease(c.gfEase)}</span>
            </div>
            <p className="small">{c.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
