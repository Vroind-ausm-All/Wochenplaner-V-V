import { memo } from 'react';
import { cuisineById } from '../../data/cuisines';
import type { Recipe } from '../../data/recipes/types';

const hash = (s: string) => [...s].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);

/**
 * Illustrierter Teller, aus dem Rezept berechnet (statt 700 KB eingebetteter Bilder im alten Board).
 * Farbe aus der Küchenwelt, Belag deterministisch aus dem Rezeptnamen.
 */
export const DishArt = memo(function DishArt({ recipe, size = 'md' }: { recipe: Recipe; size?: 'sm' | 'md' | 'lg' }) {
  const h = hash(recipe.id);
  const hue = cuisineById(recipe.cuisine)?.hue ?? 30;
  const base = `hsl(${(hue + (h % 90) - 45 + 360) % 360} ${45 + (h % 25)}% ${56 + ((h >>> 5) % 14)}%)`;
  const toppings = Array.from({ length: 16 }, (_, i) => {
    const a = ((h >>> (i % 16)) % 360) * (Math.PI / 180) + i * 2.4;
    const r = 18 + ((h >>> (i % 8)) % 62);
    return {
      x: 150 + Math.cos(a) * r * 1.35,
      y: 100 + Math.sin(a) * r * 0.82,
      rx: 5 + ((h >>> i) % 9),
      ry: 3 + ((h >>> (i + 3)) % 6),
      rot: (h >>> (i % 11)) % 180,
      fill: [`hsl(${(hue + 110) % 360} 35% 48%)`, `hsl(${(hue + 30) % 360} 60% 72%)`, `hsl(${hue} 50% 42%)`, '#f3ead2'][i % 4],
    };
  });
  return (
    <svg className={`dish dish--${size}`} viewBox="0 0 300 200" role="img" aria-label={recipe.name}>
      <rect width="300" height="200" fill={`hsl(${hue} 30% 90%)`} />
      <path d="M0 0L300 200M-20 90L190 200" stroke="#fff" strokeOpacity=".22" strokeWidth="44" />
      <ellipse cx="156" cy="112" rx="118" ry="76" fill="#4a463a" opacity=".18" />
      <ellipse cx="150" cy="100" rx="122" ry="80" fill="#f5f1e6" />
      <ellipse cx="150" cy="100" rx="108" ry="68" fill="#fffdf6" />
      <ellipse cx="150" cy="100" rx="100" ry="62" fill={base} opacity=".92" />
      {toppings.map((t, i) => (
        <ellipse key={i} cx={t.x} cy={t.y} rx={t.rx} ry={t.ry} fill={t.fill} transform={`rotate(${t.rot} ${t.x} ${t.y})`} stroke="#ffffff55" strokeWidth="1.5" />
      ))}
      <text x="150" y="114" textAnchor="middle" fontSize="40">
        {recipe.symbol}
      </text>
    </svg>
  );
});
