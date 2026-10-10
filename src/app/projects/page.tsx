'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RoleProvider, useRole } from '@/components/prototype/role-context';
import { AppShell } from '@/components/prototype/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPercent, formatDate } from '@/shared/lib/format';
import { MOCK_PROJECTS } from '@/components/prototype/mock-data';
import { Plus, Search, Filter, Eye, ChevronRight, Lock } from 'lucide-react';

function ProjectsContent() {
  const { canMutate, roleLabel } = useRole();
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const filteredProjects = MOCK_PROJECTS.filter((proj) => {
    const matchSearch =
      proj.code.toLowerCase().includes(search.toLowerCase()) ||
      proj.name.toLowerCase().includes(search.toLowerCase()) ||
      proj.company.toLowerCase().includes(search.toLowerCase()) ||
      proj.primaryEstate.toLowerCase().includes(search.toLowerCase());

    const matchRegion = selectedRegion === 'ALL' || proj.region === selectedRegion;
    const matchStatus = selectedStatus === 'ALL' || proj.status === selectedStatus;

    return matchSearch && matchRegion && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Daftar Proyek Water Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Menampilkan seluruh proyek survei, pengadaan, dan pelaksanaan di seluruh wilayah kebun.
          </p>
        </div>

        <div>
          {canMutate ? (
            <Button
              variant="default"
              className="gap-2 text-xs sm:text-sm bg-[#0f2c59]"
              onClick={() => alert('Simulasi: Dialog form pembuatan proyek baru dibuka (Aktif untuk Super Admin & Specialist).')}
            >
              <Plus className="h-4 w-4" /> Buat Proyek Baru
            </Button>
          ) : (
            <div className="inline-block" title="Viewer tidak memiliki izin membuat proyek baru">
              <Button
                variant="outline"
                disabled
                className="gap-2 text-xs sm:text-sm text-slate-400 border-slate-200 cursor-not-allowed"
              >
                <Lock className="h-4 w-4" /> Buat Proyek (Viewer Terkunci)
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Multi-dimension Filter Bar */}
      <Card className="p-4 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode, nama, PT, Estate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
            />
          </div>

          {/* Region Filter */}
          <div>
            <select
              aria-label="Filter Region"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
            >
              <option value="ALL">Semua Region</option>
              <option value="Riau Utara">Riau Utara</option>
              <option value="Riau Selatan">Riau Selatan</option>
              <option value="Kalimantan Barat">Kalimantan Barat</option>
              <option value="Sumatera Selatan">Sumatera Selatan</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              aria-label="Filter Status Proyek"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
            >
              <option value="ALL">Semua Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PROCUREMENT">Pengadaan</option>
              <option value="EXECUTION">Pelaksanaan</option>
              <option value="COMPLETED">Selesai</option>
              <option value="ON_HOLD">Ditahan</option>
            </select>
          </div>

          {/* Result Counter */}
          <div className="flex items-center justify-between sm:justify-end text-xs text-slate-500 px-1">
            <span>Ditemukan: <strong>{filteredProjects.length}</strong> proyek</span>
          </div>
        </div>
      </Card>

      {/* Desktop Table View (hidden on small mobile < 640px) */}
      <div className="hidden sm:block">
        <Card
          className="overflow-x-auto focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
          tabIndex={0}
          role="region"
          aria-label="Tabel daftar proyek"
        >
          <table className="w-full text-left border-collapse table-compact">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-xs">
                <th>Kode & Nama Proyek</th>
                <th>Company</th>
                <th>Estate</th>
                <th>Kategori</th>
                <th>Status</th>
                <th>Progres</th>
                <th>EWS</th>
                <th>Target Selesai</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredProjects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/75 transition-colors">
                  <td>
                    <Link href={`/projects/${p.id}`} className="underline font-semibold text-[#0f2c59] hover:text-[#0f2c59]/80">
                      {p.code}
                    </Link>
                    <div className="text-[11px] text-slate-600 line-clamp-1">{p.name}</div>
                  </td>
                  <td className="text-slate-700 font-medium">{p.company}</td>
                  <td className="text-slate-700">
                    {p.primaryEstate} {p.estatesCount > 1 && <span className="text-slate-600 font-medium">+{p.estatesCount - 1}</span>}
                  </td>
                  <td className="text-slate-700">{p.category}</td>
                  <td>
                    <Badge variant="outline" className="text-[10px]">
                      Proyek: {p.statusLabel}
                    </Badge>
                  </td>
                  <td className="font-semibold text-slate-800">{formatPercent(p.progress)}</td>
                  <td>
                    {p.ewsStatus === 'RED' && (
                      <Badge variant="ewsRed" className="text-[10px]">Merah (+{formatPercent(p.deviation)})</Badge>
                    )}
                    {p.ewsStatus === 'YELLOW' && (
                      <Badge variant="ewsYellow" className="text-[10px]">Kuning (+{formatPercent(p.deviation)})</Badge>
                    )}
                    {p.ewsStatus === 'GREEN' && (
                      <Badge variant="ewsGreen" className="text-[10px]">Hijau ({formatPercent(p.deviation)})</Badge>
                    )}
                  </td>
                  <td className="text-slate-600">{formatDate(p.targetEnd)}</td>
                  <td className="text-right">
                    <Link href={`/projects/${p.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-[#0f2c59]">
                        Workspace &rarr;
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile Card View (optimized for viewport 375px) */}
      <div className="sm:hidden space-y-3">
        {filteredProjects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="block">
            <Card className="p-3.5 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-bold text-xs text-[#0f2c59]">{p.code}</span>
                <Badge variant="outline" className="text-[10px]">
                  Proyek: {p.statusLabel}
                </Badge>
              </div>

              <h2 className="text-xs font-semibold text-slate-900 line-clamp-2 mb-2">
                {p.name}
              </h2>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 border-t border-slate-100 pt-2 mb-2">
                <div>
                  <span className="block text-[10px] text-slate-600 font-medium">Lokasi:</span>
                  <span className="text-slate-800 font-semibold">{p.company} &bull; {p.primaryEstate}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-600 font-medium">Progres / EWS:</span>
                  <span className="text-slate-900 font-bold">{formatPercent(p.progress)} </span>
                  <span className={`text-[10px] font-bold ${p.ewsStatus === 'RED' ? 'text-red-700' : p.ewsStatus === 'YELLOW' ? 'text-amber-800' : 'text-green-800'}`}>
                    ({p.ewsStatus})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#0f2c59] font-medium pt-1">
                <span>Target: {formatDate(p.targetEnd)}</span>
                <span className="flex items-center gap-0.5">Buka <ChevronRight className="h-3 w-3" /></span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <RoleProvider>
      <AppShell>
        <ProjectsContent />
      </AppShell>
    </RoleProvider>
  );
}
