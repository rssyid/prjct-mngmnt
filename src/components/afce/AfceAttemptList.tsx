'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AfceBoqEditor } from '@/components/afce/AfceBoqEditor';
import { AfceLevelEditor } from '@/components/afce/AfceLevelEditor';
import { formatCurrency, formatDate } from '@/shared/lib/format';
import { toast } from 'sonner';
import { FileText, Plus, AlertCircle, History } from 'lucide-react';

interface AfceAttemptDto {
  id: string;
  attemptNumber: number;
  status: string;
  basisAmount: string | number;
  submittedDate: string | null;
  approvalEmailDate: string | null;
  decidedDate: string | null;
  version: number;
  isDifferentFromMatrix?: boolean;
  matrixTier?: { name: string } | null;
  boqItems: Array<{
    id: string;
    lineNo: number;
    activityName: string;
    buildingName: string | null;
    amount: string | number;
    notes: string | null;
  }>;
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

interface AfceAttemptListProps {
  projectId: string;
  projectStatus: string;
  canMutate: boolean;
}

export function AfceAttemptList({
  projectId,
  projectStatus,
  canMutate,
}: AfceAttemptListProps) {
  const queryClient = useQueryClient();
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const { data: attempts = [], isLoading, isError } = useQuery<AfceAttemptDto[]>({
    queryKey: ['afce-attempts', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/afce-attempts`);
      if (!res.ok) throw new Error('Gagal memuat dokumen AFCE');
      const json = await res.json();
      return json.data || [];
    },
  });

  // Create Attempt Mutation
  const createAttemptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/afce-attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal membuat draft AFCE');
      return json.data;
    },
    onSuccess: (newAttempt) => {
      toast.success(`Draft AFCE Attempt #${newAttempt.attemptNumber} berhasil dibuat!`);
      queryClient.invalidateQueries({ queryKey: ['afce-attempts', projectId] });
      setSelectedAttemptId(newAttempt.id);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Set default selected attempt to active or latest attempt
  const selectedAttempt = React.useMemo(() => {
    if (selectedAttemptId) {
      const found = attempts.find((a) => a.id === selectedAttemptId);
      if (found) return found;
    }
    // Default to last attempt
    return attempts[attempts.length - 1] || null;
  }, [attempts, selectedAttemptId]);

  const hasActiveAttempt = attempts.some(
    (a) => a.status === 'DRAFT' || a.status === 'DIAJUKAN'
  );

  const canCreateNewAttempt =
    projectStatus === 'RAB_READY' && !hasActiveAttempt && canMutate;

  if (isLoading) {
    return <Card className="p-5 text-xs text-slate-500">Memuat data dokumen AFCE...</Card>;
  }

  if (isError) {
    return (
      <Card className="p-5 text-xs text-rose-600 bg-rose-50 border-rose-200">
        Gagal memuat dokumen AFCE.
      </Card>
    );
  }

  // Jika belum ada attempt sama sekali
  if (attempts.length === 0) {
    return (
      <Card className="p-6 bg-white border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#0f2c59]" />
          <h3 className="text-base font-bold text-slate-900">Dokumen AFCE & BOQ</h3>
        </div>
        <p className="text-xs text-slate-600 max-w-2xl">
          Belum ada dokumen AFCE yang dibuat untuk proyek ini. Dokumen AFCE dapat dibuat saat survei
          telah selesai dan proyek berstatus <strong>RAB_READY</strong>.
        </p>

        {canCreateNewAttempt ? (
          <Button
            onClick={() => createAttemptMutation.mutate()}
            disabled={createAttemptMutation.isPending}
            className="bg-[#0f2c59] hover:bg-[#163a70] text-white text-xs gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {createAttemptMutation.isPending ? 'Membuat...' : 'Buat Dokumen AFCE Baru'}
          </Button>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-500">
            {projectStatus === 'DRAFT' || projectStatus === 'SURVEY'
              ? 'Selesaikan tahap Survei terlebih dahulu untuk membuka pembuatan AFCE.'
              : 'Pembuatan AFCE baru tidak diizinkan pada status saat ini.'}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Attempt Selector Tabs & Action */}
      <Card className="p-4 bg-white border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <History className="h-3.5 w-3.5" /> Riwayat Attempt:
            </span>
            {attempts.map((att) => {
              const isSelected = selectedAttempt?.id === att.id;
              return (
                <button
                  key={att.id}
                  onClick={() => setSelectedAttemptId(att.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-[#0f2c59] border-[#0f2c59] text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Attempt #{att.attemptNumber}</span>
                  <StatusBadge type="afce" status={att.status} />
                </button>
              );
            })}
          </div>

          {canCreateNewAttempt && (
            <Button
              size="sm"
              onClick={() => createAttemptMutation.mutate()}
              disabled={createAttemptMutation.isPending}
              className="bg-[#0f2c59] hover:bg-[#163a70] text-white text-xs gap-1.5 h-8 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              {createAttemptMutation.isPending ? 'Memproses...' : 'Buat Attempt Baru'}
            </Button>
          )}
        </div>
      </Card>

      {/* Selected Attempt Details */}
      {selectedAttempt && (
        <div className="space-y-6">
          {/* BOQ Editor */}
          <AfceBoqEditor
            afceAttemptId={selectedAttempt.id}
            initialItems={selectedAttempt.boqItems}
            isDraft={selectedAttempt.status === 'DRAFT'}
            canMutate={canMutate}
            version={selectedAttempt.version}
          />

          {/* Level Hierarchy & Decisions */}
          <AfceLevelEditor
            afceAttemptId={selectedAttempt.id}
            status={selectedAttempt.status}
            matrixTierName={selectedAttempt.matrixTier?.name}
            isDifferentFromMatrix={selectedAttempt.isDifferentFromMatrix}
            approvalEmailDate={selectedAttempt.approvalEmailDate}
            submittedDate={selectedAttempt.submittedDate}
            levels={selectedAttempt.levels}
            canMutate={canMutate}
            version={selectedAttempt.version}
          />
        </div>
      )}
    </div>
  );
}
