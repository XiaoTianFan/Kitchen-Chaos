import { create as createHeatRing } from './factories/heatRing.js';
import { create as createRibbonWave } from './factories/ribbonWave.js';
import { create as createAccidentBursts } from './factories/accidentBursts.js';
import { create as createFlashingCircularSpectrogram } from './factories/flashingCircularSpectrogram.js';
import { create as createPulseStrokes } from './factories/pulseStrokes.js';
import { create as createPolygonWrinkle } from './factories/polygonWrinkle.js';
import { create as createStarburstShards } from './factories/starburstShards.js';
import { create as createFlareHeat } from './factories/flareHeat.js';
import { create as createSteamParticles } from './factories/steamParticles.js';
import { create as createBubbleField } from './factories/bubbleField.js';
import { create as createRippleEmitter } from './factories/rippleEmitter.js';
import { create as createVortexSpiral } from './factories/vortexSpiral.js';
import { create as createSprayCone } from './factories/sprayCone.js';
import { create as createSparkLine } from './factories/sparkLine.js';
import { create as createCitrusSplash } from './factories/citrusSplash.js';
import { create as createMicrowaveGrid } from './factories/microwaveGrid.js';
import { create as createFridgeDrop } from './factories/fridgeDrop.js';

const registry = {
  heatRing: createHeatRing,
  ribbonWave: createRibbonWave,
  accidentBursts: createAccidentBursts,
  flashingCircularSpectrogram: createFlashingCircularSpectrogram
  ,pulseStrokes: createPulseStrokes
  ,polygonWrinkle: createPolygonWrinkle
  ,starburstShards: createStarburstShards
  ,flareHeat: createFlareHeat
  ,steamParticles: createSteamParticles
  ,bubbleField: createBubbleField
  ,rippleEmitter: createRippleEmitter
  ,vortexSpiral: createVortexSpiral
  ,sprayCone: createSprayCone
  ,sparkLine: createSparkLine
  ,citrusSplash: createCitrusSplash
  ,microwaveGrid: createMicrowaveGrid
  ,fridgeDrop: createFridgeDrop
};

export function createFactory(name, params, ctx) {
  const fn = registry[name];
  if (!fn) throw new Error(`Unknown visual factory '${name}'`);
  return fn(params, ctx);
}


