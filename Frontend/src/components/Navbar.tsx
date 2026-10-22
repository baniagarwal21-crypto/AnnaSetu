'use client';

import { SystemHealth, UserRole, NotificationItem } from '@/types';
import RoleSwitcher from './RoleSwitcher';
import ThemeToggle from './ThemeToggle';
import { Database, Cpu, Bell, Leaf, PlusCircle } from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  health: SystemHealth | null;
  notifications: NotificationItem[];
  onOpenNotifications: () => void;
  onOpenPostSurplus?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: (theme: 'light' | 'dark') => void;
}

export default function Navbar({
  currentRole,
  onRoleChange,
  health,
  notifications,
  onOpenNotifications,
  onOpenPostSurplus,
  theme,
  onToggleTheme,
}: NavbarProps) {
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#12221b]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#1e382d] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-forest-dark flex items-center justify-center text-white shadow-md shadow-emerald-900/10">
              <Leaf className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">AnnaSetu</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 tracking-wider border border-emerald-300/30">
                  AI FoodSync
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Predictive Demand & Zero-Waste Redistribution Platform
              </p>
            </div>
          </div>

          {/* Right section: System Badges, Theme Switcher & Actions */}
          <div className="flex items-center gap-3">
            {/* Database & Demo Mode pill */}
            {health && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-[#223d32] bg-slate-50 dark:bg-[#162a22] text-[11px]">
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <Database className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="capitalize">{health.database.engine}</span>
                </div>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                {health.database.is_demonstration_fallback ? (
                  <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold" title={health.database.note}>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Demo Mode
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    PostgreSQL
                  </span>
                )}
              </div>
            )}

            {/* ML Model Pill */}
            {health && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium">
                <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>AI Forecaster Active</span>
              </div>
            )}

            {/* Quick Post Surplus Button (for Admin) */}
            {currentRole === 'hostel_admin' && onOpenPostSurplus && (
              <button
                onClick={onOpenPostSurplus}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Post Surplus</span>
              </button>
            )}

            {/* Theme Switcher Bar (Day / Night) */}
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />

            {/* Notifications Button */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a3128] transition"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Role Bar */}
        <div className="py-2.5 border-t border-slate-100 dark:border-[#1d352b] flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
            <span>Operating View:</span>
          </div>
          <RoleSwitcher currentRole={currentRole} onRoleChange={onRoleChange} />
        </div>
      </div>
    </header>
  );
}
