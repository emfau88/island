import { MISSIONS } from "../data/missions";
import { MESSAGES } from "../data/messages";
import {
  ZERO_EFFECTS,
  clamp,
  type ActiveMissionRun,
  type Effects,
  type MessageState,
  type Reaction,
  type SaveState,
} from "./types";

const SAVE_KEY = "island-runner-save";
const REACTIONS: Reaction[] = ["neutral", "positive", "flirty", "serious", "annoyed", "surprised"];
const PHASES: ActiveMissionRun["phase"][] = ["pickup", "route", "travel", "encounter"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? [...new Set(value)] : [];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseEffects(value: unknown): Effects | null {
  if (!isRecord(value)) {
    return null;
  }
  const parsed = {
    cash: finite(value.cash, Number.NaN),
    fans: finite(value.fans, Number.NaN),
    heat: finite(value.heat, Number.NaN),
    attraction: finite(value.attraction, Number.NaN),
    trust: finite(value.trust, Number.NaN),
    mood: finite(value.mood, Number.NaN),
  };
  return Object.values(parsed).every(Number.isFinite) ? parsed : null;
}

function parseActiveMission(value: unknown): ActiveMissionRun | null | undefined {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  const missionId = optionalString(value.missionId);
  const pendingEffects = parseEffects(value.pendingEffects);
  const phase = PHASES.includes(value.phase as ActiveMissionRun["phase"])
    ? (value.phase as ActiveMissionRun["phase"])
    : undefined;
  const currentReaction = REACTIONS.includes(value.currentReaction as Reaction)
    ? (value.currentReaction as Reaction)
    : undefined;
  const startedAt = finite(value.startedAt, Number.NaN);
  if (
    !missionId ||
    !MISSIONS.some((mission) => mission.id === missionId) ||
    !phase ||
    !pendingEffects ||
    !currentReaction ||
    !Number.isFinite(startedAt)
  ) {
    return undefined;
  }
  return {
    missionId,
    phase,
    selectedPickupChoice: optionalString(value.selectedPickupChoice),
    selectedRoute: optionalString(value.selectedRoute),
    selectedTravelChoice: optionalString(value.selectedTravelChoice),
    selectedEncounterChoice: optionalString(value.selectedEncounterChoice),
    pendingEffects,
    currentReaction,
    startedAt,
  };
}

function parseMessages(value: unknown): MessageState[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const known = new Set(MESSAGES.map((message) => message.id));
  const parsed: MessageState[] = [];
  for (const item of value) {
    if (
      isRecord(item) &&
      typeof item.id === "string" &&
      known.has(item.id) &&
      typeof item.read === "boolean" &&
      typeof item.unlockedAt === "number" &&
      Number.isFinite(item.unlockedAt) &&
      !parsed.some((message) => message.id === item.id)
    ) {
      parsed.push({ id: item.id, read: item.read, unlockedAt: item.unlockedAt });
    }
  }
  return parsed;
}

export function createInitialSave(now = Date.now()): SaveState {
  return {
    version: 1,
    resources: {
      cash: 0,
      fans: 0,
      heat: 0,
    },
    relationships: {
      lola: {
        attraction: 12,
        trust: 10,
        mood: 50,
      },
    },
    flags: [],
    completedMissions: [],
    messages: [{ id: "lola-intro", read: false, unlockedAt: now }],
    activeMission: null,
    lastDecision: null,
  };
}

export function validateSave(value: unknown): SaveState | null {
  if (!isRecord(value) || value.version !== 1) {
    return null;
  }
  if (!isRecord(value.resources) || !isRecord(value.relationships) || !isRecord(value.relationships.lola)) {
    return null;
  }
  const activeMission = parseActiveMission(value.activeMission);
  if (activeMission === undefined) {
    return null;
  }
  const cash = finite(value.resources.cash, Number.NaN);
  const fans = finite(value.resources.fans, Number.NaN);
  const heat = finite(value.resources.heat, Number.NaN);
  const attraction = finite(value.relationships.lola.attraction, Number.NaN);
  const trust = finite(value.relationships.lola.trust, Number.NaN);
  const mood = finite(value.relationships.lola.mood, Number.NaN);
  if ([cash, fans, heat, attraction, trust, mood].some((number) => !Number.isFinite(number))) {
    return null;
  }
  return {
    version: 1,
    resources: {
      cash: Math.max(0, Math.round(cash)),
      fans: Math.max(0, Math.round(fans)),
      heat: clamp(Math.round(heat)),
    },
    relationships: {
      lola: {
        attraction: clamp(Math.round(attraction)),
        trust: clamp(Math.round(trust)),
        mood: clamp(Math.round(mood)),
      },
    },
    flags: stringArray(value.flags),
    completedMissions: stringArray(value.completedMissions),
    messages: parseMessages(value.messages),
    activeMission,
    lastDecision: typeof value.lastDecision === "string" ? value.lastDecision : null,
  };
}

export function syncUnlockedMessages(state: SaveState, now = Date.now()): SaveState {
  const unlocked = [...state.messages];
  for (const definition of MESSAGES) {
    const meetsRequirements = definition.requiredFlags.every((flag) => state.flags.includes(flag));
    if (meetsRequirements && !unlocked.some((message) => message.id === definition.id)) {
      unlocked.push({ id: definition.id, read: false, unlockedAt: now });
    }
  }
  return { ...state, messages: unlocked.sort((left, right) => left.unlockedAt - right.unlockedAt) };
}

export class SaveManager {
  public constructor(private readonly storage: Storage = window.localStorage) {}

  public load(): SaveState {
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) {
        return createInitialSave();
      }
      const validated = validateSave(JSON.parse(raw) as unknown);
      return validated ? syncUnlockedMessages(validated) : createInitialSave();
    } catch {
      return createInitialSave();
    }
  }

  public save(state: SaveState): boolean {
    const validated = validateSave(state);
    if (!validated) {
      return false;
    }
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(validated));
      return true;
    } catch {
      return false;
    }
  }

  public reset(): SaveState {
    const state = createInitialSave();
    this.save(state);
    return state;
  }

  public static emptyEffects(): Effects {
    return { ...ZERO_EFFECTS };
  }
}
