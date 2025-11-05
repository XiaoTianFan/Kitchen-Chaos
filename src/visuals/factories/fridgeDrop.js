import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { pickFridgeColors } from '../../theme/palette.js';
import { fridgePool } from '../state/fridgePool.js';

export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const colors = pickFridgeColors();
  const opacity = 0.8;

  const bodies = []; // { id, mesh, x,y, z, vx,vy, size, atRest, parallax, fadeOut }
  const gravity = params.gravity ?? 900; // px/s^2, y-up coordinate
  const restitution = params.restitution ?? 0.35;
  const bottomY = 0;

  function createTriangle(size, mat) {
    const s = size;
    const h = s * Math.sqrt(3) / 2;
    const shape = new THREE.Shape();
    shape.moveTo(0, h / 2);
    shape.lineTo(-s / 2, -h / 2);
    shape.lineTo(s / 2, -h / 2);
    shape.closePath();
    return new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
  }

  function createRing(size, mat) {
    const outer = size * 0.6;
    const inner = Math.max(1, outer * 0.55);
    return new THREE.Mesh(new THREE.RingGeometry(inner, outer, 32), mat);
  }

  function createRectangle(size, mat) {
    const ax = 0.7 + Math.random() * 1.0; // width factor
    const ay = 0.7 + Math.random() * 1.0; // height factor
    return new THREE.Mesh(new THREE.PlaneGeometry(size * ax, size * ay), mat);
  }

  function createCircle(size, mat) {
    return new THREE.Mesh(new THREE.CircleGeometry(size * 0.5, 24), mat);
  }

  function createMeshByType(type, size, mat) {
    switch (type) {
      case 'triangle': return createTriangle(size, mat);
      case 'ring': return createRing(size, mat);
      case 'rectangle': return createRectangle(size, mat);
      case 'circle': default: return createCircle(size, mat);
    }
  }

  function spawnBurst() {
    const count = 3 + Math.floor(Math.random() * 6); // 3-8
    for (let i = 0; i < count; i++) {
      const types = ['triangle', 'ring', 'rectangle', 'circle'];
      const type = types[Math.floor(Math.random() * types.length)];
      const size = 48 + Math.random() * 56; // larger overall sizes
      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
      const mesh = createMeshByType(type, size, mat);
      const x = Math.random() * (ctx.width || 1);
      const y = (ctx.height || 1) + size * 0.6; // just above top
      const z = (Math.random() - 0.5) * 1.0; // parallax depth layer
      const parallax = 0.7 + Math.random() * 0.8; // 0.7..1.5 (lower = farther, slower)
      const vx = ((Math.random() - 0.5) * 60) * parallax; // drift scaled by depth
      const vy = (-50 - Math.random() * 120) * parallax; // initial downward velocity
      mesh.position.set(x, y, z);
      group.add(mesh);
      const id = `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
      bodies.push({ id, mesh, x, y, z, vx, vy, size, atRest: false, parallax, fadeOut: false });
    }
  }

  function onGateHit(e) {
    const { soundId } = e.detail || {};
    if (soundId === 'fridge') spawnBurst();
  }

  gateBus.addEventListener('gate:hit', onGateHit);

  let alive = true;
  let px = 0, py = 0; // unused but maintain API parity

  return {
    id: `fridgeDrop_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1 / 60);
      for (const b of bodies) {
        if (b.atRest) continue;
        // Integrate simple physics (y is up, bottom at 0)
        b.vy += -(gravity * b.parallax) * dtSec;
        b.x += (b.vx) * dtSec;
        b.y += (b.vy) * dtSec;

        // Bounce at bottom
        const minY = bottomY + b.size * 0.5;
        if (b.y <= minY) {
          b.y = minY;
          b.vy = -b.vy * restitution;
          // Friction
          b.vx *= 0.9;
          // Sleep when energy is low
          if (Math.abs(b.vy) < 10 && Math.abs(b.vx) < 5) {
            b.vy = 0; b.vx = 0; b.atRest = true;
            // When coming to rest, register in shared pool
            try {
              fridgePool.add(b.id, {
                getX: () => b.x,
                requestFadeOut: () => { b.fadeOut = true; },
              });
            } catch (_) {}
          }
        }
        b.mesh.position.set(b.x, b.y, b.z);
      }
      // Handle fade-outs and prune removed bodies
      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i];
        if (b.fadeOut) {
          const m = b.mesh.material;
          if (m && typeof m.opacity === 'number') {
            m.opacity = Math.max(0, m.opacity - 1.5 * dtSec);
          }
          if (!m || m.opacity <= 0.01) {
            try { fridgePool.remove(b.id); } catch (_) {}
            try { b.mesh.removeFromParent(); } catch (_) {}
            bodies.splice(i, 1);
          }
        }
      }
    },
    setPosition(nx, ny) { px = nx; py = ny; },
    getPosition() { return { x: px, y: py }; },
    destroy() {
      alive = false;
      gateBus.removeEventListener('gate:hit', onGateHit);
      group.removeFromParent();
    },
    get alive() { return alive; }
  };
}


