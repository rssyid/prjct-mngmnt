'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RoleProvider } from '@/components/prototype/role-context';
import { AppShell } from '@/components/prototype/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import { formatDate } from '@/shared/lib/format';
import { Role } from '@/shared/permissions';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

function AdminUsersContent() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog Tambah User
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<Role>('WM_HO_SPECIALIST');
  const [addPassword, setAddPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog Reset Password
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  // Dialog Ubah User
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<Role>('WM_HO_SPECIALIST');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editMustChangePassword, setEditMustChangePassword] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        if (res.status === 403) {
          toast.error('Hanya Super Admin yang berhak mengakses halaman ini');
          return;
        }
        toast.error('Gagal memuat daftar pengguna');
        return;
      }
      const json = await res.json();
      setUsers(json.data || []);
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/users')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json) => {
        if (isMounted) setUsers(json.data || []);
      })
      .catch(() => {
        if (isMounted) toast.error('Gagal memuat daftar pengguna');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName,
          email: addEmail,
          role: addRole,
          temporaryPassword: addPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message || 'Gagal membuat pengguna');
        return;
      }
      toast.success('Pengguna berhasil dibuat');
      setIsAddOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      fetchUsers();
    } catch {
      toast.error('Gagal terhubung ke server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temporaryPassword: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message || 'Gagal mereset password');
        return;
      }
      toast.success(
        `Password untuk ${selectedUser.name} berhasil direset. Semua sesi pengguna tersebut telah dicabut.`
      );
      setIsResetOpen(false);
      setResetPassword('');
      setSelectedUser(null);
      fetchUsers();
    } catch {
      toast.error('Gagal terhubung ke server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          role: editRole,
          isActive: editIsActive,
          mustChangePassword: editMustChangePassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message || 'Gagal memperbarui pengguna');
        return;
      }
      toast.success('Data pengguna berhasil diperbarui');
      setIsEditOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch {
      toast.error('Gagal terhubung ke server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-800 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-800">Admin Pengguna</span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Manajemen Pengguna
          </h1>
          <p className="text-sm text-slate-500">
            Kelola akun, peran otorisasi, status aktif, dan reset password pengguna.
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-900 hover:bg-blue-800 text-white"
        >
          + Tambah Pengguna
        </Button>
      </div>

      <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Wajib Ganti Sandi</TableHead>
              <TableHead>Terdaftar</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Memuat data pengguna...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Belum ada pengguna terdaftar.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-slate-900">{u.name}</TableCell>
                  <TableCell className="text-slate-600">{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        u.role === 'SUPER_ADMIN'
                          ? 'border-purple-300 bg-purple-50 text-purple-800'
                          : u.role === 'WM_HO_SPECIALIST'
                            ? 'border-blue-300 bg-blue-50 text-blue-800'
                            : 'border-slate-300 bg-slate-50 text-slate-800'
                      }
                    >
                      {u.role === 'SUPER_ADMIN'
                        ? 'Super Admin'
                        : u.role === 'WM_HO_SPECIALIST'
                          ? 'Specialist'
                          : 'Viewer'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        u.isActive
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border-rose-200'
                      }
                    >
                      {u.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.mustChangePassword ? (
                      <span className="text-xs font-semibold text-amber-600">Ya</span>
                    ) : (
                      <span className="text-xs text-slate-400">Tidak</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(u);
                        setEditName(u.name);
                        setEditRole(u.role);
                        setEditIsActive(u.isActive);
                        setEditMustChangePassword(u.mustChangePassword);
                        setIsEditOpen(true);
                      }}
                    >
                      Ubah
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(u);
                        setResetPassword('');
                        setIsResetOpen(true);
                      }}
                    >
                      Reset Password
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Tambah Pengguna */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            <DialogDescription>
              Buat akun baru. Pengguna wajib mengganti password sementara pada login pertama.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Nama Lengkap</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Alamat Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Peran (Role)</Label>
              <select
                id="add-role"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as Role)}
                className="w-full border border-slate-300 rounded-md p-2 bg-white text-sm"
                disabled={isSubmitting}
              >
                <option value="WM_HO_SPECIALIST">WM_HO_SPECIALIST (Specialist)</option>
                <option value="MANAGEMENT_VIEWER">MANAGEMENT_VIEWER (Viewer)</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN (Super Admin)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Password Sementara</Label>
              <Input
                id="add-password"
                type="password"
                placeholder="Minimal 8 karakter"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-blue-900 hover:bg-blue-800 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Pengguna'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Ubah Pengguna */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Pengguna</DialogTitle>
            <DialogDescription>
              Perbarui profil, peran, atau status aktif pengguna.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Alamat Email (Akun)</Label>
              <Input
                id="edit-email"
                value={selectedUser?.email || ''}
                disabled
                className="bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama Lengkap</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Peran (Role)</Label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as Role)}
                className="w-full border border-slate-300 rounded-md p-2 bg-white text-sm"
                disabled={isSubmitting}
              >
                <option value="WM_HO_SPECIALIST">WM_HO_SPECIALIST (Specialist)</option>
                <option value="MANAGEMENT_VIEWER">MANAGEMENT_VIEWER (Viewer)</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN (Super Admin)</option>
              </select>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="rounded border-slate-300 text-blue-900"
                disabled={isSubmitting}
              />
              <Label htmlFor="edit-active">Akun Aktif</Label>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="edit-must-change-password"
                checked={editMustChangePassword}
                onChange={(e) => setEditMustChangePassword(e.target.checked)}
                className="rounded border-slate-300 text-blue-900"
                disabled={isSubmitting}
              />
              <Label htmlFor="edit-must-change-password">
                Wajib ganti password pada login berikutnya
              </Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-blue-900 hover:bg-blue-800 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Reset Password */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password Pengguna</DialogTitle>
            <DialogDescription>
              Atur password sementara baru untuk {selectedUser?.name}. Semua sesi aktif akan dicabut secara otomatis.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">Password Sementara Baru</Label>
              <Input
                id="reset-password"
                type="password"
                placeholder="Minimal 8 karakter"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResetOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-rose-700 hover:bg-rose-800 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Memproses...' : 'Reset & Cabut Sesi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RoleProvider>
      <AppShell>
        <AdminUsersContent />
      </AppShell>
    </RoleProvider>
  );
}
