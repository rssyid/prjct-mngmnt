'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDate } from '@/shared/lib/format';
import { History, ArrowRight } from 'lucide-react';

interface HistoryItem {
  id: string;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  createdAt: string;
  changedBy: { id: string; name: string; email: string };
}

export function ProjectHistoryTimeline({ projectId }: { projectId: string }) {
  const { data: history = [], isLoading, isError } = useQuery<HistoryItem[]>({
    queryKey: ['project-history', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/history`);
      if (!res.ok) throw new Error('Gagal memuat riwayat status');
      const json = await res.json();
      return json.data || [];
    },
  });

  return (
    <Card className="p-5 bg-white border-slate-200 shadow-2xs space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <History className="h-4 w-4 text-[#0f2c59]" />
        <h3 className="text-sm font-bold text-slate-900">Riwayat Perubahan Status Proyek</h3>
        <span className="text-xs text-slate-400">({history.length} catatan)</span>
      </div>

      {isLoading && (
        <p className="text-xs text-slate-500 py-3">Memuat riwayat transaksi status...</p>
      )}

      {isError && (
        <p className="text-xs text-rose-600 py-3">Gagal memuat riwayat status.</p>
      )}

      {!isLoading && !isError && history.length === 0 && (
        <p className="text-xs text-slate-500 py-3">Belum ada riwayat transisi status.</p>
      )}

      {!isLoading && !isError && history.length > 0 && (
        <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {history.map((item) => (
            <div key={item.id} className="relative text-xs space-y-1">
              {/* Dot */}
              <div className="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#0f2c59] border-2 border-white ring-1 ring-slate-300" />

              <div className="flex flex-wrap items-center gap-1.5 font-medium">
                <StatusBadge type="project" status={item.fromStatus} />
                <ArrowRight className="h-3 w-3 text-slate-400" />
                <StatusBadge type="project" status={item.toStatus} />
                <span className="text-[11px] text-slate-400 ml-auto">
                  {formatDate(item.createdAt)}
                </span>
              </div>

              {item.reason && (
                <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 text-[11px]">
                  <strong>Alasan:</strong> {item.reason}
                </p>
              )}

              <p className="text-[10px] text-slate-400">
                Dicatat oleh: <strong>{item.changedBy?.name || item.changedBy?.email}</strong>
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
