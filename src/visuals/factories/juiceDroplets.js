import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { palette } from '../../theme/palette.js';

// Gate-driven juice droplets that fall along the camera's z-axis onto the canvas (z → 0)
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const orange = new THREE.Color(params.colorA || palette.orange);
  const opacity = 0.95;

  // Z-depth motion: start near camera, approach canvas plane at z=0
  const startZ = (typeof params.startZ === 'number') ? params.startZ : 6.0; // within camera near/far
  const zSpeed = (typeof params.zSpeed === 'number') ? params.zSpeed : 6.0;   // z units per second towards 0

  // Entities
  const droplets = []; // { group, x,y,z, r, elongation, splatted }
  const splats = [];   // { mesh, t, lifespan, fading }

  function createCompoundDropletMesh(r) {
    // Base circle + a few satellites (ellipses/circles) to add granularity
    const g = new THREE.Group();
    const baseGeo = new THREE.CircleGeometry(r, 28);
    const baseMat = new THREE.MeshBasicMaterial({ color: orange, transparent: true, opacity });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.scale.set(1, 1.0 + (Math.random() * 0.6), 1);
    g.add(base);
    const satellites = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < satellites; i++) {
      const rr = r * (0.35 + Math.random() * 0.5);
      const geo = new THREE.CircleGeometry(rr, 24);
      const mat = new THREE.MeshBasicMaterial({ color: orange, transparent: true, opacity });
      const m = new THREE.Mesh(geo, mat);
      // Random offset around perimeter to look organic
      const ang = Math.random() * Math.PI * 2;
      const dist = r * (0.6 + Math.random() * 0.9);
      const ox = Math.cos(ang) * dist;
      const oy = Math.sin(ang) * dist;
      // Random ellipse stretch
      const sx = 1 + Math.random() * 0.5;
      const sy = 1 + Math.random() * 1.0;
      m.scale.set(sx, sy, 1);
      m.position.set(ox, oy, 0);
      g.add(m);
    }
    return g;
  }

  function createDroplet(x, y) {
    const r = 5 + Math.random() * 6; // base radius
    const elong = 1.0 + Math.random() * 0.6;
    const g = createCompoundDropletMesh(r);
    g.position.set(x, y, startZ);
    group.add(g);
    droplets.push({ group: g, x, y, z: startZ, r, elongation: elong, splatted: false });
  }

  function splatAt(x, y, size) {
    // Create a blobby ink-like splat at impact point using overlapped circles/ellipses and a few streaks
    const g = new THREE.Group();
    const blobs = 7 + Math.floor(Math.random() * 7);
    for (let i = 0; i < blobs; i++) {
      const rr = size * (0.35 + Math.random() * 0.9);
      const geo = new THREE.CircleGeometry(rr, 28);
      const mat = new THREE.MeshBasicMaterial({ color: orange, transparent: true, opacity: 0.88 });
      const m = new THREE.Mesh(geo, mat);
      const ang = Math.random() * Math.PI * 2;
      const dist = size * (Math.random() * 0.6);
      const ox = Math.cos(ang) * dist;
      const oy = Math.sin(ang) * dist;
      // Non-uniform scale to simulate irregular wet ink patches
      m.scale.set(1 + Math.random() * 0.8, 1 + Math.random() * 0.5, 1);
      m.position.set(x + ox, y + oy, 0);
      g.add(m);
    }
    // Add some radial streaks (elongated ellipses) emanating from impact
    const streaks = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < streaks; i++) {
      const rr = size * (0.25 + Math.random() * 0.35);
      const geo = new THREE.CircleGeometry(rr, 24);
      const mat = new THREE.MeshBasicMaterial({ color: orange, transparent: true, opacity: 0.75 });
      const m = new THREE.Mesh(geo, mat);
      const ang = Math.random() * Math.PI * 2;
      const len = size * (1.2 + Math.random() * 0.9);
      const ox = Math.cos(ang) * rr * 0.4;
      const oy = Math.sin(ang) * rr * 0.4;
      m.position.set(x + ox, y + oy, 0);
      // Stretch strongly along the streak angle
      const sx = 0.8 + Math.random() * 0.6;
      const sy = len / Math.max(4, rr);
      m.scale.set(sx, sy, 1);
      m.rotation.z = ang;
      g.add(m);
    }
    group.add(g);
    // Persist indefinitely; fade controlled by external signal later
    splats.push({ mesh: g, t: 0, lifespan: 1.8 + Math.random() * 0.9, fading: false });
  }

  function randnBoxMuller() {
    // Standard normal via Box-Muller
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function spawnBurst() {
    const W = ctx.width || 1;
    const H = ctx.height || 1;
    const count = 10 + Math.floor(Math.random() * 10);
    // Center-biased sampling using Gaussian around center
    const cx = W * 0.5;
    const cy = H * 0.5;
    const sigma = Math.min(W, H) * 0.22;
    for (let i = 0; i < count; i++) {
      const x = Math.max(0, Math.min(W, cx + randnBoxMuller() * sigma));
      const y = Math.max(0, Math.min(H, cy + randnBoxMuller() * sigma));
      createDroplet(x, y);
    }
  }

  function onGateHit(e) {
    const { soundId } = e.detail || {};
    if (soundId === 'squeeze_juice') spawnBurst();
  }

  gateBus.addEventListener('gate:hit', onGateHit);
  function onJuiceClear() {
    // Begin fading all existing splats
    for (const s of splats) {
      s.fading = true;
      // Reset timer so full fade duration applies
      s.t = 0;
      s.lifespan = 1.8 + Math.random() * 0.9;
    }
  }
  gateBus.addEventListener('juice:clear', onJuiceClear);

  let alive = true;
  let px = 0, py = 0;

  return {
    id: `juiceDroplets_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1 / 60);
      // Integrate droplets along z towards canvas
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        if (d.splatted) continue;
        d.z = Math.max(0, d.z - zSpeed * dtSec);
        // Simulated perspective scale: small when far (startZ), larger near canvas (z≈0)
        const k = 1 - (d.z / Math.max(0.0001, startZ)); // 0→1 as we approach canvas
        const scale = 0.5 + 0.7 * k; // grows ~1.2x by impact
        d.group.position.set(d.x, d.y, d.z);
        d.group.scale.set(scale, scale * (1.0 + 0.25 * k * d.elongation), 1);
        if (d.z <= 0.0001) {
          d.splatted = true;
          // Create a splat at impact point
          splatAt(d.x, d.y, d.r * (1.6 + Math.random() * 0.7));
          try { d.group.removeFromParent(); } catch (_) {}
          droplets.splice(i, 1);
        }
      }
      // Fade splats only when a clear signal has been received
      for (let i = splats.length - 1; i >= 0; i--) {
        const s = splats[i];
        if (!s.fading) continue; // persist until told to fade
        s.t += dtSec;
        const k = Math.max(0, 1 - s.t / s.lifespan);
        for (const m of s.mesh.children) {
          if (m.material && typeof m.material.opacity === 'number') {
            m.material.opacity = Math.max(0, Math.min(1, (0.88 * k)));
          }
        }
        if (s.t >= s.lifespan) {
          try { s.mesh.removeFromParent(); } catch (_) {}
          splats.splice(i, 1);
        }
      }
    },
    setPosition(nx, ny) { px = nx; py = ny; },
    getPosition() { return { x: px, y: py }; },
    destroy() {
      alive = false;
      gateBus.removeEventListener('gate:hit', onGateHit);
      gateBus.removeEventListener('juice:clear', onJuiceClear);
      group.removeFromParent();
    },
    get alive() { return alive; }
  };
}


