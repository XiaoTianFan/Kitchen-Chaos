// AudioEngine: Web Audio setup with master chain and buses; unlock flow

export class AudioEngine {
  constructor(options = {}) {
    this.debug = !!options.debug;
    this.context = null;
    this.masterGain = null;
    this.masterCompressor = null;
    this.masterLimiter = null;
    this.buses = {
      beds: null,
      fx: null,
      accidents: null
    };
    // FX bus processing chain (delay send/return)
    this.fxChain = {
      dryGain: null,
      wetGain: null,
      delay: null,
      feedback: null
    };
    this._unlocked = false;
  }

  get isUnlocked() {
    return this._unlocked && this.context && this.context.state === 'running';
  }

  _ensureContext() {
    if (this.context) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error('Web Audio API not supported');
    this.context = new Ctx({ latencyHint: 'interactive' });

    // Master nodes
    const ctx = this.context;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.9; // headroom

    this.masterCompressor = ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -18;
    this.masterCompressor.knee.value = 24;
    this.masterCompressor.ratio.value = 3;
    this.masterCompressor.attack.value = 0.003;
    this.masterCompressor.release.value = 0.25;

    // Limiter-ish second stage
    this.masterLimiter = ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.value = -2;
    this.masterLimiter.knee.value = 0;
    this.masterLimiter.ratio.value = 20;
    this.masterLimiter.attack.value = 0.001;
    this.masterLimiter.release.value = 0.05;

    // Buses
    this.buses.beds = ctx.createGain();
    this.buses.fx = ctx.createGain();
    this.buses.accidents = ctx.createGain();

    this.buses.beds.gain.value = 1.0;
    this.buses.fx.gain.value = 1.0;
    this.buses.accidents.gain.value = 1.0;

    // Route: buses → masterGain → compressor → limiter → destination
    this.buses.beds.connect(this.masterGain);
    // FX bus goes through delay insert with wet/dry mix
    this.fxChain.dryGain = ctx.createGain();
    this.fxChain.wetGain = ctx.createGain();
    this.fxChain.delay = ctx.createDelay(1.0); // up to 1s max
    this.fxChain.feedback = ctx.createGain();

    // Defaults: subtle until automated
    this.fxChain.dryGain.gain.value = 1.0;
    this.fxChain.wetGain.gain.value = 0.0;
    this.fxChain.delay.delayTime.value = 0.25; // 250 ms slapback
    this.fxChain.feedback.gain.value = 0.35; // gentle repeats

    // Wire FX chain: buses (fx, accidents) → [dry || delay→wet] → master
    this.buses.fx.connect(this.fxChain.dryGain);
    this.buses.accidents.connect(this.fxChain.dryGain);
    this.fxChain.dryGain.connect(this.masterGain);

    this.buses.fx.connect(this.fxChain.delay);
    this.buses.accidents.connect(this.fxChain.delay);
    this.fxChain.delay.connect(this.fxChain.wetGain);
    this.fxChain.wetGain.connect(this.masterGain);
    // Feedback loop
    this.fxChain.delay.connect(this.fxChain.feedback);
    this.fxChain.feedback.connect(this.fxChain.delay);

    // Other buses direct

    this.masterGain.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterLimiter);
    this.masterLimiter.connect(ctx.destination);
  }

  async resume() {
    this._ensureContext();
    if (this.context.state !== 'running') {
      try {
        await this.context.resume();
        this._unlocked = true;
      } catch (err) {
        if (this.debug) console.error('[audio] resume failed', err);
        throw err;
      }
    } else {
      this._unlocked = true;
    }
  }

  stopAll() {
    this._ensureContext();
    try {
      // Hard cut: drop master gain to 0 instantly
      this.masterGain.gain.cancelScheduledValues(this.context.currentTime);
      this.masterGain.gain.setValueAtTime(0, this.context.currentTime);
    } catch (_) {}
  }

  // Restore mixer defaults after a hard cut or end-of-sequence
  resetToDefaults(rampSeconds = 0.25) {
    this._ensureContext();
    const t = this.context.currentTime;
    const rt = Math.max(0.001, Number.isFinite(rampSeconds) ? rampSeconds : 0.25);
    // Master gain back to nominal
    try {
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
      this.masterGain.gain.linearRampToValueAtTime(0.9, t + rt);
    } catch (_) {}
    // Reset bus gains
    try { this.buses.beds.gain.value = 1.0; } catch (_) {}
    try { this.buses.fx.gain.value = 1.0; } catch (_) {}
    try { this.buses.accidents.gain.value = 1.0; } catch (_) {}
    // Reset FX wet/dry mix to subtle default
    try {
      const { dryGain, wetGain } = this.fxChain;
      if (dryGain && wetGain) {
        dryGain.gain.cancelScheduledValues(t);
        wetGain.gain.cancelScheduledValues(t);
        dryGain.gain.setValueAtTime(dryGain.gain.value, t);
        wetGain.gain.setValueAtTime(wetGain.gain.value, t);
        dryGain.gain.linearRampToValueAtTime(1.0, t + rt);
        wetGain.gain.linearRampToValueAtTime(0.0, t + rt);
      }
    } catch (_) {}
  }

  getBus(name) {
    this._ensureContext();
    const bus = this.buses[name];
    if (!bus) throw new Error(`Unknown bus: ${name}`);
    return bus;
  }

  createEntityNodes({ busName = 'fx', pan = 0, initialGain = 1.0 } = {}) {
    this._ensureContext();
    const ctx = this.context;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    gain.gain.value = initialGain;

    source.connect(gain);
    gain.connect(panner);
    panner.connect(this.getBus(busName));

    return { source, gain, panner };
  }

  async fetchAndDecode(url) {
    this._ensureContext();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const arr = await res.arrayBuffer();
    return await this.context.decodeAudioData(arr);
  }

  // Mix between dry (1 - mix) and wet (mix) on FX bus delay insert
  setFxDelayWetMix(mix = 0, rampSeconds = 0.2) {
    this._ensureContext();
    const m = Math.max(0, Math.min(1, Number.isFinite(mix) ? mix : 0));
    const t = this.context.currentTime;
    const dry = 1 - m;
    const wet = m;
    try {
      const { dryGain, wetGain } = this.fxChain;
      if (!dryGain || !wetGain) return;
      dryGain.gain.cancelScheduledValues(t);
      wetGain.gain.cancelScheduledValues(t);
      dryGain.gain.setValueAtTime(dryGain.gain.value, t);
      wetGain.gain.setValueAtTime(wetGain.gain.value, t);
      const rt = Math.max(0.001, rampSeconds || 0);
      dryGain.gain.linearRampToValueAtTime(dry, t + rt);
      wetGain.gain.linearRampToValueAtTime(wet, t + rt);
    } catch (_) {}
  }
}


