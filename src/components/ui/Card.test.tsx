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
});
