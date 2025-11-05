import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { palette } from '../../theme/palette.js';

// Thin horizontal sine waves across canvas, lavender, opposite motion; fade out after sound ends
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const color = new THREE.Color(params.color || palette.lavendar);
  const alpha = 0.9;
  const W = ctx.width || 1; const H = ctx.height || 1;

  const num = Math.max(3, params.count || 5);
  const lines = []; // { line, phase, dir, amp, freq }

  function makeLine(yBase, dir) {
    const points = new Array(128).fill(0).map((_, i) => new THREE.Vector3((i / 127) * W, yBase, 0));
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.0 });
    mat.depthWrite = false; mat.depthTest = false;
    const line = new THREE.Line(geo, mat);
    line.renderOrder = 70;
    group.add(line);
    const amp = 12 + Math.random() * 1.2; // thin, reduced variability
    const freq = 2 + Math.random() * 1.2; // cycles across width
    return { line, phase: Math.random() * Math.PI * 2, dir: dir, amp, freq };
  }

  for (let i = 0; i < num; i++) {
    const y = (H * 0.2) + (i / (num - 1)) * (H * 0.6);
    const dir = (i % 2 === 0) ? 1 : -1;
    lines.push(makeLine(y, dir));
  }

  // Fade control via gate levels
  let lastLevelAt = 0; const endSilenceMs = 900; let fading = false; let fadeT = 0; const fadeDur = 0.8; let fadeInT = 0; const fadeInDur = 0.3;
  function onLevel(e) {
    const { soundId, t } = e.detail || {};
    if (soundId !== 'microwave') return;
    lastLevelAt = (typeof t === 'number') ? t : (performance.now ? performance.now() : Date.now());
    fading = false;
  }
  gateBus.addEventListener('gate:level', onLevel);

  let alive = true;
  return {
    id: `microWaves_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1/60);
      const now = (performance.now ? performance.now() : Date.now());
      if (!fading && (now - (lastLevelAt || now)) >= endSilenceMs) { fading = true; fadeT = 0; }
      if (!fading && fadeInT < fadeInDur) fadeInT += dtSec;
      const fadeInK = Math.min(1, fadeInT / fadeInDur);
      const fadeK = fading ? (1 - Math.min(1, (fadeT += dtSec) / fadeDur)) : 1;

      for (const w of lines) {
        w.phase += dtSec * w.dir * 2.0; // opposite motion
        const pos = w.line.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) {
          const x = (i / (pos.count - 1)) * W;
          const y0 = pos.getY(i); // base at creation
          const y = (y0) + w.amp * Math.sin((w.freq * Math.PI * 2) * (x / W) + w.phase);
          pos.setX(i, x);
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
        if (w.line.material) w.line.material.opacity = alpha * fadeK * fadeInK;
      }
      if (fading && fadeK <= 0.01) { try { group.removeFromParent(); } catch (_) {} }
    },
    setPosition() {}, getPosition() { return { x: 0, y: 0 }; },
    destroy() { alive = false; gateBus.removeEventListener('gate:level', onLevel); group.removeFromParent(); },
    get alive() { return alive; }
  };
}


