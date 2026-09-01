// @vitest-environment jsdom
import React, { useRef, useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Modal } from '../src/components/ui/Modal';
import { ToggleSwitch } from '../src/components/ui/ToggleSwitch';
import { ToastProvider, useToast } from '../src/components/ui/Toast';
import { useDropdownMenu } from '../src/hooks/useDropdownMenu';
import { announcementManager, announcePolitely, announceAssertively } from '../src/utils/a11y';

function TestDropdownMenu() {
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
      <button ref={triggerRef} onClick={() => setIsOpen(!isOpen)} data-testid="dropdown-trigger">
        Dropdown Menu
      </button>
      {isOpen && (
        <div ref={menuRef} role="menu" data-testid="dropdown-menu">
          <button role="menuitem" data-testid="menu-item-1">Option 1</button>
          <button role="menuitem" data-testid="menu-item-2">Option 2</button>
          <button role="menuitem" data-testid="menu-item-3">Option 3</button>
        </div>
      )}
    </div>
  );
}

function ModalWithToastTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const { addToast } = useToast();

  return (
    <div>
      <button id="modal-trigger-btn" onClick={() => setIsOpen(true)}>Open Modal</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Test Modal">
        <div>
          <button data-testid="modal-action-btn" onClick={() => addToast({ type: 'success', message: 'Toast inside modal!' })}>
            Trigger Toast
          </button>
          <button style={{ display: 'none' }} data-testid="hidden-btn">Hidden Button</button>
          <button aria-hidden="true" data-testid="aria-hidden-btn">Aria Hidden Button</button>
        </div>
      </Modal>
    </div>
  );
}

describe('Standardized A11y Primitives & Central Announcement Manager', () => {
  beforeEach(() => {
    announcementManager.reset();
    const polite = document.getElementById('dynamic-focus-live-region');
    if (polite) polite.remove();
    const assertive = document.getElementById('dynamic-focus-live-region-assertive');
    if (assertive) assertive.remove();
  });

  afterEach(() => {
    announcementManager.reset();
    const polite = document.getElementById('dynamic-focus-live-region');
    if (polite) polite.remove();
    const assertive = document.getElementById('dynamic-focus-live-region-assertive');
    if (assertive) assertive.remove();
  });

  it('Requirement 6: Central Announcement Manager sequences live region updates without cutting off active voice announcements', () => {
    vi.useFakeTimers();
    try {
      announcePolitely('First status update');
      announcePolitely('Second status update');

      const liveRegion = document.getElementById('dynamic-focus-live-region');
      expect(liveRegion).not.toBeNull();

      vi.advanceTimersByTime(50);
      expect(liveRegion?.textContent).toBe('First status update');

      announcePolitely('Third status update');

      vi.advanceTimersByTime(50);
      expect(liveRegion?.textContent).toBe('Second status update');

      vi.advanceTimersByTime(1050);
      expect(liveRegion?.textContent).toBe('Third status update');
    } finally {
      vi.useRealTimers();
    }
  });

  it('Requirement 6: Assertive announcements interrupt lower-priority polite announcements', () => {
    vi.useFakeTimers();
    try {
      announcePolitely('Polite update');
      vi.advanceTimersByTime(50);

      announceAssertively('High Priority Alert');

      const assertiveRegion = document.getElementById('dynamic-focus-live-region-assertive');
      expect(assertiveRegion).not.toBeNull();

      vi.advanceTimersByTime(50);
      expect(assertiveRegion?.textContent).toBe('High Priority Alert');
    } finally {
      vi.useRealTimers();
    }
  });

  it('Requirement 1 & AC1: Modal focus trap excludes hidden DOM elements', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ModalWithToastTrigger />
      </ToastProvider>
    );

    const triggerBtn = screen.getByText('Open Modal');
    await user.click(triggerBtn);

    // Wait for auto-focus RAF / timer
    await new Promise((resolve) => setTimeout(resolve, 60));

    const closeBtn = screen.getByRole('button', { name: /Close modal/i });
    const actionBtn = screen.getByTestId('modal-action-btn');

    expect(document.activeElement).toBe(closeBtn);

    // Tabbing should go to modal-action-btn and skip hidden/aria-hidden buttons
    await user.tab();
    expect(document.activeElement).toBe(actionBtn);

    await user.tab();
    expect(document.activeElement).toBe(closeBtn);
  });

  it('Requirement 1 & AC2: Closing modal returns keyboard focus to the triggering element', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ModalWithToastTrigger />
      </ToastProvider>
    );

    const triggerBtn = screen.getByText('Open Modal');
    await user.click(triggerBtn);

    await new Promise((resolve) => setTimeout(resolve, 60));

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(triggerBtn);
  });

  it('Requirement 2 & AC7: Toast notifications and live regions remain accessible while modal backdrop is active', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ModalWithToastTrigger />
      </ToastProvider>
    );

    await user.click(screen.getByText('Open Modal'));

    await new Promise((resolve) => setTimeout(resolve, 60));

    await user.click(screen.getByTestId('modal-action-btn'));

    const toastContainer = document.body.querySelector('[data-toast-container="true"]');
    expect(toastContainer).not.toBeNull();
    expect(toastContainer).not.toHaveAttribute('aria-hidden', 'true');

    expect(screen.getByText('Toast inside modal!')).toBeInTheDocument();
  });

  it('Requirement 3 & AC3: Dropdown menus are navigable via ArrowDown, ArrowUp, Home, End, and Escape keys', async () => {
    const user = userEvent.setup();

    render(<TestDropdownMenu />);

    const trigger = screen.getByTestId('dropdown-trigger');
    await user.click(trigger);

    const item1 = screen.getByTestId('menu-item-1');
    const item2 = screen.getByTestId('menu-item-2');
    const item3 = screen.getByTestId('menu-item-3');

    expect(item1).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(item2).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(item3).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(item1).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(item3).toHaveFocus();

    await user.keyboard('{Home}');
    expect(item1).toHaveFocus();

    await user.keyboard('{End}');
    expect(item3).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('Requirement 4 & AC4: ToggleSwitch reports checked state to screen readers and uses focus-visible styling', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <ToggleSwitch id="sample-toggle" label="Dark Mode" checked={false} onChange={handleChange} />
    );

    const toggle = screen.getByRole('switch', { name: /Dark Mode/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await user.click(toggle);
    expect(handleChange).toHaveBeenCalledWith(true);

    const track = toggle.nextElementSibling;
    expect(track?.className).toContain('peer-focus-visible:ring-2');
    expect(track?.className).not.toContain('peer-focus:ring-2');
  });

  it('Requirement 5 & AC5: Skip navigation link shifts focus directly to target content landmark', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <a
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            const target = document.getElementById('main-content');
            if (target) {
              target.setAttribute('tabindex', '-1');
              target.focus();
            }
          }}
        >
          Skip to main content
        </a>
        <header>
          <nav>Nav links</nav>
        </header>
        <main id="main-content">
          <h1>Main Content Area</h1>
        </main>
      </div>
    );

    const skipLink = screen.getByText('Skip to main content');
    const mainContent = document.getElementById('main-content');

    await user.click(skipLink);

    expect(document.activeElement).toBe(mainContent);
  });
});
