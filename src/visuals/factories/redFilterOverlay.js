import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { palette } from '../../theme/palette.js';

// Full-canvas red filter that fades in to opacity 0.2 and holds
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const color = new THREE.Color(params.color || palette.red);
  const targetOpacity = (typeof params.opacity === 'number') ? params.opacity : 0.1;
  const W = ctx.width || 1; const H = ctx.height || 1;
  const geo = new THREE.PlaneGeometry(Math.max(1, W), Math.max(1, H));
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.0 });
  mat.depthWrite = false; mat.depthTest = false;
  const quad = new THREE.Mesh(geo, mat);
  quad.position.set(W * 0.5, H * 0.5, 0);
  quad.renderOrder = 150;
  group.add(quad);

  let alive = true; let t = 0; const fadeIn = 0.6;
  return {
    id: `redFilter_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1 / 60);
      if (mat.opacity < targetOpacity) {
        t += dtSec; const k = Math.min(1, t / fadeIn);
        mat.opacity = targetOpacity * k;
      }
    },
    setPosition() {}, getPosition() { return { x: 0, y: 0 }; },
    destroy() { alive = false; group.removeFromParent(); },
    get alive() { return alive; }
  };
}


