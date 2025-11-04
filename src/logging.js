// Debug logging utility per PRD 13

let eventId = 0;
let sessionId = null;
let getStateFn = () => 'Unknown';
let enabled = false;

export function initLogging({ debug = false, getState }) {
  enabled = !!debug;
  sessionId = sessionId || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  if (typeof getState === 'function') getStateFn = getState;
}

export function log(eventType, payload = {}) {
  if (!enabled) return;
  const entry = {
    id: ++eventId,
    sessionId,
    state: safeGetState(),
    t: performance.now() / 1000,
    type: eventType,
    ...payload
  };
  // console-only logging
  // eslint-disable-next-line no-console
  console.log('[log]', entry);
}

function safeGetState() {
  try { return getStateFn?.() ?? 'Unknown'; } catch (_) { return 'Unknown'; }
}


