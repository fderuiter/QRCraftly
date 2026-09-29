import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Button } from './Button';

describe('Button pressed state', () => {
  it('omits aria-pressed when the button is not a toggle', () => {
    render(<Button>Plain</Button>);
    expect(screen.getByRole('button', { name: 'Plain' })).not.toHaveAttribute('aria-pressed');
  });

  it('sets aria-pressed from the pressed prop', () => {
    render(
      <>
        <Button pressed>On</Button>
        <Button pressed={false}>Off</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'false');
  });

  it.each(['outline', 'secondary', 'ghost'] as const)(
    'replaces %s variant colours with selected styles for both themes',
    (variant) => {
      render(<Button variant={variant} pressed>Selected</Button>);
      const button = screen.getByRole('button', { name: 'Selected' });
      // Light and dark selected borders are present; the variant's dark border is not,
      // so it cannot override the selected border in dark mode.
      expect(button.className).toContain('border-teal-700');
      expect(button.className).toContain('dark:border-teal-300');
      expect(button.className).toContain('ring-1');
      expect(button.className).not.toContain('dark:border-slate-700');
    },
  );

  it('keeps the variant styles when not pressed', () => {
    render(<Button variant="outline" pressed={false}>Idle</Button>);
    expect(screen.getByRole('button', { name: 'Idle' }).className).toContain('dark:border-slate-700');
  });

  it('has no axe violations in a toggle group', async () => {
    const { container } = render(
      <div role="group" aria-label="Template">
        <Button variant="outline" pressed>None</Button>
        <Button variant="outline" pressed={false}>Square</Button>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
