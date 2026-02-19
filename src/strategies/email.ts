import { EmailData } from '../types';
import { EmailInput } from '../components/inputs/EmailInput';
import { sanitizeInput } from '../utils/security';

/**
 * Constructs the mailto string for Email QR code.
 */
export const constructEmailString = (data: EmailData): string => {
  // Sanitize email to prevent header injection (e.g. ?cc=attacker@example.com)
  const safeEmail = sanitizeInput(data.email);
  return `mailto:${safeEmail}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
};

export const EmailStrategy = {
  initialState: { email: '', subject: '', body: '' } as EmailData,
  constructString: constructEmailString,
  InputComponent: EmailInput,
};
