import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { palette } from '../../theme/palette.js';

// Red frame around the canvas; blinks on gate hits while sustained
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const color = new THREE.Color(palette.red);
  const W = ctx.width || 1; const H = ctx.height || 1;

  function makeStrip(x, y, w, h) {
    const geo = new THREE.PlaneGeometry(Math.max(1, w), Math.max(1, h));
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.0 });
    mat.depthWrite = false; mat.depthTest = false;
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, 0);
    m.renderOrder = 120;
    group.add(m);
    return m;
  }

  const thickness = Math.max(3, Math.floor(Math.min(W, H) * 0.01));
  const strips = [
    makeStrip(W * 0.5, H - thickness * 0.5, W, thickness), // top
    makeStrip(W * 0.5, thickness * 0.5, W, thickness),     // bottom
    makeStrip(thickness * 0.5, H * 0.5, thickness, H),     // left
    makeStrip(W - thickness * 0.5, H * 0.5, thickness, H)  // right
  ];

  // Fade lifecycle and blink
  let lastLevelAt = 0; const endSilenceMs = 600; let fading = false; let fadeT = 0; const fadeDur = 0.6; let fadeInT = 0; const fadeInDur = 0.2;
  let blinkT = 0; const blinkDur = 0.18; // seconds

  function onLevel(e) {
    const { soundId, t } = e.detail || {};
    if (soundId !== 'fire_alarm') return;
    lastLevelAt = (typeof t === 'number') ? t : (performance.now ? performance.now() : Date.now());
    fading = false;
  }
  function onHit(e) {
    const { soundId } = e.detail || {};
    if (soundId !== 'fire_alarm') return;
    blinkT = Math.max(blinkT, blinkDur);
  }
  gateBus.addEventListener('gate:level', onLevel);
  gateBus.addEventListener('gate:hit', onHit);

  let alive = true; let px = 0; let py = 0;
  return {
    id: `fireAlarmBlinkFrame_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1/60);
      const now = (performance.now ? performance.now() : Date.now());
      if (!fading && (now - (lastLevelAt || now)) >= endSilenceMs) { fading = true; fadeT = 0; }
      if (!fading && fadeInT < fadeInDur) fadeInT += dtSec;
      const fadeInK = Math.min(1, fadeInT / fadeInDur);
      const fadeK = fading ? (1 - Math.min(1, (fadeT += dtSec) / fadeDur)) : 1;
      blinkT = Math.max(0, blinkT - dtSec);
      const blinkK = blinkT > 0 ? 1.0 : 0.6; // brighter during blink
      const baseAlpha = 0.9 * fadeK * fadeInK * blinkK;
      for (const m of strips) {
        if (m.material) m.material.opacity = baseAlpha;
      }
      if (fading && fadeK <= 0.01) { try { group.removeFromParent(); } catch (_) {} }
    },
    setPosition(x, y) { px = x; py = y; },
    getPosition() { return { x: px, y: py }; },
    destroy() { alive = false; try { gateBus.removeEventListener('gate:level', onLevel); gateBus.removeEventListener('gate:hit', onHit); } catch (_) {} group.removeFromParent(); },
    get alive() { return alive; }
  };
}



