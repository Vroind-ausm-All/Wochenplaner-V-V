"""Einmal-Werkzeug: liest die Rezeptdaten (recipeV8) aus der alten Single-File-App
und schreibt sie ohne eingebettete Bilder nach src/data/recipes/legacy.json.

Aufruf:  python3 scripts/extract-legacy-recipes.py pfad/zur/index.html
"""
import json
import re
import sys
import unicodedata


def slug(text: str) -> str:
    text = text.replace('ß', 'ss').replace('&', 'und')
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def main(path: str) -> None:
    html = open(path, encoding='utf-8').read()
    line = next(l for l in html.splitlines() if l.startswith('const recipeV8 = '))
    data = json.loads(line[len('const recipeV8 = '):].rstrip().rstrip(';'))
    out = []
    for r in data:
        r.pop('image', None)
        nutrition = r.pop('nutrition', None)
        rec = {'id': slug(r['name']), **r}
        if nutrition and nutrition.get('coverage'):
            rec['nutrition'] = {
                'base': {k: round(v, 1) for k, v in nutrition['base'].items()},
                **({'meat': {k: round(v, 1) for k, v in nutrition['meat'].items()}} if nutrition.get('meat') else {}),
            }
        out.append(rec)
    with open('src/data/recipes/legacy.json', 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f'{len(out)} Rezepte geschrieben')


if __name__ == '__main__':
    main(sys.argv[1])
