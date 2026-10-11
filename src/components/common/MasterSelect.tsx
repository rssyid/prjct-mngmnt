'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';

export interface MasterItem {
  id: string;
  name?: string;
  code?: string;
  title?: string;
  [key: string]: unknown;
}

interface MasterSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  masterType: string;
  queryParams?: Record<string, string | number | boolean | null | undefined>;
  value?: string;
  onChange?: (value: string, item?: MasterItem) => void;
  placeholder?: string;
  formatLabel?: (item: MasterItem) => string;
}

export function MasterSelect({
  masterType,
  queryParams,
  value,
  onChange,
  placeholder = '-- Pilih --',
  formatLabel,
  disabled,
  className = '',
  ...props
}: MasterSelectProps) {
  // Build query string
  const queryString = React.useMemo(() => {
    if (!queryParams) return '';
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.append(k, String(v));
      }
    });
    const str = params.toString();
    return str ? `?${str}` : '';
  }, [queryParams]);

  const { data: items = [], isLoading, isError } = useQuery<MasterItem[]>({
    queryKey: ['master', masterType, queryString],
    queryFn: async () => {
      const res = await fetch(`/api/master/${masterType}${queryString}`);
      if (!res.ok) throw new Error('Gagal memuat master data');
      const json = await res.json();
      return json.data || [];
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const item = items.find((it) => it.id === selectedId);
    onChange?.(selectedId, item);
  };

  const defaultFormatLabel = (item: MasterItem) => {
    if (item.code && item.name) return `${item.name} (${item.code})`;
    return (item.name || item.code || item.title || item.id) as string;
  };

  const labelFn = formatLabel || defaultFormatLabel;

  return (
    <select
      value={value || ''}
      onChange={handleChange}
      disabled={disabled || isLoading}
      className={`w-full border border-slate-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59] disabled:bg-slate-100 disabled:text-slate-400 ${className}`}
      {...props}
    >
      <option value="">
        {isLoading ? 'Memuat opsi...' : isError ? 'Gagal memuat opsi' : placeholder}
      </option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {labelFn(item)}
        </option>
      ))}
    </select>
  );
}
