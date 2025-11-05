import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { palette } from '../../theme/palette.js';

// On gate hits, spawn large skyBlue rings that persist until a clear signal
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const color = new THREE.Color(params.color || palette.skyBlue);
  const alpha = 0.8;
  const W = ctx.width || 1; const H = ctx.height || 1;

  const rings = []; // { mesh }

  function spawnRing() {
    const rOuter = Math.min(W, H) * (0.12 + Math.random() * 0.20);
    const rInner = Math.max(2, rOuter * 0.75);
    const geo = new THREE.RingGeometry(rInner, rOuter, 128);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: alpha, side: THREE.DoubleSide });
    mat.depthWrite = false; mat.depthTest = false;
    const m = new THREE.Mesh(geo, mat);
    const x = Math.random() * W; const y = Math.random() * H;
    m.position.set(x, y, 0);
    m.renderOrder = 90;
    group.add(m);
    rings.push({ mesh: m });
  }

  function onHit(e) {
    const { soundId } = e.detail || {};
    if (soundId === 'glass_clink') spawnRing();
  }
  gateBus.addEventListener('gate:hit', onHit);

  function onClear() {
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      try { r.mesh.removeFromParent(); } catch (_) {}
      rings.splice(i, 1);
    }
  }
  gateBus.addEventListener('clink:clear', onClear);

  let alive = true;
  return {
    id: `glassClinkRings_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update() {},
    setPosition() {}, getPosition() { return { x: 0, y: 0 }; },
    destroy() { alive = false; gateBus.removeEventListener('gate:hit', onHit); gateBus.removeEventListener('clink:clear', onClear); group.removeFromParent(); },
    get alive() { return alive; }
  };
}


