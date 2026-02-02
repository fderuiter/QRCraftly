import { render, screen } from '@testing-library/react';
import InputPanel from './InputPanel';
import { DEFAULT_CONFIG } from '../constants';
import { QRType } from '../types';
import { describe, it, expect, vi } from 'vitest';

describe('InputPanel UX', () => {
  const mockOnChange = vi.fn();

  it('renders visible labels for vCard address fields', () => {
    render(<InputPanel config={{ ...DEFAULT_CONFIG, type: QRType.VCARD }} onChange={mockOnChange} />);

    // These should exist as visible <label> elements
    // Currently they do not (they are aria-labels on inputs)
    expect(screen.getByText('Street', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText('City', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText('Country', { selector: 'label' })).toBeInTheDocument();

    // Also verify they are associated with inputs
    const streetLabel = screen.getByText('Street', { selector: 'label' });
    const streetInput = screen.getByLabelText('Street');
    expect(streetLabel.getAttribute('for')).toBe(streetInput.id);
  });
});
