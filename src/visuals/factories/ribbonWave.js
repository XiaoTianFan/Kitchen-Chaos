import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function create(params = {}, ctx = {}) {
  const color = new THREE.Color(params.colorA || 0x9ad9ff);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(3 * 128); // 128 points max
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const line = new THREE.Line(geom, material);
  let x = 0, y = 0;
  let alive = true;
  let count = 2;
  positions[0] = 0; positions[1] = 0; positions[2] = 0;
  positions[3] = 0; positions[4] = -10; positions[5] = 0;
  geom.setDrawRange(0, count);

  return {
    id: `ribbonWave_${Math.random().toString(36).slice(2)}`,
    object3D: line,
    setParams(newParams) {
      if (!newParams) return;
      if (newParams.colorA) line.material.color.set(newParams.colorA);
    },
    update(audioData, dt) {
      // let it fall down a bit to imply pour
      for (let i = count - 1; i >= 1; i--) {
        positions[i * 3 + 0] = positions[(i - 1) * 3 + 0];
        positions[i * 3 + 1] = positions[(i - 1) * 3 + 1] - 2;
        positions[i * 3 + 2] = 0;
      }
      positions[0] = x; positions[1] = y; positions[2] = 0;
      geom.attributes.position.needsUpdate = true;
      line.computeLineDistances?.();
    },
    setPosition(nx, ny) {
      x = nx; y = ny;
      if (count < 128) { count++; geom.setDrawRange(0, count); }
    },
    getPosition() { return { x, y }; },
    destroy() { alive = false; line.removeFromParent(); },
    get alive() { return alive; }
  };
}


