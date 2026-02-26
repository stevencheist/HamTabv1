// Generate favicon and app icons from SVG source
// Usage: node scripts/generate-icons.mjs

import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

// HamTab icon: antenna/signal motif on dark background
// Design: stylized radio tower with radiating waves, cyan accent on dark
const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#1a1a1a"/>
  <!-- Antenna mast -->
  <line x1="256" y1="380" x2="256" y2="140" stroke="#e0e0e0" stroke-width="20" stroke-linecap="round"/>
  <!-- Antenna crossbar -->
  <line x1="196" y1="170" x2="316" y2="170" stroke="#e0e0e0" stroke-width="14" stroke-linecap="round"/>
  <!-- Antenna top -->
  <circle cx="256" cy="130" r="12" fill="#00e5ff"/>
  <!-- Radio waves (concentric arcs) -->
  <path d="M 340 170 A 90 90 0 0 1 340 260" fill="none" stroke="#00e5ff" stroke-width="12" stroke-linecap="round" opacity="0.9"/>
  <path d="M 370 145 A 130 130 0 0 1 370 285" fill="none" stroke="#00e5ff" stroke-width="10" stroke-linecap="round" opacity="0.6"/>
  <path d="M 400 120 A 170 170 0 0 1 400 310" fill="none" stroke="#00e5ff" stroke-width="8" stroke-linecap="round" opacity="0.35"/>
  <!-- Ground/base -->
  <line x1="206" y1="380" x2="306" y2="380" stroke="#e0e0e0" stroke-width="14" stroke-linecap="round"/>
  <!-- HT text -->
  <text x="256" y="460" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="80" fill="#00e5ff" text-anchor="middle">HT</text>
</svg>`;

// Maskable icon needs safe zone padding (icon content in center 80%)
const SVG_MASKABLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1a1a1a"/>
  <!-- Safe zone: center 80% = 51.2 to 460.8, so scale content into that area -->
  <g transform="translate(64, 64) scale(0.75)">
    <!-- Antenna mast -->
    <line x1="256" y1="380" x2="256" y2="140" stroke="#e0e0e0" stroke-width="22" stroke-linecap="round"/>
    <!-- Antenna crossbar -->
    <line x1="196" y1="170" x2="316" y2="170" stroke="#e0e0e0" stroke-width="16" stroke-linecap="round"/>
    <!-- Antenna top -->
    <circle cx="256" cy="130" r="14" fill="#00e5ff"/>
    <!-- Radio waves -->
    <path d="M 340 170 A 90 90 0 0 1 340 260" fill="none" stroke="#00e5ff" stroke-width="14" stroke-linecap="round" opacity="0.9"/>
    <path d="M 370 145 A 130 130 0 0 1 370 285" fill="none" stroke="#00e5ff" stroke-width="12" stroke-linecap="round" opacity="0.6"/>
    <path d="M 400 120 A 170 170 0 0 1 400 310" fill="none" stroke="#00e5ff" stroke-width="10" stroke-linecap="round" opacity="0.35"/>
    <!-- Ground -->
    <line x1="206" y1="380" x2="306" y2="380" stroke="#e0e0e0" stroke-width="16" stroke-linecap="round"/>
    <!-- HT text -->
    <text x="256" y="460" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="80" fill="#00e5ff" text-anchor="middle">HT</text>
  </g>
</svg>`;

async function generateIcons() {
  // Ensure output directories exist
  mkdirSync(iconsDir, { recursive: true });

  const svgBuffer = Buffer.from(SVG_ICON);
  const svgMaskableBuffer = Buffer.from(SVG_MASKABLE);

  // 1. SVG favicon (modern browsers)
  writeFileSync(join(publicDir, 'favicon.svg'), SVG_ICON);
  console.log('Created favicon.svg');

  // 2. favicon.ico — 32x32 PNG (ICO format not natively supported by sharp,
  //    but a 32x32 PNG named .ico works in all modern browsers)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon.ico'));
  console.log('Created favicon.ico (32x32 PNG)');

  // 3. favicon-16.png and favicon-32.png for <link rel="icon"> tags
  await sharp(svgBuffer).resize(16, 16).png().toFile(join(publicDir, 'favicon-16.png'));
  await sharp(svgBuffer).resize(32, 32).png().toFile(join(publicDir, 'favicon-32.png'));
  console.log('Created favicon-16.png, favicon-32.png');

  // 4. Apple touch icon (180x180)
  await sharp(svgBuffer).resize(180, 180).png().toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png (180x180)');

  // 5. PWA icons
  await sharp(svgBuffer).resize(192, 192).png().toFile(join(iconsDir, 'icon-192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(join(iconsDir, 'icon-512.png'));
  console.log('Created icons/icon-192.png, icons/icon-512.png');

  // 6. Maskable PWA icons (with safe zone padding)
  await sharp(svgMaskableBuffer).resize(192, 192).png().toFile(join(iconsDir, 'icon-maskable-192.png'));
  await sharp(svgMaskableBuffer).resize(512, 512).png().toFile(join(iconsDir, 'icon-maskable-512.png'));
  console.log('Created icons/icon-maskable-192.png, icons/icon-maskable-512.png');

  console.log('\nDone! All icons generated in public/');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
