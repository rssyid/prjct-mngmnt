'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import { formatCurrency } from '@/shared/lib/format';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Lock } from 'lucide-react';

export interface BoqItemRow {
  id?: string;
  lineNo: number;
  buildingName?: string | null;
  activityName: string;
  amount: number | string;
  notes?: string | null;
}

interface AfceBoqEditorProps {
  afceAttemptId: string;
  initialItems: BoqItemRow[];
  isDraft: boolean;
  canMutate: boolean;
  version: number;
}

export function AfceBoqEditor({
  afceAttemptId,
  initialItems,
  isDraft,
  canMutate,
  version,
}: AfceBoqEditorProps) {
  const queryClient = useQueryClient();
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  const [items, setItems] = useState<BoqItemRow[]>(() => {
    if (initialItems && initialItems.length > 0) return initialItems;
    return [{ lineNo: 1, activityName: '', amount: '', buildingName: '', notes: '' }];
  });

  if (prevInitialItems !== initialItems) {
    setPrevInitialItems(initialItems);
    setItems(
      initialItems && initialItems.length > 0
        ? initialItems
        : [{ lineNo: 1, activityName: '', amount: '', buildingName: '', notes: '' }]
    );
  }

  const totalAmount = React.useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [items]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        lineNo: prev.length + 1,
        activityName: '',
        amount: '',
        buildingName: '',
        notes: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.warning('Minimal harus ada 1 baris kegiatan pada BOQ');
      return;
    }
    const next = items.filter((_, idx) => idx !== index).map((it, idx) => ({
      ...it,
      lineNo: idx + 1,
    }));
    setItems(next);
  };

  const handleUpdateItem = (index: number, field: keyof BoqItemRow, val: unknown) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [field]: val };
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validasi baris
      for (const it of items) {
        if (!it.activityName.trim()) {
          throw new Error(`Nama kegiatan pada baris #${it.lineNo} wajib diisi`);
        }
        const num = Number(it.amount);
        if (isNaN(num) || num <= 0) {
          throw new Error(`Harga pada baris #${it.lineNo} harus lebih besar dari 0`);
        }
      }

      const payload = {
        items: items.map((it, idx) => ({
          lineNo: idx + 1,
          buildingName: it.buildingName?.trim() || null,
          activityName: it.activityName.trim(),
          amount: Number(it.amount),
          notes: it.notes?.trim() || null,
        })),
        version,
      };

      const res = await fetch(`/api/afce-attempts/${afceAttemptId}/boq`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal menyimpan item BOQ');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Rincian BOQ berhasil diperbarui!');
      queryClient.invalidateQueries({ queryKey: ['afce-attempts'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isEditable = isDraft && canMutate;

  return (
    <Card className="p-5 bg-white border-slate-200 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Rincian Bill of Quantities (BOQ)</h4>
          <p className="text-xs text-slate-500">
            Daftar kegiatan pekerjaan fisik dan total harga dasar acuan AFCE.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Total Nilai BOQ:</span>
            <span className="text-sm font-black text-[#0f2c59]">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          {isEditable && (
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-[#0f2c59] hover:bg-[#163a70] text-white text-xs gap-1.5 h-8"
            >
              <Save className="h-3.5 w-3.5" />
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan BOQ'}
            </Button>
          )}
        </div>
      </div>

      {/* BOQ Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-compact text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <th className="w-12 text-center">No</th>
              <th>Nama Kegiatan / Pekerjaan *</th>
              <th className="w-48">Bangunan / Lokasi</th>
              <th className="w-44 text-right">Total Harga (Rp) *</th>
              <th className="w-48">Keterangan</th>
              {isEditable && <th className="w-12 text-center">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="text-center font-medium text-slate-500">{idx + 1}</td>
                <td>
                  {isEditable ? (
                    <Input
                      value={it.activityName}
                      onChange={(e) => handleUpdateItem(idx, 'activityName', e.target.value)}
                      placeholder="mis. Cuci Parit Primer 2.500 m"
                      className="h-8 text-xs"
                      required
                    />
                  ) : (
                    <span className="font-medium text-slate-800">{it.activityName}</span>
                  )}
                </td>
                <td>
                  {isEditable ? (
                    <Input
                      value={it.buildingName || ''}
                      onChange={(e) => handleUpdateItem(idx, 'buildingName', e.target.value)}
                      placeholder="mis. Tanggul Blok B"
                      className="h-8 text-xs"
                    />
                  ) : (
                    <span className="text-slate-600">{it.buildingName || '-'}</span>
                  )}
                </td>
                <td className="text-right">
                  {isEditable ? (
                    <CurrencyInput
                      value={it.amount}
                      onChange={(val) => handleUpdateItem(idx, 'amount', val)}
                      placeholder="0"
                      className="h-8 text-xs text-right"
                    />
                  ) : (
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(it.amount)}
                    </span>
                  )}
                </td>
                <td>
                  {isEditable ? (
                    <Input
                      value={it.notes || ''}
                      onChange={(e) => handleUpdateItem(idx, 'notes', e.target.value)}
                      placeholder="Catatan..."
                      className="h-8 text-xs"
                    />
                  ) : (
                    <span className="text-slate-500">{it.notes || '-'}</span>
                  )}
                </td>
                {isEditable && (
                  <td className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(idx)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditable && (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="text-xs gap-1.5 h-8 border-dashed border-slate-300 text-slate-600 hover:text-slate-900"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Baris Kegiatan
          </Button>
        </div>
      )}

      {!isEditable && !isDraft && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-50 p-2 rounded">
          <Lock className="h-3.5 w-3.5" /> Rincian BOQ telah dikunci karena dokumen AFCE sudah diajukan / disetujui.
        </div>
      )}
    </Card>
  );
}
