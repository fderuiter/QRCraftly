import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { parseFrontmatter, isQuarantined } from './compile_docs_manifest.js';
import { walkDir } from './utils/fileWalker.js';
import { isDirectExecution } from './utils/cliHelper.js';

const require = createRequire(import.meta.url);
// marked and typescript ship as CJS; use createRequire so pnpm hoisting works.
const { marked } = require('marked');
const ts = require('typescript');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

export const parsedFilesCache = new Map();

export function getParsedFile(file) {
  if (isQuarantined(file)) {
    return { content: '', frontmatter: {}, body: '' };
  }
  const filePath = path.isAbsolute(file) ? file : path.join(repoRoot, file);
  const normalizedPath = path.resolve(filePath);
  if (parsedFilesCache.has(normalizedPath)) {
    return parsedFilesCache.get(normalizedPath);
  }
  let content = '';
  try {
    if (fs.existsSync(normalizedPath)) {
      content = fs.readFileSync(normalizedPath, 'utf-8');
    }
  } catch (err) {
    console.warn(`Warning: Could not read file at ${normalizedPath}`, err);
  }
  const { frontmatter, body } = parseFrontmatter(content);
  const result = { content, frontmatter, body };
  parsedFilesCache.set(normalizedPath, result);
  return result;
}

export const docsPublicDir = path.join(repoRoot, 'docs', 'public');

export function getFilesToAudit() {
  const docsPublicFiles = fs.existsSync(docsPublicDir)
    ? walkDir(docsPublicDir, { extensions: ['.md'], relative: true })
        .map(file => path.join('docs', 'public', file))
    : [];

  const rawList = [
    ...docsPublicFiles,
    'docs/SECURITY.md',
    'README.md',
    'src/components/inputs/README.md',
    '.github/rulesets/README.md'
  ];

  return rawList.filter(file => !isQuarantined(file));
}

export let hasErrors = false;

export function resetErrors() {
  hasErrors = false;
  parsedFilesCache.clear();
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

export function checkPublishApproved(file, content) {
  if (isQuarantined(file)) {
    return false;
  }
  
  const filePathAbs = path.isAbsolute(file) ? file : path.resolve(repoRoot, file);
  const docsPublicDirAbs = path.resolve(docsPublicDir);
  const isInPublicDir = filePathAbs.startsWith(docsPublicDirAbs + path.sep) || filePathAbs === docsPublicDirAbs;
  
  if (!isInPublicDir) {
    return false;
  }
  
  const { frontmatter } = parseFrontmatter(content);
  if (frontmatter['publish-approved'] !== true) {
    console.error(`Error in ${file}: Public document is missing the required 'publish-approved: true' metadata attribute.`);
    hasErrors = true;
    return true;
  }
  return false;
}

export function checkPlaceholders(file, content) {
  if (isQuarantined(file)) {
    return false;
  }
  const { frontmatter, body } = parseFrontmatter(content);
  if (frontmatter.draft === true) {
    return false;
  }
  let localHasErrors = false;
  const placeholderRegex = /(TODO|FIXME)/g;
  let match;
  while ((match = placeholderRegex.exec(body)) !== null) {
    console.error(`Error in ${file}: Found placeholder string '${match[0]}'`);
    localHasErrors = true;
    hasErrors = true;
  }
  return localHasErrors;
}

export function buildFileHeadings(file, content) {
  if (isQuarantined(file)) {
    return new Set();
  }
  const { body } = parseFrontmatter(content);
  const tokens = marked.lexer(body);
  const headings = new Set();
  
  marked.walkTokens(tokens, token => {
    if (token.type === 'heading') {
      headings.add(slugify(token.text));
    }
  });
  
  return headings;
}

export function existsSyncCaseSensitive(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return false;
  }

  const resolvedPath = path.resolve(targetPath);
  let current = repoRoot;
  let relative = path.relative(repoRoot, resolvedPath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    const parsed = path.parse(resolvedPath);
    current = parsed.root;
    relative = path.relative(current, resolvedPath);
  }

  if (!relative) return true;

  const parts = relative.split(/[/\\]/).filter(Boolean);

  for (const part of parts) {
    try {
      if (!fs.existsSync(current)) break;
      const entries = fs.readdirSync(current);
      if (entries.includes(part)) {
        current = path.join(current, part);
        continue;
      }
      const partLower = part.toLowerCase();
      const hasCaseInsensitiveMatch = entries.some(e => e.toLowerCase() === partLower);
      if (hasCaseInsensitiveMatch) {
        return false;
      }
      current = path.join(current, part);
    } catch {
      break;
    }
  }

  return true;
}

