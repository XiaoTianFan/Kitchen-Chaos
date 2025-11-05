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
import { create as createTapWaterSpectrogram } from './factories/tapWaterSpectrogram.js';
import { create as createVortexSpiral } from './factories/vortexSpiral.js';
import { create as createSprayCone } from './factories/sprayCone.js';
import { create as createSparkLine } from './factories/sparkLine.js';
import { create as createJuiceDroplets } from './factories/juiceDroplets.js';
import { create as createMicrowaveGrid } from './factories/microwaveGrid.js';
import { create as createFridgeDrop } from './factories/fridgeDrop.js';
import { create as createKnifeStripe } from './factories/knifeStripe.js';
import { create as createChopStripe } from './factories/chopStripe.js';
import { create as createCutStripe } from './factories/cutStripe.js';
import { create as createBagRustleSides } from './factories/bagRustleSides.js';
import { create as createBlinkOverlay } from './factories/blinkOverlay.js';
import { create as createRedSpectrogram } from './factories/redSpectrogram.js';
import { create as createRedFilterOverlay } from './factories/redFilterOverlay.js';
import { create as createWaterPourStream } from './factories/waterPourStream.js';
import { create as createGlassArcSpinner } from './factories/glassArcSpinner.js';
import { create as createWhiteSprayDroplets } from './factories/whiteSprayDroplets.js';
import { create as createMicrowaveSineWaves } from './factories/microwaveSineWaves.js';
import { create as createGlassClinkRings } from './factories/glassClinkRings.js';
import { create as createBoilingVerticalSine } from './factories/boilingVerticalSine.js';

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
  ,tapWaterSpectrogram: createTapWaterSpectrogram
  ,vortexSpiral: createVortexSpiral
  ,sprayCone: createSprayCone
  ,sparkLine: createSparkLine
  ,juiceDroplets: createJuiceDroplets
  ,microwaveGrid: createMicrowaveGrid
  ,fridgeDrop: createFridgeDrop
  ,knifeStripe: createKnifeStripe
  ,chopStripe: createChopStripe
  ,cutStripe: createCutStripe
  ,bagRustleSides: createBagRustleSides
  ,blinkOverlay: createBlinkOverlay
  ,redSpectrogram: createRedSpectrogram
  ,redFilterOverlay: createRedFilterOverlay
  ,waterPourStream: createWaterPourStream
  ,glassArcSpinner: createGlassArcSpinner
  ,whiteSprayDroplets: createWhiteSprayDroplets
  ,microwaveSineWaves: createMicrowaveSineWaves
  ,glassClinkRings: createGlassClinkRings
  ,boilingVerticalSine: createBoilingVerticalSine
};

export function createFactory(name, params, ctx) {
  const fn = registry[name];
  if (!fn) throw new Error(`Unknown visual factory '${name}'`);
  return fn(params, ctx);
}


