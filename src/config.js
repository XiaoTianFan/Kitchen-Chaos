// Config loader and validator for Kitchen Chaos (plain JS, no bundler)

let appConfig = null;

export function parseDebugFlag() {
  try {
    const usp = new URLSearchParams(location.search);
    const v = usp.get('debug');
    if (v === null) return null;
    if (v === '' || v === '1' || v.toLowerCase() === 'true') return true;
    if (v === '0' || v.toLowerCase() === 'false') return false;
    return null;
  } catch (_) {
    return null;
  }
}

function applyDefaults(user) {
  const defaults = {
    meta: { version: 1, debug: false, palette: 'candyPastels' },
    meters: {
      heat: { incPerSec: 1.0, decPerSec: 0.3 },
      taskLoad: { incPerAction: 1.0, decPerSec: 0.2 }
    },
    accidents: { cycle: ['clatter', 'thing_breaking', 'thump'], delayMs: 200 },
    fsm: { initialState: 'Preparing', states: [] },
    sounds: []
  };

  const merged = {
    meta: { ...defaults.meta, ...(user?.meta || {}) },
    meters: {
      heat: { ...defaults.meters.heat, ...(user?.meters?.heat || {}) },
      taskLoad: { ...defaults.meters.taskLoad, ...(user?.meters?.taskLoad || {}) }
    },
    accidents: { ...defaults.accidents, ...(user?.accidents || {}) },
    fsm: { ...defaults.fsm, ...(user?.fsm || {}) },
    sounds: Array.isArray(user?.sounds) ? user.sounds.slice() : []
  };

  return merged;
}

export function validateAppConfig(cfg) {
  const errors = [];
  function isNum(n) { return typeof n === 'number' && isFinite(n); }

  if (!cfg || typeof cfg !== 'object') errors.push('Config root must be an object.');

  if (typeof cfg.meta?.version !== 'number') errors.push('meta.version must be a number.');
  if (typeof cfg.meta?.palette !== 'string') errors.push('meta.palette must be a string.');

  if (!isNum(cfg.meters?.heat?.incPerSec)) errors.push('meters.heat.incPerSec must be a number.');
  if (!isNum(cfg.meters?.heat?.decPerSec)) errors.push('meters.heat.decPerSec must be a number.');
  if (!isNum(cfg.meters?.taskLoad?.incPerAction)) errors.push('meters.taskLoad.incPerAction must be a number.');
  if (!isNum(cfg.meters?.taskLoad?.decPerSec)) errors.push('meters.taskLoad.decPerSec must be a number.');

  if (!Array.isArray(cfg.accidents?.cycle) || cfg.accidents.cycle.length === 0) errors.push('accidents.cycle must be a non-empty array.');
  if (!isNum(cfg.accidents?.delayMs)) errors.push('accidents.delayMs must be a number.');

  if (!cfg.fsm || typeof cfg.fsm.initialState !== 'string') errors.push('fsm.initialState must be a string.');
  if (!Array.isArray(cfg.fsm?.states)) errors.push('fsm.states must be an array.');
  else {
    const names = new Set(cfg.fsm.states.map(s => s?.name).filter(Boolean));
    if (!names.has(cfg.fsm.initialState)) errors.push(`fsm.initialState '${cfg.fsm.initialState}' not found in states.`);
  }

  if (!Array.isArray(cfg.sounds)) errors.push('sounds must be an array.');
  else {
    for (const s of cfg.sounds) {
      if (!s || typeof s !== 'object') { errors.push('sound entry must be an object.'); continue; }
      if (typeof s.id !== 'string') errors.push('sound.id must be a string.');
      if (typeof s.file !== 'string') errors.push(`sound.file must be a string for sound '${s.id || '<unknown>'}'.`);
      if (typeof s.type !== 'string') errors.push(`sound.type must be a string for sound '${s.id || '<unknown>'}'.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export async function loadAppConfig(path = './config/app.json') {
  let user;
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    user = await res.json();
  } catch (err) {
    console.error('Failed to load config:', err);
    throw err;
  }

  let cfg = applyDefaults(user);

  const dbg = parseDebugFlag();
  if (dbg !== null) cfg.meta.debug = !!dbg;

  const v = validateAppConfig(cfg);
  if (!v.ok) {
    console.warn('[config] validation issues:', v.errors);
  }

  appConfig = cfg;
  return cfg;
}

export function getAppConfig() {
  if (!appConfig) throw new Error('App config not loaded yet. Call loadAppConfig() first.');
  return appConfig;
}


