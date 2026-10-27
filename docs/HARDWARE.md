# Hardware für den Bilderrahmen

Ziel: ein günstiges Touchdisplay, das in einem Bilderrahmen an der Wand unauffällig mitläuft.
Stand der Recherche: **Oktober 2026**. Alle Preise sind Richtwerte aus Momentaufnahmen und
schwanken stark – vor dem Kauf aktuell vergleichen.

## Was das Display können sollte

| Kriterium | Warum | Ideal |
|---|---|---|
| **Auflösung im Hochformat** | Die Oberfläche ist auf 1080 × 1920 ausgelegt (Woche mit 7 Spalten, Bausteinleiste unten) | 15,6″ Full HD hochkant passt 1 : 1; 10–11″-Tablets gehen auch, die Woche wird enger |
| **Kapazitiver Touch, 10 Punkte** | Halten-und-Ziehen, Wischen bei den Affirmationen | „10-Punkt-Touch“, kein resistiver Touch |
| **Flach** | Muss in einen Rahmen | Display ≤ 12 mm, Rechner dahinter oder außerhalb |
| **Ein Kabel** | Unauffällig | USB-C mit Strom + Bild + Touch, oder Tablet mit Ladekabel |
| **Helligkeit regelbar** | Nachts nicht als Lampe wirken | per Software oder Taste dimmbar |

## Drei Wege im Vergleich

| | A · Android-Tablet | B · 15,6″-Touchmonitor + Mini-Rechner | C · Raspberry Pi Touch Display 2 |
|---|---|---|---|
| Beispiel | Samsung Galaxy Tab A9+ / A11, Lenovo Tab M11 | UPERFECT 15,6″, InnoView 15,6″, Verbatim PMT-15-4K + Raspberry Pi 4/5 oder gebrauchter Mini-PC | offizielles 7″-Display + Raspberry Pi |
| Größe | 10–11″ | **15,6″ – passt zum Layout** | 7″ (zu klein für die Woche) |
| Kosten (Richtwert) | ca. 200 € (Listenpreise ~200–260 USD) | Monitor ~160–220 € + Rechner ~50–120 € → **ca. 250–330 €** | Display 60 USD Liste + Pi → ca. 120–180 € |
| Aufwand | gering: App installieren, URL eintragen | mittel: Rechner einrichten, Kiosk-Autostart | mittel |
| Einbautiefe | ~7–8 mm, alles in einem | Monitor ~9–12 mm + Rechner (hinter dem Rahmen oder unten in einer Box) | flach, Pi hinten |
| Strom 24/7 (Richtwert) | ~2–4 W → ca. 6–12 €/Jahr | ~8–12 W → ca. 25–37 €/Jahr | ~5–7 W |
| Bemerkung | Akku im Dauerbetrieb: Ladebegrenzung aktivieren, falls vorhanden | Raspberry Pi 5 kann **kein** Bild über USB-C ausgeben → Micro-HDMI für Bild + USB für Touch + eigenes Netzteil. Ein-Kabel-Betrieb nur mit Rechnern, deren USB-C DisplayPort ausgibt | Gut als Zweitdisplay in der Küche |

Strom gerechnet mit 0,35 €/kWh rund um die Uhr; mit Nachtabschaltung entsprechend weniger.

**Fertiggeräte** (z. B. Skylight 15″, Cozyla 15,6″) sind deutlich teurer (Cozyla laut Listings ~490–760 USD) und
laufen mit eigener Software – für diese App nicht nötig.

**Raspberry Pi:** Durch die Speicherkrise sind die Preise 2026 mehrfach gestiegen (Pi 5 mit 4 GB zuletzt 110 USD).
Für eine Web-App reicht ein Pi 4 mit 2 GB; ein gebrauchter Mini-PC oder Thin-Client kann günstiger sein.

## Empfehlung

1. **Jetzt kostenlos:** Test auf dem Laptop (siehe README) und mit der `Network:`-Adresse auf einem vorhandenen
   Tablet oder Handy im WLAN. So merkt ihr, ob ihr den Planer täglich nutzt und welche Größe ihr braucht.
2. **Für den Rahmen:**
   - *Am besten passend:* **Weg B** – 15,6″-Touchmonitor hochkant. Die Oberfläche ist genau auf diese Größe
     zugeschnitten. Monitor mit USB-C **und** Mini-HDMI wählen, dann passt er an jeden Rechner.
   - *Am einfachsten:* **Weg A** – ein 11″-Android-Tablet mit Kiosk-Browser. Alles in einem Gerät, sehr flach.
     Die Woche wird enger, bleibt aber bedienbar.

## Einbau in den Bilderrahmen