export function verifyLinks(file, content, fileHeadings) {
  if (isQuarantined(file)) {
    return false;
  }
  const { body } = parseFrontmatter(content);
  let localHasErrors = false;
  const filePath = path.join(repoRoot, file);
  const tokens = marked.lexer(body);
  
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
        
        // Block path traversal and any link outside repository root
        const relativeFromRoot = path.relative(repoRoot, targetFilePathAbs);
        if (relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
          console.error(`Error in ${file}: Relative link '${href}' resolves to a path outside the repository root.`);
          localHasErrors = true;
          hasErrors = true;
          return;
        }

        targetFile = relativeFromRoot;
        if (parts.length > 1) {
          targetHash = parts[1];
        }
      }
      
      // Verify file exists
      if (targetFile) {
        const targetFilePath = path.join(repoRoot, targetFile);
        if (!existsSyncCaseSensitive(targetFilePath)) {
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
            const { body: otherBody } = getParsedFile(targetFile);
            const otherTokens = marked.lexer(otherBody);
            headingsToSearch = new Set();
            marked.walkTokens(otherTokens, t => {
              if (t.type === 'heading') {
                headingsToSearch.add(slugify(t.text));
              }
            });
            fileHeadings[targetFile] = headingsToSearch;
          }
          
          const targetSlug = slugify(targetHash);
          if (!headingsToSearch.has(targetSlug) && !headingsToSearch.has(targetHash)) {
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
  const virtualFiles = new Map();
  try {
    let snippetIndex = 0;
    for (const file of filesList) {
      const filePath = path.join(repoRoot, file);
      if (!fs.existsSync(filePath)) continue;
      const { frontmatter, body } = getParsedFile(file);
      if (frontmatter.draft === true) {
        continue;
      }
      const tokens = marked.lexer(body);
      
      marked.walkTokens(tokens, token => {
        if (token.type === 'code') {
          const lang = (token.lang || '').toLowerCase();
          if (['ts', 'tsx', 'typescript', 'typescriptreact'].includes(lang)) {
            const fileDir = path.dirname(filePath);
            const tempFileName = `virtual_snippet_${snippetIndex++}.tsx`;
            const tempFilePath = path.resolve(fileDir, tempFileName);
            virtualFiles.set(tempFilePath, {
              file: file,
              lang: lang,
              text: token.text
            });
          }
        }
      });
    }

    const fileNames = Array.from(virtualFiles.keys());
    if (fileNames.length > 0) {
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

        const defaultHost = ts.createCompilerHost(compilerOptions);

        const customHost = {
          ...defaultHost,
          fileExists(fileName) {
            const normalizedPath = path.resolve(fileName);
            if (virtualFiles.has(normalizedPath)) {
              return true;
            }
            return defaultHost.fileExists(fileName);
          },
          readFile(fileName) {
            const normalizedPath = path.resolve(fileName);
            if (virtualFiles.has(normalizedPath)) {
              return virtualFiles.get(normalizedPath).text;
            }
            return defaultHost.readFile(fileName);
          },
          getSourceFile(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile) {
            const normalizedPath = path.resolve(fileName);
            if (virtualFiles.has(normalizedPath)) {
              const virtualFileInfo = virtualFiles.get(normalizedPath);
              if (!virtualFileInfo.sourceFile) {
                const languageVersion = typeof languageVersionOrOptions === 'object'
                  ? languageVersionOrOptions.target
                  : languageVersionOrOptions;
                virtualFileInfo.sourceFile = ts.createSourceFile(
                  normalizedPath,
                  virtualFileInfo.text,
                  languageVersion || ts.ScriptTarget.Latest,
                  true
                );
              }
              return virtualFileInfo.sourceFile;
            }
            return defaultHost.getSourceFile(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile);
          },
          writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles) {
            // No physical output files generated
          },
          directoryExists(directoryName) {
            const normalizedDir = path.resolve(directoryName);
            for (const virtualPath of virtualFiles.keys()) {
              if (virtualPath.startsWith(normalizedDir)) {
                return true;
              }
            }
            if (defaultHost.directoryExists) {
              return defaultHost.directoryExists(directoryName);
            }
            return false;
          }
        };

        const program = ts.createProgram(fileNames, compilerOptions, customHost);
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
              const tempFileInfo = virtualFiles.get(fileName);
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
    const { content } = getParsedFile(file);
    checkPublishApproved(file, content);
    checkPlaceholders(file, content);
    fileHeadings[file] = buildFileHeadings(file, content);
  }
  
  // 2 & 3. Extract and validate links
  for (const file of files) {
    const filePath = path.join(repoRoot, file);
    if (!fs.existsSync(filePath)) continue;
    const { content } = getParsedFile(file);
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
if (isDirectExecution(import.meta.url)) {
  runAudit();
}
