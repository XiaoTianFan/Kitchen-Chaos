import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();
  const color = new THREE.Color(params.colorA || 0xffc9a9);
  const radius = params.size || 40;
  const ringGeo = new THREE.RingGeometry(radius * 0.8, radius, 48);
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  group.add(ring);

  let x = 0, y = 0;
  let alive = true;
  let shimmerT = 0;

  return {
    id: `heatRing_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    setParams(newParams) {
      if (!newParams) return;
      if (newParams.colorA) ring.material.color.set(newParams.colorA);
    },
    update(audioData, dt) {
      shimmerT += dt || 0;
      const s = 1 + 0.03 * Math.sin(shimmerT * 6.28);
      ring.scale.set(s, s, 1);
      group.position.set(x, y, 0);
    },
    setPosition(nx, ny) { x = nx; y = ny; },
    getPosition() { return { x, y }; },
    destroy() { alive = false; group.removeFromParent(); },
    get alive() { return alive; }
  };
}


