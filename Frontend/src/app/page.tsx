'use client';

import { useState, useEffect } from 'react';
import { UserRole, SystemHealth, NotificationItem } from '@/types';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import HostelAdminDashboard from '@/components/HostelAdminDashboard';
import NGODashboard from '@/components/NGODashboard';
import DriverRouteConsole from '@/components/DriverRouteConsole';
import ESGAnalyticsView from '@/components/ESGAnalyticsView';
import NotificationModal from '@/components/NotificationModal';
import { AlertTriangle } from 'lucide-react';

export default function Home() {
  const [currentRole, setCurrentRole] = useState<UserRole>('hostel_admin');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('annasetu_theme') as 'light' | 'dark' | null;
      if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setTheme('dark');
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        setTheme('light');
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  }, []);

  const handleToggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('annasetu_theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  };

  const fetchGlobalState = async () => {
    try {
      const [h, n] = await Promise.all([
        api.getHealth(),
        api.getNotifications(currentRole),
      ]);
      setHealth(h);
      setNotifications(n);
    } catch (e) {
      console.warn('API fetch warning', e);
    }
  };

  useEffect(() => {
    fetchGlobalState();
    const interval = setInterval(fetchGlobalState, 12000);
    return () => clearInterval(interval);
  }, [currentRole, refreshTrigger]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead(currentRole);
      fetchGlobalState();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-[#0c1813] transition-colors duration-200">
      {/* Top Navbar with Role Switcher, Day/Night Theme Bar & Status Badges */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={(role) => setCurrentRole(role)}
        health={health}
        notifications={notifications}
        onOpenNotifications={() => setIsNotifOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Persistence Notice Banner (Safe Demo Mode vs PostgreSQL) */}
      {health?.database.is_demonstration_fallback && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
          <div className="max-w-7xl mx-auto flex items-center gap-2 w-full">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <b>Safe Demonstration Mode Active:</b> Persistent local SQLite engine active (all data, claims, OTPs, and ML models are fully saved). To use PostgreSQL, set <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-amber-950 dark:text-amber-100 font-mono">DATABASE_URL=postgresql://user:pass@localhost:5432/annasetu</code>.
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentRole === 'hostel_admin' && (
          <HostelAdminDashboard onRefreshAll={() => setRefreshTrigger((prev) => prev + 1)} />
        )}

        {currentRole === 'ngo_coordinator' && (
          <NGODashboard onRefreshAll={() => setRefreshTrigger((prev) => prev + 1)} />
        )}

        {currentRole === 'driver' && (
          <DriverRouteConsole onRefreshAll={() => setRefreshTrigger((prev) => prev + 1)} />
        )}

        {currentRole === 'auditor' && <ESGAnalyticsView />}
      </main>

      {/* Notification Modal Drawer */}
      <NotificationModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* Footer */}
      <footer className="bg-white dark:bg-[#12221b] border-t border-slate-200 dark:border-[#1e382d] py-6 text-xs text-slate-500 dark:text-slate-400 text-center transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-200">AnnaSetu Ecosystem</span>
            <span>·</span>
            <span>Zero Food Waste & Intelligent Redistribution</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
            <span>FastAPI 0.143 + Python 3.13</span>
            <span>·</span>
            <span>Next.js 14 + Tailwind CSS</span>
            <span>·</span>
            <span>RandomForest Regressor</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
