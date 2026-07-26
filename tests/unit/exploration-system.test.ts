import { describe, expect, it } from "vitest";
import { createInitialSave } from "../../src/core/SaveManager";
import { ExplorationSystem } from "../../src/systems/ExplorationSystem";

describe("ExplorationSystem", () => {
  const exploration = new ExplorationSystem();

  it("stores visits once and resolves a discovery only once", () => {
    const initial = createInitialSave(10);
    const visited = exploration.visit(initial, "pool");
    const revisited = exploration.visit(visited, "pool");

    expect(visited.exploration.visitedLocations).toEqual(["pool"]);
    expect(revisited).toBe(visited);

    const result = exploration.resolve(visited, "pool-overhear-afterhours", 20);
    expect(result.discovered).toBe("pool_afterhours_pattern");
    expect(result.state.exploration.discoveries).toContain("pool_afterhours_pattern");
    expect(result.state.exploration.completedActions).toContain("pool-overhear-afterhours");
    expect(result.state.resources.fans).toBe(40);
    expect(() =>
      exploration.resolve(result.state, "pool-overhear-afterhours", 30),
    ).toThrow("Bereits entdeckt");
  });

  it("uses discoveries as prerequisites across locations", () => {
    const initial = createInitialSave(10);
    initial.completedMissions = ["lola-cocktail-01", "lola-ice-02"];
    initial.resources.cash = 100;

    const locked = exploration.activities(initial, "dock").find(
      ({ definition }) => definition.id === "dock-sealed-crate",
    );
    expect(locked?.status.unlocked).toBe(false);
    expect(locked?.status.reason).toBe("Passender Hinweis fehlt");

    const rumor = exploration.resolve(initial, "bar-bartender-rumor", 20);
    const unlocked = exploration.activities(rumor.state, "dock").find(
      ({ definition }) => definition.id === "dock-sealed-crate",
    );
    expect(unlocked?.status.unlocked).toBe(true);
  });
});
