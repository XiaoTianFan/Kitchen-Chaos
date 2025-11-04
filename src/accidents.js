import { createRng, randRange } from './rng.js';

export class AccidentScheduler {
  constructor(cfg) {
    this.cycle = (cfg?.accidents?.cycle && cfg.accidents.cycle.slice()) || ['clatter','thing_breaking','thump'];
    this.delayMs = cfg?.accidents?.delayMs ?? 200;
    this.index = 0;
    this.rand = createRng(Date.now() >>> 0);
  }

  nextType(requested) {
    if (requested && requested !== 'cycle') return requested;
    const type = this.cycle[this.index % this.cycle.length];
    this.index = (this.index + 1) % this.cycle.length;
    return type;
  }

  randomPosition(width, height) {
    const x = randRange(this.rand, 0.05 * width, 0.95 * width);
    const y = randRange(this.rand, 0.05 * height, 0.95 * height);
    return { x, y };
  }
}


