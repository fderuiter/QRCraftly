import { describe, it, expect } from 'vitest';
import { constructMeetingString, hydrateMeetingData, MeetingContract } from './meeting';
import { QRType } from '../../types';

describe('Meeting generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      url: 'https://zoom.us/j/1234567890'
    };
    const str = constructMeetingString(data);
    const hydrated = hydrateMeetingData(str);
    expect(hydrated).toEqual(data);
  });

  it('implements MeetingContract correctly and validates URLs', () => {
    expect(MeetingContract.type).toBe(QRType.MEETING);
    expect(MeetingContract.matches('https://zoom.us/j/1234567890')).toBe(true);
    expect(MeetingContract.matches('random')).toBe(false);

    // Empty URL construction
    expect(MeetingContract.construct({ url: '' })).toBe('');

    // Safe URL validation
    expect(MeetingContract.validate?.('https://zoom.us/j/1234567890')).toEqual([]);

    // Dangerous URL validation
    expect(MeetingContract.validate?.('javascript:alert(1)')).toEqual(['URI_INJECTION_VIOLATION']);

    // Malformed URL starting with http
    expect(MeetingContract.validate?.('http://invalid url space')).toEqual(['URL_STRUCTURE_VIOLATION']);
  });
});
