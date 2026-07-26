import { describe, expect, it } from "vitest";
import { createInitialSave } from "../../src/core/SaveManager";
import { PoolSceneSystem } from "../../src/systems/PoolSceneSystem";

describe("PoolSceneSystem", () => {
  const pool = new PoolSceneSystem();

  it("unlocks Lola as a visible pool actor after the first mission", () => {
    const state = createInitialSave(10);
    state.completedMissions = ["lola-cocktail-01"];
    state.flags.push("lola_cocktail_complete");

    expect(pool.actors(state)).toEqual(["lola"]);
    expect(pool.interactions(state, "lola").map(({ id }) => id)).toContain(
      "pool-lola-breathe",
    );
  });

  it("stores a one-time character interaction and its private memory", () => {
    const state = createInitialSave(10);
    state.completedMissions = ["lola-cocktail-01"];
    state.flags.push("lola_cocktail_complete");

    const resolved = pool.resolve(state, "pool-lola-breathe", 20);

    expect(resolved.flags).toContain("pool_lola_met");
    expect(resolved.exploration.completedActions).toContain(
      "pool-lola-breathe",
    );
    expect(resolved.relationships.lola.trust).toBe(12);
    expect(resolved.social.memories[0]).toMatchObject({
      id: "pool_evening_with_lola",
      knownBy: ["lola"],
      createdAt: 20,
    });
    expect(() =>
      pool.resolve(resolved, "pool-lola-breathe", 30),
    ).toThrow("nicht verfügbar");
  });

  it("unlocks the group scene only after both individual meetings", () => {
    const state = createInitialSave(10);
    state.completedMissions = [
      "lola-cocktail-01",
      "lola-ice-02",
      "lola-playlist-03",
      "mia-documents-01",
    ];
    state.flags.push(
      "lola_cocktail_complete",
      "mia_documents_complete",
      "pool_lola_met",
      "pool_mia_met",
    );

    expect(pool.actors(state)).toEqual(["lola", "mia"]);
    const [group] = pool.interactions(state, "group");
    expect(group?.id).toBe("pool-group-toast");

    const resolved = pool.resolve(state, "pool-group-toast", 40);
    expect(resolved.social.lolaMia.friendship).toBe(50);
    expect(resolved.social.lolaMia.tension).toBe(7);
    expect(resolved.social.memories.at(-1)?.knownBy).toEqual(["lola", "mia"]);
  });
});
