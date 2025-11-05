import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { palette } from '../../theme/palette.js';

// Render a fissure made of connected straight line segments in foreground color
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const color = new THREE.Color(palette.foreground);
  const W = ctx.width || 1; const H = ctx.height || 1;

  // Build a crack as a set of thick rectangles per segment
  function spawnFissure() {
    const segs = 18 + Math.floor(Math.random() * 18); 
    const thickness = Math.max(3, Math.floor(Math.min(W, H) * (0.006 + Math.random() * 0.004))); // thicker lines
    const startX = W * (0.15 + Math.random() * 0.70);
    const startY = H * (0.15 + Math.random() * 0.70);
    let x = startX; let y = startY;
    // choose a straight base direction; segments jitter around this without cumulative drift
    let baseAngle = Math.random() * Math.PI * 2;
    const jitter = Math.PI * 0.15; // per-segment max deviation from base
    const subgroup = new THREE.Group();
    subgroup.renderOrder = 85;
    for (let i = 0; i < segs; i++) {
      const segAngle = baseAngle + ((Math.random() - 0.5) * 2 * jitter);
      const segLen = Math.max(32, Math.min(160, (Math.min(W, H) * (0.055 + Math.random() * 0.08))));
      let nx = x + Math.cos(segAngle) * segLen;
      let ny = y + Math.sin(segAngle) * segLen;
      // midpoint and rotation
      const mx = (x + nx) * 0.5;
      const my = (y + ny) * 0.5;
      const geo = new THREE.PlaneGeometry(segLen, thickness);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
      mat.depthWrite = false; mat.depthTest = false;
      const seg = new THREE.Mesh(geo, mat);
      seg.position.set(mx, my, 0);
      try { seg.rotation.z = Math.atan2(ny - y, nx - x); } catch (_) {}
      subgroup.add(seg);
      // advance with edge clamping & bounce
      x = nx; y = ny;
      let bounced = false;
      if (x < 4) { x = 4; baseAngle = Math.PI - baseAngle; bounced = true; }
      if (x > W - 4) { x = W - 4; baseAngle = Math.PI - baseAngle; bounced = true; }
      if (y < 4) { y = 4; baseAngle = -baseAngle; bounced = true; }
      if (y > H - 4) { y = H - 4; baseAngle = -baseAngle; bounced = true; }
      if (bounced) {
        // normalize baseAngle to [-PI, PI] to avoid numeric drift
        if (baseAngle > Math.PI) baseAngle -= Math.PI * 2;
        if (baseAngle < -Math.PI) baseAngle += Math.PI * 2;
      }
    }
    group.add(subgroup);
  }

  // initial fissure
  spawnFissure();

  function onHit(e) {
    const { soundId } = e.detail || {};
    if (soundId !== 'clatter') return;
    spawnFissure();
  }
  gateBus.addEventListener('gate:hit', onHit);

  let alive = true; let px = 0; let py = 0;
  return {
    id: `clatterFissure_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update() {},
    setPosition(x, y) { px = x; py = y; /* not used for this visual */ },
    getPosition() { return { x: px, y: py }; },
    destroy() { alive = false; gateBus.removeEventListener('gate:hit', onHit); group.removeFromParent(); },
    get alive() { return alive; }
  };
}



