// Three.js renderer setup with DPR sizing

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { palette } from '../theme/palette.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(palette.background);
    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
    this.width = 1;
    this.height = 1;
    // kitchen grid: repeating foreground-colored lines with low opacity
    this.gridSpacing = 64; // pixels between grid lines
    this.gridTexture = null;
    this.gridPlane = null;

    // simple placeholder object to indicate render running
    const geo = new THREE.CircleGeometry(10, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xc7c7e8 });
    this.heartbeat = new THREE.Mesh(geo, mat);
    this.scene.add(this.heartbeat);
    this.visuals = new Set();

    // initialize subtle kitchen grid behind visuals
    this._initGrid();
  }

  resize(pixelWidth, pixelHeight, dpr) {
    const w = Math.max(1, Math.floor(pixelWidth));
    const h = Math.max(1, Math.floor(pixelHeight));
    this.width = w; this.height = h;
    // Canvas is already sized in device pixels upstream; avoid double DPR scaling here
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    this.camera.left = 0; this.camera.right = w;
    this.camera.top = h; this.camera.bottom = 0;
    this.camera.updateProjectionMatrix();
    // place heartbeat in top-right
    this.heartbeat.position.set(w - 16, h - 16, 0);

    // update grid to match new canvas size
    this._updateGridPlane();
  }

  render(tSec, dtSec) {
    // animate placeholder heartbeat
    const r = 6 + 2 * Math.sin(tSec * 4);
    this.heartbeat.scale.setScalar(Math.max(0.001, r / 10));
    // Update visuals if they expose update(); prune dead/unparented
    const dt = (typeof dtSec === 'number' && isFinite(dtSec) && dtSec > 0) ? dtSec : 1/60;
    for (const v of Array.from(this.visuals)) {
      try { v.update?.(null, dt); } catch (_) {}
      if (v && (v.alive === false || !v.object3D || !v.object3D.parent)) {
        this.removeVisual(v);
      }
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



// --- internal helpers ---
Renderer.prototype._initGrid = function _initGrid() {
  try {
    this.gridTexture = this._createGridTexture(this.gridSpacing);
    const material = new THREE.MeshBasicMaterial({
      map: this.gridTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    const geometry = new THREE.PlaneGeometry(1, 1);
    this.gridPlane = new THREE.Mesh(geometry, material);
    this.gridPlane.position.set(0, 0, -5);
    this.gridPlane.renderOrder = -1; // ensure it renders behind everything
    this.scene.add(this.gridPlane);
    this._updateGridPlane();
  } catch (_) {}
};

Renderer.prototype._updateGridPlane = function _updateGridPlane() {
  if (!this.gridPlane || !this.gridTexture) return;
  const w = Math.max(1, this.width);
  const h = Math.max(1, this.height);

  // resize geometry to cover the viewport in pixel units
  try { this.gridPlane.geometry.dispose?.(); } catch (_) {}
  this.gridPlane.geometry = new THREE.PlaneGeometry(w, h);
  this.gridPlane.position.set(w * 0.5, h * 0.5, -5);

  // repeat the texture based on spacing
  const spacing = Math.max(8, this.gridSpacing | 0);
  const repX = w / spacing;
  const repY = h / spacing;
  this.gridTexture.repeat.set(repX, repY);
  this.gridTexture.needsUpdate = true;
};

Renderer.prototype._createGridTexture = function _createGridTexture(spacing) {
  const size = Math.max(8, spacing | 0);
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  // parse palette.foreground and draw lines with 0.2 alpha
  const rgb = this._hexToRgb(palette.foreground);
  const stroke = `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  // draw top and left edges only to avoid double-thick seams when tiling
  ctx.moveTo(0.5, 0); ctx.lineTo(0.5, size);
  ctx.moveTo(0, 0.5); ctx.lineTo(size, 0.5);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  return tex;
};

Renderer.prototype._hexToRgb = function _hexToRgb(hex) {
  let h = (hex || '').trim();
  if (h[0] === '#') h = h.slice(1);
  if (h.length === 3) {
    h = h.split('').map(ch => ch + ch).join('');
  }
  const num = parseInt(h, 16);
  /* eslint-disable no-bitwise */
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  /* eslint-enable no-bitwise */
  return { r, g, b };
};

