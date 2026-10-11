'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/shared/lib/format';
import { DollarSign, TrendingUp, CheckCircle, AlertCircle, FileCheck } from 'lucide-react';

interface BudgetEntryDto {
  id: string;
  type: string;
  amount: string | number;
  effectiveDate: string;
  createdBy?: { name: string; email: string };
  arSupplement?: { number: string | null; reason: string; date: string } | null;
}

interface BudgetSummaryDto {
  plannedBudget: string | number;
  totalOfficialBudget: string | number;
  initialEntry: BudgetEntryDto | null;
  arEntries: BudgetEntryDto[];
  entries: BudgetEntryDto[];
}

export function BudgetOverviewCard({ projectId }: { projectId: string }) {
  const { data: budget, isLoading } = useQuery<BudgetSummaryDto>({
    queryKey: ['budget', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/budget`);
      if (!res.ok) throw new Error('Gagal memuat ringkasan anggaran');
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return <Card className="p-5 text-xs text-slate-500">Memuat data anggaran proyek...</Card>;
  }

  const planned = Number(budget?.plannedBudget) || 0;
  const official = Number(budget?.totalOfficialBudget) || 0;
  const variance = official - planned;

  return (
    <Card className="p-5 bg-white border-slate-200 shadow-2xs space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-[#0f2c59]" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Ringkasan Anggaran Proyek</h3>
            <p className="text-xs text-slate-500">
              Perbandingan Rencana Anggaran Awal (Planned) terhadap Anggaran Resmi SAP (Official Budget).
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Planned Budget */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Rencana Anggaran Awal (Planned)
          </span>
          <span className="text-lg font-black text-slate-800">
            {formatCurrency(planned)}
          </span>
          <p className="text-[10px] text-slate-400">
            Estimasi pada tahap inisiasi proyek sebelum penetapan BOQ final.
          </p>
        </div>

        {/* Total Official Budget */}
        <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
            Total Anggaran Resmi (Official SAP)
          </span>
          <span className="text-lg font-black text-emerald-950">
            {formatCurrency(official)}
          </span>
          <p className="text-[10px] text-emerald-700">
            Total kumulatif dari AFCE yang telah disetujui + seluruh Suplemen AR.
          </p>
        </div>

        {/* Variance */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Selisih (Variance)
          </span>
          <span
            className={`text-lg font-black ${
              variance > 0
                ? 'text-amber-700'
                : variance < 0
                ? 'text-sky-700'
                : 'text-slate-800'
            }`}
          >
            {variance > 0 ? `+${formatCurrency(variance)}` : formatCurrency(variance)}
          </span>
          <p className="text-[10px] text-slate-400">
            {variance > 0
              ? 'Anggaran resmi melampaui estimasi awal.'
              : variance < 0
              ? 'Anggaran resmi di bawah estimasi awal.'
              : 'Sesuai dengan estimasi awal.'}
          </p>
        </div>
      </div>

      {/* Official Budget Ledger (AC-24, AC-25) */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Buku Besar Anggaran Resmi (Budget Ledger)
        </h4>

        {(!budget?.entries || budget.entries.length === 0) ? (
          <div className="p-4 rounded-md bg-slate-50 text-xs text-slate-500 text-center border border-dashed border-slate-200">
            Belum ada anggaran resmi yang dicatat. Anggaran resmi terbentuk saat dokumen AFCE disetujui pada level terakhir.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-compact text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th>Jenis Anggaran</th>
                  <th>Keterangan / Nomor Dokumen</th>
                  <th>Tanggal Efektif</th>
                  <th className="text-right">Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {budget.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50">
                    <td>
                      {entry.type === 'INITIAL' ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded text-[11px]">
                          <FileCheck className="h-3 w-3" /> AFCE Awal (Initial)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded text-[11px]">
                          <TrendingUp className="h-3 w-3" /> Suplemen AR
                        </span>
                      )}
                    </td>
                    <td className="text-slate-700">
                      {entry.type === 'INITIAL'
                        ? 'Persetujuan AFCE Final SAP'
                        : entry.arSupplement?.reason || entry.arSupplement?.number || 'AR Tambahan'}
                    </td>
                    <td className="text-slate-600">{formatDate(entry.effectiveDate)}</td>
                    <td className="text-right font-bold text-slate-900">
                      {formatCurrency(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
