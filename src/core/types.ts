export type SceneId = "hub" | "phone" | "pickup" | "route" | "travel" | "encounter";
export type PhoneTab = "jobs" | "messages" | "contacts";
export type MissionPhase = "pickup" | "route" | "travel" | "encounter";
export type Reaction = "neutral" | "positive" | "flirty" | "serious" | "annoyed" | "surprised";
export type LocationId = "pool" | "yacht";

export interface Point {
  x: number;
  y: number;
}

export interface Effects {
  cash: number;
  fans: number;
  heat: number;
  attraction: number;
  trust: number;
  mood: number;
}

export interface Choice {
  id: string;
  label: string;
  hint: string;
  reaction: Reaction;
  effects: Partial<Effects>;
}

export interface RouteDefinition {
  id: string;
  label: string;
  description: string;
  from: LocationId;
  to: LocationId;
  durationMs: number;
  tags: string[];
  effects: Partial<Effects>;
  points: Point[];
}

export interface MissionRequirements {
  requiredFlags: string[];
  forbiddenFlags: string[];
}

export interface MissionDefinition {
  id: string;
  characterId: "lola";
  title: string;
  summary: string;
  startLocation: LocationId;
  destination: LocationId;
  requirements: MissionRequirements;
  routeIds: [string, string];
  pickupPrompt: string;
  pickupChoices: Choice[];
  travelPrompt: string;
  travelChoices: Choice[];
  encounterPrompt: string;
  encounterChoices: Choice[];
  rewards: Partial<Effects>;
  completionFlags: string[];
  followUpMessageId: string;
}

export interface RelationshipState {
  attraction: number;
  trust: number;
  mood: number;
}

export interface ResourceState {
  cash: number;
  fans: number;
  heat: number;
}

export interface ActiveMissionRun {
  missionId: string;
  phase: MissionPhase;
  selectedPickupChoice?: string;
  selectedRoute?: string;
  selectedTravelChoice?: string;
  selectedEncounterChoice?: string;
  pendingEffects: Effects;
  currentReaction: Reaction;
  startedAt: number;
}

export interface MessageState {
  id: string;
  read: boolean;
  unlockedAt: number;
}

export interface SaveState {
  version: 1;
  resources: ResourceState;
  relationships: {
    lola: RelationshipState;
  };
  flags: string[];
  completedMissions: string[];
  messages: MessageState[];
  activeMission: ActiveMissionRun | null;
  lastDecision: string | null;
}

export interface MessageDefinition {
  id: string;
  sender: string;
  preview: string;
  body: string[];
  requiredFlags: string[];
}

export interface LocationDefinition {
  id: LocationId;
  label: string;
  world: Point;
  asset: string;
}

export const ZERO_EFFECTS: Effects = {
  cash: 0,
  fans: 0,
  heat: 0,
  attraction: 0,
  trust: 0,
  mood: 0,
};

export function addEffects(base: Effects, change: Partial<Effects>): Effects {
  return {
    cash: base.cash + (change.cash ?? 0),
    fans: base.fans + (change.fans ?? 0),
    heat: base.heat + (change.heat ?? 0),
    attraction: base.attraction + (change.attraction ?? 0),
    trust: base.trust + (change.trust ?? 0),
    mood: base.mood + (change.mood ?? 0),
  };
}

export function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, value));
}
