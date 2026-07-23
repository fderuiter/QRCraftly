import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { TextField } from './ui/TextField';
import { TextAreaField } from './ui/FormFields';

describe('Screen Reader Integration for Form Character Counters', () => {
  it('Visual labels correctly target their respective inputs on click', async () => {
    render(
      <TextField id="custom-text-field" label="Test Label" value="" onChange={() => {}} />
    );
    
    const label = screen.getByText('Test Label');
    const input = screen.getByLabelText('Test Label');
    
    expect(label).toHaveAttribute('for', 'custom-text-field');
    expect(input).toHaveAttribute('id', 'custom-text-field');
    
    // Test click on label focuses the input field
    await userEvent.click(label);
    expect(input).toHaveFocus();
  });

  it('Form wrappers must support fallback ID assignment when no ID is provided', async () => {
    render(
      <TextField label="Fallback Label" value="" onChange={() => {}} />
    );
    
    const label = screen.getByText('Fallback Label');
    const input = screen.getByLabelText('Fallback Label');
    
    // Input should have an ID assigned automatically
    const inputId = input.getAttribute('id');
    expect(inputId).toBeDefined();
    expect(inputId).not.toBeNull();
    expect(inputId?.length).toBeGreaterThan(0);
    
    // Label for attribute should match the input's assigned ID
    expect(label).toHaveAttribute('for', inputId);
    
    // Test click on label focuses the input field
    await userEvent.click(label);
    expect(input).toHaveFocus();
  });

  it('The input descriptive attribute matches both the error text identifier and the character counter identifier simultaneously', () => {
    render(
      <TextField
        id="limited-field"
        label="Limited Field"
        value="test"
        maxLength={10}
        showCharCount={true}
        error="This is an error"
        onChange={() => {}}
      />
    );

    const input = screen.getByLabelText('Limited Field');
    const errorMsg = screen.getByRole('alert');
    const charCounter = screen.getByText('4 of 10 characters used');

    // The error message and character counter must have specific IDs
    const errorId = errorMsg.getAttribute('id');
    const charCountId = charCounter.closest('div')?.getAttribute('id');

    expect(errorId).toBe('limited-field-error');
    expect(charCountId).toBe('limited-field-char-count');

    // The input's aria-describedby attribute should include both IDs space-separated
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toContain('limited-field-error');
    expect(describedBy).toContain('limited-field-char-count');
    expect(describedBy?.split(' ')).toContain('limited-field-error');
    expect(describedBy?.split(' ')).toContain('limited-field-char-count');
  });

  it('Screen readers announce the character count when focusing an empty text field', async () => {
    render(
      <TextAreaField
        id="empty-textarea"
        label="Comments"
        value=""
        maxLength={200}
        showCharCount={true}
        onChange={() => {}}
      />
    );

    const textarea = screen.getByLabelText('Comments');
    const charCounterWrapper = screen.getByText('0 of 200 characters used').closest('div');

    expect(charCounterWrapper).toHaveAttribute('id', 'empty-textarea-char-count');
    expect(charCounterWrapper).toHaveAttribute('aria-live', 'polite');
    expect(charCounterWrapper).toHaveAttribute('aria-atomic', 'true');

    const describedBy = textarea.getAttribute('aria-describedby');
    expect(describedBy).toBe('empty-textarea-char-count');

    // Focus empty field
    await userEvent.click(textarea);
    expect(textarea).toHaveFocus();
  });

  it('Description associations must dynamically recalculate when visual fields change active rendering state', () => {
    const { rerender } = render(
      <TextField
        id="dynamic-field"
        label="Dynamic Field"
        value="hello"
        maxLength={50}
        showCharCount={true}
        onChange={() => {}}
      />
    );

    let input = screen.getByLabelText('Dynamic Field');
    let describedBy = input.getAttribute('aria-describedby');
    
    // Initially, only character counter is describing the input
    expect(describedBy).toBe('dynamic-field-char-count');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Rerender with error message (changing the active visual/rendering state of error)
    rerender(
      <TextField
        id="dynamic-field"
        label="Dynamic Field"
        value="hello"
        maxLength={50}
        showCharCount={true}
        error="This is now invalid"
        onChange={() => {}}
      />
    );

    input = screen.getByLabelText('Dynamic Field');
    describedBy = input.getAttribute('aria-describedby');
    
    // The descriptive attribute should now include both IDs simultaneously
    expect(describedBy).toContain('dynamic-field-error');
    expect(describedBy).toContain('dynamic-field-char-count');
  });
});
