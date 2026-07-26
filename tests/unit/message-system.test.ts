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

  it("routes Mia replies and social consequences to the correct character", () => {
    const initial = createInitialSave(10);
    initial.flags.push("lola_slice_finished");
    initial.messages.push({ id: "mia-intro", read: false, unlockedAt: 20 });
    const lolaBefore = { ...initial.relationships.lola };

    const replied = messages.reply(initial, "mia-intro", "mia-intro-careful", 30);

    expect(replied.relationships.mia.trust).toBe(initial.relationships.mia.trust + 4);
    expect(replied.relationships.mia.attraction).toBe(initial.relationships.mia.attraction + 1);
    expect(replied.relationships.lola).toEqual(lolaBefore);
    expect(replied.flags).toContain("mia_documents_confirmed");
    expect(missions.available(replied).map((mission) => mission.id)).toContain(
      "mia-documents-01",
    );
  });
});
