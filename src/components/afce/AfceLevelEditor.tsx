'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ApprovalDecisionDialog } from '@/components/approval/ApprovalDecisionDialog';
import { formatDate } from '@/shared/lib/format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ShieldCheck,
  AlertTriangle,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
} from 'lucide-react';

export interface LevelSnapshotItem {
  id: string;
  levelNo: number;
  positionId: string;
  positionNameSnapshot: string;
  record?: {
    id: string;
    result: string;
    approverName: string;
    decisionDate: string;
    notes?: string | null;
    createdAt: string;
  } | null;
}

interface AfceLevelEditorProps {
  afceAttemptId: string;
  status: string;
  matrixTierName?: string;
  isDifferentFromMatrix?: boolean;
  approvalEmailDate?: string | null;
  submittedDate?: string | null;
  levels: LevelSnapshotItem[];
  canMutate: boolean;
  version: number;
}

export function AfceLevelEditor({
  afceAttemptId,
  status,
  matrixTierName,
  isDifferentFromMatrix,
  approvalEmailDate,
  submittedDate,
  levels,
  canMutate,
  version,
}: AfceLevelEditorProps) {
  const queryClient = useQueryClient();

  // Submit dialog state
  const [submitOpen, setSubmitOpen] = useState(false);
  const [subDate, setSubDate] = useState('');
  const [emailDate, setEmailDate] = useState('');

  // Decision dialog state
  const [activeDecisionLevel, setActiveDecisionLevel] = useState<LevelSnapshotItem | null>(null);

  // Submit AFCE Mutation (DRAFT -> DIAJUKAN, Project -> WAITING_AFCE_AR)
  const submitAfceMutation = useMutation({
    mutationFn: async () => {
      if (!subDate) throw new Error('Tanggal pengajuan AFCE wajib diisi');
      if (!emailDate) throw new Error('Tanggal email approval wajib diisi');

      const res = await fetch(`/api/afce-attempts/${afceAttemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submittedDate: subDate,
          approvalEmailDate: emailDate,
          version,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal mengajukan dokumen AFCE');
      return json.data;
    },
    onSuccess: () => {
      toast.success(
        'Dokumen AFCE resmi diajukan! Status proyek beralih ke WAITING_AFCE_AR.'
      );
      queryClient.invalidateQueries({ queryKey: ['afce-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['project-history'] });
      setSubmitOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sortedLevels = [...levels].sort((a, b) => a.levelNo - b.levelNo);

  // Cari level yang aktif berikutnya untuk diputuskan
  let nextLevelToDecide: LevelSnapshotItem | null = null;
  if (status === 'DIAJUKAN') {
    for (const lvl of sortedLevels) {
      if (!lvl.record) {
        nextLevelToDecide = lvl;
        break;
      }
      if (lvl.record.result !== 'APPROVED') {
        // Jika level sebelumnya ditolak, tidak ada level berikutnya
        break;
      }
    }
  }

  return (
    <Card className="p-5 bg-white border-slate-200 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#0f2c59]" />
            <h4 className="text-sm font-bold text-slate-900">
              Alur Hierarki Persetujuan SAP (AFCE)
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Matriks: <span className="font-semibold text-slate-700">{matrixTierName || 'Sesuai Nilai BOQ'}</span>
            {approvalEmailDate && (
              <span> &bull; Tanggal Email Approval: {formatDate(approvalEmailDate)}</span>
            )}
          </p>
        </div>

        {status === 'DRAFT' && canMutate && (
          <Button
            size="sm"
            onClick={() => setSubmitOpen(true)}
            className="bg-[#0f2c59] hover:bg-[#163a70] text-white text-xs gap-1.5 h-8"
          >
            <Send className="h-3.5 w-3.5" />
            Ajukan Dokumen AFCE
          </Button>
        )}
      </div>

      {/* Warning Deviasi Matriks (AC-18) */}
      {isDifferentFromMatrix && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Peringatan Deviasi Hierarki:</span>
            <p className="mt-0.5">
              Urutan atau daftar jabatan approver pada dokumen ini berbeda dari matriks tier standar SAP.
              Perbedaan konfigurasi ini tercatat untuk kebutuhan audit.
            </p>
          </div>
        </div>
      )}

      {/* Level List */}
      <div className="space-y-3">
        {sortedLevels.map((lvl) => {
          const isDecided = Boolean(lvl.record);
          const isApproved = lvl.record?.result === 'APPROVED';
          const isNext = nextLevelToDecide?.id === lvl.id;

          return (
            <div
              key={lvl.id}
              className={`p-3 rounded-md border text-xs transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                isDecided
                  ? isApproved
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-rose-50/50 border-rose-200'
                  : isNext
                  ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-300'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#0f2c59] bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    Level {lvl.levelNo}
                  </span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {lvl.positionNameSnapshot}
                  </span>

                  {isDecided ? (
                    isApproved ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                        <CheckCircle2 className="h-3 w-3" /> Approved di SAP
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded">
                        <XCircle className="h-3 w-3" /> Ditolak di SAP
                      </span>
                    )
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      {isNext ? 'Menunggu Keputusan' : 'Menunggu Level Sebelumnya'}
                    </span>
                  )}
                </div>

                {lvl.record && (
                  <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-3 pt-1">
                    <span>
                      Approver: <strong>{lvl.record.approverName}</strong>
                    </span>
                    <span>
                      Tanggal Keputusan: <strong>{formatDate(lvl.record.decisionDate)}</strong>
                    </span>
                    {lvl.record.notes && (
                      <span className="italic">&ldquo;{lvl.record.notes}&rdquo;</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button: Catat Keputusan */}
              {status === 'DIAJUKAN' && isNext && canMutate && (
                <div>
                  <Button
                    size="sm"
                    onClick={() => setActiveDecisionLevel(lvl)}
                    className="bg-[#0f2c59] hover:bg-[#163a70] text-white text-xs gap-1.5 h-7 shadow-xs"
                  >
                    Catat Keputusan SAP
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit AFCE Dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajukan Dokumen AFCE ke SAP</DialogTitle>
            <DialogDescription className="text-xs">
              Pengajuan dokumen AFCE akan mengunci perubahan BOQ dan memindahkan status proyek ke{' '}
              <strong>WAITING_AFCE_AR</strong>.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitAfceMutation.mutate();
            }}
            className="space-y-4 pt-2 text-xs"
          >
            <div className="space-y-1.5">
              <Label htmlFor="sub-afce-date">Tanggal Pengajuan Dokumen *</Label>
              <Input
                id="sub-afce-date"
                type="date"
                value={subDate}
                onChange={(e) => setSubDate(e.target.value)}
                required
                disabled={submitAfceMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-afce-email">Tanggal Email Permohonan Approval *</Label>
              <Input
                id="sub-afce-email"
                type="date"
                value={emailDate}
                onChange={(e) => setEmailDate(e.target.value)}
                required
                disabled={submitAfceMutation.isPending}
              />
              <p className="text-[11px] text-slate-500">
                Tanggal email approval menjadi basis batas awal keputusan Level 1 dan perhitungan durasi.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubmitOpen(false)}
                disabled={submitAfceMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitAfceMutation.isPending}
                className="bg-[#0f2c59] hover:bg-[#163a70] text-white"
              >
                {submitAfceMutation.isPending ? 'Mengajukan...' : 'Ajukan Dokumen AFCE'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Decision Dialog */}
      <ApprovalDecisionDialog
        open={Boolean(activeDecisionLevel)}
        onOpenChange={(op) => !op && setActiveDecisionLevel(null)}
        level={
          activeDecisionLevel
            ? {
                id: activeDecisionLevel.id,
                levelNo: activeDecisionLevel.levelNo,
                positionNameSnapshot: activeDecisionLevel.positionNameSnapshot,
              }
            : null
        }
        docType="AFCE"
        onSuccess={() => setActiveDecisionLevel(null)}
      />
    </Card>
  );
}
