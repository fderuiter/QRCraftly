import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerKeyboardHandler,
  unregisterKeyboardHandler,
  clearKeyboardRegistry,
  getRegisteredHandlers,
} from '../src/utils/keyboardRegistry';
import { useKeyboardPriority } from '../src/hooks/useKeyboardPriority';
import { useGlobalEvent } from '../src/hooks/useGlobalEvent';
import { Modal } from '../src/components/ui/Modal';

describe('Priority Keyboard Registry', () => {
  beforeEach(() => {
    clearKeyboardRegistry();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearKeyboardRegistry();
  });

  it('routes keydown events to registered handlers in descending priority order', () => {
    const order: string[] = [];
    registerKeyboardHandler('low', 10, () => {
      order.push('low');
      return true;
    });
    registerKeyboardHandler('high', 100, () => {
      order.push('high');
      return true;
    });
    registerKeyboardHandler('medium', 50, () => {
      order.push('medium');
      return true;
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    document.dispatchEvent(event);

    expect(order).toEqual(['high', 'medium', 'low']);
  });

  it('breaks ties using insertion order (newest runs first)', () => {
    const order: string[] = [];
    registerKeyboardHandler('first', 50, () => {
      order.push('first');
      return true;
    });
    registerKeyboardHandler('second', 50, () => {
      order.push('second');
      return true;
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    document.dispatchEvent(event);

    expect(order).toEqual(['second', 'first']);
  });

  it('stops propagation by default (returning false or void)', () => {
    const order: string[] = [];
    registerKeyboardHandler('high', 100, () => {
      order.push('high');
      // returns void (stops propagation)
    });
    registerKeyboardHandler('low', 50, () => {
      order.push('low');
      return true;
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    document.dispatchEvent(event);

    expect(order).toEqual(['high']);
  });

  it('continues propagation if handler explicitly returns true', () => {
    const order: string[] = [];
    registerKeyboardHandler('high', 100, () => {
      order.push('high');
      return true; // explicitly permit propagation
    });
    registerKeyboardHandler('low', 50, () => {
      order.push('low');
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    document.dispatchEvent(event);

    expect(order).toEqual(['high', 'low']);
  });

  it('maintains subsequent handlers operations even if a high-priority handler throws an error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const order: string[] = [];

    registerKeyboardHandler('high-error', 100, () => {
      order.push('high-error');
      throw new Error('Test Error');
    });
    registerKeyboardHandler('low', 50, () => {
      order.push('low');
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    document.dispatchEvent(event);

    expect(order).toEqual(['high-error', 'low']);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('dynamically adds and removes document-level keydown listener only when handlers exist', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    expect(getRegisteredHandlers().length).toBe(0);

    const unregister = registerKeyboardHandler('test', 10, () => {});
    expect(getRegisteredHandlers().length).toBe(1);
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    unregister();
    expect(getRegisteredHandlers().length).toBe(0);
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

describe('useKeyboardPriority Hook', () => {
  beforeEach(() => {
    clearKeyboardRegistry();
  });

  const TestComponent = ({ id, priority, onKeyDown, isActive = true }: any) => {
    useKeyboardPriority(id, priority, onKeyDown, isActive);
    return <div data-testid="test-comp" />;
  };

  it('registers handler on mount and unregisters on unmount', () => {
    const onKeyDown = vi.fn();
    const { unmount } = render(
      <TestComponent id="test-hook" priority={50} onKeyDown={onKeyDown} />
    );

    expect(getRegisteredHandlers().length).toBe(1);
    expect(getRegisteredHandlers()[0].id).toBe('test-hook');

    unmount();
    expect(getRegisteredHandlers().length).toBe(0);
  });

  it('respects isActive prop for enabling/disabling', () => {
    const onKeyDown = vi.fn();
    const { rerender } = render(
      <TestComponent id="test-hook" priority={50} onKeyDown={onKeyDown} isActive={false} />
    );

    expect(getRegisteredHandlers().length).toBe(0);

    rerender(<TestComponent id="test-hook" priority={50} onKeyDown={onKeyDown} isActive={true} />);
    expect(getRegisteredHandlers().length).toBe(1);

    rerender(<TestComponent id="test-hook" priority={50} onKeyDown={onKeyDown} isActive={false} />);
    expect(getRegisteredHandlers().length).toBe(0);
  });
});

describe('useGlobalEvent Hook', () => {
  const TestGlobalEventComponent = ({ type, listener, target }: any) => {
    useGlobalEvent(type, listener, target);
    return <div />;
  };

  it('registers listener on specified target and cleans up on unmount', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const listener = vi.fn();

    const { unmount } = render(
      <TestGlobalEventComponent type="click" listener={listener} />
    );

    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);
  });
});

describe('Integration - Nested Modals & Escape Key', () => {
  beforeEach(() => {
    clearKeyboardRegistry();
  });

  const NestedModals = () => {
    const [modalAOpen, setModalAOpen] = useState(false);
    const [modalBOpen, setModalBOpen] = useState(false);

    return (
      <div>
        <button onClick={() => setModalAOpen(true)}>Open A</button>
        <Modal isOpen={modalAOpen} onClose={() => setModalAOpen(false)} title="Modal A">
          <div>
            <p>Content A</p>
            <button onClick={() => setModalBOpen(true)}>Open B</button>
            <Modal isOpen={modalBOpen} onClose={() => setModalBOpen(false)} title="Modal B">
              <div>
                <p>Content B</p>
                <button data-testid="inner-button">Button B</button>
              </div>
            </Modal>
          </div>
        </Modal>
      </div>
    );
  };

  it('closes only the top-most active modal when pressing Escape', async () => {
    render(<NestedModals />);

    // Open Modal A
    fireEvent.click(screen.getByText('Open A'));
    expect(screen.getByText('Modal A')).toBeInTheDocument();

    // Open Modal B
    fireEvent.click(screen.getByText('Open B'));
    expect(screen.getByText('Modal B')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });

    // Modal B should be closed, Modal A should remain open!
    expect(screen.queryByText('Modal B')).not.toBeInTheDocument();
    expect(screen.getByText('Modal A')).toBeInTheDocument();

    // Press Escape again
    fireEvent.keyDown(document, { key: 'Escape' });

    // Modal A should now be closed!
    expect(screen.queryByText('Modal A')).not.toBeInTheDocument();
  });
});
