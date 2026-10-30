import { motion } from 'motion/react';
import { findRecipe } from '../../data/recipes';
import { DropZone, Pickable } from '../../dnd/Dnd';
import { fmt, isWeekend } from '../../lib/date';
import { useStore } from '../../store/store';
import type { ISODate, MealSlot } from '../../store/types';
import { Icon } from '../../ui/Icon';
import { recipeIcon } from './DishArt';

/** Ein Essensplatz (Mittag/Abend) – Ablageziel für Rezepte, die geplante Mahlzeit ist selbst verschiebbar. */
export function MealSlotBox({ day, slot, compact }: { day: ISODate; slot: MealSlot; compact?: boolean }) {
  const meal = useStore((s) => s.data.meals[day]?.[slot]);
  const lunchOnWeekdays = useStore((s) => s.data.settings.lunchOnWeekdays);
  const { updateMeal, setUi } = useStore.getState();
  if (slot === 'Mittag' && !isWeekend(day) && !lunchOnWeekdays && !meal) return null;
  const r = meal && findRecipe(meal);

  return (
    <DropZone selectable target={{ type: 'mealSlot', date: day, slot }} className={`mealslot ${meal ? 'is-filled' : ''} ${compact ? 'is-compact' : ''}`} label={`${slot} am ${fmt.long(day)}`}>
      <span className="mealslot__label">{slot}</span>
      {meal ? (
        <motion.div layoutId={`meal-${day}-${slot}`} className="mealslot__meal">
          <Pickable payload={{ type: 'meal', day, slot, label: meal.name }} className="mealslot__pick">
            {r && !compact && <Icon name={recipeIcon(r)} size={24} className="mealslot__icon" />}
            <span className="grow">
              <b className="mealslot__name">{meal.name}</b>
              {r && <span className="small muted">{r.minutes} Min. · {meal.portions} Pers.{meal.meat ? ' · mit Fleisch' : ''}{meal.together ? ' · zusammen' : ''}</span>}
            </span>
          </Pickable>
          {!compact && (
            <div className="mealslot__tools" onClick={(e) => e.stopPropagation()}>
              {[2, 3, 4].map((p) => (
                <button key={p} className="chip" aria-pressed={meal.portions === p} onClick={() => updateMeal(day, slot, { portions: p })}>
                  {p}
                </button>
              ))}
              {r?.meat && (
                <button className="chip" aria-pressed={meal.meat} onClick={() => updateMeal(day, slot, { meat: !meal.meat })} title={r.meat.instruction} aria-label="Mit Fleisch">
                  <Icon name="meat" size={18} />
                </button>
              )}
              <button className="chip" aria-pressed={!!meal.together} onClick={() => updateMeal(day, slot, { together: !meal.together })} title="Zusammen kochen zählt als Wir-Zeit" aria-label="Zusammen kochen">
                <Icon name="wir" size={18} />
              </button>
              {r && (
                <button className="chip" onClick={() => setUi({ recipeOpen: r.id })} aria-label="Rezept öffnen">
                  <Icon name="book" size={18} />
                </button>
              )}
            </div>
          )}
        </motion.div>
      ) : (
        <span className="mealslot__empty small">{compact ? <Icon name="plus" size={16} label="Rezept" /> : 'Rezept hierher ziehen oder antippen'}</span>
      )}
    </DropZone>
  );
}
