// @vitest-environment jsdom
import React, { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { useDropdownMenu } from './useDropdownMenu';

function TestMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useDropdownMenu({
    isOpen,
    onClose: () => setIsOpen(false),
    menuRef,
    triggerRef,
  });

  return (
    <div>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        data-testid="trigger"
      >
        Menu Trigger
      </button>
      {isOpen && (
        <div ref={menuRef} role="menu" data-testid="menu">
          <button role="menuitem" data-testid="item1">
            Item 1
          </button>
          <button role="menuitem" data-testid="item2">
            Item 2
          </button>
          <button role="menuitem" data-testid="item3">
            Item 3
          </button>
        </div>
      )}
    </div>
  );
}

describe('useDropdownMenu Hook', () => {
  it('shifts focus to the first menu item when opened', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);

    const trigger = screen.getByTestId('trigger');
    await user.click(trigger);

    const item1 = screen.getByTestId('item1');
    expect(item1).toHaveFocus();
  });

  it('navigates menu items with ArrowDown, ArrowUp, Home, and End keys', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);

    await user.click(screen.getByTestId('trigger'));

    const item1 = screen.getByTestId('item1');
    const item2 = screen.getByTestId('item2');
    const item3 = screen.getByTestId('item3');

    expect(item1).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(item2).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(item3).toHaveFocus();

    // Loops around to item 1
    await user.keyboard('{ArrowDown}');
    expect(item1).toHaveFocus();

    // ArrowUp loops around to item 3
    await user.keyboard('{ArrowUp}');
    expect(item3).toHaveFocus();

    // Home jumps to item 1
    await user.keyboard('{Home}');
    expect(item1).toHaveFocus();

    // End jumps to item 3
    await user.keyboard('{End}');
    expect(item3).toHaveFocus();
  });

  it('dismisses menu on Escape key and restores focus to trigger element', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);

    const trigger = screen.getByTestId('trigger');
    await user.click(trigger);
    expect(screen.getByTestId('item1')).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
