export class StateMachine<T extends string> {
  public constructor(
    private currentState: T,
    private readonly transitions: Record<T, readonly T[]>,
  ) {}

  public get current(): T {
    return this.currentState;
  }

  public canTransition(next: T): boolean {
    return this.currentState === next || this.transitions[this.currentState].includes(next);
  }

  public transition(next: T): T {
    if (!this.canTransition(next)) {
      throw new Error(`Invalid scene transition: ${this.currentState} -> ${next}`);
    }
    this.currentState = next;
    return this.currentState;
  }
}
