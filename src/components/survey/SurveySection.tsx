'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/shared/lib/format';
import { toast } from 'sonner';
import {
  Compass,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface SurveyData {
  surveyStartDate: string | null;
  surveyEndDate: string | null;
  surveyCompletedAt: string | null;
  gisLayersUrl: string | null;
  notes: string | null;
}

interface SurveySectionProps {
  projectId: string;
  projectStatus: string;
  canMutate: boolean;
}

export function SurveySection({ projectId, projectStatus, canMutate }: SurveySectionProps) {
  const queryClient = useQueryClient();

  // Fetch survey data
  const { data: survey, isLoading } = useQuery<SurveyData | null>({
    queryKey: ['survey', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/survey`);
      if (!res.ok) throw new Error('Gagal memuat data survei');
      const json = await res.json();
      return json.data;
    },
  });

  // Start Survey Form State
  const [surveyStartDate, setSurveyStartDate] = useState('');
  const [surveyEndDate, setSurveyEndDate] = useState('');
  const [gisLayersUrl, setGisLayersUrl] = useState('');
  const [surveyNotes, setSurveyNotes] = useState('');

  // Start Survey Mutation (DRAFT -> SURVEY)
  const startSurveyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/start-survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal memulai survei');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Survei proyek resmi dimulai (Status: SURVEY)');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['survey', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-history', projectId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Complete Survey Mutation (SURVEY -> RAB_READY)
  const completeSurveyMutation = useMutation({
    mutationFn: async () => {
      if (!surveyStartDate) throw new Error('Tanggal mulai survei wajib diisi');
      if (!surveyEndDate) throw new Error('Tanggal selesai survei wajib diisi');
      if (surveyStartDate > surveyEndDate) {
        throw new Error('Tanggal mulai survei tidak boleh lebih besar dari tanggal selesai');
      }

      const res = await fetch(`/api/projects/${projectId}/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyStartDate,
          surveyEndDate,
          gisLayersUrl: gisLayersUrl.trim() || null,
          notes: surveyNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal menyelesaikan survei');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Survei berhasil diselesaikan dan status proyek beralih ke RAB_READY!');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['survey', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-history', projectId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <Card className="p-5 text-xs text-slate-500">Memuat data survei proyek...</Card>;
  }

  // Case 1: Proyek masih DRAFT
  if (projectStatus === 'DRAFT') {
    return (
      <Card className="p-6 bg-white border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-[#0f2c59]" />
          <h3 className="text-base font-bold text-slate-900">Tahap Survei Lapangan & GIS</h3>
        </div>
        <p className="text-xs text-slate-600 max-w-2xl">
          Proyek saat ini masih berstatus <strong>DRAFT</strong>. Klik tombol di bawah untuk memulai
          survei lapangan secara resmi. Proyek akan beralih ke status <strong>SURVEY</strong>.
        </p>

        {canMutate ? (
          <Button
            onClick={() => startSurveyMutation.mutate()}
            disabled={startSurveyMutation.isPending}
            className="bg-[#0f2c59] hover:bg-[#163a70] text-white text-xs gap-2"
          >
            <Compass className="h-4 w-4" />
            {startSurveyMutation.isPending ? 'Memproses...' : 'Mulai Survei Lapangan'}
          </Button>
        ) : (
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Lock className="h-4 w-4" /> Role Viewer tidak dapat memulai survei.
          </div>
        )}
      </Card>
    );
  }

  // Case 2: Proyek sedang berstatus SURVEY
  if (projectStatus === 'SURVEY') {
    return (
      <Card className="p-6 bg-white border-slate-200 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-sky-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Input Hasil Survei Lapangan</h3>
              <p className="text-xs text-slate-500">
                Lengkapi tanggal pelaksanaan survei dan tautan layer WebGIS / peta sebelum mengunci ke RAB_READY.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            completeSurveyMutation.mutate();
          }}
          className="space-y-4 text-xs max-w-2xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="survey-start">Tanggal Mulai Survei *</Label>
              <Input
                id="survey-start"
                type="date"
                value={surveyStartDate}
                onChange={(e) => setSurveyStartDate(e.target.value)}
                required
                disabled={!canMutate || completeSurveyMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="survey-end">Tanggal Selesai Survei *</Label>
              <Input
                id="survey-end"
                type="date"
                value={surveyEndDate}
                onChange={(e) => setSurveyEndDate(e.target.value)}
                required
                disabled={!canMutate || completeSurveyMutation.isPending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="survey-gis">Tautan Layer WebGIS / Peta Spasial (Opsional)</Label>
            <Input
              id="survey-gis"
              type="url"
              placeholder="https://gis.perkebunan.internal/layers/wm-2026-..."
              value={gisLayersUrl}
              onChange={(e) => setGisLayersUrl(e.target.value)}
              disabled={!canMutate || completeSurveyMutation.isPending}
            />
            <p className="text-[11px] text-slate-500">
              Tautan menuju dashboard peta, KML/GeoJSON viewer, atau shapefile proyek.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="survey-notes">Catatan & Temuan Hasil Survei</Label>
            <textarea
              id="survey-notes"
              rows={3}
              value={surveyNotes}
              onChange={(e) => setSurveyNotes(e.target.value)}
              placeholder="Kondisi tanggul eksisting, debit pasang surut, kendala akses alat berat..."
              disabled={!canMutate || completeSurveyMutation.isPending}
              className="w-full border border-slate-300 rounded-md p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
            />
          </div>

          {canMutate ? (
            <div className="pt-2">
              <Button
                type="submit"
                disabled={completeSurveyMutation.isPending}
                className="bg-[#0f2c59] hover:bg-[#163a70] text-white text-xs gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {completeSurveyMutation.isPending
                  ? 'Menyimpan...'
                  : 'Selesaikan Survei & Kunci RAB (Beralih ke RAB_READY)'}
              </Button>
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-2">
              <Lock className="h-4 w-4" /> Role Viewer tidak dapat menyimpan hasil survei.
            </div>
          )}
        </form>
      </Card>
    );
  }

  // Case 3: Survei sudah selesai (RAB_READY, WAITING_AFCE_AR, dll)
  return (
    <Card className="p-6 bg-white border-slate-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">Hasil Survei Lapangan (Selesai)</h3>
        </div>
        <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
          Survei Tuntas
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
        <div className="space-y-1">
          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
            <Calendar className="h-3 w-3" /> Periode Pelaksanaan Survei
          </span>
          <span className="font-semibold text-slate-800">
            {survey?.surveyStartDate ? formatDate(survey.surveyStartDate) : '-'} s.d.{' '}
            {survey?.surveyEndDate ? formatDate(survey.surveyEndDate) : '-'}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 text-[11px]">Tanggal Kunci Survei</span>
          <span className="font-semibold text-slate-800">
            {survey?.surveyCompletedAt ? formatDate(survey.surveyCompletedAt) : '-'}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 text-[11px]">Peta & Layer WebGIS</span>
          {survey?.gisLayersUrl ? (
            <a
              href={survey.gisLayersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#0f2c59] underline font-semibold hover:text-[#0f2c59]/80"
            >
              Buka WebGIS <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-slate-400 italic">Tidak ada tautan GIS</span>
          )}
        </div>
      </div>

      {survey?.notes && (
        <div className="pt-2 text-xs">
          <span className="text-slate-500 font-medium block mb-1">Catatan Hasil Survei:</span>
          <p className="bg-slate-50 p-3 rounded-md text-slate-700 border border-slate-100">
            {survey.notes}
          </p>
        </div>
      )}
    </Card>
  );
}
