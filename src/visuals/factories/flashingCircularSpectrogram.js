import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const color = new THREE.Color(params.colorA || 0xff6b6b);
  const ringGeo = new THREE.RingGeometry(18, 26, 64);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
  const mesh = new THREE.Mesh(ringGeo, mat);
  let t = 0;
  let x = 0, y = 0;
  return {
    id: `alarm_${Math.random().toString(36).slice(2)}`,
    object3D: mesh,
    update(_audio, dt) {
      t += dt || 0;
      // Flash ~4 Hz
      const s = 0.5 + 0.5 * (Math.sin(t * Math.PI * 8) * 0.5 + 0.5);
      mesh.material.opacity = 0.4 + 0.6 * s;
      // Simple orbit around center
      if (ctx.width && ctx.height) {
        const cx = ctx.width * 0.5;
        const cy = ctx.height * 0.5;
        const r = (params.orbitRadius || Math.min(ctx.width, ctx.height) * 0.25);
        const ang = t * (params.speed || 0.3);
        x = cx + r * Math.cos(ang);
        y = cy + r * Math.sin(ang);
        mesh.position.set(x, y, 0);
      }
    },
    setPosition(nx, ny) { x = nx; y = ny; mesh.position.set(x, y, 0); },
    getPosition() { return { x, y }; },
    destroy() { mesh.removeFromParent(); }
  };
}


