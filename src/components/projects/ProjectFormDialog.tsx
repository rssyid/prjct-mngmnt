'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MasterSelect } from '@/components/common/MasterSelect';
import { ChainedLocationSelect, type SelectedEstateItem } from '@/components/common/ChainedLocationSelect';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import { toast } from 'sonner';

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  onSuccess?: (newProject: { id: string; code: string }) => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  currentUserId,
  onSuccess,
}: ProjectFormDialogProps) {
  const queryClient = useQueryClient();

  // Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [selectedEstates, setSelectedEstates] = useState<SelectedEstateItem[]>([]);
  const [targetStartDate, setTargetStartDate] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [plannedBudget, setPlannedBudget] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when company changes
  const handleCompanyChange = (newCompanyId: string) => {
    setCompanyId(newCompanyId);
    setSelectedEstates([]); // Clear estates because they must belong to selected company (Rule 10)
  };

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      // Validasi
      if (!name.trim()) throw new Error('Nama proyek wajib diisi');
      if (!companyId) throw new Error('Company (PT) wajib dipilih');
      if (!categoryId) throw new Error('Kategori proyek wajib dipilih');
      if (selectedEstates.length === 0) throw new Error('Minimal satu Estate wajib dipilih');
      if (!selectedEstates.some((e) => e.isPrimary)) {
        throw new Error('Tepat satu Estate harus dipilih sebagai Estate Utama');
      }
      if (!targetStartDate) throw new Error('Target tanggal mulai wajib diisi');
      if (!targetEndDate) throw new Error('Target tanggal selesai wajib diisi');
      if (targetStartDate > targetEndDate) {
        throw new Error('Target tanggal mulai tidak boleh melebihi target tanggal selesai');
      }

      const payload = {
        name: name.trim(),
        companyId,
        categoryId,
        picUserId: currentUserId || null,
        targetStartDate,
        targetEndDate,
        plannedBudget: plannedBudget ? Number(plannedBudget) : 0,
        notes: notes.trim() || null,
        estates: selectedEstates.map((e) => ({
          estateId: e.estateId,
          isPrimary: e.isPrimary,
          blockIds: e.blockIds || [],
        })),
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal membuat proyek');
      }
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(`Proyek berhasil dibuat dengan kode ${data.code}!`);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Reset form
      setName('');
      setCategoryId('');
      setCompanyId('');
      setSelectedEstates([]);
      setTargetStartDate('');
      setTargetEndDate('');
      setPlannedBudget('');
      setNotes('');
      onOpenChange(false);
      onSuccess?.(data);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Proyek Water Management Baru</DialogTitle>
          <DialogDescription>
            Isi formulir data proyek awal. Kode proyek unik akan digenerate otomatis oleh sistem
            berdasarkan counter perusahaan (WM-[Company]-[YYYY]-[SEQ4]).
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createProjectMutation.mutate();
          }}
          className="space-y-4 pt-2 text-xs"
        >
          {/* Nama Proyek */}
          <div className="space-y-1.5">
            <Label htmlFor="create-proj-name">Nama Proyek *</Label>
            <Input
              id="create-proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Rehabilitasi Saluran Drainase & Tanggul Blok A-B"
              required
              disabled={createProjectMutation.isPending}
            />
          </div>

          {/* Company & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-proj-company">Company (PT) *</Label>
              <MasterSelect
                id="create-proj-company"
                masterType="companies"
                queryParams={{ active: true }}
                value={companyId}
                onChange={handleCompanyChange}
                placeholder="-- Pilih Company --"
                disabled={createProjectMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-proj-cat">Kategori Proyek *</Label>
              <MasterSelect
                id="create-proj-cat"
                masterType="project-categories"
                queryParams={{ active: true }}
                value={categoryId}
                onChange={(val) => setCategoryId(val)}
                placeholder="-- Pilih Kategori --"
                disabled={createProjectMutation.isPending}
              />
            </div>
          </div>

          {/* Multi Estate Selector */}
          <div className="space-y-1.5">
            <Label>Lokasi Estate (Milik Company Terpilih) *</Label>
            <ChainedLocationSelect
              companyId={companyId}
              value={selectedEstates}
              onChange={setSelectedEstates}
              disabled={createProjectMutation.isPending}
            />
          </div>

          {/* Rencana Anggaran (Planned Budget) */}
          <div className="space-y-1.5">
            <Label htmlFor="create-proj-budget">Rencana Anggaran Awal (Planned Budget / RAB Estimasi) *</Label>
            <CurrencyInput
              id="create-proj-budget"
              value={plannedBudget}
              onChange={(val) => setPlannedBudget(val)}
              placeholder="0"
              disabled={createProjectMutation.isPending}
            />
            <p className="text-[11px] text-slate-500">
              Nilai estimasi awal sebelum survei detail dan BOQ final diajukan ke SAP.
            </p>
          </div>

          {/* Target Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-proj-start">Target Tanggal Mulai *</Label>
              <Input
                id="create-proj-start"
                type="date"
                value={targetStartDate}
                onChange={(e) => setTargetStartDate(e.target.value)}
                required
                disabled={createProjectMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-proj-end">Target Tanggal Selesai *</Label>
              <Input
                id="create-proj-end"
                type="date"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
                required
                disabled={createProjectMutation.isPending}
              />
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-1.5">
            <Label htmlFor="create-proj-notes">Catatan & Lingkup Pekerjaan</Label>
            <textarea
              id="create-proj-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan latar belakang masalah air atau survei..."
              disabled={createProjectMutation.isPending}
              className="w-full border border-slate-300 rounded-md p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createProjectMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-[#0f2c59] hover:bg-[#163a70] text-white"
              disabled={createProjectMutation.isPending}
            >
              {createProjectMutation.isPending ? 'Menyimpan...' : 'Simpan & Daftarkan Proyek'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
