#!/usr/bin/env node
// Decrypt feedback email from GitHub issue
// Usage: node decrypt-feedback-email.js <encrypted-base64-string>
//
// Example from GitHub issue:
//   Email: aBcD123...encrypted-base64...XyZ789==
//   Run: node decrypt-feedback-email.js aBcD123...encrypted-base64...XyZ789==

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PRIVATE_KEY_PATH = path.join(__dirname, 'feedback-private-key.pem');

function decryptEmail(encryptedBase64) {
  try {
    // Check if private key exists
    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
      console.error('❌ Error: feedback-private-key.pem not found');
      console.error('   Ask Steven or Francisco for a copy of the private key');
      console.error(`   Save it to: ${PRIVATE_KEY_PATH}`);
      process.exit(1);
    }

    // Read private key
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

    // Decrypt
    const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      encryptedBuffer
    );

    return decrypted.toString('utf8');
  } catch (err) {
    console.error('❌ Decryption failed:', err.message);
    console.error('   Make sure:');
    console.error('   1. The encrypted string is copied correctly from the GitHub issue');
    console.error('   2. The private key file matches the public key used for encryption');
    process.exit(1);
  }
}

// Main
if (process.argv.length < 3) {
  console.log('Usage: node decrypt-feedback-email.js <encrypted-base64-string>');
  console.log('');
  console.log('Example:');
  console.log('  node decrypt-feedback-email.js aBcD123...XyZ789==');
  console.log('');
  console.log('The encrypted string can be found in the GitHub issue body under "Email:"');
  process.exit(1);
}

const encryptedBase64 = process.argv[2];
const decryptedEmail = decryptEmail(encryptedBase64);

console.log('✅ Decrypted email:', decryptedEmail);
