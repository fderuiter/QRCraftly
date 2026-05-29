import { describe, it, expect } from 'vitest';
import { constructMeetingString, hydrateMeetingData } from './meeting';

describe('Meeting generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      url: 'https://zoom.us/j/1234567890',
    };
    const str = constructMeetingString(data);
    const hydrated = hydrateMeetingData(str);
    expect(hydrated).toEqual(data);
  });
});
