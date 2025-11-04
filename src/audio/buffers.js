// Audio buffer preload utilities

let buffersById = new Map();

export function getBuffer(id) {
  return buffersById.get(id) || null;
}

export async function preloadAllBuffers(audioEngine, sounds, { basePath = './assets/audio/' } = {}) {
  if (!Array.isArray(sounds)) return new Map();
  const jobs = [];
  const ids = [];
  for (const s of sounds) {
    if (!s?.file || !s?.id) continue;
    const url = basePath + s.file;
    ids.push(s.id);
    jobs.push(audioEngine.fetchAndDecode(url));
  }
  const results = await Promise.all(jobs);
  buffersById = new Map();
  results.forEach((buf, i) => {
    buffersById.set(ids[i], buf);
  });
  return buffersById;
}


