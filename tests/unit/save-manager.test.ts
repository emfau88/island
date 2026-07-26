import { describe, expect, it } from "vitest";
import { SaveManager, createInitialSave, syncUnlockedMessages, validateSave } from "../../src/core/SaveManager";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  public get length(): number {
    return this.values.size;
  }

  public clear(): void {
    this.values.clear();
  }

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("SaveManager", () => {
  it("round-trips a valid versioned save", () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage);
    const state = createInitialSave(123);
    state.resources.cash = 2_500;
    state.relationships.lola.trust = 38;

    expect(manager.save(state)).toBe(true);
    expect(manager.load()).toEqual(state);
  });

  it("resets safely when JSON or schema is incompatible", () => {
    const storage = new MemoryStorage();
    storage.setItem("island-runner-save", "{broken");
    const manager = new SaveManager(storage);

    expect(manager.load().version).toBe(5);
    expect(manager.load().resources.cash).toBe(0);

    storage.setItem("island-runner-save", JSON.stringify({ version: 99 }));
    expect(manager.load().version).toBe(5);
  });

  it("clamps externally modified values and rejects malformed active runs", () => {
    const state = createInitialSave();
    const modified = {
      ...state,
      resources: { cash: -50, fans: -1, heat: 400 },
      relationships: { lola: { attraction: 160, trust: -20, mood: 101 } },
    };
    const validated = validateSave(modified);
    expect(validated?.resources).toEqual({ cash: 0, fans: 0, heat: 100 });
    expect(validated?.relationships.lola).toEqual({ attraction: 100, trust: 0, mood: 100 });

    expect(validateSave({ ...state, activeMission: { missionId: "fake" } })).toBeNull();
  });

  it("unlocks flag-dependent messages only once", () => {
    const state = createInitialSave(10);
    state.flags.push("lola_cocktail_complete");
    const once = syncUnlockedMessages(state, 20);
    const twice = syncUnlockedMessages(once, 30);

    expect(once.messages.map((message) => message.id)).toContain("lola-after-cocktail");
    expect(twice.messages.filter((message) => message.id === "lola-after-cocktail")).toHaveLength(1);
  });

  it("migrates legacy progress without replaying completed onboarding", () => {
    const state = createInitialSave(10);
    const legacy = {
      ...state,
      version: 1,
      missionStyles: undefined,
      settings: undefined,
      flags: ["lola_cocktail_complete"],
      completedMissions: ["lola-cocktail-01"],
    };
    const migrated = validateSave(legacy);

    expect(migrated?.version).toBe(5);
    expect(migrated?.property).toEqual({ tier: "shack", tutorialSeen: false });
    expect(migrated?.flags).toContain("onboarding_complete");
    expect(migrated?.messages.find((message) => message.id === "lola-intro")?.replyId).toBe(
      "intro-reliable",
    );
    expect(migrated?.settings).toEqual({ sound: true, haptics: true });
    expect(migrated?.relationships.mia).toEqual({ attraction: 4, trust: 8, mood: 50 });
    expect(migrated?.social).toEqual({
      lolaMia: { friendship: 45, tension: 10 },
      memories: [],
    });
    expect(migrated?.exploration).toEqual({
      visitedLocations: [],
      discoveries: [],
      completedActions: [],
    });
    expect(migrated?.secretWing.level).toBe(0);
    expect(migrated?.secretWing.guests.lola.status).toBe("none");
  });

  it("migrates version 2 saves to the starting property without losing progress", () => {
    const state = createInitialSave(10);
    const legacy = {
      ...state,
      version: 2,
      property: undefined,
      resources: { cash: 4_300, fans: 510, heat: 18 },
      completedMissions: ["lola-cocktail-01", "lola-ice-02"],
    };
    const migrated = validateSave(legacy);

    expect(migrated?.version).toBe(5);
    expect(migrated?.property).toEqual({ tier: "shack", tutorialSeen: false });
    expect(migrated?.resources.cash).toBe(4_300);
    expect(migrated?.completedMissions).toHaveLength(2);
  });

  it("migrates version 3 property saves with a stable social baseline", () => {
    const state = createInitialSave(10);
    const legacy = {
      ...state,
      version: 3,
      relationships: { lola: state.relationships.lola },
      social: undefined,
      property: { tier: "bungalow", tutorialSeen: true },
    };
    const migrated = validateSave(legacy);

    expect(migrated?.version).toBe(5);
    expect(migrated?.property).toEqual({ tier: "bungalow", tutorialSeen: true });
    expect(migrated?.relationships.mia.trust).toBe(8);
    expect(migrated?.social.memories).toEqual([]);
  });
});
