(() => {
  const canvas = document.getElementById('anansi-web');
  const spiderCanvas = document.getElementById('anansi-spider');
  const story = document.getElementById('an-story');
  const chapters = [...document.querySelectorAll('[data-an-scene]')];
  const progressBar = document.getElementById('an-progress-bar');
  const progressLabel = document.getElementById('an-progress-label');
  if (!canvas || !spiderCanvas || !story) return;

  const webContext = canvas.getContext('2d', { alpha: true, desynchronized: true });
  const spiderContext = spiderCanvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!webContext || !spiderContext) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer:fine)').matches;
  const liteMode = document.documentElement.classList.contains('flow-lite');
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mix = (a, b, amount) => a + (b - a) * amount;
  const ease = (value) => 1 - Math.pow(1 - clamp(value), 3);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let targetProgress = 0;
  let displayProgress = 0;
  let pointerX = 0;
  let pointerY = 0;
  let active = true;
  let running = false;
  let lastFrame = 0;
  let fpsStarted = 0;
  let fpsFrames = 0;
  let drawSamples = 0;
  let drawTotal = 0;
  let lastSpider = { x: 0, y: 0 };
  let lastWebProgress = -1;
  document.body.dataset.anRenderer = 'sovereign-silk';

  const strandCount = mobile ? 10 : 13;
  const ringCount = mobile ? 7 : 9;
  const droplets = Array.from({ length: mobile ? 16 : 28 }, (_, index) => ({
    strand: (index * 7 + 3) % strandCount,
    ring: 1 + (index * 5) % ringCount,
    size: .55 + ((index * 13) % 8) * .15,
    phase: index * .73
  }));

  const webGeometry = () => {
    const center = {
      x: width * (mobile ? .5 : .69) + pointerX * 7,
      y: height * (mobile ? .37 : .49) + pointerY * 5
    };
    const radius = Math.min(width * (mobile ? .49 : .43), height * (mobile ? .48 : .66));
    const point = (strand, ring, phase = 0) => {
      const angle = -Math.PI * .5 + (strand / strandCount) * Math.PI * 2 + Math.sin(strand * 1.7) * .018;
      const ringRatio = ring / ringCount;
      const irregular = 1 + Math.sin(strand * 2.13 + ring * 1.81) * .027;
      const radial = (18 + radius * ringRatio) * irregular;
      return {
        x: center.x + Math.cos(angle + phase) * radial,
        y: center.y + Math.sin(angle + phase) * radial * .76
      };
    };
    return { center, radius, point };
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, liteMode || mobile ? 1 : 1.1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    spiderCanvas.width = Math.round(width * dpr);
    spiderCanvas.height = Math.round(height * dpr);
    webContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    spiderContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastWebProgress = -1;
  };

  const updateScroll = () => {
    const rect = story.getBoundingClientRect();
    targetProgress = clamp(-rect.top / Math.max(1, story.offsetHeight - window.innerHeight));
    const percent = Math.round(targetProgress * 100);
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressLabel) progressLabel.textContent = `${String(percent).padStart(2, '0')}%`;
    const activeScene = Math.min(3, Math.max(0, Math.round(targetProgress * 3)));
    document.body.dataset.anActive = String(activeScene);
    chapters.forEach((chapter, index) => chapter.classList.toggle('is-active', index === activeScene));
    start();
  };

  const strokeWeb = (geometry, progress, time) => {
    const context = webContext;
    const { center, radius, point } = geometry;
    const construction = ease(.12 + progress * .88);
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';

    for (let strand = 0; strand < strandCount; strand += 1) {
      const reveal = clamp(construction * 1.16 - strand / strandCount * .13);
      if (reveal <= 0) continue;
      const outer = point(strand, ringCount * reveal);
      context.beginPath();
      context.moveTo(center.x, center.y);
      context.lineTo(outer.x, outer.y);
      const highlight = (strand + Math.floor(progress * 10)) % 6 === 0;
      context.strokeStyle = highlight ? `rgba(206,255,228,${.18 + reveal * .17})` : `rgba(164,196,182,${.08 + reveal * .12})`;
      context.lineWidth = highlight ? .82 : .5;
      context.stroke();
    }

    for (let ring = 1; ring <= ringCount; ring += 1) {
      const ringReveal = clamp(construction * 1.28 - ring / ringCount * .25);
      if (ringReveal <= 0) continue;
      const visibleSegments = strandCount * ringReveal;
      context.beginPath();
      for (let strand = 0; strand < strandCount; strand += 1) {
        if (strand > visibleSegments) break;
        const from = point(strand, ring);
        const to = point((strand + 1) % strandCount, ring);
        const midpointX = (from.x + to.x) * .5 + (center.x - (from.x + to.x) * .5) * .045;
        const midpointY = (from.y + to.y) * .5 + (center.y - (from.y + to.y) * .5) * .045;
        if (strand === 0) context.moveTo(from.x, from.y);
        context.quadraticCurveTo(midpointX, midpointY, to.x, to.y);
      }
      const gold = ring === Math.max(2, Math.round(progress * ringCount));
      context.strokeStyle = gold ? 'rgba(226,181,103,.34)' : `rgba(192,216,205,${.07 + ringReveal * .11})`;
      context.lineWidth = gold ? 1.05 : .52;
      context.stroke();
    }

    if (progress > .2 && progress < .72) {
      const shield = clamp(1 - Math.abs(progress - .38) / .21);
      context.beginPath();
      for (let side = 0; side < 7; side += 1) {
        const angle = -Math.PI / 2 + side / 7 * Math.PI * 2;
        const x = center.x + Math.cos(angle) * radius * .43;
        const y = center.y + Math.sin(angle) * radius * .43 * .76;
        if (!side) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.closePath();
      context.strokeStyle = `rgba(226,181,103,${shield * .3})`;
      context.lineWidth = 1.2;
      context.stroke();
    }

    droplets.forEach((drop) => {
      const required = (drop.ring / ringCount) * .82;
      if (construction < required) return;
      const p = point(drop.strand, drop.ring);
      const shimmer = .35 + Math.sin(time * .0012 + drop.phase) * .25;
      context.beginPath();
      context.arc(p.x, p.y, drop.size, 0, Math.PI * 2);
      context.fillStyle = `rgba(220,244,234,${shimmer})`;
      context.fill();
    });
    context.restore();
  };

  const spiderPosition = (geometry, progress) => {
    const angle = -.55 + progress * Math.PI * 4.45;
    const radius = geometry.radius * mix(.68, .16, ease(progress));
    return {
      x: geometry.center.x + Math.cos(angle) * radius,
      y: geometry.center.y + Math.sin(angle) * radius * .76,
      angle: angle + Math.PI * .56
    };
  };

  const drawSpider = (position, scale, time, progress) => {
    const context = spiderContext;
    const breathe = 1 + Math.sin(time * .0022) * .025;
    const gait = Math.sin(time * .004 + progress * 12) * 2.2;
    context.save();
    context.translate(position.x, position.y);
    context.rotate(position.angle);
    context.scale(scale, scale);
    context.lineCap = 'round';
    context.lineJoin = 'round';

    for (const side of [-1, 1]) {
      for (let leg = 0; leg < 4; leg += 1) {
        const baseY = -20 + leg * 14;
        const spread = [-1.05, -.42, .35, .92][leg];
        const motion = gait * (leg % 2 ? -1 : 1) * side;
        const jointX = side * (34 + Math.abs(spread) * 15);
        const jointY = baseY + spread * 20 + motion;
        const footX = side * (68 + Math.abs(spread) * 26);
        const footY = baseY + spread * 48 - motion * .45;
        context.beginPath();
        context.moveTo(side * 11, baseY * .47);
        context.quadraticCurveTo(jointX, jointY, footX, footY);
        context.strokeStyle = 'rgba(0,3,4,.9)';
        context.lineWidth = 6.2;
        context.stroke();
        context.strokeStyle = leg === 0 ? 'rgba(225,184,111,.72)' : 'rgba(119,151,137,.64)';
        context.lineWidth = 2.05;
        context.stroke();
        context.beginPath();
        context.arc(jointX, jointY, 2.4, 0, Math.PI * 2);
        context.fillStyle = 'rgba(235,201,136,.7)';
        context.fill();
      }
    }

    const abdomen = context.createRadialGradient(-9, -18, 2, 0, 0, 37);
    abdomen.addColorStop(0, 'rgba(239,220,180,1)');
    abdomen.addColorStop(.12, 'rgba(130,116,89,1)');
    abdomen.addColorStop(.5, 'rgba(31,39,35,1)');
    abdomen.addColorStop(1, 'rgba(2,5,5,1)');
    context.beginPath();
    context.ellipse(0, 8, 27 * breathe, 34 * breathe, 0, 0, Math.PI * 2);
    context.fillStyle = abdomen;
    context.fill();
    context.strokeStyle = 'rgba(225,184,111,.45)';
    context.lineWidth = 1;
    context.stroke();

    for (let mark = -1; mark <= 1; mark += 1) {
      context.beginPath();
      context.moveTo(mark * 6, -13);
      context.quadraticCurveTo(mark * 13, 6, mark * 7, 26);
      context.strokeStyle = `rgba(222,178,97,${mark === 0 ? .62 : .24})`;
      context.lineWidth = mark === 0 ? 1.5 : .7;
      context.stroke();
    }
    for (let hair = 0; hair < 14; hair += 1) {
      const angle = hair / 14 * Math.PI * 2;
      const x = Math.cos(angle) * 23;
      const y = 8 + Math.sin(angle) * 30;
      context.beginPath();
      context.moveTo(x * .92, 8 + (y - 8) * .92);
      context.lineTo(x * 1.08, 8 + (y - 8) * 1.08);
      context.strokeStyle = 'rgba(221,205,168,.28)';
      context.lineWidth = .55;
      context.stroke();
    }

    const thorax = context.createRadialGradient(-7, -37, 1, 0, -28, 21);
    thorax.addColorStop(0, '#d8c49c');
    thorax.addColorStop(.18, '#5c645d');
    thorax.addColorStop(1, '#080d0c');
    context.beginPath();
    context.ellipse(0, -27, 18, 20, 0, 0, Math.PI * 2);
    context.fillStyle = thorax;
    context.fill();

    for (const eyeX of [-7, -2.5, 2.5, 7]) {
      context.beginPath();
      context.arc(eyeX, -37 + Math.abs(eyeX) * .12, 1.45, 0, Math.PI * 2);
      context.fillStyle = 'rgba(188,255,224,.9)';
      context.fill();
    }
    context.restore();
  };

  const drawProviderThreads = (geometry, progress) => {
    const context = webContext;
    const intensity = clamp((progress - .48) / .16) * clamp((.86 - progress) / .14);
    if (intensity <= 0) return;
    const targets = mobile
      ? [{ x: width * .2, y: height * .18 }, { x: width * .8, y: height * .17 }]
      : [{ x: width * .86, y: height * .25 }, { x: width * .9, y: height * .72 }, { x: width * .68, y: height * .86 }];
    context.save();
    targets.forEach((target, index) => {
      context.beginPath();
      context.moveTo(geometry.center.x, geometry.center.y);
      context.quadraticCurveTo(width * (.72 + index * .03), height * (.42 + index * .09), target.x, target.y);
      context.strokeStyle = `rgba(${index === 1 ? '126,206,255' : '226,181,103'},${intensity * .32})`;
      context.lineWidth = .8;
      context.stroke();
    });
    context.restore();
  };

  const draw = (time = 0) => {
    if (!width || !height) return;
    displayProgress += (targetProgress - displayProgress) * (reduceMotion ? 1 : .105);
    const geometry = webGeometry();
    if (Math.abs(displayProgress - lastWebProgress) > .002 || lastWebProgress < 0) {
      webContext.clearRect(0, 0, width, height);
      strokeWeb(geometry, displayProgress, 0);
      drawProviderThreads(geometry, displayProgress);
      lastWebProgress = displayProgress;
    }
    spiderContext.clearRect(0, 0, width, height);
    const spider = spiderPosition(geometry, displayProgress);

    if (lastSpider.x) {
      spiderContext.beginPath();
      spiderContext.moveTo(lastSpider.x, lastSpider.y);
      spiderContext.lineTo(spider.x, spider.y);
      spiderContext.strokeStyle = 'rgba(226,234,229,.28)';
      spiderContext.lineWidth = .55;
      spiderContext.stroke();
    }
    lastSpider = spider;
    drawSpider(spider, Math.max(.54, Math.min(1.03, width / 1280)) * (mobile ? .72 : 1), time, displayProgress);
  };

  const loop = (time) => {
    if (!active || document.hidden) { running = false; return; }
    const interval = 1000 / (liteMode || mobile ? 28 : 40);
    if (time - lastFrame >= interval) {
      lastFrame = time;
      const drawStarted = Date.now();
      draw(time);
      drawTotal += Date.now() - drawStarted;
      drawSamples += 1;
      if (drawSamples >= 8) {
        document.body.dataset.webDrawMs = (drawTotal / drawSamples).toFixed(2);
        drawSamples = 0;
        drawTotal = 0;
      }
      if (!fpsStarted) fpsStarted = time;
      fpsFrames += 1;
      if (time - fpsStarted >= 1000) {
        document.body.dataset.webFps = String(Math.round(fpsFrames * 1000 / (time - fpsStarted)));
        fpsStarted = time;
        fpsFrames = 0;
      }
    }
    requestAnimationFrame(loop);
  };

  function start() {
    if (running || reduceMotion || !active) return;
    running = true;
    requestAnimationFrame(loop);
  }

  new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (active) start();
  }, { rootMargin: '20% 0px' }).observe(story);

  story.addEventListener('pointermove', (event) => {
    if (!finePointer) return;
    pointerX = ((event.clientX / window.innerWidth) - .5) * 2;
    pointerY = ((event.clientY / window.innerHeight) - .5) * 2;
  }, { passive: true });
  story.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; }, { passive: true });
  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', () => { resize(); updateScroll(); draw(0); }, { passive: true });
  document.addEventListener('visibilitychange', start);

  document.querySelectorAll('[data-tilt]').forEach((card) => {
    if (!finePointer || liteMode) return;
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.transform = `perspective(1000px) rotateX(${-y * 3}deg) rotateY(${x * 4}deg) translateY(-3px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });

  resize();
  updateScroll();
  if (reduceMotion) draw(0); else start();
})();
