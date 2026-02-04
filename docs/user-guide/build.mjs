/**
 * HamTab User Guide PDF Generator
 *
 * Converts Markdown content files to a styled PDF user guide.
 * Uses marked for Markdown parsing and Puppeteer for PDF generation.
 *
 * Usage: node docs/user-guide/build.mjs
 */

import puppeteer from 'puppeteer';
import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '../..');

// Read version from package.json
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
const VERSION = pkg.version;

// Configure marked for better output
marked.setOptions({
  gfm: true,        // GitHub Flavored Markdown
  breaks: false,    // Don't convert \n to <br>
  headerIds: true,  // Add IDs to headers for linking
});

/**
 * Custom renderer to add CSS classes to special blocks
 */
const renderer = new marked.Renderer();

// Convert blockquotes with special prefixes to styled callout boxes
renderer.blockquote = function(quote) {
  const text = quote.text || quote;
  // Check for div class markers in the text
  if (text.includes('class="tip"') || text.includes('class="warning"') || text.includes('class="important"')) {
    return text;
  }
  return `<blockquote>${text}</blockquote>`;
};

marked.use({ renderer });

/**
 * Extract headings from markdown for table of contents
 */
function extractHeadings(markdown, fileIndex) {
  const headings = [];
  // Normalize line endings and split
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  for (const line of lines) {
    // Match h1 (single #) - must not start with ##
    const h1Match = line.match(/^#\s+(.+)/);
    const h2Match = line.match(/^##\s+(.+)/);

    // Check h2 first since h1 pattern also matches h2
    if (h2Match) {
      headings.push({ level: 2, text: h2Match[1].trim(), file: fileIndex });
    } else if (h1Match && !line.startsWith('##')) {
      headings.push({ level: 1, text: h1Match[1].trim(), file: fileIndex });
    }
  }

  return headings;
}

/**
 * Generate HTML for table of contents
 */
function generateTOC(allHeadings) {
  let toc = '';

  for (const heading of allHeadings) {
    const levelClass = `toc-level-${heading.level}`;
    // Skip cover page headings
    if (heading.text.toLowerCase().includes('hamtab user guide')) continue;

    toc += `<div class="toc-entry ${levelClass}">${heading.text}</div>\n`;
  }

  return toc;
}

/**
 * Process special syntax in markdown
 * Converts <div class="tip">...</div> style markers
 */
function processSpecialSyntax(html) {
  // The HTML already contains proper div tags, just return as-is
  return html;
}

/**
 * Main build function
 */
async function buildPDF() {
  console.log(`Building HamTab User Guide v${VERSION}...`);

  // 1. Read all markdown files in order
  const contentDir = path.join(__dirname, 'content');
  const files = fs.readdirSync(contentDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  console.log(`Found ${files.length} content files`);

  // 2. Process each file
  let allContent = '';
  let allHeadings = [];

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const markdown = fs.readFileSync(filePath, 'utf8');

    // Skip empty files (like cover placeholder)
    if (!markdown.trim()) continue;

    // Extract headings for TOC
    const headings = extractHeadings(markdown, file);
    allHeadings.push(...headings);

    // Convert to HTML
    let html = marked(markdown);
    html = processSpecialSyntax(html);

    allContent += html + '\n';
  }

  console.log(`Extracted ${allHeadings.length} headings for TOC`);

  // 3. Generate TOC HTML
  const tocHtml = generateTOC(allHeadings);

  // 4. Load and populate template
  const templatePath = path.join(__dirname, 'template/guide.html');
  let template = fs.readFileSync(templatePath, 'utf8');

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  template = template
    .replace(/\{\{VERSION\}\}/g, VERSION)
    .replace(/\{\{DATE\}\}/g, today)
    .replace('{{TOC}}', tocHtml)
    .replace('{{CONTENT}}', allContent);

  // 5. Write debug HTML (optional, for troubleshooting)
  const debugHtmlPath = path.join(__dirname, 'debug-output.html');
  fs.writeFileSync(debugHtmlPath, template);
  console.log(`Debug HTML written to: ${debugHtmlPath}`);

  // 6. Generate PDF with Puppeteer
  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set content with base URL for relative paths (if we add images later)
  await page.setContent(template, {
    waitUntil: 'networkidle0',
    baseURL: `file://${__dirname}/`
  });

  // Generate PDF
  const outputPath = path.join(ROOT_DIR, 'public/HamTab-User-Guide.pdf');

  await page.pdf({
    path: outputPath,
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '0.75in',
      bottom: '0.75in',
      left: '0.75in',
      right: '0.75in'
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size:9px; color:#999; width:100%; text-align:right; padding-right:0.75in; padding-top:0.25in;">
        HamTab User Guide v${VERSION}
      </div>
    `,
    footerTemplate: `
      <div style="font-size:10px; color:#666; width:100%; text-align:center; padding-bottom:0.25in;">
        <span class="pageNumber"></span>
      </div>
    `
  });

  await browser.close();

  // 7. Report success
  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log('');
  console.log('=' .repeat(50));
  console.log(`SUCCESS: Generated HamTab User Guide`);
  console.log(`  Version: ${VERSION}`);
  console.log(`  Output:  ${outputPath}`);
  console.log(`  Size:    ${sizeMB} MB`);
  console.log('=' .repeat(50));
}

// Run the build
buildPDF().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
