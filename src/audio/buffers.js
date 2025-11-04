// Audio buffer preload utilities

let buffersById = new Map();

export function getBuffer(id) {
  return buffersById.get(id) || null;
}

export async function preloadAllBuffers(audioEngine, sounds, { basePath = '/assets/audio/' } = {}) {
  if (!Array.isArray(sounds)) return new Map();
  const jobs = [];
  const ids = [];
  console.log(`[buffers] Preloading ${sounds.length} sounds from basePath: '${basePath}'`);
  for (const s of sounds) {
    if (!s?.file || !s?.id) {
      console.warn(`[buffers] Skipping invalid sound entry:`, s);
      continue;
    }
    // Ensure basePath ends with /
    const cleanBase = basePath.endsWith('/') ? basePath : basePath + '/';
    const url = cleanBase + s.file;
    // Construct full URL for debugging
    const fullUrl = new URL(url, window.location.origin).href;
    console.log(`[buffers] Loading '${s.id}': file='${s.file}' → URL='${url}' → full='${fullUrl}'`);
    ids.push(s.id);
    // Wrap each decode in a promise that catches errors individually
    jobs.push(
      audioEngine.fetchAndDecode(url)
        .then(buffer => {
          console.log(`[buffers] ✓ Successfully loaded '${s.id}'`);
          return { success: true, id: s.id, buffer };
        })
        .catch(err => {
          console.error(`[buffers] ✗ Failed to load '${s.id}' from '${url}' (full: '${fullUrl}'):`, err.message || err);
          return { success: false, id: s.id, buffer: null };
        })
    );
  }
  const results = await Promise.all(jobs);
  buffersById = new Map();
  results.forEach((result) => {
    if (result.success && result.buffer) {
      buffersById.set(result.id, result.buffer);
    }
  });
  return buffersById;
}


