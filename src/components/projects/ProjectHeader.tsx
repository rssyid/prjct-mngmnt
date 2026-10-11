'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency, formatDate } from '@/shared/lib/format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PauseCircle, PlayCircle, XCircle, Lock, Building2, MapPin, Calendar, DollarSign } from 'lucide-react';

export interface ProjectDetailHeaderProps {
  project: {
    id: string;
    code: string;
    name: string;
    status: string;
    plannedBudget: string | number;
    targetStartDate: string;
    targetEndDate: string;
    company?: { name: string; code: string };
    category?: { name: string };
    estates?: Array<{ isPrimary: boolean; estate: { name: string; code: string } }>;
  };
  canMutate: boolean;
}

export function ProjectHeader({ project, canMutate }: ProjectDetailHeaderProps) {
  const queryClient = useQueryClient();

  // Dialog states
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');

  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeReason, setResumeReason] = useState('');

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Hold Mutation
  const holdMutation = useMutation({
    mutationFn: async () => {
      if (!holdReason.trim()) throw new Error('Alasan penahanan proyek wajib diisi');
      const res = await fetch(`/api/projects/${project.id}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: holdReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal menahan proyek');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Proyek berhasil ditahan (ON_HOLD)');
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['project-history', project.id] });
      setHoldOpen(false);
      setHoldReason('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Resume Mutation
  const resumeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${project.id}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: resumeReason.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal melanjutkan proyek');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Proyek berhasil dilanjutkan kembali');
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['project-history', project.id] });
      setResumeOpen(false);
      setResumeReason('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!cancelReason.trim()) throw new Error('Alasan pembatalan proyek wajib diisi');
      const res = await fetch(`/api/projects/${project.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal membatalkan proyek');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Proyek berhasil dibatalkan (CANCELLED)');
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['project-history', project.id] });
      setCancelOpen(false);
      setCancelReason('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isFinal = project.status === 'COMPLETED' || project.status === 'CANCELLED';
  const isHold = project.status === 'ON_HOLD';

  const primaryEstate = project.estates?.find((e) => e.isPrimary)?.estate;
  const otherEstates = project.estates?.filter((e) => !e.isPrimary) || [];

  return (
    <Card className="p-5 bg-white border-slate-200 shadow-2xs space-y-4">
      {/* Title & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[#0f2c59] bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
              {project.code}
            </span>
            <StatusBadge type="project" status={project.status} />
            {project.category && (
              <span className="text-xs text-slate-500 font-medium">
                &bull; {project.category.name}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {project.name}
          </h1>
        </div>

        {/* Action Buttons for Hold / Resume / Cancel */}
        <div className="flex flex-wrap items-center gap-2">
          {canMutate ? (
            <>
              {!isFinal && !isHold && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHoldOpen(true)}
                  className="h-8 text-xs gap-1.5 border-orange-300 text-orange-800 hover:bg-orange-50"
                >
                  <PauseCircle className="h-3.5 w-3.5" />
                  Tahan Proyek
                </Button>
              )}

              {isHold && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResumeOpen(true)}
                  className="h-8 text-xs gap-1.5 border-emerald-400 text-emerald-800 hover:bg-emerald-50"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  Lanjutkan Proyek
                </Button>
              )}

              {!isFinal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelOpen(true)}
                  className="h-8 text-xs gap-1.5 border-rose-300 text-rose-800 hover:bg-rose-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Batalkan Proyek
                </Button>
              )}
            </>
          ) : (
            <div title="Role Viewer tidak memiliki izin mutasi status proyek">
              <Button
                variant="outline"
                size="sm"
                disabled
                className="h-8 text-xs gap-1.5 text-slate-400 border-slate-200 cursor-not-allowed"
              >
                <Lock className="h-3.5 w-3.5" /> Aksi Terkunci (Viewer)
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Meta Specs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
        <div className="space-y-0.5">
          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
            <Building2 className="h-3 w-3" /> Company (PT)
          </span>
          <span className="font-semibold text-slate-800">
            {project.company?.name || '-'} ({project.company?.code || '-'})
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
            <MapPin className="h-3 w-3" /> Lokasi Estate
          </span>
          <span className="font-semibold text-slate-800">
            {primaryEstate?.name || '-'}
            {otherEstates.length > 0 && (
              <span className="text-slate-500 font-normal"> (+{otherEstates.length} estate lain)</span>
            )}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
            <Calendar className="h-3 w-3" /> Periode Target
          </span>
          <span className="font-semibold text-slate-800">
            {project.targetStartDate ? formatDate(project.targetStartDate) : '-'} s.d.{' '}
            {project.targetEndDate ? formatDate(project.targetEndDate) : '-'}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
            <DollarSign className="h-3 w-3" /> Rencana Anggaran (Planned)
          </span>
          <span className="font-semibold text-slate-800">
            {formatCurrency(project.plannedBudget || 0)}
          </span>
        </div>
      </div>

      {/* Hold Dialog */}
      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tahan Proyek (ON_HOLD)</DialogTitle>
            <DialogDescription>
              Menahan proyek akan membekukan perhitungan jadwal EWS dan menolak mutasi tender/SPK/fisik.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs">
            <Label htmlFor="hold-reason">Alasan Penahanan *</Label>
            <textarea
              id="hold-reason"
              rows={3}
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="Jelaskan alasan penahanan proyek (cuaca ekstrim, kendala sosial, dll)..."
              className="w-full border border-slate-300 rounded-md p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => holdMutation.mutate()}
              disabled={holdMutation.isPending || !holdReason.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {holdMutation.isPending ? 'Memproses...' : 'Tahan Proyek'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume Dialog */}
      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lanjutkan Proyek</DialogTitle>
            <DialogDescription>
              Proyek akan dikembalikan ke status aktif sebelumnya dan pembekuan jadwal dicabut.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs">
            <Label htmlFor="resume-reason">Catatan Pelanjutan (Opsional)</Label>
            <textarea
              id="resume-reason"
              rows={2}
              value={resumeReason}
              onChange={(e) => setResumeReason(e.target.value)}
              placeholder="Catatan pelanjutan proyek..."
              className="w-full border border-slate-300 rounded-md p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResumeOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {resumeMutation.isPending ? 'Memproses...' : 'Lanjutkan Proyek'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Batalkan Proyek (CANCELLED)</DialogTitle>
            <DialogDescription>
              PERINGATAN: Pembatalan proyek bersifat final. Seluruh mutasi dokumen dan transaksi akan dikunci permanen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs">
            <Label htmlFor="cancel-reason">Alasan Pembatalan *</Label>
            <textarea
              id="cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Tuliskan alasan resmi pembatalan proyek..."
              className="w-full border border-slate-300 rounded-md p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-rose-600"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending || !cancelReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {cancelMutation.isPending ? 'Memproses...' : 'Batalkan Proyek'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
