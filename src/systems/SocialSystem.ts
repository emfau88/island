import {
  clamp,
  type CharacterId,
  type Effects,
  type SaveState,
  type SocialConsequences,
} from "../core/types";

export function applyCharacterEffects(
  state: SaveState,
  characterId: CharacterId,
  effects: Partial<Effects>,
  moodBase?: number,
): SaveState {
  const current = state.relationships[characterId];
  return {
    ...state,
    relationships: {
      ...state.relationships,
      [characterId]: {
        attraction: clamp(current.attraction + (effects.attraction ?? 0)),
        trust: clamp(current.trust + (effects.trust ?? 0)),
        mood: clamp((moodBase ?? current.mood) + (effects.mood ?? 0)),
      },
    },
  };
}

export function applySocialConsequences(
  state: SaveState,
  consequences: SocialConsequences | undefined,
  now = Date.now(),
): SaveState {
  if (!consequences) return state;
  let relationships = { ...state.relationships };
  for (const characterId of Object.keys(consequences.relationships ?? {}) as CharacterId[]) {
    const effects = consequences.relationships?.[characterId];
    if (!effects) continue;
    const current = relationships[characterId];
    relationships = {
      ...relationships,
      [characterId]: {
        attraction: clamp(current.attraction + (effects.attraction ?? 0)),
        trust: clamp(current.trust + (effects.trust ?? 0)),
        mood: clamp(current.mood + (effects.mood ?? 0)),
      },
    };
  }

  const memories = [...state.social.memories];
  for (const memory of consequences.memories ?? []) {
    if (!memories.some((candidate) => candidate.id === memory.id)) {
      memories.push({ ...memory, createdAt: now });
    }
  }

  return {
    ...state,
    relationships,
    social: {
      lolaMia: {
        friendship: clamp(
          state.social.lolaMia.friendship + (consequences.friendship ?? 0),
        ),
        tension: clamp(state.social.lolaMia.tension + (consequences.tension ?? 0)),
      },
      memories,
    },
  };
}
