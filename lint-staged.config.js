const eslintCommand = (filenames) => {
  const quotedFiles = filenames.map(f => `"${f.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(' ');
  return `eslint --fix --no-warn-ignored ${quotedFiles}`;
};

const prettierCommand = (filenames) => {
  const quotedFiles = filenames.map(f => `"${f.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(' ');
  return `prettier --write ${quotedFiles}`;
};

export default {
  '*': (filenames) => {
    const quotedFiles = filenames.map(f => `"${f.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(' ');
    return `node scripts/secret-scanner.js ${quotedFiles}`;
  },
  '**/*.{js,jsx,ts,tsx,mjs,cjs}': (filenames) => {
    return eslintCommand(filenames);
  },
  '**/*.{css,json,md}': (filenames) => {
    return prettierCommand(filenames);
  }
};
