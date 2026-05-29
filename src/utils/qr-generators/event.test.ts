import { describe, it, expect } from 'vitest';
import {
  constructEventString,
  hydrateEventData,
  parseEventDateTime,
  formatEventDateTime,
  escapeEventString,
  unescapeEventString,
} from './event';

describe('Event generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      title: 'Meeting',
      startDate: '2025-01-01T12:30',
      endDate: '2025-01-01T13:30',
      location: 'Room 1',
      description: 'Important meeting\nBe there',
    };
    const str = constructEventString(data);
    const hydrated = hydrateEventData(str);
    expect(hydrated).toEqual(data);
  });

  it('hydrates with missing fields', () => {
    const raw = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Meeting\nEND:VEVENT\nEND:VCALENDAR`;
    const hydrated = hydrateEventData(raw);
    expect(hydrated.title).toBe('Meeting');
  });

  it('returns default for invalid data', () => {
    expect(hydrateEventData('random')).toEqual({
      title: '',
      startDate: '',
      endDate: '',
      location: '',
      description: '',
    });
  });

  it('parses unescaped fields or unknown fields', () => {
    const raw = `BEGIN:VEVENT\nINVALID:;;;\nEND:VEVENT`;
    const hydrated = hydrateEventData(raw);
    expect(hydrated.title).toBe('');
  });

  it('edge cases for dates', () => {
    expect(parseEventDateTime(undefined)).toBe('');
    expect(parseEventDateTime('INVALID')).toBe('INVALID');
    expect(formatEventDateTime(undefined)).toBe('');
    expect(formatEventDateTime('INVALID')).toBe('');
  });

  it('edge cases for escaping', () => {
    expect(escapeEventString(undefined)).toBe('');
    expect(unescapeEventString(undefined)).toBe('');
  });
});

it('handles empty parts in EVENT', () => {
  const raw = `BEGIN:VEVENT\nSUMMARY:\nDTSTART:\nDTEND:\nLOCATION:\nDESCRIPTION:\nEND:VEVENT`;
  const hydrated = hydrateEventData(raw);
  expect(hydrated.title).toBe('');
  expect(hydrated.startDate).toBe('');
  expect(hydrated.endDate).toBe('');
  expect(hydrated.location).toBe('');
  expect(hydrated.description).toBe('');
});

it('handles lines with only colon', () => {
  const raw = `BEGIN:VEVENT\n:value\nEND:VEVENT`;
  const hydrated = hydrateEventData(raw);
  expect(hydrated.title).toBe('');
});
