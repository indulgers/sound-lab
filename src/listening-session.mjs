const LIMIT_MS = 10 * 60 * 1000;
const STORAGE_KEY = 'sound-lab.listening-deadline';
const FREE_SOUNDS = new Set([
  'rain', 'wind', 'waves', 'stream', 'birds', 'fire', 'cafe', 'traffic',
  'piano', 'guitar', 'keyboard', 'rural',
]);

function createSession(storage, now = Date.now) {
  function readDeadline() {
    try {
      const saved = Number(storage.getItem(STORAGE_KEY));
      return Number.isFinite(saved) && saved > 0 ? saved : null;
    } catch (error) {
      return null;
    }
  }

  let deadline = readDeadline();

  function startWindow() {
    deadline = now() + LIMIT_MS;
    try { storage.setItem(STORAGE_KEY, String(deadline)); } catch (error) { /* Page state still applies. */ }
  }

  function remaining() {
    return deadline === null ? null : Math.min(LIMIT_MS, Math.max(0, deadline - now()));
  }

  return {
    remaining,
    begin() {
      if (deadline === null) deadline = readDeadline();
      if (deadline === null) startWindow();
      return remaining() > 0;
    },
    restart() {
      if (remaining() !== 0) return false;
      startWindow();
      return true;
    },
  };
}

function isFreeSound(id) {
  return FREE_SOUNDS.has(id);
}

function freeMix(mix) {
  return Object.fromEntries(Object.entries(mix).filter(([id, level]) => (
    isFreeSound(id) && Number.isFinite(level) && level > 0
  )).map(([id, level]) => [id, Math.min(1, level)]));
}

export { createSession, freeMix, isFreeSound };
