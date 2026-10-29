import { memo } from 'react';
import { cuisineById } from '../../data/cuisines';
import { isVegetarian } from '../../data/recipes';
import type { Recipe } from '../../data/recipes/types';
import { IconGlyph, type IconName } from '../../ui/Icon';

/** Piktogramm eines Rezepts: Grundrezept, Airfryer, vegetarisch oder Teller. */
export const recipeIcon = (r: Recipe): IconName =>
  r.group === 'Grundrezept' ? 'book' : r.technique === 'Airfryer' || r.group === 'Airfryer' ? 'flame' : isVegetarian(r) ? 'leaf' : 'plate';

/**
 * Typografische Rezeptkarte statt Illustration: Kürzel der Küche, Teller als Linie, Piktogramm in der Mitte.
 * Farben kommen aus den Design-Tokens – funktioniert in Tag- und Nachtmodus.
 */
export const DishArt = memo(function DishArt({ recipe }: { recipe: Recipe }) {
  const code = cuisineById(recipe.cuisine)?.code ?? 'GF';
  return (
    <svg className="dish" viewBox="0 0 300 200" role="img" aria-label={recipe.name}>
      <rect width="300" height="200" className="dish__bg" />
      <text x="20" y="52" className="dish__code">
        {code}
      </text>
      <text x="20" y="180" className="dish__meta">
        {recipe.minutes} MIN · GLUTENFREI
      </text>
      <circle cx="206" cy="100" r="74" className="dish__plate" />
      <circle cx="206" cy="100" r="58" className="dish__plate" />
      <g className="dish__glyph">
        <IconGlyph name={recipeIcon(recipe)} x={182} y={76} size={48} strokeWidth={1.5} />
      </g>
    </svg>
  );
});
