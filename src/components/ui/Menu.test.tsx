import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Button } from './Button';
import { Menu } from './Menu';

function renderMenu() {
  const onPng = vi.fn();
  const onSvg = vi.fn();
  const { container } = render(
    <div>
      <p>Outside</p>
      <Menu
        id="export"
        items={[
          { id: 'png', label: 'PNG', onSelect: onPng },
          { id: 'jpeg', label: 'JPEG', onSelect: vi.fn() },
          { id: 'svg', label: 'SVG', onSelect: onSvg, separatorBefore: true },
        ]}
        renderTrigger={(props) => <Button {...props}>Download</Button>}
      />
      <button type="button">After</button>
    </div>,
  );
  const trigger = screen.getByRole('button', { name: 'Download' });
  return { trigger, onPng, onSvg, container };
}

describe('Menu', () => {
  it('exposes the popup relationship and expanded state on the trigger', () => {
    const { trigger } = renderMenu();
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'export-menu');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'Download' });
    expect(menu).toHaveAttribute('id', 'export-menu');
  });

  it('pointer: opens on click, focuses the first item, and runs the chosen action', () => {
    const { trigger, onPng } = renderMenu();
    fireEvent.click(trigger);
    const png = screen.getByRole('menuitem', { name: 'PNG' });
    expect(document.activeElement).toBe(png);
    fireEvent.click(png);
    expect(onPng).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('pointer: closes on an outside press without stealing focus', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keyboard: Arrow Down opens on the first item and Arrow Up on the last', () => {
    const { trigger } = renderMenu();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'PNG' }));
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'SVG' }));
  });

  it('keyboard: arrows wrap, Home and End jump, and Enter selects without a pointer', () => {
    const { trigger, onSvg } = renderMenu();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const menu = screen.getByRole('menu');
    const [png, jpeg, svg] = screen.getAllByRole('menuitem');

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(jpeg);
    fireEvent.keyDown(menu, { key: 'End' });
    expect(document.activeElement).toBe(svg);
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(png);
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(svg);
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(document.activeElement).toBe(png);

    fireEvent.keyDown(menu, { key: 'End' });
    // Native buttons activate on Enter via a click event
    fireEvent.click(document.activeElement as Element);
    expect(onSvg).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(trigger);
  });

  it('keyboard: Escape closes the menu and restores focus to the trigger', () => {
    const { trigger } = renderMenu();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('keyboard: Tab closes the menu so hidden items cannot keep focus', () => {
    const { trigger } = renderMenu();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes when focus moves outside the menu', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    const after = screen.getByRole('button', { name: 'After' });
    fireEvent.focusOut(screen.getByRole('menuitem', { name: 'PNG' }), { relatedTarget: after });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('has no axe violations when open', async () => {
    const { trigger, container } = renderMenu();
    fireEvent.click(trigger);
    expect(await axe(container)).toHaveNoViolations();
  });
});
