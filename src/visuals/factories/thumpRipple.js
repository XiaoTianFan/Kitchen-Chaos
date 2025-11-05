import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { palette } from '../../theme/palette.js';

// Spawn a foreground ring at pointer; expands and fades out
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const color = new THREE.Color(palette.foreground);
  const alphaStart = 0.8;

  let ring = null; let ttl = 0; let spawned = false; let px = 0; let py = 0;

  function spawnAt(x, y) {
    const rOuter = Math.max(6, Math.min(ctx.width || 1, ctx.height || 1) * 0.04);
    const rInner = Math.max(2, rOuter * 0.7);
    const geo = new THREE.RingGeometry(rInner, rOuter, 96);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: alphaStart, side: THREE.DoubleSide });
    mat.depthWrite = false; mat.depthTest = false;
    ring = new THREE.Mesh(geo, mat);
    ring.position.set(x, y, 0);
    ring.renderOrder = 95;
    group.add(ring);
    ttl = 2.0; // longer lifetime in seconds
  }

  let alive = true;
  return {
    id: `thumpRipple_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1/60);
      if (ring) {
        ttl -= dtSec;
        // expand wider over the longer lifetime
        const maxT = 2.0;
        const k = Math.max(0, Math.min(1, 1 - (ttl / maxT)));
        const s = 1 + k * 7.0; // grow ~8x
        try { ring.scale.set(s, s, 1); } catch (_) {}
        // fade proportionally to the longer life
        const m = ring.material; if (m) m.opacity = Math.max(0, (ttl / maxT) * alphaStart);
        if (ttl <= 0) { try { ring.removeFromParent(); } catch (_) {} ring = null; }
      }
      // self-remove when finished
      if (!ring) { try { group.removeFromParent(); } catch (_) {} }
    },
    setPosition(x, y) {
      px = x; py = y;
      if (!spawned) { spawned = true; spawnAt(px, py); }
    },
    getPosition() { return { x: px, y: py }; },
    destroy() { alive = false; group.removeFromParent(); },
    get alive() { return alive; }
  };
}



