import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

const docsPublicDir = path.join(repoRoot, 'docs', 'public');
const docsPublicFiles = fs.readdirSync(docsPublicDir)
  .filter(file => file.endsWith('.md'))
  .map(file => path.join('docs', 'public', file));

const filesToAudit = [
  ...docsPublicFiles,
  'README.md',
  'src/components/inputs/README.md'
];

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

// 1. Build a map of headings for each file and check for placeholders
for (const file of filesToAudit) {
  const filePath = path.join(repoRoot, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File ${file} does not exist at ${filePath}`);
    hasErrors = true;
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf-8');

  const placeholderRegex = /(TODO|FIXME)/g;
  let match;
  while ((match = placeholderRegex.exec(content)) !== null) {
    console.error(`Error in ${file}: Found placeholder string '${match[0]}'`);
    hasErrors = true;
  }

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

// 4. Validate Telemetry Keys Alignment
function validateTelemetryCompliance() {
  const compliancePath = path.join(repoRoot, 'docs', 'public', 'COMPLIANCE.md');
  const typesPath = path.join(repoRoot, 'src', 'types.ts');
  
  if (!fs.existsSync(compliancePath)) {
    console.error(`Error: Compliance file not found at ${compliancePath}`);
    hasErrors = true;
    return;
  }
  if (!fs.existsSync(typesPath)) {
    console.error(`Error: Core types file not found at ${typesPath}`);
    hasErrors = true;
    return;
  }
  
  const complianceContent = fs.readFileSync(compliancePath, 'utf-8');
  const typesContent = fs.readFileSync(typesPath, 'utf-8');
  
  // 1. Extract keys from src/types.ts
  const arrayMatch = typesContent.match(/export const ALLOWED_TELEMETRY_KEYS\s*=\s*\[([\s\S]*?)\]/);
  if (!arrayMatch) {
    console.error("Error: Could not find ALLOWED_TELEMETRY_KEYS in src/types.ts");
    hasErrors = true;
    return;
  }
  const codeKeys = arrayMatch[1]
    .split(',')
    .map(k => k.trim().replace(/['"]/g, ''))
    .filter(k => k.length > 0);
    
  if (codeKeys.length === 0) {
    console.error("Error: Telemetry keys array in src/types.ts is empty.");
    hasErrors = true;
    return;
  }
  
  // 2. Extract keys from COMPLIANCE.md Opt-In Telemetry section
  const optInIndex = complianceContent.indexOf('Opt-In Telemetry');
  const nextSectionIndex = complianceContent.indexOf('What is NOT Logged');
  if (optInIndex === -1 || nextSectionIndex === -1 || nextSectionIndex <= optInIndex) {
    console.error("Error: Could not find correct 'Opt-In Telemetry' or 'What is NOT Logged' boundary in COMPLIANCE.md");
    hasErrors = true;
    return;
  }
  
  const sectionText = complianceContent.slice(optInIndex, nextSectionIndex);
  
  // Extract all backtick words
  const backtickRegex = /`([a-zA-Z0-9_]+)`/g;
  const docKeys = [];
  let match;
  while ((match = backtickRegex.exec(sectionText)) !== null) {
    docKeys.push(match[1]);
  }
  
  // 3. Compare codeKeys with docKeys
  const codeKeysSet = new Set(codeKeys);
  const docKeysSet = new Set(docKeys);
  
  // Find discrepancies
  const missingInDocs = codeKeys.filter(k => !docKeysSet.has(k));
  const undocumentedInCode = docKeys.filter(k => !codeKeysSet.has(k));
  
  if (missingInDocs.length > 0) {
    console.error(`Error: Code telemetry keys [${missingInDocs.join(', ')}] are not documented in COMPLIANCE.md under 'Opt-In Telemetry'`);
    hasErrors = true;
  }
  if (undocumentedInCode.length > 0) {
    console.error(`Error: Documented telemetry keys [${undocumentedInCode.join(', ')}] are not present in src/types.ts ALLOWED_TELEMETRY_KEYS`);
    hasErrors = true;
  }
  
  if (missingInDocs.length === 0 && undocumentedInCode.length === 0) {
    console.log(`Telemetry compliance verification passed: ${codeKeys.length} keys match perfectly.`);
  }
}

validateTelemetryCompliance();

if (hasErrors) {
  process.exit(1);
} else {
  console.log('Markdown audit passed successfully.');
  process.exit(0);
}
