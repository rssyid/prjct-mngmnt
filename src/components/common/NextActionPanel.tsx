'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface NextActionItem {
  id: string;
  label: string;
  description: string;
  actionText: string;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
}

interface NextActionPanelProps {
  currentStatus: string;
  actions: NextActionItem[];
}

export function NextActionPanel({ currentStatus, actions }: NextActionPanelProps) {
  if (actions.length === 0) return null;

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border-blue-200 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0f2c59]">
              Langkah Berikutnya
            </span>
            <span className="text-[11px] text-slate-500">&bull; Status Saat Ini: {currentStatus}</span>
          </div>
          <p className="text-xs text-slate-700">
            {actions[0]?.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions.map((act) => {
            if (act.disabled) {
              return (
                <div key={act.id} className="relative group inline-block" title={act.disabledReason}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="h-8 text-xs gap-1.5 border-slate-300 text-slate-400 bg-slate-50 cursor-not-allowed"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    {act.actionText}
                  </Button>
                  {act.disabledReason && (
                    <div className="hidden group-hover:block absolute bottom-full mb-1 right-0 z-50 p-2 bg-slate-900 text-white text-[11px] rounded shadow-lg whitespace-nowrap max-w-xs">
                      {act.disabledReason}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Button
                key={act.id}
                variant={act.variant || 'default'}
                size="sm"
                onClick={act.onClick}
                className="h-8 text-xs gap-1.5 bg-[#0f2c59] hover:bg-[#163a70] text-white shadow-xs"
              >
                {act.actionText}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
