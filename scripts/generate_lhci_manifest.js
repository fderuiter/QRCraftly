import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist/client');
const LIGHTHOUSE_RC_FILE = path.resolve(__dirname, '../lighthouserc.json');

function findHtmlFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findHtmlFiles(filePath, fileList);
    } else if (filePath.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function generateLhciManifest() {
  if (!fs.existsSync(DIST_DIR)) {
    console.warn(`[LHCI Manifest] Directory ${DIST_DIR} does not exist. Skipping LHCI manifest generation.`);
    return;
  }

  const htmlFiles = findHtmlFiles(DIST_DIR);
  
  // Log all pre-rendered HTML routes found (should be 11)
  console.log(`[LHCI Manifest] Found ${htmlFiles.length} pre-rendered HTML routes/files:`);
  htmlFiles.forEach(file => {
    const rel = path.relative(DIST_DIR, file);
    console.log(`  - ${rel}`);
  });

  const allRoutes = [];

  for (const file of htmlFiles) {
    const relativePath = path.relative(DIST_DIR, file);
    const posixPath = relativePath.split(path.sep).join('/');
    
    // Exclude 404, draft, test, and sandbox pages from the audit list
    if (posixPath.endsWith('404.html')) continue;
    if (posixPath.includes('draft') || posixPath.includes('test') || posixPath.includes('dev-sandbox')) continue;

    let route = `/${posixPath}`;
    
    // Clean up index.html from paths
    if (route.endsWith('/index.html')) {
      route = route.slice(0, -10); // remove '/index.html'
    } else if (route.endsWith('index.html')) {
      route = route.slice(0, -10); // just in case it's 'index.html' at root
    } else if (route.endsWith('.html')) {
      route = route.slice(0, -5); // remove '.html'
    }
    
    // Ensure root is just /
    if (route === '' || route === '/') {
      route = '/';
    } else if (route.endsWith('/')) {
      route = route.slice(0, -1);
    }

    if (!allRoutes.includes(route)) {
      allRoutes.push(route);
    }
  }

  // Prioritize representative key routes to prevent CI runner resource exhaustion/timeouts
  const priorityRoutes = ['/', '/about', '/security', '/vcard-qr-code', '/audio-qr'];
  const selectedRoutes = priorityRoutes.filter((r) => allRoutes.includes(r));
  for (const route of allRoutes) {
    if (selectedRoutes.length >= 5) break;
    if (!selectedRoutes.includes(route)) {
      selectedRoutes.push(route);
    }
  }

  const urls = selectedRoutes.map((route) => `http://localhost${route}`);

  // Read current lighthouserc.json
  if (!fs.existsSync(LIGHTHOUSE_RC_FILE)) {
    console.error(`[LHCI Manifest] ${LIGHTHOUSE_RC_FILE} not found!`);
    return;
  }

  const lhciConfig = JSON.parse(fs.readFileSync(LIGHTHOUSE_RC_FILE, 'utf8'));

  // Ensure structure
  if (!lhciConfig.ci) lhciConfig.ci = {};
  if (!lhciConfig.ci.collect) lhciConfig.ci.collect = {};
  
  lhciConfig.ci.collect.url = urls;
  lhciConfig.ci.collect.numberOfRuns = 1;
  lhciConfig.ci.collect.settings = {
    chromeFlags: '--headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu',
  };

  // Ensure strict SEO threshold of 0.95
  if (!lhciConfig.ci.assert) lhciConfig.ci.assert = {};
  if (!lhciConfig.ci.assert.assertions) lhciConfig.ci.assert.assertions = {};
  lhciConfig.ci.assert.assertions['categories:seo'] = ['error', { minScore: 0.95 }];

  fs.writeFileSync(LIGHTHOUSE_RC_FILE, JSON.stringify(lhciConfig, null, 2) + '\n', 'utf8');
  console.log(`[LHCI Manifest] Successfully wrote ${urls.length} audit URLs and updated SEO threshold in ${LIGHTHOUSE_RC_FILE}`);
}

generateLhciManifest();
