# QA Checklist

## Assets

- [x] aktive Assets einzeln und als Kontaktbogen geprüft
- [x] kein HUD oder Text eingebrannt
- [x] Transparenz und Außenkanten geprüft
- [x] sechs Lola-Reaktionen sichtbar verschieden

## Smartphone und Onboarding

- [x] Insel bleibt beim Öffnen des Smartphones sichtbar
- [x] Smartphone ist kleiner als der Viewport und schließbar
- [x] alle drei Intro-Antworten sichtbar
- [x] Antwort wird gespeichert und nicht doppelt verbucht
- [x] Nachricht schaltet den Treffpunkt frei
- [x] Folge-Nachrichten führen zurück in den Weltloop
- [x] alle Nachrichtenetappen eines Kontakts erscheinen in einem durchgehenden Chat
- [x] Chatliste zeigt jeden Kontakt höchstens einmal

## Lola-Vertical-Slice

- [x] drei Missionen und Antwort-Gates erreichbar
- [x] Routen zeigen verständliche Vorteile und Risiken
- [x] Fahrtereignis pausiert Zeit und Fahrzeug
- [x] Route liegt auf der Straße
- [x] Fahrzeug dreht und bewegt sich korrekt
- [x] Reload in Missionsphasen
- [x] keine doppelten Belohnungen
- [x] kausaler Ergebnis-Breakdown
- [x] Heat-Abzug und Beziehungsbonus getestet

## Mobile

- [x] 360 × 800
- [x] 390 × 844
- [x] 412 × 915
- [x] 430 × 932
- [x] Desktop-Vorschau
- [x] keine horizontalen Überläufe
- [x] Touchflächen mindestens 44 CSS-Pixel
- [x] reduzierte Bewegung berücksichtigt

## Anwesen

- [x] Ausbau erst nach dem ersten abgeschlossenen Auftrag sichtbar
- [x] vier Stufen und Voraussetzungen verständlich dargestellt
- [x] Cash wird genau einmal abgezogen
- [x] Vertrauen wird durch einen Kauf nicht erhöht
- [x] Bild, Stufe und Kontaktstatus wechseln nach Ausbau
- [x] Lola-Einweihung ist schließbar und touchfreundlich
- [x] Anwesen und Cash überleben einen Reload

## Mia und soziales Gedächtnis

- [x] Mia besitzt eigene Portrait- und Reaktionsassets
- [x] Villa und Club sind eigenständige Missionsorte
- [x] alle Stufen der vertraulichen Übergabe sind spielbar
- [x] Mia-Effekte werden nicht versehentlich auf Lola gebucht
- [x] bekanntes und privates Wissen wird pro Figur getrennt gespeichert
- [x] Lola–Mia-Freundschaft und Spannung sind im Kontakt sichtbar
- [x] Bungalow-Szene löst genau einmal aus und überlebt Reload
- [x] vollständiger Mobile-E2E-Pfad abgedeckt

## Inselerkundung und Midnight Wing

- [x] alle sieben Landmarks sind per Tastatur und Touch erreichbar
- [x] Treffpunkt und freie Ortsaktionen teilen dieselbe lokale Ansicht
- [x] Ortsbesuche, Hinweise und abgeschlossene Aktionen überleben Reload
- [x] einmalige Aktionen können nicht doppelt vergütet werden
- [x] Bar-Hinweis schaltet die passende Dock-Entdeckung frei
- [x] Runner-Home ist auf der Karte sichtbar und öffnet den Social Hub
- [x] Midnight-Wing-Ausbau prüft Plan, Hausstufe, Missionen und Cash
- [x] Einladungen prüfen Vertrauen und freie Gästekapazität
- [x] Grenzen, private Erinnerung und freiwillige Abreise sind persistent
- [x] neue Ansichten verursachen keine Browserfehler

## Veröffentlichung

- [x] `npm run test`
- [x] `npm run build`
- [x] `npm run test:e2e`
- [x] GitHub-Pages-Workflow konfiguriert und bei Veröffentlichung verifiziert
