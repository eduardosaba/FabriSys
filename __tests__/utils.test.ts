import { describe, it, expect } from 'vitest';
import { cn, onlyDigits, maskCNPJ, formatCNPJ, maskBRL, parseBRLToNumber } from '../lib/utils';

describe('Utils functions', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
    });

    it('should merge conflicting Tailwind classes', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });
  });

  describe('onlyDigits', () => {
    it('should return only digits from string', () => {
      expect(onlyDigits('abc123def456')).toBe('123456');
    });

    it('should handle null and undefined', () => {
      expect(onlyDigits(null)).toBe('');
      expect(onlyDigits(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(onlyDigits('')).toBe('');
    });

    it('should handle string with only letters', () => {
      expect(onlyDigits('abcdef')).toBe('');
    });
  });

  describe('maskCNPJ', () => {
    it('should format CNPJ correctly', () => {
      expect(maskCNPJ('12345678000195')).toBe('12.345.678/0001-95');
    });

    it('should handle partial CNPJ', () => {
      expect(maskCNPJ('12')).toBe('12');
      expect(maskCNPJ('12345')).toBe('12.345');
      expect(maskCNPJ('12345678')).toBe('12.345.678');
      expect(maskCNPJ('123456780001')).toBe('12.345.678/0001');
    });

    it('should limit to 14 digits', () => {
      expect(maskCNPJ('12345678000195123')).toBe('12.345.678/0001-95');
    });
  });

  describe('formatCNPJ', () => {
    it('should format CNPJ from string', () => {
      expect(formatCNPJ('12345678000195')).toBe('12.345.678/0001-95');
    });

    it('should handle null and undefined', () => {
      expect(formatCNPJ(null)).toBe('');
      expect(formatCNPJ(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(formatCNPJ('')).toBe('');
    });
  });

  describe('maskBRL', () => {
    it('should format number to BRL currency', () => {
      const result = maskBRL(1234.56);
      expect(result).toContain('R$');
      expect(result).toContain('1.234,56');
    });

    it('should format string to BRL currency', () => {
      const result = maskBRL('1234.56');
      expect(result).toContain('R$');
      expect(result).toContain('1.234,56');
    });

    it('should handle null and undefined', () => {
      expect(maskBRL(null)).toBe('');
      expect(maskBRL(undefined)).toBe('');
    });

    it('should handle zero', () => {
      const result = maskBRL(0);
      expect(result).toContain('R$');
      expect(result).toContain('0,00');
    });

    it('should handle large numbers', () => {
      const result = maskBRL(1234567.89);
      expect(result).toContain('R$');
      expect(result).toContain('1.234.567,89');
    });
  });

  describe('parseBRLToNumber', () => {
    it('should parse BRL string to number', () => {
      expect(parseBRLToNumber('R$ 1.234,56')).toBe(1234.56);
    });

    it('should handle plain number string', () => {
      expect(parseBRLToNumber('123456')).toBe(1234.56);
    });

    it('should handle null and undefined', () => {
      expect(parseBRLToNumber(null)).toBe(0);
      expect(parseBRLToNumber(undefined)).toBe(0);
    });

    it('should handle empty string', () => {
      expect(parseBRLToNumber('')).toBe(0);
    });
  });
});
