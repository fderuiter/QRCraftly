import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CharCount } from './CharCount';

describe('CharCount Component', () => {
  it('renders correct count', () => {
    render(<CharCount current={50} max={100} />);
    expect(screen.getByText('50 / 100')).toBeInTheDocument();
  });

  it('renders default color for low usage', () => {
    render(<CharCount current={10} max={100} />);
    const counter = screen.getByText('10 / 100');
    expect(counter).toHaveClass('text-slate-500');
  });

  it('renders warning color for >= 90% usage', () => {
    render(<CharCount current={90} max={100} />);
    const counter = screen.getByText('90 / 100');
    expect(counter).toHaveClass('text-amber-600');
  });

  it('renders error color for 100% usage', () => {
    render(<CharCount current={100} max={100} />);
    const counter = screen.getByText('100 / 100');
    expect(counter).toHaveClass('text-rose-600');
  });

  it('has accessibility attributes', () => {
    render(<CharCount current={50} max={100} />);
    const counter = screen.getByText('50 / 100');
    expect(counter).toHaveAttribute('aria-live', 'polite');
    expect(counter).toHaveAttribute('aria-atomic', 'true');
  });
});
