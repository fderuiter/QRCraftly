# Strict Mode Resolution Guide

This project strictly enforces code health guardrails to ensure robust, maintainable production code. Here's how to resolve common strict-mode violations.

## 1. No \`any\` Types Allowed

Implicit and explicit \`any\` types bypass TypeScript's type checking and lead to technical debt and runtime errors.

**Violation:**
\`\`\`typescript
const data: any = JSON.parse(input);
\`\`\`

**Resolution:**
Use \`unknown\` instead of \`any\` if the shape is truly unknown, or define a strict interface.
\`\`\`typescript
const data: unknown = JSON.parse(input);
if (typeof data === 'object' && data !== null && 'id' in data) {
// It's safe to use data.id
}
\`\`\`

## 2. No \`console.log\` in Production

Diagnostic console logs are blocked from entering production code.

**Violation:**
\`\`\`typescript
console.log('Error occurred:', err);
\`\`\`

**Resolution:**
Use structured error reporting or dedicated warning methods (\`console.warn\`, \`console.error\`) for critical issues, or present a UI Toast notification.
\`\`\`typescript
// Use the UI Toast notification
addToast({ type: 'error', message: 'An error occurred' });
// Or for critical issues:
console.error('Critical failure during rendering:', err);
\`\`\`

## 3. Formatting Inconsistencies

We enforce a single, unified formatting standard project-wide using Prettier.

**Resolution:**
You don't have to fix these manually! The project uses \`lint-staged\` to automatically run \`prettier --write\` on all your files when you commit.
If you want to format files before committing, run:
\`\`\`bash
pnpm run lint:format --write
\`\`\`

## 4. Bypassing Checks

Do not use \`git commit --no-verify\` to bypass local hooks. The CI pipeline applies the same strict rules and will fail the build anyway. Address all errors locally before pushing.
