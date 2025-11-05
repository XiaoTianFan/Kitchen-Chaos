import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { palette } from '../../theme/palette.js';

export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const stripes = []; // { mesh, x, y, w, h, t, life }

  function spawn() {
    const h = 6 + Math.random() * 10;
    const y = Math.random() * (ctx.height || 1);
    const w = Math.max(800, (ctx.width || 1600));
    const geo = new THREE.PlaneGeometry(w * 0.25, h);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.white), transparent: true, opacity: 0.0 });
    const mesh = new THREE.Mesh(geo, mat);
    const startX = -w * 0.2;
    mesh.position.set(startX, y, 0);
    group.add(mesh);
    stripes.push({ mesh, x: startX, y, w, h, t: 0, life: 1.1 });
  }

  function onGateHit(e) {
    const { soundId } = e.detail || {};
    if (soundId === 'knife_sharpen') spawn();
  }
  gateBus.addEventListener('gate:hit', onGateHit);

  let alive = true; let px = 0, py = 0;
  return {
    id: `knifeStripe_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1/60);
      for (let i = stripes.length - 1; i >= 0; i--) {
        const s = stripes[i];
        s.t += dtSec;
        const speed = (ctx.width || 800) * 1.6; // px/sec
        s.x += speed * dtSec;
        const k = s.t / s.life;
        const a = Math.max(0, Math.min(1, k < 0.2 ? k / 0.2 : (k > 0.8 ? (1 - (k - 0.8) / 0.2) : 1)));
        s.mesh.material.opacity = 0.85 * a;
        s.mesh.position.set(s.x, s.y, 0);
        if (s.t >= s.life || s.x > (ctx.width || 800) + s.w) {
          try { s.mesh.removeFromParent(); } catch (_) {}
          stripes.splice(i, 1);
        }
      }
    },
    setPosition(nx, ny) { px = nx; py = ny; },
    getPosition() { return { x: px, y: py }; },
    destroy() { alive = false; gateBus.removeEventListener('gate:hit', onGateHit); group.removeFromParent(); },
    get alive() { return alive; }
  };
}


