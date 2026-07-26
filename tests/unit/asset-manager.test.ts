import { describe, expect, it } from "vitest";
import { poolReactionAsset } from "../../src/core/AssetManager";

describe("pool character assets", () => {
  it("maps Lola's pool reactions to three distinct swimsuit poses", () => {
    const neutral = poolReactionAsset("neutral", "lola");
    const positive = poolReactionAsset("positive", "lola");
    const serious = poolReactionAsset("serious", "lola");

    expect(neutral).toMatch(/lola-pool-neutral\.png$/);
    expect(positive).toMatch(/lola-pool-positive\.png$/);
    expect(serious).toMatch(/lola-pool-serious\.png$/);
    expect(new Set([neutral, positive, serious]).size).toBe(3);
  });

  it("keeps compatible emotional aliases inside the pool wardrobe set", () => {
    expect(poolReactionAsset("flirty", "lola")).toBe(
      poolReactionAsset("positive", "lola"),
    );
    expect(poolReactionAsset("annoyed", "lola")).toBe(
      poolReactionAsset("serious", "lola"),
    );
  });
});
