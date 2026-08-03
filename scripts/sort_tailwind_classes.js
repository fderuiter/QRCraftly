import { execSync } from 'child_process';

const checkOnly = process.argv.includes('--check');

// Extract arguments, filtering out option flags
const files = process.argv.slice(2).filter(arg => arg !== '--check');

// If files are provided as arguments, format/check those files.
// Otherwise, default to "src" directory to cover all folders repository-wide.
const targets = files.length > 0 ? files.map(f => `"${f}"`).join(' ') : 'src';

try {
  if (checkOnly) {
    console.log(`🔍 AST-based Tailwind sorting check on: ${targets}`);
    execSync(`npx eslint ${targets}`, { stdio: 'inherit' });
    console.log('✨ All classes are properly sorted and aligned!');
  } else {
    console.log(`⚙️ Formatting Tailwind CSS classes for: ${targets}`);
    execSync(`npx eslint --fix ${targets}`, { stdio: 'inherit' });
    console.log('✅ Tailwind CSS classes sorted successfully!');
  }
  process.exit(0);
} catch (error) {
  console.error('❌ Tailwind CSS class sorting check or format failed.');
  process.exit(1);
}
