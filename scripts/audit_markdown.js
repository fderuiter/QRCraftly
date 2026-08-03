import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

export const docsPublicDir = path.join(repoRoot, 'docs', 'public');

export function getFilesToAudit() {
  const docsPublicFiles = fs.existsSync(docsPublicDir)
    ? fs.readdirSync(docsPublicDir)
        .filter(file => file.endsWith('.md'))
        .map(file => path.join('docs', 'public', file))
    : [];

  return [
    ...docsPublicFiles,
    'README.md',
    'src/components/inputs/README.md'
  ];
}

export let hasErrors = false;

export function resetErrors() {
  hasErrors = false;
}

export function setErrors(val) {
  hasErrors = val;
}

export function slugify(text) {
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

export function checkPlaceholders(file, content) {
  let localHasErrors = false;
  const placeholderRegex = /(TODO|FIXME)/g;
  let match;
  while ((match = placeholderRegex.exec(content)) !== null) {
    console.error(`Error in ${file}: Found placeholder string '${match[0]}'`);
    localHasErrors = true;
    hasErrors = true;
  }
  return localHasErrors;
}

export function buildFileHeadings(file, content) {
  const tokens = marked.lexer(content);
  const headings = new Set();
  
  marked.walkTokens(tokens, token => {
    if (token.type === 'heading') {
      headings.add(slugify(token.text));
    }
  });
  
  return headings;
}

export function verifyLinks(file, content, fileHeadings) {
  let localHasErrors = false;
  const filePath = path.join(repoRoot, file);
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
          localHasErrors = true;
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
            localHasErrors = true;
            hasErrors = true;
          }
        }
      }
    }
  });
  return localHasErrors;
}

