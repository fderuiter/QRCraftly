import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');
export const docsPublicDir = path.join(repoRoot, 'docs', 'public');
export const outputManifestPath = path.join(repoRoot, 'src', 'data', 'docs_manifest.json');

export function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : 'Untitled Document';
}

export function parseFrontmatter(content) {
  // A standard frontmatter block starts at the very beginning of the file.
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const rawYaml = match[1];
  const body = content.slice(match[0].length);

  const frontmatter = {};
  const lines = rawYaml.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex !== -1) {
      const key = trimmed.slice(0, colonIndex).trim();
      let value = trimmed.slice(colonIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (value.toLowerCase() === 'true') {
        frontmatter[key] = true;
      } else if (value.toLowerCase() === 'false') {
        frontmatter[key] = false;
      } else {
        frontmatter[key] = value;
      }
    }
  }

  return { frontmatter, body };
}

export function compileManifest(inputDir = docsPublicDir, outputPath = outputManifestPath) {
  if (!fs.existsSync(inputDir)) {
    console.error(`Error: Directory ${inputDir} does not exist.`);
    process.exit(1);
  }

  const files = fs.readdirSync(inputDir).filter(file => file.endsWith('.md'));
  const manifest = [];

  for (const file of files) {
    const filePath = path.join(inputDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    // Skip compiling files where draft frontmatter flag is explicitly true
    if (frontmatter.draft === true) {
      continue;
    }

    const title = extractTitle(body);
    
    // Unique ID/slug could be based on filename without extension
    const id = path.parse(file).name.toLowerCase();

    manifest.push({
      id,
      filename: file,
      title,
      content: body
    });
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // If we are compiling the standard docs folder, explicitly include docs/SECURITY.md
  if (inputDir === docsPublicDir) {
    const securityPath = path.join(repoRoot, 'docs', 'SECURITY.md');
    if (fs.existsSync(securityPath)) {
      const content = fs.readFileSync(securityPath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      if (frontmatter.draft !== true) {
        const title = extractTitle(body);
        manifest.push({
          id: 'security',
          filename: 'SECURITY.md',
          title,
          content: body
        });
      }
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`Docs manifest successfully compiled to ${outputPath}`);
}

// Only run automatically if executed directly
if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('compile_docs_manifest.js'))) {
  compileManifest();
}
