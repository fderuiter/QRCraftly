import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_CLIENT_DIR = path.join(__dirname, '../dist/client');

/**
 * Recursively search for HTML files in a directory.
 * @param {string} dir - Directory path to search.
 * @returns {string[]} List of HTML file paths.
 */
export function getHtmlFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getHtmlFiles(filePath));
    } else if (file.endsWith('.html')) {
      results.push(filePath);
    }
  }
  return results;
}

/**
 * Extract all inline script contents from HTML string.
 * @param {string} html - HTML file content.
 * @returns {string[]} List of inline script contents.
 */
export function extractInlineScripts(html) {
  // Regex to match script tags that do not have a src attribute
  const scriptRegex = /<script(?![^>]*\bsrc\b)([^>]*)>([\s\S]*?)<\/script>/gi;
  const scripts = [];
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[2]);
  }
  return scripts;
}

/**
 * Compute SHA-256 hash (Base64) for a string.
 * @param {string} content - Script content.
 * @returns {string} CSP hash format: 'sha256-...'
 */
export function computeCspHash(content) {
  const hash = crypto.createHash('sha256').update(content, 'utf8').digest('base64');
  return `'sha256-${hash}'`;
}

/**
 * Update the CSP meta tag inside an HTML string.
 * @param {string} html - Original HTML content.
 * @param {string} newCsp - New CSP policy string with actual single quotes.
 * @returns {string} Updated HTML content.
 */
export function replaceMetaCSP(html, newCsp) {
  // Convert single quotes in CSP to HTML entity &#x27; for the HTML attribute
  const escapedCsp = newCsp.replace(/'/g, '&#x27;');
  
  const metaRegex = /<meta\s+[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi;
  return html.replace(metaRegex, (match) => {
    const contentRegex = /content=(["'])([\s\S]*?)\1/i;
    if (contentRegex.test(match)) {
      return match.replace(contentRegex, `content="${escapedCsp}"`);
    }
    return match;
  });
}

/**
 * Update the script-src directive in a CSP policy string.
 * @param {string} baseCsp - The original CSP string.
 * @param {string[]} hashes - List of SHA-256 hashes to append.
 * @returns {string} The updated CSP policy string.
 */
export function updateCsp(baseCsp, hashes) {
  const directives = baseCsp.split(';').map(d => d.trim()).filter(Boolean);
  const updatedDirectives = directives.map(d => {
    if (d.startsWith('script-src')) {
      let parts = d.split(/\s+/).filter(p => p !== "'unsafe-inline'");
      parts = parts.concat(hashes);
      parts = [...new Set(parts)];
      return parts.join(' ');
    }
    return d;
  });
  return updatedDirectives.join('; ') + ';';
}

export function run() {
  console.log('[CSP Hash Injector] Starting build-time post-processing...');
  
  const htmlFiles = getHtmlFiles(DIST_CLIENT_DIR);
  if (htmlFiles.length === 0) {
    console.error(`[CSP Hash Injector] Error: No HTML files found in ${DIST_CLIENT_DIR}. Ensure you ran 'vite build' first.`);
    process.exit(1);
  }
  
  console.log(`[CSP Hash Injector] Found ${htmlFiles.length} HTML files.`);
  
  // Base CSP string to parse (matches original CSP in Head.tsx but can be parsed dynamically)
  const baseCspPattern = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';";
  
  // Map to store files and their computed specific hashes
  const fileHashesMap = new Map();
  const allUniqueHashes = new Set();
  
  for (const filePath of htmlFiles) {
    const relativePath = path.relative(DIST_CLIENT_DIR, filePath);
    const html = fs.readFileSync(filePath, 'utf8');
    const inlineScripts = extractInlineScripts(html);
    
    const fileHashes = inlineScripts.map(script => {
      const hash = computeCspHash(script);
      allUniqueHashes.add(hash);
      return hash;
    });
    
    fileHashesMap.set(filePath, fileHashes);
    console.log(`[CSP Hash Injector] File: ${relativePath} - Found ${inlineScripts.length} inline scripts.`);
  }
  
  console.log(`[CSP Hash Injector] Total unique hashes calculated: ${allUniqueHashes.size}`);
  
  // Format the global CSP string with all unique hashes
  const sortedUniqueHashes = Array.from(allUniqueHashes).sort();
  const globalCsp = updateCsp(baseCspPattern, sortedUniqueHashes);
  
  // Update HTML files with global CSP
  for (const filePath of htmlFiles) {
    const relativePath = path.relative(DIST_CLIENT_DIR, filePath);
    const html = fs.readFileSync(filePath, 'utf8');
    
    const updatedHtml = replaceMetaCSP(html, globalCsp);
    
    fs.writeFileSync(filePath, updatedHtml, 'utf8');
    console.log(`[CSP Hash Injector] Updated meta CSP in ${relativePath}`);
  }
  
  // Update _headers file
  const headersPath = path.join(DIST_CLIENT_DIR, '_headers');
  if (fs.existsSync(headersPath)) {
    let headersContent = fs.readFileSync(headersPath, 'utf8');
    const cspHeaderLine = `  Content-Security-Policy: ${globalCsp}`;
    
    if (headersContent.includes('Content-Security-Policy:')) {
      // Replace existing
      headersContent = headersContent.replace(/^[ \t]*Content-Security-Policy:.*$/m, cspHeaderLine);
    } else {
      // Append inside /* block
      if (headersContent.includes('/*')) {
        headersContent = headersContent.replace(/(\/\*\r?\n)/, `$1${cspHeaderLine}\n`);
      } else {
        headersContent += `\n/*\n${cspHeaderLine}\n`;
      }
    }
    fs.writeFileSync(headersPath, headersContent, 'utf8');
    console.log('[CSP Hash Injector] Appended Content-Security-Policy header to _headers');
  } else {
    // If _headers doesn't exist, create it
    const newHeadersContent = `/*\n  Content-Security-Policy: ${globalCsp}\n`;
    fs.writeFileSync(headersPath, newHeadersContent, 'utf8');
    console.log('[CSP Hash Injector] Created _headers file with Content-Security-Policy');
  }
  
  console.log('[CSP Hash Injector] Completed successfully.');
}

// Only run automatically if executed directly
if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('csp_hash_injector.js'))) {
  run();
}
