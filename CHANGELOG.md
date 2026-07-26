# Changelog

## 0.7.0 – Social Pool & Stable World

- persistenter Pixi-Renderer verhindert WebGL-Kontextwechsel und den schwarzen Hub nach langen Questketten
- Render-Epochen schützen vor verspäteten asynchronen Szenen, die eine neuere Welt überschreiben
- dicht geglättete Fahrpfade mit getrennten Straßen-Ankern statt Querfeldein-Linien zwischen Gebäude-Pins
- kleineres Fahrzeug mit zur Fahrbahn passender Skalierung und Ausrichtung
- jederzeit sichtbarer Vollbild-Toggle direkt im HUD
- vollständig sichtbares Runner-Home mit normal fließendem Detailbereich
- eigener Anwesen-Bildmodus zum Ausblenden der Ausbauoberfläche
- erste interaktive Pool-Social-Scene mit sichtbaren, antippbaren Figuren und Bild-Hotspots
- drei eigens freigestellte Lola-Poolposen in konsistentem Resort-Swimwear-Look für neutral, positiv und ernst
- Story-Spots ersetzen technische Ortslisten: Entdeckungen werden direkt im Location-Bild gefunden und ausgespielt
- zwei sichtbare Poolgäste verbinden den Hinweis „Gespräch am Beckenrand“ mit der tatsächlich gezeigten Szene
- bildbasierte Entdeckungs-Drawer mit Ortsausschnitt, natürlicher Handlungsaufforderung und persistentem Ergebnis
- fünf persistente Lola-, Mia- und Gruppenszenen mit sozialem Gedächtnis
- neue Route-, Pool-, Renderer-, Mobile- und Persistenztests

## 0.6.0 – Mobile UX

- unveränderte Inselkarte ohne stilfremde, gezeichnete Effekt-Overlays
- nativer Vollbildmodus im Spielmenü sowie installierbare Mobile-Web-App mit Fullscreen-Start
- mobile Ortsansichten mit großem, frei sichtbarem Hero-Bild und darunterliegender Aktionsfläche
- nahezu bildschirmfüllendes Ingame-Smartphone auf kleinen Displays
- Messenger-Etappen mit eindeutiger Markierung für Verlauf, Abschluss und aktuelle Antwort
- automatischer Sprung zur aktuellen Chat-Etappe, ohne ältere Nachrichten auszublenden
- geheimnisvollere Midnight-Wing-Texte ohne vorweggenommene Regel-Erklärungen
- erweiterte Unit-, Desktop- und Mobile-E2E-Abdeckung

## 0.5.0 – Erkundbare Insel & Midnight Wing

- sieben direkt anwählbare Inselorte mit zugänglichen, touchfreundlichen Landmarks
- lokale Vollbildansichten für Pool, Villa, Club, Bar, Service-Dock und Yacht-Dock
- zwölf einmalige Ortsaktivitäten mit Kosten, Heat, Beziehungen und ortsübergreifenden Hinweisen
- Runner-Home als eigener Social Hub für Ausbau, Besuche und soziale Erinnerungen
- dreistufiger Midnight Wing als langfristiger Geld-Sink unter dem Anwesen
- Einladungen, explizite Regelgespräche, private Erinnerungen und persistente Aufenthaltsphasen
- neue Bar-, Service-Dock- und Midnight-Wing-Kulissen
- Save-Migration auf Version 5 sowie Unit- und Mobile-E2E-Abdeckung

## 0.4.0 – Mia & soziales Gedächtnis

- Mia als eigener Kontakt mit konsistenten Portrait- und Reaktionsassets
- vertrauliche Villa-zum-Club-Mission mit zwei lesbaren Routen
- Lolas Anruf als echte soziale Entscheidung statt bedeutungslosem Fahrt-Input
- getrenntes Wissen: Lola und Mia erinnern sich nur an das, was sie tatsächlich wissen
- sichtbare Freundschaft und Spannung zwischen Lola und Mia im Kontakt-Menü
- ein durchgehendes Chatfenster pro Kontakt statt einzelner Story-Chats
- private Bungalow-Zwischenszene mit drei dauerhaft gespeicherten Ausgängen
- neue Villa- und Club-Nachtkulissen sowie Save-Migration auf Version 4
- Unit-Abdeckung für Mia-Effekte, asymmetrisches Wissen und die Anwesen-Szene

## 0.3.0 – Anwesen-Progression

- vier sichtbare Ausbaustufen von der Strandhütte bis zur Island-Villa
- Missions-, Fan- und Cash-Voraussetzungen statt isoliertem Aufbauspiel
- kleine Anziehungs- und Stimmungsboni; Vertrauen bleibt entscheidungsbasiert
- interaktive Lola-Einweihungsszene nach jedem Ausbau
- Anwesen-Onboarding, Kontaktstatus und Save-Migration auf Version 3
- eigenes vierstufiges Nacht-Asset für dieselbe Klippenparzelle
- Unit- und Mobile-E2E-Abdeckung für Kauf, Konsequenz und Reload

## 0.2.0 – World-first UX

- Smartphone als Ingame-Overlay über der sichtbaren Insel
- beantwortbare Nachrichten mit späteren Konsequenzen
- pausierende Fahrtereignisse, Routen-Trade-offs und Ergebnisursachen
- Heat-Stufen, Beziehungstiers und Runner-Stile

## 0.1.0 – Lola-Vertical-Slice

- Projektstruktur, Produktionsplanung und Phase-1-Asset-Pipeline angelegt
- elf getrennte, geprüfte Produktionsassets samt Kontaktbogen integriert
- gemeinsames PixiJS-Weltkoordinatensystem für Karte, Pins, Routen und Fahrzeug
- drei datengetriebene Lola-Missionen vollständig implementiert
- transaktionaler, versionierter LocalStorage-Spielstand mit Reload-Wiederherstellung
- Smartphone mit Aufträgen, Nachrichten und Kontaktwerten
- Unit-, Progressions- und Mobile-E2E-Tests
