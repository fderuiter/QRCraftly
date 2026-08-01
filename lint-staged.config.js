const eslintCommand = (filenames) => {
  const quotedFiles = filenames.map(f => `"${f.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(' ');
  return `eslint --fix --no-warn-ignored ${quotedFiles}`;
};

export default {
  // For files in src/components/ui, run class sorting first, then run eslint sequentially
  'src/components/ui/**/*.{ts,tsx}': (filenames) => [
    'node scripts/sort_tailwind_classes.js',
    eslintCommand(filenames)
  ],
  // For other js/ts files (excluding src/components/ui), run eslint
  '**/*.{js,jsx,ts,tsx,mjs,cjs}': (filenames) => {
    const nonUiFiles = filenames.filter(
      (file) => !/src[/\\]components[/\\]ui[/\\]/.test(file)
    );
    return nonUiFiles.length > 0 ? eslintCommand(nonUiFiles) : [];
  }
};
