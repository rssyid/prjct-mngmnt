'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, Plus, Trash2 } from 'lucide-react';

export interface SelectedEstateItem {
  estateId: string;
  estateName?: string;
  estateCode?: string;
  isPrimary: boolean;
  blockIds?: string[];
}

interface ChainedLocationSelectProps {
  companyId: string;
  value: SelectedEstateItem[];
  onChange: (estates: SelectedEstateItem[]) => void;
  disabled?: boolean;
}

interface EstateDto {
  id: string;
  name: string;
  code: string;
  companyId: string;
  wilayah?: { name: string; region?: { name: string } };
}

export function ChainedLocationSelect({
  companyId,
  value,
  onChange,
  disabled = false,
}: ChainedLocationSelectProps) {
  // Fetch estates for the company
  const { data: companyEstates = [], isLoading } = useQuery<EstateDto[]>({
    queryKey: ['master', 'estates', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await fetch(`/api/master/estates?companyId=${companyId}&active=true`);
      if (!res.ok) throw new Error('Gagal memuat estate');
      const json = await res.json();
      return json.data || [];
    },
    enabled: Boolean(companyId),
  });

  const handleAddEstate = (estateId: string) => {
    if (!estateId) return;
    if (value.some((v) => v.estateId === estateId)) return;
    const est = companyEstates.find((e) => e.id === estateId);
    const isFirst = value.length === 0;
    const next: SelectedEstateItem[] = [
      ...value,
      {
        estateId,
        estateName: est?.name,
        estateCode: est?.code,
        isPrimary: isFirst, // First added estate is primary by default
      },
    ];
    onChange(next);
  };

  const handleRemoveEstate = (estateId: string) => {
    const next = value.filter((v) => v.estateId !== estateId);
    // If the removed estate was primary, make the first one primary
    if (next.length > 0 && !next.some((v) => v.isPrimary)) {
      next[0]!.isPrimary = true;
    }
    onChange(next);
  };

  const handleSetPrimary = (estateId: string) => {
    const next = value.map((v) => ({
      ...v,
      isPrimary: v.estateId === estateId,
    }));
    onChange(next);
  };

  if (!companyId) {
    return (
      <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-md text-xs text-slate-500">
        Pilih Company (PT) terlebih dahulu untuk memuat daftar Estate yang sah.
      </div>
    );
  }

  // Available estates not yet selected
  const availableEstates = companyEstates.filter(
    (e) => !value.some((v) => v.estateId === e.id)
  );

  return (
    <div className="space-y-3">
      {/* Selected Estates List */}
      <div className="space-y-2">
        {value.length === 0 && (
          <p className="text-xs text-amber-600 font-medium">
            Wajib memilih minimal satu Estate sebagai Estate Utama proyek.
          </p>
        )}
        {value.map((item) => (
          <div
            key={item.estateId}
            className={`flex items-center justify-between p-2.5 rounded-md border text-xs transition-colors ${
              item.isPrimary
                ? 'bg-blue-50/70 border-blue-300 text-blue-950 font-medium'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {item.estateName || item.estateCode || item.estateId}
              </span>
              {item.isPrimary ? (
                <span className="bg-[#0f2c59] text-white px-2 py-0.5 rounded text-[10px] font-bold">
                  Utama
                </span>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetPrimary(item.estateId)}
                  disabled={disabled}
                  className="h-6 text-[10px] text-slate-500 hover:text-slate-900"
                >
                  Jadikan Utama
                </Button>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveEstate(item.estateId)}
              disabled={disabled}
              className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add Estate Picker */}
      {availableEstates.length > 0 && (
        <div className="flex gap-2">
          <select
            id="estate-picker-select"
            aria-label="Pilih Estate untuk ditambahkan"
            disabled={disabled || isLoading}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handleAddEstate(e.target.value);
                e.target.value = '';
              }
            }}
            className="flex-1 border border-slate-300 rounded-md p-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
          >
            <option value="">+ Tambah Estate...</option>
            {availableEstates.map((est) => (
              <option key={est.id} value={est.id}>
                {est.name} ({est.code})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
