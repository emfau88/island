import { describe, expect, it } from "vitest";
import { createInitialSave, validateSave } from "../../src/core/SaveManager";
import { MISSIONS } from "../../src/data/missions";
import { MESSAGES } from "../../src/data/messages";
import { LOCATIONS } from "../../src/data/locations";
import { ROUTES } from "../../src/data/routes";
import { MissionSystem } from "../../src/systems/MissionSystem";
import { MessageSystem } from "../../src/systems/MessageSystem";
import type { SaveState } from "../../src/core/types";

const system = new MissionSystem();
const messages = new MessageSystem();

function onboard(state: SaveState): SaveState {
  return messages.reply(state, "lola-intro", "intro-reliable", 50);
}

function completeFirstAvailable(state: SaveState): SaveState {
  const mission = system.available(state)[0];
  if (!mission) {
    throw new Error("No available mission.");
  }
  let next = system.start(state, mission.id, 100);
  const pickup = mission.pickupChoices[0];
  const route = mission.routeIds[0];
  const travel = mission.travelEvent.choices[0];
  const encounter = mission.encounterChoices[0];
  if (!pickup || !travel || !encounter) {
    throw new Error("Mission content incomplete.");
  }
  next = system.choosePickup(next, pickup.id);
  next = system.chooseRoute(next, route);
  next = system.chooseTravel(next, travel.id);
  next = system.arrive(next);
  return system.complete(next, encounter.id, 200);
}

describe("MissionSystem", () => {
  it("exposes missions in a reachable linear Lola progression", () => {
    let state = onboard(createInitialSave());
    expect(system.available(state).map((mission) => mission.id)).toEqual(["lola-cocktail-01"]);

    state = completeFirstAvailable(state);
    state = messages.reply(state, "lola-after-cocktail", "ice-careful", 250);
    expect(system.available(state).map((mission) => mission.id)).toEqual(["lola-ice-02"]);

    state = completeFirstAvailable(state);
    state = messages.reply(state, "lola-after-ice", "playlist-discreet", 350);
    expect(system.available(state).map((mission) => mission.id)).toEqual(["lola-playlist-03"]);

    state = completeFirstAvailable(state);
    expect(system.available(state)).toEqual([]);
    expect(state.completedMissions).toHaveLength(3);
    expect(state.messages).toHaveLength(4);
  });

  it("keeps mission effects pending until atomic completion", () => {
    const initial = onboard(createInitialSave());
    const mission = MISSIONS[0];
    if (!mission) throw new Error("Missing fixture mission.");
    let state = system.start(initial, mission.id);
    const pickup = mission.pickupChoices[0];
    if (!pickup) throw new Error("Missing pickup choice.");
    state = system.choosePickup(state, pickup.id);

    expect(state.resources).toEqual(initial.resources);
    expect(state.relationships.lola.trust).toBe(initial.relationships.lola.trust);
    expect(state.activeMission?.pendingEffects.trust).toBeGreaterThan(0);

    state = system.chooseRoute(state, mission.routeIds[0]);
    const restored = validateSave(JSON.parse(JSON.stringify(state)) as unknown);
    expect(restored?.activeMission?.phase).toBe("travel");
    expect(restored?.resources).toEqual(initial.resources);
  });

  it("cannot award a completed transaction twice", () => {
    const completed = completeFirstAvailable(onboard(createInitialSave()));
    const resources = { ...completed.resources };

    expect(() => system.complete(completed, "direct-return")).toThrow();
    expect(completed.resources).toEqual(resources);
  });

  it("discards pending changes on abort", () => {
    const initial = onboard(createInitialSave());
    const mission = MISSIONS[0];
    const pickup = mission?.pickupChoices[1];
    if (!mission || !pickup) throw new Error("Missing mission fixture.");
    let state = system.start(initial, mission.id);
    state = system.choosePickup(state, pickup.id);
    state = system.abort(state);

    expect(state.activeMission).toBeNull();
    expect(state.resources).toEqual(initial.resources);
    expect(state.relationships.lola.attraction).toBe(initial.relationships.lola.attraction);
  });

  it("has valid references, used flags, and complete mission stages", () => {
    const locationIds = new Set(LOCATIONS.map((location) => location.id));
    const routeIds = new Set(ROUTES.map((route) => route.id));
    const producedFlags = new Set([
      ...MISSIONS.flatMap((mission) => mission.completionFlags),
      ...MESSAGES.flatMap((message) => message.replies.flatMap((reply) => reply.flags)),
    ]);
    const requiredFlags = new Set([
      ...MISSIONS.flatMap((mission) => [
        ...mission.requirements.requiredFlags,
      ]),
      ...MESSAGES.flatMap((message) => message.requiredFlags),
    ]);

    for (const mission of MISSIONS) {
      expect(locationIds.has(mission.startLocation)).toBe(true);
      expect(locationIds.has(mission.destination)).toBe(true);
      expect(mission.routeIds.every((id) => routeIds.has(id))).toBe(true);
      expect(mission.pickupChoices.length).toBeGreaterThanOrEqual(3);
      expect(mission.travelEvent.choices.length).toBeGreaterThanOrEqual(3);
      expect(mission.encounterChoices.length).toBeGreaterThanOrEqual(3);
      expect(mission.completionFlags.length).toBeGreaterThan(0);
    }

    for (const flag of requiredFlags) {
      expect(producedFlags.has(flag), `unreachable required story flag: ${flag}`).toBe(true);
    }
  });

  it("turns high heat into a real payout penalty", () => {
    const initial = onboard(createInitialSave());
    initial.resources.heat = 75;
    const mission = MISSIONS[0];
    if (!mission) throw new Error("Missing mission fixture.");
    let state = system.start(initial, mission.id);
    state = system.choosePickup(state, mission.pickupChoices[0]!.id);
    state = system.chooseRoute(state, mission.routeIds[1]);
    state = system.chooseTravel(state, mission.travelEvent.choices[0]!.id);
    state = system.arrive(state);
    const result = system.completeWithResult(state, mission.encounterChoices[0]!.id);

    expect(result.heatPenalty).toBeGreaterThan(0);
    expect(result.entries.some((entry) => entry.label.includes("Heat-Abzug"))).toBe(true);
    expect(result.state.resources.cash).toBeLessThan(2_950);
  });

  it("records every decision source for a causal outcome breakdown", () => {
    const initial = onboard(createInitialSave());
    const mission = MISSIONS[0]!;
    let state = system.start(initial, mission.id);
    state = system.choosePickup(state, mission.pickupChoices[0]!.id);
    state = system.chooseRoute(state, mission.routeIds[0]);
    state = system.chooseTravel(state, mission.travelEvent.choices[0]!.id);
    state = system.arrive(state);
    const result = system.completeWithResult(state, mission.encounterChoices[0]!.id);

    expect(result.entries.map((entry) => entry.source)).toEqual([
      "pickup",
      "route",
      "travel",
      "encounter",
      "reward",
    ]);
  });
});
