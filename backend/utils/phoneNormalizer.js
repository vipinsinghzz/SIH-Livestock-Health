/**
 * Deterministic Phone & Email Normalizer Utility
 * File: backend/utils/phoneNormalizer.js
 * 
 * Guarantees that mobile numbers entered during Registration and Login
 * resolve to the exact same canonical 10-digit Indian phone number and
 * deterministic internal email address.
 */

/**
 * Normalizes an Indian mobile phone number to a clean 10-digit string.
 * Handles formats: +919822011223, 919822011223, 09822011223, 98220-11223, 98220 11223.
 * 
 * @param {string} phone 
 * @returns {string} 10-digit normalized phone number, or empty string if invalid
 */
function normalizeIndianPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Returns the canonical deterministic email for a farmer registered by phone.
 * Example: '9822011223' -> 'farmer_9822011223@livestocksathi.in'
 * 
 * @param {string} phone 
 * @returns {string} Canonical internal email
 */
function getDeterministicInternalEmail(phone) {
  const normPhone = normalizeIndianPhone(phone);
  if (!normPhone) return '';
  return `farmer_${normPhone}@livestocksathi.in`;
}

/**
 * Parses and categorizes an incoming login identifier (email or mobile).
 * 
 * @param {string} identifier 
 * @returns {{ isEmail: boolean, email: string|null, phone: string|null, deterministicEmail: string|null }}
 */
function parseLoginIdentifier(identifier) {
  if (!identifier) {
    return { isEmail: false, email: null, phone: null, deterministicEmail: null };
  }

  const raw = String(identifier).trim();
  if (raw.includes('@')) {
    return {
      isEmail: true,
      email: raw.toLowerCase(),
      phone: null,
      deterministicEmail: null
    };
  }

  const normPhone = normalizeIndianPhone(raw);
  return {
    isEmail: false,
    email: null,
    phone: normPhone,
    deterministicEmail: normPhone ? `farmer_${normPhone}@livestocksathi.in` : null
  };
}

/**
 * Generates an array of phone variants for robust database querying across
 * historical format differences (+91, 91, 0, plain 10 digits).
 * 
 * @param {string} phone 
 * @returns {string[]} Unique phone strings
 */
function getPhoneVariants(phone) {
  const raw = String(phone || '').trim();
  const digits = raw.replace(/\D/g, '');
  const variants = new Set();

  if (raw) variants.add(raw);
  if (digits) variants.add(digits);

  const tenDigits = normalizeIndianPhone(digits);
  if (tenDigits.length === 10) {
    variants.add(tenDigits);
    variants.add(`+91${tenDigits}`);
    variants.add(`91${tenDigits}`);
    variants.add(`0${tenDigits}`);
  }

  return Array.from(variants);
}

module.exports = {
  normalizeIndianPhone,
  getDeterministicInternalEmail,
  parseLoginIdentifier,
  getPhoneVariants
};
