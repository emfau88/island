import { describe, expect, it } from "vitest";
import { createInitialSave } from "../../src/core/SaveManager";
import { PropertySystem } from "../../src/systems/PropertySystem";

describe("PropertySystem", () => {
  const property = new PropertySystem();

  it("starts at the hut and exposes the bungalow as the next meaningful money sink", () => {
    const state = createInitialSave();

    expect(property.current(state).id).toBe("shack");
    expect(property.next(state)?.id).toBe("bungalow");
    expect(property.requirements(state, property.next(state)!)).toMatchObject({
      enoughCash: false,
      enoughMissions: false,
      canBuild: false,
    });
  });

  it("builds sequentially, deducts cash and only changes impression-related values", () => {
    const state = createInitialSave();
    state.resources.cash = 2_500;
    state.completedMissions.push("lola-cocktail-01");
    const trustBefore = state.relationships.lola.trust;

    const upgraded = property.purchase(state, "bungalow");

    expect(upgraded.resources.cash).toBe(500);
    expect(upgraded.property).toEqual({ tier: "bungalow", tutorialSeen: true });
    expect(upgraded.relationships.lola.attraction).toBe(state.relationships.lola.attraction + 2);
    expect(upgraded.relationships.lola.mood).toBe(state.relationships.lola.mood + 3);
    expect(upgraded.relationships.lola.trust).toBe(trustBefore);
    expect(upgraded.flags).toContain("property_bungalow_owned");
    expect(() => property.purchase(upgraded, "bungalow")).toThrow(/Stufe für Stufe/);
  });

  it("keeps later stages locked behind story reputation even with enough money", () => {
    const state = createInitialSave();
    state.property = { tier: "bungalow", tutorialSeen: true };
    state.resources.cash = 20_000;
    state.completedMissions.push(
      "lola-cocktail-01",
      "lola-ice-02",
      "lola-playlist-03",
    );
    state.resources.fans = 499;
    const poolHouse = property.next(state)!;

    expect(property.requirements(state, poolHouse)).toMatchObject({
      enoughCash: true,
      enoughMissions: true,
      enoughFans: false,
      canBuild: false,
    });
    expect(() => property.purchase(state, "pool-house")).toThrow(/Voraussetzungen/);
  });
});
