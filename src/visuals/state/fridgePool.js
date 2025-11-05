// Shared pool for 'fridge' geometries so other effects (e.g., chopping)
// can target landing positions from those geometries.

const items = new Map(); // id -> { getX:()=>number, requestFadeOut:()=>void }

export const fridgePool = {
  add(id, api) {
    if (!id || !api) return;
    items.set(id, api);
  },
  remove(id) {
    if (!id) return;
    items.delete(id);
  },
  pickRandom() {
    if (items.size === 0) return null;
    const keys = Array.from(items.keys());
    const id = keys[(Math.random() * keys.length) | 0];
    const api = items.get(id);
    if (!api) return null;
    return { id, api };
  },
  clear() { items.clear(); },
  get size() { return items.size; }
};


