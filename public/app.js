// Main Application Logic

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const splashScreen = document.getElementById('splash-screen');
  const chatScreen = document.getElementById('chat-screen');
  const navLaunchBtn = document.getElementById('nav-launch-btn');
  const heroLaunchBtn = document.getElementById('hero-launch-btn');
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
  let userEmail = '';

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
      <div class="flex gap-4 max-w-3xl mx-auto mt-10">
        <div class="w-8 h-8 rounded-full bg-white flex-shrink-0 flex items-center justify-center text-black font-bold">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <div class="flex-1 pt-1">
          <p class="text-gray-200 text-base leading-relaxed">
            How can I help you today?
          </p>
        </div>
      </div>
    `;
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
  const scrollElements = document.querySelectorAll('.scroll-anim');
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
    if (!splashScreen.classList.contains('hidden') && splashScreen.scrollTop > window.innerHeight * 0.8) {
      floatingCta.classList.remove('translate-y-32', 'opacity-0', 'pointer-events-none');
      floatingCta.classList.add('translate-y-0', 'opacity-100');
    } else {
      floatingCta.classList.add('translate-y-32', 'opacity-0', 'pointer-events-none');
      floatingCta.classList.remove('translate-y-0', 'opacity-100');
    }
  };
  
  splashScreen.addEventListener('scroll', handleScrollAnimation);
  // Trigger once on load
  handleScrollAnimation();
  
  // Form submission for email
  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
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
      closeModal();
      showChat();
    }
  });

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
      
    // Handle thinking process
    html = html.replace(/&lt;think&gt;([\s\S]*?)(?:&lt;\/think&gt;|$)/gi, function(match, thinkContent) {
       return `</p><div class="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 my-4 text-sm text-gray-400"><div class="flex items-center gap-2 mb-2 text-gray-500 font-semibold uppercase tracking-wider text-xs"><svg class="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> Thinking Process</div><div class="font-mono whitespace-pre-wrap">${thinkContent}</div></div><p class="mt-4">`;
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
    div.className = 'flex gap-4 max-w-3xl mx-auto';
    
    if (role === 'user') {
      div.innerHTML = `
        <div class="flex-1 flex justify-end">
          <div class="bg-[#2f2f2f] px-5 py-3 rounded-3xl max-w-[85%] text-gray-100 inline-block text-left text-base">
            ${parseMarkdown(content)}
          </div>
        </div>
      `;
    } else {
      div.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-white flex-shrink-0 flex items-center justify-center text-black font-bold">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <div class="flex-1 pt-1">
          <div class="text-gray-200 leading-relaxed text-base">
            ${parseMarkdown(content)}
          </div>
        </div>
      `;
    }
    
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendTypingIndicator() {
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.className = 'flex gap-4 max-w-3xl mx-auto';
    div.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-white flex-shrink-0 flex items-center justify-center text-black font-bold">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      </div>
      <div class="flex-1 pt-2">
        <div class="flex space-x-1.5 items-center h-4">
          <div class="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </div>
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
      div.className = 'flex gap-4 max-w-3xl mx-auto';
      div.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-white flex-shrink-0 flex items-center justify-center text-black font-bold">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <div class="flex-1 pt-1">
          <div class="text-gray-200 leading-relaxed text-base message-content"></div>
        </div>
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
                  if (!aiFullText.includes('<think>')) {
                    aiFullText += '<think>\n';
                  }
                  aiFullText += delta.reasoning;
                }
                if (delta.content) {
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
      console.error(error);
      aiFullText = "Sorry, I encountered an error. Please try again.";
      appendMessage('model', aiFullText);
    }
    
    messages.push({ role: 'assistant', content: aiFullText });
  });
});
