# Asset Pipeline

## Mastergrößen

- Insel: mindestens 2048 × 2458
- Locations: mindestens 1536 × 2048
- Charakterposen: Ziel 1536 × 2048
- Portraits: mindestens 768 × 768
- Fahrzeug: mindestens 512 × 512

## Benennung

Kleinbuchstaben, Bindestriche und Zustandsnamen, zum Beispiel `lola-positive.webp`. Runtime-Dateien werden verlustarm als WebP oder PNG exportiert.

## Trennung

Welt- und Location-Hintergründe enthalten keine UI, Texte, Pins, Routen, Figuren oder Fahrzeuge. Charaktere und Fahrzeuge werden als separate Ebenen verwendet, sofern die Kantenprüfung bestanden ist.

## Prüfung

Vor Integration wird jedes aktive Asset einzeln geöffnet. Der Kontaktbogen dokumentiert Auflösung, Transparenz, Status und Verwendung. Beschädigte, unscharfe oder inkonsistente Varianten werden nicht eingebunden.

## Referenzbilder

Vollständige Mockups bleiben unter `docs/references/` und werden weder importiert noch aus `public/` ausgeliefert.
