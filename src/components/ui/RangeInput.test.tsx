import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, it, expect, vi } from 'vitest';
import { RangeInput } from './RangeInput';

describe('RangeInput Component Accessibility', () => {
  it('should have zero accessibility violations', async () => {
    const handleChange = vi.fn();
    const { container } = render(
      <RangeInput
        id="test-range"
        label="Test Range Label"
        value={50}
        min={0}
        max={100}
        step={1}
        onChange={handleChange}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should wrap range slider in a focus-within container with rose-500 focus indicator', () => {
    const handleChange = vi.fn();
    const { container } = render(
      <RangeInput
        id="test-range"
        label="Test Range Label"
        value={50}
        min={0}
        max={100}
        step={1}
        onChange={handleChange}
      />
    );

    // Find the range input element
    const rangeInput = screen.getByLabelText(/test range label/i);
    expect(rangeInput).toBeInTheDocument();

    // Verify it is inside a container that has focus-within:ring-rose-500
    const wrapper = rangeInput.closest('div.focus-within\\:ring-rose-500');
    expect(wrapper).toBeInTheDocument();

    // Verify it has standard layout preserving classes and rose focus indicator
    expect(wrapper).toHaveClass('focus-within:ring-rose-500');
    expect(wrapper).toHaveClass('focus-within:ring-2');
    expect(wrapper).toHaveClass('focus-within:ring-offset-2');
    expect(wrapper).toHaveClass('p-1');
    expect(wrapper).toHaveClass('-m-1');

    // Verify range input itself suppresses default focus ring
    expect(rangeInput).toHaveClass('focus-visible:ring-0');
  });
});
