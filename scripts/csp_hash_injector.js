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
 * @param {boolean} [excludeJson=false] - If true, exclude non-executable script tags (like type="application/json" or "application/ld+json").
 * @returns {string[]} List of inline script contents.
 */
export function extractInlineScripts(html, excludeJson = false) {
  // Regex to match script tags that do not have a src attribute
  const scriptRegex = /<script(?![^>]*\bsrc\b)([^>]*)>([\s\S]*?)<\/script>/gi;
  const scripts = [];
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const attributes = match[1];
    const content = match[2];
    
    if (excludeJson) {
      const typeMatch = /type=["']([^"']*)["']/i.exec(attributes);
      if (typeMatch) {
        const typeValue = typeMatch[1].toLowerCase().trim();
        if (typeValue === 'application/json' || typeValue === 'application/ld+json' || typeValue === 'importmap') {
          continue;
        }
      }
    }
    
    scripts.push(content);
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

export function pathToRoute(relativePath) {
  let posixPath = relativePath.replace(/\\/g, '/');
  if (posixPath.startsWith('/')) {
    posixPath = posixPath.slice(1);
  }
  if (posixPath === 'index.html') {
    return '/';
  }
  if (posixPath.endsWith('/index.html')) {
    return '/' + posixPath.slice(0, -11);
  }
  if (posixPath.endsWith('.html')) {
    return '/' + posixPath.slice(0, -5);
  }
  return '/' + posixPath;
}

/**
 * Generate _headers file content with route-scoped Content-Security-Policy rules.
 * @param {string} existingHeadersContent - Raw content of existing _headers file.
 * @param {string} baseCsp - Base CSP string without route script hashes.
 * @param {Map<string, { routeCsp: string, hashes: string[] }>} routeCspMap - Map of route -> { routeCsp, hashes }.
 * @returns {string} Updated _headers file content.
 */
export function generateHeadersContent(existingHeadersContent, baseCsp, routeCspMap) {
  const routesMap = new Map();
  
  if (existingHeadersContent) {
    const lines = existingHeadersContent.split(/\r?\n/);
    let currentRoute = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      if (line.startsWith(' ') || line.startsWith('\t')) {
        if (currentRoute) {
          const colonIndex = trimmed.indexOf(':');
          if (colonIndex !== -1) {
            const name = trimmed.substring(0, colonIndex).trim();
            const value = trimmed.substring(colonIndex + 1).trim();
            if (name.toLowerCase() !== 'content-security-policy') {
              if (!routesMap.has(currentRoute)) {
                routesMap.set(currentRoute, []);
              }
              routesMap.get(currentRoute).push(`  ${name}: ${value}`);
            }
          }
        }
      } else {
        currentRoute = trimmed;
        if (!routesMap.has(currentRoute)) {
          routesMap.set(currentRoute, []);
        }
      }
    }
  }

  if (!routesMap.has('/*')) {
    routesMap.set('/*', []);
  }

  const globalHeaders = routesMap.get('/*');
  globalHeaders.unshift(`  Content-Security-Policy: ${baseCsp}`);

  for (const [route, info] of routeCspMap.entries()) {
    if (route === '/*') continue;
    
    if (!routesMap.has(route)) {
      routesMap.set(route, []);
    }
    const routeHeaders = routesMap.get(route);
    const filteredHeaders = routeHeaders.filter(h => !h.trim().toLowerCase().startsWith('content-security-policy:'));
    filteredHeaders.unshift(`  Content-Security-Policy: ${info.routeCsp}`);
    routesMap.set(route, filteredHeaders);
  }

  const sortedRoutes = Array.from(routesMap.keys()).sort((a, b) => {
    if (a === '/*') return -1;
    if (b === '/*') return 1;
    return a.localeCompare(b);
  });

  const blocks = [];
  for (const route of sortedRoutes) {
    const headers = routesMap.get(route);
    if (headers && headers.length > 0) {
      blocks.push(`${route}\n${headers.join('\n')}`);
    }
  }

  return blocks.join('\n\n') + '\n';
}

