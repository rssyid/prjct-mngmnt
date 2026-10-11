'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/infra/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email dan password wajib diisi');
      return;
    }

    try {
      setIsLoading(true);
      const res = await signIn.email({
        email,
        password,
      });

      if (res.error) {
        toast.error(res.error.message || 'Email atau password salah');
        return;
      }

      // Periksa status mustChangePassword dari /api/me
      const meRes = await fetch('/api/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.data?.mustChangePassword) {
          toast.info('Silakan ganti password sementara Anda terlebih dahulu');
          router.push('/ganti-password');
          return;
        }
      }

      toast.success('Berhasil masuk ke aplikasi');
      router.push('/');
    } catch {
      toast.error('Gagal terhubung ke server. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-md border-slate-200">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-900 text-white rounded-lg flex items-center justify-center font-bold text-xl mb-2">
            WM
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Masuk ke Aplikasi
          </CardTitle>
          <CardDescription className="text-slate-500">
            Water Management Project Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@perkebunan.co.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                aria-label="Alamat email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                aria-label="Kata sandi"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-900 hover:bg-blue-800 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Memverifikasi...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
