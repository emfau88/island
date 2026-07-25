import type { Reaction } from "./types";

const BASE = import.meta.env.BASE_URL;

export const ASSETS = {
  world: `${BASE}assets/world/island-night.webp`,
  pool: `${BASE}assets/locations/pool/pool-night.webp`,
  yacht: `${BASE}assets/locations/yacht/yacht-dock-night.webp`,
  portrait: `${BASE}assets/characters/lola/lola-portrait.webp`,
  car: `${BASE}assets/vehicles/runner-car.png`,
} as const;

const REACTIONS: Record<Reaction, string> = {
  neutral: `${BASE}assets/characters/lola/lola-neutral.png`,
  positive: `${BASE}assets/characters/lola/lola-positive.png`,
  flirty: `${BASE}assets/characters/lola/lola-flirty.png`,
  serious: `${BASE}assets/characters/lola/lola-serious.png`,
  annoyed: `${BASE}assets/characters/lola/lola-annoyed.png`,
  surprised: `${BASE}assets/characters/lola/lola-surprised.png`,
};

export function reactionAsset(reaction: Reaction): string {
  return REACTIONS[reaction];
}

export async function preloadReaction(reaction: Reaction): Promise<void> {
  const image = new Image();
  image.src = reactionAsset(reaction);
  await image.decode();
}
