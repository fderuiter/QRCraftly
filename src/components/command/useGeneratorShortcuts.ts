import { useEffect, useRef } from 'react';

/** What the generator shortcuts can trigger. */
export interface ShortcutHandlers {
  undo: () => void;
  redo: () => void;
  /** Downloads in the format chosen last. */
  download: () => void;
  copyImage: () => void;
  /** Opens the command palette, or closes it when it is open. */
  togglePalette: () => void;
  showHelp: () => void;
  /** Whether the command palette is open. */
  paletteOpen: boolean;
}

const TEXT_ENTRY = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

/** Whether the shortcut modifier is the Command key (Apple platforms) rather than Ctrl. */
export function usesCommandKey(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
}

/**
 * Generator keyboard shortcuts: Ctrl/Cmd+K palette, Ctrl/Cmd+Z undo, Shift+Ctrl/Cmd+Z (or
 * Ctrl+Y) redo, Ctrl/Cmd+S download, Ctrl/Cmd+C copy the image while the preview has focus,
 * and `?` for the cheat sheet. Undo, redo, copy and `?` leave text fields alone so typing
 * keeps its native behaviour. While another dialog is open only the palette key still works.
 * @param handlers - What each shortcut does; read at the time of the key press.
 */
export function useGeneratorShortcuts(handlers: ShortcutHandlers): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const h = ref.current;
      const key = event.key.toLowerCase();
      const mod = usesCommandKey() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
      const target = event.target instanceof Element ? event.target : null;
      const typing = target?.closest(TEXT_ENTRY) != null;
      const dialogOpen = document.querySelector('[aria-modal="true"]') !== null;

      if (mod && !event.altKey && key === 'k') {
        if (dialogOpen && !h.paletteOpen) return;
        event.preventDefault();
        h.togglePalette();
        return;
      }
      if (dialogOpen) return;

      if (mod && !event.altKey && key === 's') {
        event.preventDefault();
        h.download();
      } else if (mod && !event.altKey && !typing && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) h.redo();
        else h.undo();
      } else if (mod && !event.altKey && !typing && !event.shiftKey && key === 'y' && !usesCommandKey()) {
        event.preventDefault();
        h.redo();
      } else if (mod && !event.shiftKey && !event.altKey && !typing && key === 'c') {
        const inPreview = target?.closest('[data-testid="qr-stage"]') != null || target?.closest('#qr-preview') != null;
        if (inPreview && (window.getSelection()?.isCollapsed ?? true)) {
          event.preventDefault();
          h.copyImage();
        }
      } else if (!mod && !event.altKey && !typing && event.key === '?') {
        event.preventDefault();
        h.showHelp();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
