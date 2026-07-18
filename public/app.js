// Main Application Logic

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const splashScreen = document.getElementById('splash-screen');
  const chatScreen = document.getElementById('chat-screen');
  const navLaunchBtn = document.getElementById('nav-launch-btn');
  const heroLaunchBtn = document.getElementById('hero-launch-btn');
  const footerLaunchBtn = document.getElementById('footer-launch-btn');
  const betaLaunchBtn = document.getElementById('beta-launch-btn');
  const exitChatBtn = document.getElementById('exit-chat-btn');
  const exitChatMobileBtn = document.getElementById('exit-chat-mobile-btn');
  const newChatBtn = document.getElementById('new-chat-btn');
  
  // Modal Elements
  const emailModal = document.getElementById('email-modal');
  const emailModalContent = document.getElementById('email-modal-content');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const emailForm = document.getElementById('email-form');
  const userEmailInput = document.getElementById('user-email');
  const userEmailDisplay = document.getElementById('user-email-display');
  const userAvatar = document.getElementById('user-avatar');
  
  // Chat Elements
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const sendBtn = document.getElementById('send-btn');

  const API_BASE = window.location.origin;
  let messages = [];
  let userEmail = sessionStorage.getItem('xelvon-email') || '';
  const robotAvatarMarkup = `
    <div class="robot-avatar" aria-hidden="true">
      <div class="robot-antenna"><i></i></div>
      <div class="robot-head">
        <i class="robot-ear robot-ear-left"></i><i class="robot-ear robot-ear-right"></i>
        <div class="robot-face"><i class="robot-eye robot-eye-left"></i><i class="robot-eye robot-eye-right"></i></div>
        <span class="robot-mouth"></span>
      </div>
      <span class="robot-shadow"></span>
    </div>`;

  const setRobotState = (state = 'idle') => {
    if (chatScreen.dataset.robotState === state) return;
    chatScreen.classList.remove('is-listening', 'is-thinking', 'is-answering');
    if (state !== 'idle') chatScreen.classList.add(`is-${state}`);
    chatScreen.dataset.robotState = state;
    const companionStatus = document.getElementById('robot-companion-status');
    if (companionStatus) {
      companionStatus.textContent = ({ idle: 'Ready', listening: 'I’m listening', thinking: 'Thinking…', answering: 'Got it!' })[state] || 'Ready';
    }
  };

  // --- Modal Logic ---
  const openModal = () => {
    emailModal.classList.remove('hidden');
    // slight delay for transition
    setTimeout(() => {
      emailModal.classList.remove('opacity-0');
      emailModalContent.classList.remove('scale-95');
      emailModalContent.classList.add('scale-100');
    }, 10);
  };

  const closeModal = () => {
    emailModal.classList.add('opacity-0');
    emailModalContent.classList.remove('scale-100');
    emailModalContent.classList.add('scale-95');
    setTimeout(() => {
      emailModal.classList.add('hidden');
    }, 300);
  };

  const loadChatHistory = async (email) => {
    try {
      const response = await fetch(`${API_BASE}/api/chat/history?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        messages = data.messages;
        chatMessages.innerHTML = '';
        messages.forEach(msg => {
          appendMessage(msg.role, msg.content);
        });
      } else {
        resetChat();
      }
    } catch(err) {
      console.error('Failed to load history:', err);
      resetChat();
    }
  };

  const resetChat = () => {
    messages = [];
    chatMessages.innerHTML = `
      <div class="chat-message assistant-message chat-welcome-message">
        ${robotAvatarMarkup}
        <div class="message-copy chat-welcome"><span>NEURAL COMPANION ONLINE</span><h2>What can we move forward?</h2><p>Bring me an idea, a difficult decision, unfinished work, or a question that deserves a better answer.</p><div class="prompt-starters"><button type="button" data-prompt="Turn my idea into a focused launch plan">Build a launch plan <i>↗</i></button><button type="button" data-prompt="Challenge my strategy and show me what I am missing">Challenge my strategy <i>↗</i></button><button type="button" data-prompt="Help me make this simpler, clearer, and stronger">Make it stronger <i>↗</i></button></div></div>
      </div>
    `;
    setRobotState('idle');
  };

  // --- UI Switching ---
  const showChat = (e) => {
    if (e) e.preventDefault();
    if (!userEmail) {
      openModal();
      return;
    }
    splashScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    handleScrollAnimation(); // update floating CTA
    
    // Update User Display
    userEmailDisplay.textContent = userEmail;
    userAvatar.textContent = userEmail.charAt(0).toUpperCase();

    // Load Chat History
    loadChatHistory(userEmail);
  };
  
  const hideChat = () => {
    chatScreen.classList.add('hidden');
    splashScreen.classList.remove('hidden');
  };

  // Event Listeners
  navLaunchBtn.addEventListener('click', showChat);
  heroLaunchBtn.addEventListener('click', showChat);
  if (footerLaunchBtn) footerLaunchBtn.addEventListener('click', showChat);
  if (betaLaunchBtn) betaLaunchBtn.addEventListener('click', showChat);
  closeModalBtn.addEventListener('click', closeModal);
  exitChatBtn.addEventListener('click', hideChat);
  if (exitChatMobileBtn) exitChatMobileBtn.addEventListener('click', hideChat);
  
  // --- Smooth Scrolling for Nav Links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        splashScreen.scrollTo({
          top: targetEl.offsetTop - 80, // offset for fixed navbar
          behavior: 'smooth'
        });
      }
    });
  });

  // --- Scroll Animations & Floating CTA ---
  const scrollElements = document.querySelectorAll('.reveal');
  const floatingCta = document.getElementById('floating-cta');
  const floatingLaunchBtn = document.getElementById('floating-launch-btn');
  const heroSection = document.querySelector('.hero');
  const heroCopy = document.querySelector('.hero-copy');
  const heroVisual = document.querySelector('.hero-visual');
  const siteHeader = document.querySelector('.site-header');
  let scrollFrameQueued = false;
  
  if (floatingLaunchBtn) floatingLaunchBtn.addEventListener('click', showChat);

  const handleScrollAnimation = () => {
    if (!splashScreen.classList.contains('hidden') && splashScreen.scrollTop > window.innerHeight * 0.8 && splashScreen.scrollTop < splashScreen.scrollHeight - window.innerHeight * 1.15) {
      floatingCta.classList.add('is-visible');
    } else {
      floatingCta.classList.remove('is-visible');
    }
    if (siteHeader) siteHeader.classList.toggle('is-scrolled',splashScreen.scrollTop>40);
    if (heroSection && heroCopy && heroVisual) {
      const progress=Math.max(0,Math.min(1,splashScreen.scrollTop/Math.max(1,heroSection.offsetHeight*.8)));
      heroCopy.style.transform=`translate3d(0,${-progress*58}px,0)`;
      heroCopy.style.opacity=String(1-progress*.72);
      heroVisual.style.transform=`translate3d(0,${progress*34}px,0) scale(${1+progress*.13})`;
      heroVisual.style.opacity=String(1-progress*.38);
    }
    scrollFrameQueued=false;
  };

  if ('IntersectionObserver' in window) {
    const revealObserver=new IntersectionObserver((entries)=>{
      entries.forEach((entry)=>{
        if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}
      });
    },{root:splashScreen,rootMargin:'0px 0px -9% 0px',threshold:.08});
    scrollElements.forEach((element)=>revealObserver.observe(element));
  } else {
    scrollElements.forEach((element)=>element.classList.add('is-visible'));
  }

  splashScreen.addEventListener('scroll',()=>{
    if(scrollFrameQueued) return;
    scrollFrameQueued=true;
    requestAnimationFrame(handleScrollAnimation);
  },{passive:true});
  // Trigger once on load
  handleScrollAnimation();

  // Recover gracefully if a stale form submission reached the GET fallback.
  const accessState = new URLSearchParams(window.location.search).get('access');
  if (accessState === 'retry') {
    history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    openModal();
  }

  const entryState = new URLSearchParams(window.location.search).get('enter');
  if (entryState === 'xelvon') {
    history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    setTimeout(() => showChat(), 120);
  }

  // Explicit local-only visual QA route; never bypasses access on the live domain.
  const localPreviewState = new URLSearchParams(window.location.search).get('chat-preview');
  const localChatPreview = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) && ['1','thinking'].includes(localPreviewState);
  if (localChatPreview) {
    userEmail = 'preview@local.test';
    splashScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    userEmailDisplay.textContent = userEmail;
    userAvatar.textContent = 'P';
    resetChat();
    if (localPreviewState === 'thinking') {
      appendMessage('assistant','<think>\nI am mapping the goal, identifying the audience, checking the strongest differentiator, and turning the idea into a focused sequence of decisions. I will keep the reasoning visible here while the final recommendation remains visually separate.\n</think>\n\nStart with one clear promise, prove it through a concrete experience, and give the visitor a single confident next step.');
      setRobotState('thinking');
    }
  }
  
  // Form submission for email
  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const email = userEmailInput.value.trim();
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || "Failed to subscribe.");
        return;
      }
    } catch(err) {
      console.error(err);
      alert("Connection error.");
      return;
    }

    if (email) {
      userEmail = email;
      sessionStorage.setItem('xelvon-email', email);
      closeModal();
      showChat();
    }
  });

  // --- Immersive 3D interactions ---
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer:fine)').matches;
  if (!reduceMotion && finePointer) {
    let pointerX=0;
    let pointerY=0;
    let pointerFrame=false;
    splashScreen.addEventListener('pointermove', (event) => {
      pointerX=(event.clientX/window.innerWidth-.5)*2;
      pointerY=(event.clientY/window.innerHeight-.5)*2;
      if(pointerFrame) return;
      pointerFrame=true;
      requestAnimationFrame(()=>{
        splashScreen.style.setProperty('--mx',pointerX.toFixed(3));
        splashScreen.style.setProperty('--my',pointerY.toFixed(3));
        pointerFrame=false;
      });
    }, { passive: true });

    document.querySelectorAll('.tilt-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `rotateX(${-y * 5}deg) rotateY(${x * 7}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });

    document.querySelectorAll('.magnetic,.cinema-launch').forEach((button)=>{
      button.addEventListener('pointermove',(event)=>{
        const rect=button.getBoundingClientRect();
        const x=(event.clientX-rect.left-rect.width/2)*.13;
        const y=(event.clientY-rect.top-rect.height/2)*.18;
        button.style.transform=`translate3d(${x}px,${y-2}px,0)`;
      });
      button.addEventListener('pointerleave',()=>{button.style.transform='';});
    });
  }

  function createNeuralField(canvas, options = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dots = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastDrawAt = 0;
    const density = options.density || 10000;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const liteMode = document.documentElement.classList.contains('flow-lite');
      const dpr = Math.min(window.devicePixelRatio || 1, liteMode ? 1 : 1.65);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots.length = 0;
      const count = Math.min(liteMode ? 56 : 82, Math.max(liteMode ? 24 : 34, Math.floor((width * height) / density)));
      for (let i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - .5) * .18,
          vy: (Math.random() - .5) * .18,
          r: Math.random() * 1.3 + .35,
          phase: Math.random() * Math.PI * 2
        });
      }
    };

    const draw = (now = 0) => {
      const frameInterval = document.documentElement.classList.contains('flow-lite') ? 48 : 32;
      if (!reduceMotion && now - lastDrawAt < frameInterval) {
        requestAnimationFrame(draw);
        return;
      }
      const bounds = canvas.getBoundingClientRect();
      const onScreen = !splashScreen.classList.contains('hidden') && bounds.bottom > 0 && bounds.top < window.innerHeight;
      if (!reduceMotion && !onScreen) {
        setTimeout(() => requestAnimationFrame(draw), 300);
        return;
      }
      lastDrawAt = now;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < -10) a.x = width + 10; if (a.x > width + 10) a.x = -10;
        if (a.y < -10) a.y = height + 10; if (a.y > height + 10) a.y = -10;
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 145) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(161, 230, 194, ${(1 - distance / 145) * .11})`;
            ctx.lineWidth = .55;
            ctx.stroke();
          }
        }
        const pulse = .5 + Math.sin(frame * .012 + a.phase) * .5;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r + pulse * .45, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(190, 246, 210, ${.22 + pulse * .42})`; ctx.fill();
      }
      frame++;
      if (!reduceMotion) requestAnimationFrame(draw);
    };
    resize(); draw();
    window.addEventListener('resize', resize, { passive: true });
  }

  createNeuralField(document.getElementById('neural-canvas'), { density: 12500 });
  createNeuralField(document.getElementById('cta-canvas'), { density: 15500 });

  // --- Scroll-driven cinematic neural world ---
  const cinemaSection = document.getElementById('neural-cinema');
  const cinemaCanvas = document.getElementById('cinema-neural-canvas');
  if (cinemaSection && cinemaCanvas) {
    const cinemaCtx = cinemaCanvas.getContext('2d');
    const cinemaChapters = [...cinemaSection.querySelectorAll('[data-cinema-scene]')];
    const cinemaProgressLabel = document.getElementById('cinema-progress-label');
    let cinemaWidth = 0;
    let cinemaHeight = 0;
    let cinemaProgress = 0;
    let cinemaScene = -1;
    let cinemaActive = false;
    let cinemaRunning = false;
    let cinemaLastFrame = 0;
    let cinemaPointerX = 0;
    let cinemaPointerY = 0;
    const cinemaNodes = [];
    const cinemaEdges = [];
    const cinemaPulses = [];
    let seed = 918273;

    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const addNode = (node) => {
      cinemaNodes.push(node);
      return cinemaNodes.length - 1;
    };

    const cinemaLiteMode = document.documentElement.classList.contains('flow-lite');
    const clusterCount = cinemaLiteMode ? (window.innerWidth < 700 ? 4 : 6) : (window.innerWidth < 700 ? 5 : 8);
    for (let c = 0; c < clusterCount; c++) {
      const soma = {
        x: (random() - .5) * 1250,
        y: (random() - .5) * 720,
        z: random() * 2150,
        size: 12 + random() * 14,
        soma: true,
        phase: random() * Math.PI * 2
      };
      const somaIndex = addNode(soma);
      const branches = 5 + Math.floor(random() * 4);
      for (let b = 0; b < branches; b++) {
        let parentIndex = somaIndex;
        let px = soma.x;
        let py = soma.y;
        let pz = soma.z;
        let theta = random() * Math.PI * 2;
        let lift = (random() - .5) * .7;
        const segments = 3 + Math.floor(random() * 3);
        for (let s = 0; s < segments; s++) {
          const length = 72 + random() * 78;
          theta += (random() - .5) * .65;
          lift += (random() - .5) * .22;
          px += Math.cos(theta) * length;
          py += Math.sin(theta) * length * .62 + lift * 22;
          pz += (random() - .36) * length;
          const childIndex = addNode({ x:px, y:py, z:pz, size:Math.max(1.2,4.5-s*.72), soma:false, phase:random()*Math.PI*2 });
          cinemaEdges.push([parentIndex, childIndex, random()]);
          parentIndex = childIndex;
          if (s > 1 && random() > .55) {
            const twigIndex = addNode({ x:px+(random()-.5)*100, y:py+(random()-.5)*90, z:pz+(random()-.5)*90, size:1.2, soma:false, phase:random()*Math.PI*2 });
            cinemaEdges.push([parentIndex, twigIndex, random()]);
          }
        }
      }
    }

    for (let i = 0; i < Math.min(20, cinemaEdges.length); i++) {
      cinemaPulses.push({ edge:Math.floor(random()*cinemaEdges.length), offset:random(), speed:.08+random()*.13, hue:random()>.28?'mint':'violet' });
    }

    const resizeCinema = () => {
      const rect = cinemaCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, cinemaLiteMode || window.innerWidth < 700 ? 1 : 1.35);
      cinemaWidth = rect.width;
      cinemaHeight = rect.height;
      cinemaCanvas.width = Math.round(rect.width * dpr);
      cinemaCanvas.height = Math.round(rect.height * dpr);
      cinemaCtx.setTransform(dpr,0,0,dpr,0,0);
    };

    const projectCinemaNode = (node) => {
      const cameraZ = cinemaProgress * 1650 - 180;
      const z0 = node.z - cameraZ;
      const angleY = cinemaProgress * 1.15 - .35 + cinemaPointerX * .09;
      const angleX = Math.sin(cinemaProgress * Math.PI) * .16 + cinemaPointerY * .06;
      const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
      const x1 = node.x * cosY - z0 * sinY;
      const z1 = node.x * sinY + z0 * cosY;
      const y1 = node.y * cosX - z1 * sinX;
      const z2 = node.y * sinX + z1 * cosX;
      const depth = z2 + 1120;
      if (depth < 110 || depth > 3000) return null;
      const scale = 850 / depth;
      const centerX = cinemaWidth * (window.innerWidth < 700 ? .52 : .64);
      return { x:centerX+x1*scale, y:cinemaHeight*.5+y1*scale, scale, depth, alpha:Math.max(0,Math.min(1,1-Math.abs(depth-1180)/1850)) };
    };

    const drawCinema = (now) => {
      cinemaCtx.clearRect(0,0,cinemaWidth,cinemaHeight);
      const projected = cinemaNodes.map(projectCinemaNode);
      const fog = cinemaCtx.createRadialGradient(cinemaWidth*.62,cinemaHeight*.46,10,cinemaWidth*.62,cinemaHeight*.46,Math.max(cinemaWidth,cinemaHeight)*.62);
      fog.addColorStop(0,'rgba(51,70,78,.1)');
      fog.addColorStop(.45,'rgba(30,23,58,.055)');
      fog.addColorStop(1,'rgba(0,0,0,0)');
      cinemaCtx.fillStyle=fog;
      cinemaCtx.fillRect(0,0,cinemaWidth,cinemaHeight);

      for (let i=0;i<cinemaEdges.length;i++) {
        const edge=cinemaEdges[i];
        const a=projected[edge[0]], b=projected[edge[1]];
        if(!a||!b) continue;
        const alpha=Math.min(a.alpha,b.alpha)*(.08+edge[2]*.1);
        cinemaCtx.beginPath();
        cinemaCtx.moveTo(a.x,a.y);
        const bow=Math.sin(edge[2]*9+cinemaProgress*4)*12*Math.min(a.scale,b.scale);
        cinemaCtx.quadraticCurveTo((a.x+b.x)/2+bow,(a.y+b.y)/2-bow,a.x+(b.x-a.x),a.y+(b.y-a.y));
        cinemaCtx.strokeStyle=`rgba(139,229,195,${alpha})`;
        cinemaCtx.lineWidth=Math.max(.35,Math.min(2.2,(a.scale+b.scale)*.54));
        cinemaCtx.stroke();
      }

      const order=cinemaNodes.map((_,i)=>i).sort((a,b)=>(projected[b]?.depth||9999)-(projected[a]?.depth||9999));
      for(const index of order){
        const p=projected[index];
        if(!p||p.x<-80||p.x>cinemaWidth+80||p.y<-80||p.y>cinemaHeight+80) continue;
        const node=cinemaNodes[index];
        const pulse=.82+Math.sin(now*.0018+node.phase)*.18;
        const radius=Math.max(.7,node.size*p.scale*pulse);
        if(node.soma){
          const glow=cinemaCtx.createRadialGradient(p.x-radius*.18,p.y-radius*.22,0,p.x,p.y,radius*3.8);
          glow.addColorStop(0,`rgba(238,255,242,${.9*p.alpha})`);
          glow.addColorStop(.09,`rgba(176,255,208,${.8*p.alpha})`);
          glow.addColorStop(.34,`rgba(102,144,181,${.3*p.alpha})`);
          glow.addColorStop(1,'rgba(88,72,178,0)');
          cinemaCtx.fillStyle=glow;
          cinemaCtx.beginPath();cinemaCtx.arc(p.x,p.y,radius*3.8,0,Math.PI*2);cinemaCtx.fill();
          cinemaCtx.fillStyle=`rgba(207,255,222,${.7*p.alpha})`;
          cinemaCtx.beginPath();cinemaCtx.arc(p.x,p.y,radius*.56,0,Math.PI*2);cinemaCtx.fill();
        }else{
          cinemaCtx.fillStyle=`rgba(178,235,208,${(.18+.35*p.scale)*p.alpha})`;
          cinemaCtx.beginPath();cinemaCtx.arc(p.x,p.y,radius,0,Math.PI*2);cinemaCtx.fill();
        }
      }

      for(const pulse of cinemaPulses){
        pulse.offset=(pulse.offset+pulse.speed*.016)%1;
        const edge=cinemaEdges[pulse.edge];
        const a=projected[edge[0]],b=projected[edge[1]];
        if(!a||!b) continue;
        const x=a.x+(b.x-a.x)*pulse.offset;
        const y=a.y+(b.y-a.y)*pulse.offset;
        const color=pulse.hue==='mint'?'183,247,199':'151,133,255';
        const glow=cinemaCtx.createRadialGradient(x,y,0,x,y,12);
        glow.addColorStop(0,`rgba(${color},.92)`);glow.addColorStop(1,`rgba(${color},0)`);
        cinemaCtx.fillStyle=glow;cinemaCtx.beginPath();cinemaCtx.arc(x,y,12,0,Math.PI*2);cinemaCtx.fill();
      }
    };

    const cinemaLoop = (now) => {
      if (!cinemaActive || splashScreen.classList.contains('hidden')) { cinemaRunning=false; return; }
      if (now-cinemaLastFrame>(cinemaLiteMode ? 48 : 32)) { cinemaLastFrame=now; drawCinema(now); }
      requestAnimationFrame(cinemaLoop);
    };

    const startCinema = () => {
      if(cinemaRunning||reduceMotion) return;
      cinemaRunning=true;
      requestAnimationFrame(cinemaLoop);
    };

    const updateCinemaProgress = () => {
      const rect=cinemaSection.getBoundingClientRect();
      const distance=Math.max(1,cinemaSection.offsetHeight-window.innerHeight);
      cinemaProgress=Math.max(0,Math.min(1,-rect.top/distance));
      const nextScene=Math.min(3,Math.floor(cinemaProgress*4));
      if(nextScene!==cinemaScene){
        cinemaScene=nextScene;
        cinemaSection.dataset.scene=String(nextScene);
        cinemaChapters.forEach((chapter,index)=>chapter.classList.toggle('is-active',index===nextScene));
      }
      cinemaSection.style.setProperty('--cinema-progress',cinemaProgress.toFixed(3));
      if(cinemaProgressLabel) cinemaProgressLabel.textContent=`${String(Math.round(cinemaProgress*100)).padStart(2,'0')}%`;
      if(reduceMotion) drawCinema(0);
    };

    const cinemaObserver=new IntersectionObserver(([entry])=>{
      cinemaActive=entry.isIntersecting;
      if(cinemaActive){resizeCinema();updateCinemaProgress();startCinema();}
    },{root:splashScreen,rootMargin:'35% 0px 35% 0px'});
    cinemaObserver.observe(cinemaSection);
    splashScreen.addEventListener('scroll',updateCinemaProgress,{passive:true});
    window.addEventListener('resize',()=>{resizeCinema();updateCinemaProgress();},{passive:true});
    cinemaSection.addEventListener('pointermove',(event)=>{
      const rect=cinemaSection.getBoundingClientRect();
      cinemaPointerX=((event.clientX-rect.left)/Math.max(1,rect.width)-.5)*2;
      cinemaPointerY=((event.clientY-Math.max(0,rect.top))/Math.max(1,Math.min(window.innerHeight,rect.height))-.5)*2;
    },{passive:true});
    resizeCinema();
    updateCinemaProgress();
  }

  document.querySelectorAll('.cinema-launch').forEach((button)=>button.addEventListener('click',showChat));

  // --- Free-moving robot companion ---
  const companion = document.getElementById('robot-companion');
  const chatMain = document.querySelector('.chat-main');
  if (companion && chatMain && !reduceMotion) {
    let robotX = 80;
    let robotY = 90;
    let targetX = 80;
    let targetY = 90;
    let lastTargetAt = 0;
    let lastState = '';
    let lastCompanionFrame = 0;
    let curiosityTimer = 0;

    const chooseCompanionTarget = (state, now) => {
      const bounds = chatMain.getBoundingClientRect();
      const safeWidth = Math.max(140, bounds.width - 110);
      const safeHeight = Math.max(170, bounds.height - 205);
      if (bounds.width < 560) {
        targetX = bounds.width+78;
        targetY = state === 'listening' ? safeHeight : 90+Math.random()*Math.max(140,safeHeight*.7);
        lastTargetAt = now;
        return;
      }
      if (state === 'listening') {
        targetX = Math.max(30, safeWidth - 25);
        targetY = safeHeight;
      } else if (state === 'thinking') {
        targetX = Math.random() > .2 ? Math.max(35,safeWidth-Math.random()*45) : 24+Math.random()*45;
        targetY = 55 + Math.random() * Math.max(120,safeHeight*.66);
      } else if (state === 'answering') {
        targetX = Math.max(40, safeWidth * .78);
        targetY = 75;
      } else {
        const rightLane = lastState === '' || Math.random() > .46;
        targetX = rightLane ? Math.max(35, safeWidth - Math.random()*65) : 24 + Math.random()*70;
        targetY = 45 + Math.random() * safeHeight;
      }
      lastTargetAt = now;
    };

    const animateCompanion = (now) => {
      if (chatScreen.classList.contains('hidden')) {
        setTimeout(() => requestAnimationFrame(animateCompanion), 500);
        return;
      }
      const state = chatScreen.dataset.robotState || 'idle';
      const targetLifetime = state === 'thinking' ? 1350 : state === 'idle' ? 3900 : 2600;
      if (state !== lastState || now - lastTargetAt > targetLifetime) {
        chooseCompanionTarget(state, now);
        if (lastState === '') { robotX=targetX; robotY=targetY; }
        lastState = state;
      }
      const dx = targetX - robotX;
      const dy = targetY - robotY;
      const deltaSeconds = Math.min(.05, Math.max(.001, (now-lastCompanionFrame)/1000 || .016));
      lastCompanionFrame = now;
      const smoothing = 1-Math.exp(-(state === 'thinking' ? 3.4 : 1.85)*deltaSeconds);
      robotX += dx * smoothing;
      robotY += dy * smoothing;
      const tilt = Math.max(-8, Math.min(8, dx * .025));
      companion.style.transform = `translate3d(${robotX}px, ${robotY}px, 0) rotate(${tilt}deg)`;
      companion.style.setProperty('--travel', Math.min(1, Math.abs(dx) / 120).toFixed(2));
      requestAnimationFrame(animateCompanion);
    };

    chatMain.addEventListener('pointermove', (event) => {
      const bounds = chatMain.getBoundingClientRect();
      const centerX = bounds.left + robotX + 34;
      const centerY = bounds.top + robotY + 26;
      const lookX = Math.max(-2.2, Math.min(2.2, (event.clientX - centerX) / 90));
      const lookY = Math.max(-1.8, Math.min(1.8, (event.clientY - centerY) / 90));
      companion.style.setProperty('--look-x', `${lookX}px`);
      companion.style.setProperty('--look-y', `${lookY}px`);
    }, { passive: true });

    chatMain.addEventListener('pointerdown', () => {
      companion.classList.add('is-curious');
      clearTimeout(curiosityTimer);
      curiosityTimer=setTimeout(()=>companion.classList.remove('is-curious'),1200);
    });

    requestAnimationFrame(animateCompanion);
  }

  // --- Chat Logic ---
  let selectedModel = 'tencent/hy3:free';
  const mobileModelSelect = document.getElementById('mobile-model-select');
  const desktopModelSelect = document.getElementById('desktop-model-select');

  if (mobileModelSelect) {
    mobileModelSelect.addEventListener('change', (e) => {
      selectedModel = e.target.value;
      if (desktopModelSelect) desktopModelSelect.value = selectedModel;
    });
  }
  if (desktopModelSelect) {
    desktopModelSelect.addEventListener('change', (e) => {
      selectedModel = e.target.value;
      if (mobileModelSelect) mobileModelSelect.value = selectedModel;
    });
  }

  newChatBtn.addEventListener('click', resetChat);

  // Input Auto-Grow
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 192) + 'px';
    sendBtn.disabled = chatInput.value.trim().length === 0;
    setRobotState(chatInput.value.trim() ? 'listening' : 'idle');
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) chatForm.dispatchEvent(new Event('submit'));
    }
  });

  chatMessages.addEventListener('click', (event) => {
    const starter = event.target.closest('[data-prompt]');
    if (!starter) return;
    chatInput.value = starter.dataset.prompt || '';
    chatInput.dispatchEvent(new Event('input'));
    chatInput.focus();
  });

  // Markdown Parser
  function parseMarkdown(text) {
    let html = text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      
    // Keep reasoning visually quieter and separate from the final answer.
    html = html.replace(/&lt;think&gt;([\s\S]*?)(?:&lt;\/think&gt;|$)/gi, function(match, thinkContent) {
      const isComplete = /&lt;\/think&gt;/i.test(match);
      return `</p><details class="thinking-panel" open><summary><span class="thinking-orbit"><i></i></span><b>${isComplete ? 'Thought process' : 'Thinking'}</b><span class="thinking-dots"><i></i><i></i><i></i></span></summary><div class="thinking-copy">${thinkContent.trim()}</div></details><p class="answer-copy">`;
    });

    html = html
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-white">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-5 mb-3 text-white">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4 text-white">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-800 text-gray-200 px-1.5 py-0.5 rounded font-mono text-sm">$1</code>')
      .replace(/\n\n/g, '</p><p class="mt-4">')
      .replace(/\n/g, '<br/>');

    html = html.replace(/```([\s\S]*?)```/g, function(match, code) {
      return `<pre class="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto my-4 font-mono text-sm border border-gray-700"><code>${code.trim()}</code></pre>`;
    });

    return `<p>${html}</p>`;
  }

  function appendMessage(role, content) {
    const div = document.createElement('div');
    div.className = `chat-message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
    
    if (role === 'user') {
      div.innerHTML = `<div class="user-bubble message-copy">${parseMarkdown(content)}</div>`;
    } else {
      div.innerHTML = `
        ${robotAvatarMarkup}
        <div class="message-copy">${parseMarkdown(content)}</div>
      `;
    }
    
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendTypingIndicator() {
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.className = 'chat-message assistant-message';
    div.innerHTML = `
      ${robotAvatarMarkup}
      <div class="thinking-status"><span>Thinking</span><div class="typing-dots"><i></i><i></i><i></i></div></div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;
    setRobotState('thinking');

    appendMessage('user', text);
    messages.push({ role: 'user', content: text });
    
    appendTypingIndicator();

    let aiFullText = '';
    let streamMessage = null;

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, userEmail, model: selectedModel })
      });

      removeTypingIndicator();
      
      if (!response.ok) throw new Error('API Error');
      if (!response.body) throw new Error('ReadableStream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const streamStartedAt = Date.now();
      
      // Keep stable reasoning and answer nodes throughout the stream. This preserves
      // the full visible trace without rebuilding the message on every token.
      streamMessage = document.createElement('div');
      streamMessage.className = 'chat-message assistant-message streaming-message';
      streamMessage.innerHTML = `
        ${robotAvatarMarkup}
        <div class="message-copy message-content">
          <details class="thinking-panel stream-thinking hidden" open>
            <summary><span class="thinking-orbit"><i></i></span><b>Reasoning · Live</b><span class="thinking-dots"><i></i><i></i><i></i></span></summary>
            <div class="thinking-copy"></div>
          </details>
          <div class="answer-stream answer-copy"></div>
        </div>
      `;
      chatMessages.appendChild(streamMessage);
      const thinkingPanel = streamMessage.querySelector('.stream-thinking');
      const thinkingCopy = streamMessage.querySelector('.thinking-copy');
      const thinkingLabel = streamMessage.querySelector('.thinking-panel summary b');
      const answerStream = streamMessage.querySelector('.answer-stream');

      let buffer = '';
      let reasoningText = '';
      let answerText = '';
      let renderQueued = false;

      const flushStream = () => {
        renderQueued = false;
        const nearBottom = chatMessages.scrollHeight-chatMessages.scrollTop-chatMessages.clientHeight < 130;
        if (reasoningText) {
          thinkingPanel.classList.remove('hidden');
          thinkingCopy.textContent = reasoningText;
          thinkingCopy.scrollTop = thinkingCopy.scrollHeight;
        }
        answerStream.textContent = answerText;
        if (nearBottom) chatMessages.scrollTop = chatMessages.scrollHeight;
      };

      const queueStreamRender = () => {
        if (renderQueued) return;
        renderQueued = true;
        requestAnimationFrame(flushStream);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              if (data.choices && data.choices[0].delta) {
                const delta = data.choices[0].delta;
                if (delta.reasoning) {
                  setRobotState('thinking');
                  reasoningText += delta.reasoning;
                }
                if (delta.content) {
                  setRobotState('answering');
                  answerText += delta.content;
                }
                queueStreamRender();
              }
            } catch (err) {
              console.error('Error parsing SSE:', err);
            }
          }
        }
      }

      flushStream();
      if (!reasoningText && !answerText) throw new Error('Empty model response');
      if (reasoningText) {
        const elapsedSeconds = Math.max(1,Math.round((Date.now()-streamStartedAt)/1000));
        thinkingLabel.textContent = `Reasoning · ${elapsedSeconds}s`;
      }
      answerStream.innerHTML = parseMarkdown(answerText);
      streamMessage.classList.remove('streaming-message');
      aiFullText = reasoningText ? `<think>\n${reasoningText}\n</think>\n\n${answerText}` : answerText;

    } catch (error) {
      removeTypingIndicator();
      setRobotState('idle');
      console.error(error);
      if (streamMessage) streamMessage.remove();
      aiFullText = "Sorry, I encountered an error. Please try again.";
      appendMessage('model', aiFullText);
    }
    
    messages.push({ role: 'assistant', content: aiFullText });
    setTimeout(() => setRobotState('idle'), 900);
  });
});
