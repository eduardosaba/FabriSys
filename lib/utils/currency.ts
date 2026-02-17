export function parseCurrency(value: string | number): number {
  if (value == null) return 0;
  const s = String(value);
  const cleaned = s.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export function formatCurrencyDisplay(value: string | number): string {
  const num = typeof value === 'number' ? value : parseCurrency(value);
  if (!isFinite(num)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

export function formatCurrencyPlain(value: string | number): string {
  const num = typeof value === 'number' ? value : parseCurrency(value);
  if (!isFinite(num)) return '';
  // retorna sem símbolo, com separador de milhares e vírgula decimal
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
