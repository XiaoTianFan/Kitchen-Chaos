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
    this.buses.fx.connect(this.masterGain);
    this.buses.accidents.connect(this.masterGain);

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
}


