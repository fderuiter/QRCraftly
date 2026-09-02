import { createRequire } from 'module';
import { isDirectExecution } from './cliHelper.js';

const require = createRequire(import.meta.url);
const ts = require('typescript');

export { ts };

/**
 * Parses source code into a TypeScript AST SourceFile.
 *
 * @param {string} filePath - Path of source file
 * @param {string} content - Source code content
 * @returns {import('typescript').SourceFile}
 */
export function parseSourceFile(filePath, content) {
  const isJsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
  const isTs = filePath.endsWith('.ts') || filePath.endsWith('.tsx');

  let scriptKind = ts.ScriptKind.JS;
  if (isJsx) scriptKind = ts.ScriptKind.TSX;
  else if (isTs) scriptKind = ts.ScriptKind.TS;

  return ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );
}

/**
 * Statically evaluates a string AST node expression (handles string literals,
 * binary addition concatenation, template literals, parenthesized expressions).
 *
 * @param {import('typescript').Node} node
 * @returns {string|null} Evaluated string value or null if non-evaluatable
 */
export function evaluateExpression(node) {
  if (!node) return null;

  if (ts.isParenthesizedExpression(node)) {
    return evaluateExpression(node.expression);
  }

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
 * AST traversal helper that recursively visits nodes.
 *
 * @param {import('typescript').Node} node - Starting AST node
 * @param {function(import('typescript').Node): (boolean|void)} visitor - Visitor function; returning false skips children
 */
export function walkAst(node, visitor) {
  if (!node) return;
  const shouldContinue = visitor(node);
  if (shouldContinue === false) return;
  ts.forEachChild(node, child => walkAst(child, visitor));
}

if (isDirectExecution(import.meta.url)) {
  const sampleCode = 'const key = "qrcraftly:" + "test";';
  const sourceFile = parseSourceFile('sample.ts', sampleCode);
  console.log('[astHelper] AST parsed successfully for sample code.');

  let evaluatedKey = null;
  walkAst(sourceFile, node => {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      evaluatedKey = evaluateExpression(node.initializer);
    }
  });

  console.log('[astHelper] Evaluated expression result:', evaluatedKey);
}
