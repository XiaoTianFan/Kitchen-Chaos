// Three.js renderer setup with DPR sizing

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf7f7fb);
    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
    this.width = 1;
    this.height = 1;

    // simple placeholder object to indicate render running
    const geo = new THREE.CircleGeometry(10, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xc7c7e8 });
    this.heartbeat = new THREE.Mesh(geo, mat);
    this.scene.add(this.heartbeat);
    this.visuals = new Set();
  }

  resize(pixelWidth, pixelHeight, dpr) {
    const w = Math.max(1, Math.floor(pixelWidth));
    const h = Math.max(1, Math.floor(pixelHeight));
    this.width = w; this.height = h;
    this.renderer.setPixelRatio(Math.max(1, dpr || 1));
    this.renderer.setSize(w, h, false);
    this.camera.left = 0; this.camera.right = w;
    this.camera.top = h; this.camera.bottom = 0;
    this.camera.updateProjectionMatrix();
    // place heartbeat in top-right
    this.heartbeat.position.set(w - 16, h - 16, 0);
  }

  render(tSec) {
    // animate placeholder heartbeat
    const r = 6 + 2 * Math.sin(tSec * 4);
    this.heartbeat.scale.setScalar(Math.max(0.001, r / 10));
    // Update visuals if they expose update()
    for (const v of this.visuals) {
      try { v.update?.(null, 1/60); } catch (_) {}
    }
    this.renderer.render(this.scene, this.camera);
  }

  addVisual(v) {
    if (!v?.object3D) return;
    this.visuals.add(v);
    this.scene.add(v.object3D);
  }

  removeVisual(v) {
    if (!v) return;
    try { v.destroy?.(); } catch (_) {}
    this.visuals.delete(v);
  }

  clearAllVisuals() {
    for (const v of Array.from(this.visuals)) {
      this.removeVisual(v);
    }
  }
}


