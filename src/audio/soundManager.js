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

  playOneShot(id, { x = 0.5, gain, fadeInMs, fadeOutMs } = {}) {
    const meta = this.getSoundMeta(id);
    return playOneShot(id, {
      x,
      bus: meta.bus || 'fx',
      gain: gain ?? meta.gain ?? 1.0,
      fadeInMs: fadeInMs ?? meta.fadeInMs,
      fadeOutMs: fadeOutMs ?? meta.fadeOutMs
    });
  }

  startSustained(id, { x = 0.5, gain, fadeInMs } = {}) {
    if (this.sustainedState.has(id)) return this.sustainedState.get(id);
    const meta = this.getSoundMeta(id);
    const h = playSustained(id, {
      x,
      bus: meta.bus || 'beds',
      gain: gain ?? meta.gain ?? 0.9,
      fadeInMs: fadeInMs ?? meta.fadeInMs
    });
    if (!h) return null; // Buffer not loaded or engine not initialized
    this.sustainedState.set(id, h);
    return h;
  }

  stopSustained(id, { fadeOutMs } = {}) {
    if (!this.sustainedState.has(id)) return;
    const meta = this.getSoundMeta(id);
    stopSustained(id, { fadeOutMs: fadeOutMs ?? meta.fadeOutMs });
    this.sustainedState.delete(id);
  }

  toggleSustained(id, { x = 0.5, gain, fadeInMs, fadeOutMs } = {}) {
    if (this.sustainedState.has(id)) {
      this.stopSustained(id, { fadeOutMs });
      return null;
    }
    return this.startSustained(id, { x, gain, fadeInMs });
  }
}


