import {
  SECRET_WING_TIERS,
  getSecretWingTier,
  type SecretWingTierDefinition,
} from "../data/secretWing";
import {
  clamp,
  type CharacterId,
  type SaveState,
} from "../core/types";
import { getPropertyTier } from "../data/property";
import { applySocialConsequences } from "./SocialSystem";

const TRUST_REQUIREMENTS: Record<CharacterId, number> = {
  lola: 35,
  mia: 20,
};

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export interface SecretWingRequirementStatus {
  enoughCash: boolean;
  enoughMissions: boolean;
  enoughProperty: boolean;
  hasDiscovery: boolean;
  canBuild: boolean;
}

export interface GuestInvitationStatus {
  canInvite: boolean;
  reason: string | null;
  requiredTrust: number;
}

export class SecretWingSystem {
  public current(state: SaveState): SecretWingTierDefinition {
    return getSecretWingTier(state.secretWing.level);
  }

  public next(state: SaveState): SecretWingTierDefinition | null {
    return (
      SECRET_WING_TIERS.find(
        (tier) => tier.level === state.secretWing.level + 1,
      ) ?? null
    );
  }

  public requirements(
    state: SaveState,
    tier: SecretWingTierDefinition,
  ): SecretWingRequirementStatus {
    const enoughCash = state.resources.cash >= tier.cost;
    const enoughMissions =
      state.completedMissions.length >= tier.requiredMissions;
    const enoughProperty =
      getPropertyTier(state.property.tier).level >=
      getPropertyTier(tier.requiredProperty).level;
    const hasDiscovery =
      tier.requiredDiscovery === null ||
      state.exploration.discoveries.includes(tier.requiredDiscovery);
    return {
      enoughCash,
      enoughMissions,
      enoughProperty,
      hasDiscovery,
      canBuild:
        enoughCash && enoughMissions && enoughProperty && hasDiscovery,
    };
  }

  public purchase(
    state: SaveState,
    level: SecretWingTierDefinition["level"],
  ): SaveState {
    const next = this.next(state);
    if (!next || next.level !== level) {
      throw new Error("Der Midnight Wing wird Stufe für Stufe ausgebaut.");
    }
    if (!this.requirements(state, next).canBuild) {
      throw new Error("Die Voraussetzungen für diesen Ausbau fehlen.");
    }
    return {
      ...state,
      resources: {
        ...state.resources,
        cash: state.resources.cash - next.cost,
      },
      secretWing: {
        ...state.secretWing,
        level: next.level,
        tutorialSeen: true,
      },
      flags: unique([...state.flags, `secret_wing_level_${next.level}`]),
      lastDecision: `${next.label} ausgebaut.`,
    };
  }

  public stayingGuests(state: SaveState): CharacterId[] {
    return (Object.keys(state.secretWing.guests) as CharacterId[]).filter(
      (characterId) =>
        state.secretWing.guests[characterId].status === "staying",
    );
  }

  public invitationStatus(
    state: SaveState,
    characterId: CharacterId,
  ): GuestInvitationStatus {
    const requiredTrust = TRUST_REQUIREMENTS[characterId];
    if (state.secretWing.level < 1) {
      return {
        canInvite: false,
        reason: "Hidden Lounge benötigt",
        requiredTrust,
      };
    }
    if (state.secretWing.guests[characterId].status === "staying") {
      return {
        canInvite: false,
        reason: "Bereits zu Gast",
        requiredTrust,
      };
    }
    if (state.relationships[characterId].trust < requiredTrust) {
      return {
        canInvite: false,
        reason: `${requiredTrust}% Vertrauen benötigt`,
        requiredTrust,
      };
    }
    if (this.stayingGuests(state).length >= this.current(state).capacity) {
      return {
        canInvite: false,
        reason: "Keine freie Gästesuite",
        requiredTrust,
      };
    }
    return { canInvite: true, reason: null, requiredTrust };
  }

