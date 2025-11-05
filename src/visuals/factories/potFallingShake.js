import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';

// Emits a screen shake on gate hits for pot_falling; renders nothing visible
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  group.renderOrder = 0;

  function onHit(e) {
    const { soundId } = e.detail || {};
    if (soundId !== 'pot_falling') return;
    try {
      gateBus.dispatchEvent(new CustomEvent('fx:shake', {
        detail: {
          durationMs: params.durationMs ?? 550,
          intensity: params.intensity ?? Math.max(8, Math.min(28, Math.min(ctx.width || 1, ctx.height || 1) * 0.012))
        }
      }));
    } catch (_) {}
  }
  gateBus.addEventListener('gate:hit', onHit);

  let alive = true; let px = 0; let py = 0; let triggered = false;
  return {
    id: `potFallingShake_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update() {},
    setPosition(x, y) { 
      px = x; py = y; 
      // Ensure shake is visible even without gate by triggering once on spawn
      if (!triggered) {
        triggered = true;
        try {
          const minDim = Math.min(ctx.width || 1, ctx.height || 1);
          gateBus.dispatchEvent(new CustomEvent('fx:shake', {
            detail: {
              durationMs: params.durationMs ?? 700,
              intensity: params.intensity ?? Math.max(20, Math.min(60, minDim * 0.03))
            }
          }));
        } catch (_) {}
      }
    },
    getPosition() { return { x: px, y: py }; },
    destroy() { alive = false; try { gateBus.removeEventListener('gate:hit', onHit); } catch (_) {} group.removeFromParent(); },
    get alive() { return alive; }
  };
}



