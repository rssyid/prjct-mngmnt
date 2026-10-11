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
  | 'estates'
  | 'blocks';

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
  estateId?: string;
  blockCode?: string;
  plantingYear?: number | null;
  areaHectares?: number | string | null;
  estateNew?: string | null;
  legacyCode?: string | null;
  alias?: string | null;
  ops?: 'SUMATERA' | 'KALBAR' | 'WILTIM';
  defaultUnitId?: string;
  defaultUnit?: { id: string; code: string; name: string };
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  npwp?: string | null;
  company?: { id?: string; code?: string; name: string };
  wilayah?: { id?: string; name: string; region?: { id?: string; code?: string; name: string } };
  region?: { id?: string; code?: string; name: string };
  estate?: { id?: string; code?: string; name: string; company?: { code?: string } };
  [key: string]: unknown;
}

const TAB_CONFIG: Record<
  MasterTab,
  { label: string; singular: string; description: string }
> = {
  units: {
    label: 'Satuan',
    singular: 'Satuan',
    description: 'Satuan pengukuran material dan pekerjaan (mis. M, M2, M3, LS, KG).',
  },
  vendors: {
    label: 'Vendor',
    singular: 'Vendor',
    description: 'Data rekanan atau kontraktor pengadaan dan pekerjaan fisik.',
  },
  materials: {
    label: 'Material',
    singular: 'Material',
    description: 'Katalog material dan barang proyek water management.',
  },
  'project-categories': {
    label: 'Kategori Proyek',
    singular: 'Kategori Proyek',
    description: 'Klasifikasi proyek (mis. Rehabilitasi Saluran, Cuci Parit, Tanggul).',
  },
  'heavy-equipment-types': {
    label: 'Alat Berat',
    singular: 'Jenis Alat Berat',
    description: 'Tipe alat berat operasional proyek (mis. Excavator Standard, Long Arm).',
  },
  'approval-positions': {
    label: 'Jabatan Approver',
    singular: 'Jabatan Approver',
    description: 'Hierarki penandatangan approval SAP (Level 1 sampai 9).',
  },
  regions: {
    label: 'Region',
    singular: 'Region',
    description: 'Wilayah regional perkebunan.',
  },
  wilayah: {
    label: 'Wilayah',
    singular: 'Wilayah',
    description: 'Wilayah administratif di bawah Region.',
  },
  companies: {
    label: 'Company',
    singular: 'Company',
    description: 'Unit operasional PT / Perusahaan perkebunan.',
  },
  estates: {
    label: 'Estate',
    singular: 'Estate',
    description: 'Kebun operasional di bawah Company dan Wilayah.',
  },
  blocks: {
    label: 'Blok Kebun',
    singular: 'Blok Kebun',
    description: 'Data blok perkebunan di dalam Estate.',
  },
};

