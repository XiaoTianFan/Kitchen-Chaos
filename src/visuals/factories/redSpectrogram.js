import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gateBus } from '../../audio/gateBus.js';
import { palette } from '../../theme/palette.js';

// Red spectrogram similar to tapWaterSpectrogram, listens for 'stove' and 'stove_fire'
export function create(params = {}, ctx = {}) {
  const group = new THREE.Group();

  const barColor = new THREE.Color(params.color || palette.red);
  const alpha = 0.8;

  // Spectrogram bars at bottom
  const spectroGroup = new THREE.Group();
  group.add(spectroGroup);
  const W = ctx.width || 1;
  const H = ctx.height || 1;
  const bands = Math.max(48, Math.min(192, params.bands || 128));
  const barWidth = Math.max(1, W / bands);
  const barMaxHeight = Math.max(12, Math.min(220, (H * 0.35)));
  const bars = [];
  for (let i = 0; i < bands; i++) {
    const geo = new THREE.PlaneGeometry(Math.max(1, barWidth * 0.9), 2);
    const mat = new THREE.MeshBasicMaterial({ color: barColor, transparent: true, opacity: alpha });
    mat.depthWrite = false; mat.depthTest = false;
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 60;
    const x = i * barWidth + barWidth * 0.5;
    m.position.set(x, 1, 0);
    spectroGroup.add(m);
    bars.push({ mesh: m, height: 2 });
  }

  // Gate-driven amplitude smoothing per 1s
  let lastLevelAt = 0;
  let fading = false; let fadeT = 0; const fadeDur = 1.2; const endSilenceMs = 900;
  let ampTarget = 0; let ampFiltered = 0; const ampLerpSeconds = 1.0;

  function onGateLevel(e) {
    const { soundId, rms, t } = e.detail || {};
    if (soundId !== 'stove' && soundId !== 'stove_fire') return;
    ampTarget = Math.min(1, Math.max(0, (rms || 0) * 8));
    lastLevelAt = (typeof t === 'number') ? t : (performance.now ? performance.now() : Date.now());
    fading = false;
  }

  gateBus.addEventListener('gate:level', onGateLevel);

  let alive = true;
  return {
    id: `redSpectrogram_${Math.random().toString(36).slice(2)}`,
    object3D: group,
    update(_audio, dt) {
      const dtSec = Math.max(0.0001, dt || 1 / 60);
      const nowMs = (performance.now ? performance.now() : Date.now());
      const k = Math.min(1, dtSec / Math.max(0.001, ampLerpSeconds));
      ampFiltered = ampFiltered + (ampTarget - ampFiltered) * k;
      if (!fading) {
        const since = (nowMs - (lastLevelAt || nowMs));
        if (since >= endSilenceMs) { fading = true; fadeT = 0; }
      }
      const rise = 4.0 * dtSec; const fall = 3.0 * dtSec;
      const fadeK = fading ? (1 - Math.min(1, fadeT / fadeDur)) : 1;
      for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        const bandEmph = 0.6 + 0.4 * (i / (bars.length - 1));
        const tH = 4 + (barMaxHeight * ampFiltered * bandEmph);
        const h = b.height; let nh = h;
        if (tH > h) nh = Math.min(tH, h + Math.max(1, barMaxHeight * rise));
        else nh = Math.max(2, h - Math.max(1, barMaxHeight * fall));
        b.height = nh;
        b.mesh.scale.y = Math.max(0.01, nh / 2);
        b.mesh.position.y = (nh / 2);
        if (b.mesh.material) b.mesh.material.opacity = alpha * fadeK;
      }
      if (fading) { fadeT += dtSec; if (fadeT >= fadeDur) { try { group.removeFromParent(); } catch (_) {} } }
    },
    setPosition() {}, getPosition() { return { x: 0, y: 0 }; },
    destroy() { alive = false; gateBus.removeEventListener('gate:level', onGateLevel); group.removeFromParent(); },
    get alive() { return alive; }
  };
}


