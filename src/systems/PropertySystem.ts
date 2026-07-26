import {
  PROPERTY_TIERS,
  getPropertyTier,
  type PropertyTierDefinition,
} from "../data/property";
import { clamp, type SaveState } from "../core/types";

export interface PropertyRequirementStatus {
  enoughCash: boolean;
  enoughMissions: boolean;
  enoughFans: boolean;
  canBuild: boolean;
}

export class PropertySystem {
  public current(state: SaveState): PropertyTierDefinition {
    return getPropertyTier(state.property.tier);
  }

  public next(state: SaveState): PropertyTierDefinition | null {
    const current = this.current(state);
    return PROPERTY_TIERS.find((tier) => tier.level === current.level + 1) ?? null;
  }

  public requirements(state: SaveState, tier: PropertyTierDefinition): PropertyRequirementStatus {
    const enoughCash = state.resources.cash >= tier.cost;
    const enoughMissions = state.completedMissions.length >= tier.requiredMissions;
    const enoughFans = state.resources.fans >= tier.requiredFans;
    return {
      enoughCash,
      enoughMissions,
      enoughFans,
      canBuild: enoughCash && enoughMissions && enoughFans,
    };
  }

  public purchase(state: SaveState, tierId: PropertyTierDefinition["id"]): SaveState {
    const next = this.next(state);
    if (!next || next.id !== tierId) {
      throw new Error("Anwesen können nur Stufe für Stufe ausgebaut werden.");
    }
    if (!this.requirements(state, next).canBuild) {
      throw new Error("Die Voraussetzungen für diesen Ausbau sind noch nicht erfüllt.");
    }

    return {
      ...state,
      resources: {
        ...state.resources,
        cash: state.resources.cash - next.cost,
      },
      relationships: {
        ...state.relationships,
        lola: {
          attraction: clamp(state.relationships.lola.attraction + (next.effects.attraction ?? 0)),
          trust: state.relationships.lola.trust,
          mood: clamp(state.relationships.lola.mood + (next.effects.mood ?? 0)),
        },
      },
      property: {
        tier: next.id,
        tutorialSeen: true,
      },
      flags: [...new Set([...state.flags, `property_${next.id.replace("-", "_")}_owned`])],
      lastDecision: `Anwesen ausgebaut: ${next.label}.`,
    };
  }
}
