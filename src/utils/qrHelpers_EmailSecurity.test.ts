/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { describe, it, expect } from 'vitest';
import { constructEmailString } from '../strategies/email';
import { EmailData } from '../types';

describe('QR Helpers Email Security', () => {
  it('constructEmailString should strip newlines from email to prevent header injection', () => {
    const data: EmailData = {
      email: 'user@example.com\ncc:attacker@example.com',
      subject: 'Test',
      body: 'Body'
    };
    const result = constructEmailString(data);
    // The result should not contain \n or %0A (if encoded, but currently not encoded)
    expect(result).not.toContain('\n');
    expect(result).not.toContain('\r');
    // If it's correctly stripped: mailto:user@example.comcc:attacker@example.com?subject=Test&body=Body
    expect(result).toBe('mailto:user@example.comcc:attacker@example.com?subject=Test&body=Body');
  });

  it('constructEmailString should strip control characters from email', () => {
      const data: EmailData = {
          email: 'user@example.com\x00',
          subject: 'Test',
          body: 'Body'
      };
      const result = constructEmailString(data);
      expect(result).not.toContain('\x00');
      expect(result).toBe('mailto:user@example.com?subject=Test&body=Body');
  });
});
