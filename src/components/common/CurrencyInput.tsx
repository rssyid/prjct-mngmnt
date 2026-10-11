'use client';

import React from 'react';
import { Input } from '@/components/ui/input';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: string | number;
  onChange?: (val: string) => void;
  prefix?: string;
}

export function CurrencyInput({
  value = '',
  onChange,
  prefix = 'Rp',
  className = '',
  disabled,
  ...props
}: CurrencyInputProps) {
  // Format numeric string to thousand separators (e.g. 1.250.000.000)
  const formatDisplay = (val: string | number) => {
    if (!val && val !== 0) return '';
    const clean = String(val).replace(/\D/g, '');
    if (!clean) return '';
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const displayValue = formatDisplay(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleanNumbers = raw.replace(/\D/g, '');
    onChange?.(cleanNumbers);
  };

  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-xs font-semibold text-slate-500 pointer-events-none">
          {prefix}
        </span>
      )}
      <Input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        className={`${prefix ? 'pl-9' : ''} ${className}`}
        {...props}
      />
    </div>
  );
}
