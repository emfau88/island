# Visual Style

## Richtung

Luxuriöse tropische Nacht, stilisierter Realismus, warme praktische Lichter, dunkles Wasser, nasse Oberflächen und kontrollierte Neonakzente. Die Präsentation ist sinnlich und frech, aber nicht horrorartig, casinotypisch oder billig-cartoonhaft.

## Farben

| Rolle | Farbe |
| --- | --- |
| Grundfläche | `#050b13` |
| Panel | `rgba(6, 17, 28, 0.88)` |
| Lola / Primäraktion | `#ff4f9a` |
| Vertrauen | `#ad6cff` |
| Risiko / Heat | `#ff7a2f` |
| Navigation | `#38c9ff` |
| Erfolg | `#8bd64a` |
| Text | `#f7f7fb` |

## UI

- abgerundete dunkle Panels mit dünnen, subtilen Rändern
- Primäraktionen in Pink, Informationen in Cyan
- mindestens 44 CSS-Pixel große Touchflächen
- klarer Screen-Titel und höchstens eine dominante Aktion
- Charaktergrafik erhält deutlich mehr Raum als Kennzahlen
- keine externe Schriftabhängigkeit; robuste Systemschrift mit kondensierten Überschriften

## Referenzen

Die vollständigen Mockups liegen ausschließlich unter `docs/references/`. Sie definieren Stil und Wirkung, nicht die feste Komposition. Produktionscode darf keine Datei aus diesem Ordner laden.

## Verbotene Muster

- eingebrannte HUDs, Texte, Pins, Routen oder Figuren in Welt-/Location-Hintergründen
- reine Farbfilter als Reaktionszustand
- unscharf hochskalierte oder sichtbar geflickte Bilder
- CSS-Prozentkoordinaten für Weltobjekte
