import { describe, expect, it } from "vitest";
import { createInitialSave } from "../../src/core/SaveManager";
import { MessageSystem } from "../../src/systems/MessageSystem";
import { MissionSystem } from "../../src/systems/MissionSystem";

const messages = new MessageSystem();
const missions = new MissionSystem();

describe("MessageSystem", () => {
  it("turns the onboarding reply into a mission unlock with consequences", () => {
    const initial = createInitialSave(10);
    expect(missions.available(initial)).toEqual([]);

    const replied = messages.reply(initial, "lola-intro", "intro-flirty", 20);

    expect(replied.flags).toContain("onboarding_complete");
    expect(replied.relationships.lola.attraction).toBe(initial.relationships.lola.attraction + 4);
    expect(replied.resources.heat).toBe(1);
    expect(replied.messages[0]?.replyId).toBe("intro-flirty");
    expect(missions.available(replied).map((mission) => mission.id)).toEqual(["lola-cocktail-01"]);
  });

  it("cannot apply a message reply twice", () => {
    const initial = createInitialSave();
    const once = messages.reply(initial, "lola-intro", "intro-reliable");
    const twice = messages.reply(once, "lola-intro", "intro-reliable");

    expect(twice).toEqual(once);
    expect(twice.relationships.lola.trust).toBe(initial.relationships.lola.trust + 3);
  });
});
