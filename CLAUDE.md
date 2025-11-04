# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Cook the Waves" is an interactive audio-visual web experience that simulates a kitchen escalating from calm cooking to complete chaos. It's a single-page application built with vanilla JavaScript, Three.js for WebGL visuals, and Web Audio API for spatialized sound.

## Development Commands

### Running the Application
```bash
# Serve static files (any static server works)
npx http-server .
# or use VS Code Live Server extension
```

### Debug Mode
Add `?debug=1` to the URL to enable console logging with structured events including:
- `app:init`, `app:assets_loaded`
- `audio:context_unlocked`
- `user:action`, `state:enter`
- `auto:accident_scheduled`, `auto:accident_spawn`

### Testing
Follow the comprehensive test scenarios in `TEST_GUIDE.md` which includes:
- Manual testing procedures
- Cross-browser/device validation matrix
- Acceptance criteria for each state transition
- Performance and audio-visual sync checks

## Core Architecture

### Finite State Machine (FSM) Controller
The entire experience is driven by a 4-state narrative FSM in `src/fsm.js`:
1. **Preparing** → **Cooking** → **Accident Breakout** → **Chaos**

Each state has:
- Time limits (max 60 seconds)
- Specific UI prompts (from config)
- Deterministic transition conditions
- Meter-based thresholds (Heat, TaskLoad)

### Meter System
Two core meters drive state transitions:
- **Heat**: Increases when stove is on (+1/s), microwave adds +5, decays at 0.3/s
- **TaskLoad**: +1 per user action, decays at 0.2/s

### Audio-Visual Factory Pattern
- **Audio**: Centralized SoundManager (`src/audio/soundManager.js`) with bus routing (beds/fx/accidents)
- **Visuals**: Factory pattern with 16 different visual effects in `src/visuals/factories/`
- **Registry**: Central factory registry (`src/visuals/registry.js`) for creating visual effects

## Configuration-Driven Development

The entire experience is controlled through `config/app.json`:
- FSM state definitions and transitions
- Sound mappings to visual factories
- Meter rates and thresholds
- Accident scheduling parameters
- Debug flags and visual palette

**Key pattern**: All experience behavior can be modified by changing config values without touching code.

## Audio Architecture

Sophisticated Web Audio routing chain in `src/audio/audioEngine.js`:
```
Source → Gain → StereoPanner → Bus (beds/fx/accidents) → MasterCompressor → MasterLimiter → Destination
```

**Features:**
- Dynamic bus-based mixing
- Position-based audio panning (follows visual x-position)
- Master compression and limiting to prevent clipping
- Sustained and one-shot sound support
- Audio context unlock flow for browser compliance

## Visual System

Three.js-based rendering (`src/visuals/renderer.js`) with:
- Device pixel ratio support for crisp visuals (clamped 1-3)
- Orthographic camera for 2D-style presentation
- Factory pattern for 16 different visual effects
- Candy pastel aesthetic
- Real-time audio-reactive visuals

## Main Application Flow

The bootstrap sequence in `src/main.js` follows this order:
1. Load configuration from `config/app.json`
2. Initialize AudioEngine and preload all audio buffers
3. Set up FSM, RulesEngine, and InputController
4. Configure Three.js renderer
5. Start RAF loop with integrated updates

**Event Flow:**
```
User Input → InputController → SoundManager → AudioEngine
                ↓
            FSM → RulesEngine → AccidentScheduler
                ↓
            VisualFactory → Renderer
```

## Input System

Unified pointer input handling in `src/input.js`:
- Click, drag, and hold gestures
- Normalized coordinate system (0-1)
- Multi-touch support
- Gesture recognition (tap vs drag vs hold)

**Interaction Mapping** (from main.js:124-144):
- Bottom-left: Toggle stove (sustained)
- Bottom-right: Toggle tap (sustained)
- Top-center: Microwave (one-shot)
- Elsewhere: Random one-shots (bag rustling, glass clink, lighter)
- Drag: Water pour with ribbon visual
- Hold: Cooking spray

## Key Integration Points

### State Transitions
- FSM drives all state changes via `src/fsm.js`
- RulesEngine (`src/rules.js`) evaluates meter thresholds
- AccidentScheduler (`src/accidents.js`) manages automatic accidents
- UI prompts update via `src/ui.js`

### Audio-Visual Synchronization
- SoundManager coordinates with visual factories
- Panning follows visual x-position in real-time
- Accident visuals spawn at seeded random positions
- Alarm orbit includes dynamic panning updates

### End Sequence
Chaos state ends after 60 seconds with:
- Hard audio cut (master gain to 0)
- White blink (~100ms)
- Fade to black (~1500ms)
- Visual cleanup

## Important File Relationships

- `config/app.json` → All experience parameters
- `src/main.js` → Bootstrap and input mapping
- `src/fsm.js` → Narrative controller
- `src/audio/soundManager.js` → Audio coordination
- `src/visuals/registry.js` → Visual factory creation
- `TEST_GUIDE.md` → Comprehensive testing procedures

## Development Notes

- **No build process required** - uses direct ES6 module imports
- **Three.js loaded from CDN** - no local bundling
- **Static file serving sufficient** for development
- **Browser compatibility**: Modern browsers with Web Audio API and WebGL
- **Mobile responsive**: Handles touch events and orientation changes
- **Performance optimized**: DPR-aware rendering, efficient object pooling