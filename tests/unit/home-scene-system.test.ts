import { describe, expect, it } from "vitest";
import { createInitialSave } from "../../src/core/SaveManager";
import { HomeSceneSystem } from "../../src/systems/HomeSceneSystem";

const homeScenes = new HomeSceneSystem();

describe("HomeSceneSystem", () => {
  it("resolves the pending Mia visit once and preserves private knowledge", () => {
    const state = createInitialSave(10);
    state.flags.push("mia_home_scene_pending");
    const lolaBefore = { ...state.relationships.lola };

    const resolved = homeScenes.resolve(state, "mia-home-closer", 20);
    const memory = resolved.social.memories.find(
      (candidate) => candidate.id === "mia_private_evening",
    );

    expect(resolved.flags).toContain("mia_home_visit_complete");
    expect(resolved.relationships.mia.attraction).toBeGreaterThan(
      state.relationships.mia.attraction,
    );
    expect(resolved.relationships.lola).toEqual(lolaBefore);
    expect(memory?.knownBy).toEqual(["mia"]);
    expect(memory?.description).toContain("Lola weiß nichts");
    expect(homeScenes.isPending(resolved)).toBe(false);
    expect(() => homeScenes.resolve(resolved, "mia-home-closer", 30)).toThrow();
  });

  it("can reduce Lola–Mia tension through an honest home conversation", () => {
    const state = createInitialSave(10);
    state.flags.push("mia_home_scene_pending");
    state.social.lolaMia.tension = 18;

    const resolved = homeScenes.resolve(state, "mia-home-transparent", 20);

    expect(resolved.social.lolaMia.friendship).toBe(47);
    expect(resolved.social.lolaMia.tension).toBe(15);
    expect(resolved.relationships.mia.trust).toBe(13);
  });
});
