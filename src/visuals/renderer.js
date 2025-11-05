// Three.js renderer setup with DPR sizing

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { palette } from '../theme/palette.js';
import { gateBus } from '../audio/gateBus.js';

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

    // fade-out state for end-of-sequence clearing
    this._fade = null; // { t, dur, targets: [ { material, orig } ] }
    // full-screen white blink overlay and center text fade-in state
    this._blink = null; // { t, dur, mesh, onComplete }
    this._centerFadeIn = null; // { t, dur, target }

    // camera/scene shake state
    this._shakeT = 0;      // seconds remaining
    this._shakeDur = 0.001; // seconds total of current shake
    this._shakeAmp = 0;    // pixels amplitude at start

    // listen for shake requests
    try {
      gateBus.addEventListener('fx:shake', (e) => {
        const d = (e && e.detail) || {};
        const durSec = Math.max(0.01, ((d.durationMs ?? 400) / 1000));
        const amp = Math.max(0, d.intensity ?? 10);
        this._shakeDur = durSec;
        this._shakeT = Math.max(this._shakeT, durSec);
        this._shakeAmp = Math.max(this._shakeAmp, amp);
      });
    } catch (_) {}

    // initialize subtle kitchen grid behind visuals
    this._initGrid();

    // center text prompt (sprite)
    this.centerTextSprite = null;
    this.centerTextMessage = null;
    this.centerTextOpacity = 0.75;
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

    // re-center prompt if present (and rebuild for proportional sizing)
    if (this.centerTextSprite) {
      try { this.showCenterText(this.centerTextMessage, this.centerTextOpacity); } catch (_) {}
    }
  }

  render(tSec, dtSec) {
    // animate placeholder heartbeat
    const r = 6 + 2 * Math.sin(tSec * 4);
    this.heartbeat.scale.setScalar(Math.max(0.001, r / 10));
    // Apply transient screen shake by offsetting the entire scene
    const dt = (typeof dtSec === 'number' && isFinite(dtSec) && dtSec > 0) ? dtSec : 1/60;
    if (this._shakeT > 0 && this._shakeDur > 0) {
      const k = Math.max(0, Math.min(1, this._shakeT / this._shakeDur));
      const amp = this._shakeAmp * k;
      const ox = (Math.random() * 2 - 1) * amp;
      const oy = (Math.random() * 2 - 1) * amp;
      this.scene.position.set(ox, oy, 0);
      this._shakeT = Math.max(0, this._shakeT - dt);
    } else {
      this.scene.position.set(0, 0, 0);
    }
    // Update visuals if they expose update(); prune dead/unparented
    for (const v of Array.from(this.visuals)) {
      try { v.update?.(null, dt); } catch (_) {}
      if (v && (v.alive === false || !v.object3D || !v.object3D.parent)) {
        this.removeVisual(v);
      }
    }
    // Apply global fade of all non-grid objects when requested
    if (this._fade && this._fade.dur > 0) {
      this._fade.t = Math.min(this._fade.dur, (this._fade.t + dt));
      const k = Math.max(0, 1 - (this._fade.t / this._fade.dur));
      for (const tgt of this._fade.targets || []) {
        try {
          const m = tgt.material;
          if (!m) continue;
          m.transparent = true;
          const base = (typeof tgt.orig === 'number' ? tgt.orig : 1);
          m.opacity = Math.max(0, Math.min(1, base * k));
          m.needsUpdate = true;
        } catch (_) {}
      }
      if (this._fade.t >= this._fade.dur) {
        // fade complete: clear visuals and remove transient meshes, keep grid/background
        try { this.clearAllVisuals(); } catch (_) {}
        try { this.heartbeat?.removeFromParent?.(); } catch (_) {}
        const done = this._fade?.onComplete;
        this._fade = null;
        try { if (typeof done === 'function') done(); } catch (_) {}
      }
    }
    // White blink overlay update
    if (this._blink && this._blink.mesh && this._blink.dur > 0) {
      const b = this._blink;
      b.t = Math.min(b.dur, (b.t + dt));
      const k = Math.max(0, 1 - (b.t / b.dur));
      try { if (b.mesh.material) { b.mesh.material.opacity = k; b.mesh.material.needsUpdate = true; } } catch (_) {}
      if (b.t >= b.dur) {
        try { b.mesh.removeFromParent(); } catch (_) {}
        const cb = b.onComplete;
        this._blink = null;
        try { if (typeof cb === 'function') cb(); } catch (_) {}
      }
    }
    // Center text fade-in update
    if (this.centerTextSprite && this._centerFadeIn && this._centerFadeIn.dur > 0) {
      const cf = this._centerFadeIn;
      cf.t = Math.min(cf.dur, (cf.t + dt));
      const a = Math.max(0, Math.min(1, cf.t / cf.dur));
      try {
        const finalA = (typeof this.centerTextOpacity === 'number') ? this.centerTextOpacity : 0.75;
        this.centerTextSprite.material.opacity = finalA * a;
        this.centerTextSprite.material.needsUpdate = true;
      } catch (_) {}
      if (cf.t >= cf.dur) {
        this._centerFadeIn = null;
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

Renderer.prototype.fadeOutNonGrid = function fadeOutNonGrid(durationSec, onComplete) {
  const dur = Math.max(0.001, Number.isFinite(durationSec) ? durationSec : 3.0);
  const targets = [];
  try {
    this.scene.traverse((obj) => {
      if (!obj || obj === this.gridPlane) return;
      // collect materials from meshes
      const mat = obj.material;
      if (Array.isArray(mat)) {
        for (const m of mat) {
          if (m && typeof m.opacity === 'number') targets.push({ material: m, orig: m.opacity });
        }
      } else if (mat && typeof mat.opacity === 'number') {
        targets.push({ material: mat, orig: mat.opacity });
      }
    });
  } catch (_) {}
  this._fade = { t: 0, dur, targets, onComplete };
};

Renderer.prototype.blinkWhite = function blinkWhite(durationMs = 180, onComplete) {
  try {
    const dur = Math.max(0.001, (Number.isFinite(durationMs) ? durationMs : 180) / 1000);
    const geometry = new THREE.PlaneGeometry(this.width, this.height);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0, depthWrite: false, depthTest: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(this.width * 0.5, this.height * 0.5, 10);
    mesh.renderOrder = 10000;
    this.scene.add(mesh);
    this._blink = { t: 0, dur, mesh, onComplete };
  } catch (_) {}
};

Renderer.prototype.fadeInCenterText = function fadeInCenterText(text, durationSec = 1.5, finalOpacity = 0.75) {
  try {
    const msg = String(text || '').trim() || '';
    // Build sprite (it sets material.opacity = finalOpacity), then set to 0 and ramp to final
    this.showCenterText(msg, finalOpacity);
    if (this.centerTextSprite && this.centerTextSprite.material) {
      this.centerTextSprite.material.opacity = 0;
      this.centerTextSprite.material.needsUpdate = true;
    }
    const dur = Math.max(0.001, Number.isFinite(durationSec) ? durationSec : 1.5);
    this._centerFadeIn = { t: 0, dur };
  } catch (_) {}
};

Renderer.prototype.showCenterText = function showCenterText(text, opacity) {
  try {
    const msg = String(text || '').trim();
    if (!msg) return; // no default message; main.js controls initial prompt
    const alpha = Math.max(0, Math.min(1, Number.isFinite(opacity) ? opacity : 0.75));
    const minDim = Math.max(1, Math.min(this.width, this.height));
    const fontPx = Math.max(16, Math.min(96, Math.floor(minDim * 0.06)));
    const padding = Math.floor(fontPx * 0.6);

  // Support multi-line messages separated by \n
  const lines = msg.split('\n').map(s => s.trim());
  const mcanvas = document.createElement('canvas');
  const mctx = mcanvas.getContext('2d');
  const fontFamily = '"Barriecito", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  const secondaryScale = 0.7; // use smaller font for lines after the first
  let maxW = 0;
  for (let i = 0; i < lines.length; i++) {
    const sizePx = (i === 0 ? fontPx : Math.floor(fontPx * secondaryScale));
    mctx.font = `400 ${sizePx}px ${fontFamily}`;
    const w = Math.ceil(mctx.measureText(lines[i]).width);
    if (w > maxW) maxW = w;
  }

    const baseW = maxW + padding * 2;
    const lineH = Math.ceil(fontPx * 1.35);
    const baseH = Math.max(2, Math.ceil(lineH * Math.max(1, lines.length)));
    const oversample = 2;
    const c = document.createElement('canvas');
    c.width = Math.max(2, baseW * oversample);
    c.height = Math.max(2, baseH * oversample);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  const fontFamilyOS = fontFamily; // reuse
    ctx.fillStyle = 'rgba(255,255,255,1)';
    // Draw each line vertically centered as a block
    const totalLines = Math.max(1, lines.length);
    for (let i = 0; i < totalLines; i++) {
      const y = (c.height * 0.5) + ((i - (totalLines - 1) / 2) * lineH * oversample);
    const sizePx = (i === 0 ? fontPx : Math.floor(fontPx * secondaryScale));
    ctx.font = `400 ${sizePx * oversample}px ${fontFamilyOS}`;
      ctx.fillText(lines[i] || '', c.width * 0.5, y);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(palette.foreground), transparent: true, opacity: alpha, depthTest: false, depthWrite: false });
    const spr = new THREE.Sprite(mat);
    spr.center.set(0.5, 0.5);
    spr.scale.set(baseW, baseH, 1);
    spr.position.set(this.width * 0.5, this.height * 0.5, 9);
    spr.renderOrder = 9999;

    if (this.centerTextSprite) {
      try { this.centerTextSprite.material.map?.dispose?.(); } catch (_) {}
      try { this.centerTextSprite.material?.dispose?.(); } catch (_) {}
      try { this.centerTextSprite.removeFromParent(); } catch (_) {}
    }
    this.centerTextSprite = spr;
    this.centerTextMessage = msg;
    this.centerTextOpacity = alpha;
    this.scene.add(spr);
  } catch (_) {}
};

Renderer.prototype.hideCenterText = function hideCenterText() {
  if (!this.centerTextSprite) return;
  try { this.centerTextSprite.material.map?.dispose?.(); } catch (_) {}
  try { this.centerTextSprite.material?.dispose?.(); } catch (_) {}
  try { this.centerTextSprite.removeFromParent(); } catch (_) {}
  this.centerTextSprite = null;
  this.centerTextMessage = null;
};

