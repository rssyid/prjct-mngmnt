'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RoleProvider, useRole } from '@/components/prototype/role-context';
import { AppShell } from '@/components/prototype/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatPercent, formatCurrency, formatDate } from '@/shared/lib/format';
import { MOCK_PROJECTS, MOCK_GANTT_ROWS, MOCK_GANTT_WEEKS } from '@/components/prototype/mock-data';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  MapPin,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Truck,
  Building2,
  Clock,
  Layers,
  History,
} from 'lucide-react';
import { toast } from 'sonner';

function ProjectWorkspaceContent() {
  const params = useParams();
  const projectId = (params?.id as string) || 'proj-1';
  const { canMutate, isSuperAdmin, roleLabel } = useRole();

  const project = MOCK_PROJECTS.find((p) => p.id === projectId) || MOCK_PROJECTS[0]!;
  const [activeTab, setActiveTab] = useState('ringkasan');

  // Modal Dialog States
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [isBastOpen, setIsBastOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States Log Progres
  const [logWeek, setLogWeek] = useState('Minggu ke-8 (12 - 17 Okt 2026)');
  const [logDate, setLogDate] = useState('2026-10-17');
  const [logProgress, setLogProgress] = useState(String(project.progress));
  const [logHours, setLogHours] = useState('42');
  const [logWeather, setLogWeather] = useState('Cuaca cerah berawan, pekerjaan lancar tanpa genangan.');

  // Form States Kiriman Material
  const [deliveryPkg, setDeliveryPkg] = useState('Paket 1: Pipa HDPE 12 Inch');
  const [deliveryDate, setDeliveryDate] = useState('2026-10-15');
  const [deliveryDoNumber, setDeliveryDoNumber] = useState('DO/2026/X/084');
  const [deliveryQty, setDeliveryQty] = useState('150');

  // Form States BAST
  const [bastNumber, setBastNumber] = useState('BAST/WM/2026/001');
  const [bastDate, setBastDate] = useState('2026-10-18');
  const [bastNotes, setBastNotes] = useState('Seluruh pekerjaan saluran dan tanggul telah selesai dan terinspeksi 100%.');

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
      <Card className="p-5 bg-white border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-[#0f2c59] bg-slate-100 px-2 py-0.5 rounded">
                {project.code}
              </span>
              <Badge variant="outline" className="text-xs">
                Proyek: {project.statusLabel}
              </Badge>
              {project.ewsStatus === 'GREEN' && (
                <Badge variant="ewsGreen" className="text-xs">
                  EWS: Hijau (Deviasi {formatPercent(project.deviation)})
                </Badge>
              )}
              {project.ewsStatus === 'YELLOW' && (
                <Badge variant="ewsYellow" className="text-xs">
                  EWS: Kuning (Deviasi +{formatPercent(project.deviation)})
                </Badge>
              )}
              {project.ewsStatus === 'RED' && (
                <Badge variant="ewsRed" className="text-xs">
                  EWS: Merah (Deviasi +{formatPercent(project.deviation)})
                </Badge>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {project.name}
            </h1>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <strong>{project.company}</strong> &bull; {project.region}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                Estate Utama: <strong>{project.primaryEstate}</strong>
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                PIC: {project.pic}
              </span>
            </div>
          </div>

          {/* Quick Metrics Badge / Pill */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 gap-2 shrink-0">
            <div className="text-left md:text-right">
              <span className="block text-[11px] text-slate-400 uppercase font-medium">Progres Berbobot</span>
              <span className="text-2xl font-black text-[#0f2c59]">{formatPercent(project.progress)}</span>
            </div>
            <div className="text-right">
              <span className="block text-[11px] text-slate-400">Anggaran Resmi:</span>
              <span className="text-xs font-bold text-slate-800">{formatCurrency(project.budget)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Panel "Langkah Berikutnya" (Domain Requirement §6) */}
      <Card className="border-blue-200 bg-blue-50/50 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0f2c59] uppercase tracking-wide">
              <ClipboardCheck className="h-4 w-4" /> Langkah Berikutnya (Status: {project.statusLabel})
            </div>
            <p className="text-xs text-slate-700">
              {project.status === 'EXECUTION'
                ? 'Proyek sedang aktif berjalan. Laporkan progres log mingguan atau catat penerimaan material yang tiba di lapangan.'
                : 'Proyek dalam tahap pengadaan tender & penerbitan SPK.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canMutate ? (
              <>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-[#0f2c59] hover:bg-[#163a70] text-xs h-8 text-white"
                  onClick={() => setIsLogOpen(true)}
                >
                  <Clock className="h-3.5 w-3.5 mr-1" /> Isi Log Progres
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 border-slate-300 bg-white hover:bg-slate-50"
                  onClick={() => setIsDeliveryOpen(true)}
                >
                  <Truck className="h-3.5 w-3.5 mr-1" /> Catat Kiriman
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 border-slate-300 bg-white hover:bg-slate-50"
                  onClick={() => setIsBastOpen(true)}
                >
                  Ajukan BAST
                </Button>
              </>
            ) : (
              <Badge variant="outline" className="border-slate-300 text-slate-600 bg-white py-1 px-2.5 text-xs">
                Mode Viewer &bull; Tombol aksi mutasi dinonaktifkan
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Workspace Tabs */}
      <Tabs defaultValue="ringkasan" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="survei">Survei</TabsTrigger>
          <TabsTrigger value="afce">AFCE & BOQ</TabsTrigger>
          <TabsTrigger value="pekerjaan">Pekerjaan</TabsTrigger>
          <TabsTrigger value="paket">Paket Kerja</TabsTrigger>
          <TabsTrigger value="jadwal">Jadwal (Gantt)</TabsTrigger>
          <TabsTrigger value="bast">BAST</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
        </TabsList>

        {/* Tab 1: Ringkasan */}
        <TabsContent value="ringkasan">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Data Pokok Proyek</h3>
              <dl className="grid grid-cols-2 gap-y-2.5 text-xs">
                <dt className="text-slate-500">Kategori Proyek:</dt>
                <dd className="font-medium text-slate-900">{project.category}</dd>
                <dt className="text-slate-500">Target Selesai:</dt>
                <dd className="font-medium text-slate-900">{formatDate(project.targetEnd)}</dd>
                <dt className="text-slate-500">Anggaran Rencana Awal:</dt>
                <dd className="font-medium text-slate-900">{formatCurrency(project.budget)}</dd>
                <dt className="text-slate-500">Anggaran Resmi (INITIAL):</dt>
                <dd className="font-medium text-slate-900">{formatCurrency(project.budget)}</dd>
                <dt className="text-slate-500">Jumlah Estate Terkait:</dt>
                <dd className="font-medium text-slate-900">{project.estatesCount} Estate</dd>
              </dl>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Distribusi Bobot Pekerjaan</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span>1. Canal Bloking Utama (Tender)</span>
                    <span>60,00% (Fisik 70% &bull; Material 30%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-[#0f2c59] h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span>2. Normalisasi Saluran Sekunder (Swakelola)</span>
                    <span>40,00%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                  <span>Total Bobot Proyek Aktif:</span>
                  <strong className="text-slate-900">Tepat 100,00%</strong>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Survei */}
        <TabsContent value="survei">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Data Hasil Survei Lapangan</h3>
              <Badge variant="outline" className="text-xs">Terkunci (AFCE Telah Diajukan)</Badge>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Survei dilaksanakan pada 12 Agustus 2026 oleh Surveyor Tim Water Management HO. Kondisi elevasi gambut dan pasang surut air telah diverifikasi.
            </p>
            <div className="border border-slate-200 rounded-md p-3 bg-slate-50 text-xs text-slate-500">
              Lampiran Spasial: <span className="font-mono text-slate-700">survey-blok-a-polygon.geojson (2,4 MB)</span> &bull; 6 Foto Lapangan terunggah.
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: AFCE & BOQ */}
        <TabsContent value="afce">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">AFCE Attempt #1 &mdash; Status: Approved</h3>
                <p className="text-xs text-slate-500">Keputusan approval dari SAP dicatat oleh user.</p>
              </div>
              <Badge variant="default" className="bg-green-700 text-xs">AFCE Approved</Badge>
            </div>
            <table className="w-full text-xs border-collapse table-compact">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th>Level / Jabatan</th>
                  <th>Approver SAP</th>
                  <th>Tanggal Keputusan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td>Level 1 &bull; Estate Manager (EM)</td>
                  <td>Ir. Supriyadi</td>
                  <td>18 Agu 2026</td>
                  <td><Badge variant="default" className="bg-green-700 text-[10px]">Approved</Badge></td>
                </tr>
                <tr>
                  <td>Level 2 &bull; General Estate Manager (GEM)</td>
                  <td>Drs. H. Mulyono</td>
                  <td>22 Agu 2026</td>
                  <td><Badge variant="default" className="bg-green-700 text-[10px]">Approved</Badge></td>
                </tr>
                <tr>
                  <td>Level 3 &bull; Regional Head (RH)</td>
                  <td>Dr. Hendrawan</td>
                  <td>26 Agu 2026</td>
                  <td><Badge variant="default" className="bg-green-700 text-[10px]">Approved</Badge></td>
                </tr>
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* Tab 4: Pekerjaan */}
        <TabsContent value="pekerjaan">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Daftar Pekerjaan Proyek</h3>
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-900">Canal Bloking Utama &bull; Tender</span>
                  <Badge variant="outline" className="text-[10px]">Bobot: 60,00%</Badge>
                </div>
                <p className="text-xs text-slate-500">SPK #001/SPK-WM/2026 (CV Bina Tirta) &bull; Progres Fisik: 75%</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-900">Normalisasi Saluran Sekunder &bull; Swakelola</span>
                  <Badge variant="outline" className="text-[10px]">Bobot: 40,00%</Badge>
                </div>
                <p className="text-xs text-slate-500">SPK Internal Kebun &bull; Progres Fisik: 50%</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 5: Paket Kerja */}
        <TabsContent value="paket">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Paket Kerja Pengadaan Material</h3>
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-slate-900">Pengadaan Pintu Klep Baja 120cm</span>
                <Badge variant="outline" className="text-[10px]">Status: Pengiriman Bertahap</Badge>
              </div>
              <p className="text-xs text-slate-500 mb-2">PR #PR-089 &bull; PO #PO-551 &bull; Vendor: PT Steel Perkasa</p>
              <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                Item: 10 Unit Pintu Klep &bull; Diterima: 7 Unit &bull; Sisa: 3 Unit
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 6: Jadwal (Gantt) */}
        <TabsContent value="jadwal">
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Gantt Matriks Mingguan Proyek</h3>
                <p className="text-xs text-slate-500">W1 = Senin paling awal &bull; Warna sesuai baseline/revisi</p>
              </div>
              <Link href="/portfolio">
                <Button size="sm" variant="outline" className="text-xs h-8">
                  Buka Portofolio Lengkap
                </Button>
              </Link>
            </div>

            {/* Compact Gantt Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <th className="sticky left-0 bg-slate-50 z-10 px-3 py-2 text-left font-semibold border-r border-slate-200 min-w-[200px]">
                      Pekerjaan / Attempt
                    </th>
                    {MOCK_GANTT_WEEKS.map((w) => (
                      <th key={w.id} className="px-2 py-1.5 text-center font-medium border-r border-slate-200 min-w-[50px]">
                        <div>{w.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{w.date}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MOCK_GANTT_ROWS.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td
                        className={`sticky left-0 bg-white z-10 px-3 py-2 border-r border-slate-200 text-slate-800 ${
                          row.level === 0 ? 'font-bold text-xs' : row.level === 1 ? 'font-semibold pl-6 text-xs' : 'pl-10 text-[11px] text-slate-600'
                        }`}
                      >
                        {row.name}
                      </td>
                      {row.cells.map((cell) => {
                        let bgClass = 'bg-transparent';
                        if (cell.status === 'baseline') bgClass = 'bg-slate-300';
                        if (cell.status === 'rev1') bgClass = 'gantt-stripe-rev1';
                        if (cell.status === 'rev2') bgClass = 'gantt-stripe-rev2';

                        return (
                          <td
                            key={cell.week}
                            className="p-1 border-r border-slate-200 text-center"
                          >
                            <div
                              className={`h-6 w-full rounded flex items-center justify-center font-bold text-xs ${bgClass} ${
                                cell.status === 'none' ? '' : 'text-slate-800 shadow-2xs'
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

            {/* Gantt Legend */}
            <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase">
                Legenda Warna & Simbol Gantt Matriks
              </h4>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-4 bg-slate-300 rounded-xs"></span> Baseline (Awal)
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-4 gantt-stripe-rev1 rounded-xs"></span> Revisi #1 (Kuning Garis)
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-4 gantt-stripe-rev2 rounded-xs"></span> Revisi #2 (Oranye Garis)
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">#</span> Sedang Berjalan
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">&check;</span> Selesai
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 7: BAST */}
        <TabsContent value="bast">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Berita Acara Serah Terima (BAST)</h3>
            <p className="text-xs text-slate-600">
              Pengajuan BAST hanya dapat dilakukan setelah seluruh progres fisik pekerjaan mencapai 100%. Pembayaran dan kelengkapan material tidak menghalangi pengajuan.
            </p>
          </Card>
        </TabsContent>

        {/* Tab 8: Riwayat */}
        <TabsContent value="riwayat">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Riwayat Status & Audit Proyek</h3>
            <p className="text-xs text-slate-500 mb-3">Tabel riwayat bersifat append-only dan tidak pernah dihapus.</p>
            <ul className="divide-y divide-slate-100 text-xs">
              <li className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Transisi: PROCUREMENT &rarr; EXECUTION</span>
                  <p className="text-[11px] text-slate-500">Dipicu: Kiriman pertama material DO-998 tiba di kebun</p>
                </div>
                <span className="text-slate-400">12 Sep 2026</span>
              </li>
              <li className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Transisi: AFCE_AR_APPROVED &rarr; PROCUREMENT</span>
                  <p className="text-[11px] text-slate-500">Dipicu: Penerbitan USPK #001/USPK/2026</p>
                </div>
                <span className="text-slate-400">28 Agu 2026</span>
              </li>
              <li className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Transisi: WAITING_AFCE_AR &rarr; AFCE_AR_APPROVED</span>
                  <p className="text-[11px] text-slate-500">Dipicu: Level terakhir RH disetujui di SAP</p>
                </div>
                <span className="text-slate-400">26 Agu 2026</span>
              </li>
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Dialog 1: Log Progres Mingguan */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pencatatan Log Progres Mingguan</DialogTitle>
            <DialogDescription>
              Laporkan realisasi progres fisik lapangan dan catatan operasional alat berat.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setIsSubmitting(true);
              setTimeout(() => {
                setIsSubmitting(false);
                setIsLogOpen(false);
                toast.success('Log progres mingguan berhasil dicatat dan deviasi diperbarui!');
              }, 400);
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="log-week">Periode Minggu Pelaksanaan</Label>
              <Input id="log-week" value={logWeek} onChange={(e) => setLogWeek(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="log-date">Tanggal Laporan *</Label>
                <Input id="log-date" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required disabled={isSubmitting} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="log-prog">Realisasi Progres Kumulatif (%) *</Label>
                <Input id="log-prog" type="number" step="0.1" value={logProgress} onChange={(e) => setLogProgress(e.target.value)} required disabled={isSubmitting} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-hours">Jam Kerja Alat Berat (Hour Meter) *</Label>
              <Input id="log-hours" type="number" value={logHours} onChange={(e) => setLogHours(e.target.value)} placeholder="mis. 42" required disabled={isSubmitting} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-weather">Catatan Cuaca & Kendala Lapangan</Label>
              <textarea
                id="log-weather"
                rows={2}
                value={logWeather}
                onChange={(e) => setLogWeather(e.target.value)}
                disabled={isSubmitting}
                className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-photo">Dokumentasi Foto Lapangan (Opsional)</Label>
              <Input id="log-photo" type="file" accept="image/*" disabled={isSubmitting} className="text-xs bg-slate-50" />
              <p className="text-[11px] text-slate-500">Maks. 5 MB per foto (dikompresi di peramban sebelum upload).</p>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsLogOpen(false)} disabled={isSubmitting}>Batal</Button>
              <Button type="submit" className="bg-[#0f2c59] hover:bg-[#163a70] text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Log Progres'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Kiriman Material */}
      <Dialog open={isDeliveryOpen} onOpenChange={setIsDeliveryOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pencatatan Kiriman Material</DialogTitle>
            <DialogDescription>
              Catat penerimaan material yang tiba di lokasi kebun berdasarkan surat jalan / DO vendor.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setIsSubmitting(true);
              setTimeout(() => {
                setIsSubmitting(false);
                setIsDeliveryOpen(false);
                toast.success('Penerimaan kiriman material berhasil dicatat!');
              }, 400);
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="del-pkg">Paket Kerja Terkait *</Label>
              <select
                id="del-pkg"
                value={deliveryPkg}
                onChange={(e) => setDeliveryPkg(e.target.value)}
                disabled={isSubmitting}
                className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white"
              >
                <option value="Paket 1: Pipa HDPE 12 Inch">Paket 1: Pipa HDPE 12 Inch (Vendor PT Sumber Makmur)</option>
                <option value="Paket 2: Geotekstil Non-Woven">Paket 2: Geotekstil Non-Woven (Vendor PT Duta Tirta)</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="del-date">Tanggal Penerimaan *</Label>
                <Input id="del-date" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required disabled={isSubmitting} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="del-do">Nomor Surat Jalan (DO) *</Label>
                <Input id="del-do" value={deliveryDoNumber} onChange={(e) => setDeliveryDoNumber(e.target.value)} placeholder="DO/2026/..." required disabled={isSubmitting} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="del-qty">Volume Diterima *</Label>
              <Input id="del-qty" type="number" value={deliveryQty} onChange={(e) => setDeliveryQty(e.target.value)} required disabled={isSubmitting} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDeliveryOpen(false)} disabled={isSubmitting}>Batal</Button>
              <Button type="submit" className="bg-[#0f2c59] hover:bg-[#163a70] text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Penerimaan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 3: Pengajuan BAST */}
      <Dialog open={isBastOpen} onOpenChange={setIsBastOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pengajuan Berita Acara Serah Terima (BAST)</DialogTitle>
            <DialogDescription>
              Ajukan BAST untuk menyelesaikan proyek. Setelah diajukan, status proyek beralih ke WAITING_BAST dan mutasi dikunci.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setIsSubmitting(true);
              setTimeout(() => {
                setIsSubmitting(false);
                setIsBastOpen(false);
                toast.success('Pengajuan BAST berhasil dikirim! Menunggu verifikasi.');
              }, 400);
            }}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bast-no">Nomor Dokumen BAST *</Label>
                <Input id="bast-no" value={bastNumber} onChange={(e) => setBastNumber(e.target.value)} required disabled={isSubmitting} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bast-date">Tanggal Pengajuan *</Label>
                <Input id="bast-date" type="date" value={bastDate} onChange={(e) => setBastDate(e.target.value)} required disabled={isSubmitting} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bast-notes">Catatan & Pernyataan Penyelesaian</Label>
              <textarea
                id="bast-notes"
                rows={3}
                value={bastNotes}
                onChange={(e) => setBastNotes(e.target.value)}
                disabled={isSubmitting}
                className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsBastOpen(false)} disabled={isSubmitting}>Batal</Button>
              <Button type="submit" className="bg-[#0f2c59] hover:bg-[#163a70] text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan BAST'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
