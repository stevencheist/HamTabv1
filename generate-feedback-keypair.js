// Generate RSA keypair for feedback email encryption
// Run once: node generate-feedback-keypair.js
// Store private key securely offline (both Steven and Francisco should have a copy)

const crypto = require('crypto');

console.log('Generating RSA-2048 keypair for feedback email encryption...\n');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

console.log('=== PUBLIC KEY (add to src/feedback.js) ===');
console.log(publicKey);

console.log('\n=== PRIVATE KEY (save securely, NEVER commit to git) ===');
console.log(privateKey);

console.log('\n=== USAGE ===');
console.log('To decrypt an encrypted email from a GitHub issue:');
console.log('');
console.log('node decrypt-feedback-email.js <encrypted-base64-string>');
console.log('');
console.log('Or use this code:');
console.log('');
console.log(`const crypto = require('crypto');
const fs = require('fs');

const privateKey = fs.readFileSync('feedback-private-key.pem', 'utf8');
const encryptedBase64 = process.argv[2];

const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
const decrypted = crypto.privateDecrypt(
  {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  },
  encryptedBuffer
);

console.log('Decrypted email:', decrypted.toString('utf8'));
`);

console.log('\n⚠️  IMPORTANT: Store the private key in a secure location!');
console.log('   - Save to feedback-private-key.pem (add to .gitignore)');
console.log('   - Both Steven and Francisco should have a copy');
console.log('   - Never commit the private key to git');
