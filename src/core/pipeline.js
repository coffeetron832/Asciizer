export function createPipeline({ fps = 60, onFrame }) {
  const frameInterval = 1000 / fps;

  let running = false;
  let timerId = null;
  let lastTime = 0;
  let latestBars = [];

  function update(bars) {
    if (!Array.isArray(bars) || bars.length === 0) {
      return;
    }

    if (bars.length !== latestBars.length) {
      const oldBars = latestBars;
      latestBars = new Array(bars.length).fill(0);
      
      for (let i = 0; i < Math.min(oldBars.length, latestBars.length); i++) {
        latestBars[i] = oldBars[i];
      }
    }

    for (let i = 0; i < latestBars.length; i++) {
      const next = bars[i] || 0;

      if (next >= latestBars[i]) {
        latestBars[i] = latestBars[i] * 0.02 + next * 0.98;
      } else {
        latestBars[i] = latestBars[i] * 0.78 + next * 0.22;
      }
    }
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = Date.now();

    const loop = () => {
      if (!running) return;

      const now = Date.now();
      const delta = now - lastTime;

      if (delta >= frameInterval) {
        lastTime = now - (delta % frameInterval);
        onFrame(latestBars.slice());
      }

      const nextDelay = Math.max(0, frameInterval - (Date.now() - lastTime));
      timerId = setTimeout(loop, nextDelay);
    };

    loop();
  }

  function stop() {
    running = false;
    if (timerId) clearTimeout(timerId);
  }

  return { update, start, stop };
}
