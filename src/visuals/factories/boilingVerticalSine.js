import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { palette } from '../../theme/palette.js';

// Fixed-parameter vertical sine waves (parallel, stationary). Upward motion via phase progression only.
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const color = new THREE.Color(params.color || palette.white);
  const alpha = 0.9;
  const W = ctx.width || 1; const H = ctx.height || 1;

  // Fixed parameters shared by all waves
  const num = Math.max(3, params.count || 6);
  const cycles = (typeof params.cycles === 'number') ? params.cycles : 2.0; // cycles along full height
  const amplitude = (typeof params.amplitude === 'number') ? params.amplitude : Math.min(W, H) * 0.035; // constant px
  const thicknessLines = Math.max(8, params.thicknessLines || 14); // fixed thickness via stacked lines
  const phaseSpeed = (typeof params.phaseSpeed === 'number') ? params.phaseSpeed : -1.2; // radians/sec

  const bundles = []; // { lines: Line[], phase, xCenter }

  function makeVerticalBundle(xCenter) {
    const lines = [];
    for (let j = 0; j < thicknessLines; j++) {
      const geo = new THREE.BufferGeometry();
      const points = new Array(128).fill(0).map((_, i) => new THREE.Vector3(xCenter, (i / 127) * H, 0));
      geo.setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.0 });
      mat.depthWrite = false; mat.depthTest = false;
      const line = new THREE.Line(geo, mat);
      line.renderOrder = 65;
      group.add(line);
      lines.push(line);
    }
    return { lines, phase: 0, xCenter };
  }

  for (let i = 0; i < num; i++) {
    const x = (W * 0.2) + (i / (num - 1)) * (W * 0.6);
    bundles.push(makeVerticalBundle(x));
  }

  let fadeInT = 0; const fadeInDur = 0.4; let alive = true;
  return {
    id: `boilSine_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1/60);
      if (fadeInT < fadeInDur) fadeInT += dtSec;
      const fadeInK = Math.min(1, fadeInT / fadeInDur);

      for (const b of bundles) {
        b.phase += phaseSpeed * dtSec; // upward motion purely by phase progression
        for (let idx = 0; idx < b.lines.length; idx++) {
          const line = b.lines[idx];
          const pos = line.geometry.getAttribute('position');
          const lateral = (idx - (b.lines.length - 1) / 2) * 2.0; // fixed thickness spread
          for (let i = 0; i < pos.count; i++) {
            const y = (i / (pos.count - 1)) * H;
            // Fixed-parameter sine with shared amplitude/frequency; waves stay parallel
            const nx = b.xCenter + lateral + amplitude * Math.sin((cycles * Math.PI * 2) * (y / H) + b.phase);
            pos.setX(i, nx);
            pos.setY(i, y);
          }
          pos.needsUpdate = true;
          if (line.material) line.material.opacity = alpha * fadeInK;
        }
      }
    },
    setPosition() {}, getPosition() { return { x: 0, y: 0 }; },
    destroy() { alive = false; group.removeFromParent(); },
    get alive() { return alive; }
  };
}


