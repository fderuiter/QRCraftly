import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGeneratorShortcuts, type ShortcutHandlers } from './useGeneratorShortcuts';

function setup(overrides: Partial<ShortcutHandlers> = {}) {
  const handlers: ShortcutHandlers = {
    undo: vi.fn(),
    redo: vi.fn(),
    download: vi.fn(),
    copyImage: vi.fn(),
    togglePalette: vi.fn(),
    showHelp: vi.fn(),
    paletteOpen: false,
    ...overrides,
  };
  renderHook(() => useGeneratorShortcuts(handlers));
  return handlers;
}

describe('useGeneratorShortcuts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('maps the Ctrl shortcuts', async () => {
    const h = setup();
    await userEvent.keyboard('{Control>}k{/Control}');
    await userEvent.keyboard('{Control>}z{/Control}');
    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    await userEvent.keyboard('{Control>}y{/Control}');
    await userEvent.keyboard('{Control>}s{/Control}');
    await userEvent.keyboard('?');
    expect(h.togglePalette).toHaveBeenCalledTimes(1);
    expect(h.undo).toHaveBeenCalledTimes(1);
    expect(h.redo).toHaveBeenCalledTimes(2);
    expect(h.download).toHaveBeenCalledTimes(1);
    expect(h.showHelp).toHaveBeenCalledTimes(1);
  });

  it('leaves undo, redo and ? to text fields', async () => {
    const h = setup();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    await userEvent.keyboard('{Control>}z{/Control}?');
    expect(h.undo).not.toHaveBeenCalled();
    expect(h.showHelp).not.toHaveBeenCalled();
    // The palette and download keys still work while typing.
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(h.togglePalette).toHaveBeenCalledTimes(1);
  });

  it('copies the image only from inside the preview', async () => {
    const h = setup();
    const outside = document.createElement('button');
    const stage = document.createElement('div');
    stage.setAttribute('data-testid', 'qr-stage');
    const inside = document.createElement('button');
    stage.appendChild(inside);
    document.body.append(outside, stage);
    outside.focus();
    await userEvent.keyboard('{Control>}c{/Control}');
    expect(h.copyImage).not.toHaveBeenCalled();
    inside.focus();
    await userEvent.keyboard('{Control>}c{/Control}');
    expect(h.copyImage).toHaveBeenCalledTimes(1);
  });

  it('stays quiet while another dialog is open, except to close the palette', async () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);
    const closed = setup();
    await userEvent.keyboard('{Control>}s{/Control}{Control>}k{/Control}');
    expect(closed.download).not.toHaveBeenCalled();
    expect(closed.togglePalette).not.toHaveBeenCalled();
    const open = setup({ paletteOpen: true });
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(open.togglePalette).toHaveBeenCalledTimes(1);
  });
});
