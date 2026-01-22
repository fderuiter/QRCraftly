import { render, screen } from '@testing-library/react';
import CharCount from './CharCount';
import { describe, it, expect } from 'vitest';

describe('CharCount Component', () => {
  it('renders correctly with default props', () => {
    render(<CharCount id="test-count" current={10} max={100} />);
    const counter = screen.getByText('10/100');
    expect(counter).toBeInTheDocument();
    expect(counter).toHaveAttribute('id', 'test-count');
    expect(counter).toHaveClass('text-slate-400');
    expect(counter).toHaveAttribute('aria-live', 'polite');
  });

  it('changes color when approaching limit (90%)', () => {
    render(<CharCount id="test-count" current={90} max={100} />);
    const counter = screen.getByText('90/100');
    expect(counter).toHaveClass('text-amber-600');
    expect(counter).not.toHaveClass('text-slate-400');
  });

  it('changes color when at limit (100%)', () => {
    render(<CharCount id="test-count" current={100} max={100} />);
    const counter = screen.getByText('100/100');
    expect(counter).toHaveClass('text-rose-600');
    expect(counter).toHaveClass('font-medium');
  });
});
