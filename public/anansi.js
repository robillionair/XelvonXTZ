(() => {
  const canvas = document.getElementById('anansi-brain');
  const story = document.getElementById('an-story');
  const chapters = [...document.querySelectorAll('[data-an-scene]')];
  const progressBar = document.getElementById('an-progress-bar');
  const progressLabel = document.getElementById('an-progress-label');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer:fine)').matches;
  if (!canvas || !story || reduceMotion) return;

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let targetProgress = 0;
  let displayProgress = 0;
  let active = true;
  let animationFrame = 0;
  let lastFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

  const nodes = [];
  const edges = [];
  const dust = [];
  const projected = [];

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const smooth = (value) => value * value * (3 - 2 * value);
  const mix = (a, b, amount) => a + (b - a) * amount;
  const seededRandom = (() => {
    let seed = 0x6a09e667;
    return () => {
      seed |= 0;
      seed = seed + 0x6d2b79f5 | 0;
      let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
      value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  })();

  const buildBrain = () => {
    nodes.length = 0;
    edges.length = 0;
    dust.length = 0;
    const nodeCount = window.innerWidth < 650 ? 330 : window.innerWidth < 1000 ? 470 : 680;

    for (let index = 0; index < nodeCount; index += 1) {
      const theta = seededRandom() * Math.PI * 2;
      const phi = Math.acos(2 * seededRandom() - 1);
      const sinPhi = Math.sin(phi);
      const fold = 1
        + Math.sin(theta * 7 + phi * 4) * .055
        + Math.sin(theta * 12 - phi * 7) * .027
        + (seededRandom() - .5) * .065;
      let x = Math.cos(theta) * sinPhi * 285 * fold;
      const y = Math.cos(phi) * 205 * (1 + Math.sin(theta * 5) * .025);
      const z = Math.sin(theta) * sinPhi * 220 * fold;
      const lowerTaper = clamp((y + 205) / 150);
      x *= .74 + lowerTaper * .26;
      x += Math.sign(x || 1) * (6 + 9 * (1 - Math.abs(y) / 205));
      nodes.push({
        x,
        y,
        z,
        phase: seededRandom() * Math.PI * 2,
        size: .6 + seededRandom() * 1.45,
        energy: seededRandom(),
        hemisphere: x < 0 ? -1 : 1
      });
    }

    const cellSize = 72;
    const buckets = new Map();
    const cellKey = (x, y, z) => `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)},${Math.floor(z / cellSize)}`;
    nodes.forEach((node, index) => {
      const key = cellKey(node.x, node.y, node.z);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(index);
    });

    nodes.forEach((node, index) => {
      const cellX = Math.floor(node.x / cellSize);
      const cellY = Math.floor(node.y / cellSize);
      const cellZ = Math.floor(node.z / cellSize);
      const candidates = [];
      for (let x = -1; x <= 1; x += 1) {
        for (let y = -1; y <= 1; y += 1) {
          for (let z = -1; z <= 1; z += 1) {
            const bucket = buckets.get(`${cellX + x},${cellY + y},${cellZ + z}`) || [];
            bucket.forEach((candidateIndex) => {
              if (candidateIndex <= index) return;
              const candidate = nodes[candidateIndex];
              const dx = node.x - candidate.x;
              const dy = node.y - candidate.y;
              const dz = node.z - candidate.z;
              const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (distance < 78) candidates.push({ index: candidateIndex, distance });
            });
          }
        }
      }
      candidates.sort((a, b) => a.distance - b.distance).slice(0, node.energy > .65 ? 3 : 2).forEach((candidate) => {
        edges.push({ a: index, b: candidate.index, phase: seededRandom() });
      });
    });

    const dustCount = window.innerWidth < 650 ? 80 : 160;
    for (let index = 0; index < dustCount; index += 1) {
      dust.push({
        x: seededRandom(),
        y: seededRandom(),
        drift: (seededRandom() - .5) * .18,
        size: .5 + seededRandom() * 2.5,
        phase: seededRandom() * Math.PI * 2,
        removed: seededRandom() < .6
      });
    }
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1 : 1.45);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  };

  const rotate = (node, rotationX, rotationY, rotationZ) => {
    const cosY = Math.cos(rotationY);
    const sinY = Math.sin(rotationY);
    const x1 = node.x * cosY - node.z * sinY;
    const z1 = node.x * sinY + node.z * cosY;
    const cosX = Math.cos(rotationX);
    const sinX = Math.sin(rotationX);
    const y2 = node.y * cosX - z1 * sinX;
    const z2 = node.y * sinX + z1 * cosX;
    const cosZ = Math.cos(rotationZ);
    const sinZ = Math.sin(rotationZ);
    return {
      x: x1 * cosZ - y2 * sinZ,
      y: x1 * sinZ + y2 * cosZ,
      z: z2
    };
  };

  const cameraAt = (progress, time) => {
    const keyframes = [
      { x: .63, y: .49, zoom: 1.02, rx: -.08, ry: -.18, rz: -.035 },
      { x: .72, y: .45, zoom: 1.72, rx: -.24, ry: -.54, rz: -.08 },
      { x: .64, y: .5, zoom: 1.24, rx: .12, ry: 2.65, rz: .025 },
      { x: .67, y: .51, zoom: 2.7, rx: .04, ry: 3.18, rz: .02 }
    ];
    const scene = Math.min(2, Math.floor(progress * 3));
    const amount = smooth(progress * 3 - scene);
    const from = keyframes[scene];
    const to = keyframes[scene + 1];
    return {
      x: mix(from.x, to.x, amount) * width,
      y: mix(from.y, to.y, amount) * height,
      zoom: mix(from.zoom, to.zoom, amount) * Math.min(width / 1180, height / 760) * 1.32,
      rx: mix(from.rx, to.rx, amount) + pointerY * .025,
      ry: mix(from.ry, to.ry, amount) + Math.sin(time * .00011) * .08 + pointerX * .045,
      rz: mix(from.rz, to.rz, amount)
    };
  };

  const projectBrain = (camera) => {
    projected.length = nodes.length;
    nodes.forEach((node, index) => {
      const rotated = rotate(node, camera.rx, camera.ry, camera.rz);
      const depth = 760 + rotated.z * camera.zoom;
      const perspective = 760 / Math.max(180, depth);
      projected[index] = {
        x: camera.x + rotated.x * camera.zoom * perspective,
        y: camera.y + rotated.y * camera.zoom * perspective,
        z: rotated.z,
        perspective,
        visible: depth > 180
      };
    });
  };

  const drawShield = (intensity, time, camera) => {
    if (intensity <= .01) return;
    context.save();
    context.globalCompositeOperation = 'lighter';
    context.translate(camera.x + 105 * camera.zoom, camera.y - 42 * camera.zoom);
    context.rotate(-.18);
    for (let ring = 0; ring < 4; ring += 1) {
      context.beginPath();
      context.ellipse(0, 0, (128 + ring * 18) * camera.zoom, (92 + ring * 13) * camera.zoom, 0, Math.PI * .12, Math.PI * 1.88);
      context.strokeStyle = `rgba(122,255,194,${intensity * (.12 - ring * .018)})`;
      context.lineWidth = ring === 0 ? 1.4 : .7;
      context.setLineDash([5 + ring * 2, 9]);
      context.lineDashOffset = -time * .015 * (ring % 2 ? -1 : 1);
      context.stroke();
    }
    context.setLineDash([]);
    for (let line = -3; line <= 3; line += 1) {
      context.beginPath();
      context.moveTo(-115 * camera.zoom, line * 25 * camera.zoom);
      context.lineTo(125 * camera.zoom, line * 17 * camera.zoom);
      context.strokeStyle = `rgba(99,223,255,${intensity * .055})`;
      context.lineWidth = .7;
      context.stroke();
    }
    context.restore();
  };

  const drawModelStreams = (intensity, time) => {
    if (intensity <= .01) return;
    const sources = [
      { x: width * .78, y: height * .27 },
      { x: width * .82, y: height * .74 },
      { x: width * .64, y: height * .86 }
    ];
    const origin = { x: width * .61, y: height * .5 };
    context.save();
    context.globalCompositeOperation = 'lighter';
    sources.forEach((target, index) => {
      context.beginPath();
      context.moveTo(origin.x, origin.y);
      context.bezierCurveTo(width * .7, origin.y + (index - 1) * 90, target.x - 80, target.y, target.x, target.y);
      context.strokeStyle = `rgba(${index === 1 ? '99,223,255' : '122,255,194'},${intensity * .14})`;
      context.lineWidth = 1;
      context.stroke();
      for (let packet = 0; packet < 3; packet += 1) {
        const t = (time * .00024 + packet / 3 + index * .17) % 1;
        const oneMinus = 1 - t;
        const cx = oneMinus ** 3 * origin.x + 3 * oneMinus ** 2 * t * width * .7 + 3 * oneMinus * t ** 2 * (target.x - 80) + t ** 3 * target.x;
        const cy = oneMinus ** 3 * origin.y + 3 * oneMinus ** 2 * t * (origin.y + (index - 1) * 90) + 3 * oneMinus * t ** 2 * target.y + t ** 3 * target.y;
        context.beginPath();
        context.arc(cx, cy, 2.2, 0, Math.PI * 2);
        context.fillStyle = `rgba(166,255,213,${intensity * .9})`;
        context.shadowColor = '#7affc2';
        context.shadowBlur = 9;
        context.fill();
      }
    });
    context.restore();
  };

  const drawPruning = (intensity, sceneProgress, time) => {
    if (intensity <= .01) return;
    const filterX = mix(width * .22, width * .84, sceneProgress);
    const nodeX = width * .7;
    const nodeY = height * .49;
    context.save();
    context.globalCompositeOperation = 'lighter';
    dust.forEach((particle) => {
      const rawX = particle.x * width + Math.sin(time * .0007 + particle.phase) * width * particle.drift;
      const rawY = particle.y * height + Math.cos(time * .0005 + particle.phase) * 16;
      const passed = rawX < filterX;
      const convergence = passed && !particle.removed ? clamp(sceneProgress * 1.4 - .25) : 0;
      const x = mix(rawX, nodeX + Math.cos(particle.phase) * 46, convergence);
      const y = mix(rawY, nodeY + Math.sin(particle.phase) * 46, convergence);
      const alpha = particle.removed && passed ? .04 * (1 - sceneProgress) : .18 + convergence * .45;
      context.beginPath();
      context.arc(x, y, particle.size * (1 - convergence * .45), 0, Math.PI * 2);
      context.fillStyle = `rgba(${particle.removed ? '141,125,255' : '122,255,194'},${alpha * intensity})`;
      context.fill();
    });
    const filterGradient = context.createLinearGradient(filterX - 40, 0, filterX + 40, 0);
    filterGradient.addColorStop(0, 'rgba(122,255,194,0)');
    filterGradient.addColorStop(.5, `rgba(122,255,194,${intensity * .24})`);
    filterGradient.addColorStop(1, 'rgba(122,255,194,0)');
    context.fillStyle = filterGradient;
    context.fillRect(filterX - 40, height * .12, 80, height * .76);
    context.beginPath();
    context.arc(nodeX, nodeY, 24 + Math.sin(time * .002) * 3, 0, Math.PI * 2);
    context.fillStyle = `rgba(122,255,194,${intensity * .18})`;
    context.shadowColor = '#7affc2';
    context.shadowBlur = 35;
    context.fill();
    context.beginPath();
    context.arc(nodeX, nodeY, 6, 0, Math.PI * 2);
    context.fillStyle = `rgba(220,255,235,${intensity})`;
    context.fill();
    context.restore();
  };

  const draw = (time) => {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    const camera = cameraAt(displayProgress, time);
    projectBrain(camera);
    const sceneFloat = displayProgress * 3;
    const shieldIntensity = clamp(1 - Math.abs(sceneFloat - 1) * 1.2);
    const bridgeIntensity = clamp(1 - Math.abs(sceneFloat - 2) * 1.25);
    const pruneIntensity = clamp((sceneFloat - 2.15) / .55);
    const brainOpacity = 1 - pruneIntensity * .72;

    context.save();
    context.globalCompositeOperation = 'lighter';
    edges.forEach((edge, index) => {
      const from = projected[edge.a];
      const to = projected[edge.b];
      if (!from?.visible || !to?.visible) return;
      const depthAlpha = clamp((from.z + to.z + 450) / 900, .08, .72);
      const governanceBoost = shieldIntensity * (nodes[edge.a].x > 60 && nodes[edge.a].y < 90 ? .35 : 0);
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.strokeStyle = `rgba(${bridgeIntensity > .35 ? '99,223,255' : '122,255,194'},${(.025 + depthAlpha * .08 + governanceBoost) * brainOpacity})`;
      context.lineWidth = .45 + depthAlpha * .6;
      context.stroke();

      if ((index + Math.floor(time * .006)) % 31 === 0) {
        const pulse = (time * .00038 + edge.phase) % 1;
        const x = mix(from.x, to.x, pulse);
        const y = mix(from.y, to.y, pulse);
        context.beginPath();
        context.arc(x, y, 1.2 + depthAlpha, 0, Math.PI * 2);
        context.fillStyle = `rgba(200,255,226,${(.45 + depthAlpha * .5) * brainOpacity})`;
        context.shadowColor = '#7affc2';
        context.shadowBlur = 7;
        context.fill();
      }
    });

    context.shadowBlur = 0;
    nodes.forEach((node, index) => {
      const point = projected[index];
      if (!point?.visible) return;
      const depthAlpha = clamp((point.z + 260) / 520, .12, 1);
      const pulse = .7 + Math.sin(time * .0016 + node.phase) * .25;
      const governance = shieldIntensity && node.x > 55 && node.y < 95 ? 1.9 : 1;
      const radius = node.size * point.perspective * governance;
      context.beginPath();
      context.arc(point.x, point.y, Math.max(.35, radius), 0, Math.PI * 2);
      context.fillStyle = `rgba(${node.energy > .86 ? '210,255,232' : node.hemisphere > 0 ? '122,255,194' : '99,223,255'},${depthAlpha * pulse * .64 * brainOpacity})`;
      if (node.energy > .94) {
        context.shadowColor = node.hemisphere > 0 ? '#7affc2' : '#63dfff';
        context.shadowBlur = 11;
      } else {
        context.shadowBlur = 0;
      }
      context.fill();
    });
    context.restore();

    drawShield(shieldIntensity, time, camera);
    drawModelStreams(bridgeIntensity, time);
    drawPruning(pruneIntensity, clamp((sceneFloat - 2.15) / .85), time);

    const scanY = (time * .035) % (height + 160) - 80;
    const scan = context.createLinearGradient(0, scanY - 35, 0, scanY + 35);
    scan.addColorStop(0, 'rgba(122,255,194,0)');
    scan.addColorStop(.5, 'rgba(122,255,194,.035)');
    scan.addColorStop(1, 'rgba(122,255,194,0)');
    context.fillStyle = scan;
    context.fillRect(0, scanY - 35, width, 70);
  };

  const animate = (time) => {
    if (!active) {
      animationFrame = 0;
      return;
    }
    displayProgress += (targetProgress - displayProgress) * .075;
    const frameInterval = window.innerWidth < 700 ? 1000 / 30 : 1000 / 45;
    if (time - lastFrame >= frameInterval) {
      draw(time);
      lastFrame = time;
    }
    animationFrame = requestAnimationFrame(animate);
  };

  const start = () => {
    if (!animationFrame && active) animationFrame = requestAnimationFrame(animate);
  };

  const observer = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (active) start();
  }, { rootMargin: '35% 0px 35% 0px' });
  observer.observe(story);

  if (finePointer) {
    window.addEventListener('pointermove', (event) => {
      pointerX = event.clientX / window.innerWidth - .5;
      pointerY = event.clientY / window.innerHeight - .5;
      document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);
    }, { passive: true });

    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.transform = `rotateX(${-y * 3.5}deg) rotateY(${x * 4.5}deg) translateY(-5px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resize();
      buildBrain();
      updateScroll();
      start();
    }, 120);
  }, { passive: true });
  window.addEventListener('scroll', updateScroll, { passive: true });

  buildBrain();
  resize();
  updateScroll();
  start();
})();
