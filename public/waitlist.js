(() => {
  const form = document.getElementById('anansi-waitlist-form');
  const emailInput = document.getElementById('anansi-waitlist-email');
  const status = document.getElementById('anansi-waitlist-status');
  if (!form || !emailInput || !status) return;

  const button = form.querySelector('button[type="submit"]');
  const buttonLabel = button?.querySelector('span');
  const defaultLabel = buttonLabel?.textContent || 'Request early access';
  const source = form.dataset.source || 'anansi-early-access';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = 'Enter a valid email address to join the first thread.';
      status.dataset.state = 'error';
      emailInput.focus();
      return;
    }

    if (button) button.disabled = true;
    if (buttonLabel) buttonLabel.textContent = 'Securing your thread…';
    status.textContent = 'Connecting your request to the controlled release program…';
    status.dataset.state = 'loading';

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          email,
          product: 'anansi',
          source
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'The early-access request could not be saved.');
      }

      form.classList.add('is-complete');
      emailInput.disabled = true;
      if (buttonLabel) buttonLabel.textContent = 'Thread secured';
      status.textContent = 'YOU ARE NOW PART OF THE FIRST THREAD. Selected participants will be contacted as ANANSI approaches controlled release.';
      status.dataset.state = 'success';
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Connection error. Please try again.';
      status.dataset.state = 'error';
      if (button) button.disabled = false;
      if (buttonLabel) buttonLabel.textContent = defaultLabel;
    }
  });
})();