  public invite(
    state: SaveState,
    characterId: CharacterId,
    now = Date.now(),
  ): SaveState {
    const status = this.invitationStatus(state, characterId);
    if (!status.canInvite) {
      throw new Error(status.reason ?? "Einladung derzeit nicht möglich.");
    }
    const otherGuests = this.stayingGuests(state);
    let next: SaveState = {
      ...state,
      relationships: {
        ...state.relationships,
        [characterId]: {
          ...state.relationships[characterId],
          trust: clamp(state.relationships[characterId].trust + 2),
          mood: clamp(state.relationships[characterId].mood + 3),
        },
      },
      secretWing: {
        ...state.secretWing,
        guests: {
          ...state.secretWing.guests,
          [characterId]: {
            status: "staying",
            invitedAt: now,
            acceptedAt: now,
            completedScenes: [],
          },
        },
      },
      flags: unique([...state.flags, `${characterId}_midnight_guest`]),
      lastDecision: `${characterId === "lola" ? "Lola" : "Mia"} hat die Einladung freiwillig angenommen.`,
    };
    next = applySocialConsequences(
      next,
      {
        friendship: otherGuests.length ? 1 : 0,
        tension: otherGuests.length ? 2 : 0,
        memories: [
          {
            id: `${characterId}_midnight_stay`,
            title: "Einladung in den Midnight Wing",
            description: `${characterId === "lola" ? "Lola" : "Mia"} hat sich freiwillig für einen Aufenthalt im geheimen Bereich entschieden.`,
            tone: "private",
            knownBy: unique([characterId, ...otherGuests]),
          },
        ],
      },
      now,
    );
    return next;
  }

  public endStay(
    state: SaveState,
    characterId: CharacterId,
    now = Date.now(),
  ): SaveState {
    const guest = state.secretWing.guests[characterId];
    if (guest.status !== "staying") {
      throw new Error("Diese Person ist aktuell nicht zu Gast.");
    }
    return {
      ...state,
      secretWing: {
        ...state.secretWing,
        guests: {
          ...state.secretWing.guests,
          [characterId]: {
            ...guest,
            status: "left",
            leftAt: now,
          },
        },
      },
      lastDecision: `${characterId === "lola" ? "Lola" : "Mia"} ist auf eigenen Wunsch abgereist.`,
    };
  }

  public resolveGuestScene(
    state: SaveState,
    characterId: CharacterId,
    sceneId: "boundaries" | "confide",
    now = Date.now(),
  ): SaveState {
    const guest = state.secretWing.guests[characterId];
    if (guest.status !== "staying") {
      throw new Error("Die Szene benötigt einen aktuellen Gast.");
    }
    const completionId = `${characterId}_${sceneId}`;
    if (guest.completedScenes.includes(completionId)) {
      throw new Error("Dieses Gespräch wurde bereits geführt.");
    }
    const isBoundaries = sceneId === "boundaries";
    let next: SaveState = {
      ...state,
      relationships: {
        ...state.relationships,
        [characterId]: {
          ...state.relationships[characterId],
          trust: clamp(
            state.relationships[characterId].trust + (isBoundaries ? 5 : 3),
          ),
          attraction: clamp(
            state.relationships[characterId].attraction +
              (isBoundaries ? 0 : 2),
          ),
          mood: clamp(state.relationships[characterId].mood + 2),
        },
      },
      secretWing: {
        ...state.secretWing,
        guests: {
          ...state.secretWing.guests,
          [characterId]: {
            ...guest,
            completedScenes: [...guest.completedScenes, completionId],
          },
        },
      },
      lastDecision: isBoundaries
        ? "Grenzen und Erwartungen offen besprochen."
        : "Ein vertrauliches Gespräch im Midnight Wing geführt.",
    };
    next = applySocialConsequences(
      next,
      {
        tension: isBoundaries ? -2 : 0,
        memories: [
          {
            id: `${completionId}_memory`,
            title: isBoundaries
              ? "Klare Grenzen"
              : "Gespräch unter der Insel",
            description: isBoundaries
              ? "Ihr habt Dauer, Privatsphäre und die Möglichkeit zur jederzeitigen Abreise ausdrücklich geklärt."
              : "Im Midnight Wing wurde ein persönliches Geheimnis freiwillig geteilt.",
            tone: isBoundaries ? "honest" : "warm",
            knownBy: [characterId],
          },
        ],
      },
      now,
    );
    return next;
  }
}
