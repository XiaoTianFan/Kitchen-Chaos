import { initSounds, playOneShot, playSustained, stopSustained, toggleSustained } from './sounds.js';

export class SoundManager {
  constructor(audioEngine, cfg) {
    this.audio = audioEngine;
    this.cfg = cfg || {};
    this.sustainedState = new Map(); // id -> handle
    initSounds(audioEngine);
  }

  getSoundMeta(id) {
    return (this.cfg?.sounds || []).find(s => s.id === id) || { id, bus: 'fx' };
  }

  playOneShot(id, { x = 0.5 } = {}) {
    const meta = this.getSoundMeta(id);
    return playOneShot(id, { x, bus: meta.bus || 'fx', gain: 1.0 });
  }

  startSustained(id, { x = 0.5 } = {}) {
    if (this.sustainedState.has(id)) return this.sustainedState.get(id);
    const meta = this.getSoundMeta(id);
    const h = playSustained(id, { x, bus: meta.bus || 'beds', gain: 0.9 });
    if (!h) return null; // Buffer not loaded or engine not initialized
    this.sustainedState.set(id, h);
    return h;
  }

  stopSustained(id) {
    if (!this.sustainedState.has(id)) return;
    stopSustained(id);
    this.sustainedState.delete(id);
  }

  toggleSustained(id, { x = 0.5 } = {}) {
    if (this.sustainedState.has(id)) {
      this.stopSustained(id);
      return null;
    }
    return this.startSustained(id, { x });
  }
}


