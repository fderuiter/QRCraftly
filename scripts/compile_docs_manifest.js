import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');
const docsPublicDir = path.join(repoRoot, 'docs', 'public');
const outputManifestPath = path.join(repoRoot, 'src', 'data', 'docs_manifest.json');

function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : 'Untitled Document';
}

function compileManifest() {
  if (!fs.existsSync(docsPublicDir)) {
    console.error(`Error: Directory ${docsPublicDir} does not exist.`);
    process.exit(1);
  }

  const files = fs.readdirSync(docsPublicDir).filter(file => file.endsWith('.md'));
  const manifest = [];

  for (const file of files) {
    const filePath = path.join(docsPublicDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const title = extractTitle(content);
    
    // Unique ID/slug could be based on filename without extension
    const id = path.parse(file).name.toLowerCase();

    manifest.push({
      id,
      filename: file,
      title,
      content
    });
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputManifestPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputManifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Docs manifest successfully compiled to ${outputManifestPath}`);
}

compileManifest();
