import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, it, expect, vi } from 'vitest';
import { ColorInput } from './ColorInput';

describe('ColorInput Component Accessibility', () => {
  it('should have zero accessibility violations', async () => {
    const handleChange = vi.fn();
    const { container } = render(
      <ColorInput
        id="test-color"
        label="Test Color Label"
        value="#ff0000"
        onChange={handleChange}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should wrap elements in a focus-within container with rose-500 focus indicator', () => {
    const handleChange = vi.fn();
    const { container } = render(
      <ColorInput
        id="test-color"
        label="Test Color Label"
        value="#ff0000"
        onChange={handleChange}
      />
    );

    // Find the container wrapping the input elements
    // The inputs are inside a container that has class "focus-within:ring-rose-500"
    const colorInput = screen.getByLabelText(/^test color label$/i);
    const wrapper = colorInput.closest('div.focus-within\\:ring-rose-500');
    expect(wrapper).toBeInTheDocument();

    // Verify it has standard layout preserving classes and rose focus indicator
    expect(wrapper).toHaveClass('focus-within:ring-rose-500');
    expect(wrapper).toHaveClass('focus-within:ring-2');
    expect(wrapper).toHaveClass('focus-within:ring-offset-2');
    expect(wrapper).toHaveClass('p-1');
    expect(wrapper).toHaveClass('-m-1');

    // Verify inputs suppress default focus ring
    const textInput = screen.getByLabelText(/test color label hex code/i);
    expect(colorInput).toHaveClass('focus-visible:ring-0');
    expect(textInput).toHaveClass('focus-visible:ring-0');
  });
});
