// Sequencer: linear, click-to-advance per-state cue runner
import { getBuffer } from './audio/buffers.js';
import { log } from './logging.js';

export class Sequencer {
  constructor({ getConfig, sounds, fsm, setPrompt, renderer, createVisual, onCue }) {
    this.getConfig = getConfig; // () => cfg
    this.sounds = sounds;       // SoundManager
    this.fsm = fsm;             // FSM instance
    this.setPrompt = setPrompt; // (text) => void
    this.renderer = renderer;    // Renderer instance
    this.createVisual = createVisual; // (soundId, x, y) => void helper
    this.onCue = onCue;               // (cue, ctx) => void

    this.sequence = [];
    this.index = 0;
    this.stateName = '';
  }

  resetForState(stateName) {
    this.stateName = stateName;
    this.index = 0;
    const cfg = this.getConfig?.() || {};
    const st = (cfg?.fsm?.states || []).find(s => s?.name === stateName);
    this.sequence = Array.isArray(st?.sequence) ? st.sequence.slice(0) : [];
  }

  // inputType: 'click' | 'hold' | 'drag'
  // actionCtx: original input event (may include x,y,nx,ny,isStart,phase)
  advance(inputType = 'click', actionCtx = null) {
    if (!this.sequence || this.sequence.length === 0) return; // nothing to do
    if (this.index >= this.sequence.length) return; // reached end, no-op

    // Only consider the immediate next cue; do not skip on mismatched input/conditions
    const currentIdx = this.index;
    const cue = this.sequence[currentIdx];
    const req = cue?.requires; // 'click' | 'hold' | 'drag' | undefined
    const matchesInput = !req || req === inputType;
    if (!matchesInput) {
      log('seq:input_blocked', { state: this.stateName, index: currentIdx, req, got: inputType });
      return; // wait for correct gesture
    }
    if (cue?.if && typeof cue.if === 'object') {
      for (const k of Object.keys(cue.if)) {
        if ((this.fsm?.[k]) !== cue.if[k]) {
          log('seq:cond_blocked', { state: this.stateName, index: currentIdx, cond: cue.if, failedKey: k, fsmVal: this.fsm?.[k] });
          return; // wait until conditions satisfied
        }
      }
    }
    try {
      // Apply audio action
      const action = cue?.action;
      const sound = cue?.sound;
      // Derive position: prefer actionCtx normalized x,y if present
      const nx = (actionCtx && typeof actionCtx.x === 'number') ? actionCtx.x : (cue?.x ?? 0.5);
      const ny = (actionCtx && typeof actionCtx.y === 'number') ? actionCtx.y : (cue?.y ?? 0.5);
      // Optional per-cue audio options
      const audioOpts = { x: nx };
      if (typeof cue?.gain === 'number') audioOpts.gain = cue.gain;
      if (typeof cue?.fadeInMs === 'number') audioOpts.fadeInMs = cue.fadeInMs;
      if (typeof cue?.fadeOutMs === 'number') audioOpts.fadeOutMs = cue.fadeOutMs;
      if (action && sound) {
        // Ensure buffer is ready; if not, do not advance index yet
        const haveBuffer = !!getBuffer(sound);
        if (!haveBuffer) {
          log('seq:buffer_missing', { state: this.stateName, index: currentIdx, id: sound });
          return; // wait for next input once buffers are ready
        }
        if (action === 'playOneShot') {
          const h = this.sounds?.playOneShot(sound, audioOpts);
          if (!h) log('sound:play_fail', { id: sound, action, state: this.stateName, index: currentIdx });
          if (this.createVisual) this.createVisual(sound, nx, ny);
          log('sound:play', { id: sound, action, state: this.stateName, index: currentIdx, x: nx, y: ny });
        } else if (action === 'startSustained') {
          const h = this.sounds?.startSustained(sound, audioOpts);
          if (!h) log('sound:start_fail', { id: sound, action, state: this.stateName, index: currentIdx });
          if (this.createVisual) this.createVisual(sound, nx, ny);
          log('sound:start', { id: sound, action, state: this.stateName, index: currentIdx, x: nx, y: ny });
        } else if (action === 'stopSustained') {
          this.sounds?.stopSustained(sound, audioOpts);
          log('sound:stop', { id: sound, action, state: this.stateName, index: currentIdx });
        } else if (action === 'toggleSustained') {
          const h = this.sounds?.toggleSustained(sound, audioOpts);
          // toggle may return null when stopping; treat null on start as failure
          if (this.createVisual) this.createVisual(sound, nx, ny);
          log('sound:toggle', { id: sound, action, state: this.stateName, index: currentIdx, x: nx, y: ny });
        }
      }

      // State transition cue
      if (action === 'gotoState' && cue?.to) {
        try {
          this.fsm?.goTo?.(cue.to, 'sequencer');
          log('state:goto', { to: cue.to, from: this.stateName, index: currentIdx });
        } catch (_) {}
      }

      // Optional FSM side effects
      if (cue?.fsm) {
        if (cue.fsm.setStove === true) this.fsm?.setStove(true);
        if (cue.fsm.bumpMicrowave === true) this.fsm?.bumpMicrowave();
      }

      // Narrative text
      if (typeof cue?.text === 'string' && cue.text.length > 0) {
        this.setPrompt?.(cue.text);
      }

      // Notify
      if (this.onCue) {
        try { this.onCue(cue, { inputType, actionCtx }); } catch (_) {}
      }
      // Advance index only after successful execution
      this.index = this.index + 1;
    } catch (_) {
      // swallow to avoid breaking linear flow on a single cue
    }
  }
}


