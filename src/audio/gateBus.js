// Lightweight event bus for gate triggers

class GateBus extends EventTarget {
  emitHit(detail) {
    this.dispatchEvent(new CustomEvent('gate:hit', { detail }));
  }
}

export const gateBus = new GateBus();


