// Pointer input controller → normalized actions

export class InputController {
  constructor(target, onAction) {
    this.target = target;
    this.onAction = typeof onAction === 'function' ? onAction : () => {};
    this.active = false;
    this.pointerId = null;
    this.startX = 0;
    this.startY = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.startTime = 0;
    this.holdTimer = 0;
    this.holding = false;
    this.dragging = false;

    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);

    if (this.target) {
      this.target.addEventListener('pointerdown', this._onDown);
      window.addEventListener('pointermove', this._onMove, { passive: true });
      window.addEventListener('pointerup', this._onUp, { passive: true });
      window.addEventListener('pointercancel', this._onUp, { passive: true });
      window.addEventListener('blur', this._onUp);
    }
  }

  destroy() {
    if (this.target) {
      this.target.removeEventListener('pointerdown', this._onDown);
      window.removeEventListener('pointermove', this._onMove);
      window.removeEventListener('pointerup', this._onUp);
      window.removeEventListener('pointercancel', this._onUp);
      window.removeEventListener('blur', this._onUp);
    }
  }

  _normalize(e) {
    const rect = this.target.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }

  _onDown(e) {
    if (this.active) return;
    this.active = true;
    this.pointerId = e.pointerId;
    const p = this._normalize(e);
    this.startX = this.lastX = p.x;
    this.startY = this.lastY = p.y;
    this.startTime = performance.now();
    this.holding = false;
    this.dragging = false;
    clearTimeout(this.holdTimer);
    this.holdTimer = setTimeout(() => {
      if (!this.active) return;
      this.holding = true;
      this.onAction({ type: 'hold', phase: 'start', x: this.lastX, y: this.lastY, tHeldMs: 0, dx: 0, dy: 0, angle: 0 });
    }, 220);
  }

  _onMove(e) {
    if (!this.active || e.pointerId !== this.pointerId) return;
    const p = this._normalize(e);
    const dx = p.x - this.lastX;
    const dy = p.y - this.lastY;
    this.lastX = p.x;
    this.lastY = p.y;
    const angle = Math.atan2(dy, dx);
    if (this.holding) {
      const tHeldMs = performance.now() - this.startTime;
      this.onAction({ type: 'hold', phase: 'move', x: p.x, y: p.y, tHeldMs, dx, dy, angle });
    } else {
      const dist = Math.hypot(p.x - this.startX, p.y - this.startY);
      if (dist > 0.01) {
        clearTimeout(this.holdTimer);
        const isStart = !this.dragging;
        this.dragging = true;
        this.onAction({ type: 'drag', x: p.x, y: p.y, dx, dy, angle, isStart, isEnd: false });
      }
    }
  }

  _onUp(e) {
    if (!this.active || e.pointerId !== this.pointerId) return;
    clearTimeout(this.holdTimer);
    const p = this._normalize(e);
    const dt = performance.now() - this.startTime;
    const dist = Math.hypot(p.x - this.startX, p.y - this.startY);
    if (this.holding) {
      this.onAction({ type: 'hold', phase: 'end', x: p.x, y: p.y, tHeldMs: dt, dx: 0, dy: 0, angle: 0 });
    } else if (dist <= 0.01 && dt < 220) {
      this.onAction({ type: 'click', x: p.x, y: p.y });
    } else {
      const wasDragging = this.dragging;
      this.onAction({ type: 'drag', x: p.x, y: p.y, isStart: false, isEnd: true, dx: 0, dy: 0, angle: 0 });
    }
    this.active = false;
    this.pointerId = null;
    this.dragging = false;
  }
}


