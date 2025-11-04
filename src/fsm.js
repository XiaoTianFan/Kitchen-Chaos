// Narrative FSM and meters per PRD

export class FSM {
  constructor(cfg) {
    this.config = cfg || {};
    this.state = (cfg?.fsm?.initialState) || 'Preparing';
    this.t = 0; // global seconds
    this.tState = 0; // seconds in current state
    this.accidentsCount = 0;

    // meters
    this.heat = 0;
    this.taskLoad = 0;
    this.stoveOn = false;

    // thresholds
    this.T1 = 10; this.T2 = 25; this.T3 = 40; this.T4 = 55;
    this.L1 = 6; this.L2 = 12; this.A2 = 6;

    // hooks
    this.onEnter = () => {};
    this.onExit = () => {};
  }

  setHooks({ onEnter, onExit } = {}) {
    if (typeof onEnter === 'function') this.onEnter = onEnter;
    if (typeof onExit === 'function') this.onExit = onExit;
  }

  setStove(on) {
    this.stoveOn = !!on;
  }

  bumpMicrowave() {
    // Microwave adds fixed Heat bump (+5)
    this.heat += 5;
  }

  recordUserAction() {
    // +1 per action
    const inc = this.config?.meters?.taskLoad?.incPerAction ?? 1.0;
    this.taskLoad += inc;
  }

  recordAccident() {
    this.accidentsCount += 1;
  }

  tick(dtSec) {
    // time
    this.t += dtSec;
    this.tState += dtSec;

    // meters
    const heatInc = this.config?.meters?.heat?.incPerSec ?? 1.0;
    const heatDec = this.config?.meters?.heat?.decPerSec ?? 0.3;
    const taskDec = this.config?.meters?.taskLoad?.decPerSec ?? 0.2;

    if (this.stoveOn) {
      this.heat += heatInc * dtSec;
    } else {
      this.heat -= heatDec * dtSec;
    }
    this.heat = Math.max(0, this.heat);

    this.taskLoad -= taskDec * dtSec;
    this.taskLoad = Math.max(0, this.taskLoad);

    // transitions
    this._checkTransitions();
  }

  _enter(next, reason) {
    if (next === this.state) return;
    const prev = this.state;
    const t = this.t;
    this.onExit?.({ state: prev, t, reason });
    this.state = next;
    this.tState = 0;
    this.onEnter?.({ state: next, t });
  }

  _checkTransitions() {
    const s = this.state;
    if (s === 'Preparing') {
      if (this.stoveOn) {
        this._enter('Cooking', 'stove_on');
        return;
      }
      if (this.tState >= 60) {
        // Force transition; stove toggles on at last interaction x (handled elsewhere)
        this.stoveOn = true;
        this._enter('Cooking', 'timeout_force');
        return;
      }
    } else if (s === 'Cooking') {
      if (this.heat >= this.T3 || (this.tState >= 60 && this.stoveOn)) {
        this._enter('Accident Breakout', this.heat >= this.T3 ? 'heat_T3' : 'timeout');
        return;
      }
      if (this.tState >= 60 && !this.stoveOn) {
        this.stoveOn = true; // force on
      }
    } else if (s === 'Accident Breakout') {
      if (this.heat >= this.T4 || this.accidentsCount >= this.A2 || this.tState >= 60) {
        this._enter('Chaos', this.heat >= this.T4 ? 'heat_T4' : (this.accidentsCount >= this.A2 ? 'accidents_A2' : 'timeout'));
        return;
      }
    } else if (s === 'Chaos') {
      // End behavior handled outside (audio cut and fade) at 60 s
    }
  }
}


