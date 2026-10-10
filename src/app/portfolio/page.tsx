'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RoleProvider, useRole } from '@/components/prototype/role-context';
import { AppShell } from '@/components/prototype/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MOCK_GANTT_ROWS, MOCK_GANTT_WEEKS } from '@/components/prototype/mock-data';
import { Download, Filter, HelpCircle, Layers, ArrowLeft } from 'lucide-react';

function PortfolioContent() {
  const { canMutate } = useRole();
  const [showLegend, setShowLegend] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Portofolio Gantt Matriks Mingguan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualisasi timeline proyek, tender attempt, pelaksanaan fisik, dan paket kerja material terhadap baseline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowLegend(!showLegend)}
            className="sm:hidden text-xs h-8 gap-1"
          >
            <HelpCircle className="h-3.5 w-3.5" /> Legenda
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => alert('Simulasi: Ekspor laporan Gantt matriks ke Excel (ExcelJS) diproses.')}
            className="text-xs h-8 gap-1.5 border-slate-300"
          >
            <Download className="h-3.5 w-3.5" /> Ekspor Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => alert('Simulasi: Ekspor laporan Gantt matriks ke PDF (@react-pdf/renderer) diproses.')}
            className="text-xs h-8 gap-1.5 border-slate-300"
          >
            <Download className="h-3.5 w-3.5" /> Ekspor PDF
          </Button>
        </div>
      </div>

      {/* Gantt Filter Bar */}
      <Card className="p-3.5 bg-white">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-slate-400" /> Filter:
          </span>
          <select aria-label="Filter Wilayah Kebun" className="border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none">
            <option>Semua Wilayah</option>
            <option>Wilayah 1 (Riau)</option>
            <option>Wilayah 2 (Sumatera Selatan)</option>
            <option>Wilayah 3 (Kalimantan Barat)</option>
          </select>
          <select aria-label="Filter Status Proyek" className="border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none">
            <option>Semua Status</option>
            <option>Pelaksanaan (Active)</option>
            <option>Pengadaan</option>
            <option>Selesai</option>
          </select>
          <span className="text-slate-600 ml-auto hidden md:inline">
            Minggu Berjalan: <strong className="text-slate-800">W2 (12 Okt 2026)</strong>
          </span>
        </div>
      </Card>

      {/* Main Gantt Matrix Table Container */}
      <Card className="overflow-hidden border-slate-200">
        <div
          className="overflow-x-auto focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
          tabIndex={0}
          role="region"
          aria-label="Tabel portofolio Gantt matriks mingguan"
        >
          <table className="w-full border-collapse text-xs select-none">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                {/* Sticky Left Column for Identity */}
                <th className="sticky left-0 bg-slate-100 z-20 px-3.5 py-2.5 text-left font-bold border-r border-slate-200 min-w-[220px] sm:min-w-[280px]">
                  Hierarki Pekerjaan & Proses
                </th>
                {MOCK_GANTT_WEEKS.map((w, index) => (
                  <th
                    key={w.id}
                    className={`px-2 py-2 text-center font-semibold border-r border-slate-200 min-w-[58px] ${
                      index === 1 ? 'bg-blue-50/80 text-[#0f2c59]' : ''
                    }`}
                  >
                    <div>{w.label}</div>
                    <div className="text-[10px] font-bold text-slate-700">{w.date}</div>
                    {index === 1 && (
                      <span className="inline-block text-[9px] font-bold text-blue-700 bg-blue-100 px-1 rounded-xs mt-0.5">
                        Kini
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_GANTT_ROWS.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Sticky left identifier */}
                  <td
                    className={`sticky left-0 bg-white z-10 px-3 py-2 border-r border-slate-200 ${
                      row.level === 0
                        ? 'font-bold text-xs bg-slate-50/60 text-slate-900'
                        : row.level === 1
                          ? 'font-semibold pl-6 text-xs text-slate-800'
                          : 'pl-10 text-[11px] text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{row.name}</span>
                      {row.badge && (
                        <span className="text-[10px] text-slate-600 font-medium shrink-0">
                          {row.badge}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Weekly Timeline Cells */}
                  {row.cells.map((cell) => {
                    let cellBg = 'bg-transparent';
                    if (cell.status === 'baseline') cellBg = 'bg-slate-300';
                    if (cell.status === 'rev1') cellBg = 'gantt-stripe-rev1';
                    if (cell.status === 'rev2') cellBg = 'gantt-stripe-rev2';

                    return (
                      <td
                        key={cell.week}
                        className="p-1 border-r border-slate-200 text-center"
                      >
                        <div
                          title={`Status: ${cell.status} ${cell.symbol ? `(${cell.symbol})` : ''}`}
                          className={`h-6 w-full rounded flex items-center justify-center font-bold text-xs transition-transform hover:scale-105 ${cellBg} ${
                            cell.status !== 'none' ? 'text-slate-900 shadow-2xs' : ''
                          }`}
                        >
                          {cell.symbol}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Gantt Legend (Always visible on desktop, toggleable on mobile) */}
      <div className={`p-4 rounded-lg border border-slate-200 bg-white space-y-2 ${showLegend ? 'block' : 'hidden sm:block'}`}>
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
          Legenda Warna & Simbol Gantt Matriks
        </h3>
        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-5 bg-slate-300 rounded-xs border border-slate-400"></span>
            <span><strong>Baseline (Awal):</strong> Abu-abu (dikunci saat dokumen pemicu terbit)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-5 gantt-stripe-rev1 rounded-xs border border-yellow-500"></span>
            <span><strong>Revisi Jadwal #1:</strong> Kuning berpola garis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-5 gantt-stripe-rev2 rounded-xs border border-orange-500"></span>
            <span><strong>Revisi Jadwal #2+:</strong> Oranye berpola garis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-5 w-5 rounded bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-900">#</span>
            <span><strong>Sedang Berjalan:</strong> Pekerjaan fisik / kiriman aktif</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-5 w-5 rounded bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-900">&check;</span>
            <span><strong>Selesai:</strong> Proses rampung 100% / SPK terbit</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <RoleProvider>
      <AppShell>
        <PortfolioContent />
      </AppShell>
    </RoleProvider>
  );
}
