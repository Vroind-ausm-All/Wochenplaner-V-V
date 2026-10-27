import type { Suggestion } from '../features/companion/engine';
import type { Template } from '../data/templates';
import type { ISODate, MealSlot, Time } from '../store/types';

/** Was gezogen bzw. per Tippen ausgewählt werden kann. */
export type Payload =
  | { type: 'template'; template: Template; label: string }
  | { type: 'event'; id: string; on: ISODate; label: string }
  | { type: 'recipe'; recipeId: string; label: string }
  | { type: 'meal'; day: ISODate; slot: MealSlot; label: string }
  | { type: 'suggestion'; suggestion: Suggestion; label: string };

/** Wohin abgelegt werden kann. */
export type Target =
  | { type: 'slot'; date: ISODate; time: Time }
  | { type: 'day'; date: ISODate }
  | { type: 'mealSlot'; date: ISODate; slot: MealSlot }
  | { type: 'trash' };

export const payloadKey = (p: Payload) => {
  switch (p.type) {
    case 'template': return `tpl:${p.template.id}`;
    case 'event': return `ev:${p.id}:${p.on}`;
    case 'recipe': return `rc:${p.recipeId}`;
    case 'meal': return `ml:${p.day}:${p.slot}`;
    case 'suggestion': return `sg:${p.suggestion.id}`;
  }
};

export const targetKey = (t: Target) => {
  switch (t.type) {
    case 'slot': return `slot:${t.date}:${t.time}`;
    case 'day': return `day:${t.date}`;
    case 'mealSlot': return `meal:${t.date}:${t.slot}`;
    case 'trash': return 'trash';
  }
};
