# WIR. Wochenplaner (V & V)

Familien- und Wochenplaner für ein **15,2″-Touchdisplay** (Hochformat-Bilderrahmen), Handy und Desktop.
Ausgearbeitet aus dem bisherigen Single-File-Board „WIR. Familienzentrale 9“ – jetzt als modulare
React-App mit Komponenten für Kalender, Wetter, Essensplanung und einen digitalen Wir-Begleiter.

```bash
npm install
npm run dev        # Entwicklung, im LAN erreichbar (--host)
npm test           # Unit-Tests (Wiederholungen, Einkaufsliste, Rezepte, Begleiter, Migration)
npm run build      # Produktions-Build nach dist/ – jeder statische Webspace genügt
```

**Inhalt:** [Erster Test auf dem Laptop](#erster-test-auf-dem-laptop) · [Alle Geräte verbinden](#alle-geräte-verbinden) ·
[Was drin ist](#was-drin-ist) · [Küchenwelten](#küchenwelten) · [Projektaufbau](#projektaufbau) ·
[Hardware für den Bilderrahmen](docs/HARDWARE.md) · [Heimserver](docs/HEIMSERVER.md)

## Erster Test auf dem Laptop

Ihr braucht nur einen aktuellen Browser (Chrome oder Edge empfohlen), **Node.js 22 LTS** ([nodejs.org](https://nodejs.org)) und Git.

1. **Projekt holen**
   ```bash
   git clone https://github.com/Vroind-ausm-All/Wochenplaner-V-V.git
   cd Wochenplaner-V-V
   git checkout claude/compassionate-cray-1vswzv   # bis der Pull Request gemergt ist
   npm install
   ```
2. **Starten:** `npm run dev` – dann im Browser **http://localhost:5173** öffnen.
   Die Konsole zeigt zusätzlich eine `Network:`-Adresse (z. B. `http://192.168.178.23:5173`). Die funktioniert auch
   auf Handy oder Tablet im selben WLAN – ideal, um Touch schon vor dem Display-Kauf echt auszuprobieren.
3. **Bilderrahmen simulieren:** `F12` → Geräte-Symbol (`Strg+Umschalt+M`, am Mac `Cmd+Shift+M`) →
   „Dimensions: Responsive“ → **1080 × 1920** eintragen. Die Maus verhält sich dann wie ein Finger
   (Touch-Emulation), d. h. zum Ziehen kurz gedrückt halten.
4. **Vollbild wie im Kiosk:** `F11`.
5. **Produktionsstand testen** (so läuft es später im Rahmen): `npm run build && npm run preview` → http://localhost:4173

Gut zu wissen beim Test:
- **Daten liegen im Browser** dieses Geräts (localStorage). Laptop, Handy und Rahmen sehen *nicht* automatisch dasselbe –
  dafür den Heimserver starten (nächster Abschnitt). Sicherung jederzeit über *Einstellungen → JSON exportieren*.
- **Wetter** braucht Internet; ohne Ort in den Einstellungen wird Berlin angezeigt.
- Meldungen zu `/api/status` in der Browser-Konsole sind normal, solange kein Heimserver läuft.

### Test-Checkliste

| ✓ | Was ausprobieren | Erwartung |
|---|---|---|
| ☐ | *Einstellungen*: eure Namen und den Wetter-Ort eintragen | Namen erscheinen in Affirmationen und beim Begleiter, Wetter für euren Ort |
| ☐ | *Kalender → Woche*: Baustein „Date Night“ auf einen Abend **ziehen** | Termin erscheint, oben „Rückgängig“ |
| ☐ | Baustein **antippen**, dann eine Uhrzeit **antippen** (Click & Drop) | Termin an dieser Stelle |
| ☐ | Termin auf einen anderen Tag ziehen; unteren Rand eines Termins ziehen | Termin verschoben bzw. länger/kürzer |
| ☐ | Termin antippen → in der Leiste unten „✎ Bearbeiten“ | Formular mit Chips statt kleiner Auswahlfelder |
| ☐ | Monat / Tag / Termine durchschalten | Wettersymbole an den Tagen, Abendessen im Wochenkopf |
| ☐ | *Essen*: Rezept auf „Abend“ ziehen, oder erst leeren Platz und dann Rezept antippen | Gericht geplant, *Einkauf* zählt hoch |
| ☐ | 📖 an einem Rezept → „Selbst machen →“ an einer Zutat | Grundrezept (z. B. Pastateig) öffnet sich |
| ☐ | *Wir-Zeit*: Energie für beide setzen, einen Vorschlag „✓ Einplanen“ | Begleiter ändert Stimmung, Termin im Kalender |
| ☐ | Affirmation nach links/rechts wischen, ♡ antippen | Nächster Gedanke, kleine Herz-Animation |
| ☐ | ☾ oben rechts, ◼ „Bildschirm dunkel“ | Nachtfarben bzw. schwarzer Schirm, Tippen weckt auf |
| ☐ | Bisheriges Board: dessen JSON-Export unter *Einstellungen → importieren* | Alte Termine, Einkauf, Aufgaben sind da |

## Alle Geräte verbinden

Der mitgelieferte **Heimserver** liefert die App im Heimnetz aus und hält einen gemeinsamen Plan für alle Geräte:

```bash
npm run build
WIR_PASSWORD="unser-passwort" npm run server     # → http://localhost:8787
```

Handy und Tablet öffnen im selben WLAN die Adresse des Laptops bzw. Pi auf Port 8787 (z. B. `http://192.168.178.23:8787`)
und melden sich einmal mit dem Haushalts-Passwort an. Änderungen erscheinen in unter einer Sekunde auf allen Geräten,
offline Geändertes wird später eintragsweise zusammengeführt. Dauerbetrieb, Zugriff von unterwegs und Installation als App:
[docs/HEIMSERVER.md](docs/HEIMSERVER.md).

## Was drin ist

| Bereich | Komponenten | Highlights |
|---|---|---|
| **Kalender** | `features/calendar/*` | Monat, Woche, Tag, Terminliste · Zeitraster füllt hohe Hochkant-Displays · Überlappungen in Spuren · Dauer per Griff ziehen · Jetzt-Linie · Serien („nur diesen / ganze Serie“) |
| **Drag & Drop + Click & Drop** | `dnd/*` | Ein Modell, drei Wege: Maus ziehen, **Touch: kurz halten & ziehen** (Scrollen bleibt frei), **antippen → Ziel antippen**. Umgekehrt geht auch: erst leeren Essensplatz, dann Rezept antippen. Papierkorb-Zone, Rückgängig nach jeder Aktion |
| **Wetter** | `features/weather/*` | Open-Meteo (ohne Konto/Key), aktuelle Lage, 7 Tage, stündlich in der Tagesansicht, Symbole in Monat/Woche/Terminliste, Ort-Suche & Standort |
| **Affirmationen** | `features/affirmations/*` | Motion: Wort-für-Wort-Einblendung, schwebende Lichter, Wischen zum Wechseln, Fortschrittsbalken, Herz mit Funken; personalisiert mit euren Namen; respektiert „Bewegung reduzieren“ |
| **WIR-Begleiter** | `features/companion/*` | „Wiri“ (animierter Avatar mit Stimmungen) plant Wir-Zeit mit: Wochenziel, eigene Zeit beider Personen, Abstand zur letzten Date Night, Check-in, volle Tage, Tagesenergie, Wetter → konkrete Vorschläge in **freien Zeitfenstern** (einplanen, verschieben oder ziehen). Frage des Tages, Wochenkompass, Ideen-Bibliothek |
| **Essensplan** | `features/meals/*` | 11 Küchenwelten, 103 glutenfreie Gerichte, 13 Grundrezepte zum Selbermachen, Ersatz-Guide, Küchen-Kompass, Portionen, Fleischoption, „zusammen kochen“ zählt als Wir-Zeit, Nährwert-Schätzbereiche, Hinweise auf versteckte Glutenquellen je Zutat |
| **Einkauf & Vorräte** | `features/shopping/*` | Liste entsteht automatisch aus dem Wochenplan; Vorräte zählen nur, wenn „GF geprüft“ |
| Aufgaben, Familie, Einstellungen | `features/tasks`, `family`, `settings` | Wiederkehrende Aufgaben, Fristen, Baby & Familie, Namen, Ort, Kiosk pro Gerät (Abdunkeln, Nachtmodus), Sicherung |
| **Abgleich & Heimserver** | `store/sync.ts`, `store/merge.ts`, `server/` | Live-Aktualisierung aller Geräte, Offline-Änderungen mit Drei-Wege-Abgleich, Anmeldung, tägliche Sicherungen, installierbare Web-App mit Offline-Start |

## Küchenwelten

Bisher: Deutsch, Französisch, Asiatisch, Nahost, Airfryer & Fastfood.
**Neu mit eigenen Rezepten:** 🇮🇹 Italienisch · 🇮🇳 Indisch · 🇲🇽 Mexikanisch & Latino · 🇬🇷 Griechisch ·
🇪🇸 Spanisch & Portugiesisch · 🌍 Afrikanisch (Äthiopien, Westafrika, Südafrika).
Als Ausblick im Küchen-Kompass: Thai/Vietnam, Japan, Korea, Peru, Brasilien, Persien, Türkei, Skandinavien, Karibik, Osteuropa.

Grundrezepte (`data/recipes/basics.ts`): Mehlmischung, Pizzateig, frischer Pastateig, Gnocchi, Maistortillas,
Injera aus Teff, Dosa, Paniermehl, Gemüsebrühe-Paste, Béchamel, Pão de queijo, Saatenbrot, Teriyaki mit Tamari.

## Projektaufbau

```
src/
  app/            App-Gerüst, Navigation, Kiosk (Nachtmodus, Abdunkeln)
  dnd/            Drag & Drop + Click & Drop: Pickable, DropZone, Ablage-Regeln
  features/
    calendar/     MonthView, TimeGrid (Woche/Tag), AgendaView, EventSheet, TemplateTray
    weather/      WeatherPanel, HourlyStrip, WeatherBadge, useWeather
    affirmations/ AffirmationCard (Motion)
    companion/    engine.ts (reine Logik, getestet), CompanionAvatar, Vorschläge, EnergyCheckin
    meals/        MealPlanner, MealSlotBox, RecipeDetail, DishArt
    shopping/ tasks/ family/ settings/ home/
  data/           Rezepte je Küche, Grundrezepte, Küchenwelten, Ersatz-Tabelle, Nährwerte, Bausteine
  lib/            Datum, Wiederholungen, Einkaufsliste, Nährwerte, Wetter
  store/          Zustand-Store mit Rückgängig, Migration, Abgleich (sync.ts, merge.ts), Geräte-Einstellungen
server/           Heimserver (Node.js, ohne Abhängigkeiten), systemd-Dienst, Tests
public/sw.js      Service Worker für Offline-Start
```

Eigene Rezepte ergänzt ihr in `src/data/recipes/<küche>.ts` (Mengen für 2 Personen). Der Test
`src/data/recipes.test.ts` meldet, wenn eine Zutat in der Nährwerttabelle (`src/data/nutrients.ts`) fehlt.

## Übernahme aus dem alten Board

- Beim ersten Start werden Daten unter `wir-board-4-v1` automatisch übernommen; JSON-Sicherungen lassen sich importieren.
- Datenmodell ist eine Obermenge des alten. Der neue Heimserver spricht dasselbe Protokoll wie der bisherige Familienserver (`/api/status`, `/api/login`, `/api/state`, `/api/events`).
- Die 67 Rezepte wurden mit `scripts/extract-legacy-recipes.py` übernommen; statt 700 KB eingebetteter Bilder zeichnet `DishArt` die Teller.

## Hinweise

- Nährwerte sind Schätzbereiche aus generischen Tabellen, keine Diätberatung. Glutenfrei-Hinweise ersetzen nicht die Prüfung der Kennzeichnung.
- Keine medizinischen Details auf dem für alle sichtbaren Display speichern.
- GitHub Pages: Settings → Pages → Source „GitHub Actions“, dann Workflow „Prüfen und Vorschau“ von Hand starten.
- Hardware-Empfehlungen für den Bilderrahmen: [docs/HARDWARE.md](docs/HARDWARE.md).
