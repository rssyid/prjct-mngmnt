'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency, formatDate } from '@/shared/lib/format';
import { Search, ChevronRight, RefreshCw } from 'lucide-react';

interface ProjectListItem {
  id: string;
  code: string;
  name: string;
  status: string;
  targetStartDate: string;
  targetEndDate: string;
  plannedBudget: string;
  company: { id: string; name: string; code: string };
  category: { id: string; name: string; code: string };
  estates: Array<{
    estateId: string;
    isPrimary: boolean;
    estate: { id: string; name: string; code: string; wilayah?: { regionId: string } };
  }>;
}

interface RegionItem {
  id: string;
  name: string;
  code: string;
}

export function ProjectTable() {
  const [search, setSearch] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Fetch regions for filter
  const { data: regions = [] } = useQuery<RegionItem[]>({
    queryKey: ['master', 'regions'],
    queryFn: async () => {
      const res = await fetch('/api/master/regions?active=true');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch projects from API
  const {
    data: projects = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ProjectListItem[]>({
    queryKey: ['projects', selectedRegionId, selectedStatus, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegionId !== 'ALL') params.append('regionId', selectedRegionId);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal memuat daftar proyek');
      const json = await res.json();
      return json.data || [];
    },
  });

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode atau nama proyek..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
            />
          </div>

          {/* Region Filter (AC-11) */}
          <div>
            <select
              aria-label="Filter Region"
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
            >
              <option value="ALL">Semua Region</option>
              {regions.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name} ({reg.code})
                </option>
              ))}
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
              <option value="SURVEY">Survei</option>
              <option value="RAB_READY">RAB Ready</option>
              <option value="WAITING_AFCE_AR">Menunggu AFCE/AR</option>
              <option value="AFCE_AR_APPROVED">AFCE/AR Disetujui</option>
              <option value="PROCUREMENT">Pengadaan</option>
              <option value="EXECUTION">Pelaksanaan</option>
              <option value="WAITING_BAST">Menunggu BAST</option>
              <option value="COMPLETED">Selesai</option>
              <option value="ON_HOLD">Ditahan</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>

          {/* Refresh & Counter */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-500">
            <span>
              Total: <strong>{projects.length}</strong> proyek
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
              title="Segarkan data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading & Error States */}
      {isLoading && (
        <Card className="p-8 text-center text-xs text-slate-500 bg-white">
          Memuat data proyek dari server...
        </Card>
      )}

      {isError && (
        <Card className="p-8 text-center text-xs text-rose-600 bg-rose-50 border-rose-200">
          Gagal mengambil data proyek. Silakan periksa koneksi Anda dan coba lagi.
        </Card>
      )}

      {!isLoading && !isError && projects.length === 0 && (
        <Card className="p-8 text-center text-xs text-slate-500 bg-white">
          Tidak ada proyek yang sesuai dengan kriteria pencarian dan filter.
        </Card>
      )}

      {/* Desktop Table View */}
      {!isLoading && !isError && projects.length > 0 && (
        <>
          <div className="hidden sm:block">
            <Card
              className="overflow-x-auto focus:outline-none focus:ring-1 focus:ring-[#0f2c59] bg-white border-slate-200"
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
                    <th>Target Selesai</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {projects.map((p) => {
                    const primaryEst =
                      p.estates.find((e) => e.isPrimary)?.estate || p.estates[0]?.estate;
                    const additionalEstatesCount = p.estates.length - 1;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/75 transition-colors">
                        <td>
                          <Link
                            href={`/projects/${p.id}`}
                            className="underline font-semibold text-[#0f2c59] hover:text-[#0f2c59]/80"
                          >
                            {p.code}
                          </Link>
                          <div className="text-[11px] text-slate-600 line-clamp-1">{p.name}</div>
                        </td>
                        <td className="text-slate-700 font-medium">
                          {p.company?.name} ({p.company?.code})
                        </td>
                        <td className="text-slate-700">
                          {primaryEst?.name || '-'}{' '}
                          {additionalEstatesCount > 0 && (
                            <span className="text-slate-600 font-medium">
                              +{additionalEstatesCount}
                            </span>
                          )}
                        </td>
                        <td className="text-slate-700">{p.category?.name || '-'}</td>
                        <td>
                          <StatusBadge type="project" status={p.status} />
                        </td>
                        <td className="text-slate-600">
                          {p.targetEndDate ? formatDate(p.targetEndDate) : '-'}
                        </td>
                        <td className="text-right">
                          <Link href={`/projects/${p.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2 text-[#0f2c59] hover:bg-slate-100"
                            >
                              Workspace &rarr;
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile Card View (< 640px) */}
          <div className="sm:hidden space-y-3">
            {projects.map((p) => {
              const primaryEst =
                p.estates.find((e) => e.isPrimary)?.estate || p.estates[0]?.estate;

              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="block">
                  <Card className="p-3.5 bg-white border-slate-200 hover:border-slate-300 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-xs text-[#0f2c59]">{p.code}</span>
                      <StatusBadge type="project" status={p.status} />
                    </div>

                    <h2 className="text-xs font-semibold text-slate-900 line-clamp-2 mb-2">
                      {p.name}
                    </h2>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 border-t border-slate-100 pt-2 mb-2">
                      <div>
                        <span className="block text-[10px] text-slate-500 font-medium">Lokasi:</span>
                        <span className="text-slate-800 font-semibold">
                          {p.company?.code} &bull; {primaryEst?.name}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-medium">Kategori:</span>
                        <span className="text-slate-800">{p.category?.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#0f2c59] font-medium pt-1">
                      <span>Target: {p.targetEndDate ? formatDate(p.targetEndDate) : '-'}</span>
                      <span className="flex items-center gap-0.5">
                        Buka <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
