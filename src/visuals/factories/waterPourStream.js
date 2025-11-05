import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { palette } from '../../theme/palette.js';

// Water stream spawned at pointer; clears juice droplets on create
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const waterColor = new THREE.Color(params.color || palette.seaBlue);
  const alpha = 0.85;

  const W = ctx.width || 1; const H = ctx.height || 1;
  const waterGroup = new THREE.Group();
  waterGroup.position.z = 0.1; // above ground visuals
  group.add(waterGroup);

  // Immediately signal to clear orange juice droplets
  try { gateBus.dispatchEvent(new CustomEvent('juice:clear')); } catch (_) {}

  // Origin will be set by setPosition(nx, ny)
  let originX = W * 0.5;
  let originY = H * 0.8;
  // Follow mouse position on the canvas
  let sceneCanvas = null; let mouseMoveHandler = null; let canvasRect = null;
  function attachMouseFollow() {
    try { sceneCanvas = document.getElementById('scene'); } catch (_) { sceneCanvas = null; }
    if (!sceneCanvas) return;
    const updateFromEvent = (e) => {
      try { canvasRect = sceneCanvas.getBoundingClientRect(); } catch (_) { canvasRect = null; }
      if (!canvasRect || canvasRect.width <= 0 || canvasRect.height <= 0) return;
      const nx = (e.clientX - canvasRect.left) / canvasRect.width;
      const ny = (e.clientY - canvasRect.top) / canvasRect.height;
      originX = Math.max(0, Math.min(W, nx * W));
      originY = Math.max(0, Math.min(H, (1 - ny) * H));
    };
    mouseMoveHandler = updateFromEvent;
    window.addEventListener('mousemove', mouseMoveHandler);
  }
  attachMouseFollow();

  // Continuous emitter for ~2 seconds
  const drops = []; // { m, x, y, r, speed }
  let emitterT = 0;
  const emissionRate = 140; // wider, denser stream
  let emissionAcc = 0;
  function emitOne() {
    const r = 4 + Math.random() * 4; // larger droplets
    const geo = new THREE.CircleGeometry(r, 16);
    const mat = new THREE.MeshBasicMaterial({ color: waterColor, transparent: true, opacity: alpha });
    mat.depthWrite = false; mat.depthTest = false;
    const m = new THREE.Mesh(geo, mat);
    const xJ = (Math.random() - 0.5) * 28; // wider stream width
    m.position.set(originX + xJ, originY, 0);
    m.renderOrder = 120;
    waterGroup.add(m);
    const speed = 780 + Math.random() * 380;
    drops.push({ m, x: originX + xJ, y: originY, r, speed });
  }
  // Gate-activity tracking for continuous emission
  let lastLevelAt = 0; const activeSilenceMs = 500;
  function onGateLevel(e) {
    const { soundId, t } = (e && e.detail) || {};
    if (soundId !== 'water_pour') return;
    lastLevelAt = (typeof t === 'number') ? t : (performance.now ? performance.now() : Date.now());
  }
  function isActive() {
    const now = (performance.now ? performance.now() : Date.now());
    return (now - (lastLevelAt || now)) <= activeSilenceMs;
  }
  gateBus.addEventListener('gate:level', onGateLevel);
  function cleanup() {
    try { gateBus.removeEventListener('gate:level', onGateLevel); } catch (_) {}
    try { if (mouseMoveHandler) window.removeEventListener('mousemove', mouseMoveHandler); } catch (_) {}
  }

  let alive = true;
  return {
    id: `waterPour_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1/60);
      // Emit continuously while active (gate-driven)
      emitterT += dtSec;
      if (isActive()) {
        emissionAcc += emissionRate * dtSec;
        const n = Math.floor(emissionAcc);
        if (n > 0) { emissionAcc -= n; for (let i = 0; i < n; i++) emitOne(); }
      }
      // Update drops
      for (let i = drops.length - 1; i >= 0; i--) {
        const p = drops[i];
        p.y += -p.speed * dtSec;
        if (p.m.material) p.m.material.opacity = alpha;
        if (p.y <= 0) {
          // remove when below canvas bottom
          try { p.m.removeFromParent(); } catch (_) {}
          drops.splice(i, 1);
          continue;
        }
        p.m.position.set(p.x + (Math.random() - 0.5) * 1.2, p.y, 0);
      }
      // Destroy after inactivity and all drops gone
      if (!isActive() && drops.length === 0) {
        try { group.removeFromParent(); } catch (_) {}
      }
    },
    setPosition(nx, ny) { originX = nx; originY = ny; },
    getPosition() { return { x: originX, y: originY }; },
    destroy() { alive = false; cleanup(); group.removeFromParent(); },
    get alive() { return alive; }
  };
}