export function checkCodeSnippets(filesList) {
  let localHasErrors = false;
  const tempFiles = [];
  try {
    for (const file of filesList) {
      const filePath = path.join(repoRoot, file);
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf-8');
      const tokens = marked.lexer(content);
      
      marked.walkTokens(tokens, token => {
        if (token.type === 'code') {
          const lang = (token.lang || '').toLowerCase();
          if (['ts', 'tsx', 'typescript', 'typescriptreact'].includes(lang)) {
            const fileDir = path.dirname(filePath);
            const tempFileName = `temp_snippet_${Math.random().toString(36).substring(2, 9)}.tsx`;
            const tempFilePath = path.join(fileDir, tempFileName);
            fs.writeFileSync(tempFilePath, token.text, 'utf-8');
            tempFiles.push({
              path: tempFilePath,
              file: file,
              lang: lang,
              text: token.text
            });
          }
        }
      });
    }

    if (tempFiles.length > 0) {
      const tsconfigPath = path.join(repoRoot, 'tsconfig.json');
      const readResult = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
      if (readResult.error) {
        console.error('Error reading tsconfig.json:', ts.flattenDiagnosticMessageText(readResult.error.messageText, '\n'));
        localHasErrors = true;
        hasErrors = true;
      } else {
        const parsedConfig = ts.parseJsonConfigFileContent(
          readResult.config,
          ts.sys,
          repoRoot
        );

        const compilerOptions = {
          ...parsedConfig.options,
          noEmit: true,
          skipLibCheck: true,
        };

        const fileNames = tempFiles.map(t => t.path);
        const program = ts.createProgram(fileNames, compilerOptions);
        const emitResult = program.emit();

        const allDiagnostics = ts
          .getPreEmitDiagnostics(program)
          .concat(emitResult.diagnostics);

        for (const diagnostic of allDiagnostics) {
          if (diagnostic.category === ts.DiagnosticCategory.Error) {
            localHasErrors = true;
            hasErrors = true;
            if (diagnostic.file) {
              const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
              const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
              const fileName = path.resolve(diagnostic.file.fileName);
              const tempFileInfo = tempFiles.find(t => path.resolve(t.path) === fileName);
              if (tempFileInfo) {
                console.error(`Error in ${tempFileInfo.file}: TS type check error in snippet on line ${line + 1}, col ${character + 1}: ${message}`);
              } else {
                console.error(`TS Error in ${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
              }
            } else {
              console.error(`TS Error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error during TS snippet extraction or compilation:', err);
    localHasErrors = true;
    hasErrors = true;
  } finally {
    for (const temp of tempFiles) {
      if (fs.existsSync(temp.path)) {
        try {
          fs.unlinkSync(temp.path);
        } catch (err) {
          console.error(`Failed to delete temp file ${temp.path}:`, err);
        }
      }
    }
  }
  return localHasErrors;
}

export function validateTelemetryCompliance(complianceContent, typesContent) {
  let localHasErrors = false;
  
  if (complianceContent === undefined) {
    const compliancePath = path.join(repoRoot, 'docs', 'public', 'COMPLIANCE.md');
    if (!fs.existsSync(compliancePath)) {
      console.error(`Error: Compliance file not found at ${compliancePath}`);
      localHasErrors = true;
      hasErrors = true;
      return localHasErrors;
    }
    complianceContent = fs.readFileSync(compliancePath, 'utf-8');
  }
  
  if (typesContent === undefined) {
    const typesPath = path.join(repoRoot, 'src', 'types.ts');
    if (!fs.existsSync(typesPath)) {
      console.error(`Error: Core types file not found at ${typesPath}`);
      localHasErrors = true;
      hasErrors = true;
      return localHasErrors;
    }
    typesContent = fs.readFileSync(typesPath, 'utf-8');
  }
  
  // 1. Extract keys from src/types.ts
  const arrayMatch = typesContent.match(/export const ALLOWED_TELEMETRY_KEYS\s*=\s*\[([\s\S]*?)\]/);
  if (!arrayMatch) {
    console.error("Error: Could not find ALLOWED_TELEMETRY_KEYS in src/types.ts");
    localHasErrors = true;
    hasErrors = true;
    return localHasErrors;
  }
  const codeKeys = arrayMatch[1]
    .split(',')
    .map(k => k.trim().replace(/['"]/g, ''))
    .filter(k => k.length > 0);
    
  if (codeKeys.length === 0) {
    console.error("Error: Telemetry keys array in src/types.ts is empty.");
    localHasErrors = true;
    hasErrors = true;
    return localHasErrors;
  }
  
  // 2. Extract keys from COMPLIANCE.md Opt-In Telemetry section
  const optInIndex = complianceContent.indexOf('Opt-In Telemetry');
  const nextSectionIndex = complianceContent.indexOf('What is NOT Logged');
  if (optInIndex === -1 || nextSectionIndex === -1 || nextSectionIndex <= optInIndex) {
    console.error("Error: Could not find correct 'Opt-In Telemetry' or 'What is NOT Logged' boundary in COMPLIANCE.md");
    localHasErrors = true;
    hasErrors = true;
    return localHasErrors;
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
    localHasErrors = true;
    hasErrors = true;
  }
  if (undocumentedInCode.length > 0) {
    console.error(`Error: Documented telemetry keys [${undocumentedInCode.join(', ')}] are not present in src/types.ts ALLOWED_TELEMETRY_KEYS`);
    localHasErrors = true;
    hasErrors = true;
  }
  
  if (missingInDocs.length === 0 && undocumentedInCode.length === 0) {
    console.log(`Telemetry compliance verification passed: ${codeKeys.length} keys match perfectly.`);
  }

  return localHasErrors;
}

export function runAudit() {
  hasErrors = false;
  const files = getFilesToAudit();
  const fileHeadings = {};
  
  // 1. Build a map of headings for each file and check for placeholders
  for (const file of files) {
    const filePath = path.join(repoRoot, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File ${file} does not exist at ${filePath}`);
      hasErrors = true;
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    checkPlaceholders(file, content);
    fileHeadings[file] = buildFileHeadings(file, content);
  }
  
  // 2 & 3. Extract and validate links
  for (const file of files) {
    const filePath = path.join(repoRoot, file);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    verifyLinks(file, content, fileHeadings);
  }
  
  // 3. Extract and verify TypeScript/TSX code blocks
  checkCodeSnippets(files);
  
  // 4. Validate Telemetry Keys Alignment
  validateTelemetryCompliance();
  
  if (hasErrors) {
    process.exit(1);
  } else {
    console.log('Markdown audit passed successfully.');
    process.exit(0);
  }
}

// Only run automatically if executed directly
if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('audit_markdown.js'))) {
  runAudit();
}
