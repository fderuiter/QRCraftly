import { describe, it, expect } from 'vitest';
import { constructEventString, hydrateEventData, EventContract } from './event';
import { QRType } from '../../types';

describe('Event generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      title: 'Meeting',
      startDate: '2025-01-01T12:30',
      endDate: '2025-01-01T13:30',
      location: 'Room 1',
      description: 'Important meeting\nBe there'
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

  it('handles invalid date formats in EVENT', () => {
    const raw = `BEGIN:VEVENT\nDTSTART:invalid-date\nDTEND:not-a-date\nEND:VEVENT`;
    const hydrated = hydrateEventData(raw);
    expect(hydrated.startDate).toBe('invalid-date');
    expect(hydrated.endDate).toBe('not-a-date');
  });

  it('handles invalid dates when constructing event string', () => {
    const data = {
      title: 'Meeting',
      startDate: 'invalid-date',
      endDate: 'not-a-date',
      location: '',
      description: ''
    };
    const str = constructEventString(data);
    expect(str).toContain('DTSTART:');
    expect(str).toContain('DTEND:');
    expect(str).not.toContain('NaN');
  });

  it('handles undefined fields during escaping', () => {
    const data = {
      title: undefined as unknown as string,
      startDate: undefined as unknown as string,
      endDate: undefined as unknown as string,
      location: undefined as unknown as string,
      description: undefined as unknown as string,
    };
    const str = constructEventString(data);
    expect(str).toContain('SUMMARY:');
    expect(str).toContain('DTSTART:');
    expect(str).toContain('DTEND:');
    expect(str).toContain('LOCATION:');
    expect(str).toContain('DESCRIPTION:');
  });

  it('implements EventContract correctly', () => {
    expect(EventContract.type).toBe(QRType.EVENT);
    expect(EventContract.matches('BEGIN:VEVENT')).toBe(true);
    expect(EventContract.matches('OTHER')).toBe(false);

    // Valid payload should have no violations
    const validRaw = 'BEGIN:VEVENT\nSUMMARY:Launch Party\nDTSTART:20260501T183000\nEND:VEVENT';
    expect(EventContract.validate?.(validRaw)).toEqual([]);

    // Missing summary and start date should trigger violations
    expect(EventContract.validate?.('BEGIN:VEVENT')).toEqual([
      'EVENT_MISSING_SUMMARY',
      'EVENT_MISSING_START'
    ]);

    // Chronological violation (end before start)
    const invalidChrono = 'BEGIN:VEVENT\nSUMMARY:Meeting\nDTSTART:20260501T183000\nDTEND:20260501T173000\nEND:VEVENT';
    expect(EventContract.validate?.(invalidChrono)).toEqual(['EVENT_CHRONOLOGICAL_VIOLATION']);

    // Dangerous URL injection in location or description
    const dangerousUrlLoc = 'BEGIN:VEVENT\nSUMMARY:Meeting\nDTSTART:20260501T183000\nLOCATION:javascript:alert(1)\nEND:VEVENT';
    expect(EventContract.validate?.(dangerousUrlLoc)).toEqual(['URI_INJECTION_VIOLATION']);

    // Safe URL in location or description (should not trigger any violation)
    const safeUrlLoc = 'BEGIN:VEVENT\nSUMMARY:Meeting\nDTSTART:20260501T183000\nLOCATION:https://example.com\nDESCRIPTION:Check out https://google.com\nEND:VEVENT';
    expect(EventContract.validate?.(safeUrlLoc)).toEqual([]);

    // URL-like description (exactly a URL) to cover isUrlLike(data.description)
    const urlDesc = 'BEGIN:VEVENT\nSUMMARY:Meeting\nDTSTART:20260501T183000\nDESCRIPTION:https://example.com\nEND:VEVENT';
    expect(EventContract.validate?.(urlDesc)).toEqual([]);

    // Valid event with both start and end dates (DTEND >= DTSTART)
    const validChronoWithEnd = 'BEGIN:VEVENT\nSUMMARY:Meeting\nDTSTART:20260501T183000\nDTEND:20260501T193000\nEND:VEVENT';
    expect(EventContract.validate?.(validChronoWithEnd)).toEqual([]);

    // Invalid dates in DTSTART/DTEND (should not trigger chronological violation since they are not valid numbers)
    const invalidChronoDates = 'BEGIN:VEVENT\nSUMMARY:Meeting\nDTSTART:invalid\nDTEND:invalid\nEND:VEVENT';
    expect(EventContract.validate?.(invalidChronoDates)).toEqual([]);
  });

  it('constructs event with regional timezone parameters (TZID)', () => {
    const dataWithTzid = {
      title: 'Meeting',
      startDate: '2025-01-01T12:30;TZID=America/New_York',
      endDate: '2025-01-01T13:30;TZID=America/New_York',
      location: 'Room 1',
      description: 'Important meeting'
    };
    const str = constructEventString(dataWithTzid);
    expect(str).toContain('DTSTART;TZID=America/New_York:20250101T123000');
    expect(str).toContain('DTEND;TZID=America/New_York:20250101T133000');
  });
});

