import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Button, ButtonLink } from './Button';

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
      expect(button.className).toContain('border-accent-strong');
      expect(button.className).toContain('bg-accent-soft');
      expect(button.className).toContain('ring-1');
      expect(button.className).not.toContain('border-line ');
    },
  );

  it('keeps the variant styles when not pressed', () => {
    render(<Button variant="outline" pressed={false}>Idle</Button>);
    expect(screen.getByRole('button', { name: 'Idle' }).className).toContain('border-line');
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

describe('ButtonLink', () => {
  it('renders a real link with the button styles of its variant', () => {
    render(<ButtonLink href="/about" variant="primary">About</ButtonLink>);
    const link = screen.getByRole('link', { name: 'About' });
    expect(link).toHaveAttribute('href', '/about');
    expect(link).toHaveClass('bg-action', 'text-on-action', 'inline-flex');
  });

  it('passes link attributes through', () => {
    render(<ButtonLink href="https://github.com/fderuiter/QRCraftly" target="_blank" rel="noopener noreferrer">GitHub</ButtonLink>);
    const link = screen.getByRole('link', { name: 'GitHub' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders nothing for an unsafe URL', () => {
    render(<ButtonLink href="javascript:alert(1)">Bad</ButtonLink>);
    expect(screen.queryByRole('link', { name: 'Bad' })).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(<ButtonLink href="/">Go Home</ButtonLink>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
