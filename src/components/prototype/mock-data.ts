export interface MockProject {
  id: string;
  code: string;
  name: string;
  company: string;
  region: string;
  wilayah: string;
  primaryEstate: string;
  estatesCount: number;
  category: string;
  status: 'DRAFT' | 'SURVEY' | 'RAB_READY' | 'WAITING_AFCE_AR' | 'AFCE_AR_APPROVED' | 'PROCUREMENT' | 'EXECUTION' | 'WAITING_BAST' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  statusLabel: string;
  progress: number;
  deviation: number;
  ewsStatus: 'GREEN' | 'YELLOW' | 'RED';
  pic: string;
  targetEnd: string;
  budget: number;
  hasWeeklyLogThisWeek: boolean;
}

export const MOCK_PROJECTS: MockProject[] = [
  {
    id: 'proj-1',
    code: 'WM-THIP-2026-0001',
    name: 'Pembangunan Canal Bloking & Saluran Primer Zona A',
    company: 'PT THIP',
    region: 'Riau Utara',
    wilayah: 'Wilayah 1',
    primaryEstate: 'Mandah',
    estatesCount: 2,
    category: 'Canal Bloking',
    status: 'EXECUTION',
    statusLabel: 'Pelaksanaan',
    progress: 65.4,
    deviation: 2.1,
    ewsStatus: 'GREEN',
    pic: 'Rasyid (HO Specialist)',
    targetEnd: '2026-11-30',
    budget: 1250000000,
    hasWeeklyLogThisWeek: true,
  },
  {
    id: 'proj-2',
    code: 'WM-MSU-2026-0002',
    name: 'Perkuatan Tanggul Keliling & Pintu Klep',
    company: 'PT MSU',
    region: 'Riau Selatan',
    wilayah: 'Wilayah 2',
    primaryEstate: 'Betung',
    estatesCount: 1,
    category: 'Tanggul',
    status: 'PROCUREMENT',
    statusLabel: 'Pengadaan',
    progress: 25.0,
    deviation: 6.5,
    ewsStatus: 'YELLOW',
    pic: 'Budi Hartono',
    targetEnd: '2026-12-15',
    budget: 450000000,
    hasWeeklyLogThisWeek: false,
  },
  {
    id: 'proj-3',
    code: 'WM-RIAU-2026-0003',
    name: 'Pengadaan & Pemasangan Pintu Air Elektrik',
    company: 'PT RIAU',
    region: 'Riau Utara',
    wilayah: 'Wilayah 1',
    primaryEstate: 'Pelalawan',
    estatesCount: 1,
    category: 'Pintu Air',
    status: 'EXECUTION',
    statusLabel: 'Pelaksanaan',
    progress: 40.0,
    deviation: 12.3,
    ewsStatus: 'RED',
    pic: 'Siti Aminah',
    targetEnd: '2027-01-10',
    budget: 820000000,
    hasWeeklyLogThisWeek: false,
  },
  {
    id: 'proj-4',
    code: 'WM-KAL-2026-0004',
    name: 'Rehabilitasi Saluran Sekunder Blok 14-18',
    company: 'PT KAL',
    region: 'Kalimantan Barat',
    wilayah: 'Wilayah 3',
    primaryEstate: 'Sampit',
    estatesCount: 1,
    category: 'Saluran',
    status: 'COMPLETED',
    statusLabel: 'Selesai',
    progress: 100.0,
    deviation: 0.0,
    ewsStatus: 'GREEN',
    pic: 'Anwar Sadat',
    targetEnd: '2026-10-01',
    budget: 2100000000,
    hasWeeklyLogThisWeek: true,
  },
  {
    id: 'proj-5',
    code: 'WM-SUM-2026-0005',
    name: 'Pengadaan Pompa Sentrifugal Kapasitas Tinggi',
    company: 'PT SUM',
    region: 'Sumatera Selatan',
    wilayah: 'Wilayah 4',
    primaryEstate: 'Indragiri',
    estatesCount: 1,
    category: 'Pompa Air',
    status: 'ON_HOLD',
    statusLabel: 'Ditahan',
    progress: 15.0,
    deviation: 4.0,
    ewsStatus: 'GREEN',
    pic: 'Hendra Wijaya',
    targetEnd: '2027-02-28',
    budget: 300000000,
    hasWeeklyLogThisWeek: false,
  },
];

export interface GanttRow {
  id: string;
  level: number;
  type: 'project' | 'work_item' | 'tender' | 'physical' | 'package';
  name: string;
  weight?: number;
  badge?: string;
  cells: {
    week: string; // W1, W2, etc.
    status: 'none' | 'baseline' | 'rev1' | 'rev2' | 'in_progress' | 'completed';
    symbol?: string; // '#' or '✓'
  }[];
}

