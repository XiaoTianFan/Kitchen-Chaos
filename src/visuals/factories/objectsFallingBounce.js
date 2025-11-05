import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { pickFridgeColors, palette } from '../../theme/palette.js';

// Similar to fridgeDrop but more bouncy and keeps bouncing around
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const colors = pickFridgeColors();
  const opacity = 0.9;
  const W = ctx.width || 1; const H = ctx.height || 1;

  const bodies = []; // { mesh, x,y, vx,vy, size, rot, vr }
  const gravity = params.gravity ?? 900;
  const restitution = params.restitution ?? 0.92; // even bouncier
  const wallRestitution = params.wallRestitution ?? 0.98;
  const airDrag = params.airDrag ?? 0.999; // very low drag to sustain motion
  const minBounceVy = params.minBounceVy ?? 160; // px/s: enforce minimum bounce energy

  function createShape(size, mat) {
    const t = Math.random();
    if (t < 0.25) return new THREE.Mesh(new THREE.CircleGeometry(size * 0.45, 24), mat);
    if (t < 0.5) {
      const ax = 0.5 + Math.random() * 1.2;
      const ay = 0.5 + Math.random() * 1.2;
      return new THREE.Mesh(new THREE.PlaneGeometry(size * ax, size * ay), mat);
    }
    if (t < 0.75) {
      const outer = size * 0.55; const inner = Math.max(1, outer * 0.6);
      return new THREE.Mesh(new THREE.RingGeometry(inner, outer, 24), mat);
    }
    // triangle
    const s = size; const h = s * Math.sqrt(3) / 2; const shape = new THREE.Shape();
    shape.moveTo(0, h / 2); shape.lineTo(-s / 2, -h / 2); shape.lineTo(s / 2, -h / 2); shape.closePath();
    return new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
  }

  function spawnBounceBurst() {
    const count = 6 + Math.floor(Math.random() * 8); // 6-13
    for (let i = 0; i < count; i++) {
      const minDim = Math.min(W, H);
      const size = minDim * (0.045 + Math.random() * 0.06);
      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
      const mesh = createShape(size, mat);
      const x = Math.random() * W;
      const y = H + size * 0.6;
      const vx = (Math.random() - 0.5) * 280;
      const vy = -200 - Math.random() * 220;
      mesh.position.set(x, y, 0);
      try { mesh.rotation.z = Math.random() * Math.PI * 2; } catch (_) {}
      group.add(mesh);
      const vr = (Math.random() - 0.5) * 4.0; // rotation speed
      bodies.push({ mesh, x, y, vx, vy, size, rot: mesh.rotation.z || 0, vr });
    }
  }

  function onHit(e) {
    const { soundId } = e.detail || {};
    if (soundId === 'objects_falling') spawnBounceBurst();
  }
  gateBus.addEventListener('gate:hit', onHit);

  let alive = true; let px = 0; let py = 0;
  return {
    id: `objectsFallingBounce_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1/60);
      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i];
        // integrate motion
        b.vy += -gravity * dtSec;
        b.vx *= airDrag; b.vy *= airDrag;
        b.x += b.vx * dtSec;
        b.y += b.vy * dtSec;
        // floor bounce
        const minY = b.size * 0.5;
        if (b.y <= minY) {
          b.y = minY;
          b.vy = -b.vy * restitution;
          // enforce minimum upward speed to keep bouncing
          if (b.vy < minBounceVy) b.vy = minBounceVy;
          b.vx *= 0.995; // very slight ground friction
        }
        // walls
        const minX = b.size * 0.5; const maxX = W - b.size * 0.5;
        if (b.x <= minX) { b.x = minX; b.vx = -b.vx * wallRestitution; }
        if (b.x >= maxX) { b.x = maxX; b.vx = -b.vx * wallRestitution; }
        // ceiling
        const maxY = H - b.size * 0.5;
        if (b.y >= maxY) { b.y = maxY; b.vy = -b.vy * wallRestitution; }
        // apply transform
        b.rot += b.vr * dtSec;
        b.mesh.position.set(b.x, b.y, 0);
        try { b.mesh.rotation.z = b.rot; } catch (_) {}
        // no lifetime removal: keep bouncing
      }
    },
    setPosition(x, y) { px = x; py = y; },
    getPosition() { return { x: px, y: py }; },
    destroy() { alive = false; try { gateBus.removeEventListener('gate:hit', onHit); } catch (_) {} group.removeFromParent(); },
    get alive() { return alive; }
  };
}



