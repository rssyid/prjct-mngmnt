'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

export interface StatusBadgeProps {
  type: 'project' | 'afce' | 'ar' | 'survey';
  status: string;
  className?: string;
}

const PROJECT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-700 border-slate-300' },
  SURVEY: { label: 'Survei', className: 'bg-sky-50 text-sky-800 border-sky-300' },
  RAB_READY: { label: 'RAB Ready', className: 'bg-indigo-50 text-indigo-800 border-indigo-300' },
  WAITING_AFCE_AR: { label: 'Menunggu AFCE/AR', className: 'bg-amber-50 text-amber-800 border-amber-300' },
  AFCE_AR_APPROVED: { label: 'AFCE/AR Disetujui', className: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  PROCUREMENT: { label: 'Pengadaan', className: 'bg-purple-50 text-purple-800 border-purple-300' },
  EXECUTION: { label: 'Pelaksanaan', className: 'bg-blue-50 text-blue-800 border-blue-300' },
  WAITING_BAST: { label: 'Menunggu BAST', className: 'bg-amber-100 text-amber-900 border-amber-400' },
  COMPLETED: { label: 'Selesai', className: 'bg-green-100 text-green-900 border-green-400 font-semibold' },
  ON_HOLD: { label: 'Ditahan (Hold)', className: 'bg-orange-100 text-orange-900 border-orange-400 font-semibold' },
  CANCELLED: { label: 'Dibatalkan', className: 'bg-rose-100 text-rose-900 border-rose-400' },
};

const DOCUMENT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-700 border-slate-300' },
  DIAJUKAN: { label: 'Diajukan', className: 'bg-amber-50 text-amber-800 border-amber-300' },
  APPROVED: { label: 'Disetujui (Approved)', className: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold' },
  DITOLAK: { label: 'Ditolak', className: 'bg-rose-100 text-rose-900 border-rose-400' },
  REJECTED: { label: 'Ditolak', className: 'bg-rose-100 text-rose-900 border-rose-400' },
};

export function StatusBadge({ type, status, className = '' }: StatusBadgeProps) {
  let prefix = 'Proyek';
  let info = { label: status, className: 'bg-slate-100 text-slate-700 border-slate-300' };

  if (type === 'project') {
    prefix = 'Proyek';
    info = PROJECT_STATUS_LABELS[status] || { label: status, className: info.className };
  } else if (type === 'afce') {
    prefix = 'AFCE';
    info = DOCUMENT_STATUS_LABELS[status] || { label: status, className: info.className };
  } else if (type === 'ar') {
    prefix = 'AR';
    info = DOCUMENT_STATUS_LABELS[status] || { label: status, className: info.className };
  } else if (type === 'survey') {
    prefix = 'Survei';
    info = status === 'COMPLETED'
      ? { label: 'Selesai', className: 'bg-emerald-50 text-emerald-800 border-emerald-300' }
      : { label: 'Berjalan', className: 'bg-sky-50 text-sky-800 border-sky-300' };
  }

  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-medium border px-2 py-0.5 whitespace-nowrap ${info.className} ${className}`}
    >
      {prefix}: {info.label}
    </Badge>
  );
}
