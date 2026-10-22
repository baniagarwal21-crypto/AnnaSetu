'use client';

import { UserRole } from '@/types';
import { ShieldCheck, Building2, HeartHandshake, Truck } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const ROLES: { id: UserRole; label: string; desc: string; icon: any; activeClass: string }[] = [
  {
    id: 'hostel_admin',
    label: 'Hostel Administrator',
    desc: 'Turnout forecast, surplus logging & IoT storage',
    icon: Building2,
    activeClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/70',
  },
  {
    id: 'ngo_coordinator',
    label: 'NGO Coordinator',
    desc: 'Discover nearby surplus & claim meals with OTP',
    icon: HeartHandshake,
    activeClass: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/70',
  },
  {
    id: 'driver',
    label: 'Logistics / Driver',
    desc: 'TSP route optimizer & physical delivery OTP verification',
    icon: Truck,
    activeClass: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700/70',
  },
  {
    id: 'auditor',
    label: 'ESG Auditor',
    desc: 'Cryptographic SHA-256 chain & waste diversion metrics',
    icon: ShieldCheck,
    activeClass: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700/70',
  },
];

export default function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ROLES.map((r) => {
        const Icon = r.icon;
        const isActive = currentRole === r.id;
        return (
          <button
            key={r.id}
            onClick={() => onRoleChange(r.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isActive
                ? `${r.activeClass} shadow-xs ring-2 ring-emerald-600/20 font-semibold`
                : 'bg-white dark:bg-[#162a22] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#223d32] hover:bg-slate-50 dark:hover:bg-[#1c362b]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}