export function run() {
  console.log('[CSP Hash Injector] Starting build-time post-processing...');
  
  const htmlFiles = getHtmlFiles(DIST_CLIENT_DIR);
  if (htmlFiles.length === 0) {
    console.error(`[CSP Hash Injector] Error: No HTML files found in ${DIST_CLIENT_DIR}. Ensure you ran 'vite build' first.`);
    process.exit(1);
  }
  
  console.log(`[CSP Hash Injector] Found ${htmlFiles.length} HTML files.`);
  
  // Base CSP string to parse
  const baseCspPattern = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';";
  
  const baseCsp = updateCsp(baseCspPattern, []);
  const routeCspMap = new Map();
  let totalHashesProcessed = 0;
  
  for (const filePath of htmlFiles) {
    const relativePath = path.relative(DIST_CLIENT_DIR, filePath);
    const route = pathToRoute(relativePath);
    const html = fs.readFileSync(filePath, 'utf8');
    const inlineScripts = extractInlineScripts(html, true);
    
    const fileHashes = inlineScripts.map(script => computeCspHash(script));
    totalHashesProcessed += fileHashes.length;
    
    const routeCsp = updateCsp(baseCspPattern, fileHashes);
    routeCspMap.set(route, { filePath, relativePath, hashes: fileHashes, routeCsp });
    
    const updatedHtml = replaceMetaCSP(html, routeCsp);
    fs.writeFileSync(filePath, updatedHtml, 'utf8');
    console.log(`[CSP Hash Injector] Updated meta CSP in ${relativePath} for route "${route}"`);
  }
  
  console.log(`[CSP Hash Injector] Total inline script hashes processed across routes: ${totalHashesProcessed}`);
  
  // Update _headers file
  const headersPath = path.join(DIST_CLIENT_DIR, '_headers');
  let existingHeadersContent = '';
  if (fs.existsSync(headersPath)) {
    existingHeadersContent = fs.readFileSync(headersPath, 'utf8');
  }
  
  const newHeadersContent = generateHeadersContent(existingHeadersContent, baseCsp, routeCspMap);
  fs.writeFileSync(headersPath, newHeadersContent, 'utf8');
  console.log('[CSP Hash Injector] Updated _headers file with route-scoped Content-Security-Policy rules');

  // --- VALIDATION GATE ---
  console.log('[CSP Hash Injector] Validating headers against Cloudflare limits...');
  try {
    const results = validateHeaders(baseCsp, newHeadersContent);
    console.log(`[CSP Hash Injector] Base CSP length: ${results.cspLength} characters.`);
    console.log(`[CSP Hash Injector] Total _headers file size: ${results.totalHeadersSize} bytes.`);
    for (const route of Object.keys(results.routeHeaders)) {
      const routeSize = results.routeHeaders[route].reduce((sum, h) => sum + h.size, 0);
      console.log(`[CSP Hash Injector] Route "${route}" total headers size: ${routeSize} bytes.`);
    }
  } catch (error) {
    console.error(`[CSP Hash Injector] BUILD FAILURE: ${error.message}`);
    process.exit(1);
  }

  console.log('[CSP Hash Injector] Completed successfully.');
}

/**
 * Validate that headers meet Cloudflare Pages limits.
 * @param {string} csp - The Content-Security-Policy header value or headersContent if single param.
 * @param {string} [headersContent] - The raw content of the _headers file.
 * @returns {object} results detailing the parsed and validated headers.
 * @throws {Error} if any limit is breached.
 */
export function validateHeaders(csp, headersContent) {
  let headerContentToValidate = headersContent;
  let cspToValidate = csp;
  
  if (headersContent === undefined && typeof csp === 'string') {
    headerContentToValidate = csp;
    cspToValidate = undefined;
  }

  if (cspToValidate) {
    const cspLength = cspToValidate.length;
    if (cspLength > 2000) {
      throw new Error(`Content-Security-Policy header value size (${cspLength} chars) exceeds Cloudflare's individual header limit of 2,000 characters!`);
    }
  }

  const totalHeadersSize = Buffer.byteLength(headerContentToValidate, 'utf8');
  if (totalHeadersSize > 8192) {
    throw new Error(`Total _headers file size (${totalHeadersSize} bytes) exceeds Cloudflare's limit of 8,192 bytes (8KB)!`);
  }

  const lines = headerContentToValidate.split(/\r?\n/);
  let currentRoute = null;
  let currentRouteHeadersSize = 0;
  const routeHeaders = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (!currentRoute) {
        throw new Error(`Syntax error in _headers: header "${trimmed}" specified without a route.`);
      }
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) {
        throw new Error(`Syntax error in _headers: header "${trimmed}" lacks a colon.`);
      }
      const name = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      if (value.length > 2000) {
        throw new Error(`Header "${name}" value in route "${currentRoute}" exceeds 2,000 characters (length: ${value.length})!`);
      }
      
      const headerSize = Buffer.byteLength(`${name}: ${value}`, 'utf8');
      currentRouteHeadersSize += headerSize;
      if (!routeHeaders[currentRoute]) {
        routeHeaders[currentRoute] = [];
      }
      routeHeaders[currentRoute].push({ name, value, size: headerSize });
    } else {
      if (currentRoute) {
        if (currentRouteHeadersSize > 8192) {
          throw new Error(`Route "${currentRoute}" total headers size (${currentRouteHeadersSize} bytes) exceeds Cloudflare limit of 8,192 bytes!`);
        }
      }
      currentRoute = trimmed;
      currentRouteHeadersSize = 0;
      routeHeaders[currentRoute] = [];
    }
  }
  
  if (currentRoute) {
    if (currentRouteHeadersSize > 8192) {
      throw new Error(`Route "${currentRoute}" total headers size (${currentRouteHeadersSize} bytes) exceeds Cloudflare limit of 8,192 bytes!`);
    }
  }

  return {
    cspLength: cspToValidate ? cspToValidate.length : 0,
    totalHeadersSize,
    routeHeaders
  };
}

// Only run automatically if executed directly
if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('csp_hash_injector.js'))) {
  run();
}
