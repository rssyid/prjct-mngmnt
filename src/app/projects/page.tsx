'use client';

import React, { useState } from 'react';
import { RoleProvider, useRole } from '@/components/prototype/role-context';
import { AppShell } from '@/components/prototype/app-shell';
import { Button } from '@/components/ui/button';
import { ProjectTable } from '@/components/projects/ProjectTable';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { Plus, Lock } from 'lucide-react';

function ProjectsContent() {
  const { canMutate } = useRole();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Daftar Proyek Water Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pencatatan dan pemantauan proyek survei, pengadaan, dan fisik di seluruh wilayah kebun.
          </p>
        </div>

        <div>
          {canMutate ? (
            <Button
              onClick={() => setCreateOpen(true)}
              className="gap-2 text-xs sm:text-sm bg-[#0f2c59] hover:bg-[#163a70] text-white"
            >
              <Plus className="h-4 w-4" /> Buat Proyek Baru
            </Button>
          ) : (
            <div title="Role Viewer tidak memiliki izin membuat proyek baru">
              <Button
                variant="outline"
                disabled
                className="gap-2 text-xs sm:text-sm text-slate-400 border-slate-200 cursor-not-allowed"
              >
                <Lock className="h-4 w-4" /> Buat Proyek (Viewer Terkunci)
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Project Table Component */}
      <ProjectTable />

      {/* Project Form Dialog Component */}
      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <RoleProvider>
      <AppShell>
        <ProjectsContent />
      </AppShell>
    </RoleProvider>
  );
}
