import { sanitizeInput } from '../security';

/**
 * Data structure for an Email message.
 */
export interface EmailData {
  /** The recipient's email address. */
  email: string;
  /** The subject line of the email. */
  subject: string;
  /** The body content of the email. */
  body: string;
}

/**
 * Constructs the mailto string for Email QR code.
 */
export const constructEmailString = (data: EmailData): string => {
  // Sanitize email to prevent header injection (e.g. ?cc=attacker@example.com)
  const safeEmail = sanitizeInput(data.email);
  return `mailto:${safeEmail}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
};
