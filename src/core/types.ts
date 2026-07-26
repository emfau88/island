export type SceneId = "hub" | "pickup" | "route" | "travel" | "encounter";
export type PhoneTab = "jobs" | "messages" | "contacts";
export type MissionPhase = "pickup" | "route" | "travel" | "encounter";
export type Reaction = "neutral" | "positive" | "flirty" | "serious" | "annoyed" | "surprised";
export type CharacterId = "lola" | "mia";
export type LocationId =
  | "pool"
  | "yacht"
  | "villa"
  | "club"
  | "bar"
  | "dock"
  | "runner-home";
export type PropertyTierId = "shack" | "bungalow" | "pool-house" | "villa";
export type SocialMemoryTone = "warm" | "honest" | "tense" | "private" | "professional";
export type SecretWingLevel = 0 | 1 | 2 | 3;
export type GuestStayStatus = "none" | "staying" | "left";

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
  flags?: string[];
  social?: SocialConsequences;
}

export interface RouteDefinition {
  id: string;
  label: string;
  description: string;
  from: LocationId;
  to: LocationId;
  durationMs: number;
  tags: string[];
  advantage: string;
  risk: string;
  effects: Partial<Effects>;
  points: Point[];
}

export interface MissionRequirements {
  requiredFlags: string[];
  forbiddenFlags: string[];
}

export interface MissionDefinition {
  id: string;
  characterId: CharacterId;
  title: string;
  summary: string;
  startLocation: LocationId;
  destination: LocationId;
  requirements: MissionRequirements;
  routeIds: [string, string];
  pickupPrompt: string;
  pickupChoices: Choice[];
  travelEvent: {
    title: string;
    prompt: string;
    triggerProgress: number;
    choices: Choice[];
  };
  encounterPrompt: string;
  arrivalPrompts?: Record<string, string>;
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

export interface PropertyState {
  tier: PropertyTierId;
  tutorialSeen: boolean;
}

export interface SocialMemorySeed {
  id: string;
  title: string;
  description: string;
  tone: SocialMemoryTone;
  knownBy: CharacterId[];
}

export interface SocialMemory extends SocialMemorySeed {
  createdAt: number;
}

export interface SocialConsequences {
  relationships?: Partial<Record<CharacterId, Partial<RelationshipState>>>;
  friendship?: number;
  tension?: number;
  memories?: SocialMemorySeed[];
}

export interface SocialState {
  lolaMia: {
    friendship: number;
    tension: number;
  };
  memories: SocialMemory[];
}

export interface ExplorationState {
  visitedLocations: LocationId[];
  discoveries: string[];
  completedActions: string[];
}

export interface GuestStayState {
  status: GuestStayStatus;
  invitedAt?: number;
  acceptedAt?: number;
  leftAt?: number;
  completedScenes: string[];
}

export interface SecretWingState {
  level: SecretWingLevel;
  tutorialSeen: boolean;
  guests: Record<CharacterId, GuestStayState>;
}

export interface ActiveMissionRun {
  missionId: string;
  phase: MissionPhase;
  selectedPickupChoice?: string;
  selectedRoute?: string;
  selectedTravelChoice?: string;
  selectedEncounterChoice?: string;
  pendingEffects: Effects;
  effectLog: EffectLogEntry[];
  currentReaction: Reaction;
  startedAt: number;
}

export interface EffectLogEntry {
  source: "pickup" | "route" | "travel" | "encounter" | "reward" | "system";
  label: string;
  effects: Partial<Effects>;
}

export interface MessageState {
  id: string;
  read: boolean;
  unlockedAt: number;
  replyId?: string;
}

export interface SaveState {
  version: 5;
  resources: ResourceState;
  relationships: Record<CharacterId, RelationshipState>;
  property: PropertyState;
  social: SocialState;
  exploration: ExplorationState;
  secretWing: SecretWingState;
  flags: string[];
  completedMissions: string[];
  missionStyles: Record<string, string>;
  messages: MessageState[];
  activeMission: ActiveMissionRun | null;
  lastDecision: string | null;
  settings: {
    sound: boolean;
    haptics: boolean;
  };
}

export interface MessageReply {
  id: string;
  label: string;
  hint: string;
  effects: Partial<Effects>;
  flags: string[];
  response: string[];
  social?: SocialConsequences;
}

export interface MessageDefinition {
  id: string;
  characterId: CharacterId;
  sender: string;
  preview: string;
  body: string[];
  requiredFlags: string[];
  replies: MessageReply[];
}

export interface MissionResult {
  state: SaveState;
  entries: EffectLogEntry[];
  totalEffects: Effects;
  style: string;
  heatPenalty: number;
  relationshipBonusFans: number;
}

export interface LocationDefinition {
  id: LocationId;
  label: string;
  mapLabel: string;
  description: string;
  world: Point;
  asset: string;
  color: number;
  icon: string;
  kind: "venue" | "home";
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
