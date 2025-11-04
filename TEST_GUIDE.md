# Kitchen Chaos — Test Guidance and Expected Behavior

## 1) Scope and setup
- Experience: Single-page web app with Three.js visuals and Web Audio. All sounds and visuals are driven by pointer interactions and the finite state machine (FSM).
- Supported: Recent Chrome, Safari, Firefox on desktop and mobile, both orientations.
- Hosting: Any static server. Example (Node): `npx http-server .` or VS Code Live Server. Opening from file:// may block ESM imports or audio.
- Entry: `index.html` loads `src/main.js` as an ES module. Config at `config/app.json`.
- Assets: WAV files under `assets/audio/`. Filenames with spaces are URL-encoded in config.

## 2) Quick smoke test (sanity)
1. Load the page. Verify a full-screen canvas and a dim “Tap to start audio” overlay.
2. Tap/click once. Overlay should hide; an initial prompt appears (“Maybe light something.”). No errors in console.
3. Click bottom-left area (≈ left third, bottom third): stove toggles on, a pastel heat ring spawns. Heat meter should begin rising over time (indirectly tested via state progression below).
4. Click bottom-right area (≈ right third, bottom third): tap toggles on, ripple visual appears.
5. Drag anywhere top→down: water pour one-shot plays; a blue ribbon visual follows. If stove is on, a boiling-water bed should start.
6. Click top-center: microwave one-shot plays; a pulsing grid visual appears; heat bumps.

If any step fails, open DevTools console with `?debug=1` and note logs.

## 3) Debug logging (enable with ?debug=1)
- Add `?debug=1` to the URL to enable console-only logs.
- Events include: `app:init`, `app:assets_loaded`, `audio:context_unlocked`, `user:action`, `state:enter`, `auto:accident_scheduled`, `auto:accident_spawn`.
- Each log contains: monotonically increasing `id`, `sessionId`, `state`, `t` (seconds), and event payload.

## 4) Interaction grammar (expected)
- Click:
  - Bottom-left: toggle `stove` sustained. Heat ring visual spawns at click position.
  - Bottom-right: toggle `tap` sustained. Ripple visual at click.
  - Top-center: `microwave` one-shot. Microwave grid visual near click; heat +5.
  - Elsewhere: one-shot from set {bag rustling, glass clink, lighter} with corresponding short visual (wrinkle, starburst, flare).
- Click and hold (start): `cooking spray` one-shot, spray cone visual.
- Drag:
  - `water pour` one-shot at drag start; ribbon follows cursor path downward. If stove is on, `boiling_water` sustained starts.

Note: In later iterations you can extend mappings to all PRD user-triggered sounds. This build prioritizes core coverage to validate flow and timing.

## 5) FSM and meters (expected behavior)
- Meters:
  - Heat: +1/s while stove is on; microwave adds +5; decays at 0.3/s when stove is off.
  - TaskLoad: +1 per user-triggered action; decays 0.2/s.
- States and timings (each state ≤60s):
  - Preparing
    - Prompt: “Maybe light something.”
    - Transition to Cooking immediately when stove toggles on or microwave starts.
    - If no trigger by 60s, force-transition and set stove on.
  - Cooking
    - Threshold injections (deterministic schedule):
      - At Heat ≥ 10 and TaskLoad ≥ 6 → schedule `clatter` auto accident.
      - At Heat ≥ 25 and TaskLoad ≥ 12 → schedule `thing breaking` auto accident.
    - Transition to Accident Breakout when Heat ≥ 40, or at 60s while stove is on; otherwise force stove on at 60s.
  - Accident Breakout
    - Every user action schedules an auto accident (cycle: clatter → thing breaking → thump) with a fixed 200 ms delay.
    - Transition to Chaos at Heat ≥ 55, OR after 6 accidents in this state, OR at 60s.
  - Chaos
    - Fire alarm (sustained) starts and moves. Every user action continues scheduling accidents in the same cycle/200 ms delay.
    - End at 60s with hard audio cut, white blink (~100 ms), then fade to black (~1.5 s). Visuals are destroyed afterward.

## 6) Accidents (expected)
- Schedule delay: 200 ms from the triggering event.
- Cycle order: `clatter` → `thing_breaking` → `thump` → repeat.
- Spawn position: random across the viewport using a seeded RNG for reproducibility.
- Each spawn:
  - Plays a one-shot at the spawn x-position (panned accordingly).
  - Spawns an accident visual (short burst; 0.5–1.2 s).

## 7) Audio expectations
- Unlock: Audio context resumes on first user interaction; if blocked, overlay remains until a subsequent interaction.
- Panning: Horizontal pan follows normalized x in [-1..1]. For moving visuals (alarm orbit), panner follows visual x per frame.
- Routing per sound: Source → Gain → StereoPanner → Bus (beds/fx/accidents) → MasterCompressor → MasterLimiter → destination.
- Fades: Default short fades (≈15 ms in/30 ms out) to avoid clicks; sustained beds ramp up more slowly (≈300 ms) on start.
- End behavior: “Hard cut” at Chaos end—master gain drops to silence instantly before blink/fade.

