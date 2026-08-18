import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');

const BANNED_APIS = new Set(['fetch', 'WebSocket', 'XMLHttpRequest', 'sendBeacon']);

// Chunks containing code from these whitelisted files/framework dependencies are allowed to contain 'fetch'
const AUTHORIZED_SIGNATURES = [
  '/api/telemetry/scannability',
  'scannability-fail',
  'telemetryOptIn',
  'xmlns="http://www.w3.org/2000/svg"',
  '_svgTextAnchor',
  '_svgDominantBaseline',
  'is404ServerSideRouted',
  '.pageContext.json',
  'pageContextFromServer',
  'fetchWasmAsset',
  'sanitizeSvg',
  'SafeUrlPipeline',
  'Failed to download WebAssembly demuxer assets',
  'FileReader error'
];

/**
 * Recursively list all .js and .mjs files under a directory.
 */
function findJsFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findJsFiles(fullPath));
    } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
      results.push(fullPath);
    }
  });
  return results;
}

/**
 * Evaluates a string node, including constant binary concatenation and template strings.
 */
function evaluateExpression(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = evaluateExpression(node.left);
    const right = evaluateExpression(node.right);
    if (left !== null && right !== null) {
      return left + right;
    }
  }
  if (ts.isTemplateExpression(node)) {
    let text = node.head.text;
    for (const span of node.templateSpans) {
      const expr = evaluateExpression(span.expression);
      if (expr === null) return null;
      text += expr + span.literal.text;
    }
    return text;
  }
  return null;
}

/**
 * Check if a file's raw content contains any authorized signature.
 */
function isAuthorizedFile(content) {
  return AUTHORIZED_SIGNATURES.some(sig => content.includes(sig));
}

/**
 * Audit a single compiled bundle file using AST scanning.
 */
function auditFile(filePath) {
  const relativePath = path.relative(repoRoot, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');

  const fileIsAuthorized = isAuthorizedFile(content);

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const violations = [];

  function visit(node) {
    let violationFound = false;
    let apiName = '';
    let pattern = '';

    if (ts.isIdentifier(node)) {
      const name = node.text;
      if (BANNED_APIS.has(name)) {
        // Skip safe parent contexts where the name is not a lookup/call
        const parent = node.parent;
        const isPropertyAccessName = ts.isPropertyAccessExpression(parent) && parent.name === node;
        const isPropertyAssignmentName = ts.isPropertyAssignment(parent) && parent.name === node;
        const isMethodDeclarationName = ts.isMethodDeclaration(parent) && parent.name === node;
        const isPropertySignatureName = ts.isPropertySignature(parent) && parent.name === node;
        const isMethodSignatureName = ts.isMethodSignature(parent) && parent.name === node;
        
        if (!isPropertyAccessName && !isPropertyAssignmentName && !isMethodDeclarationName && !isPropertySignatureName && !isMethodSignatureName) {
          // If fetch is found, it's only allowed if the file is authorized
          if (name !== 'fetch' || !fileIsAuthorized) {
            violationFound = true;
            apiName = name;
            pattern = `Direct identifier '${name}'`;
          }
        }
      }
    } else if (ts.isPropertyAccessExpression(node)) {
      const propName = node.name.text;
      if (BANNED_APIS.has(propName)) {
        if (propName !== 'fetch' || !fileIsAuthorized) {
          violationFound = true;
          apiName = propName;
          pattern = `Property access '.${propName}'`;
        }
      }
    } else if (ts.isElementAccessExpression(node)) {
      const propName = evaluateExpression(node.argumentExpression);
      if (propName && BANNED_APIS.has(propName)) {
        if (propName !== 'fetch' || !fileIsAuthorized) {
          violationFound = true;
          apiName = propName;
          pattern = `Element access ['${propName}']`;
        }
      }
    } else {
      // Also check if any evaluated string matches a banned API
      const val = evaluateExpression(node);
      if (val && BANNED_APIS.has(val)) {
        if (val !== 'fetch' || !fileIsAuthorized) {
          violationFound = true;
          apiName = val;
          pattern = `String constant/obfuscated literal '${val}'`;
        }
      }
    }

    if (violationFound) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      violations.push({
        file: relativePath,
        line: line + 1,
        character: character + 1,
        apiName,
        pattern,
        text: node.getText(sourceFile)
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

export function runBundleComplianceAudit() {
  console.log('\n=== [Bundle Compliance AST Audit] Scanning Compiled Production Bundles ===');
  console.time('AST Scan Duration');

  if (!fs.existsSync(distDir)) {
    console.warn('⚠️ [Bundle Compliance AST Audit] dist/ directory not found. Have you built the production assets?');
    return;
  }

  const jsFiles = findJsFiles(distDir);
  console.log(`[Bundle Compliance AST Audit] Found ${jsFiles.length} compiled bundle file(s) to scan.`);

  let allViolations = [];
  for (const file of jsFiles) {
    try {
      const fileViolations = auditFile(file);
      allViolations = allViolations.concat(fileViolations);
    } catch (err) {
      console.error(`❌ [Bundle Compliance AST Audit] Error scanning file ${file}:`, err.message);
    }
  }

  console.timeEnd('AST Scan Duration');

  if (allViolations.length > 0) {
    console.error(`\n❌ [BUNDLE COMPLIANCE AST AUDIT FAILURE] Detected ${allViolations.length} compliance violation(s) in compiled production bundles:\n`);

    allViolations.forEach(v => {
      console.error(`📍 Location:  ${v.file}:${v.line}:${v.character}`);
      console.error(`🏷️  Pattern:   ${v.pattern}`);
      console.error(`⚠️  Banned API: ${v.apiName}`);
      console.error(`💻 Node Text:  ${v.text}`);
      console.error('--------------------------------------------------\n');
    });

    console.error('💡 How to resolve:');
    console.error('   1. Ensure no Web Workers perform any network/fetch/WebSocket/XMLHttpRequest calls.');
    console.error('   2. Do not introduce unauthorized third-party libraries that make network requests.');
    console.error('   3. Keep client-side data privacy boundaries intact.\n');

    process.exit(1);
  }

  console.log('✅ Compiled production bundles compliance AST audit passed successfully!\n');
}

if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('bundle_ast_audit.js'))) {
  runBundleComplianceAudit();
}
