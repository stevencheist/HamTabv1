// --- Feedback Modal ---

import { $ } from './dom.js';

let formOpenTime = 0; // track when form was opened (for time-based spam check)

// RSA public key for email encryption (GDPR compliance)
// Only Steven and Francisco have the private key to decrypt
const EMAIL_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsMluvnUJ2MW0r2KQIqZF
MjdGDYqGib2b4eUcoLZjaRCfTr6gPZBFEAgb5o9xWrJ/eoAMUbNU3DY+iu0OhmIH
ZpCDB1jUHm5Lzy8YPkTLtZ8323FNUdMOyOoH59+oYxabZLZoHHtDF4y1uwIL6TFM
d87aR9tHibSG8qUhpBnbqplxRbrkDolRw8hAWsCl9W3tMsLYd7rAKXRQRbR+zUuK
ckjhF//MaPhf4OA1DPeXhzNEN/jCVe16FkqiHR+3TDAZUf76RpBV/Rr+XUE4oV4B
r6IHztIUIH85apHFFGAZkhMtrqHbhc8Er26EILCCHl/7vGS0dfj9WyT1urWcrRbu
8wIDAQAB
-----END PUBLIC KEY-----`;

// Encrypt email address using RSA-OAEP (client-side only, GDPR-compliant)
async function encryptEmail(email) {
  if (!email || !email.trim()) return '';

  try {
    // Import public key
    const publicKeyData = EMAIL_PUBLIC_KEY
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '');

    const binaryKey = Uint8Array.from(atob(publicKeyData), c => c.charCodeAt(0));
    const publicKey = await crypto.subtle.importKey(
      'spki',
      binaryKey,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );

    // Encrypt email
    const encoder = new TextEncoder();
    const emailData = encoder.encode(email.trim());
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      emailData
    );

    // Convert to base64 for transmission
    const encryptedArray = new Uint8Array(encryptedBuffer);
    return btoa(String.fromCharCode(...encryptedArray));
  } catch (err) {
    console.error('Email encryption failed:', err);
    // If encryption fails, don't send the email at all (privacy-first)
    return '';
  }
}

// Open feedback modal
function openFeedback() {
  $('feedbackSplash').classList.remove('hidden');
  $('feedbackForm').reset();
  $('feedbackStatus').classList.add('hidden');
  $('feedbackCharCount').textContent = '0';
  $('feedbackSubmit').disabled = false;
  formOpenTime = Date.now();
  $('feedbackMessage').focus();
}

// Close feedback modal
function closeFeedback() {
  $('feedbackSplash').classList.add('hidden');
}

// Update character count
function updateCharCount() {
  const textarea = $('feedbackMessage');
  const count = textarea.value.length;
  $('feedbackCharCount').textContent = count;
}

// Show status message
function showStatus(message, type) {
  const status = $('feedbackStatus');
  status.textContent = message;
  status.className = 'feedback-status ' + type;
}

// Submit feedback
async function submitFeedback(e) {
  e.preventDefault();

  const submitBtn = $('feedbackSubmit');
  const form = $('feedbackForm');

  // Get form data
  const formData = new FormData(form);
  const emailRaw = formData.get('email') || '';

  // Encrypt email for GDPR compliance (only Steven and Francisco can decrypt)
  const emailEncrypted = emailRaw ? await encryptEmail(emailRaw) : '';

  const data = {
    name: formData.get('name') || '',
    email: emailEncrypted, // encrypted email or empty string
    feedback: formData.get('feedback') || '',
    website: formData.get('website') || '' // honeypot
  };

  // Client-side validation
  if (data.feedback.length < 10) {
    showStatus('Feedback must be at least 10 characters', 'error');
    return;
  }

  if (data.feedback.length > 5000) {
    showStatus('Feedback must be less than 5000 characters', 'error');
    return;
  }

  // Time-based check (must take at least 3 seconds to fill form)
  const timeSinceOpen = Date.now() - formOpenTime;
  if (timeSinceOpen < 3000) {
    showStatus('Please take a moment to review your feedback', 'error');
    return;
  }

  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  showStatus('Sending your feedback...', 'success');

  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok) {
      showStatus('Thank you! Your feedback has been submitted successfully.', 'success');
      form.reset();
      updateCharCount();
      // Close modal after 2 seconds
      setTimeout(closeFeedback, 2000);
    } else {
      showStatus(result.error || 'Failed to submit feedback. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Feedback';
    }
  } catch (err) {
    console.error('Feedback submission error:', err);
    showStatus('Network error. Please check your connection and try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Feedback';
  }
}

// Initialize feedback listeners
export function initFeedbackListeners() {
  const feedbackBtn = $('feedbackBtn');
  const feedbackCancel = $('feedbackCancel');
  const feedbackForm = $('feedbackForm');
  const feedbackMessage = $('feedbackMessage');
  const feedbackSplash = $('feedbackSplash');

  // Open feedback modal
  feedbackBtn.addEventListener('click', openFeedback);

  // Close feedback modal
  feedbackCancel.addEventListener('click', closeFeedback);
  feedbackSplash.addEventListener('click', (e) => {
    if (e.target === feedbackSplash) closeFeedback();
  });

  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !feedbackSplash.classList.contains('hidden')) {
      closeFeedback();
    }
  });

  // Update character count
  feedbackMessage.addEventListener('input', updateCharCount);

  // Submit form
  feedbackForm.addEventListener('submit', submitFeedback);
}
