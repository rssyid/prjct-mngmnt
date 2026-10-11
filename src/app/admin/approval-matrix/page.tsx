'use client';

import React from 'react';
import { RoleProvider, useRole } from '@/components/prototype/role-context';
import { AppShell } from '@/components/prototype/app-shell';
import { ApprovalMatrixManager } from '@/components/approval/ApprovalMatrixManager';
import { Card } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

function ApprovalMatrixContent() {
  const { isSuperAdmin } = useRole();

  if (!isSuperAdmin) {
    return (
      <Card className="p-8 text-center bg-white border-slate-200">
        <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-800">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Halaman konfigurasi Matriks Approval SAP hanya dapat diakses oleh peran Super Admin.
        </p>
      </Card>
    );
  }

  return <ApprovalMatrixManager />;
}

export default function ApprovalMatrixPage() {
  return (
    <RoleProvider>
      <AppShell>
        <ApprovalMatrixContent />
      </AppShell>
    </RoleProvider>
  );
}
