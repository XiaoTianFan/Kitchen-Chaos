// Rules engine: triggers accidents and gating based on FSM/meters

export class RulesEngine {
  constructor(fsm, cfg, hooks = {}) {
    this.fsm = fsm;
    this.cfg = cfg || {};
    this.hooks = {
      scheduleAccident: hooks.scheduleAccident || (() => {}),
      ensureAlarm: hooks.ensureAlarm || (() => {})
    };
    this.injectedClatter = false;
    this.injectedBreaking = false;
  }

  handleEnterState(stateName) {
    if (stateName === 'Chaos') {
      this.hooks.ensureAlarm();
    }
    if (stateName === 'Cooking') {
      // reset injections when entering Cooking
      this.injectedClatter = false;
      this.injectedBreaking = false;
    }
  }

  tick() {
    const s = this.fsm.state;
    if (s === 'Cooking') {
      if (!this.injectedClatter && this.fsm.heat >= this.fsm.T1 && this.fsm.taskLoad >= this.fsm.L1) {
        this.injectedClatter = true;
        this.hooks.scheduleAccident('clatter', 0, 'threshold_T1_L1');
      }
      if (!this.injectedBreaking && this.fsm.heat >= this.fsm.T2 && this.fsm.taskLoad >= this.fsm.L2) {
        this.injectedBreaking = true;
        this.hooks.scheduleAccident('thing_breaking', 0, 'threshold_T2_L2');
      }
    }
  }

  onUserAction() {
    const s = this.fsm.state;
    const delay = this.cfg?.accidents?.delayMs ?? 200;
    if (s === 'Accident Breakout' || s === 'Chaos') {
      this.hooks.scheduleAccident('cycle', delay, 'user_action_cycle');
    }
  }
}


