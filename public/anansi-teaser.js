(() => {
  const canvas = document.getElementById('anansi-teaser-canvas');
  const section = canvas?.closest('.anansi-portal');
  if (!canvas || !section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let active = false;
  let frame = 0;
  let lastFrame = 0;
  const points = [];
  const links = [];
  let seed = 192837;
  const random = () => {
    seed = Math.imul(seed ^ seed >>> 15, seed | 1);
    seed ^= seed + Math.imul(seed ^ seed >>> 7, seed | 61);
    return ((seed ^ seed >>> 14) >>> 0) / 4294967296;
  };

  const build = () => {
    points.length = 0;
    links.length = 0;
    const count = window.innerWidth < 650 ? 180 : 310;
    for (let index = 0; index < count; index += 1) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      const fold = 1 + Math.sin(theta * 8 + phi * 5) * .07 + (random() - .5) * .05;
      const sinPhi = Math.sin(phi);
      let x = Math.cos(theta) * sinPhi * 230 * fold;
      const y = Math.cos(phi) * 170;
      const z = Math.sin(theta) * sinPhi * 185 * fold;
      x += Math.sign(x || 1) * 8;
      points.push({ x, y, z, size: .6 + random() * 1.3, phase: random() * 6.28 });
    }
    points.forEach((point, index) => {
      const nearest = [];
      points.forEach((candidate, candidateIndex) => {
        if (candidateIndex <= index) return;
        const dx = point.x - candidate.x;
        const dy = point.y - candidate.y;
        const dz = point.z - candidate.z;
        const distance = dx * dx + dy * dy + dz * dz;
        if (distance < 4200) nearest.push({ index: candidateIndex, distance });
      });
      nearest.sort((a, b) => a.distance - b.distance).slice(0, 2).forEach((candidate) => links.push([index, candidate.index, random()]));
    });
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1 : 1.4);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = (time) => {
    context.clearRect(0, 0, width, height);
    const rotation = time * .00008;
    const centerX = width * (window.innerWidth < 650 ? .52 : .76);
    const centerY = height * (window.innerWidth < 650 ? .35 : .5);
    const scale = Math.min(width / 1200, height / 760) * (window.innerWidth < 650 ? 1.2 : 1.55);
    const projected = points.map((point) => {
      const cosine = Math.cos(rotation);
      const sine = Math.sin(rotation);
      const x = point.x * cosine - point.z * sine;
      const z = point.x * sine + point.z * cosine;
      const perspective = 650 / (740 + z * scale);
      return { x: centerX + x * scale * perspective, y: centerY + point.y * scale * perspective, z, perspective };
    });
    context.save();
    context.globalCompositeOperation = 'lighter';
    links.forEach((link, index) => {
      const from = projected[link[0]];
      const to = projected[link[1]];
      const depth = Math.max(.05, Math.min(.55, (from.z + to.z + 350) / 700));
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.strokeStyle = `rgba(122,255,194,${.025 + depth * .1})`;
      context.lineWidth = .55;
      context.stroke();
      if ((index + Math.floor(time * .004)) % 43 === 0) {
        const amount = (time * .0003 + link[2]) % 1;
        context.beginPath();
        context.arc(from.x + (to.x - from.x) * amount, from.y + (to.y - from.y) * amount, 1.8, 0, Math.PI * 2);
        context.fillStyle = 'rgba(206,255,228,.8)';
        context.shadowColor = '#7affc2';
        context.shadowBlur = 8;
        context.fill();
      }
    });
    context.shadowBlur = 0;
    points.forEach((point, index) => {
      const projectedPoint = projected[index];
      const alpha = Math.max(.12, Math.min(.9, (projectedPoint.z + 270) / 540));
      context.beginPath();
      context.arc(projectedPoint.x, projectedPoint.y, Math.max(.45, point.size * projectedPoint.perspective), 0, Math.PI * 2);
      context.fillStyle = `rgba(${point.x > 0 ? '122,255,194' : '99,223,255'},${alpha * (.65 + Math.sin(time * .0015 + point.phase) * .2)})`;
      context.fill();
    });
    context.restore();
  };

  const animate = (time) => {
    if (!active) { frame = 0; return; }
    if (time - lastFrame > 1000 / 35) {
      draw(time);
      lastFrame = time;
    }
    frame = requestAnimationFrame(animate);
  };
  const start = () => { if (!frame && active) frame = requestAnimationFrame(animate); };
  new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (active) start();
  }, { root: document.getElementById('splash-screen'), rootMargin: '25% 0px' }).observe(section);
  window.addEventListener('resize', () => { resize(); build(); }, { passive: true });
  build();
  resize();
})();
