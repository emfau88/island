# Technical Architecture

## Stack

Vite, TypeScript, PixiJS 8, HTML/CSS, Vitest und Playwright. Es gibt kein Backend.

## Ebenen

`Game` orchestriert fünf Weltzustände: `hub`, `pickup`, `route`, `travel` und `encounter`. Der Hub und die Fahrten bleiben echte PixiJS-Weltszenen.

Das Smartphone ist kein State der Szenenmaschine. Es wird als unabhängiger DOM-Dialog über der bestehenden Welt geöffnet, aktualisiert und geschlossen. Dadurch bleiben Ort, Karte und visueller Kontext erhalten.

## Spielsysteme

- `MissionSystem`: Transaktionen, Effektprotokoll, Routen, Abschluss und Heat-/Beziehungsboni
- `MessageSystem`: einmalige Antworten, Konsequenzen, Story-Flags und Missionsfreischaltung
- `ProgressionSystem`: Heat-Stufen, Beziehungstiers, Boni und Runner-Stil
- `FeedbackSystem`: optionaler Sound und Haptik
- `WorldRenderer`: Karte, Routen, Fahrzeug, Kamera sowie pausierbare Fahrten

## Speicherstand

Schema-Version 2 speichert Nachrichtenauswahl, Einstellungen, Missionsstile und kausale Effektprotokolle. Version-1-Spielstände werden migriert. Ungültige Daten fallen sicher auf einen definierten Initialzustand zurück.

Missionswerte bleiben bis zum Abschluss in `pendingEffects`. Erst eine gültige Abschlusswahl verbucht Ressourcen und Beziehungen atomar. Nachrichtenantworten sind ebenfalls idempotent.

## Koordinatensystem

Die Welt besitzt 2048 × 3072 Einheiten. Kartenbild, Pins, Routen und Fahrzeug liegen im selben PixiJS-Container. Während der Fahrt folgt die Kamera dem Fahrzeug. Ein Missionsereignis kann die Route pausieren, ohne Zeitfortschritt zu verlieren.

## Sicherheit

Spieltexte werden über DOM-APIs und `textContent` erzeugt. JSON enthält ausschließlich Daten und wird nicht als ausführbarer Inhalt behandelt.
