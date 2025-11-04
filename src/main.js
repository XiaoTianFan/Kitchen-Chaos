// Minimal bootstrap for plain JS (no bundler)
// - Handles overlay interaction (first user gesture)
// - Sizes the full-screen canvas with devicePixelRatio
// - Starts a lightweight RAF loop placeholder

import { loadAppConfig, getAppConfig } from './config.js';
import { AudioEngine } from './audio/audioEngine.js';
import { preloadAllBuffers } from './audio/buffers.js';
import { InputController } from './input.js';
import { FSM } from './fsm.js';
import { Renderer } from './visuals/renderer.js';
import { setPromptText, whiteBlinkAndFade } from './ui.js';
import { initLogging, log } from './logging.js';
import { SoundManager } from './audio/soundManager.js';
import { createFactory } from './visuals/registry.js';
import { Sequencer } from './sequencer.js';

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
let renderer = null;
let sounds = null;
let sequencer = null;
let appConfig = null;

function setPrompt(text) {
  setPromptText(text);
}

// Helper function to get visual effect name from config for a given sound ID
function getVisualForSound(soundId) {
  if (!appConfig) return null;
  const soundMeta = (appConfig.sounds || []).find(s => s.id === soundId);
  return soundMeta?.visual || null;
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
  drawPlaceholder(now);
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
        log('user:action', { type: 'click' });
        sequencer?.advance();
      }
      if (action?.type === 'hold') {
        if (fsm && action.phase === 'start') fsm.recordUserAction();
        log('user:action', { type: 'hold', phase: action.phase });
        if (action.phase === 'start') {
          sequencer?.advance('hold', action);
        }
      }
      if (action?.type === 'drag') {
        if (fsm && action.isStart) fsm.recordUserAction();
        log('user:action', { type: 'drag' });
        if (action.isStart === true) {
          sequencer?.advance('drag', action);
        }
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
    appConfig = cfg;
    configLoaded = true;
    initLogging({ debug: !!cfg?.meta?.debug, getState: () => fsm?.state || 'Unknown' });
    log('app:init', {});
    audio = new AudioEngine({ debug: !!cfg?.meta?.debug });
    fsm = new FSM(cfg);
    sounds = new SoundManager(audio, cfg);
    sequencer = new Sequencer({
      getConfig: () => cfg,
      sounds,
      fsm,
      setPrompt: (text) => setPrompt(text),
      renderer: null, // Will be set after renderer is created
      createVisual: (soundId, x, y) => {
        const visualName = getVisualForSound(soundId);
        if (visualName && renderer) {
          try {
            const px = x * canvas.width;
            const py = y * canvas.height;
            const v = createFactory(visualName, {}, { width: canvas.width, height: canvas.height });
            v.setPosition(px, py);
            renderer.addVisual(v);
          } catch(_){}
        }
      }
    });
    // Ensure initial state's sequence is loaded (e.g., Preparing)
    if (sequencer && fsm?.state) {
      sequencer.resetForState(fsm.state);
    }
    fsm.setHooks({
      onEnter: ({ state }) => {
        try {
          const st = (cfg.fsm?.states || []).find(s => s?.name === state);
          const prompt = st?.enterActions?.find(a => a?.type === 'uiPrompt')?.text;
          if (prompt) setPrompt(prompt);
        } catch (_) {}
        log('state:enter', { state });
        sequencer?.resetForState(state);
      }
    });
    // Preload and decode all audio buffers
    try {
      await preloadAllBuffers(audio, cfg?.sounds || [], { basePath: '/assets/audio/' });
      buffersReady = true;
      log('app:assets_loaded', {});
    } catch (err) {
      console.warn('[audio] buffer preload failed', err);
    }
    // Visual renderer
    renderer = new Renderer(canvas);
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    renderer.resize(canvas.width, canvas.height, dpr);
    // Update sequencer with renderer reference
    if (sequencer) sequencer.renderer = renderer;
  } catch (err) {
    console.error('[main] config load failed', err);
    if (overlay) {
      const card = overlay.querySelector('.overlay-card');
      if (card) card.textContent = 'Failed to load config. Reload or check files.';
    }
  }
})();


