import type { CharacterId, Reaction } from "./types";

const BASE = import.meta.env.BASE_URL;

export const ASSETS = {
  world: `${BASE}assets/world/island-night.webp`,
  pool: `${BASE}assets/locations/pool/pool-night.webp`,
  poolGuests: `${BASE}assets/locations/pool/pool-guests.png`,
  yacht: `${BASE}assets/locations/yacht/yacht-dock-night.webp`,
  portrait: `${BASE}assets/characters/lola/lola-portrait.webp`,
  miaPortrait: `${BASE}assets/characters/mia/mia-portrait.webp`,
  villa: `${BASE}assets/locations/villa/villa-night.webp`,
  club: `${BASE}assets/locations/club/club-night.webp`,
  bar: `${BASE}assets/locations/bar/bar-night.webp`,
  dock: `${BASE}assets/locations/dock/dock-service-night.webp`,
  car: `${BASE}assets/vehicles/runner-car.png`,
  property: `${BASE}assets/property/property-progression.png`,
  midnightWing: `${BASE}assets/property/midnight-wing.webp`,
} as const;

const LOLA_REACTIONS: Record<Reaction, string> = {
  neutral: `${BASE}assets/characters/lola/lola-neutral.png`,
  positive: `${BASE}assets/characters/lola/lola-positive.png`,
  flirty: `${BASE}assets/characters/lola/lola-flirty.png`,
  serious: `${BASE}assets/characters/lola/lola-serious.png`,
  annoyed: `${BASE}assets/characters/lola/lola-annoyed.png`,
  surprised: `${BASE}assets/characters/lola/lola-surprised.png`,
};

const LOLA_POOL_REACTIONS: Record<Reaction, string> = {
  neutral: `${BASE}assets/characters/lola/lola-pool-neutral.png`,
  positive: `${BASE}assets/characters/lola/lola-pool-positive.png`,
  flirty: `${BASE}assets/characters/lola/lola-pool-positive.png`,
  serious: `${BASE}assets/characters/lola/lola-pool-serious.png`,
  annoyed: `${BASE}assets/characters/lola/lola-pool-serious.png`,
  surprised: `${BASE}assets/characters/lola/lola-pool-positive.png`,
};

const MIA_REACTIONS: Record<Reaction, string> = {
  neutral: `${BASE}assets/characters/mia/mia-neutral.png`,
  positive: `${BASE}assets/characters/mia/mia-positive.png`,
  flirty: `${BASE}assets/characters/mia/mia-positive.png`,
  serious: `${BASE}assets/characters/mia/mia-serious.png`,
  annoyed: `${BASE}assets/characters/mia/mia-annoyed.png`,
  surprised: `${BASE}assets/characters/mia/mia-serious.png`,
};

export function characterPortrait(characterId: CharacterId): string {
  return characterId === "mia" ? ASSETS.miaPortrait : ASSETS.portrait;
}

export function reactionAsset(reaction: Reaction, characterId: CharacterId = "lola"): string {
  return characterId === "mia" ? MIA_REACTIONS[reaction] : LOLA_REACTIONS[reaction];
}

export function poolReactionAsset(
  reaction: Reaction,
  characterId: CharacterId,
): string {
  return characterId === "lola"
    ? LOLA_POOL_REACTIONS[reaction]
    : MIA_REACTIONS[reaction];
}

export async function preloadReaction(
  reaction: Reaction,
  characterId: CharacterId = "lola",
): Promise<void> {
  const image = new Image();
  image.src = reactionAsset(reaction, characterId);
  await image.decode();
}
