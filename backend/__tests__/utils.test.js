const { normalizeDni, normalizeText, normalizeDate, normalizePhone } = require('../utils/normalize');
const { isValidDni, isValidName, isValidAge } = require('../utils/validators');

describe('Utilities Tests', () => {
  describe('normalizeDni', () => {
    test('should normalize DNI with dots and spaces', () => {
      expect(normalizeDni('12.345.678 ')).toBe('12345678');
    });

    test('should replace letters O and I with numbers', () => {
      expect(normalizeDni('1234567O')).toBe('12345670');
      expect(normalizeDni('1234567o')).toBe('12345670');
      expect(normalizeDni('1234567I')).toBe('12345671');
      expect(normalizeDni('1234567i')).toBe('12345671');
    });

    test('should remove non-numeric characters', () => {
      expect(normalizeDni('12-345-678X')).toBe('12345678');
    });

    test('should pad 7 digits with a leading zero', () => {
      expect(normalizeDni('1234567')).toBe('01234567');
    });

    test('should take last 8 digits if longer', () => {
      expect(normalizeDni('123456789')).toBe('23456789');
    });

    test('should return null for invalid length or empty input', () => {
      expect(normalizeDni('123456')).toBeNull();
      expect(normalizeDni('')).toBeNull();
      expect(normalizeDni(null)).toBeNull();
    });
  });

  describe('normalizeText', () => {
    test('should remove accents and extra spaces', () => {
      expect(normalizeText('  HOSPITAL  REGIONAL   MÁXIMO  ')).toBe('HOSPITAL REGIONAL MAXIMO');
    });

    test('should handle multi-line text and special characters', () => {
      expect(normalizeText('Línea 1\nLínea 2')).toBe('Linea 1 Linea 2');
    });

    test('should return null for empty input', () => {
      expect(normalizeText('')).toBeNull();
      expect(normalizeText(null)).toBeNull();
    });
  });

  describe('normalizeDate', () => {
    test('should parse dd/mm/yyyy format', () => {
      const date = normalizeDate('15/05/2026');
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(4); // May is 4
      expect(date.getUTCDate()).toBe(15);
    });

    test('should parse yyyy-mm-dd format', () => {
      const date = normalizeDate('2026-05-15');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(4);
    });

    test('should parse Excel numeric dates', () => {
      // 46158 is approx 2026-05-15 (depending on leap year handling in Excel)
      const date = normalizeDate(46158); 
      expect(date.getFullYear()).toBe(2026);
    });

    test('should parse month-year format (ene-26)', () => {
      const date = normalizeDate('ene-26');
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(0); // January
    });

    test('should return null for non-date strings or invalid years', () => {
      expect(normalizeDate('BIOPSIA')).toBeNull();
      expect(normalizeDate('15/05/1850')).toBeNull();
      expect(normalizeDate('15/05/2200')).toBeNull();
    });
  });

  describe('normalizePhone', () => {
    test('should remove spaces, dashes, and parentheses', () => {
      expect(normalizePhone('(01) 234-5678')).toBe('012345678');
    });

    test('should handle dots', () => {
      expect(normalizePhone('987.654.321')).toBe('987654321');
    });

    test('should return null for empty input', () => {
      expect(normalizePhone('')).toBeNull();
      expect(normalizePhone(null)).toBeNull();
    });
  });

  describe('validators', () => {
    test('isValidDni should validate 8 digits', () => {
      expect(isValidDni('12345678')).toBe(true);
      expect(isValidDni('1234567')).toBe(false);
      expect(isValidDni('123456789')).toBe(false);
    });

    test('isValidName should reject names in INVALID_NAMES', () => {
      expect(isValidName('ENERO')).toBe(false);
      expect(isValidName('FEBRERO')).toBe(false);
      expect(isValidName('JUAN PEREZ')).toBe(true);
    });

    test('isValidAge should validate range 0-120', () => {
      expect(isValidAge(25)).toBe(true);
      expect(isValidAge(-1)).toBe(false);
      expect(isValidAge(150)).toBe(false);
    });
  });
});
