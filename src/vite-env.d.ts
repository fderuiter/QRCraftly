/// <reference types="vite/client" />

declare module '*?raw' {
  const content: string;
  export default content;
}

/** Options for the File System Access API save picker. */
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}

interface Window {
  /** File System Access API save picker (Chromium only); not yet in TypeScript's DOM lib. */
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
}

// Custom Vike setting declared in `src/pages/+config.ts` (`meta.imageAlt`).
declare namespace Vike {
  interface Config {
    /** Alternative text for the page's Open Graph image. */
    imageAlt?: string;
  }
  interface ConfigResolved {
    imageAlt?: string;
  }
}

/** Package version from package.json, replaced at build time (see `define` in vite.config.ts). */
declare const __APP_VERSION__: string;
