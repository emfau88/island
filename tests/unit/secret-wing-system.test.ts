import { describe, expect, it } from "vitest";
import { createInitialSave } from "../../src/core/SaveManager";
import { SecretWingSystem } from "../../src/systems/SecretWingSystem";

function buildableState() {
  const state = createInitialSave(10);
  state.resources.cash = 20_000;
  state.property.tier = "bungalow";
  state.completedMissions = [
    "lola-cocktail-01",
    "lola-ice-02",
    "lola-vip-03",
  ];
  state.exploration.discoveries.push("hidden_foundation_plan");
  state.relationships.lola.trust = 40;
  return state;
}

describe("SecretWingSystem", () => {
  const wing = new SecretWingSystem();

  it("requires the house, story discovery, missions and cash for construction", () => {
    const initial = createInitialSave(10);
    const first = wing.next(initial);
    expect(first).not.toBeNull();
    expect(first && wing.requirements(initial, first).canBuild).toBe(false);

    const ready = buildableState();
    const tier = wing.next(ready);
    expect(tier && wing.requirements(ready, tier).canBuild).toBe(true);
    const built = wing.purchase(ready, 1);
    expect(built.secretWing.level).toBe(1);
    expect(built.resources.cash).toBe(15_500);
  });

  it("records a voluntary stay, private scene and unrestricted departure", () => {
    const built = wing.purchase(buildableState(), 1);
    const invited = wing.invite(built, "lola", 20);
    expect(invited.secretWing.guests.lola.status).toBe("staying");
    expect(invited.lastDecision).toContain("freiwillig");
    expect(invited.social.memories.at(-1)?.knownBy).toEqual(["lola"]);

    const talked = wing.resolveGuestScene(invited, "lola", "boundaries", 30);
    expect(talked.secretWing.guests.lola.completedScenes).toContain(
      "lola_boundaries",
    );
    expect(talked.relationships.lola.trust).toBeGreaterThan(
      invited.relationships.lola.trust,
    );

    const departed = wing.endStay(talked, "lola", 40);
    expect(departed.secretWing.guests.lola.status).toBe("left");
    expect(departed.lastDecision).toContain("eigenen Wunsch");
  });
});
