/**
 * Normalizes Indian and International phone numbers to E.164 format (+91XXXXXXXXXX)
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!phone) return null;

  // Remove whitespace, dashes, brackets
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // E.164 format check (+91XXXXXXXXXX)
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // 91XXXXXXXXXX (without +)
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // 10-digit Indian mobile starting with 6, 7, 8, 9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // 11-digit leading 0 (09XXXXXXXXX)
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned.slice(1)}`;
  }

  // International format fallback (+ followed by 10 to 15 digits)
  if (/^\+[1-9]\d{9,14}$/.test(cleaned)) {
    return cleaned;
  }

  return null; // Invalid number
}

export function isValidPhoneNumber(phone: string): boolean {
  return normalizePhoneNumber(phone) !== null;
}
