export class EventBus {
  #listeners = new Map();

  on(eventName, handler) {
    if (!this.#listeners.has(eventName)) this.#listeners.set(eventName, new Set());
    this.#listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    this.#listeners.get(eventName)?.delete(handler);
  }

  emit(eventName, payload) {
    this.#listeners.get(eventName)?.forEach(handler => {
      try { handler(payload); }
      catch (error) { console.error(`[EventBus:${eventName}]`, error); }
    });
  }
}