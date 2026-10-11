'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import { MasterSelect, type MasterItem } from '@/components/common/MasterSelect';
import { formatCurrency } from '@/shared/lib/format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ShieldCheck, Plus, Trash2, Edit3, ArrowUp, ArrowDown, Layers } from 'lucide-react';

interface TierLevelDto {
  id: string;
  levelNo: number;
  positionId: string;
  position: { id: string; name: string; rank: number };
}

interface TierDto {
  id: string;
  name: string;
  forAfce: boolean;
  forArSupplement: boolean;
  minAmount: string | number;
  maxAmount: string | number | null;
  isActive: boolean;
  levels: TierLevelDto[];
}

export function ApprovalMatrixManager() {
  const queryClient = useQueryClient();

  // Create / Edit Tier Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [forAfce, setForAfce] = useState(true);
  const [forArSupplement, setForArSupplement] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [levels, setLevels] = useState<Array<{ levelNo: number; positionId: string; positionName?: string }>>([
    { levelNo: 1, positionId: '' },
  ]);

  // Fetch Tiers
  const { data: tiers = [], isLoading } = useQuery<TierDto[]>({
    queryKey: ['approval-tiers'],
    queryFn: async () => {
      const res = await fetch('/api/approval-tiers');
      if (!res.ok) throw new Error('Gagal memuat matriks approval');
      const json = await res.json();
      return json.data || [];
    },
  });

  const handleOpenCreate = () => {
    setEditingTierId(null);
    setName('');
    setMinAmount('');
    setMaxAmount('');
    setForAfce(true);
    setForArSupplement(true);
    setIsActive(true);
    setLevels([{ levelNo: 1, positionId: '' }]);
    setModalOpen(true);
  };

  const handleOpenEdit = (tier: TierDto) => {
    setEditingTierId(tier.id);
    setName(tier.name);
    setMinAmount(String(tier.minAmount));
    setMaxAmount(tier.maxAmount ? String(tier.maxAmount) : '');
    setForAfce(tier.forAfce);
    setForArSupplement(tier.forArSupplement);
    setIsActive(tier.isActive);
    setLevels(
      tier.levels.map((lvl) => ({
        levelNo: lvl.levelNo,
        positionId: lvl.positionId,
        positionName: lvl.position.name,
      }))
    );
    setModalOpen(true);
  };

  const handleAddLevel = () => {
    setLevels((prev) => [
      ...prev,
      { levelNo: prev.length + 1, positionId: '' },
    ]);
  };

  const handleRemoveLevel = (index: number) => {
    if (levels.length <= 1) {
      toast.warning('Minimal harus ada 1 level approval');
      return;
    }
    const next = levels
      .filter((_, idx) => idx !== index)
      .map((l, idx) => ({ ...l, levelNo: idx + 1 }));
    setLevels(next);
  };

  const handleLevelPositionChange = (index: number, positionId: string, item?: MasterItem) => {
    setLevels((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index]!,
        positionId,
        positionName: item?.name,
      };
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Nama tier matriks wajib diisi');
      if (minAmount === '') throw new Error('Batas bawah nominal (min) wajib diisi');
      if (maxAmount !== '' && Number(minAmount) >= Number(maxAmount)) {
        throw new Error('Batas bawah harus lebih kecil dari batas atas');
      }
      if (levels.some((l) => !l.positionId)) {
        throw new Error('Seluruh level harus memiliki jabatan approver yang dipilih');
      }

      // Check duplicates
      const posIds = levels.map((l) => l.positionId);
      if (new Set(posIds).size !== posIds.length) {
        throw new Error('Jabatan approver tidak boleh duplikat dalam satu tier');
      }

      const payload = {
        name: name.trim(),
        forAfce,
        forArSupplement,
        minAmount: Number(minAmount),
        maxAmount: maxAmount ? Number(maxAmount) : null,
        isActive,
        levels: levels.map((l, idx) => ({
          levelNo: idx + 1,
          positionId: l.positionId,
        })),
      };

      const url = editingTierId ? `/api/approval-tiers/${editingTierId}` : '/api/approval-tiers';
      const method = editingTierId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal menyimpan tier');
      return json.data;
    },
    onSuccess: () => {
      toast.success(
        editingTierId
          ? 'Tier matriks approval berhasil diperbarui!'
          : 'Tier matriks approval baru berhasil ditambahkan!'
      );
      queryClient.invalidateQueries({ queryKey: ['approval-tiers'] });
      setModalOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-[#0f2c59]" />
            Konfigurasi Matriks Approval SAP (F2)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pengaturan tier hierarki persetujuan bertingkat berdasarkan ambang nominal transaksi
            AFCE dan AR Suplemen.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-[#0f2c59] hover:bg-[#163a70] text-white text-xs gap-2"
        >
          <Plus className="h-4 w-4" /> Tambah Tier Baru
        </Button>
      </div>

      {/* Tier Table Card */}
      <Card className="p-4 bg-white border-slate-200 shadow-2xs">
        {isLoading ? (
          <p className="text-xs text-slate-500 py-4 text-center">Memuat matriks approval...</p>
        ) : tiers.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            Belum ada tier matriks approval yang dikonfigurasi.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-compact text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th>Nama Tier</th>
                  <th>Lingkup</th>
                  <th>Rentang Nilai Transaksi</th>
                  <th>Urutan Level Approval SAP</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tiers.map((tier) => (
                  <tr key={tier.id} className="hover:bg-slate-50/50">
                    <td className="font-semibold text-slate-900">{tier.name}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {tier.forAfce && (
                          <span className="bg-blue-50 text-[#0f2c59] border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            AFCE
                          </span>
                        )}
                        {tier.forArSupplement && (
                          <span className="bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            AR
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono font-medium text-slate-800">
                        {formatCurrency(tier.minAmount)} s.d.{' '}
                        {tier.maxAmount ? formatCurrency(tier.maxAmount) : 'Tak Terbatas'}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {tier.levels.map((lvl, idx) => (
                          <React.Fragment key={lvl.id}>
                            <span className="bg-slate-100 border border-slate-300 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                              L{lvl.levelNo}: <strong>{lvl.position.name}</strong>
                            </span>
                            {idx < tier.levels.length - 1 && (
                              <span className="text-slate-400 text-[10px]">&rarr;</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tier.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {tier.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(tier)}
                        className="h-7 text-xs text-[#0f2c59] hover:bg-slate-100"
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Dialog Form Tier */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTierId ? 'Edit Tier Matriks Approval' : 'Tambah Tier Matriks Approval Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Konfigurasi rentang nominal transaksi dan susunan hierarki level approver SAP.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4 pt-2 text-xs"
          >
            <div className="space-y-1.5">
              <Label htmlFor="tier-name">Nama Tier *</Label>
              <Input
                id="tier-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. Tier Sedang (500 Jt - 2 Miliar)"
                required
                disabled={saveMutation.isPending}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tier-min">Batas Bawah Nominal (Min) *</Label>
                <CurrencyInput
                  id="tier-min"
                  value={minAmount}
                  onChange={setMinAmount}
                  placeholder="0"
                  required
                  disabled={saveMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tier-max">Batas Atas Nominal (Kosongkan bila tak terhingga)</Label>
                <CurrencyInput
                  id="tier-max"
                  value={maxAmount}
                  onChange={setMaxAmount}
                  placeholder="Tak terhingga"
                  disabled={saveMutation.isPending}
                />
              </div>
            </div>

            {/* Checkboxes Scope */}
            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forAfce}
                  onChange={(e) => setForAfce(e.target.checked)}
                  disabled={saveMutation.isPending}
                  className="rounded border-slate-300 text-[#0f2c59] focus:ring-[#0f2c59]"
                />
                <span className="font-semibold text-slate-800">Berlaku untuk AFCE</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forArSupplement}
                  onChange={(e) => setForArSupplement(e.target.checked)}
                  disabled={saveMutation.isPending}
                  className="rounded border-slate-300 text-[#0f2c59] focus:ring-[#0f2c59]"
                />
                <span className="font-semibold text-slate-800">Berlaku untuk AR Suplemen</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={saveMutation.isPending}
                  className="rounded border-slate-300 text-[#0f2c59] focus:ring-[#0f2c59]"
                />
                <span className="font-semibold text-slate-800">Status Aktif</span>
              </label>
            </div>

            {/* Level Sequence Builder */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label>Urutan Jabatan Approver SAP (Level 1..N) *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLevel}
                  disabled={saveMutation.isPending}
                  className="h-7 text-[11px] gap-1"
                >
                  <Plus className="h-3 w-3" /> Tambah Level
                </Button>
              </div>

              <div className="space-y-2">
                {levels.map((lvl, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-16 font-bold text-slate-600 shrink-0">
                      Level {idx + 1}:
                    </span>
                    <div className="flex-1">
                      <MasterSelect
                        masterType="approval-positions"
                        value={lvl.positionId}
                        onChange={(posId, item) => handleLevelPositionChange(idx, posId, item)}
                        placeholder="-- Pilih Jabatan Approver --"
                        disabled={saveMutation.isPending}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLevel(idx)}
                      disabled={saveMutation.isPending}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={saveMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-[#0f2c59] hover:bg-[#163a70] text-white"
              >
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi Tier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
