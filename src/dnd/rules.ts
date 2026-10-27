import { recipeById } from '../data/recipes';
import { isWeekend, toMinutes } from '../lib/date';
import { useStore } from '../store/store';
import type { MealSlot, Owner } from '../store/types';
import type { Payload, Target } from './types';
import { useDnd } from './state';

/** Darf `p` auf `t` abgelegt werden? Steuert Hervorhebung und Annahme. */
export function accepts(p: Payload, t: Target): boolean {
  switch (p.type) {
    case 'template':
    case 'suggestion':
      return t.type === 'slot' || t.type === 'day';
    case 'event':
      return t.type === 'slot' || t.type === 'day' || t.type === 'trash';
    case 'recipe':
      return t.type === 'mealSlot' || t.type === 'day' || t.type === 'slot';
    case 'meal':
      return t.type === 'mealSlot' || t.type === 'trash';
  }
}

/** Gemeinsame Ablage-Logik für Drag&Drop und Click&Drop. */
export function applyDrop(p: Payload, t: Target, owner: Owner = 'Beide'): boolean {
  if (!accepts(p, t)) return false;
  const s = useStore.getState();
  switch (p.type) {
    case 'template': {
      const date = t.type === 'slot' || t.type === 'day' ? t.date : '';
      const time = t.type === 'slot' ? t.time : p.template.defaultTime;
      s.addEvent(
        { title: p.template.title, date, time, duration: p.template.minutes, category: p.template.category, owner: p.template.category === 'Wir' ? 'Beide' : owner, allDay: false, repeat: 'none', reminder: 'none' },
        `${p.template.emoji} ${p.template.title} eingeplant`,
      );
      return true;
    }
    case 'suggestion': {
      const g = p.suggestion;
      if (g.kind === 'meal' && g.recipe && (t.type === 'day' || t.type === 'slot')) {
        s.placeMeal(t.date, 'Abend', g.recipe);
        return true;
      }
      const date = t.type === 'slot' || t.type === 'day' ? t.date : g.date;
      const time = t.type === 'slot' ? t.time : g.time;
      s.addEvent(
        { title: g.title, date, time, duration: g.duration, category: g.category, owner: g.owner, allDay: false, repeat: 'none', reminder: 'none', notes: g.reason, origin: 'companion' },
        `${g.emoji} ${g.title} eingeplant`,
      );
      if (g.recipe && g.kind === 'date') s.placeMeal(date, 'Abend', g.recipe, { together: true });
      return true;
    }
    case 'event': {
      if (t.type === 'trash') {
        s.deleteEvent(p.id);
        return true;
      }
      const ev = s.data.events.find((e) => e.id === p.id);
      if (!ev) return false;
      const time = t.type === 'slot' ? t.time : null;
      if (ev.repeat !== 'none') {
        // Bei Serien nachfragen, ob nur dieses Vorkommen gemeint ist.
        useDnd.setState({ seriesMove: { id: p.id, from: p.on, to: t.type === 'slot' || t.type === 'day' ? t.date : p.on, time } });
        return true;
      }
      if (t.type === 'slot' || t.type === 'day') s.moveEvent(p.id, p.on, t.date, time, 'all');
      return true;
    }
    case 'recipe': {
      const r = recipeById(p.recipeId);
      if (!r || t.type === 'trash') return false;
      let slot: MealSlot = 'Abend';
      if (t.type === 'mealSlot') slot = t.slot;
      else if (t.type === 'slot' && toMinutes(t.time) < 15 * 60 && (isWeekend(t.date) || s.data.settings.lunchOnWeekdays)) slot = 'Mittag';
      s.placeMeal(t.date, slot, r);
      return true;
    }
    case 'meal': {
      if (t.type === 'trash') s.removeMeal(p.day, p.slot);
      else if (t.type === 'mealSlot') s.moveMeal({ day: p.day, slot: p.slot }, { day: t.date, slot: t.slot });
      return true;
    }
  }
}
