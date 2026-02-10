import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Retorna apenas dígitos de uma string
export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D+/g, '');
}

// Máscara de CNPJ: 00.000.000/0000-00
export function maskCNPJ(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function formatCNPJ(value: string | null | undefined): string {
  const digits = onlyDigits(value ?? '');
  if (!digits) return '';
  return maskCNPJ(digits);
}

// Máscara de CPF: 000.000.000-00
export function maskCPF(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatCPF(value: string | null | undefined): string {
  const digits = onlyDigits(value ?? '');
  if (!digits) return '';
  return maskCPF(digits);
}

// Máscara que aceita CPF ou CNPJ automaticamente
export function maskCpfCnpj(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length <= 11) return maskCPF(digits);
  return maskCNPJ(digits);
}

export function formatCpfCnpj(value: string | null | undefined): string {
  const digits = onlyDigits(value ?? '');
  if (!digits) return '';
  if (digits.length <= 11) return maskCPF(digits);
  return maskCNPJ(digits);
}

// Formata número para moeda BRL (R$ 1.234,56) a partir de string ou número
export function maskBRL(input: string | number | null | undefined): string {
  const digits = onlyDigits(String(input ?? ''));
  if (!digits) return '';
  const cents = digits.padStart(3, '0');
  const intPart = cents.slice(0, -2);
  const decPart = cents.slice(-2);
  const n = Number(intPart + '.' + decPart);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

// Converte string formatada BRL para número (ex.: "R$ 1.234,56" -> 1234.56)
export function parseBRLToNumber(value: string | null | undefined): number {
  const digits = onlyDigits(value ?? '');
  if (!digits) return 0;
  const cents = digits.padStart(3, '0');
  const intPart = cents.slice(0, -2);
  const decPart = cents.slice(-2);
  return Number(intPart + '.' + decPart);
}
