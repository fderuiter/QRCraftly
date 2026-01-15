import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CharCount } from './CharCount';

describe('CharCount', () => {
  it('renders the correct count and max', () => {
    render(<CharCount current={10} max={100} />);
    expect(screen.getByText('10 / 100')).toBeInTheDocument();
  });

  it('uses neutral color when usage is low', () => {
    const { container } = render(<CharCount current={50} max={100} />);
    // 50 is 50%, so not near limit
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('text-slate-400');
    expect(div.className).not.toContain('text-amber-600');
    expect(div.className).not.toContain('text-rose-600');
  });

  it('uses warning color when usage is near limit (90%)', () => {
    const { container } = render(<CharCount current={90} max={100} />);
    // 90 is 90%, so near limit
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('text-amber-600');
    expect(div.className).not.toContain('text-rose-600');
  });

  it('uses danger color when usage is at or above limit', () => {
    const { container } = render(<CharCount current={100} max={100} />);
    // 100 is 100%
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('text-rose-600');
  });

  it('uses danger color when usage is exceeded', () => {
    const { container } = render(<CharCount current={101} max={100} />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('text-rose-600');
  });
});
