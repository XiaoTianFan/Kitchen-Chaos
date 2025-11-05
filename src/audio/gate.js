import { gateBus } from './gateBus.js';
import { log } from '../logging.js';

// Convert dB to linear amplitude
function dbToLinear(db) {
  return Math.pow(10, (db || 0) / 20);
}

export class GateService {
  constructor() {
    this.ctx = null;
    this.entries = new Map(); // soundId -> { nodes: Set<{ analyser, buffer, freqBuffer }>, opts, state }
    this._timer = null;
    this._tick = this._tick.bind(this);
  }

  setContext(audioContext) {
    this.ctx = audioContext || this.ctx;
  }

  register(soundId, audioNode, opts = {}) {
    if (!this.ctx || !audioNode) return;
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0; // explicit smoothing handled below
    try { audioNode.connect(analyser); } catch (_) {}
    const buffer = new Float32Array(analyser.fftSize);
    const freqBuffer = new Uint8Array(analyser.frequencyBinCount);

    let e = this.entries.get(soundId);
    if (!e) {
      const thresholdLinear = dbToLinear(opts.thresholdDb ?? -18);
      const attack = Math.max(0.001, (opts.attackMs ?? 15) / 1000);
      const release = Math.max(0.001, (opts.releaseMs ?? 120) / 1000);
      const minIntervalMs = Math.max(0, opts.minIntervalMs ?? 90);
      e = {
        nodes: new Set(),
        opts: { thresholdLinear, attack, release, minIntervalMs },
        state: { smoothed: 0, isOpen: false, lastHitAt: 0 }
      };
      this.entries.set(soundId, e);
    }
    e.nodes.add({ analyser, buffer, freqBuffer });

    if (!this._timer) {
      this._timer = setInterval(this._tick, 16);
    }

    return () => this.unregister(soundId, analyser);
  }

  unregister(soundId, analyser) {
    const e = this.entries.get(soundId);
    if (!e) return;
    for (const n of Array.from(e.nodes)) {
      if (n.analyser === analyser) e.nodes.delete(n);
    }
    if (e.nodes.size === 0) this.entries.delete(soundId);
    if (this.entries.size === 0 && this._timer) {
      clearInterval(this._timer); this._timer = null;
    }
  }

  _tick() {
    const now = performance.now();
    for (const [soundId, e] of this.entries) {
      // Combine RMS across all active analysers for this soundId
      let sumSq = 0; let num = 0;
      for (const n of e.nodes) {
        try { n.analyser.getFloatTimeDomainData(n.buffer); } catch (_) { continue; }
        let rms = 0;
        for (let i = 0; i < n.buffer.length; i++) {
          const v = n.buffer[i];
          rms += v * v;
        }
        rms = Math.sqrt(rms / n.buffer.length);
        sumSq += rms * rms; num += 1;
      }
      const rmsCombined = num > 0 ? Math.sqrt(sumSq / num) : 0;

      // Attack/Release smoothing
      const s = e.state.smoothed;
      const up = rmsCombined > s;
      const coeff = up ? e.opts.attack : e.opts.release;
      const smoothed = s + (rmsCombined - s) * Math.min(1, coeff * 60);
      e.state.smoothed = smoothed;

      // Broadcast level for debug UI consumers
      try { gateBus.dispatchEvent(new CustomEvent('gate:level', { detail: { soundId, rms: smoothed, t: now } })); } catch (_) {}

      // Compute and broadcast spectrum for 20–18000 Hz as 128 bands (log scale)
      try {
        const ctx = this.ctx;
        const sampleRate = ctx?.sampleRate || 48000;
        const numBands = 128;
        const minHz = 20;
        const maxHz = 18000;
        // Prepare accumulation array
        const bands = new Float32Array(numBands);
        let contributingNodes = 0;
        for (const n of e.nodes) {
          const a = n.analyser;
          try { a.getByteFrequencyData(n.freqBuffer); } catch (_) { continue; }
          const binCount = a.frequencyBinCount; // fftSize / 2
          const nyquist = sampleRate / 2;
          const logMin = Math.log(minHz);
          const logMax = Math.log(maxHz);
          for (let b = 0; b < numBands; b++) {
            const fLo = Math.exp(logMin + (b / numBands) * (logMax - logMin));
            const fHi = Math.exp(logMin + ((b + 1) / numBands) * (logMax - logMin));
            const idxLo = Math.max(0, Math.floor((fLo / nyquist) * binCount));
            const idxHi = Math.min(binCount - 1, Math.ceil((fHi / nyquist) * binCount));
            if (idxHi < idxLo) continue;
            let sum = 0; let count = 0;
            for (let k = idxLo; k <= idxHi; k++) { sum += n.freqBuffer[k]; count++; }
            const avg = count > 0 ? sum / (count * 255) : 0; // normalize 0..1
            bands[b] += avg;
          }
          contributingNodes++;
        }
        if (contributingNodes > 0) {
          for (let b = 0; b < bands.length; b++) bands[b] = Math.max(0, Math.min(1, bands[b] / contributingNodes));
          gateBus.dispatchEvent(new CustomEvent('gate:spectrum', { detail: { soundId, spectrum: bands, minHz, maxHz, t: now } }));
        }
      } catch (_) {}

      // Threshold crossing with debounce
      const crossed = !e.state.isOpen && smoothed >= e.opts.thresholdLinear;
      const since = now - e.state.lastHitAt;
      if (crossed && since >= (e.opts.minIntervalMs || 0)) {
        e.state.isOpen = true;
        e.state.lastHitAt = now;
        gateBus.emitHit({ soundId, rms: smoothed, t: now });
        try { log('gate:hit', { soundId, rms: smoothed }); } catch (_) {}
      }
      if (e.state.isOpen && smoothed < e.opts.thresholdLinear * 0.75) {
        e.state.isOpen = false;
      }
    }
  }
}

export const gateService = new GateService();


