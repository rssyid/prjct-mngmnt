'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RoleProvider } from '@/components/prototype/role-context';
import { AppShell } from '@/components/prototype/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type MasterTab =
  | 'units'
  | 'vendors'
  | 'materials'
  | 'project-categories'
  | 'heavy-equipment-types'
  | 'approval-positions'
  | 'regions'
  | 'wilayah'
  | 'companies'
  | 'estates';

interface MasterRecord {
  id: string;
  code?: string;
  name: string;
  isActive: boolean;
  order?: number;
  rank?: number;
  isComplete?: boolean;
  type?: string;
  companyId?: string;
  wilayahId?: string;
  regionId?: string;
  estateNew?: string | null;
  legacyCode?: string | null;
  company?: { id?: string; code?: string; name: string };
  wilayah?: { id?: string; name: string; region?: { id?: string; code?: string; name: string } };
  region?: { id?: string; code?: string; name: string };
  [key: string]: unknown;
}

function MasterDataContent() {
  const [currentTab, setCurrentTab] = useState<MasterTab>('units');
  const [data, setData] = useState<MasterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [userRole, setUserRole] = useState<string>('MANAGEMENT_VIEWER');

  // Dialog Tambah / Ubah
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [formWilayahId, setFormWilayahId] = useState('');
  const [formRegionId, setFormRegionId] = useState('');
  const [formEstateNew, setFormEstateNew] = useState('');
  const [formLegacyCode, setFormLegacyCode] = useState('');
  const [companiesList, setCompaniesList] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [wilayahList, setWilayahList] = useState<Array<{ id: string; name: string }>>([]);
  const [regionsList, setRegionsList] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ambil profil sesi untuk mengetahui peran (AC-02)
  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.role) {
          setUserRole(json.data.role);
        }
      })
      .catch(() => {});
  }, []);

  const isViewer = userRole === 'MANAGEMENT_VIEWER';

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.set('active', activeFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/master/${currentTab}?${params.toString()}`);
      if (!res.ok) {
        toast.error('Gagal memuat data master');
        return;
      }
      const json = await res.json();
      setData(json.data || []);
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsLoading(false);
    }
  }, [currentTab, activeFilter, searchQuery]);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams();
    if (activeFilter !== 'all') params.set('active', activeFilter);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());

    fetch(`/api/master/${currentTab}?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json) => {
        if (isMounted) setData(json.data || []);
      })
      .catch(() => {
        if (isMounted) toast.error('Gagal memuat data master');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentTab, activeFilter, searchQuery]);

  const loadDropdowns = async (tab: MasterTab) => {
    if (tab === 'estates') {
      if (companiesList.length === 0) {
        try {
          const res = await fetch('/api/master/companies');
          const json = await res.json();
          if (json.data) setCompaniesList(json.data);
        } catch {}
      }
      if (wilayahList.length === 0) {
        try {
          const res = await fetch('/api/master/wilayah');
          const json = await res.json();
          if (json.data) setWilayahList(json.data);
        } catch {}
      }
    } else if (tab === 'wilayah') {
      if (regionsList.length === 0) {
        try {
          const res = await fetch('/api/master/regions');
          const json = await res.json();
          if (json.data) setRegionsList(json.data);
        } catch {}
      }
    }
  };

  const handleOpenCreate = () => {
    setDialogMode('create');
    setSelectedId(null);
    setFormName('');
    setFormCode('');
    setFormCompanyId('');
    setFormWilayahId('');
    setFormRegionId('');
    setFormEstateNew('');
    setFormLegacyCode('');
    loadDropdowns(currentTab);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: MasterRecord) => {
    setDialogMode('edit');
    setSelectedId(item.id);
    setFormName(item.name || '');
    setFormCode(item.code || '');
    setFormCompanyId(item.companyId || item.company?.id || '');
    setFormWilayahId(item.wilayahId || item.wilayah?.id || '');
    setFormRegionId(item.regionId || item.region?.id || item.wilayah?.region?.id || '');
    setFormEstateNew(item.estateNew || '');
    setFormLegacyCode(item.legacyCode || '');
    loadDropdowns(currentTab);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload: Record<string, unknown> = { name: formName };
      if (['units', 'project-categories', 'approval-positions', 'regions', 'companies', 'estates'].includes(currentTab)) {
        payload.code = formCode;
      }
      if (currentTab === 'estates') {
        payload.companyId = formCompanyId;
        payload.wilayahId = formWilayahId;
        payload.estateNew = formEstateNew.trim() || null;
        payload.legacyCode = formLegacyCode.trim() || null;
      }
      if (currentTab === 'wilayah') {
        payload.regionId = formRegionId;
      }
      if (currentTab === 'approval-positions' && dialogMode === 'create') {
        payload.rank = data.length + 1;
      }

      const url =
        dialogMode === 'create'
          ? `/api/master/${currentTab}`
          : `/api/master/${currentTab}/${selectedId}`;

      const res = await fetch(url, {
        method: dialogMode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) {
        toast.error(resJson.error?.message || 'Gagal menyimpan data');
        return;
      }

      toast.success(
        dialogMode === 'create' ? 'Data berhasil ditambahkan' : 'Data berhasil diperbarui'
      );
      setIsDialogOpen(false);
      fetchData();
    } catch {
      toast.error('Gagal terhubung ke server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: MasterRecord) => {
    try {
      const res = await fetch(`/api/master/${currentTab}/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const resJson = await res.json();
      if (!res.ok) {
        toast.error(resJson.error?.message || 'Gagal mengubah status');
        return;
      }
      toast.success(
        item.isActive ? 'Data berhasil dinonaktifkan' : 'Data berhasil diaktifkan kembali'
      );
      fetchData();
    } catch {
      toast.error('Gagal terhubung ke server');
    }
  };

  const handleDelete = async (item: MasterRecord) => {
    if (!confirm(`Hapus data ${item.name}? Data yang terpakai hanya dapat dinonaktifkan.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/master/${currentTab}/${item.id}`, {
        method: 'DELETE',
      });
      const resJson = await res.json();
      if (!res.ok) {
        toast.error(resJson.error?.message || 'Gagal menghapus data');
        return;
      }
      toast.success('Data berhasil dihapus');
      fetchData();
    } catch {
      toast.error('Gagal terhubung ke server');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-800 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-800">Master Data</span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Master Data
          </h1>
          <p className="text-sm text-slate-500">
            Kelola satuan, vendor, material, kategori, alat berat, jabatan, dan lokasi.
          </p>
        </div>
        {!isViewer && (
          <Button
            onClick={handleOpenCreate}
            className="bg-blue-900 hover:bg-blue-800 text-white"
          >
            + Tambah Data
          </Button>
        )}
      </div>

      <Tabs
        defaultValue="units"
        value={currentTab}
        onValueChange={(val) => {
          setCurrentTab(val as MasterTab);
          setSearchQuery('');
        }}
      >
        <TabsList className="bg-slate-100 p-1 rounded-lg flex flex-wrap h-auto gap-1">
          <TabsTrigger value="units">Satuan</TabsTrigger>
          <TabsTrigger value="vendors">Vendor</TabsTrigger>
          <TabsTrigger value="materials">Material</TabsTrigger>
          <TabsTrigger value="project-categories">Kategori Proyek</TabsTrigger>
          <TabsTrigger value="heavy-equipment-types">Alat Berat</TabsTrigger>
          <TabsTrigger value="approval-positions">Jabatan Approver</TabsTrigger>
          <TabsTrigger value="regions">Region</TabsTrigger>
          <TabsTrigger value="wilayah">Wilayah</TabsTrigger>
          <TabsTrigger value="companies">Company</TabsTrigger>
          <TabsTrigger value="estates">Estate</TabsTrigger>
        </TabsList>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Cari data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cari data master"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-500">Filter status:</span>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'all' | 'true' | 'false')}
              className="border border-slate-300 rounded-md p-1.5 text-sm bg-white"
            >
              <option value="all">Semua</option>
              <option value="true">Hanya Aktif</option>
              <option value="false">Hanya Nonaktif</option>
            </select>
          </div>
        </div>

        <TabsContent value={currentTab} className="mt-0">
          <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {['units', 'project-categories', 'approval-positions', 'regions', 'companies', 'estates'].includes(currentTab) && (
                    <TableHead>Kode</TableHead>
                  )}
                  <TableHead>Nama</TableHead>
                  {currentTab === 'estates' && (
                    <>
                      <TableHead>Company</TableHead>
                      <TableHead>Wilayah</TableHead>
                      <TableHead>Region</TableHead>
                    </>
                  )}
                  {currentTab === 'wilayah' && <TableHead>Region</TableHead>}
                  {currentTab === 'vendors' && <TableHead>Status Kelengkapan</TableHead>}
                  {currentTab === 'approval-positions' && <TableHead>Rank</TableHead>}
                  <TableHead>Status</TableHead>
                  {!isViewer && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Tidak ada data yang cocok.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.id}>
                      {['units', 'project-categories', 'approval-positions', 'regions', 'companies', 'estates'].includes(currentTab) && (
                        <TableCell className="font-mono text-xs text-slate-700">
                          {item.code || '-'}
                        </TableCell>
                      )}
                      <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                      {currentTab === 'estates' && (
                        <>
                          <TableCell className="text-slate-700 text-sm">
                            {item.company?.code ? `${item.company.code} - ${item.company.name}` : (item.company?.name || '-')}
                          </TableCell>
                          <TableCell className="text-slate-700 text-sm">
                            {item.wilayah?.name || '-'}
                          </TableCell>
                          <TableCell className="text-slate-700 text-sm">
                            {item.wilayah?.region?.code ? `${item.wilayah.region.code} (${item.wilayah.region.name})` : '-'}
                          </TableCell>
                        </>
                      )}
                      {currentTab === 'wilayah' && (
                        <TableCell className="text-slate-700 text-sm">
                          {item.region?.code ? `${item.region.code} - ${item.region.name}` : (item.region?.name || '-')}
                        </TableCell>
                      )}
                      {currentTab === 'vendors' && (
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.isComplete
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                : 'border-amber-300 bg-amber-50 text-amber-800'
                            }
                          >
                            {item.isComplete ? 'Lengkap' : 'Belum Lengkap'}
                          </Badge>
                        </TableCell>
                      )}
                      {currentTab === 'approval-positions' && (
                        <TableCell className="font-semibold text-slate-700">
                          Level {item.rank}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge
                          className={
                            item.isActive
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }
                        >
                          {item.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      {!isViewer && (
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                          >
                            Ubah
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(item)}
                          >
                            {item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700"
                            onClick={() => handleDelete(item)}
                          >
                            Hapus
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Tambah / Ubah */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Tambah Data Master' : 'Ubah Data Master'}
            </DialogTitle>
            <DialogDescription>
              Pastikan nama dan kode akurat sesuai standar operasional.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {currentTab === 'estates' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="form-company">Company</Label>
                  <select
                    id="form-company"
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white"
                  >
                    <option value="">Pilih Company...</option>
                    {companiesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-wilayah">Wilayah</Label>
                  <select
                    id="form-wilayah"
                    value={formWilayahId}
                    onChange={(e) => setFormWilayahId(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white"
                  >
                    <option value="">Pilih Wilayah...</option>
                    {wilayahList.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {currentTab === 'wilayah' && (
              <div className="space-y-2">
                <Label htmlFor="form-region">Region</Label>
                <select
                  id="form-region"
                  value={formRegionId}
                  onChange={(e) => setFormRegionId(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white"
                >
                  <option value="">Pilih Region...</option>
                  {regionsList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} - {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {['units', 'project-categories', 'approval-positions', 'regions', 'companies', 'estates'].includes(currentTab) && (
              <div className="space-y-2">
                <Label htmlFor="form-code">Kode</Label>
                <Input
                  id="form-code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="form-name">Nama</Label>
              <Input
                id="form-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            {currentTab === 'estates' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="form-estate-new">Estate New (Opsional)</Label>
                  <Input
                    id="form-estate-new"
                    value={formEstateNew}
                    onChange={(e) => setFormEstateNew(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-legacy-code">Legacy Code (Opsional)</Label>
                  <Input
                    id="form-legacy-code"
                    value={formLegacyCode}
                    onChange={(e) => setFormLegacyCode(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-blue-900 hover:bg-blue-800 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MasterDataPage() {
  return (
    <RoleProvider>
      <AppShell>
        <MasterDataContent />
      </AppShell>
    </RoleProvider>
  );
}
