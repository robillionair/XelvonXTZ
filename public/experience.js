(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollRoot = document.querySelector('[data-scroll-root]');
  const sections = [...document.querySelectorAll('[data-flow-section]')];
  if (!sections.length) return;

  document.documentElement.classList.add('js-flow');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const lowPower = Boolean(connection?.saveData)
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  document.documentElement.classList.toggle('flow-lite', lowPower);

  const ambient = document.createElement('div');
  ambient.className = 'flow-ambient';
  ambient.setAttribute('aria-hidden', 'true');
  (scrollRoot || document.body).prepend(ambient);

  const rail = document.createElement('div');
  rail.className = 'flow-progress-rail';
  rail.setAttribute('aria-hidden', 'true');
  rail.innerHTML = '<i><b></b></i><span>SCENE 01 / 01</span>';
  document.body.append(rail);
  const railLabel = rail.querySelector('span');

  const revealSelector = [
    '.reveal', '.an-kicker', '.an-section-heading h2', '.an-manifesto h2',
    '.an-manifesto-grid > *', '.an-pillar-card', '.an-market-list article',
    '.an-deploy-visual', '.an-deploy-copy > *', '.an-xelvon-bridge > *:not(.an-bridge-glow)',
    '.hero > .eyebrow', '.hero > h1', '.hero > p', '.hero > .effective',
    '.policy > section', '.contact'
  ].join(',');

  sections.forEach((section) => {
    const candidates = [...section.querySelectorAll(revealSelector)];
    if (section.matches(revealSelector)) candidates.unshift(section);
    [...new Set(candidates)].forEach((element, index) => {
      element.setAttribute('data-flow-reveal', '');
      if (!element.hasAttribute('data-flow-origin')) {
        const visual = element.matches('canvas,.privacy-visual,.founder-portrait,.an-deploy-visual,.feature-card,.an-pillar-card');
        element.setAttribute('data-flow-origin', visual ? 'visual' : index % 2 ? 'right' : 'left');
      }
      element.style.setProperty('--flow-delay', `${Math.min(index, 6) * 75}ms`);
    });
    if (!section.querySelector(':scope > .flow-depth-seam') && !section.matches('.neural-cinema,.an-story')) {
      const seam = document.createElement('span');
      seam.className = 'flow-depth-seam';
      seam.setAttribute('aria-hidden', 'true');
      section.append(seam);
    }
  });

  const activeSections = new Set();
  const viewportHeight = () => scrollRoot?.clientHeight || window.innerHeight;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        activeSections.add(entry.target);
        entry.target.classList.add('flow-entered');
      } else {
        activeSections.delete(entry.target);
      }
    });
    queueUpdate();
  }, { root: scrollRoot || null, rootMargin: '16% 0px 16% 0px', threshold: [0, .08, .35, .65] });
  sections.forEach((section) => observer.observe(section));

  let updateQueued = false;
  let lastActiveIndex = -1;
  const update = () => {
    const height = viewportHeight();
    const rootTop = scrollRoot ? scrollRoot.getBoundingClientRect().top : 0;
    const center = rootTop + height * .5;
    let closest = null;
    let closestDistance = Infinity;

    activeSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (height - (rect.top - rootTop)) / Math.max(1, height + rect.height)));
      section.style.setProperty('--section-progress', progress.toFixed(4));
      const distance = Math.abs(rect.top + rect.height * .5 - center);
      if (distance < closestDistance) {
        closest = section;
        closestDistance = distance;
      }
    });

    const scrollTop = scrollRoot ? scrollRoot.scrollTop : window.scrollY;
    const scrollHeight = scrollRoot ? scrollRoot.scrollHeight - scrollRoot.clientHeight : document.documentElement.scrollHeight - window.innerHeight;
    const pageProgress = Math.max(0, Math.min(1, scrollTop / Math.max(1, scrollHeight)));
    document.documentElement.style.setProperty('--flow-progress', pageProgress.toFixed(4));

    if (closest) {
      sections.forEach((section) => section.classList.toggle('flow-active', section === closest));
      const activeIndex = sections.indexOf(closest);
      if (activeIndex !== lastActiveIndex) {
        lastActiveIndex = activeIndex;
        document.documentElement.dataset.flowTone = closest.dataset.flowTone || 'mint';
        if (railLabel) railLabel.textContent = `SCENE ${String(activeIndex + 1).padStart(2, '0')} / ${String(sections.length).padStart(2, '0')}`;
      }
    }
    updateQueued = false;
  };

  const queueUpdate = () => {
    if (updateQueued) return;
    updateQueued = true;
    requestAnimationFrame(update);
  };

  (scrollRoot || window).addEventListener('scroll', queueUpdate, { passive: true });
  window.addEventListener('resize', queueUpdate, { passive: true });
  document.addEventListener('visibilitychange', () => {
    rail.style.opacity = document.hidden ? '0' : '';
    if (!document.hidden) queueUpdate();
  });
  if (reducedMotion) sections.forEach((section) => section.classList.add('flow-entered'));
  queueUpdate();
})();
