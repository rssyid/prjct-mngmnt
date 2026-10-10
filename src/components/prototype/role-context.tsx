'use client';

import React, { createContext, useContext, useState } from 'react';

export type RoleType = 'SUPER_ADMIN' | 'WM_HO_SPECIALIST' | 'MANAGEMENT_VIEWER';

interface RoleContextValue {
  role: RoleType;
  setRole: (role: RoleType) => void;
  canMutate: boolean;
  isSuperAdmin: boolean;
  roleLabel: string;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<RoleType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wm_active_role') as RoleType | null;
      if (saved && ['SUPER_ADMIN', 'WM_HO_SPECIALIST', 'MANAGEMENT_VIEWER'].includes(saved)) {
        return saved;
      }
    }
    return 'SUPER_ADMIN';
  });

  const setRole = (newRole: RoleType) => {
    setRoleState(newRole);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wm_active_role', newRole);
    }
  };

  const canMutate = role !== 'MANAGEMENT_VIEWER';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const roleLabel =
    role === 'SUPER_ADMIN'
      ? 'Super Admin'
      : role === 'WM_HO_SPECIALIST'
        ? 'HO Specialist'
        : 'Management Viewer';

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        canMutate,
        isSuperAdmin,
        roleLabel,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
