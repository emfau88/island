import {
  POOL_SCENE_INTERACTIONS,
  type PoolSceneActorId,
  type PoolSceneInteractionDefinition,
} from "../data/poolScene";
import {
  clamp,
  type CharacterId,
  type SaveState,
} from "../core/types";
import {
  applyCharacterEffects,
  applySocialConsequences,
} from "./SocialSystem";

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
export class PoolSceneSystem {
  public actors(state: SaveState): CharacterId[] {
    const actors: CharacterId[] = [];
    if (
      state.completedMissions.length >= 1 &&
      state.flags.includes("lola_cocktail_complete")
    ) {
      actors.push("lola");
    }
    if (
      state.flags.includes("mia_documents_complete") ||
      state.flags.includes("mia_home_visit_complete")
    ) {
      actors.push("mia");
    }
    return actors;
  }

  public interactions(
    state: SaveState,
    actorId: PoolSceneActorId,
  ): PoolSceneInteractionDefinition[] {
    return POOL_SCENE_INTERACTIONS.filter(
      (interaction) =>
        interaction.actorId === actorId &&
        !state.exploration.completedActions.includes(interaction.id) &&
        state.completedMissions.length >= interaction.minimumMissions &&
        interaction.requiredFlags.every((flag) => state.flags.includes(flag)),
    );
  }

  public resolve(
    state: SaveState,
    interactionId: string,
    now = Date.now(),
  ): SaveState {
    const interaction = POOL_SCENE_INTERACTIONS.find(
      (candidate) => candidate.id === interactionId,
    );
    if (!interaction) {
      throw new Error(`Unknown pool interaction: ${interactionId}`);
    }
    if (
      !this.interactions(state, interaction.actorId).some(
        (candidate) => candidate.id === interactionId,
      )
    ) {
      throw new Error("Diese Pool-Interaktion ist nicht verfügbar.");
    }

    let next: SaveState = {
      ...state,
      resources: {
        cash: Math.max(0, state.resources.cash + (interaction.effects.cash ?? 0)),
        fans: Math.max(0, state.resources.fans + (interaction.effects.fans ?? 0)),
        heat: clamp(state.resources.heat + (interaction.effects.heat ?? 0)),
      },
      flags: unique([...state.flags, ...interaction.completionFlags]),
      exploration: {
        ...state.exploration,
        completedActions: unique([
          ...state.exploration.completedActions,
          interaction.id,
        ]),
      },
      lastDecision: interaction.title,
    };
    if (interaction.actorId !== "group") {
      next = applyCharacterEffects(
        next,
        interaction.actorId,
        interaction.effects,
      );
    }
    next = applySocialConsequences(next, interaction.social, now);
    return next;
  }
}
