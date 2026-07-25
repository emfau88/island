# Technical Architecture

## Stack

Vite, TypeScript, PixiJS 8, HTML/CSS, Vitest und Playwright. Es gibt kein Backend.

## Szenen

`Game` orchestriert sechs Zustände: `hub`, `phone`, `pickup`, `route`, `travel` und `encounter`. Die DOM-Schicht rendert HUD und Interaktion; `WorldRenderer` verwaltet die PixiJS-Welt.

## State Machine

Nur explizit erlaubte Übergänge sind möglich. Ein aktiver Missionslauf hält Phase, Entscheidungen, ausstehende Effekte und aktuelle Reaktion. Nach jedem Schritt wird gespeichert.

## Speicherstand

Schema-Version 1 wird validiert geladen. Ungültige oder inkompatible Daten werden sicher auf einen definierten Initialzustand zurückgesetzt. Permanente Effekte werden erst bei Abschluss aus `pendingEffects` übernommen.

## Koordinatensystem

Die Welt besitzt 2048 × 3072 Einheiten. Kartenbild, Pins, Route und Fahrzeug liegen im selben PixiJS-Container. Der Container wird einmalig in den verfügbaren Viewport eingepasst; während der Fahrt folgt die Kamera demselben Container.

## Sicherheit

Spieltexte werden über DOM-APIs und `textContent` erzeugt. JSON enthält ausschließlich Daten und wird nicht als ausführbarer Inhalt behandelt.
