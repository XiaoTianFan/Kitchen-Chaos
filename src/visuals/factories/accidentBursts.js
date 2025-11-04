import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const color = new THREE.Color(params.colorA || 0xff8bb0);
  const geo = new THREE.CircleGeometry((params.size || 24), 24);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1.0 });
  const mesh = new THREE.Mesh(geo, mat);
  let x = 0, y = 0;
  let alive = true;
  let t = 0;
  const lifespan = params.lifespanMs ? params.lifespanMs / 1000 : 0.8;

  return {
    id: `accident_${Math.random().toString(36).slice(2)}`,
    object3D: mesh,
    setParams(newParams) { /* color/size could be updated if needed */ },
    update(audioData, dt) {
      t += dt || 0;
      const k = Math.min(1, t / lifespan);
      const s = 0.5 + 1.5 * k;
      mesh.scale.set(s, s, 1);
      mesh.material.opacity = 1 - k;
      mesh.position.set(x, y, 0);
      if (t >= lifespan) this.destroy();
    },
    setPosition(nx, ny) { x = nx; y = ny; },
    getPosition() { return { x, y }; },
    destroy() { alive = false; mesh.removeFromParent(); },
    get alive() { return alive; }
  };
}


