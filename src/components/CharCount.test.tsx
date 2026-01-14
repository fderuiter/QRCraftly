import React from 'react';
import { render, screen } from '@testing-library/react';
import { CharCount } from './CharCount';

describe('CharCount', () => {
  it('renders correctly with default state', () => {
    render(<CharCount current={50} max={100} />);
    const count = screen.getByText('50 / 100');
    expect(count).toBeInTheDocument();
    expect(count).toHaveClass('text-slate-400');
  });

  it('shifts to warning color at 90%', () => {
    render(<CharCount current={90} max={100} />);
    const count = screen.getByText('90 / 100');
    expect(count).toHaveClass('text-amber-600');
  });

  it('shifts to error color at 100%', () => {
    render(<CharCount current={100} max={100} />);
    const count = screen.getByText('100 / 100');
    expect(count).toHaveClass('text-rose-600');
  });

  it('has correct accessibility attributes', () => {
    render(<CharCount current={10} max={50} />);
    const count = screen.getByRole('status');
    expect(count).toHaveAttribute('aria-label', '10 of 50 characters used');
  });
});
