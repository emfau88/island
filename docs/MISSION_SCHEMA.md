# Mission Schema

Eine Mission enthält:

- stabile ID, Figur, Titel und Kurzbeschreibung
- Start- und Zielort
- Anforderungen aus Pflicht- und Sperr-Flags
- zwei Routen mit explizitem Vorteil und Risiko
- Abholentscheidung
- pausierendes, missionsbezogenes Fahrtereignis
- Begegnungsentscheidung am Ziel
- Basisbelohnung, Abschluss-Flags und Folge-Nachricht
- optional routenabhängige Ankunftszeilen

Jede Wahl enthält Text, Reaktionszustand und ausstehende Effekte. Der Abschlussbildschirm kann diese über `effectLog` nach Quelle erklären.

Der persistente `ActiveMissionRun` enthält:

```ts
{
  missionId,
  phase,
  selectedPickupChoice,
  selectedRoute,
  selectedTravelChoice,
  selectedEncounterChoice,
  pendingEffects,
  effectLog,
  currentReaction,
  startedAt
}
```

Eine Nachricht enthält Storytext und mehrere Antworten. Jede Antwort kann Ressourcen, Beziehung, Stimmung, Heat und Story-Flags verändern. `replyId` verhindert eine doppelte Verbuchung.
