"use client";

import React, { useState, useEffect } from 'react';
import { parseCurrency, formatCurrencyDisplay } from '@/lib/utils/currency';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  value: string;
  onChange: (val: string) => void; // formatted string (ex: "1.234,56")
  placeholder?: string;
};

export default function CurrencyInput({ value, onChange, className = '', placeholder, ...rest }: Props) {
  const [display, setDisplay] = useState<string>(value || '');

  useEffect(() => {
    setDisplay(value ?? '');
  }, [value]);

  function handleFocus() {
    // show plain number without formatting on focus
    const num = parseCurrency(display);
    setDisplay(num ? String(num).replace('.', ',') : '');
  }

  function handleBlur() {
    const num = parseCurrency(display);
    setDisplay(num ? formatCurrencyDisplay(num) : '');
    onChange(num ? formatCurrencyDisplay(num) : '');
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // allow digits, dot, comma
    const raw = e.target.value.replace(/[^0-9,\.\sR\$]/g, '');
    setDisplay(raw);
    // do not call onChange here to avoid heavy formatting on every keystroke
  }

  return (
    <input
      {...rest}
      inputMode="numeric"
      className={className}
      value={display}
      placeholder={placeholder}
      onFocus={() => handleFocus()}
      onBlur={() => handleBlur()}
      onChange={handleChange}
    />
  );
}
