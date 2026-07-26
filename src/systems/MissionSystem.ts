import { MISSIONS, getMission } from "../data/missions";
import { getRoute } from "../data/routes";
import {
  ZERO_EFFECTS,
  addEffects,
  clamp,
  type Choice,
  type EffectLogEntry,
  type MissionDefinition,
  type MissionResult,
  type SaveState,
} from "../core/types";
import { getHeatTier, getRelationshipTier, runnerStyle } from "./ProgressionSystem";
import { applyCharacterEffects, applySocialConsequences } from "./SocialSystem";

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
        [mission.characterId]: { ...state.relationships[mission.characterId], mood: 50 },
      },
      activeMission: {
        missionId,
        phase: "pickup",
        pendingEffects: { ...ZERO_EFFECTS },
        effectLog: [],
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
        effectLog: [
          ...run.effectLog,
          { source: "pickup", label: choice.label, effects: choice.effects },
        ],
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
        effectLog: [
          ...run.effectLog,
          { source: "route", label: route.label, effects: route.effects },
        ],
      },
    };
  }

  public chooseTravel(state: SaveState, choiceId: string): SaveState {
    const run = this.requireRun(state, "travel");
    if (run.selectedTravelChoice) {
      return state;
    }
    const mission = getMission(run.missionId);
    const choice = choiceById(mission.travelEvent.choices, choiceId);
    return {
      ...state,
      activeMission: {
        ...run,
        selectedTravelChoice: choice.id,
        currentReaction: choice.reaction,
        pendingEffects: addEffects(run.pendingEffects, choice.effects),
        effectLog: [
          ...run.effectLog,
          { source: "travel", label: choice.label, effects: choice.effects },
        ],
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
    return this.completeWithResult(state, choiceId, now).state;
  }

  public completeWithResult(state: SaveState, choiceId: string, now = Date.now()): MissionResult {
    const run = this.requireRun(state, "encounter");
    if (run.selectedEncounterChoice) {
      throw new Error("Mission encounter was already completed.");
    }
    const mission = getMission(run.missionId);
    const choice = choiceById(mission.encounterChoices, choiceId);
    const entries: EffectLogEntry[] = [
      ...run.effectLog,
      { source: "encounter", label: choice.label, effects: choice.effects },
      { source: "reward", label: "Grundbelohnung", effects: mission.rewards },
    ];
    let allEffects = addEffects(addEffects(run.pendingEffects, choice.effects), mission.rewards);
    const projectedHeat = clamp(state.resources.heat + allEffects.heat);
    const heatTier = getHeatTier(projectedHeat);
    const grossCash = Math.max(0, allEffects.cash);
    const heatPenalty = Math.round(grossCash * heatTier.payoutPenalty);
    const relationshipTier = getRelationshipTier(state.relationships[mission.characterId]);
    const relationshipBonusFans = Math.round(Math.max(0, allEffects.fans) * relationshipTier.fanBonus);
    if (heatPenalty > 0) {
      const penalty = { cash: -heatPenalty };
      allEffects = addEffects(allEffects, penalty);
      entries.push({ source: "system", label: `${heatTier.label}: Heat-Abzug`, effects: penalty });
    }
    if (relationshipBonusFans > 0) {
      const bonus = { fans: relationshipBonusFans };
      allEffects = addEffects(allEffects, bonus);
      entries.push({
        source: "system",
        label: `${relationshipTier.label}: Beziehungsbonus`,
        effects: bonus,
      });
    }
    const messages = state.messages.some((message) => message.id === mission.followUpMessageId)
      ? state.messages
      : [...state.messages, { id: mission.followUpMessageId, read: false, unlockedAt: now }];
    const style = runnerStyle(allEffects.attraction, allEffects.trust, allEffects.heat);
    const selectedChoices = [
      mission.pickupChoices.find((candidate) => candidate.id === run.selectedPickupChoice),
      mission.travelEvent.choices.find((candidate) => candidate.id === run.selectedTravelChoice),
      choice,
    ].filter((selected): selected is Choice => Boolean(selected));
    const choiceFlags = selectedChoices.flatMap((selected) => selected.flags ?? []);
    let nextState: SaveState = {
      ...state,
      resources: {
        cash: Math.max(0, state.resources.cash + allEffects.cash),
        fans: Math.max(0, state.resources.fans + allEffects.fans),
        heat: clamp(state.resources.heat + allEffects.heat),
      },
      flags: unique([...state.flags, ...mission.completionFlags, ...choiceFlags]),
      completedMissions: unique([...state.completedMissions, mission.id]),
      missionStyles: {
        ...state.missionStyles,
        [mission.id]: style,
      },
      messages,
      activeMission: null,
      lastDecision: choice.label,
    };
    nextState = applyCharacterEffects(nextState, mission.characterId, allEffects, 50);
    for (const selected of selectedChoices) {
      nextState = applySocialConsequences(nextState, selected.social, now);
    }
    return {
      state: nextState,
      entries,
      totalEffects: allEffects,
      style,
      heatPenalty,
      relationshipBonusFans,
    };
  }

  public abort(state: SaveState): SaveState {
    if (!state.activeMission) {
      return state;
    }
    const mission = getMission(state.activeMission.missionId);
    return {
      ...state,
      activeMission: null,
      relationships: {
        ...state.relationships,
        [mission.characterId]: { ...state.relationships[mission.characterId], mood: 50 },
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
