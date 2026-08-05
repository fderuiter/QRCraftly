import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TextField } from './ui/TextField';
import { TextAreaField, SelectField, CheckboxField } from './ui/FormFields';
import { LocationInput } from './inputs/LocationInput';
import { WifiInput } from './inputs/WifiInput';
import { VCardInput } from './inputs/VCardInput';
import { PaymentInput } from './inputs/PaymentInput';
import { WifiEncryption, CryptoNetwork } from '../types';

describe('Accessible Inline Validation and Accessible Fields', () => {
  it('displays exactly 1 character used when numeric zero (0) is input', () => {
    render(
      <TextField
        id="zero-field"
        label="Zero Field"
        value={0}
        maxLength={10}
        showCharCount={true}
        onChange={() => {}}
      />
    );
    
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    expect(screen.getByText('1 of 10 characters used')).toBeInTheDocument();
  });

  it('preserves existing aria-describedby when custom parameters are passed', () => {
    render(
      <TextField
        id="custom-described-field"
        label="Custom Field"
        value="test"
        maxLength={10}
        showCharCount={true}
        error="Field error"
        aria-describedby="external-helper-id"
        onChange={() => {}}
      />
    );

    const input = screen.getByLabelText('Custom Field');
    const describedBy = input.getAttribute('aria-describedby');

    expect(describedBy).toContain('custom-described-field-error');
    expect(describedBy).toContain('custom-described-field-char-count');
    expect(describedBy).toContain('external-helper-id');
  });

  it('WiFi input displays local inline error when control characters are input', () => {
    const mockData = {
      ssid: 'MyWiFi\u0001Network',
      password: '',
      encryption: WifiEncryption.WPA,
      hidden: false,
      eapIdentity: '',
    };

    render(<WifiInput data={mockData} onChange={() => {}} />);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent('Network Name cannot contain control or zero-width characters.');
  });

  it('vCard website input displays local inline error when an insecure website URL is input', () => {
    const mockData = {
      firstName: '',
      lastName: '',
      organization: '',
      title: '',
      phone: '',
      email: '',
      website: 'javascript:alert(1)',
      street: '',
      city: '',
      zip: '',
      country: '',
    };

    render(<VCardInput data={mockData} onChange={() => {}} />);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent('Unsafe URL scheme or malicious protocol detected.');
  });

  it('Payment input displays local inline error when a dangerous address URL is input', () => {
    const mockData = {
      network: CryptoNetwork.CUSTOM,
      address: 'javascript:alert(1)',
      amount: '',
      label: '',
    };

    render(<PaymentInput data={mockData} onChange={() => {}} />);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent('Unsafe URL scheme or malicious protocol detected.');
  });

  it('programmatically links description helper text to the input and remains visible', () => {
    render(
      <TextField
        id="described-field"
        label="Described Field"
        value="initial"
        description="Helper instructions here"
        onChange={() => {}}
      />
    );

    const input = screen.getByLabelText('Described Field');
    const descriptionId = 'described-field-description';
    
    // Check programmatic linkage
    expect(input).toHaveAttribute('aria-describedby', descriptionId);
    
    // Check visibility of helper text
    const helperText = screen.getByText('Helper instructions here');
    expect(helperText).toBeInTheDocument();
    expect(helperText.tagName).toBe('P');
    expect(helperText).toHaveAttribute('id', descriptionId);
    expect(helperText).toHaveClass('text-slate-600'); // meets WCAG 1.4.3 minimum contrast
    
    // Simulate user editing/typing and verify it remains visible
    fireEvent.change(input, { target: { value: 'user typing...' } });
    expect(screen.getByText('Helper instructions here')).toBeInTheDocument();
  });

  it('correctly merges multiple IDs in aria-describedby when description, error, and charCount coexist', () => {
    render(
      <TextField
        id="multi-described-field"
        label="Multi Field"
        value="test"
        maxLength={10}
        showCharCount={true}
        description="Persistence info"
        error="Field error active"
        onChange={() => {}}
      />
    );

    const input = screen.getByLabelText('Multi Field');
    const describedBy = input.getAttribute('aria-describedby');

    expect(describedBy).toContain('multi-described-field-description');
    expect(describedBy).toContain('multi-described-field-error');
    expect(describedBy).toContain('multi-described-field-char-count');
    
    // Verify space-separated listing
    expect(describedBy).toBe('multi-described-field-description multi-described-field-error multi-described-field-char-count');
  });

  it('does not render empty helper elements or change margins when descriptions are absent', () => {
    const { container } = render(
      <TextField
        id="plain-field"
        label="Plain Field"
        value="plain"
        onChange={() => {}}
      />
    );

    // Verify no empty wrapper/paragraphs are rendered for the description
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
    
    const input = screen.getByLabelText('Plain Field');
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });

  it('supports description prop inside TextAreaField, SelectField, and CheckboxField', () => {
    const { container: selectContainer } = render(
      <SelectField
        id="select-field"
        label="Select Item"
        description="Select helper text"
        value=""
        onChange={() => {}}
      >
        <option value="">Choose</option>
      </SelectField>
    );
    expect(screen.getByText('Select helper text')).toBeInTheDocument();
    const selectEl = screen.getByLabelText('Select Item');
    expect(selectEl).toHaveAttribute('aria-describedby', 'select-field-description');

    const { container: textContainer } = render(
      <TextAreaField
        id="textarea-field"
        label="Text Area"
        description="Textarea helper text"
        value=""
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Textarea helper text')).toBeInTheDocument();
    const textAreaEl = screen.getByLabelText('Text Area');
    expect(textAreaEl).toHaveAttribute('aria-describedby', 'textarea-field-description');

    render(
      <CheckboxField
        id="checkbox-field"
        label="Checkbox Item"
        description="Checkbox helper text"
        checked={false}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Checkbox helper text')).toBeInTheDocument();
    const checkboxEl = screen.getByLabelText('Checkbox Item');
    expect(checkboxEl).toHaveAttribute('aria-describedby', 'checkbox-field-description');
  });

  it('coordinates inputs display validation ranges continuously in description and clean up placeholders', () => {
    const mockData = { latitude: '', longitude: '' };
    render(<LocationInput data={mockData} onChange={() => {}} />);

    // Latitude field has a persistent description
    const latInput = screen.getByLabelText('Latitude');
    expect(latInput).toHaveAttribute('aria-describedby', 'location-latitude-description');
    expect(screen.getByText('-90 to 90 (e.g. 40.7128)')).toBeInTheDocument();
    // Verification of cleaned up placeholder limits
    expect(latInput).toHaveAttribute('placeholder', 'e.g. 40.7128');

    // Longitude field has a persistent description
    const lngInput = screen.getByLabelText('Longitude');
    expect(lngInput).toHaveAttribute('aria-describedby', 'location-longitude-description');
    expect(screen.getByText('-180 to 180 (e.g. -74.0060)')).toBeInTheDocument();
    // Verification of cleaned up placeholder limits
    expect(lngInput).toHaveAttribute('placeholder', 'e.g. -74.0060');
  });
});
