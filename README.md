# Whore Island – Island Runner

Ein Mobile-First-HTML5-Spiel über kurze Concierge-Aufträge, automatische Fahrten, Entscheidungen und langfristige Beziehungen auf einer luxuriösen tropischen Insel.

## Entwicklungsstand

Phase 1 baut einen vollständigen Lola-Vertical-Slice mit drei Missionen. Die Referenzmockups liegen ausschließlich unter `docs/references/` und werden nicht zur Laufzeit geladen.

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
- PixiJS 8 für die gemeinsame Welt, Routen und das Fahrzeug
- HTML/CSS für HUD, Dialoge und Smartphone
- Vitest für Logik- und Progressionstests
- Playwright für Mobile-Flows, Reloads und Screenshots
- versionierter LocalStorage-Spielstand

## Spielprinzip

Auftrag wählen, Lola treffen, Route entscheiden, die Fahrt erleben, am Ziel reagieren und später die sichtbaren Konsequenzen in Beziehungen und Nachrichten wiederfinden.

## Datenschutz

Der Prototyp arbeitet vollständig lokal. Es werden keine Spielstände an einen Server übertragen.
