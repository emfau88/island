import type { Effects, PropertyTierId, Reaction } from "../core/types";

export interface PropertyTierDefinition {
  id: PropertyTierId;
  level: number;
  label: string;
  kicker: string;
  cost: number;
  requiredMissions: number;
  requiredFans: number;
  description: string;
  impression: string;
  perks: string[];
  effects: Partial<Effects>;
  reaction: Reaction;
  lolaLine: string;
}

export const PROPERTY_TIERS: readonly PropertyTierDefinition[] = [
  {
    id: "shack",
    level: 0,
    label: "Strandhütte",
    kicker: "DEIN ANFANG",
    cost: 0,
    requiredMissions: 0,
    requiredFans: 0,
    description: "Klein, improvisiert und direkt am Meer. Noch kein Statussymbol – aber dein eigener Ort.",
    impression: "Bodenständig",
    perks: ["Sicherer Rückzugsort", "Automatischer Spielstand"],
    effects: {},
    reaction: "neutral",
    lolaLine: "",
  },
  {
    id: "bungalow",
    level: 1,
    label: "Runner-Bungalow",
    kicker: "ERSTER AUSBAU",
    cost: 2_000,
    requiredMissions: 1,
    requiredFans: 0,
    description: "Eine echte Veranda, warmes Licht und genug Platz, um nach einer Fahrt noch zu bleiben.",
    impression: "Interessant",
    perks: ["Private Lounge-Gespräche", "Einladungen nach einer Fahrt"],
    effects: { attraction: 2, mood: 3 },
    reaction: "positive",
    lolaLine: "Okay … aus der Hütte wird langsam ein Ort, an dem man bleiben will.",
  },
  {
    id: "pool-house",
    level: 2,
    label: "Poolhaus",
    kicker: "SOCIAL HUB",
    cost: 5_000,
    requiredMissions: 3,
    requiredFans: 500,
    description: "Infinity-Pool, Lounge und Privatsphäre. Hier können erstmals kleine Gruppenszenen stattfinden.",
    impression: "Beeindruckend",
    perks: ["Pool-Abende mit mehreren Gästen", "Stärkere persönliche Einladungen"],
    effects: { attraction: 3, mood: 4 },
    reaction: "flirty",
    lolaLine: "Du hast einen Pool? Das hättest du deutlich früher erwähnen können.",
  },
  {
    id: "villa",
    level: 3,
    label: "Island-Villa",
    kicker: "ENDGAME-ANWESEN",
    cost: 12_000,
    requiredMissions: 6,
    requiredFans: 1_500,
    description: "Dein eigenes Stück Insel mit Platz für VIP-Abende, große Konflikte und exklusive Aufträge.",
    impression: "Unübersehbar",
    perks: ["Große Ensemble-Szenen", "VIP-Aufträge und private Events"],
    effects: { attraction: 5, mood: 5 },
    reaction: "surprised",
    lolaLine: "Jetzt verstehe ich, warum auf der Insel plötzlich über deinen Namen gesprochen wird.",
  },
] as const;

export function getPropertyTier(id: PropertyTierId): PropertyTierDefinition {
  const tier = PROPERTY_TIERS.find((candidate) => candidate.id === id);
  if (!tier) throw new Error(`Unknown property tier: ${id}`);
  return tier;
}