function MasterDataContent() {
  const [currentTab, setCurrentTab] = useState<MasterTab>('units');
  const [data, setData] = useState<MasterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [userRole, setUserRole] = useState<string>('MANAGEMENT_VIEWER');

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formOrder, setFormOrder] = useState('0');

  // Vendor Fields
  const [formVendorType, setFormVendorType] = useState<'EKSTERNAL' | 'INTERNAL'>('EKSTERNAL');
  const [formContactName, setFormContactName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNpwp, setFormNpwp] = useState('');

  // Material Fields
  const [formDefaultUnitId, setFormDefaultUnitId] = useState('');

  // Region Fields
  const [formOps, setFormOps] = useState<'SUMATERA' | 'KALBAR' | 'WILTIM'>('SUMATERA');

  // Company Fields
  const [formAlias, setFormAlias] = useState('');

  // Approval Position Fields
  const [formRank, setFormRank] = useState('1');

  // Location Hierarchy Fields
  const [formRegionId, setFormRegionId] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [formWilayahId, setFormWilayahId] = useState('');
  const [formEstateId, setFormEstateId] = useState('');
  const [formEstateNew, setFormEstateNew] = useState('');
  const [formLegacyCode, setFormLegacyCode] = useState('');
  const [formBlockCode, setFormBlockCode] = useState('');
  const [formPlantingYear, setFormPlantingYear] = useState('');
  const [formAreaHectares, setFormAreaHectares] = useState('');

  // Dropdowns lists
  const [companiesList, setCompaniesList] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [wilayahList, setWilayahList] = useState<Array<{ id: string; name: string }>>([]);
  const [regionsList, setRegionsList] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [unitsList, setUnitsList] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [estatesList, setEstatesList] = useState<Array<{ id: string; code: string; name: string }>>([]);

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
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch {
      // ignore
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
    try {
      if (tab === 'materials' && unitsList.length === 0) {
        const res = await fetch('/api/master/units');
        const json = await res.json();
        if (json.data) setUnitsList(json.data);
      }
      if (tab === 'wilayah' && regionsList.length === 0) {
        const res = await fetch('/api/master/regions');
        const json = await res.json();
        if (json.data) setRegionsList(json.data);
      }
      if (tab === 'estates') {
        if (companiesList.length === 0) {
          const res = await fetch('/api/master/companies');
          const json = await res.json();
          if (json.data) setCompaniesList(json.data);
        }
        if (wilayahList.length === 0) {
          const res = await fetch('/api/master/wilayah');
          const json = await res.json();
          if (json.data) setWilayahList(json.data);
        }
      }
      if (tab === 'blocks' && estatesList.length === 0) {
        const res = await fetch('/api/master/estates');
        const json = await res.json();
        if (json.data) setEstatesList(json.data);
      }
    } catch {
      // silently handle dropdown loading errors
    }
  };

  const handleOpenCreate = () => {
    setDialogMode('create');
    setSelectedId(null);
    setFormName('');
    setFormCode('');
    setFormOrder('0');
    setFormVendorType('EKSTERNAL');
    setFormContactName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormNpwp('');
    setFormDefaultUnitId('');
    setFormOps('SUMATERA');
    setFormAlias('');
    setFormRank(String(data.length + 1));
    setFormRegionId('');
    setFormCompanyId('');
    setFormWilayahId('');
    setFormEstateId('');
    setFormEstateNew('');
    setFormLegacyCode('');
    setFormBlockCode('');
    setFormPlantingYear('');
    setFormAreaHectares('');

    loadDropdowns(currentTab);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: MasterRecord) => {
    setDialogMode('edit');
    setSelectedId(item.id);
    setFormName(item.name || '');
    setFormCode(item.code || '');
    setFormOrder(String(item.order ?? 0));
    setFormVendorType((item.type as 'EKSTERNAL' | 'INTERNAL') || 'EKSTERNAL');
    setFormContactName(item.contactName || '');
    setFormPhone(item.phone || '');
    setFormEmail(item.email || '');
    setFormAddress(item.address || '');
    setFormNpwp(item.npwp || '');
    setFormDefaultUnitId(item.defaultUnitId || item.defaultUnit?.id || '');
    setFormOps((item.ops as 'SUMATERA' | 'KALBAR' | 'WILTIM') || 'SUMATERA');
    setFormAlias(item.alias || '');
    setFormRank(String(item.rank ?? 1));
    setFormRegionId(item.regionId || item.region?.id || item.wilayah?.region?.id || '');
    setFormCompanyId(item.companyId || item.company?.id || '');
    setFormWilayahId(item.wilayahId || item.wilayah?.id || '');
    setFormEstateId(item.estateId || item.estate?.id || '');
    setFormEstateNew(item.estateNew || '');
    setFormLegacyCode(item.legacyCode || '');
    setFormBlockCode(item.blockCode || '');
    setFormPlantingYear(item.plantingYear ? String(item.plantingYear) : '');
    setFormAreaHectares(item.areaHectares ? String(item.areaHectares) : '');

    loadDropdowns(currentTab);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload: Record<string, unknown> = { name: formName };

      if (currentTab === 'units') {
        payload.code = formCode;
      } else if (currentTab === 'vendors') {
        payload.type = formVendorType;
        payload.contactName = formContactName.trim() || null;
        payload.phone = formPhone.trim() || null;
        payload.email = formEmail.trim() || null;
        payload.address = formAddress.trim() || null;
        payload.npwp = formNpwp.trim() || null;
      } else if (currentTab === 'materials') {
        if (!formDefaultUnitId) {
          toast.error('Satuan default wajib dipilih');
          setIsSubmitting(false);
          return;
        }
        payload.defaultUnitId = formDefaultUnitId;
        payload.code = formCode.trim() || null;
      } else if (currentTab === 'project-categories') {
        payload.code = formCode;
        payload.order = Number(formOrder) || 0;
      } else if (currentTab === 'heavy-equipment-types') {
        // Only name is needed
      } else if (currentTab === 'approval-positions') {
        payload.code = formCode;
        payload.rank = Number(formRank) || 1;
      } else if (currentTab === 'regions') {
        payload.code = formCode;
        payload.ops = formOps;
        payload.order = Number(formOrder) || 0;
      } else if (currentTab === 'wilayah') {
        if (!formRegionId) {
          toast.error('Region wajib dipilih');
          setIsSubmitting(false);
          return;
        }
        payload.regionId = formRegionId;
        payload.order = Number(formOrder) || 0;
      } else if (currentTab === 'companies') {
        payload.code = formCode;
        payload.alias = formAlias.trim() || null;
        payload.order = Number(formOrder) || 0;
      } else if (currentTab === 'estates') {
        if (!formCompanyId || !formWilayahId) {
          toast.error('Company dan Wilayah wajib dipilih');
          setIsSubmitting(false);
          return;
        }
        payload.companyId = formCompanyId;
        payload.wilayahId = formWilayahId;
        payload.code = formCode;
        payload.estateNew = formEstateNew.trim() || null;
        payload.legacyCode = formLegacyCode.trim() || null;
        payload.order = Number(formOrder) || 0;
      } else if (currentTab === 'blocks') {
        if (!formEstateId) {
          toast.error('Estate wajib dipilih');
          setIsSubmitting(false);
          return;
        }
        payload.estateId = formEstateId;
        payload.blockCode = formBlockCode;
        payload.plantingYear = formPlantingYear ? Number(formPlantingYear) : null;
        payload.areaHectares = formAreaHectares ? Number(formAreaHectares) : null;
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
    if (!confirm(`Hapus data ${item.name}? Data yang telah terpakai dalam transaksi hanya dapat dinonaktifkan.`)) {
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

  const currentConfig = TAB_CONFIG[currentTab];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-800 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-800">Master Data</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Master Data Sistem
          </h1>
          <p className="text-sm text-slate-500">
            Kelola satuan, vendor, material, kategori proyek, alat berat, jabatan approval, dan hierarki lokasi kebun.
          </p>
        </div>
        {!isViewer && (
          <Button
            onClick={handleOpenCreate}
            className="bg-[#0f2c59] hover:bg-[#163a70] text-white gap-1.5"
          >
            <span>+</span> Tambah {currentConfig.singular}
          </Button>
        )}
      </div>

      {/* Navigation Tabs */}
      <Tabs
        defaultValue="units"
        value={currentTab}
        onValueChange={(val) => {
          setCurrentTab(val as MasterTab);
          setSearchQuery('');
        }}
      >
        <TabsList className="bg-slate-100 p-1 rounded-lg flex flex-wrap h-auto gap-1 border border-slate-200">
          {(Object.keys(TAB_CONFIG) as MasterTab[]).map((tabKey) => (
            <TabsTrigger
              key={tabKey}
              value={tabKey}
              className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#0f2c59] data-[state=active]:font-bold data-[state=active]:shadow-xs"
            >
              {TAB_CONFIG[tabKey].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
          <div className="w-full sm:w-72">
            <Input
              placeholder={`Cari dalam ${currentConfig.label}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cari data master"
              className="bg-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'all' | 'true' | 'false')}
              className="border border-slate-300 rounded-md py-1 px-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
            >
              <option value="all">Semua Status</option>
              <option value="true">Hanya Aktif</option>
              <option value="false">Hanya Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <TabsContent value={currentTab} className="mt-0">
          <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  {['units', 'materials', 'project-categories', 'approval-positions', 'regions', 'companies', 'estates'].includes(
                    currentTab
                  ) && <TableHead className="w-24">Kode</TableHead>}
                  {currentTab === 'blocks' && <TableHead className="w-24">Kode Blok</TableHead>}
                  <TableHead>Nama</TableHead>
                  {currentTab === 'vendors' && (
                    <>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Kontak / PIC</TableHead>
                      <TableHead>Telepon</TableHead>
                      <TableHead>Kelengkapan</TableHead>
                    </>
                  )}
                  {currentTab === 'materials' && <TableHead>Satuan Default</TableHead>}
                  {currentTab === 'approval-positions' && <TableHead>Tingkat / Rank</TableHead>}
                  {currentTab === 'regions' && <TableHead>Operasional</TableHead>}
                  {currentTab === 'wilayah' && <TableHead>Region</TableHead>}
                  {currentTab === 'companies' && <TableHead>Alias</TableHead>}
                  {currentTab === 'estates' && (
                    <>
                      <TableHead>Company</TableHead>
                      <TableHead>Wilayah</TableHead>
                      <TableHead>Region</TableHead>
                    </>
                  )}
                  {currentTab === 'blocks' && (
                    <>
                      <TableHead>Estate</TableHead>
                      <TableHead>Tahun Tanam</TableHead>
                      <TableHead>Luas (Ha)</TableHead>
                    </>
                  )}
                  <TableHead className="w-24">Status</TableHead>
                  {!isViewer && <TableHead className="text-right w-44">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Tidak ada data yang cocok.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/60">
                      {['units', 'materials', 'project-categories', 'approval-positions', 'regions', 'companies', 'estates'].includes(
                        currentTab
                      ) && (
                        <TableCell className="font-mono text-xs font-semibold text-slate-700">
                          {item.code || '-'}
                        </TableCell>
                      )}
                      {currentTab === 'blocks' && (
                        <TableCell className="font-mono text-xs font-semibold text-slate-700">
                          {item.blockCode || '-'}
                        </TableCell>
                      )}
                      <TableCell className="font-medium text-slate-900">{item.name}</TableCell>

                      {currentTab === 'vendors' && (
                        <>
                          <TableCell className="text-xs text-slate-600 font-medium">
                            {item.type || 'EKSTERNAL'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {item.contactName || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {item.phone || '-'}
                          </TableCell>
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
                        </>
                      )}

                      {currentTab === 'materials' && (
                        <TableCell className="text-xs text-slate-700">
                          {item.defaultUnit?.code ? `${item.defaultUnit.name} (${item.defaultUnit.code})` : '-'}
                        </TableCell>
                      )}

                      {currentTab === 'approval-positions' && (
                        <TableCell className="font-semibold text-slate-700 text-xs">
                          Level {item.rank}
                        </TableCell>
                      )}

                      {currentTab === 'regions' && (
                        <TableCell className="text-xs font-medium text-slate-700">
                          {item.ops || 'SUMATERA'}
                        </TableCell>
                      )}

                      {currentTab === 'wilayah' && (
                        <TableCell className="text-xs text-slate-700">
                          {item.region?.code ? `${item.region.code} - ${item.region.name}` : '-'}
                        </TableCell>
                      )}

                      {currentTab === 'companies' && (
                        <TableCell className="text-xs text-slate-600 font-mono">
                          {item.alias || '-'}
                        </TableCell>
                      )}

                      {currentTab === 'estates' && (
                        <>
                          <TableCell className="text-xs text-slate-700">
                            {item.company?.code ? `${item.company.code} - ${item.company.name}` : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700">
                            {item.wilayah?.name || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700">
                            {item.wilayah?.region?.code ? `${item.wilayah.region.code}` : '-'}
                          </TableCell>
                        </>
                      )}

                      {currentTab === 'blocks' && (
                        <>
                          <TableCell className="text-xs text-slate-700">
                            {item.estate?.code ? `${item.estate.code} - ${item.estate.name}` : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {item.plantingYear || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {item.areaHectares ? `${item.areaHectares} Ha` : '-'}
                          </TableCell>
                        </>
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
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleOpenEdit(item)}
                          >
                            Ubah
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleToggleActive(item)}
                          >
                            {item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
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

      {/* Modal Dialog Form Tambah / Ubah Master */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create'
                ? `Tambah ${currentConfig.singular} Baru`
                : `Ubah ${currentConfig.singular}`}
            </DialogTitle>
            <DialogDescription>{currentConfig.description}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Field: Vendors */}
            {currentTab === 'vendors' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="vendor-name">Nama Vendor / Rekanan *</Label>
                  <Input
                    id="vendor-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="mis. PT Sumber Makmur Mandiri"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="vendor-type">Tipe Rekanan</Label>
                    <select
                      id="vendor-type"
                      value={formVendorType}
                      onChange={(e) => setFormVendorType(e.target.value as 'EKSTERNAL' | 'INTERNAL')}
                      disabled={isSubmitting}
                      className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white"
                    >
                      <option value="EKSTERNAL">EKSTERNAL (Kontraktor Luar)</option>
                      <option value="INTERNAL">INTERNAL (Afiliasi / Swakelola)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vendor-contact">Nama Kontak / PIC</Label>
                    <Input
                      id="vendor-contact"
                      value={formContactName}
                      onChange={(e) => setFormContactName(e.target.value)}
                      placeholder="mis. Budi Santoso"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="vendor-phone">Nomor Telepon</Label>
                    <Input
                      id="vendor-phone"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="mis. 081234567890"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vendor-email">Alamat Email</Label>
                    <Input
                      id="vendor-email"
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="vendor@example.com"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vendor-address">Alamat Lengkap</Label>
                  <textarea
                    id="vendor-address"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Alamat kantor rekanan"
                    rows={2}
                    disabled={isSubmitting}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vendor-npwp">NPWP</Label>
                  <Input
                    id="vendor-npwp"
                    value={formNpwp}
                    onChange={(e) => setFormNpwp(e.target.value)}
                    placeholder="mis. 01.234.567.8-901.000"
                    disabled={isSubmitting}
                  />
                  <p className="text-[11px] text-slate-500">
                    Status kelengkapan rekanan otomatis menjadi <strong>Lengkap</strong> jika alamat, telepon, email, kontak, dan NPWP terisi.
                  </p>
                </div>
              </>
            )}

            {/* Field: Materials */}
            {currentTab === 'materials' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="mat-name">Nama Material / Barang *</Label>
                  <Input
                    id="mat-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="mis. Geotekstil Non-Woven 250gr"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="mat-unit">Satuan Default *</Label>
                    <select
                      id="mat-unit"
                      value={formDefaultUnitId}
                      onChange={(e) => setFormDefaultUnitId(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white"
                    >
                      <option value="">Pilih Satuan...</option>
                      {unitsList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mat-code">Kode Material (Opsional)</Label>
                    <Input
                      id="mat-code"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="mis. MAT-GEO-01"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Field: Units, Project Categories, Heavy Equipment */}
            {['units', 'project-categories', 'heavy-equipment-types'].includes(currentTab) && (
              <>
                {currentTab !== 'heavy-equipment-types' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="item-code">Kode Satuan / Kategori *</Label>
                    <Input
                      id="item-code"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder={currentTab === 'units' ? 'mis. M3, KG, LS' : 'mis. REHAB, CUCI'}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="item-name">
                    Nama {currentConfig.singular} *
                  </Label>
                  <Input
                    id="item-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={
                      currentTab === 'units'
                        ? 'mis. Meter Kubik'
                        : currentTab === 'project-categories'
                        ? 'mis. Rehabilitasi Saluran'
                        : 'mis. Excavator Standard 20T'
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
                {currentTab === 'project-categories' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="item-order">Urutan Tampilan</Label>
                    <Input
                      id="item-order"
                      type="number"
                      value={formOrder}
                      onChange={(e) => setFormOrder(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </>
            )}

            {/* Field: Approval Positions */}
            {currentTab === 'approval-positions' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pos-code">Kode Jabatan *</Label>
                    <Input
                      id="pos-code"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="mis. EM, GM, DPH, COO"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pos-rank">Tingkat Hierarki (Rank 1-9) *</Label>
                    <Input
                      id="pos-rank"
                      type="number"
                      min={1}
                      max={9}
                      value={formRank}
                      onChange={(e) => setFormRank(e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pos-name">Nama Jabatan *</Label>
                  <Input
                    id="pos-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="mis. Estate Manager"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}

            {/* Field: Regions */}
            {currentTab === 'regions' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-code">Kode Region *</Label>
                    <Input
                      id="reg-code"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="mis. R1, R2, KB"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-ops">Wilayah Operasional (Ops) *</Label>
                    <select
                      id="reg-ops"
                      value={formOps}
                      onChange={(e) => setFormOps(e.target.value as 'SUMATERA' | 'KALBAR' | 'WILTIM')}
                      disabled={isSubmitting}
                      className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white"
                    >
                      <option value="SUMATERA">SUMATERA</option>
                      <option value="KALBAR">KALBAR</option>
                      <option value="WILTIM">WILTIM</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name">Nama Region *</Label>
                  <Input
                    id="reg-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="mis. Riau Utara"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}

            {/* Field: Wilayah */}
            {currentTab === 'wilayah' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="wil-reg">Region Induk *</Label>
                  <select
                    id="wil-reg"
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
                <div className="space-y-1.5">
                  <Label htmlFor="wil-name">Nama Wilayah *</Label>
                  <Input
                    id="wil-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="mis. Wilayah 1"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}

            {/* Field: Companies */}
            {currentTab === 'companies' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-code">Kode Company *</Label>
                    <Input
                      id="comp-code"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="mis. KSA, TKA"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-alias">Alias Singkatan (Opsional)</Label>
                    <Input
                      id="comp-alias"
                      value={formAlias}
                      onChange={(e) => setFormAlias(e.target.value)}
                      placeholder="mis. KSA"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-name">Nama Perusahaan (PT) *</Label>
                  <Input
                    id="comp-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="mis. PT Kresna Sakti Agro"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}

            {/* Field: Estates */}
            {currentTab === 'estates' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="est-company">Company Induk *</Label>
                    <select
                      id="est-company"
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
                  <div className="space-y-1.5">
                    <Label htmlFor="est-wilayah">Wilayah Induk *</Label>
                    <select
                      id="est-wilayah"
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
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="est-code">Kode Estate *</Label>
                    <Input
                      id="est-code"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="mis. KSAE"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="est-name">Nama Estate *</Label>
                    <Input
                      id="est-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="mis. Kresna Agro Estate"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="est-new">Estate New (Opsional)</Label>
                    <Input
                      id="est-new"
                      value={formEstateNew}
                      onChange={(e) => setFormEstateNew(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="est-legacy">Legacy Code (Opsional)</Label>
                    <Input
                      id="est-legacy"
                      value={formLegacyCode}
                      onChange={(e) => setFormLegacyCode(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Field: Blocks */}
            {currentTab === 'blocks' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="blk-estate">Estate Induk *</Label>
                  <select
                    id="blk-estate"
                    value={formEstateId}
                    onChange={(e) => setFormEstateId(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white"
                  >
                    <option value="">Pilih Estate...</option>
                    {estatesList.map((es) => (
                      <option key={es.id} value={es.id}>
                        {es.code} - {es.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="blk-code">Kode Blok *</Label>
                    <Input
                      id="blk-code"
                      value={formBlockCode}
                      onChange={(e) => setFormBlockCode(e.target.value)}
                      placeholder="mis. A01, B12"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="blk-name">Nama Blok *</Label>
                    <Input
                      id="blk-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="mis. Blok A01 Afdeling 1"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="blk-year">Tahun Tanam (Opsional)</Label>
                    <Input
                      id="blk-year"
                      type="number"
                      value={formPlantingYear}
                      onChange={(e) => setFormPlantingYear(e.target.value)}
                      placeholder="mis. 2018"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="blk-area">Luas Hektar (Opsional)</Label>
                    <Input
                      id="blk-area"
                      type="number"
                      step="0.01"
                      value={formAreaHectares}
                      onChange={(e) => setFormAreaHectares(e.target.value)}
                      placeholder="mis. 28.5"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </>
            )}

            <DialogFooter className="pt-3">
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
                className="bg-[#0f2c59] hover:bg-[#163a70] text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
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
