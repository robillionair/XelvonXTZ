document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const splashScreen = document.getElementById('splash-screen');
  const chatScreen = document.getElementById('chat-screen');
  const leadForm = document.getElementById('lead-form');
  const emailInput = document.getElementById('user-email');
  const emailError = document.getElementById('email-error');
  const submitBtn = document.getElementById('submit-btn');
  const typewriterText = document.getElementById('typewriter-text');
  
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const sendBtn = document.getElementById('send-btn');

  // --- Configuration ---
  const API_BASE = window.location.origin;

  // --- Typewriter Animation on Splash Screen ---
  const introString = "Xelvon XPT — Neural Interface Loading...";
  let introIdx = 0;
  
  function playTypewriter() {
    if (introIdx < introString.length) {
      typewriterText.textContent += introString.charAt(introIdx);
      introIdx++;
      setTimeout(playTypewriter, 40);
    }
  }
  
  // Start typewriter if on splash screen
  if (splashScreen && !splashScreen.classList.contains('hidden')) {
    playTypewriter();
  }

  // --- Access State Management ---
  const hasAccess = localStorage.getItem('xelvon_access') === 'true';
  if (hasAccess) {
    showChatConsole(false); // skip transition animation
  }

  // --- Form Email Capture Handling ---
  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    emailError.textContent = '';
    
    const emailValue = emailInput.value.trim();
    
    // Client-side regex check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      emailError.textContent = 'ERROR: Invalid neural signature format.';
      return;
    }

    // Rate-limit / double-submit protection
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.querySelector('.btn-text').textContent;
    submitBtn.querySelector('.btn-text').textContent = 'Authenticating...';

    try {
      const response = await fetch(`${API_BASE}/api/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: emailValue })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('xelvon_access', 'true');
        showChatConsole(true);
      } else {
        emailError.textContent = `CRITICAL FAILURE: ${data.error || 'Uplink verification denied.'}`;
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').textContent = originalBtnText;
      }
    } catch (err) {
      emailError.textContent = 'CRITICAL FAILURE: Remote grid offline.';
      console.error(err);
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-text').textContent = originalBtnText;
    }
  });

  // Transition from landing to chat
  function showChatConsole(animate = true) {
    if (animate) {
      splashScreen.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      splashScreen.style.opacity = '0';
      splashScreen.style.transform = 'translateY(-20px)';
      
      setTimeout(() => {
        splashScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
        document.body.classList.remove('loading-state');
        chatInput.focus();
        loadSessionChat();
      }, 400);
    } else {
      splashScreen.classList.add('hidden');
      chatScreen.classList.remove('hidden');
      document.body.classList.remove('loading-state');
      loadSessionChat();
    }
  }

  // --- Auto-growing Input Textarea ---
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = (chatInput.scrollHeight) + 'px';
  });

  // Enter to send (Shift+Enter for newlines)
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });

  // --- Conversation History Store (SessionStorage) ---
  let messages = [];

  function loadSessionChat() {
    const saved = sessionStorage.getItem('xelvon_chat_history');
    if (saved) {
      try {
        messages = JSON.parse(saved);
        // Clear dynamically except greeting
        chatMessages.innerHTML = '';
        messages.forEach(msg => {
          appendMessageUI(msg.role, msg.content);
        });
      } catch (e) {
        console.error("Failed to parse cached session:", e);
      }
    }
  }

  function saveSessionChat() {
    sessionStorage.setItem('xelvon_chat_history', JSON.stringify(messages));
  }

  function appendMessageUI(role, content) {
    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${role === 'user' ? 'user-msg' : 'ai-msg'}`;
    
    const header = document.createElement('div');
    header.className = 'bubble-header';
    header.textContent = role === 'user' ? 'OPERATOR' : 'XELVON XPT';
    
    const body = document.createElement('div');
    body.className = 'bubble-content';
    body.textContent = content;
    
    bubble.appendChild(header);
    bubble.appendChild(body);
    chatMessages.appendChild(bubble);
    
    scrollToBottom();
    return body; // return content container for live typing updates
  }

  function appendProcessingIndicator() {
    const container = document.createElement('div');
    container.className = 'processing-indicator';
    container.id = 'processing-indicator';
    
    const bar = document.createElement('span');
    bar.className = 'pulse-bar';
    
    const label = document.createElement('span');
    label.textContent = 'XELVON CORE PROCESSING...';
    
    container.appendChild(bar);
    container.appendChild(label);
    chatMessages.appendChild(container);
    scrollToBottom();
  }

  function removeProcessingIndicator() {
    const indicator = document.getElementById('processing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // --- Chat Submission & SSE Stream Parsing ---
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = chatInput.value.trim();
    if (!query) return;

    // Reset layout height
    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatInput.disabled = true;
    sendBtn.disabled = true;

    // Save to message list and render user message
    messages.push({ role: 'user', content: query });
    appendMessageUI('user', query);
    saveSessionChat();

    // Show processing indicator
    appendProcessingIndicator();

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages })
      });

      removeProcessingIndicator();

      if (!response.ok) {
        let errorText = 'Connection error.';
        try {
          const errData = await response.json();
          errorText = errData.error || errorText;
        } catch(_) {}
        appendMessageUI('assistant', `CRITICAL EXCEPTION: ${errorText}`);
        return;
      }

      // Handle streamed SSE output
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponseContent = '';
      let responseBubbleBody = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // SSE streams are parsed line by line. Custom parsing:
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const dataObj = JSON.parse(dataStr);
              const text = dataObj.choices[0]?.delta?.content || '';
              if (text) {
                if (!responseBubbleBody) {
                  // create bubble on first token received
                  responseBubbleBody = appendMessageUI('assistant', '');
                }
                assistantResponseContent += text;
                responseBubbleBody.textContent = assistantResponseContent;
                scrollToBottom();
              }
            } catch (err) {
              // skip malformed chunks or heartbeat lines
            }
          }
        }
      }

      // Save assistant response to history state
      if (assistantResponseContent) {
        messages.push({ role: 'assistant', content: assistantResponseContent });
        saveSessionChat();
      }

    } catch (err) {
      removeProcessingIndicator();
      console.error(err);
      appendMessageUI('assistant', 'CRITICAL ERROR: Neural connection failed.');
    } finally {
      chatInput.disabled = false;
      sendBtn.disabled = false;
      chatInput.focus();
    }
  });
});
