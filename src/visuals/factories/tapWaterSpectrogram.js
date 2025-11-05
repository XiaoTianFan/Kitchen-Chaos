import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { palette } from '../../theme/palette.js';

// Combines: (1) water stream from top at random x; (2) bottom spectrogram-like bars
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();

  // Colors/opacities
  const waterColor = new THREE.Color(params.waterColor || palette.seaBlue);
  const spectroColor = new THREE.Color(params.spectroColor || palette.seaBlue);
  const alpha = 0.8;

  // Stream particles
  const waterGroup = new THREE.Group();
  group.add(waterGroup);
  const streams = []; // each stream holds particles

  function spawnWaterStream() {
    const W = ctx.width || 1;
    const H = ctx.height || 1;
    const x = Math.random() * W; // random x
    const speed = 600 + Math.random() * 300; // px/s downward
    const lifespan = Math.max(0.2, H / speed);
    const count = 24 + Math.floor(Math.random() * 16);
    const parts = [];
    for (let i = 0; i < count; i++) {
      // small droplets as circles, spaced along vertical path
      const r = 2 + Math.random() * 3;
      const geo = new THREE.CircleGeometry(r, 16);
      const mat = new THREE.MeshBasicMaterial({ color: waterColor, transparent: true, opacity: alpha });
      // Stabilize transparent rendering
      mat.depthWrite = false;
      mat.depthTest = false;
      const m = new THREE.Mesh(geo, mat);
      m.renderOrder = 100; // ensure water draws above spectrogram
      const yOff = -i * (H / count) * 0.2; // stagger starts so stream appears continuous
      m.position.set(x + (Math.random() - 0.5) * 10, H + 20 + yOff, 0);
      waterGroup.add(m);
      parts.push({ m, y: H + 20 + yOff, x: m.position.x, r });
    }
    streams.push({ parts, t: 0, lifespan, speed });
  }

  function onTapGateHit(e) {
    const { soundId } = e.detail || {};
    if (soundId === 'tap') spawnWaterStream();
  }

  // Spectrogram (bottom bars)
  const spectroGroup = new THREE.Group();
  group.add(spectroGroup);
  const W = ctx.width || 1;
  const H = ctx.height || 1;
  const bands = Math.max(48, Math.min(192, params.bands || 128)); // finer resolution
  const barWidth = Math.max(1, W / bands);
  const barMaxHeight = Math.max(12, Math.min(220, (H * 0.35))); // taller max height
  const bars = []; // { mesh, height }

  for (let i = 0; i < bands; i++) {
    const geo = new THREE.PlaneGeometry(Math.max(1, barWidth * 0.92), 2); // reduce gaps (wider bars)
    const mat = new THREE.MeshBasicMaterial({ color: spectroColor, transparent: true, opacity: alpha });
    // Stabilize transparent rendering for bars
    mat.depthWrite = false;
    mat.depthTest = false;
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 50; // draw before water particles
    const x = i * barWidth + barWidth * 0.5;
    const baseY = 0; // bottom anchored
    m.position.set(x, baseY + 1, 0);
    spectroGroup.add(m);
    bars.push({ mesh: m, height: 2 });
  }

  // Layer groups to avoid coplanar artifacts (water above spectrogram)
  spectroGroup.position.z = 0.0;
  waterGroup.position.z = 0.1;

  // Gate-driven modulation state
  let lastRms = 0;
  let lastLevelAt = 0; // ms timeline from event detail
  let fading = false;
  let fadeT = 0;
  const fadeDur = 1.2;
  const endSilenceMs = 900;

  // 1-second lerp smoothing of amplitude
  let ampTarget = 0;
  let ampFiltered = 0;
  const ampLerpSeconds = 0.2;

  function onTapGateLevel(e) {
    const { soundId, rms } = e.detail || {};
    if (soundId !== 'tap') return;
    lastRms = rms || 0;
    const now = (e.detail && typeof e.detail.t === 'number') ? e.detail.t : (performance.now ? performance.now() : Date.now());
    lastLevelAt = now;
    fading = false; // reset any fade if we get fresh energy
    // Map RMS to amplitude target (clamped)
    ampTarget = Math.min(1, Math.max(0, lastRms * 8));
  }

  gateBus.addEventListener('gate:hit', onTapGateHit);
  gateBus.addEventListener('gate:level', onTapGateLevel);

  let alive = true;
  let px = 0, py = 0;

  return {
    id: `tapWaterSpectrogram_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1 / 60);
      const nowMs = (performance.now ? performance.now() : Date.now());

      // Lerp amplitude toward target over ~1 second for steadiness
      const k = Math.min(1, dtSec / Math.max(0.001, ampLerpSeconds));
      ampFiltered = ampFiltered + (ampTarget - ampFiltered) * k;

      // Determine whether to begin fade after silence
      if (!fading) {
        const since = (nowMs - (lastLevelAt || nowMs));
        if (since >= endSilenceMs) {
          fading = true;
          fadeT = 0;
        }
      }

      // Update spectrogram bars with smoothing; only filtered amp
      const rise = 4.0 * dtSec;  // slower rise for steadiness
      const fall = 3.0 * dtSec;  // slower fall
      const fadeK = fading ? (1 - Math.min(1, fadeT / fadeDur)) : 1;
      for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        // slight high-band emphasis
        const bandEmph = 0.6 + 0.4 * (i / (bars.length - 1));
        const t = 4 + (barMaxHeight * ampFiltered * bandEmph);
        const h = b.height;
        let nh = h;
        if (t > h) nh = Math.min(t, h + Math.max(1, barMaxHeight * rise));
        else nh = Math.max(2, h - Math.max(1, barMaxHeight * fall));
        b.height = nh;
        b.mesh.scale.y = Math.max(0.01, nh / 2);
        b.mesh.position.y = (nh / 2);
        if (b.mesh.material) b.mesh.material.opacity = alpha * fadeK;
      }

      // Update water streams
      for (let i = streams.length - 1; i >= 0; i--) {
        const s = streams[i];
        s.t += dtSec;
        const alphaScale = Math.max(0, 1 - s.t / s.lifespan);
        for (const p of s.parts) {
          p.y += -s.speed * dtSec;
          if (p.m.material) p.m.material.opacity = alpha * (0.3 + 0.7 * alphaScale) * fadeK;
          if (p.y <= 0) p.y = -9999; // mark to fade
          p.m.position.set(p.x + (Math.random() - 0.5) * 2, p.y, 0);
        }
        if (s.t >= s.lifespan + 0.2) {
          for (const p of s.parts) { try { p.m.removeFromParent(); } catch (_) {} }
          streams.splice(i, 1);
        }
      }

      // Advance fade timer if fading; destroy when done
      if (fading) {
        fadeT += dtSec;
        if (fadeT >= fadeDur) {
          try { group.removeFromParent(); } catch (_) {}
        }
      }
    },
    setPosition(nx, ny) { px = nx; py = ny; },
    getPosition() { return { x: px, y: py }; },
    destroy() {
      alive = false;
      gateBus.removeEventListener('gate:hit', onTapGateHit);
      gateBus.removeEventListener('gate:level', onTapGateLevel);
      group.removeFromParent();
    },
    get alive() { return alive; }
  };
}


