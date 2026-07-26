import { characterPortrait } from "../core/AssetManager";
import type { CharacterId } from "../core/types";

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  traits: string;
  relationshipCopy: {
    new: string;
    known: string;
    trusted: string;
    vip: string;
  };
}

export const CHARACTERS: readonly CharacterDefinition[] = [
  {
    id: "lola",
    name: "Lola",
    traits: "Spontan · verspielt · aufmerksamkeitsliebend",
    relationshipCopy: {
      new: "Lola testet noch, ob du zuverlässig bist.",
      known: "Lola erwähnt dich und meldet sich persönlich.",
      trusted: "Lola vertraut dir auch heikle Dinge an.",
      vip: "Du gehörst zu Lolas innerem Kreis.",
    },
  },
  {
    id: "mia",
    name: "Mia",
    traits: "Diskret · strategisch · aufmerksam",
    relationshipCopy: {
      new: "Mia prüft, ob du Grenzen respektierst.",
      known: "Mia beginnt, dich in ihre Pläne einzubeziehen.",
      trusted: "Mia spricht offen über Risiken und Loyalitäten.",
      vip: "Mia behandelt dich als echte Vertrauensperson.",
    },
  },
] as const;

export function getCharacter(id: CharacterId): CharacterDefinition {
  const character = CHARACTERS.find((candidate) => candidate.id === id);
  if (!character) throw new Error(`Unknown character: ${id}`);
  return character;
}

export function getCharacterPortrait(id: CharacterId): string {
  return characterPortrait(id);
}
