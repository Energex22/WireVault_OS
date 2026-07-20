export class Store {
  #state;
  #bus;

  constructor(initialState, bus) {
    this.#state = structuredClone(initialState);
    this.#bus = bus;
  }

  getState() {
    return structuredClone(this.#state);
  }

  get(path) {
    return path.split('.').reduce((value, key) => value?.[key], this.#state);
  }

  set(path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((object, key) => object[key] ??= {}, this.#state);
    target[last] = value;
    this.#bus.emit('state:changed', { path, value, state: this.getState() });
  }
}