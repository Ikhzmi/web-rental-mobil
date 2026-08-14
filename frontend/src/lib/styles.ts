/**
 * Shared CSS class utilities for consistent styling across components
 */

/**
 * Input field class based on theme
 */
export const inputClass = (isDark: boolean, hasError = false) => {
  const base = 'w-full rounded-xl text-sm px-4 py-3.5 transition-all focus:outline-none';
  const errorClass = hasError ? 'border-red-500/50' : '';

  if (isDark) {
    return `${base} bg-white/[0.03] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:bg-white/[0.05] ${errorClass}`;
  }
  return `${base} bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 ${errorClass}`;
};

/**
 * Glass card class based on theme
 */
export const glassCardClass = (isDark: boolean) => {
  return isDark
    ? 'rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6 md:p-8'
    : 'rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 p-6 md:p-8';
};

/**
 * Glass card elevated class (for sidebar components)
 */
export const glassCardElevatedClass = (isDark: boolean) => {
  return isDark
    ? 'rounded-2xl bg-white/[0.06] backdrop-blur-2xl border border-white/10 shadow-2xl'
    : 'rounded-2xl bg-white/80 backdrop-blur-2xl border border-white/80 shadow-xl shadow-slate-900/10';
};

/**
 * Glass header class based on theme
 */
export const glassHeaderClass = (isDark: boolean) => {
  return isDark
    ? 'bg-white/[0.03] backdrop-blur-xl border-b border-white/10'
    : 'bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-sm';
};

/**
 * Button primary class based on theme
 */
export const buttonPrimaryClass = (isDark: boolean, disabled = false) => {
  if (disabled) {
    return isDark
      ? 'bg-white/5 text-white/40 cursor-not-allowed'
      : 'bg-slate-100 text-slate-400 cursor-not-allowed';
  }
  return isDark
    ? 'glass-cta-dark'
    : 'glass-booking-btn-light';
};

/**
 * Button secondary class based on theme
 */
export const buttonSecondaryClass = (isDark: boolean) => {
  return isDark
    ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';
};

/**
 * Text muted class based on theme
 */
export const textMutedClass = (isDark: boolean) => {
  return isDark ? 'text-white/60' : 'text-slate-600';
};

/**
 * Text secondary class based on theme
 */
export const textSecondaryClass = (isDark: boolean) => {
  return isDark ? 'text-white/40' : 'text-slate-400';
};

/**
 * Badge class based on theme
 */
export const badgeClass = (isDark: boolean, colorClass: string) => {
  return isDark ? colorClass : colorClass;
};

/**
 * Loading spinner class based on theme
 */
export const spinnerClass = (isDark: boolean) => {
  return isDark ? 'text-white' : 'text-stone-900';
};
