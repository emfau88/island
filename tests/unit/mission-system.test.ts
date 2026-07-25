import { describe, expect, it } from "vitest";
import { createInitialSave, validateSave } from "../../src/core/SaveManager";
import { MISSIONS } from "../../src/data/missions";
import { MESSAGES } from "../../src/data/messages";
import { LOCATIONS } from "../../src/data/locations";
import { ROUTES } from "../../src/data/routes";
import { MissionSystem } from "../../src/systems/MissionSystem";
import type { SaveState } from "../../src/core/types";

const system = new MissionSystem();

function completeFirstAvailable(state: SaveState): SaveState {
  const mission = system.available(state)[0];
  if (!mission) {
    throw new Error("No available mission.");
  }
  let next = system.start(state, mission.id, 100);
  const pickup = mission.pickupChoices[0];
  const route = mission.routeIds[0];
  const travel = mission.travelChoices[0];
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
    let state = createInitialSave();
    expect(system.available(state).map((mission) => mission.id)).toEqual(["lola-cocktail-01"]);

    state = completeFirstAvailable(state);
    expect(system.available(state).map((mission) => mission.id)).toEqual(["lola-ice-02"]);

    state = completeFirstAvailable(state);
    expect(system.available(state).map((mission) => mission.id)).toEqual(["lola-playlist-03"]);

    state = completeFirstAvailable(state);
    expect(system.available(state)).toEqual([]);
    expect(state.completedMissions).toHaveLength(3);
    expect(state.messages).toHaveLength(4);
  });

  it("keeps mission effects pending until atomic completion", () => {
    const initial = createInitialSave();
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
    const completed = completeFirstAvailable(createInitialSave());
    const resources = { ...completed.resources };

    expect(() => system.complete(completed, "direct-return")).toThrow();
    expect(completed.resources).toEqual(resources);
  });

  it("discards pending changes on abort", () => {
    const initial = createInitialSave();
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
    const producedFlags = new Set(MISSIONS.flatMap((mission) => mission.completionFlags));
    const consumedFlags = new Set([
      ...MISSIONS.flatMap((mission) => [
        ...mission.requirements.requiredFlags,
        ...mission.requirements.forbiddenFlags,
      ]),
      ...MESSAGES.flatMap((message) => message.requiredFlags),
    ]);

    for (const mission of MISSIONS) {
      expect(locationIds.has(mission.startLocation)).toBe(true);
      expect(locationIds.has(mission.destination)).toBe(true);
      expect(mission.routeIds.every((id) => routeIds.has(id))).toBe(true);
      expect(mission.pickupChoices.length).toBeGreaterThanOrEqual(3);
      expect(mission.travelChoices.length).toBeGreaterThanOrEqual(3);
      expect(mission.encounterChoices.length).toBeGreaterThanOrEqual(3);
      expect(mission.completionFlags.length).toBeGreaterThan(0);
    }

    for (const flag of producedFlags) {
      expect(consumedFlags.has(flag), `unused story flag: ${flag}`).toBe(true);
    }
  });
});
