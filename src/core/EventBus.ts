type Listener<T> = (payload: T) => void;

export class EventBus<Events extends object> {
  private readonly listeners = new Map<keyof Events, Set<Listener<Events[keyof Events]>>>();

  public on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const existing = this.listeners.get(event) ?? new Set<Listener<Events[keyof Events]>>();
    existing.add(listener as Listener<Events[keyof Events]>);
    this.listeners.set(event, existing);
    return () => existing.delete(listener as Listener<Events[keyof Events]>);
  }

  public emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }
}
