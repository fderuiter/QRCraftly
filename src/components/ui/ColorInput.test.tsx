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

  it('should support direct focus on child input elements instead of focus-within container', () => {
    const handleChange = vi.fn();
    render(
      <ColorInput
        id="test-color"
        label="Test Color Label"
        value="#ff0000"
        onChange={handleChange}
      />
    );

    // Find the container wrapping the input elements
    const colorInput = screen.getByLabelText(/^test color label$/i);
    const wrapper = colorInput.parentElement;
    expect(wrapper).toBeInTheDocument();

    // Verify container does NOT have focus-within classes
    expect(wrapper).not.toHaveClass('focus-within:ring-rose-500');
    expect(wrapper).not.toHaveClass('focus-within:ring-2');
    expect(wrapper).not.toHaveClass('focus-within:ring-offset-2');

    // Verify container still has standard layout classes
    expect(wrapper).toHaveClass('p-1');
    expect(wrapper).toHaveClass('-m-1');

    // Verify inputs do NOT suppress default focus ring
    const textInput = screen.getByLabelText(/test color label hex code/i);
    expect(colorInput).not.toHaveClass('focus-visible:ring-0');
    expect(textInput).not.toHaveClass('focus-visible:ring-0');
  });
});
