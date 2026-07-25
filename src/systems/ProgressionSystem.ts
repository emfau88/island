import type { RelationshipState } from "../core/types";

export interface HeatTier {
  label: string;
  minimum: number;
  nextAt: number | null;
  payoutPenalty: number;
  description: string;
}

export interface RelationshipTier {
  label: string;
  minimum: number;
  nextAt: number | null;
  fanBonus: number;
  description: string;
}

const HEAT_TIERS: HeatTier[] = [
  {
    label: "Unauffällig",
    minimum: 0,
    nextAt: 25,
    payoutPenalty: 0,
    description: "Keine Kontrollen. Volle Auszahlung.",
  },
  {
    label: "Beobachtet",
    minimum: 25,
    nextAt: 50,
    payoutPenalty: 0.05,
    description: "Mehr Kontrollen. 5 % weniger Missionsgeld.",
  },
  {
    label: "Im Visier",
    minimum: 50,
    nextAt: 75,
    payoutPenalty: 0.12,
    description: "Kontrollpunkte aktiv. 12 % weniger Missionsgeld.",
  },
  {
    label: "Lockdown",
    minimum: 75,
    nextAt: null,
    payoutPenalty: 0.25,
    description: "Die Insel sucht deinen Wagen. 25 % weniger Missionsgeld.",
  },
];

const RELATIONSHIP_TIERS: RelationshipTier[] = [
  {
    label: "Neu",
    minimum: 0,
    nextAt: 20,
    fanBonus: 0,
    description: "Lola testet noch, ob du zuverlässig bist.",
  },
  {
    label: "Bekannt",
    minimum: 20,
    nextAt: 40,
    fanBonus: 0.05,
    description: "Lola erwähnt dich. +5 % Fans auf Aufträge.",
  },
  {
    label: "Vertraut",
    minimum: 40,
    nextAt: 65,
    fanBonus: 0.1,
    description: "Du bekommst persönlichere Aufträge. +10 % Fans.",
  },
  {
    label: "VIP",
    minimum: 65,
    nextAt: null,
    fanBonus: 0.15,
    description: "Du gehörst zu Lolas innerem Kreis. +15 % Fans.",
  },
];

export function relationshipScore(relationship: RelationshipState): number {
  return Math.round((relationship.attraction + relationship.trust) / 2);
}

export function getRelationshipTier(relationship: RelationshipState): RelationshipTier {
  const score = relationshipScore(relationship);
  return [...RELATIONSHIP_TIERS].reverse().find((tier) => score >= tier.minimum) ?? RELATIONSHIP_TIERS[0]!;
}

export function getHeatTier(heat: number): HeatTier {
  return [...HEAT_TIERS].reverse().find((tier) => heat >= tier.minimum) ?? HEAT_TIERS[0]!;
}

export function runnerStyle(attraction: number, trust: number, heat: number): string {
  if (heat >= 7) return "Riskant";
  if (trust >= attraction + 3) return "Verlässlich";
  if (attraction >= trust + 3) return "Charmant";
  return "Ausbalanciert";
}