## 8) Visual language (expected correlations)
- Stove: heat ring + shimmer around click position; static.
- Water pour: downward ribbon following drag path; short lifespan; aqua/blue tones.
- Bag rustling: polygon wrinkle near cursor; 0.4–0.6 s.
- Glass clink: starburst shards; 0.5–0.8 s.
- Lighter: flare/heat burst; 0.3–0.5 s.
- Tap: ripple emitter with concentric rings.
- Boiling water: cluster of rising bubbles; stationary.
- Hissing pan: soft steam particles; stationary (expected to appear after stove on and cooking activity begins).
- Microwave: pulsing square grid for the sample length.
- Fire alarm: flashing circular spectrogram orbiting the canvas center (Chaos only).
- Accidents: short burst visuals at random screen positions; screen-shake feel optional.

## 9) Acceptance checks (must pass)
- Audio panning matches visual x-position within one animation frame.
- Deterministic state order: Preparing → Cooking → Accident Breakout → Chaos, with guards as specified.
- Chaos entry: fire alarm is audible and moving; any user action in Chaos schedules an accident 200 ms later.
- End sequence: audio cuts immediately to silence; white blink ≈100 ms; fade to black ≈1500 ms (±100 ms tolerance).
- Works on Chrome/Safari/Firefox desktop and mobile; audio unlock occurs on first user interaction.

## 10) Cross-browser/device matrix
Test at minimum:
- Desktop: Chrome (Win/Mac), Firefox (Win/Mac), Safari (Mac).
- Mobile: iOS Safari (latest), Android Chrome (latest).
- Orientations: portrait and landscape. Verify overlays, touch handling, and DPR sizing.

## 11) Detailed test scenarios

### A. Happy-path escalation (user-driven)
1. Start app; tap to unlock audio. Confirm “Preparing” prompt.
2. Click bottom-left to toggle stove on. Confirm heat ring visual and that Cooking state is entered (watch `state:enter` logs).
3. Trigger ~6 user actions quickly (e.g., clicks in center area) to raise TaskLoad. Confirm `TaskLoad` increment via progression behavior.
4. Wait until Heat ≥ 10 and TaskLoad ≥ 6. Confirm `auto:accident_scheduled` of type `clatter`, then `auto:accident_spawn` after ~200 ms.
5. Continue adding actions until Heat ≥ 25 and TaskLoad ≥ 12; confirm `thing_breaking` scheduled/spawned.
6. Keep stove on until Heat ≥ 40; confirm transition to Accident Breakout.
7. In Accident Breakout, perform a few user actions and confirm each action schedules a cycle accident after 200 ms.
8. After reaching either Heat ≥ 55 or 6 accidents (whichever comes first), confirm transition to Chaos.
9. In Chaos, confirm `fire_alarm` starts (audible) and moves, and every user action still schedules accidents at 200 ms delay.
10. After ~60 s in Chaos, confirm hard audio cut, white blink (~100 ms), fade to black (~1.5 s), and visuals cleared.

### B. Forced transition from Preparing
1. Do not toggle stove or microwave. Allow Preparing to reach 60 s.
2. Confirm force-transition: stove switches on, state enters Cooking.

### C. Water → Boiling dependency
1. Ensure stove is on.
2. Drag to pour water (top→down). Confirm water pour one-shot; shortly after, confirm boiling water sustained starts.

### D. Panning check
1. Trigger a one-shot at the far left; verify pan hard-left.
2. Repeat at far right; verify pan hard-right.
3. Observe alarm visual orbit: confirm pan follows its x-position over time.

### E. Mobile touch and orientation
1. On iOS Safari and Android Chrome, verify audio unlock with first tap.
2. Rotate device; confirm renderer resizes (DPR-aware), visuals fit, and inputs work.

## 12) Failure/edge handling
- Audio unlock blocked: overlay remains; subsequent taps should unlock.
- Missing WebGL: show fallback message (if driver/device fails); experience cannot continue.
- Buffer decode failure: console logs error; associated action should be inert (disabled affordance in future iteration).

## 13) Performance checks
- DPR sizing active (clamped). Confirm acceptable frame pacing on mobile.
- No large per-frame allocations in console (avoid GC bursts).
- Multiple concurrent one-shots should not clip—master compressor/limiter should prevent distortion.

## 14) Configuration tests (data-driven)
- `config/app.json` → toggle `meta.debug` and verify logging.
- Adjust `accidents.delayMs` (e.g., 300) and confirm schedule delay change in logs.
- Modify `fsm.initialState` to `Cooking` for a fast-path test; verify prompts.

## 15) Known notes
- Some sustained visual/audio pairings are simplified for first pass; mappings and analyzers can be refined later per PRD bands.
- Additional user-triggered sustained sounds (stirring, knife sharpen, juicing) can be expanded similarly to existing handlers.

---
If any acceptance check fails, capture console logs (with `?debug=1`), browser/device/OS versions, and steps to reproduce.

