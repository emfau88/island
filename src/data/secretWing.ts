import type {
  PropertyTierId,
  SecretWingLevel,
} from "../core/types";

export interface SecretWingTierDefinition {
  level: SecretWingLevel;
  id: "sealed" | "hidden-lounge" | "private-wing" | "midnight-wing";
  label: string;
  kicker: string;
  description: string;
  cost: number;
  requiredProperty: PropertyTierId;
  requiredMissions: number;
  requiredDiscovery: string | null;
  capacity: number;
  perks: string[];
}

export const SECRET_WING_TIERS: readonly SecretWingTierDefinition[] = [
  {
    level: 0,
    id: "sealed",
    label: "Versiegelter Hohlraum",
    kicker: "UNTER DEM ANWESEN",
    description:
      "Hinter der Felswand liegt mehr als nur Fundament. Ohne Plan bleibt der Zugang versiegelt.",
    cost: 0,
    requiredProperty: "shack",
    requiredMissions: 0,
    requiredDiscovery: null,
    capacity: 0,
    perks: ["Fundament untersuchen"],
  },
  {
    level: 1,
    id: "hidden-lounge",
    label: "Hidden Lounge",
    kicker: "MIDNIGHT WING · STUFE 1",
    description:
      "Ein diskreter, komfortabler Raum für vertrauliche Gespräche und einen ausgewählten Gast.",
    cost: 4_500,
    requiredProperty: "bungalow",
    requiredMissions: 3,
    requiredDiscovery: "hidden_foundation_plan",
    capacity: 1,
    perks: ["Eine Gästesuite", "Private Gesprächsszenen"],
  },
  {
    level: 2,
    id: "private-wing",
    label: "Private Wing",
    kicker: "MIDNIGHT WING · STUFE 2",
    description:
      "Zwei unabhängige Gästesuiten und eine gemeinsame Lounge schaffen Raum für Beziehungen und Konflikte.",
    cost: 8_000,
    requiredProperty: "pool-house",
    requiredMissions: 4,
    requiredDiscovery: "hidden_foundation_plan",
    capacity: 2,
    perks: ["Zwei Gästesuiten", "Lola–Mia-Gruppenszenen"],
  },
  {
    level: 3,
    id: "midnight-wing",
    label: "Midnight Wing",
    kicker: "SECRET DUNGEON · FINALE STUFE",
    description:
      "Ein exklusiver unterirdischer Club- und Safehouse-Bereich für spätere Ensemble-Szenen.",
    cost: 15_000,
    requiredProperty: "villa",
    requiredMissions: 6,
    requiredDiscovery: "hidden_foundation_plan",
    capacity: 3,
    perks: ["Ensemble-Abende", "Exklusive Inselaufträge"],
  },
] as const;

export function getSecretWingTier(
  level: SecretWingLevel,
): SecretWingTierDefinition {
  const tier = SECRET_WING_TIERS.find((candidate) => candidate.level === level);
  if (!tier) throw new Error(`Unknown secret wing level: ${level}`);
  return tier;
}
