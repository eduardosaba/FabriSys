'use client';

import React, { useState, useEffect } from 'react';

interface BRLCurrencyInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function formatBRL(val: number): string {
  if (val === 0 || !val || isNaN(val)) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
}

export default function BRLCurrencyInput({
  value,
  onChange,
  className = '',
  placeholder = 'R$ 0,00',
  disabled = false,
  id,
  name,
}: BRLCurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('');

  useEffect(() => {
    if (value === 0 || value === null || value === undefined || isNaN(value)) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatBRL(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');

    if (!digits) {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const numberValue = parseInt(digits, 10) / 100;
    setDisplayValue(formatBRL(numberValue));
    onChange(numberValue);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      id={id}
      name={name}
      disabled={disabled}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
