// High-level sounds API: play/stop, fades, panning

import { getBuffer } from './buffers.js';

let engine = null;

export function initSounds(audioEngine) {
  engine = audioEngine;
}

function mapXToPan(x) {
  const xn = Math.max(0, Math.min(1, x ?? 0.5));
  return xn * 2 - 1;
}

export function playOneShot(id, { x = 0.5, bus = 'fx', gain = 1.0, rate = 1.0, fadeInMs, fadeOutMs } = {}) {
  if (!engine) {
    console.warn(`[sounds] Engine not initialized, cannot play '${id}'`);
    return null;
  }
  const buffer = getBuffer(id);
  if (!buffer) {
    console.warn(`[sounds] Buffer not loaded for sound '${id}' - skipping playback`);
    return null;
  }
  const { context } = engine;
  const { source, gain: g, panner } = engine.createEntityNodes({ busName: bus, pan: mapXToPan(x), initialGain: 0.0001 });
  source.buffer = buffer;
  source.playbackRate.value = rate;

  const now = context.currentTime;
  const fadeIn = Math.max(0.001, (typeof fadeInMs === 'number' ? fadeInMs / 1000 : 0.015));
  const fadeOut = Math.max(0.001, (typeof fadeOutMs === 'number' ? fadeOutMs / 1000 : 0.03));
  const dur = buffer.duration / rate;

  // fades
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), now + fadeIn);
  g.gain.setValueAtTime(Math.max(0.0001, gain), now + Math.max(fadeIn, Math.max(0.0, dur - fadeOut)));
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  source.start(now);
  source.stop(now + dur + 0.01);

  const handle = {
    stop: () => {
      try { source.stop(); } catch (_) {}
    }
  };
  return handle;
}

const sustained = new Map(); // id -> handle

export function playSustained(id, { x = 0.5, bus = 'beds', gain = 1.0, rate = 1.0, fadeInMs } = {}) {
  if (!engine) {
    console.warn(`[sounds] Engine not initialized, cannot play '${id}'`);
    return null;
  }
  const buffer = getBuffer(id);
  if (!buffer) {
    console.warn(`[sounds] Buffer not loaded for sound '${id}' - skipping playback`);
    return null;
  }
  const { context } = engine;
  const { source, gain: g, panner } = engine.createEntityNodes({ busName: bus, pan: mapXToPan(x), initialGain: 0.0001 });
  source.buffer = buffer;
  source.loop = true;
  source.playbackRate.value = rate;

  const now = context.currentTime;
  const fadeIn = Math.max(0.001, (typeof fadeInMs === 'number' ? fadeInMs / 1000 : 0.3));
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), now + fadeIn);
  source.start(now);

  const handle = {
    setPan: (x) => { panner.pan.value = mapXToPan(x); },
    stop: (fadeOutMsParam) => {
      const t = context.currentTime;
      const out = Math.max(0.001, (typeof fadeOutMsParam === 'number' ? fadeOutMsParam / 1000 : 0.03));
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + out);
      try { source.stop(t + out + 0.01); } catch (_) {}
    }
  };
  sustained.set(id, handle);
  return handle;
}

export function stopSustained(id, { fadeOutMs } = {}) {
  const h = sustained.get(id);
  if (h) {
    h.stop(fadeOutMs);
    sustained.delete(id);
  }
}

export function toggleSustained(id, opts) {
  if (sustained.has(id)) {
    stopSustained(id, opts || {});
    return null;
  }
  return playSustained(id, opts);
}


