import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { palette } from '../../theme/palette.js';

// Gate-driven white spray droplets, fast arrival, persist until 'spray:clear'
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const white = new THREE.Color(params.colorA || palette.white);
  const opacity = 0.95;

  const startZ = 3.0; // closer than juice
  const zSpeed = 12.0; // faster toward canvas

  const droplets = []; // { group, x,y,z, r, splatted }
  const splats = [];   // { mesh, t, lifespan, fading }

  function createDroplet(x, y) {
    const r = 3 + Math.random() * 4;
    const g = new THREE.Group();
    const geo = new THREE.CircleGeometry(r, 24);
    const mat = new THREE.MeshBasicMaterial({ color: white, transparent: true, opacity });
    const m = new THREE.Mesh(geo, mat);
    g.add(m);
    g.position.set(x, y, startZ);
    group.add(g);
    droplets.push({ group: g, x, y, z: startZ, r, splatted: false });
  }

  function splatAt(x, y, size) {
    const g = new THREE.Group();
    const blobs = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < blobs; i++) {
      const rr = size * (0.5 + Math.random() * 0.7);
      const geo = new THREE.CircleGeometry(rr, 28);
      const mat = new THREE.MeshBasicMaterial({ color: white, transparent: true, opacity: 0.9 });
      const m = new THREE.Mesh(geo, mat);
      const ang = Math.random() * Math.PI * 2;
      const dist = size * (Math.random() * 0.5);
      const ox = Math.cos(ang) * dist;
      const oy = Math.sin(ang) * dist;
      m.position.set(x + ox, y + oy, 0);
      g.add(m);
    }
    group.add(g);
    splats.push({ mesh: g, t: 0, lifespan: 1.4 + Math.random() * 0.6, fading: false });
  }

  function spawnBurst() {
    const W = ctx.width || 1; const H = ctx.height || 1;
    const count = 10 + Math.floor(Math.random() * 14);
    const cx = W * 0.5; const cy = H * 0.5; const sigma = Math.min(W, H) * 0.18;
    for (let i = 0; i < count; i++) {
      const x = Math.max(0, Math.min(W, cx + (Math.random() * 2 - 1) * sigma));
      const y = Math.max(0, Math.min(H, cy + (Math.random() * 2 - 1) * sigma));
      createDroplet(x, y);
    }
  }

  function onGateHit(e) {
    const { soundId } = e.detail || {};
    if (soundId === 'cooking_spray') spawnBurst();
  }
  gateBus.addEventListener('gate:hit', onGateHit);

  function onSprayClear() {
    for (const s of splats) { s.fading = true; s.t = 0; }
  }
  gateBus.addEventListener('spray:clear', onSprayClear);

  let alive = true;
  return {
    id: `whiteSpray_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1/60);
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i]; if (d.splatted) continue;
        d.z = Math.max(0, d.z - zSpeed * dtSec);
        const k = 1 - (d.z / Math.max(0.0001, startZ));
        const scale = 0.6 + 0.6 * k;
        d.group.position.set(d.x, d.y, d.z);
        d.group.scale.set(scale, scale, 1);
        if (d.z <= 0.0001) {
          d.splatted = true;
          splatAt(d.x, d.y, d.r * (1.2 + Math.random() * 0.6));
          try { d.group.removeFromParent(); } catch (_) {}
          droplets.splice(i, 1);
        }
      }
      for (let i = splats.length - 1; i >= 0; i--) {
        const s = splats[i];
        if (!s.fading) continue;
        s.t += dtSec; const k = Math.max(0, 1 - s.t / s.lifespan);
        for (const m of s.mesh.children) {
          if (m.material && typeof m.material.opacity === 'number') m.material.opacity = 0.9 * k;
        }
        if (s.t >= s.lifespan) { try { s.mesh.removeFromParent(); } catch (_) {} splats.splice(i, 1); }
      }
    },
    setPosition() {}, getPosition() { return { x: 0, y: 0 }; },
    destroy() { alive = false; gateBus.removeEventListener('gate:hit', onGateHit); gateBus.removeEventListener('spray:clear', onSprayClear); group.removeFromParent(); },
    get alive() { return alive; }
  };
}


