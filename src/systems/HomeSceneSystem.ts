import { MIA_HOME_VISIT_CHOICES } from "../data/homeScenes";
import { type Choice, type SaveState } from "../core/types";
import { applyCharacterEffects, applySocialConsequences } from "./SocialSystem";

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

export class HomeSceneSystem {
  public choices(): readonly Choice[] {
    return MIA_HOME_VISIT_CHOICES;
  }

  public isPending(state: SaveState): boolean {
    return (
      state.flags.includes("mia_home_scene_pending") &&
      !state.flags.includes("mia_home_visit_complete")
    );
  }

  public resolve(state: SaveState, choiceId: string, now = Date.now()): SaveState {
    if (!this.isPending(state)) {
      throw new Error("Es wartet keine offene Anwesen-Szene.");
    }
    const choice = MIA_HOME_VISIT_CHOICES.find((candidate) => candidate.id === choiceId);
    if (!choice) throw new Error(`Unknown home visit choice: ${choiceId}`);

    let next = applyCharacterEffects(state, "mia", choice.effects);
    next = applySocialConsequences(next, choice.social, now);
    return {
      ...next,
      flags: unique([...next.flags, ...(choice.flags ?? [])]),
      lastDecision: choice.label,
    };
  }
}
