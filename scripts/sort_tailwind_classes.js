import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const UI_DIR = path.resolve(__dirname, '../src/components/ui');

/**
 * Sorts a class string and resolves/deduplicates classes.
 * Supports static sections and template interpolations.
 * @param {string} classStr The input classes.
 * @returns {string} The sorted and deduplicated class string.
 */
export function sortClassString(classStr) {
  const parts = classStr.split(/(\$\{[^}]+\})/g);
  
  const processedParts = parts.map(part => {
    if (part.startsWith('${') && part.endsWith('}')) {
      return part;
    } else {
      const classes = part.trim().split(/\s+/).filter(Boolean);
      const uniqueClasses = Array.from(new Set(classes));
      uniqueClasses.sort();
      
      const prefix = part.startsWith(' ') ? ' ' : '';
      const suffix = part.endsWith(' ') ? ' ' : '';
      if (uniqueClasses.length === 0) return '';
      return prefix + uniqueClasses.join(' ') + suffix;
    }
  });

  return processedParts.join('');
}

/**
 * Sorts classes inside a file content.
 * @param {string} content The file content to modify.
 * @returns {string} The modified file content.
 */
export function sortClassesInContent(content) {
  let updated = content;

  updated = updated.replace(/className="([^"]+)"/g, (match, p1) => {
    return `className="${sortClassString(p1)}"`;
  });
  updated = updated.replace(/className='([^']+)'/g, (match, p1) => {
    return `className='${sortClassString(p1)}'`;
  });

  updated = updated.replace(/className=\{\`([^\`]+)\`\}/g, (match, p1) => {
    return `className={\`${sortClassString(p1)}\`}`;
  });

  // Target specific styling variables in ui components precisely
  const variables = [
    'BASE_INPUT_CLASSES',
    'TEXT_FIELD_CLASSES',
    'TEXT_AREA_CLASSES',
    'SELECT_CLASSES',
    'ERROR_INPUT_CLASSES',
    'baseStyles',
    'variantStyles',
    'sizeStyles'
  ];

  for (const varName of variables) {
    const regex = new RegExp(`\\b(${varName})\\s*=\\s*(['"\`])([^'"\`\\n]+)\\2`, 'g');
    updated = updated.replace(regex, (match, name, quote, p1) => {
      return `${name} = ${quote}${sortClassString(p1)}${quote}`;
    });
  }

  return updated;
}

/**
 * Recursively find all ts/tsx files under directory.
 * @param {string} dir Directory to scan.
 * @returns {string[]} Paths of all matching files.
 */
export function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath));
    } else {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

export function runSorter() {
  const checkOnly = process.argv.includes('--check');
  let hasUnsorted = false;

  const files = getFiles(UI_DIR);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const sortedContent = sortClassesInContent(content);

    if (content !== sortedContent) {
      if (checkOnly) {
        console.error(`❌ File ${path.relative(process.cwd(), file)} has unsorted or duplicate Tailwind CSS classes.`);
        hasUnsorted = true;
      } else {
        fs.writeFileSync(file, sortedContent, 'utf8');
        console.log(`✅ Sorted and deduplicated classes in ${path.relative(process.cwd(), file)}`);
      }
    }
  }

  if (checkOnly && hasUnsorted) {
    process.exit(1);
  } else {
    console.log('✨ All Tailwind CSS classes sorted successfully!');
    process.exit(0);
  }
}

// Only run automatically if executed directly
if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('sort_tailwind_classes.js'))) {
  runSorter();
}
