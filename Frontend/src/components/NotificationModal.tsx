'use client';

import { NotificationItem } from '@/types';
import { X, CheckCheck, Bell, AlertTriangle, CheckCircle2, Utensils, Truck } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}

export default function NotificationModal({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
}: NotificationModalProps) {
  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'iot_alert':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'otp_verified':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'surplus_new':
        return <Utensils className="w-4 h-4 text-amber-500" />;
      case 'claim_reserved':
        return <Truck className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#152720] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#223d32] w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#223d32] flex items-center justify-between bg-slate-50/60 dark:bg-[#1a3128]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white text-base">Platform Notifications</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live operational alerts & handoff updates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1f3a30] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-6 py-2.5 bg-slate-50/30 dark:bg-[#162a22]/50 border-b border-slate-100 dark:border-[#223d32] flex justify-between items-center text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {notifications.filter((n) => !n.is_read).length} unread updates
          </span>
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-100 dark:divide-[#223d32]">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No notifications at this time.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`pt-2.5 first:pt-0 flex items-start gap-3 p-2.5 rounded-xl transition ${
                  n.is_read
                    ? 'opacity-70 bg-transparent'
                    : 'bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30'
                }`}
              >
                <div className="mt-0.5 p-1.5 rounded-lg bg-white dark:bg-[#1c362b] shadow-xs border border-slate-100 dark:border-[#294c3d]">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{n.title}</h4>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-[#223d32] bg-slate-50/50 dark:bg-[#162a22] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
