(() => {
  const canvas = document.getElementById('anansi-teaser-canvas');
  const section = canvas?.closest('.anansi-portal');
  if (!canvas || !section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const context = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!context) return;

  const lite = document.documentElement.classList.contains('flow-lite');
  const mobile = window.matchMedia('(max-width:650px)').matches;
  let width = 0;
  let height = 0;
  let frame = 0;
  let active = false;
  let lastFrame = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, lite || mobile ? 1 : 1.15);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const spider = (x, y, scale, time) => {
    context.save();
    context.translate(x, y);
    context.rotate(-.55 + Math.sin(time * .00045) * .08);
    context.scale(scale, scale);
    context.lineCap = 'round';
    for (const side of [-1, 1]) {
      for (let leg = 0; leg < 4; leg += 1) {
        const base = -12 + leg * 8;
        const motion = Math.sin(time * .003 + leg) * 1.5;
        context.beginPath();
        context.moveTo(side * 7, base * .4);
        context.quadraticCurveTo(side * (22 + leg * 2), base - 14 + leg * 9 + motion, side * (42 + leg * 4), base - 22 + leg * 15 - motion);
        context.strokeStyle = 'rgba(2,4,4,.9)';
        context.lineWidth = 4;
        context.stroke();
        context.strokeStyle = 'rgba(222,182,111,.72)';
        context.lineWidth = 1.25;
        context.stroke();
      }
    }
    const abdomen = context.createRadialGradient(-5, -8, 1, 0, 2, 22);
    abdomen.addColorStop(0, '#e5d2a9');
    abdomen.addColorStop(.18, '#77694f');
    abdomen.addColorStop(.7, '#171d19');
    abdomen.addColorStop(1, '#030504');
    context.fillStyle = abdomen;
    context.beginPath();
    context.ellipse(0, 5, 16, 21, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(222,182,111,.5)';
    context.lineWidth = .8;
    context.stroke();
    context.fillStyle = '#1c2420';
    context.beginPath();
    context.ellipse(0, -16, 11, 12, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const draw = (time) => {
    context.clearRect(0, 0, width, height);
    const cx = width * (mobile ? .5 : .78);
    const cy = height * (mobile ? .35 : .5);
    const radius = Math.min(width * .38, height * .43);
    const strands = mobile ? 9 : 12;
    const rings = mobile ? 6 : 8;
    context.save();
    context.lineCap = 'round';
    for (let strand = 0; strand < strands; strand += 1) {
      const angle = -Math.PI / 2 + strand / strands * Math.PI * 2;
      context.beginPath();
      context.moveTo(cx, cy);
      context.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * .74);
      context.strokeStyle = strand % 4 === 0 ? 'rgba(224,196,140,.28)' : 'rgba(191,211,200,.14)';
      context.lineWidth = strand % 4 === 0 ? .8 : .45;
      context.stroke();
    }
    for (let ring = 1; ring <= rings; ring += 1) {
      context.beginPath();
      for (let strand = 0; strand <= strands; strand += 1) {
        const angle = -Math.PI / 2 + (strand % strands) / strands * Math.PI * 2;
        const r = radius * ring / rings;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r * .74;
        if (!strand) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.closePath();
      context.strokeStyle = `rgba(204,221,212,${.055 + ring / rings * .08})`;
      context.lineWidth = .5;
      context.stroke();
    }
    context.restore();
    const orbit = time * .00022;
    spider(cx + Math.cos(orbit) * radius * .58, cy + Math.sin(orbit) * radius * .43, mobile ? .72 : 1, time);
  };

  const animate = (time) => {
    if (!active) { frame = 0; return; }
    if (time - lastFrame >= 1000 / (lite || mobile ? 24 : 32)) {
      lastFrame = time;
      draw(time);
    }
    frame = requestAnimationFrame(animate);
  };
  const start = () => { if (!frame && active) frame = requestAnimationFrame(animate); };
  new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (active) start();
  }, { root: document.getElementById('splash-screen'), rootMargin: '25% 0px' }).observe(section);
  window.addEventListener('resize', resize, { passive: true });
  resize();
})();
