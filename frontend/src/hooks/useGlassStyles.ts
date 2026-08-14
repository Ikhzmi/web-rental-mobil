import { useTheme } from './useTheme';

/**
 * Shared glass card styling utilities
 */
export function useGlassStyles() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return {
    isDark,
    cardClass: isDark ? 'sa-glass-dark' : 'sa-glass-light',
    cardElevatedClass: isDark ? 'sa-glass-dark shadow-xl' : 'sa-glass-light shadow-lg',
    inputClass: isDark
      ? 'w-full rounded-xl text-sm px-4 py-3.5 bg-white/[0.03] border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all'
      : 'w-full rounded-xl text-sm px-4 py-3.5 bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 transition-all',
    textMuted: isDark ? 'text-white/60' : 'text-slate-600',
    textSecondary: isDark ? 'text-white/40' : 'text-slate-400',
    borderColor: isDark ? 'border-white/10' : 'border-slate-200',
    bgGlass: isDark ? 'bg-white/[0.03]' : 'bg-white/60',
  };
}

/**
 * Standalone helper function for when you don't want to use the hook
 */
export function getGlassCardClass(isDark: boolean): string {
  return isDark ? 'sa-glass-dark' : 'sa-glass-light';
}

/**
 * Get elevated glass card class with shadow
 */
export function getGlassCardElevatedClass(isDark: boolean): string {
  return isDark ? 'sa-glass-dark shadow-xl' : 'sa-glass-light shadow-lg';
}
