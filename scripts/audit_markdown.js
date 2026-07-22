import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

const filesToAudit = ['COMPLIANCE.md', 'SECURITY.md', 'README.md', 'SCALING.md', 'src/components/inputs/README.md'];

let hasErrors = false;

function slugify(text) {
  let prev;
  do {
    prev = text;
    text = text.replace(/<[^>]*>/g, '');
  } while (text !== prev);

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word characters except spaces and hyphens
    .replace(/\s+/g, '-');    // replace spaces with hyphens
}

const fileHeadings = {};

// 1. Build a map of headings for each file
for (const file of filesToAudit) {
  const filePath = path.join(repoRoot, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File ${file} does not exist at ${filePath}`);
    hasErrors = true;
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const tokens = marked.lexer(content);
  
  const headings = new Set();
  
  marked.walkTokens(tokens, token => {
    if (token.type === 'heading') {
      headings.add(slugify(token.text));
    }
  });
  
  fileHeadings[file] = headings;
}

// 2 & 3. Extract and validate links
for (const file of filesToAudit) {
  const filePath = path.join(repoRoot, file);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');
  const tokens = marked.lexer(content);
  
  marked.walkTokens(tokens, token => {
    if (token.type === 'link') {
      const href = token.href;
      
      // Ignore external HTTP/HTTPS links and mailto:
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
        return;
      }
      
      let targetFile = file;
      let targetHash = null;
      
      if (href.startsWith('#')) {
        targetHash = href.slice(1);
      } else {
        const parts = href.split('#');
        const relativeTargetFile = parts[0];
        const targetFilePathAbs = path.resolve(path.dirname(filePath), relativeTargetFile);
        targetFile = path.relative(repoRoot, targetFilePathAbs);
        if (parts.length > 1) {
          targetHash = parts[1];
        }
      }
      
      // Verify file exists
      if (targetFile) {
        const targetFilePath = path.join(repoRoot, targetFile);
        if (!fs.existsSync(targetFilePath)) {
          console.error(`Error in ${file}: Broken link references missing file '${targetFile}' (href: '${href}')`);
          hasErrors = true;
          return;
        }
        
        // Verify hash exists in the target file
        if (targetHash) {
          let headingsToSearch = fileHeadings[targetFile];
          
          if (!headingsToSearch) {
            // Target file is valid but wasn't audited yet (e.g. README.md)
            const otherContent = fs.readFileSync(targetFilePath, 'utf-8');
            const otherTokens = marked.lexer(otherContent);
            headingsToSearch = new Set();
            marked.walkTokens(otherTokens, t => {
              if (t.type === 'heading') {
                headingsToSearch.add(slugify(t.text));
              }
            });
          }
          
          if (!headingsToSearch.has(targetHash)) {
            console.error(`Error in ${file}: Broken link references missing anchor '#${targetHash}' in '${targetFile}' (href: '${href}')`);
            hasErrors = true;
          }
        }
      }
    }
  });
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log('Markdown audit passed successfully.');
  process.exit(0);
}
