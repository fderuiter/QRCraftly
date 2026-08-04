import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, it, expect } from 'vitest';
import { Card } from './Card';

describe('Card Component', () => {
  it('should render children successfully', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('should have zero accessibility violations', async () => {
    const { container } = render(<Card>Card Content</Card>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should apply default classes and allow custom class overrides', () => {
    const { container } = render(
      <Card bg="bg-red-500" className="custom-card-class">
        Content
      </Card>
    );
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveClass('bg-red-500');
    expect(element).toHaveClass('custom-card-class');
    expect(element).toHaveClass('shadow-2xl');
  });

  it('should apply the default variant classes correctly when not specified', () => {
    const { container } = render(<Card>Content</Card>);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveClass('bg-white');
    expect(element).toHaveClass('dark:bg-slate-900');
    expect(element).toHaveClass('border-slate-200');
    expect(element).toHaveClass('dark:border-slate-800');
    expect(element).toHaveClass('shadow-2xl');
    expect(element).toHaveClass('p-8');
    expect(element).toHaveClass('rounded-3xl');
  });

  it('should apply control variant classes correctly', () => {
    const { container } = render(<Card variant="control">Content</Card>);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveClass('bg-slate-50');
    expect(element).toHaveClass('dark:bg-slate-800/50');
    expect(element).toHaveClass('border-slate-200');
    expect(element).toHaveClass('dark:border-slate-700');
    expect(element).toHaveClass('shadow-none');
    expect(element).toHaveClass('p-4');
    expect(element).toHaveClass('rounded-xl');
  });

  it('should safely merge custom overrides with the control variant default classes', () => {
    const { container } = render(
      <Card variant="control" bg="bg-blue-500" className="extra-class">
        Content
      </Card>
    );
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveClass('bg-blue-500');
    expect(element).not.toHaveClass('bg-slate-50');
    expect(element).toHaveClass('extra-class');
    expect(element).toHaveClass('shadow-none');
  });
});
