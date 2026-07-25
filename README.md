# Whore Island – Island Runner

Ein Mobile-First-HTML5-Spiel über Concierge-Aufträge, Fahrten, Beziehungen und Konsequenzen auf einer luxuriösen tropischen Insel.

**Live:** https://emfau88.github.io/island/

## Entwicklungsstand

Der spielbare Lola-Vertical-Slice enthält drei vollständige Missionen. Die Insel ist die primäre Spielebene. Das Smartphone ist ein jederzeit schließbares Ingame-Werkzeug für Nachrichten, Antworten, Aufträge und Kontakte – keine eigene Spielwelt.

Die Referenzmockups liegen ausschließlich unter `docs/references/` und werden nicht zur Laufzeit geladen.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Qualitätsprüfungen:

```bash
npm run test
npm run build
npm run test:e2e
npm run check
```

## Technik

- Vite und TypeScript
- PixiJS 8 für gemeinsame Weltkoordinaten, Routen und Fahrzeug
- HTML/CSS für HUD, Dialoge und das Smartphone-Overlay
- datengetriebene Missionen und beantwortbare Nachrichten
- Vitest für Save-, Progressions-, Transaktions- und Konsequenztests
- Playwright für Onboarding, Mobile-Flows, Reloads und Screenshots
- validierter und migrierbarer LocalStorage-Spielstand

## Spielprinzip

Lolas Nachricht beantworten, ihren Treffpunkt in der Welt aufsuchen, Auftrag und Route abwägen, ein missionsbezogenes Fahrtereignis lösen und am Ziel mit den sichtbaren Konsequenzen leben. Beziehungen schalten Boni frei; hohe Heat-Stufen reduzieren die Auszahlung.

## Datenschutz

Das Spiel arbeitet vollständig lokal. Spielstände und Nachrichtenauswahl werden nicht an einen Server übertragen.
