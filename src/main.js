// Minimal bootstrap for plain JS (no bundler)
// - Handles overlay interaction (first user gesture)
// - Sizes the full-screen canvas with devicePixelRatio
// - Starts a lightweight RAF loop placeholder

import { loadAppConfig, getAppConfig } from './config.js';
import { AudioEngine } from './audio/audioEngine.js';
import { preloadAllBuffers } from './audio/buffers.js';
import { InputController } from './input.js';
import { FSM } from './fsm.js';
import { RulesEngine } from './rules.js';
import { Renderer } from './visuals/renderer.js';
import { AccidentScheduler } from './accidents.js';
import { setPromptText, whiteBlinkAndFade } from './ui.js';
import { initLogging, log } from './logging.js';
import { SoundManager } from './audio/soundManager.js';
import { createFactory } from './visuals/registry.js';

const overlay = document.getElementById('overlay');
const promptEl = document.getElementById('prompt');
const canvas = document.getElementById('scene');

let rafId = 0;
let started = false;
let configLoaded = false;
let audio = null;
let buffersReady = false;
let input = null;
let fsm = null;
let rules = null;
let renderer = null;
let accidentScheduler = null;
let sounds = null;
let alarmHandle = null;
let alarmVisual = null;

function setPrompt(text) {
  setPromptText(text);
}

function resize() {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const width = Math.floor(window.innerWidth * dpr);
  const height = Math.floor(window.innerHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  if (renderer) renderer.resize(width, height, dpr);
}

function drawPlaceholder(t) {
  if (renderer) renderer.render((t || 0) / 1000);
}

function frame(ts) {
  const now = ts || 0;
  const last = frame._lastTs || now;
  frame._lastTs = now;
  const dtSec = Math.max(0, (now - last) / 1000);
  if (fsm) fsm.tick(dtSec);
  if (rules) rules.tick();
  drawPlaceholder(now);

  // Update alarm panner following its visual x
  if (alarmHandle && alarmVisual) {
    try {
      const pos = alarmVisual.getPosition?.();
      if (pos && canvas.width) alarmHandle.setPan(pos.x / canvas.width);
    } catch(_){}
  }

  // End sequence when Chaos tState >= 60s
  if (!frame._ended && fsm?.state === 'Chaos' && (fsm?.tState ?? 0) >= 60) {
    frame._ended = true;
    try { audio?.stopAll(); } catch (_) {}
    whiteBlinkAndFade({ blinkMs: 100, fadeMs: 1500 });
    renderer?.clearAllVisuals?.();
  }
  rafId = requestAnimationFrame(frame);
}

function start() {
  if (started) return;
  started = true;
  overlay?.classList.add('hidden');
  // If config loaded, pull prompt from Preparing state's enterActions
  try {
    if (configLoaded) {
      const cfg = getAppConfig();
      const prep = (cfg.fsm?.states || []).find(s => s?.name === 'Preparing');
      const prompt = prep?.enterActions?.find(a => a?.type === 'uiPrompt')?.text || 'Maybe light something…';
      setPrompt(prompt);
    } else {
      setPrompt('Maybe light something…');
    }
  } catch (_) {
    setPrompt('Maybe light something…');
  }
  resize();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(frame);

  // Resume audio context on first interaction
  if (audio) {
    audio.resume().catch(() => {
      // Keep overlay hidden; user may need to interact again on some browsers
    });
    log('audio:context_unlocked', {});
  }

  // Install input controller
  if (!input) {
    input = new InputController(canvas, (action) => {
      // Placeholder: later map to sound triggers and FSM
      // For now, lightly nudge prompt visibility on interactions
      if (action?.type === 'click') {
        if (fsm) fsm.recordUserAction();
        if (rules) rules.onUserAction();
        log('user:action', { type: 'click' });
        setPrompt('Multitasking is easy. Add more. More.');
        setTimeout(() => setPrompt(''), 900);

        // Basic mapping: left bottom toggles stove; right bottom toggles tap; top center microwave; center one-shots
        const nx = action.x, ny = action.y;
        const px = nx * canvas.width; const py = ny * canvas.height;
        if (ny > 0.66 && nx < 0.33) {
          const h = sounds?.toggleSustained('stove', { x: nx });
          fsm?.setStove(!!h);
          try { const v=createFactory('heatRing', { size: 40 }, { width: canvas.width, height: canvas.height }); v.setPosition(px, py); renderer?.addVisual(v); } catch(_){}
        } else if (ny > 0.66 && nx > 0.66) {
          sounds?.toggleSustained('tap', { x: nx });
          try { const v=createFactory('rippleEmitter', {}, { width: canvas.width, height: canvas.height }); v.setPosition(px, py); renderer?.addVisual(v); } catch(_){}
        } else if (ny < 0.33 && Math.abs(nx-0.5) < 0.2) {
          sounds?.playOneShot('microwave', { x: nx });
          try { const v=createFactory('microwaveGrid', { lifespanMs: 1000 }, { width: canvas.width, height: canvas.height }); v.setPosition(px, py); renderer?.addVisual(v); } catch(_){}
          fsm?.bumpMicrowave();
        } else {
          const pick = Math.random();
          const id = pick < 0.34 ? 'bag_rustling' : (pick < 0.67 ? 'glass_clink' : 'lighter');
          const vis = id==='bag_rustling'? 'polygonWrinkle' : (id==='glass_clink' ? 'starburstShards' : 'flareHeat');
          try { const v=createFactory(vis, {}, { width: canvas.width, height: canvas.height }); v.setPosition(px, py); renderer?.addVisual(v); } catch(_){}
          sounds?.playOneShot(id, { x: nx });
        }
      }
      if (action?.type === 'hold') {
        if (fsm && action.phase === 'start') fsm.recordUserAction();
        if (rules && action.phase === 'start') rules.onUserAction();
        log('user:action', { type: 'hold', phase: action.phase });
        if (action.phase === 'start') {
          const nx = action.x, ny = action.y; const px = nx*canvas.width, py=ny*canvas.height;
          // start spray by default
          sounds?.playOneShot('cooking_spray', { x: nx });
          try { const v=createFactory('sprayCone', {}, { width: canvas.width, height: canvas.height }); v.setPosition(px, py); renderer?.addVisual(v); } catch(_){}
        }
      }
      if (action?.type === 'drag') {
        if (fsm && action.isStart) fsm.recordUserAction();
        if (rules && action.isStart) rules.onUserAction();
        log('user:action', { type: 'drag' });
        // Water pour path visual; one-shot audio (first drag)
        const nx = action.x, ny = action.y; const px = nx*canvas.width, py=ny*canvas.height;
        try {
          if (action.isStart === true) {
            sounds?.playOneShot('water_pour', { x: nx });
            if (fsm?.stoveOn) sounds?.startSustained('boiling_water', { x: nx });
          }
          const v=createFactory('ribbonWave', {}, { width: canvas.width, height: canvas.height });
          v.setPosition(px, py);
          renderer?.addVisual(v);
        } catch(_){}
      }
    });
  }
}

// First interaction unlock handler (placeholder: audio unlock to be wired later)
function handleFirstInteraction() {
  start();
  window.removeEventListener('pointerdown', handleFirstInteraction);
}

// Wire events
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });

