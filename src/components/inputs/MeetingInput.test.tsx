import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MeetingInput } from './MeetingInput';
import { MeetingData } from '../../types';

describe('MeetingInput', () => {
  const mockOnChange = vi.fn();
  const defaultData: MeetingData = { url: '' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with empty data', () => {
    render(<MeetingInput data={defaultData} onChange={mockOnChange} />);

    expect(screen.getByText('Meeting Link')).toBeInTheDocument();

    const input = screen.getByLabelText('Paste Meeting Link') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('');

    expect(screen.queryByText(/link detected/i)).not.toBeInTheDocument();
  });

  it('calls onChange when input value changes', () => {
    render(<MeetingInput data={defaultData} onChange={mockOnChange} />);

    const input = screen.getByLabelText('Paste Meeting Link');
    const newUrl = 'https://zoom.us/j/1234567890';

    fireEvent.change(input, { target: { value: newUrl } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith({ url: newUrl });
  });

  it('displays Zoom meeting details correctly', () => {
    const data: MeetingData = { url: 'https://zoom.us/j/987654321?pwd=MyPasscode' };
    render(<MeetingInput data={data} onChange={mockOnChange} />);

    expect(screen.getByText('Zoom link detected')).toBeInTheDocument();
    expect(screen.getByText('987654321')).toBeInTheDocument(); // Meeting ID
    expect(screen.getByText('MyPasscode')).toBeInTheDocument(); // Passcode
  });

  it('displays Teams meeting details correctly', () => {
    // Basic teams link for testing
    const data: MeetingData = { url: 'https://teams.microsoft.com/l/meetup-join/19%3Ameeting_MDIxYm...%40thread.v2/0' };
    render(<MeetingInput data={data} onChange={mockOnChange} />);

    expect(screen.getByText('Microsoft Teams link detected')).toBeInTheDocument();
    expect(screen.getByText('19:meeting_MDIxYm...@thread.v2')).toBeInTheDocument(); // Meeting ID (from thread)
  });

  it('displays Google Meet details correctly', () => {
    const data: MeetingData = { url: 'https://meet.google.com/abc-defg-hij' };
    render(<MeetingInput data={data} onChange={mockOnChange} />);

    expect(screen.getByText('Google Meet link detected')).toBeInTheDocument();
    expect(screen.getByText('abc-defg-hij')).toBeInTheDocument(); // Meeting ID
  });

  it('does not display details for an unknown URL', () => {
    const data: MeetingData = { url: 'https://example.com/meeting' };
    render(<MeetingInput data={data} onChange={mockOnChange} />);

    expect(screen.queryByText(/link detected/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Meeting ID:/i)).not.toBeInTheDocument();
  });

  it('renders correctly with an unknown URL and does not show details', () => {
    const data: MeetingData = { url: 'https://example.com/unknown-meeting' };
    render(<MeetingInput data={data} onChange={mockOnChange} />);

    expect(screen.getByText('Meeting Link')).toBeInTheDocument();

    const input = screen.getByLabelText('Paste Meeting Link') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('https://example.com/unknown-meeting');

    expect(screen.queryByText(/link detected/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Meeting ID:/i)).not.toBeInTheDocument();
  });
});
