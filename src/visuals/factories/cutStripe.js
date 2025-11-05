import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { palette } from '../../theme/palette.js';
import { fridgePool } from '../state/fridgePool.js';

export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const stripes = [];

  function spawn(targetX) {
    const w = 7 + Math.random() * 8;
    const h = Math.max(40, (ctx.height || 600) * 0.25);
    const x = targetX != null ? targetX : Math.random() * (ctx.width || 1);
    const yStart = (ctx.height || 1) + h;
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.white), transparent: true, opacity: 0.0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, yStart, 0);
    group.add(mesh);
    stripes.push({ mesh, x, y: yStart, w, h, t: 0, life: 0.9 });
  }

  function onGateHit(e) {
    const { soundId } = e.detail || {};
    if (soundId !== 'cutting_things') return;
    const pick = fridgePool.pickRandom();
    if (pick && pick.api && typeof pick.api.getX === 'function') {
      const x = pick.api.getX();
      spawn(x);
      stripes[stripes.length - 1].target = pick;
    } else {
      spawn(null);
    }
  }
  gateBus.addEventListener('gate:hit', onGateHit);

  let alive = true; let px = 0, py = 0;
  return {
    id: `cutStripe_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1/60);
      for (let i = stripes.length - 1; i >= 0; i--) {
        const s = stripes[i];
        s.t += dtSec;
        const fallSpeed = (ctx.height || 600) * 3.2; // faster than chopping
        s.y -= fallSpeed * dtSec;
        const k = s.t / s.life;
        const a = Math.max(0, Math.min(1, k < 0.12 ? k / 0.12 : (k > 0.88 ? (1 - (k - 0.88) / 0.12) : 1)));
        s.mesh.material.opacity = 0.9 * a;
        s.mesh.position.set(s.x, s.y, 0);
        const minY = 0 + s.h * 0.5;
        if (s.y <= minY) {
          if (s.target && s.target.api && typeof s.target.api.requestFadeOut === 'function') {
            try { s.target.api.requestFadeOut(); } catch (_) {}
          }
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


