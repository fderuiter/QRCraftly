const eslintCommand = (filenames) => {
  const quotedFiles = filenames.map(f => `"${f.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(' ');
  return `eslint --fix --no-warn-ignored ${quotedFiles}`;
};

export default {
  '**/*.{js,jsx,ts,tsx,mjs,cjs}': (filenames) => {
    return eslintCommand(filenames);
  }
};
