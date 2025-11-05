import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { palette } from '../../theme/palette.js';

// Thick vertical white sine waves moving upwards; fade-in on start
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const color = new THREE.Color(params.color || palette.white);
  const alpha = 0.9;
  const W = ctx.width || 1; const H = ctx.height || 1;

  const num = Math.max(3, params.count || 6);
  const bundles = []; // { lines: Line[], phase, baseAmp, freq, lfoPhase, lfoSpeed }
  let tSec = 0;

  function makeVerticalBundle(xCenter) {
    const lines = [];
    const thicknessLines = 14; // thicker by more adjacent lines
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
    const baseAmp = 18 + Math.random() * 22; // larger base magnitude
    const freq = 1.0 + Math.random() * 0.8; // cycles along height
    const lfoPhase = Math.random() * Math.PI * 2;
    const lfoSpeed = 0.6 + Math.random() * 0.6; // Hz-ish (per second basis below)
    return { lines, phase: Math.random() * Math.PI * 2, baseAmp, freq, lfoPhase, lfoSpeed };
  }

  for (let i = 0; i < num; i++) {
    const x = (W * 0.2) + (i / (num - 1)) * (W * 0.6);
    bundles.push(makeVerticalBundle(x));
  }

  let fadeInT = 0; const fadeInDur = 0.6; let alive = true;
  const verticalSpeed = 40 + Math.random() * 30; // px/s upwards translation
  let verticalOffset = 0; // wraps through H
  return {
    id: `boilSine_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSecLocal = Math.max(0.0001, dt || 1/60);
      tSec += dtSecLocal;
      if (fadeInT < fadeInDur) fadeInT += dtSecLocal;
      const fadeInK = Math.min(1, fadeInT / fadeInDur);
      verticalOffset = (verticalOffset + verticalSpeed * dtSecLocal) % H;
      for (const b of bundles) {
        // Upward movement handled by translating y positions; phase can add gentle undulation
        b.phase += dtSecLocal * 0.6;
        // Magnitude (amplitude) changes over time via LFO
        const amp = b.baseAmp * (0.6 + 0.4 * Math.sin(b.lfoPhase + tSec * (Math.PI * 2) * b.lfoSpeed));
        for (let idx = 0; idx < b.lines.length; idx++) {
          const line = b.lines[idx];
          const pos = line.geometry.getAttribute('position');
          const lateral = (idx - (b.lines.length - 1) / 2) * 2.0; // wider spread for thicker look
          for (let i = 0; i < pos.count; i++) {
            // translate upward with wrap
            const y = ((i / (pos.count - 1)) * H + verticalOffset) % H;
            const x = pos.getX(i);
            const nx = (x) + lateral + amp * Math.sin((b.freq * Math.PI * 2) * (y / H) + b.phase);
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


