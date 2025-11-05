import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { palette } from '../../theme/palette.js';

// Gate-driven arcs rotating around canvas center; fade after ~3 rounds
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const color = new THREE.Color(params.color || palette.skyBlue);
  const alpha = 0.9;
  const W = ctx.width || 1; const H = ctx.height || 1;
  const cx = W * 0.5; const cy = H * 0.5;

  const arcs = []; // { mesh, radius, ang, speed, rounds, fade, t }

  function spawnArc() {
    const r = Math.min(W, H) * (0.15 + Math.random() * 0.35);
    const thickness = Math.max(3, r * 0.08);
    const thetaLen = Math.PI * (0.25 + Math.random() * 0.35); // 45°.. ~108° segment
    const geo = new THREE.RingGeometry(Math.max(1, r - thickness), r, 128, 1, 0, thetaLen);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: alpha, side: THREE.DoubleSide });
    mat.depthWrite = false; mat.depthTest = false;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, cy, 0);
    mesh.renderOrder = 80;
    group.add(mesh);
    const speed = 1.0 + Math.random() * 1.5; // rounds per second
    arcs.push({ mesh, radius: r, ang: Math.random() * Math.PI * 2, speed, rounds: 0, fade: false, t: 0 });
  }

  function onGateHit(e) {
    const { soundId } = e.detail || {};
    if (soundId === 'glass_stirring') spawnArc();
  }
  gateBus.addEventListener('gate:hit', onGateHit);

  let alive = true;
  return {
    id: `glassArc_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1/60);
      for (let i = arcs.length - 1; i >= 0; i--) {
        const a = arcs[i];
        if (!a.fade) {
          const dAng = (Math.PI * 2) * a.speed * dtSec;
          a.ang += dAng;
          a.rounds += (dAng / (Math.PI * 2));
          a.mesh.rotation.z = a.ang;
          if (a.rounds >= 3.0) { a.fade = true; a.t = 0; }
        } else {
          a.t += dtSec; const k = Math.max(0, 1 - a.t / 0.8);
          if (a.mesh.material) a.mesh.material.opacity = alpha * k;
          if (a.t >= 0.8) { try { a.mesh.removeFromParent(); } catch (_) {} arcs.splice(i, 1); }
        }
      }
    },
    setPosition() {}, getPosition() { return { x: cx, y: cy }; },
    destroy() { alive = false; gateBus.removeEventListener('gate:hit', onGateHit); group.removeFromParent(); },
    get alive() { return alive; }
  };
}


