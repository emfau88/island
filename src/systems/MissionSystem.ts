import { MISSIONS, getMission } from "../data/missions";
import { getRoute } from "../data/routes";
import {
  ZERO_EFFECTS,
  addEffects,
  clamp,
  type Choice,
  type MissionDefinition,
  type SaveState,
} from "../core/types";

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function choiceById(choices: Choice[], id: string): Choice {
  const choice = choices.find((candidate) => candidate.id === id);
  if (!choice) {
    throw new Error(`Unknown choice: ${id}`);
  }
  return choice;
}

function requirementsMet(state: SaveState, mission: MissionDefinition): boolean {
  return (
    mission.requirements.requiredFlags.every((flag) => state.flags.includes(flag)) &&
    mission.requirements.forbiddenFlags.every((flag) => !state.flags.includes(flag))
  );
}

export class MissionSystem {
  public available(state: SaveState): MissionDefinition[] {
    return MISSIONS.filter((mission) => requirementsMet(state, mission));
  }

  public start(state: SaveState, missionId: string, now = Date.now()): SaveState {
    if (state.activeMission) {
      throw new Error("A mission is already active.");
    }
    const mission = getMission(missionId);
    if (!requirementsMet(state, mission)) {
      throw new Error(`Mission is unavailable: ${missionId}`);
    }
    return {
      ...state,
      relationships: {
        ...state.relationships,
        lola: { ...state.relationships.lola, mood: 50 },
      },
      activeMission: {
        missionId,
        phase: "pickup",
        pendingEffects: { ...ZERO_EFFECTS },
        currentReaction: "neutral",
        startedAt: now,
      },
    };
  }

  public choosePickup(state: SaveState, choiceId: string): SaveState {
    const run = this.requireRun(state, "pickup");
    if (run.selectedPickupChoice) {
      return state;
    }
    const mission = getMission(run.missionId);
    const choice = choiceById(mission.pickupChoices, choiceId);
    return {
      ...state,
      activeMission: {
        ...run,
        phase: "route",
        selectedPickupChoice: choice.id,
        currentReaction: choice.reaction,
        pendingEffects: addEffects(run.pendingEffects, choice.effects),
      },
    };
  }

  public chooseRoute(state: SaveState, routeId: string): SaveState {
    const run = this.requireRun(state, "route");
    if (run.selectedRoute) {
      return state;
    }
    const mission = getMission(run.missionId);
    if (!mission.routeIds.includes(routeId)) {
      throw new Error(`Route is not part of mission: ${routeId}`);
    }
    const route = getRoute(routeId);
    return {
      ...state,
      activeMission: {
        ...run,
        phase: "travel",
        selectedRoute: route.id,
        pendingEffects: addEffects(run.pendingEffects, route.effects),
      },
    };
  }

  public chooseTravel(state: SaveState, choiceId: string): SaveState {
    const run = this.requireRun(state, "travel");
    if (run.selectedTravelChoice) {
      return state;
    }
    const mission = getMission(run.missionId);
    const choice = choiceById(mission.travelChoices, choiceId);
    return {
      ...state,
      activeMission: {
        ...run,
        selectedTravelChoice: choice.id,
        currentReaction: choice.reaction,
        pendingEffects: addEffects(run.pendingEffects, choice.effects),
      },
    };
  }

  public arrive(state: SaveState): SaveState {
    const run = this.requireRun(state, "travel");
    return {
      ...state,
      activeMission: {
        ...run,
        phase: "encounter",
      },
    };
  }

  public complete(state: SaveState, choiceId: string, now = Date.now()): SaveState {
    const run = this.requireRun(state, "encounter");
    if (run.selectedEncounterChoice) {
      return state;
    }
    const mission = getMission(run.missionId);
    const choice = choiceById(mission.encounterChoices, choiceId);
    const allEffects = addEffects(addEffects(run.pendingEffects, choice.effects), mission.rewards);
    const messages = state.messages.some((message) => message.id === mission.followUpMessageId)
      ? state.messages
      : [...state.messages, { id: mission.followUpMessageId, read: false, unlockedAt: now }];

    return {
      ...state,
      resources: {
        cash: Math.max(0, state.resources.cash + allEffects.cash),
        fans: Math.max(0, state.resources.fans + allEffects.fans),
        heat: clamp(state.resources.heat + allEffects.heat),
      },
      relationships: {
        lola: {
          attraction: clamp(state.relationships.lola.attraction + allEffects.attraction),
          trust: clamp(state.relationships.lola.trust + allEffects.trust),
          mood: clamp(50 + allEffects.mood),
        },
      },
      flags: unique([...state.flags, ...mission.completionFlags]),
      completedMissions: unique([...state.completedMissions, mission.id]),
      messages,
      activeMission: null,
      lastDecision: choice.label,
    };
  }

  public abort(state: SaveState): SaveState {
    if (!state.activeMission) {
      return state;
    }
    return {
      ...state,
      activeMission: null,
      relationships: {
        lola: { ...state.relationships.lola, mood: 50 },
      },
    };
  }

  private requireRun(state: SaveState, phase: NonNullable<SaveState["activeMission"]>["phase"]) {
    if (!state.activeMission || state.activeMission.phase !== phase) {
      throw new Error(`Expected active mission phase: ${phase}`);
    }
    return state.activeMission;
  }
}
