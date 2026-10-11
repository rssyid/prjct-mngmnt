'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RoleProvider, useRole } from '@/components/prototype/role-context';
import { AppShell } from '@/components/prototype/app-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { ProjectHistoryTimeline } from '@/components/projects/ProjectHistoryTimeline';
import { SurveySection } from '@/components/survey/SurveySection';
import { AfceAttemptList } from '@/components/afce/AfceAttemptList';
import { BudgetOverviewCard } from '@/components/budget/BudgetOverviewCard';
import { ArSupplementSection } from '@/components/budget/ArSupplementSection';
import { NextActionPanel } from '@/components/common/NextActionPanel';
import { formatCurrency, formatDate } from '@/shared/lib/format';
import {
  ArrowLeft,
  Compass,
  FileText,
  DollarSign,
  History,
  LayoutDashboard,
  Building2,
  MapPin,
  Calendar,
} from 'lucide-react';

interface ProjectDetailDto {
  id: string;
  code: string;
  name: string;
  status: string;
  targetStartDate: string;
  targetEndDate: string;
  plannedBudget: string | number;
  notes: string | null;
  company: { id: string; name: string; code: string };
  category: { id: string; name: string; code: string };
  picUser: { id: string; name: string; email: string } | null;
  estates: Array<{
    estateId: string;
    isPrimary: boolean;
    estate: { id: string; name: string; code: string };
  }>;
}

function ProjectWorkspaceContent() {
  const params = useParams();
  const projectId = params?.id as string;
  const { canMutate } = useRole();
  const [activeTab, setActiveTab] = useState('ringkasan');

  const {
    data: project,
    isLoading,
    isError,
  } = useQuery<ProjectDetailDto>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Gagal memuat detail proyek');
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(projectId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-slate-200 animate-pulse rounded" />
        <Card className="p-8 text-center text-xs text-slate-500 bg-white">
          Memuat workspace proyek...
        </Card>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="space-y-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Daftar Proyek
        </Link>
        <Card className="p-8 text-center text-xs text-rose-600 bg-rose-50 border-rose-200">
          Proyek tidak ditemukan atau gagal dimuat dari server.
        </Card>
      </div>
    );
  }

  // Next Action computation
  const getNextActions = () => {
    switch (project.status) {
      case 'DRAFT':
        return [
          {
            id: 'start-survey',
            label: 'Mulai Survei',
            description:
              'Parameter dasar proyek telah terdaftar. Langkah berikutnya adalah memulai survei lapangan dan pemetaan GIS.',
            actionText: 'Buka Tab Survei',
            onClick: () => setActiveTab('survei'),
          },
        ];
      case 'SURVEY':
        return [
          {
            id: 'complete-survey',
            label: 'Selesaikan Survei',
            description:
              'Survei sedang berlangsung. Masukkan tanggal pelaksanaan dan tautan WebGIS untuk menyelesaikan survei dan mengunci ke RAB_READY.',
            actionText: 'Input Hasil Survei',
            onClick: () => setActiveTab('survei'),
          },
        ];
      case 'RAB_READY':
        return [
          {
            id: 'create-afce',
            label: 'Susun Dokumen AFCE',
            description:
              'Survei telah tuntas dan proyek siap untuk penyusunan rincian BOQ serta pengajuan dokumen AFCE ke SAP.',
            actionText: 'Kelola AFCE & BOQ',
            onClick: () => setActiveTab('afce'),
          },
        ];
      case 'WAITING_AFCE_AR':
        return [
          {
            id: 'record-approval',
            label: 'Persetujuan SAP',
            description:
              'Dokumen AFCE sedang diajukan. Catat keputusan pejabat approver di SAP level demi level.',
            actionText: 'Catat Persetujuan SAP',
            onClick: () => setActiveTab('afce'),
          },
        ];
      case 'AFCE_AR_APPROVED':
        return [
          {
            id: 'to-procurement',
            label: 'Siap Pengadaan (F3)',
            description:
              'AFCE telah disetujui penuh oleh SAP dan Anggaran Resmi telah tercatat. Proyek siap untuk paket kerja dan tender.',
            actionText: 'Lihat Anggaran Resmi',
            onClick: () => setActiveTab('anggaran'),
          },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Daftar Proyek
        </Link>
      </div>

      {/* Workspace Header */}
      <ProjectHeader project={project} canMutate={canMutate} />

      {/* Next Action Banner */}
      <NextActionPanel
        currentStatus={project.status}
        actions={getNextActions()}
      />

      {/* Tabs Layout */}
      <Tabs defaultValue="ringkasan" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-200/80 p-1 rounded-lg">
          <TabsTrigger value="ringkasan" className="text-xs gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" /> Ringkasan
          </TabsTrigger>
          <TabsTrigger value="survei" className="text-xs gap-1.5">
            <Compass className="h-3.5 w-3.5" /> Survei & Peta
          </TabsTrigger>
          <TabsTrigger value="afce" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" /> AFCE & Approval
          </TabsTrigger>
          <TabsTrigger value="anggaran" className="text-xs gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Anggaran & AR
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="text-xs gap-1.5">
            <History className="h-3.5 w-3.5" /> Riwayat Status
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Ringkasan */}
        <TabsContent value="ringkasan" className="space-y-4">
          <Card className="p-5 bg-white border-slate-200 shadow-2xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Informasi Umum & Lingkup Proyek
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <span className="text-slate-400 block text-[11px]">Nama Proyek</span>
                <span className="font-semibold text-slate-900">{project.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Kategori</span>
                <span className="font-semibold text-slate-900">{project.category?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">PIC HO Specialist</span>
                <span className="font-semibold text-slate-900">
                  {project.picUser?.name || project.picUser?.email || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Company (PT)</span>
                <span className="font-semibold text-slate-900">
                  {project.company?.name} ({project.company?.code})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Daftar Estate</span>
                <div className="space-y-0.5">
                  {project.estates.map((e) => (
                    <span key={e.estateId} className="block text-slate-800">
                      {e.estate.name} ({e.estate.code}) {e.isPrimary && '★ Utama'}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Rencana Anggaran Awal</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatCurrency(project.plannedBudget)}
                </span>
              </div>
            </div>

            {project.notes && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block text-[11px] mb-1">Catatan Tambahan:</span>
                <p className="bg-slate-50 p-3 rounded text-slate-700 border border-slate-100">
                  {project.notes}
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab 2: Survei & Peta */}
        <TabsContent value="survei">
          <SurveySection
            projectId={project.id}
            projectStatus={project.status}
            canMutate={canMutate}
          />
        </TabsContent>

        {/* Tab 3: AFCE & Approval */}
        <TabsContent value="afce">
          <AfceAttemptList
            projectId={project.id}
            projectStatus={project.status}
            canMutate={canMutate}
          />
        </TabsContent>

        {/* Tab 4: Anggaran & AR */}
        <TabsContent value="anggaran" className="space-y-6">
          <BudgetOverviewCard projectId={project.id} />
          <ArSupplementSection
            projectId={project.id}
            projectStatus={project.status}
            canMutate={canMutate}
          />
        </TabsContent>

        {/* Tab 5: Riwayat Status */}
        <TabsContent value="riwayat">
          <ProjectHistoryTimeline projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ProjectWorkspacePage() {
  return (
    <RoleProvider>
      <AppShell>
        <ProjectWorkspaceContent />
      </AppShell>
    </RoleProvider>
  );
}
