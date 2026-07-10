// Main Application Logic

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const splashScreen = document.getElementById('splash-screen');
  const chatScreen = document.getElementById('chat-screen');
  const navLaunchBtn = document.getElementById('nav-launch-btn');
  const heroLaunchBtn = document.getElementById('hero-launch-btn');
  const footerLaunchBtn = document.getElementById('footer-launch-btn');
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
      <div class="chat-message assistant-message">
        ${robotAvatarMarkup}
        <div class="message-copy"><p>The intelligence layer is ready. What are we solving today?</p></div>
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
  
  if (floatingLaunchBtn) floatingLaunchBtn.addEventListener('click', showChat);

  const elementInView = (el, percentageScroll = 85) => {
    const elementTop = el.getBoundingClientRect().top;
    return (
      elementTop <= 
      ((window.innerHeight || document.documentElement.clientHeight) * (percentageScroll/100))
    );
  };
  
  const handleScrollAnimation = () => {
    scrollElements.forEach((el) => {
      if (elementInView(el, 90)) {
        el.classList.add('is-visible');
      }
    });

    // Handle floating CTA visibility
    if (!splashScreen.classList.contains('hidden') && splashScreen.scrollTop > window.innerHeight * 0.8 && splashScreen.scrollTop < splashScreen.scrollHeight - window.innerHeight * 1.15) {
      floatingCta.classList.add('is-visible');
    } else {
      floatingCta.classList.remove('is-visible');
    }
  };
  
  splashScreen.addEventListener('scroll', handleScrollAnimation);
  // Trigger once on load
  handleScrollAnimation();

  // Recover gracefully if a stale form submission reached the GET fallback.
  const accessState = new URLSearchParams(window.location.search).get('access');
  if (accessState === 'retry') {
    history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    openModal();
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
  if (!reduceMotion) {
    splashScreen.addEventListener('pointermove', (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      splashScreen.style.setProperty('--mx', x.toFixed(3));
      splashScreen.style.setProperty('--my', y.toFixed(3));
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
  }

  function createNeuralField(canvas, options = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dots = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    const density = options.density || 10000;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots.length = 0;
      const count = Math.min(95, Math.max(34, Math.floor((width * height) / density)));
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

    const draw = () => {
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

    const chooseCompanionTarget = (state, now) => {
      const bounds = chatMain.getBoundingClientRect();
      const safeWidth = Math.max(140, bounds.width - 110);
      const safeHeight = Math.max(170, bounds.height - 205);
      if (state === 'listening') {
        targetX = Math.max(30, safeWidth - 25);
        targetY = safeHeight;
      } else if (state === 'thinking') {
        targetX = Math.max(35, safeWidth * (.3 + Math.random() * .4));
        targetY = 55 + Math.random() * Math.min(170, safeHeight * .36);
      } else if (state === 'answering') {
        targetX = Math.max(40, safeWidth * .78);
        targetY = 75;
      } else {
        targetX = 25 + Math.random() * safeWidth;
        targetY = 45 + Math.random() * safeHeight;
      }
      lastTargetAt = now;
    };

    const animateCompanion = (now) => {
      if (!chatScreen.classList.contains('hidden')) {
        const state = chatScreen.dataset.robotState || 'idle';
        const targetLifetime = state === 'thinking' ? 1350 : state === 'idle' ? 3900 : 2600;
        if (state !== lastState || now - lastTargetAt > targetLifetime) {
          chooseCompanionTarget(state, now);
          lastState = state;
        }
        const dx = targetX - robotX;
        const dy = targetY - robotY;
        const speed = state === 'thinking' ? .035 : .022;
        robotX += dx * speed;
        robotY += dy * speed;
        const tilt = Math.max(-8, Math.min(8, dx * .025));
        companion.style.transform = `translate3d(${robotX}px, ${robotY}px, 0) rotate(${tilt}deg)`;
        companion.style.setProperty('--travel', Math.min(1, Math.abs(dx) / 120).toFixed(2));
      }
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
      companion.classList.remove('is-curious');
      void companion.offsetWidth;
      companion.classList.add('is-curious');
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
      
      // Create empty message container
      const div = document.createElement('div');
      div.className = 'chat-message assistant-message';
      div.innerHTML = `
        ${robotAvatarMarkup}
        <div class="message-copy message-content"></div>
      `;
      chatMessages.appendChild(div);
      const contentDiv = div.querySelector('.message-content');

      let buffer = '';
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
                  if (!aiFullText.includes('<think>')) {
                    aiFullText += '<think>\n';
                  }
                  aiFullText += delta.reasoning;
                }
                if (delta.content) {
                  setRobotState('answering');
                  if (aiFullText.includes('<think>') && !aiFullText.includes('</think>')) {
                    aiFullText += '\n</think>\n\n';
                  }
                  aiFullText += delta.content;
                }
                contentDiv.innerHTML = parseMarkdown(aiFullText);
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            } catch (err) {
              console.error('Error parsing SSE:', err);
            }
          }
        }
      }

    } catch (error) {
      removeTypingIndicator();
      setRobotState('idle');
      console.error(error);
      aiFullText = "Sorry, I encountered an error. Please try again.";
      appendMessage('model', aiFullText);
    }
    
    messages.push({ role: 'assistant', content: aiFullText });
    setTimeout(() => setRobotState('idle'), 900);
  });
});
