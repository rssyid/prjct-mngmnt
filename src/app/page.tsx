'use client';

import React from 'react';
import Link from 'next/link';
import { RoleProvider } from '@/components/prototype/role-context';
import { AppShell } from '@/components/prototype/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPercent, formatCurrency, formatDate } from '@/shared/lib/format';
import { MOCK_PROJECTS } from '@/components/prototype/mock-data';
import { AlertTriangle, CheckCircle2, Clock, Activity, ArrowUpRight, FolderKanban } from 'lucide-react';

function DashboardContent() {
  const totalProjects = MOCK_PROJECTS.length;
  const executionCount = MOCK_PROJECTS.filter((p) => p.status === 'EXECUTION').length;
  const procurementCount = MOCK_PROJECTS.filter((p) => p.status === 'PROCUREMENT').length;
  const completedCount = MOCK_PROJECTS.filter((p) => p.status === 'COMPLETED').length;
  const onHoldCount = MOCK_PROJECTS.filter((p) => p.status === 'ON_HOLD').length;

  const ewsGreenCount = MOCK_PROJECTS.filter((p) => p.ewsStatus === 'GREEN').length;
  const ewsYellowCount = MOCK_PROJECTS.filter((p) => p.ewsStatus === 'YELLOW').length;
  const ewsRedCount = MOCK_PROJECTS.filter((p) => p.ewsStatus === 'RED').length;

  // 10 terbesar deviasi
  const topDeviations = [...MOCK_PROJECTS].sort((a, b) => b.deviation - a.deviation);

  // Belum ada log minggu ini
  const pendingLogs = MOCK_PROJECTS.filter((p) => !p.hasWeeklyLogThisWeek && p.status === 'EXECUTION');

  return (
    <div className="space-y-6">
      {/* Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard Portofolio Water Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ringkasan progres berbobot, status EWS terhadap baseline, dan pengawasan proyek perkebunan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/projects">
            <Button variant="default" className="gap-1.5 text-xs sm:text-sm">
              <FolderKanban className="h-4 w-4" /> Buka Daftar Proyek
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Total Proyek
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">{totalProjects}</div>
            <p className="text-xs text-slate-500 mt-1">
              {executionCount} Berjalan &bull; {procurementCount} Pengadaan &bull; {completedCount} Selesai
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Rata-rata Progres
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#0f2c59]">{formatPercent(65.4)}</div>
            <p className="text-xs text-slate-500 mt-1">
              Berbobot proyek aktif (Contoh uji AC-49)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Peringatan Dini (EWS)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="ewsGreen" className="px-2">{ewsGreenCount} Hijau</Badge>
              <Badge variant="ewsYellow" className="px-2">{ewsYellowCount} Kuning</Badge>
              <Badge variant="ewsRed" className="px-2">{ewsRedCount} Merah</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              1 proyek deviasi kritis (&gt; 10%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Pengingat Log Progres
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600">
              {pendingLogs.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pekerjaan belum lapor minggu ini
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: 10 Deviasi Terbesar & Pengingat Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 10 Deviasi Terbesar */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Deviasi Progres Terhadap Baseline
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Diurutkan dari deviasi terbesar (rencana baseline &minus; aktual)
                </p>
              </div>
              <Link href="/portfolio" className="text-xs text-[#0f2c59] font-medium hover:underline flex items-center gap-1">
                Gantt Portofolio <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent
              className="p-0 overflow-x-auto focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
              tabIndex={0}
              role="region"
              aria-label="Tabel deviasi progres terhadap baseline"
            >
              <table className="w-full text-left border-collapse table-compact">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-700 font-semibold">
                    <th>Kode & Nama Proyek</th>
                    <th>Company / Estate</th>
                    <th>Status</th>
                    <th>Progres</th>
                    <th>Deviasi EWS</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {topDeviations.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="font-medium text-slate-900">
                        <Link href={`/projects/${proj.id}`} className="underline font-semibold text-[#0f2c59] hover:text-[#0f2c59]/80">
                          {proj.code}
                        </Link>
                        <div className="text-[11px] text-slate-600 line-clamp-1">{proj.name}</div>
                      </td>
                      <td className="text-slate-600">
                        {proj.company} &bull; {proj.primaryEstate}
                      </td>
                      <td>
                        <Badge variant="outline" className="text-[10px]">
                          Proyek: {proj.statusLabel}
                        </Badge>
                      </td>
                      <td className="font-semibold text-slate-800">
                        {formatPercent(proj.progress)}
                      </td>
                      <td>
                        {proj.ewsStatus === 'RED' && (
                          <Badge variant="ewsRed" className="text-[10px]">
                            Merah (+{formatPercent(proj.deviation)})
                          </Badge>
                        )}
                        {proj.ewsStatus === 'YELLOW' && (
                          <Badge variant="ewsYellow" className="text-[10px]">
                            Kuning (+{formatPercent(proj.deviation)})
                          </Badge>
                        )}
                        {proj.ewsStatus === 'GREEN' && (
                          <Badge variant="ewsGreen" className="text-[10px]">
                            Hijau ({formatPercent(proj.deviation)})
                          </Badge>
                        )}
                      </td>
                      <td className="text-right">
                        <Link href={`/projects/${proj.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-[#0f2c59]">
                            Detail
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Pengingat Log Mingguan */}
        <div>
          <Card className="h-full flex flex-col">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" /> Pengingat Log Mingguan
              </CardTitle>
              <p className="text-xs text-slate-600 mt-0.5">
                Proyek dalam pelaksanaan yang belum memiliki catatan log per hari Senin minggu ini
              </p>
            </CardHeader>
            <CardContent className="p-4 flex-1 space-y-3">
              {pendingLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-600">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  Semua proyek pelaksanaan telah melaporkan log minggu ini.
                </div>
              ) : (
                pendingLogs.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">{item.code}</span>
                      <Badge variant="ewsYellow" className="text-[10px]">Perlu Log</Badge>
                    </div>
                    <p className="text-[11px] text-slate-700 line-clamp-1">{item.name}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                      <span>PIC: {item.pic}</span>
                      <Link href={`/projects/${item.id}`} className="text-[#0f2c59] font-medium hover:underline">
                        Input Log &rarr;
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RoleProvider>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </RoleProvider>
  );
}
