import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal Component Accessibility and Behavior', () => {
  it('should have zero accessibility violations when open', async () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <div>Modal Content</div>
      </Modal>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not render anything when closed', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <div>Modal Content</div>
      </Modal>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should close when Escape key is pressed', async () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <div>Modal Content</div>
      </Modal>
    );
    
    await userEvent.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should lock body scroll when open and restore when closed', () => {
    const initialOverflow = document.body.style.overflow;

    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <div>Modal Content</div>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <div>Modal Content</div>
      </Modal>
    );

    expect(document.body.style.overflow).toBe(initialOverflow);
  });

  it('should trap focus and restore focus on open/close cycles', async () => {
    const trigger = document.createElement('button');
    trigger.id = 'trigger';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <button data-testid="button1">Button 1</button>
        <button data-testid="button2">Button 2</button>
      </Modal>
    );

    // Wait for auto-focus to trigger (it has a 50ms timeout)
    await new Promise((resolve) => setTimeout(resolve, 60));

    const closeBtn = document.querySelector('[aria-label="Close modal"]') as HTMLElement;
    const btn1 = document.querySelector('[data-testid="button1"]') as HTMLElement;
    const btn2 = document.querySelector('[data-testid="button2"]') as HTMLElement;

    expect(document.activeElement).toBe(closeBtn);

    await userEvent.tab();
    expect(document.activeElement).toBe(btn1);

    await userEvent.tab();
    expect(document.activeElement).toBe(btn2);

    await userEvent.tab();
    expect(document.activeElement).toBe(closeBtn);

    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(btn2);

    rerender(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <button data-testid="button1">Button 1</button>
        <button data-testid="button2">Button 2</button>
      </Modal>
    );

    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });
});
