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

  goTo(stateName, reason = 'manual') {
    this._enter(stateName, reason);
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

  _checkTransitions() {}
}


