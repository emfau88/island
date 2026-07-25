import { describe, expect, it } from "vitest";
import { StateMachine } from "../../src/core/StateMachine";

type State = "hub" | "mission" | "result";

describe("StateMachine", () => {
  it("allows declared transitions and rejects invalid jumps", () => {
    const machine = new StateMachine<State>("hub", {
      hub: ["mission"],
      mission: ["hub", "result"],
      result: ["hub"],
    });

    expect(machine.transition("mission")).toBe("mission");
    expect(machine.transition("result")).toBe("result");
    expect(() => machine.transition("mission")).toThrow("Invalid scene transition");
  });
});
