import { create as createTapWaterSpectrogram } from './factories/tapWaterSpectrogram.js';
import { create as createJuiceDroplets } from './factories/juiceDroplets.js';
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
import { create as createClatterFissure } from './factories/clatterFissure.js';
import { create as createPotFallingShake } from './factories/potFallingShake.js';
import { create as createObjectsFallingBounce } from './factories/objectsFallingBounce.js';
import { create as createThumpRipple } from './factories/thumpRipple.js';
import { create as createFireAlarmBlinkFrame } from './factories/fireAlarmBlinkFrame.js';

const registry = {
  tapWaterSpectrogram: createTapWaterSpectrogram
  ,juiceDroplets: createJuiceDroplets
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
  ,clatterFissure: createClatterFissure
  ,potFallingShake: createPotFallingShake
  ,objectsFallingBounce: createObjectsFallingBounce
  ,thumpRipple: createThumpRipple
  ,fireAlarmBlinkFrame: createFireAlarmBlinkFrame
};

export function createFactory(name, params, ctx) {
  const fn = registry[name];
  if (!fn) throw new Error(`Unknown visual factory '${name}'`);
  return fn(params, ctx);
}


