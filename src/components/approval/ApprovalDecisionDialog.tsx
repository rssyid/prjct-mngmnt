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
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Info, ShieldAlert } from 'lucide-react';

export interface ApprovalLevelInfo {
  id: string;
  levelNo: number;
  positionNameSnapshot: string;
  minDateAllowed?: string;
  isLastLevel?: boolean;
}

interface ApprovalDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: ApprovalLevelInfo | null;
  docType: 'AFCE' | 'AR';
  onSuccess?: () => void;
}

export function ApprovalDecisionDialog({
  open,
  onOpenChange,
  level,
  docType,
  onSuccess,
}: ApprovalDecisionDialogProps) {
  const queryClient = useQueryClient();

  const [approverName, setApproverName] = useState('');
  const [decisionDate, setDecisionDate] = useState('');
  const [result, setResult] = useState<'APPROVED' | 'DITOLAK'>('APPROVED');
  const [notes, setNotes] = useState('');

  const submitDecisionMutation = useMutation({
    mutationFn: async () => {
      if (!level) throw new Error('Level approval tidak valid');
      if (!approverName.trim()) throw new Error('Nama approver SAP wajib diisi');
      if (!decisionDate) throw new Error('Tanggal keputusan wajib diisi');

      const payload = {
        approverName: approverName.trim(),
        decisionDate,
        result,
        notes: notes.trim() || null,
      };

      const res = await fetch(`/api/approval-levels/${level.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal mencatat keputusan approval');
      }
      return json.data;
    },
    onSuccess: (data) => {
      if (result === 'APPROVED') {
        if (data.projectStatus === 'AFCE_AR_APPROVED') {
          toast.success(
            'Level terakhir disetujui! Status proyek resmi beralih ke AFCE_AR_APPROVED dan Anggaran Resmi tercatat.'
          );
        } else {
          toast.success(`Keputusan Approved untuk Level ${level?.levelNo} berhasil dicatat.`);
        }
      } else {
        toast.warning(
          `Dokumen ditolak pada Level ${level?.levelNo}. Status proyek dikembalikan ke RAB_READY.`
        );
      }

      queryClient.invalidateQueries({ queryKey: ['afce-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['ar-supplements'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      queryClient.invalidateQueries({ queryKey: ['project-history'] });

      // Reset form
      setApproverName('');
      setDecisionDate('');
      setResult('APPROVED');
      setNotes('');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!level) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Catat Keputusan Approval SAP — Level {level.levelNo} ({level.positionNameSnapshot})
          </DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-semibold text-slate-800">Pemberitahuan:</span> Keputusan approval diambil
            di sistem SAP dan dicatat oleh pengguna ke dalam aplikasi ini.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitDecisionMutation.mutate();
          }}
          className="space-y-4 pt-2 text-xs"
        >
          {/* Hasil Keputusan */}
          <div className="space-y-1.5">
            <Label>Hasil Keputusan di SAP *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResult('APPROVED')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-semibold transition-colors ${
                  result === 'APPROVED'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Approved (Disetujui)
              </button>

              <button
                type="button"
                onClick={() => setResult('DITOLAK')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-semibold transition-colors ${
                  result === 'DITOLAK'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="h-4 w-4 text-rose-600" />
                Ditolak (Rejected)
              </button>
            </div>
          </div>

          {result === 'DITOLAK' && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-[11px] text-rose-800 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>
                Penolakan pada AFCE akan membatalkan dokumen ini dan secara otomatis mengembalikan
                status proyek ke <strong>RAB_READY</strong> untuk penyusunan ulang.
              </span>
            </div>
          )}

          {/* Nama Approver */}
          <div className="space-y-1.5">
            <Label htmlFor="dec-approver">Nama Pejabat Approver SAP *</Label>
            <Input
              id="dec-approver"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="mis. Budi Santoso (Direktur Operasional)"
              required
              disabled={submitDecisionMutation.isPending}
            />
          </div>

          {/* Tanggal Keputusan */}
          <div className="space-y-1.5">
            <Label htmlFor="dec-date">Tanggal Keputusan di SAP *</Label>
            <Input
              id="dec-date"
              type="date"
              value={decisionDate}
              onChange={(e) => setDecisionDate(e.target.value)}
              required
              disabled={submitDecisionMutation.isPending}
            />
            <p className="text-[11px] text-slate-500">
              Tidak boleh di masa depan dan tidak boleh lebih awal dari keputusan level sebelumnya / email approval.
            </p>
          </div>

          {/* Catatan Keputusan */}
          <div className="space-y-1.5">
            <Label htmlFor="dec-notes">Catatan Keputusan / Alasan Penolakan</Label>
            <textarea
              id="dec-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan dari SAP atau alasan penolakan..."
              disabled={submitDecisionMutation.isPending}
              className="w-full border border-slate-300 rounded-md p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitDecisionMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitDecisionMutation.isPending}
              className={`${
                result === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              } text-white`}
            >
              {submitDecisionMutation.isPending ? 'Menyimpan...' : 'Simpan Keputusan SAP'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