overlay?.addEventListener('click', handleFirstInteraction);
overlay?.addEventListener('touchstart', handleFirstInteraction, { passive: true });

// Initial layout
resize();
setPrompt('');

// Load configuration early
(async () => {
  try {
    const cfg = await loadAppConfig('./config/app.json');
    configLoaded = true;
    initLogging({ debug: !!cfg?.meta?.debug, getState: () => fsm?.state || 'Unknown' });
    log('app:init', {});
    audio = new AudioEngine({ debug: !!cfg?.meta?.debug });
    fsm = new FSM(cfg);
    accidentScheduler = new AccidentScheduler(cfg);
    sounds = new SoundManager(audio, cfg);
    rules = new RulesEngine(fsm, cfg, {
      scheduleAccident: (reqType, delayMs, reason) => {
        const type = accidentScheduler.nextType(reqType);
        const w = canvas.width, h = canvas.height;
        const pos = accidentScheduler.randomPosition(w, h);
        log('auto:accident_scheduled', { type, dueAt: performance.now() + (delayMs ?? cfg?.accidents?.delayMs ?? 200) });
        setTimeout(() => {
          fsm.recordAccident();
          log('auto:accident_spawn', { type, x: pos.x, y: pos.y });
        }, Math.max(0, delayMs ?? cfg?.accidents?.delayMs ?? 200));
      },
      ensureAlarm: () => {
        if (!alarmHandle) {
          alarmHandle = sounds?.startSustained('fire_alarm', { x: 0.5 });
          try { alarmVisual = createFactory('flashingCircularSpectrogram', {}, { width: canvas.width, height: canvas.height }); renderer?.addVisual(alarmVisual);} catch(_){}
        }
      }
    });
    fsm.setHooks({
      onEnter: ({ state }) => {
        try {
          const st = (cfg.fsm?.states || []).find(s => s?.name === state);
          const prompt = st?.enterActions?.find(a => a?.type === 'uiPrompt')?.text;
          if (prompt) setPrompt(prompt);
        } catch (_) {}
        log('state:enter', { state });
        if (rules) rules.handleEnterState(state);
      }
    });

    // Preload and decode all audio buffers
    try {
      await preloadAllBuffers(audio, cfg?.sounds || [], { basePath: './assets/audio/' });
      buffersReady = true;
      log('app:assets_loaded', {});
    } catch (err) {
      console.warn('[audio] buffer preload failed', err);
    }

    // Visual renderer
    renderer = new Renderer(canvas);
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    renderer.resize(canvas.width, canvas.height, dpr);
  } catch (err) {
    console.error('[main] config load failed', err);
    if (overlay) {
      const card = overlay.querySelector('.overlay-card');
      if (card) card.textContent = 'Failed to load config. Reload or check files.';
    }
  }
})();


