import { ESLint } from 'eslint';
import { describe, it, expect } from 'vitest';
import { join } from 'path';

describe('ESLint Sandbox Isolation', () => {
  it('should block imports referencing the developer sandbox directory from a production file', async () => {
    const eslint = new ESLint();
    const results = await eslint.lintText(
      "import DevSandbox from '../dev-sandbox/+Page';\nconsole.log(DevSandbox);\n",
      { filePath: join(process.cwd(), 'src/pages/about/+Page.tsx') }
    );

    expect(results.length).toBe(1);
    const messages = results[0].messages;
    const restrictedImportErrors = messages.filter(
      (m) => m.ruleId === 'no-restricted-imports'
    );
    expect(restrictedImportErrors.length).toBeGreaterThan(0);
    expect(restrictedImportErrors[0].message).toContain(
      'Developer sandbox assets cannot be imported into production modules.'
    );
  });

  it('should allow imports referencing other modules from inside the developer sandbox directory', async () => {
    const eslint = new ESLint();
    const results = await eslint.lintText(
      "import { TextField } from '../../components/ui/FormFields';\nconsole.log(TextField);\n",
      { filePath: join(process.cwd(), 'src/pages/dev-sandbox/+Page.tsx') }
    );

    expect(results.length).toBe(1);
    const messages = results[0].messages;
    const restrictedImportErrors = messages.filter(
      (m) => m.ruleId === 'no-restricted-imports'
    );
    expect(restrictedImportErrors.length).toBe(0);
  });
});
