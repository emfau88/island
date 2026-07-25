# Mission Schema

Eine Mission enthält:

- stabile ID, Figur, Titel und Kurzbeschreibung
- Start- und Zielort
- Anforderungen aus Pflicht- und Sperr-Flags
- zwei Routen
- Abhol-, Fahrt- und Begegnungsentscheidungen
- Basisbelohnung und Abschluss-Flags
- flag-abhängige Folge-Nachricht

Jede Wahl enthält Text, Reaktionszustand und ausstehende Effekte. Validierungstests prüfen Referenzen, erreichbare Missionen, benutzte Flags, Abschlüsse und Progressionspfade.

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
  currentReaction,
  startedAt
}
```
