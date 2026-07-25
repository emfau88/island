# Repository-Veröffentlichung

1. `npm ci`
2. `npm run check`
3. `npm run test:e2e`
4. Änderungen gezielt committen und auf `main` pushen
5. In GitHub unter **Settings → Pages** die Quelle **GitHub Actions** wählen
6. Workflow `Deploy GitHub Pages` abwarten
7. Produktion unter `https://emfau88.github.io/island/` prüfen

`node_modules`, lokale Testartefakte und ZIP-Dateien werden nicht eingecheckt.
