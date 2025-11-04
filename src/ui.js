// UI prompts and end sequence overlays

const promptEl = document.getElementById('prompt');

export function setPromptText(text) {
  if (!promptEl) return;
  if (!text) {
    promptEl.classList.remove('visible');
    promptEl.textContent = '';
  } else {
    promptEl.textContent = text;
    promptEl.classList.add('visible');
  }
}

export async function whiteBlinkAndFade({ blinkMs = 100, fadeMs = 1500 } = {}) {
  const blink = document.createElement('div');
  blink.style.position = 'fixed';
  blink.style.inset = '0';
  blink.style.background = '#ffffff';
  blink.style.zIndex = '9999';
  blink.style.opacity = '1';
  document.body.appendChild(blink);
  await waitMs(blinkMs);

  const fade = document.createElement('div');
  fade.style.position = 'fixed';
  fade.style.inset = '0';
  fade.style.background = '#000000';
  fade.style.zIndex = '9998';
  fade.style.opacity = '0';
  fade.style.transition = `opacity ${fadeMs}ms linear`;
  document.body.appendChild(fade);

  requestAnimationFrame(() => { fade.style.opacity = '1'; });
  await waitMs(fadeMs + 50);
  return { blink, fade };
}

function waitMs(ms) { return new Promise(r => setTimeout(r, ms)); }


