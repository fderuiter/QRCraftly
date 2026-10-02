import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Alert } from './Alert';

describe('Alert Component', () => {
  it('renders default warning variant with correct role and content', () => {
    render(<Alert>Warning message content</Alert>);

    const alertEl = screen.getByRole('alert');
    expect(alertEl).toBeInTheDocument();
    expect(alertEl).toHaveTextContent('Warning message content');
    expect(alertEl.className).toContain('bg-warning-soft');
    expect(alertEl.className).toContain('border-warning-line');
  });

  it('renders error variant with correct title and colors', () => {
    render(
      <Alert variant="error" title="Critical Error">
        Something went wrong
      </Alert>
    );

    const alertEl = screen.getByRole('alert');
    expect(alertEl).toHaveTextContent('Critical Error: Something went wrong');
    expect(alertEl.className).toContain('bg-danger-soft');
    expect(alertEl.className).toContain('border-danger-line');
  });

  it('correctly resolves and merges custom className without concatenation bugs', () => {
    render(
      <Alert className="my-custom-class">
        With custom styles
      </Alert>
    );

    const alertEl = screen.getByRole('alert');
    // Ensure the classes are properly space-separated and contains the custom class
    expect(alertEl.className).toContain('my-custom-class');
    expect(alertEl.className).toContain('border-warning-line');
    
    // Check that there is no mashed/concatenated string like "border-amber-200my-custom-class"
    expect(alertEl.className).not.toContain('border-warning-linemy-custom-class');
    expect(alertEl.className).not.toContain('text-warningmy-custom-class');
  });

  it('renders info variant with correct colors and dismiss button', () => {
    const onDismiss = vi.fn();
    render(
      <Alert variant="info" onDismiss={onDismiss}>
        Informational notice
      </Alert>
    );

    const alertEl = screen.getByRole('alert');
    expect(alertEl.className).toContain('bg-accent-soft');
    expect(alertEl.className).toContain('border-accent-line');

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss alert' });
    expect(dismissBtn).toBeInTheDocument();
    dismissBtn.click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