- **Objektrahmen / Shadow-Box** mit 3–5 cm Tiefe nehmen; ein flacher Fotorahmen ist zu dünn für Kabel und Rechner.
- **Frontglas weglassen** – Touch funktioniert nicht durch das Rahmenglas. Ein Passepartout mit Ausschnitt genau auf
  die aktive Bildfläche lässt die schwarzen Ränder verschwinden.
- Display von hinten mit Halteleisten oder Klettband fixieren, **nicht verkleben** (Tausch, Wärme).
- **Lüftung:** oben und unten in der Rückwand je einen Schlitz lassen, Rechner nicht luftdicht einschließen.
- **Aufhängung:** Bilderschiene oder Keilleiste (French Cleat), damit der Rahmen beim Tippen nicht wackelt.
- **Kabel:** Nur das dünne Niedervolt-Kabel (USB-C) zum Rahmen führen, z. B. in Kabelkanal in Wandfarbe oder
  im Leerrohr. **Netzteil zugänglich und belüftet an der Steckdose lassen** – keine Netzteile oder losen
  Netzleitungen in geschlossenen Wandhohlräumen.

## Kiosk-Software

**Android (Weg A):** Kiosk-Browser wie *Fully Kiosk Browser*: Start-URL eintragen, Vollbild, Bildschirm-Zeitplan.
Bewegungserkennung über die Kamera und Bildschirmschoner sind laut Community-Berichten Teil der kostenpflichtigen
Version und funktionieren nicht immer zuverlässig (z. B. bei wenig Licht) – vor dem Kauf testen.

**Raspberry Pi / Mini-PC (Weg B):**
1. Betriebssystem mit Desktop installieren (Raspberry Pi OS bzw. ein schlankes Linux), WLAN einrichten.
2. Bildschirm in den Anzeigeeinstellungen auf **Hochformat** drehen und prüfen, dass der Touch mitdreht.
3. Chromium im Kiosk-Modus beim Start öffnen, z. B.
   `chromium --kiosk --noerrdialogs --disable-session-crashed-bubble http://<adresse-des-planers>`
   (auf älteren Systemen heißt das Programm `chromium-browser`).
4. In der App *Einstellungen → Display & Kiosk*: Abdunkeln nach Inaktivität und Nachtmodus einstellen.
   Hinweis: Das Abdunkeln in der App schaltet die Hintergrundbeleuchtung nicht ab – echtes Abschalten
   übernimmt der Kiosk-Browser bzw. das Betriebssystem per Zeitplan.

## Daten auf mehreren Geräten

Ohne Server speichert jedes Gerät seine Daten im eigenen Browser. Damit Rahmen, Laptop und Handys dasselbe
sehen, braucht es einen kleinen Server im Heimnetz, der die App ausliefert und die Daten hält. Die App spricht
bereits das Protokoll des bisherigen Familienservers (`/api/status`, `/api/login`, `/api/state`, `/api/events`).
Naheliegend ist, ihn auf dem Rechner hinter dem Rahmen (Weg B) oder einem NAS laufen zu lassen.
Falls der alte Server nicht mehr vorliegt, ist ein schlanker Server dafür ein sinnvoller nächster Schritt.

## Quellen

- heise Bestenliste portable Monitore (Testsieger Verbatim PMT-15-4K, ~220 €): https://www.heise.de/bestenlisten/testsieger/top-10-der-beste-portable-monitor-mit-usb-c-von-lcd-bis-oled-4k-und-touch/j1w1mm9
- UPERFECT 15,6″ Touch, Angebot eBay.de (159,99 €): https://www.ebay.de/itm/356101814576
- Touchscreen-Monitore im Überblick (InnoView, KYY, ViewSonic TD1655): https://www.ofzenandcomputing.com/best-touchscreen-portable-monitors/ · https://www.bgr.com/2119644/best-budget-expensive-portable-monitors-2026/
- Raspberry Pi Touch Display 2 (Listenpreis 60 USD): https://raspberrypi.com/products/touch-display-2
- Raspberry-Pi-Preiserhöhungen 2026: https://www.notebookcheck.net/Raspberry-Pi-5-now-costs-up-to-205-due-to-RAM-crisis.1218213.0.html · https://liliputing.com/?p=198888
- Galaxy Tab A9+ vs. Lenovo Tab M11 (Preise in USD): https://mynexttablet.com/lenovo-tab-m11-vs-samsung-galaxy-tab-a9-comparison/ · https://www.kimovil.com/en/compare-tablets/lenovo-tab-m11,samsung-galaxy-tab-a9-plus
- DIY-Familienkalender Tablet vs. Raspberry Pi: https://dinkydash.co/diy-skylight-calendar/ · https://dinkydash.co/raspberry-pi-family-calendar/
- Fully Kiosk Browser – Erfahrungen mit Bewegungserkennung: https://community.sharptools.io/t/fully-kiosk-browser-screen-off-issue/14456