export const MOCK_GANTT_WEEKS = [
  { id: 'W1', label: 'W1', date: '05 Okt' },
  { id: 'W2', label: 'W2', date: '12 Okt' },
  { id: 'W3', label: 'W3', date: '19 Okt' },
  { id: 'W4', label: 'W4', date: '26 Okt' },
  { id: 'W5', label: 'W5', date: '02 Nop' },
  { id: 'W6', label: 'W6', date: '09 Nop' },
  { id: 'W7', label: 'W7', date: '16 Nop' },
  { id: 'W8', label: 'W8', date: '23 Nop' },
];

export const MOCK_GANTT_ROWS: GanttRow[] = [
  {
    id: 'g-proj',
    level: 0,
    type: 'project',
    name: 'WM-THIP-2026-0001: Canal Bloking & Saluran Primer',
    cells: [
      { week: 'W1', status: 'baseline' },
      { week: 'W2', status: 'baseline' },
      { week: 'W3', status: 'baseline' },
      { week: 'W4', status: 'rev1' },
      { week: 'W5', status: 'rev1' },
      { week: 'W6', status: 'rev1' },
      { week: 'W7', status: 'baseline' },
      { week: 'W8', status: 'baseline' },
    ],
  },
  {
    id: 'g-wi-1',
    level: 1,
    type: 'work_item',
    name: 'Pekerjaan 1: Canal Bloking Utama (Tender)',
    weight: 60,
    badge: 'Bobot: 60%',
    cells: [
      { week: 'W1', status: 'baseline' },
      { week: 'W2', status: 'baseline' },
      { week: 'W3', status: 'baseline' },
      { week: 'W4', status: 'rev1' },
      { week: 'W5', status: 'rev1' },
      { week: 'W6', status: 'none' },
      { week: 'W7', status: 'none' },
      { week: 'W8', status: 'none' },
    ],
  },
  {
    id: 'g-tender-1',
    level: 2,
    type: 'tender',
    name: 'Tender #1 (Batal)',
    badge: 'Batal',
    cells: [
      { week: 'W1', status: 'baseline', symbol: '✓' },
      { week: 'W2', status: 'baseline', symbol: '✓' },
      { week: 'W3', status: 'none' },
      { week: 'W4', status: 'none' },
      { week: 'W5', status: 'none' },
      { week: 'W6', status: 'none' },
      { week: 'W7', status: 'none' },
      { week: 'W8', status: 'none' },
    ],
  },
  {
    id: 'g-tender-2',
    level: 2,
    type: 'tender',
    name: 'Tender #2 (Pemenang: CV Bina Tirta)',
    badge: 'SPK Release',
    cells: [
      { week: 'W1', status: 'none' },
      { week: 'W2', status: 'baseline' },
      { week: 'W3', status: 'baseline', symbol: '✓' },
      { week: 'W4', status: 'none' },
      { week: 'W5', status: 'none' },
      { week: 'W6', status: 'none' },
      { week: 'W7', status: 'none' },
      { week: 'W8', status: 'none' },
    ],
  },
  {
    id: 'g-phys-1',
    level: 2,
    type: 'physical',
    name: 'Pelaksanaan Fisik Canal Bloking',
    badge: 'Progres: 75%',
    cells: [
      { week: 'W1', status: 'none' },
      { week: 'W2', status: 'none' },
      { week: 'W3', status: 'none' },
      { week: 'W4', status: 'baseline', symbol: '✓' },
      { week: 'W5', status: 'rev1', symbol: '✓' },
      { week: 'W6', status: 'rev1', symbol: '#' },
      { week: 'W7', status: 'baseline' },
      { week: 'W8', status: 'none' },
    ],
  },
  {
    id: 'g-pkg-1',
    level: 2,
    type: 'package',
    name: 'Paket Kerja Material: Pintu Klep Baja',
    badge: 'PO Issued',
    cells: [
      { week: 'W1', status: 'none' },
      { week: 'W2', status: 'none' },
      { week: 'W3', status: 'baseline', symbol: '✓' },
      { week: 'W4', status: 'baseline', symbol: '✓' },
      { week: 'W5', status: 'rev2', symbol: '#' },
      { week: 'W6', status: 'rev2' },
      { week: 'W7', status: 'none' },
      { week: 'W8', status: 'none' },
    ],
  },
  {
    id: 'g-wi-2',
    level: 1,
    type: 'work_item',
    name: 'Pekerjaan 2: Normalisasi Saluran Sekunder (Swakelola)',
    weight: 40,
    badge: 'Bobot: 40%',
    cells: [
      { week: 'W1', status: 'none' },
      { week: 'W2', status: 'none' },
      { week: 'W3', status: 'none' },
      { week: 'W4', status: 'baseline', symbol: '✓' },
      { week: 'W5', status: 'baseline', symbol: '#' },
      { week: 'W6', status: 'baseline' },
      { week: 'W7', status: 'baseline' },
      { week: 'W8', status: 'baseline' },
    ],
  },
];
