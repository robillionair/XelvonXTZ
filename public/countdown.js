(() => {
  const betaEndsAt = Date.parse('2026-07-20T21:59:59Z');
  const roots = [...document.querySelectorAll('[data-beta-countdown]')];
  if (!roots.length) return;

  const twoDigits = (value) => String(Math.max(0, value)).padStart(2, '0');

  const render = () => {
    const remaining = Math.max(0, betaEndsAt - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);
    const values = {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60
    };

    roots.forEach((root) => {
      Object.entries(values).forEach(([unit, value]) => {
        const element = root.querySelector(`[data-countdown-${unit}]`);
        if (!element) return;
        const next = twoDigits(value);
        if (element.textContent !== next) {
          element.textContent = next;
          element.classList.remove('is-ticking');
          requestAnimationFrame(() => element.classList.add('is-ticking'));
        }
      });
      root.classList.toggle('is-ended', remaining === 0);
      root.setAttribute('aria-label', remaining === 0
        ? 'The Xelvon beta testing window has ended.'
        : `${values.days} days, ${values.hours} hours, ${values.minutes} minutes and ${values.seconds} seconds until beta testing closes.`);
    });
  };

  render();
  const timer = window.setInterval(render, 1000);
  window.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
})();
