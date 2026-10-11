'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ApprovalDecisionDialog } from '@/components/approval/ApprovalDecisionDialog';
import { formatCurrency, formatDate } from '@/shared/lib/format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Send, CheckCircle2, XCircle, TrendingUp, Lock } from 'lucide-react';

interface ArSupplementDto {
  id: string;
  number: string | null;
  amount: string | number;
  reason: string;
  date: string;
  status: string;
  submittedDate: string | null;
  approvalEmailDate: string | null;
  decidedDate: string | null;
  version: number;
  matrixTier?: { name: string } | null;
  levels: Array<{
    id: string;
    levelNo: number;
    positionId: string;
    positionNameSnapshot: string;
    record: {
      id: string;
      result: string;
      approverName: string;
      decisionDate: string;
      notes: string | null;
      createdAt: string;
    } | null;
  }>;
}

interface ArSupplementSectionProps {
  projectId: string;
  projectStatus: string;
  canMutate: boolean;
}

export function ArSupplementSection({
  projectId,
  projectStatus,
  canMutate,
}: ArSupplementSectionProps) {
  const queryClient = useQueryClient();

  // Create AR Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [arNumber, setArNumber] = useState('');
  const [arAmount, setArAmount] = useState('');
  const [arReason, setArReason] = useState('');
  const [arDate, setArDate] = useState('');

  // Submit AR Modal State
  const [submitTargetAr, setSubmitTargetAr] = useState<ArSupplementDto | null>(null);
  const [subDate, setSubDate] = useState('');
  const [emailDate, setEmailDate] = useState('');

  // Decision Modal State
  const [activeDecisionLevel, setActiveDecisionLevel] = useState<{
    id: string;
    levelNo: number;
    positionNameSnapshot: string;
  } | null>(null);

  // Fetch AR Supplements
  const { data: supplements = [], isLoading } = useQuery<ArSupplementDto[]>({
    queryKey: ['ar-supplements', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/ar-supplements`);
      if (!res.ok) throw new Error('Gagal memuat data AR tambahan');
      const json = await res.json();
      return json.data || [];
    },
  });

  // Create AR Mutation
  const createArMutation = useMutation({
    mutationFn: async () => {
      if (!arAmount || Number(arAmount) <= 0) {
        throw new Error('Nominal AR tambahan harus lebih besar dari 0');
      }
      if (!arReason.trim()) throw new Error('Alasan penambahan anggaran wajib diisi');
      if (!arDate) throw new Error('Tanggal AR wajib diisi');

      const payload = {
        number: arNumber.trim() || null,
        amount: Number(arAmount),
        reason: arReason.trim(),
        date: arDate,
      };

      const res = await fetch(`/api/projects/${projectId}/ar-supplements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal mengajukan AR tambahan');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Draft AR Tambahan berhasil dibuat!');
      queryClient.invalidateQueries({ queryKey: ['ar-supplements', projectId] });
      setCreateOpen(false);
      setArNumber('');
      setArAmount('');
      setArReason('');
      setArDate('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Submit AR Mutation
  const submitArMutation = useMutation({
    mutationFn: async () => {
      if (!submitTargetAr) return;
      if (!subDate) throw new Error('Tanggal pengajuan AR wajib diisi');
      if (!emailDate) throw new Error('Tanggal email approval wajib diisi');

      const res = await fetch(`/api/ar-supplements/${submitTargetAr.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submittedDate: subDate,
          approvalEmailDate: emailDate,
          version: submitTargetAr.version,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal mengajukan dokumen AR');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Dokumen AR Tambahan resmi diajukan ke SAP!');
      queryClient.invalidateQueries({ queryKey: ['ar-supplements', projectId] });
      setSubmitTargetAr(null);
      setSubDate('');
      setEmailDate('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isFinal = projectStatus === 'COMPLETED' || projectStatus === 'CANCELLED';
  const canAddAr = !isFinal && canMutate;

  if (isLoading) {
    return <Card className="p-5 text-xs text-slate-500">Memuat data AR tambahan...</Card>;
  }

  return (
    <Card className="p-5 bg-white border-slate-200 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#0f2c59]" />
            <h4 className="text-sm font-bold text-slate-900">
              Penambahan Anggaran Resmi (AR Tambahan)
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Suplemen penambahan anggaran resmi dengan hierarki persetujuan tier tersendiri (AC-25).
          </p>
        </div>

        {canAddAr ? (
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="bg-[#0f2c59] hover:bg-[#163a70] text-white text-xs gap-1.5 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajukan AR Tambahan
          </Button>
        ) : (
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" />
            {isFinal
              ? 'Proyek telah selesai/dibatalkan; penambahan AR ditolak.'
              : 'Viewer terkunci.'}
          </div>
        )}
      </div>

      {/* AR List */}
      {supplements.length === 0 ? (
        <div className="p-4 rounded-md bg-slate-50 text-xs text-slate-500 text-center border border-dashed border-slate-200">
          Belum ada pengajuan AR tambahan untuk proyek ini.
        </div>
      ) : (
        <div className="space-y-4">
          {supplements.map((ar) => {
            const sortedLevels = [...ar.levels].sort((a, b) => a.levelNo - b.levelNo);
            let nextLevelToDecide = null;
            if (ar.status === 'DIAJUKAN') {
              for (const lvl of sortedLevels) {
                if (!lvl.record) {
                  nextLevelToDecide = lvl;
                  break;
                }
                if (lvl.record.result !== 'APPROVED') break;
              }
            }

            return (
              <div
                key={ar.id}
                className="p-4 rounded-lg border border-slate-200 bg-white space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#0f2c59]">
                      {ar.number || 'AR Suplemen'}
                    </span>
                    <StatusBadge type="ar" status={ar.status} />
                    <span className="text-xs text-slate-400">
                      &bull; {formatDate(ar.date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-900">
                      {formatCurrency(ar.amount)}
                    </span>

                    {ar.status === 'DRAFT' && canMutate && (
                      <Button
                        size="sm"
                        onClick={() => setSubmitTargetAr(ar)}
                        className="h-7 text-xs bg-[#0f2c59] text-white hover:bg-[#163a70] gap-1"
                      >
                        <Send className="h-3 w-3" /> Ajukan AR
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-700">
                  <strong>Alasan:</strong> {ar.reason}
                </p>

                {/* Approver Levels */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Hierarki Approval Tier ({ar.matrixTier?.name || 'Sesuai Nominal AR'}):
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sortedLevels.map((lvl) => {
                      const isDecided = Boolean(lvl.record);
                      const isApproved = lvl.record?.result === 'APPROVED';
                      const isNext = nextLevelToDecide?.id === lvl.id;

                      return (
                        <div
                          key={lvl.id}
                          className={`p-2.5 rounded border text-xs flex items-center justify-between ${
                            isDecided
                              ? isApproved
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : 'bg-rose-50/40 border-rose-200'
                              : isNext
                              ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-300'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-800">
                              L{lvl.levelNo}: {lvl.positionNameSnapshot}
                            </div>
                            {lvl.record ? (
                              <div className="text-[10px] text-slate-500">
                                {isApproved ? 'Approved' : 'Ditolak'} oleh {lvl.record.approverName} ({formatDate(lvl.record.decisionDate)})
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">
                                {isNext ? 'Menunggu keputusan' : 'Menunggu antrean'}
                              </div>
                            )}
                          </div>

                          {ar.status === 'DIAJUKAN' && isNext && canMutate && (
                            <Button
                              size="sm"
                              onClick={() => setActiveDecisionLevel(lvl)}
                              className="h-6 text-[10px] px-2 bg-[#0f2c59] text-white"
                            >
                              Catat SAP
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create AR Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajukan Penambahan Anggaran Resmi (AR)</DialogTitle>
            <DialogDescription className="text-xs">
              AR tambahan memerlukan penetapan tier matriks dan persetujuan pejabat SAP level demi level.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createArMutation.mutate();
            }}
            className="space-y-4 pt-2 text-xs"
          >
            <div className="space-y-1.5">
              <Label htmlFor="ar-num">Nomor Dokumen AR (Opsional)</Label>
              <Input
                id="ar-num"
                value={arNumber}
                onChange={(e) => setArNumber(e.target.value)}
                placeholder="mis. AR/WM/2026/001"
                disabled={createArMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ar-amount">Nominal Tambahan Anggaran *</Label>
              <CurrencyInput
                id="ar-amount"
                value={arAmount}
                onChange={setArAmount}
                placeholder="0"
                required
                disabled={createArMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ar-date">Tanggal Dokumen AR *</Label>
              <Input
                id="ar-date"
                type="date"
                value={arDate}
                onChange={(e) => setArDate(e.target.value)}
                required
                disabled={createArMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ar-reason">Alasan Penambahan Anggaran *</Label>
              <textarea
                id="ar-reason"
                rows={3}
                value={arReason}
                onChange={(e) => setArReason(e.target.value)}
                placeholder="Jelaskan kebutuhan penambahan anggaran (penambahan pompa, perubahan rute saluran)..."
                required
                disabled={createArMutation.isPending}
                className="w-full border border-slate-300 rounded-md p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createArMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createArMutation.isPending}
                className="bg-[#0f2c59] hover:bg-[#163a70] text-white"
              >
                {createArMutation.isPending ? 'Menyimpan...' : 'Simpan Draft AR'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit AR Dialog */}
      <Dialog
        open={Boolean(submitTargetAr)}
        onOpenChange={(op) => !op && setSubmitTargetAr(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajukan Dokumen AR ke SAP</DialogTitle>
            <DialogDescription className="text-xs">
              Dokumen AR akan diajukan ke proses persetujuan berjenjang SAP.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitArMutation.mutate();
            }}
            className="space-y-4 pt-2 text-xs"
          >
            <div className="space-y-1.5">
              <Label htmlFor="sub-ar-date">Tanggal Pengajuan Dokumen *</Label>
              <Input
                id="sub-ar-date"
                type="date"
                value={subDate}
                onChange={(e) => setSubDate(e.target.value)}
                required
                disabled={submitArMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-ar-email">Tanggal Email Permohonan Approval *</Label>
              <Input
                id="sub-ar-email"
                type="date"
                value={emailDate}
                onChange={(e) => setEmailDate(e.target.value)}
                required
                disabled={submitArMutation.isPending}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubmitTargetAr(null)}
                disabled={submitArMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitArMutation.isPending}
                className="bg-[#0f2c59] hover:bg-[#163a70] text-white"
              >
                {submitArMutation.isPending ? 'Mengajukan...' : 'Ajukan AR'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Decision Modal for AR */}
      <ApprovalDecisionDialog
        open={Boolean(activeDecisionLevel)}
        onOpenChange={(op) => !op && setActiveDecisionLevel(null)}
        level={activeDecisionLevel}
        docType="AR"
        onSuccess={() => setActiveDecisionLevel(null)}
      />
    </Card>
  );
}
