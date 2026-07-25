import { ASSETS } from "../core/AssetManager";
import type { LocationDefinition } from "../core/types";

export const LOCATIONS: LocationDefinition[] = [
  {
    id: "pool",
    label: "Pool",
    world: { x: 1_430, y: 690 },
    asset: ASSETS.pool,
  },
  {
    id: "yacht",
    label: "Yacht-Dock",
    world: { x: 1_065, y: 2_725 },
    asset: ASSETS.yacht,
  },
];

export function getLocation(id: LocationDefinition["id"]): LocationDefinition {
  const location = LOCATIONS.find((candidate) => candidate.id === id);
  if (!location) {
    throw new Error(`Unknown location: ${id}`);
  }
  return location;
}
