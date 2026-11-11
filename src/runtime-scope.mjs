export function createRuntimeScope() {
  const listeners = new AbortController();
  const timeouts = new Set();
  const intervals = new Set();
  const frames = new Set();

  return {
    listen(target, type, handler, options) {
      target.addEventListener(type, handler, { ...options, signal: listeners.signal });
    },
    setTimeout(handler, delay) {
      const id = window.setTimeout(() => { timeouts.delete(id); handler(); }, delay);
      timeouts.add(id);
      return id;
    },
    clearTimeout(id) {
      window.clearTimeout(id);
      timeouts.delete(id);
    },
    setInterval(handler, delay) {
      const id = window.setInterval(handler, delay);
      intervals.add(id);
      return id;
    },
    clearInterval(id) {
      window.clearInterval(id);
      intervals.delete(id);
    },
    requestAnimationFrame(handler) {
      const id = window.requestAnimationFrame(time => { frames.delete(id); handler(time); });
      frames.add(id);
      return id;
    },
    cancelAnimationFrame(id) {
      window.cancelAnimationFrame(id);
      frames.delete(id);
    },
    dispose() {
      listeners.abort();
      timeouts.forEach(id => window.clearTimeout(id));
      intervals.forEach(id => window.clearInterval(id));
      frames.forEach(id => window.cancelAnimationFrame(id));
      timeouts.clear();
      intervals.clear();
      frames.clear();
    },
  };
}
