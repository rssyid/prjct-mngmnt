'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRole, type RoleType } from './role-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { signOut } from '@/infra/auth-client';
import { ShieldCheck, UserCheck, Eye, LogOut, User } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole, canMutate, roleLabel, userName } = useRole();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.push('/login');
    } catch {
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Daftar Proyek', href: '/projects' },
    { label: 'Portofolio Gantt', href: '/portfolio' },
    { label: 'Master Data', href: '/master' },
    ...(role === 'SUPER_ADMIN' ? [{ label: 'Admin Pengguna', href: '/admin/users' }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xs shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6 lg:gap-8">
            <Link href="/" className="flex items-center gap-2 text-[#0f2c59] font-bold text-lg">
              <div className="h-8 w-8 rounded-lg bg-[#0f2c59] text-white flex items-center justify-center font-black text-sm">
                WM
              </div>
              <span className="hidden sm:inline">Water Management</span>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-[#0f2c59] font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Info, Role Switcher, & Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 uppercase px-1.5 hidden md:inline">
                Peran:
              </span>
              <select
                aria-label="Pilih peran pengguna simulasi"
                value={role}
                onChange={(e) => setRole(e.target.value as RoleType)}
                className="bg-white border border-slate-300 text-slate-900 text-xs rounded-md px-2 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-[#0f2c59]"
              >
                <option value="SUPER_ADMIN">Super Admin (SA)</option>
                <option value="WM_HO_SPECIALIST">HO Specialist (SP)</option>
                <option value="MANAGEMENT_VIEWER">Management Viewer (MV)</option>
              </select>
            </div>

            <div className="hidden sm:flex items-center">
              {role === 'SUPER_ADMIN' && (
                <Badge variant="default" className="gap-1 bg-[#0f2c59]">
                  <ShieldCheck className="h-3 w-3" /> SA
                </Badge>
              )}
              {role === 'WM_HO_SPECIALIST' && (
                <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800">
                  <UserCheck className="h-3 w-3" /> SP
                </Badge>
              )}
              {role === 'MANAGEMENT_VIEWER' && (
                <Badge variant="outline" className="gap-1 border-slate-300 text-slate-600">
                  <Eye className="h-3 w-3" /> MV
                </Badge>
              )}
            </div>

            {userName && (
              <span
                className="text-xs font-semibold text-slate-700 hidden lg:inline-block max-w-[140px] truncate"
                title={userName}
              >
                {userName}
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200 h-8"
              title="Keluar dari akun"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Role banner notice */}
      {!canMutate && (
        <aside aria-label="Pemberitahuan mode hak akses" className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2 text-center font-medium">
          Melihat antarmuka sebagai <strong>{roleLabel}</strong>. Tombol aksi pembuatan, persetujuan, dan mutasi dinonaktifkan (mode baca saja).
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Compact footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        WM Project Management &bull; Prototipe Tahap F0 &bull; Asia/Jakarta (WIB)
      </footer>
    </div>
  );
}
