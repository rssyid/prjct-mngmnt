'use client';

import React, { createContext, useContext, useState } from 'react';

export type RoleType = 'SUPER_ADMIN' | 'WM_HO_SPECIALIST' | 'MANAGEMENT_VIEWER';

interface RoleContextValue {
  role: RoleType;
  setRole: (role: RoleType) => void;
  canMutate: boolean;
  isSuperAdmin: boolean;
  roleLabel: string;
  userName?: string;
  userEmail?: string;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [role, setRoleState] = useState<RoleType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wm_active_role') as RoleType | null;
      if (saved && ['SUPER_ADMIN', 'WM_HO_SPECIALIST', 'MANAGEMENT_VIEWER'].includes(saved)) {
        return saved;
      }
    }
    return 'SUPER_ADMIN';
  });

  React.useEffect(() => {
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          setUserName(json.data.name);
          setUserEmail(json.data.email);
          if (
            json.data.role &&
            ['SUPER_ADMIN', 'WM_HO_SPECIALIST', 'MANAGEMENT_VIEWER'].includes(json.data.role)
          ) {
            setRoleState(json.data.role as RoleType);
          }
        }
      })
      .catch(() => {});
  }, []);

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
        userName,
        userEmail,
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
