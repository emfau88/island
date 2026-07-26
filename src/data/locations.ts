import { ASSETS } from "../core/AssetManager";
import type { LocationDefinition } from "../core/types";

export const LOCATIONS: readonly LocationDefinition[] = [
  {
    id: "villa",
    label: "Villa",
    mapLabel: "VILLA",
    description: "Diskrete Einladungen, alte Baupläne und Gespräche ohne Publikum.",
    world: { x: 520, y: 520 },
    asset: ASSETS.villa,
    color: 0x8bd64a,
    icon: "◆",
    kind: "venue",
  },
  {
    id: "pool",
    label: "Pool",
    mapLabel: "POOL",
    description: "Der soziale Mittelpunkt der Insel – offen, hell und niemals ganz privat.",
    world: { x: 1_430, y: 690 },
    asset: ASSETS.pool,
    color: 0x38c9ff,
    icon: "≈",
    kind: "venue",
  },
  {
    id: "club",
    label: "Nightclub",
    mapLabel: "CLUB",
    description: "Neon, VIP-Türen und Begegnungen, die selten im Club enden.",
    world: { x: 1_025, y: 1_050 },
    asset: ASSETS.club,
    color: 0xff4f9a,
    icon: "✦",
    kind: "venue",
  },
  {
    id: "runner-home",
    label: "Runner-Home",
    mapLabel: "RUNNER-HOME",
    description: "Dein sichtbarer Rückzugsort, sozialer Hub und Zugang zum Midnight Wing.",
    world: { x: 1_590, y: 1_535 },
    asset: ASSETS.property,
    color: 0x8bd64a,
    icon: "⌂",
    kind: "home",
  },
  {
    id: "bar",
    label: "Cliff Bar",
    mapLabel: "BAR",
    description: "Gerüchte, Inselkontakte und ein ruhiger Platz, um Heat abzubauen.",
    world: { x: 650, y: 1_620 },
    asset: ASSETS.bar,
    color: 0xffa43a,
    icon: "◇",
    kind: "venue",
  },
  {
    id: "dock",
    label: "Service-Dock",
    mapLabel: "DOCK",
    description: "Versiegelte Lieferungen, Vorräte und die weniger glamouröse Seite der Insel.",
    world: { x: 1_425, y: 2_175 },
    asset: ASSETS.dock,
    color: 0x38c9ff,
    icon: "▣",
    kind: "venue",
  },
  {
    id: "yacht",
    label: "Yacht-Dock",
    mapLabel: "YACHT-DOCK",
    description: "Private Anleger, diskrete Abfahrten und Aufträge mit Meerblick.",
    world: { x: 1_065, y: 2_725 },
    asset: ASSETS.yacht,
    color: 0xff4f9a,
    icon: "⚓",
    kind: "venue",
  },
] as const;

export function getLocation(id: LocationDefinition["id"]): LocationDefinition {
  const location = LOCATIONS.find((candidate) => candidate.id === id);
  if (!location) {
    throw new Error(`Unknown location: ${id}`);
  }
  return location;
}
