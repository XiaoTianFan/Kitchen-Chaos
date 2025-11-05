import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { pickFridgeColors } from '../../theme/palette.js';

// Similar to fridge drop, but spawn from top-left and top-right edges
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const colors = pickFridgeColors();
  const opacity = 0.8;

  const bodies = []; // { mesh, x,y, vx, vy, size, spin }
  const gravity = params.gravity ?? 900; // px/s^2, y-up
  const restitution = params.restitution ?? 0.3;
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
    const outer = size * 0.5;
    const inner = Math.max(1, outer * 0.55);
    return new THREE.Mesh(new THREE.RingGeometry(inner, outer, 32), mat);
  }

  function createRectangle(size, mat) {
    const ax = 0.6 + Math.random() * 1.0;
    const ay = 0.6 + Math.random() * 1.0;
    return new THREE.Mesh(new THREE.PlaneGeometry(size * ax, size * ay), mat);
  }

  function createCircle(size, mat) {
    return new THREE.Mesh(new THREE.CircleGeometry(size * 0.45, 24), mat);
  }

  function createMeshByType(type, size, mat) {
    switch (type) {
      case 'triangle': return createTriangle(size, mat);
      case 'ring': return createRing(size, mat);
      case 'rectangle': return createRectangle(size, mat);
      case 'circle': default: return createCircle(size, mat);
    }
  }

  function spawnSideBursts() {
    const W = ctx.width || 1;
    const H = ctx.height || 1;
    const count = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const leftSide = Math.random() < 0.5;
      const x = leftSide ? -20 - Math.random() * 40 : W + 20 + Math.random() * 40;
      const y = H + 20 + Math.random() * 80; // from top, slightly above
      const minDim = Math.min(W, H);
      const size = minDim * (0.07 + Math.random() * 0.08); // 5% - 11% of min dimension
      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
      const types = ['triangle', 'ring', 'rectangle', 'circle'];
      const type = types[Math.floor(Math.random() * types.length)];
      const mesh = createMeshByType(type, size, mat);
      // Orientation/rotation randomized at spawn
      mesh.rotation.z = Math.random() * Math.PI * 2;
      mesh.position.set(x, y, 0);
      group.add(mesh);
      // Throw into canvas: horizontal toward center with downward velocity
      const toCenter = leftSide ? (Math.random() * (W * 0.6) + W * 0.2) : (Math.random() * (W * 0.6) + W * 0.2);
      const vx = (leftSide ? 1 : -1) * (200 + Math.random() * 240);
      const vy = -120 - Math.random() * 200;
      const spin = (Math.random() - 0.5) * 2.0; // rad/s
      bodies.push({ mesh, x, y, vx, vy, size, spin });
    }
  }

  // Spawn once on creation for the bag rustle event
  spawnSideBursts();

  let alive = true;

  return {
    id: `bagRustle_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1 / 60);
      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i];
        b.vy += -(gravity) * dtSec;
        b.x += b.vx * dtSec;
        b.y += b.vy * dtSec;
        b.mesh.rotation.z += b.spin * dtSec;
        // Bounce at bottom
        const minY = bottomY + b.size * 0.5;
        if (b.y <= minY) {
          b.y = minY;
          b.vy = -b.vy * restitution;
          b.vx *= 0.85;
          if (Math.abs(b.vy) < 10 && Math.abs(b.vx) < 8) {
            b.vy = 0; b.vx = 0; b.spin = 0;
          }
        }
        b.mesh.position.set(b.x, b.y, 0);
      }
    },
    setPosition() {},
    getPosition() { return { x: 0, y: 0 }; },
    destroy() { alive = false; group.removeFromParent(); },
    get alive() { return alive; }
  };
}


