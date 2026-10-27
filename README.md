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
| Aufgaben, Familie, Einstellungen | `features/tasks`, `family`, `settings` | Wiederkehrende Aufgaben, Fristen, Baby & Familie, Namen, Ort, Kiosk (Abdunkeln, Nachtmodus), Sicherung |

## Küchenwelten

Bisher: Deutsch, Französisch, Asiatisch, Nahost, Airfryer & Fastfood.
**Neu mit eigenen Rezepten:** 🇮🇹 Italienisch · 🇮🇳 Indisch · 🇲🇽 Mexikanisch & Latino · 🇬🇷 Griechisch ·
🇪🇸 Spanisch & Portugiesisch · 🌍 Afrikanisch (Äthiopien, Westafrika, Südafrika).
Als Ausblick im Küchen-Kompass: Thai/Vietnam, Japan, Korea, Peru, Brasilien, Persien, Türkei, Skandinavien, Karibik, Osteuropa.

Grundrezepte (`data/recipes/basics.ts`): Mehlmischung, Pizzateig, frischer Pastateig, Gnocchi, Maistortillas,
Injera aus Teff, Dosa, Paniermehl, Gemüsebrühe-Paste, Béchamel, Pão de queijo, Saatenbrot, Teriyaki mit Tamari.

## Übernahme aus dem alten Board

- Beim ersten Start werden Daten unter `wir-board-4-v1` automatisch übernommen; JSON-Sicherungen lassen sich importieren.
- Datenmodell ist eine Obermenge des alten → der bisherige Familienserver (`/api/status`, `/api/login`, `/api/state`, `/api/events`) funktioniert weiter.
- Die 67 Rezepte wurden mit `scripts/extract-legacy-recipes.py` übernommen; statt 700 KB eingebetteter Bilder zeichnet `DishArt` die Teller.

## Hinweise

- Nährwerte sind Schätzbereiche aus generischen Tabellen, keine Diätberatung. Glutenfrei-Hinweise ersetzen nicht die Prüfung der Kennzeichnung.
- Keine medizinischen Details auf dem für alle sichtbaren Display speichern.
- GitHub Pages: Settings → Pages → Source „GitHub Actions“, dann Workflow „Prüfen und Vorschau“ von Hand starten.
