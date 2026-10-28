# Heimserver: Handy, Tablet und Bilderrahmen teilen einen Plan

Der Heimserver ist ein kleines Programm (`server/server.mjs`, ohne Zusatzpakete). Er läuft auf einem
Rechner im Heimnetz, liefert die App aus und hält den gemeinsamen Datenstand.
Idealer Ort: der Raspberry Pi oder Mini-PC hinter dem Bilderrahmen, alternativ ein NAS oder ein
dauerhaft laufender Rechner.

```
Handy ──┐                       ┌─ liefert die App aus
Tablet ─┼── WLAN ──► Heimserver ┼─ speichert den Stand (+ tägliche Sicherung, 30 Tage)
Rahmen ─┘                       └─ meldet Änderungen sofort an alle Geräte
```

## So funktioniert der Abgleich

- Jedes Gerät speichert den Plan zusätzlich lokal. Die App funktioniert also auch, wenn der Server
  oder das WLAN kurz weg ist. Die Statuszeile unten in der Navigation zeigt:
  „☁ Alle Geräte aktuell“, „⏳ Wird abgeglichen …“ oder „⚠ Offline · wird nachgeholt“.
- Änderungen gehen nach ~0,3 Sekunden an den Server. Der benachrichtigt alle anderen Geräte, die
  sich sofort aktualisieren.
- Haben zwei Geräte gleichzeitig (oder offline) geändert, werden beide Stände **eintragsweise
  zusammengeführt**: Handy hakt „Milch“ ab, Tablet plant ein Abendessen – beides bleibt erhalten.
  Nur wenn beide *dasselbe Feld desselben Eintrags* unterschiedlich ändern, gewinnt das Gerät, das
  zuletzt sendet. Wurde ein Eintrag auf einem Gerät gelöscht und auf dem anderen geändert, bleibt er erhalten.
- Ein **neues Gerät** übernimmt beim ersten Verbinden den gemeinsamen Plan. Sein bisheriger Stand
  wird gesichert (*Einstellungen → Alle Geräte verbinden → Herunterladen*).
- Abdunkeln und Nachtmodus gelten **pro Gerät** und werden nicht geteilt.

## Einrichten (Raspberry Pi OS, gilt sinngemäß für jedes Linux)

1. **Node.js installieren** (Version 20 oder neuer) und das Projekt holen:
   ```bash
   sudo apt install -y nodejs npm git      # bei zu alter Version: Node.js 22 über nodejs.org/NodeSource
   git clone https://github.com/Vroind-ausm-All/Wochenplaner-V-V.git
   cd Wochenplaner-V-V
   npm ci && npm run build
   ```
2. **Ausprobieren:**
   ```bash
   WIR_PASSWORD="unser-langes-passwort" npm run server
   ```
   Auf Handy oder Laptop im selben WLAN `http://<name-oder-ip-des-pi>:8787` öffnen, z. B.
   `http://raspberrypi.local:8787` (funktioniert auf den meisten Geräten) oder `http://192.168.178.40:8787`.
   Die App fragt einmal nach dem Haushalts-Passwort.
3. **Dauerhaft als Dienst starten:**
   ```bash
   sudo cp server/wir-planer.env.example /etc/wir-planer.env
   sudo nano /etc/wir-planer.env            # Passwort, Pfade eintragen
   sudo chmod 600 /etc/wir-planer.env
   sudo cp server/wir-planer.service /etc/systemd/system/
   sudo nano /etc/systemd/system/wir-planer.service   # Benutzer & Pfad prüfen
   sudo systemctl enable --now wir-planer
   systemctl status wir-planer
   ```
4. **Bilderrahmen** öffnet im Kiosk-Browser `http://localhost:8787` (läuft der Server auf demselben
   Rechner) – siehe [HARDWARE.md](HARDWARE.md#kiosk-software).
5. **Bisherige Daten übernehmen:** Auf dem Gerät mit den meisten Einträgen zuerst verbinden – ist der Server
   noch leer, übernimmt er dessen Stand. Alternativ später unter *Einstellungen → JSON importieren*.

Tipp: Jedes Gerät sollte immer **dieselbe Adresse** benutzen (z. B. immer `raspberrypi.local:8787`).
Für den Browser sind `raspberrypi.local` und `192.168.178.40` zwei verschiedene Seiten mit getrennter
Anmeldung und getrenntem lokalen Speicher.

## Update auf eine neue Version

```bash
cd Wochenplaner-V-V && git pull && npm ci && npm run build && sudo systemctl restart wir-planer
```
Die Daten liegen getrennt im Datenordner und bleiben erhalten. Geräte laden die neue Version beim nächsten Öffnen.

## Unterwegs nutzen und als App installieren (HTTPS)

Browser erlauben **Offline-Start und „Als App installieren“ nur über HTTPS** (oder auf `localhost`).
Im Heimnetz über `http://` funktioniert alles andere normal.

Empfehlung: **Tailscale** (kostenlos für private Nutzung) – ein privates Netz zwischen euren Geräten:
1. Tailscale auf dem Pi und auf den Handys installieren, mit demselben Konto anmelden.
2. In der Tailscale-Verwaltung *MagicDNS* und *HTTPS-Zertifikate* einschalten.
3. Auf dem Pi: `sudo tailscale serve --bg 8787`
4. Auf den Handys die angezeigte Adresse öffnen (`https://<pi-name>.<tailnet>.ts.net`) und
   *Einstellungen → Als App installieren* bzw. in Safari *Teilen → Zum Home-Bildschirm*.

So ist die Einkaufsliste auch im Supermarkt aktuell, der Server bleibt aber von außen unsichtbar –
nur eure eigenen Geräte kommen hinein. Eine Portfreigabe im Router ist **nicht** nötig und auch nicht empfohlen.
Alternative ohne Zusatzdienst: das VPN der Fritzbox (WireGuard); dann gilt aber wieder `http://` ohne Installation.

## Sicherheit & Sicherungen

- Ein Haushalts-Passwort für alle; wer es kennt, sieht alle Einträge. Keine medizinischen Details eintragen.
- Anmeldung bleibt bis zu 400 Tage gültig (Cookie, nicht per Skript auslesbar). *Einstellungen → Dieses Gerät abmelden*.
- Nach 10 Fehlversuchen ist die Anmeldung für 15 Minuten gesperrt.
- Datenordner (`WIR_DATA`): `state.json` = aktueller Stand, `backups/` = eine Sicherung pro Tag, 30 Tage lang.
  *Einstellungen → Serverstand sichern* lädt den aktuellen Stand als Datei herunter.
- Wiederherstellen: Sicherungsdatei unter *Einstellungen → JSON importieren* laden – sie wird an alle Geräte verteilt.

## Für Entwicklung

```bash
WIR_PASSWORD=test npm run server   # Terminal 1 – Server auf :8787
npm run dev                        # Terminal 2 – Vite leitet /api an den Server weiter
npm test                           # u. a. server/server.test.mjs und src/store/merge.test.ts
```

| Variable | Standard | Bedeutung |
|---|---|---|
| `WIR_PASSWORD` | – (Pflicht) | Haushalts-Passwort |
| `PORT` | `8787` | Port |
| `HOST` | `0.0.0.0` | `127.0.0.1`, wenn nur der Rechner selbst zugreifen soll (z. B. hinter `tailscale serve`) |
| `WIR_DATA` | `./server-daten` | Datenordner |
| `WIR_DIST` | `./dist` | gebaute App |

Protokoll (kompatibel zum Familienserver des alten Boards): siehe Kopf von `server/server.mjs`.
