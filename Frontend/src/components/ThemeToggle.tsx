'use client';

import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: (theme: 'light' | 'dark') => void;
  className?: string;
}

export default function ThemeToggle({ theme, onToggle, className = '' }: ThemeToggleProps) {
  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner ${className}`}
      role="group"
      aria-label="Theme switcher"
    >
      <button
        type="button"
        onClick={() => onToggle('light')}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
          theme === 'light'
            ? 'bg-white text-amber-600 shadow-xs border border-slate-200/80'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        title="Switch to Day Mode"
      >
        <Sun className="w-3.5 h-3.5 text-amber-500" />
        <span>Day</span>
      </button>

      <button
        type="button"
        onClick={() => onToggle('dark')}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
          theme === 'dark'
            ? 'bg-slate-900 text-indigo-400 shadow-xs border border-slate-700'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        title="Switch to Night Mode"
      >
        <Moon className="w-3.5 h-3.5 text-indigo-400" />
        <span>Night</span>
      </button>
    </div>
  );
}
