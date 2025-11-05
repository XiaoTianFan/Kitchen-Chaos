import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { palette } from '../../theme/palette.js';

// Full-canvas blink on gate hit (for 'lighter')
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const color = new THREE.Color(params.color || palette.white);
  const W = ctx.width || 1;
  const H = ctx.height || 1;

  const geo = new THREE.PlaneGeometry(Math.max(1, W), Math.max(1, H));
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.0 });
  mat.depthWrite = false; mat.depthTest = false;
  const quad = new THREE.Mesh(geo, mat);
  quad.position.set(W * 0.5, H * 0.5, 0);
  quad.renderOrder = 200;
  group.add(quad);

  let blinkT = 0; // seconds
  const up = 0.06; // quick flash up
  const down = 0.35; // fade out
  let doBlink = false;

  function onGateHit(e) {
    const { soundId } = e.detail || {};
    if (soundId === 'lighter') {
      blinkT = 0;
      doBlink = true;
    }
  }
  gateBus.addEventListener('gate:hit', onGateHit);

  let alive = true;
  return {
    id: `blinkOverlay_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1 / 60);
      if (doBlink) {
        blinkT += dtSec;
        if (blinkT <= up) {
          const k = Math.min(1, blinkT / up);
          mat.opacity = 0.0 + 1.0 * k;
        } else if (blinkT <= up + down) {
          const k = Math.min(1, (blinkT - up) / down);
          mat.opacity = 1.0 * (1 - k);
        } else {
          mat.opacity = 0.0;
          doBlink = false;
        }
      }
    },
    setPosition() {},
    getPosition() { return { x: 0, y: 0 }; },
    destroy() { alive = false; gateBus.removeEventListener('gate:hit', onGateHit); group.removeFromParent(); },
    get alive() { return alive; }
  };
}


