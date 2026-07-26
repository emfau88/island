import {
  activitiesForLocation,
  getLocationActivity,
  type LocationActivityDefinition,
} from "../data/locationContent";
import {
  clamp,
  type LocationId,
  type SaveState,
} from "../core/types";
import {
  applyCharacterEffects,
  applySocialConsequences,
} from "./SocialSystem";

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export interface ExplorationRequirementStatus {
  completed: boolean;
  unlocked: boolean;
  reason: string | null;
}

export interface ExplorationResult {
  state: SaveState;
  activity: LocationActivityDefinition;
  discovered: string | null;
}

export class ExplorationSystem {
  public visit(state: SaveState, locationId: LocationId): SaveState {
    if (state.exploration.visitedLocations.includes(locationId)) return state;
    return {
      ...state,
      exploration: {
        ...state.exploration,
        visitedLocations: [
          ...state.exploration.visitedLocations,
          locationId,
        ],
      },
    };
  }

  public activities(
    state: SaveState,
    locationId: LocationId,
  ): Array<{
    definition: LocationActivityDefinition;
    status: ExplorationRequirementStatus;
  }> {
    return activitiesForLocation(locationId).map((definition) => ({
      definition,
      status: this.requirements(state, definition),
    }));
  }

  public requirements(
    state: SaveState,
    activity: LocationActivityDefinition,
  ): ExplorationRequirementStatus {
    if (state.exploration.completedActions.includes(activity.id)) {
      return { completed: true, unlocked: false, reason: "Bereits entdeckt" };
    }
    if (state.completedMissions.length < activity.minimumMissions) {
      return {
        completed: false,
        unlocked: false,
        reason: `${activity.minimumMissions} Aufträge benötigt`,
      };
    }
    const missingFlag = activity.requiredFlags.find(
      (flag) => !state.flags.includes(flag),
    );
    if (missingFlag) {
      return {
        completed: false,
        unlocked: false,
        reason: "Storyfortschritt benötigt",
      };
    }
    const missingDiscovery = activity.requiredDiscoveries.find(
      (discovery) => !state.exploration.discoveries.includes(discovery),
    );
    if (missingDiscovery) {
      return {
        completed: false,
        unlocked: false,
        reason: "Passender Hinweis fehlt",
      };
    }
    const cashChange = activity.effects.cash ?? 0;
    if (cashChange < 0 && state.resources.cash < Math.abs(cashChange)) {
      return {
        completed: false,
        unlocked: false,
        reason: `$ ${Math.abs(cashChange) - state.resources.cash} fehlen`,
      };
    }
    return { completed: false, unlocked: true, reason: null };
  }

  public resolve(
    state: SaveState,
    activityId: string,
    now = Date.now(),
  ): ExplorationResult {
    const activity = getLocationActivity(activityId);
    const status = this.requirements(state, activity);
    if (!status.unlocked) {
      throw new Error(status.reason ?? "Diese Aktivität ist noch nicht verfügbar.");
    }

    let next: SaveState = {
      ...state,
      resources: {
        cash: Math.max(0, state.resources.cash + (activity.effects.cash ?? 0)),
        fans: Math.max(0, state.resources.fans + (activity.effects.fans ?? 0)),
        heat: clamp(state.resources.heat + (activity.effects.heat ?? 0)),
      },
      flags: unique([
        ...state.flags,
        ...(activity.completionFlags ?? []),
      ]),
      exploration: {
        ...state.exploration,
        completedActions: unique([
          ...state.exploration.completedActions,
          activity.id,
        ]),
        discoveries: activity.discoveryId
          ? unique([...state.exploration.discoveries, activity.discoveryId])
          : state.exploration.discoveries,
      },
      lastDecision: activity.title,
    };
    if (activity.characterId) {
      next = applyCharacterEffects(
        next,
        activity.characterId,
        activity.effects,
      );
    }
    next = applySocialConsequences(next, activity.social, now);
    return {
      state: next,
      activity,
      discovered: activity.discoveryId ?? null,
    };
  }
}
