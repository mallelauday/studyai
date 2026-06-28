/**
 * @fileoverview Button.jsx - Polymorphic button component for StudyAI Platform
 *
 * Supports multiple variants, sizes, loading states, icon placement,
 * and renders as a native <button> or as any element via the `as` prop.
 *
 * @module components/shared/Button
 */

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

// ─── Variant & Size Maps ──────────────────────────────────────────────────────

const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl ' +
  'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-violet-500 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed select-none';

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-violet-600 to-indigo-600 text-white ' +
    'hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] ' +
    'shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40',
  secondary:
    'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 ' +
    'border border-gray-200 dark:border-gray-700 ' +
    'hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.98] shadow-sm',
  ghost:
    'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 ' +
    'hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.98]',
  danger:
    'bg-gradient-to-r from-red-600 to-rose-600 text-white ' +
    'hover:from-red-500 hover:to-rose-500 active:scale-[0.98] ' +
    'shadow-lg shadow-red-500/25',
  success:
    'bg-gradient-to-r from-emerald-600 to-teal-600 text-white ' +
    'hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] ' +
    'shadow-lg shadow-emerald-500/25',
  outline:
    'border-2 border-violet-500 text-violet-600 dark:text-violet-400 ' +
    'hover:bg-violet-50 dark:hover:bg-violet-950 active:scale-[0.98]',
  link:
    'text-violet-600 dark:text-violet-400 underline-offset-4 ' +
    'hover:underline p-0 h-auto',
};

const SIZES = {
  xs: 'h-7 px-3 text-xs rounded-lg',
  sm: 'h-8 px-4 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
  xl: 'h-14 px-8 text-lg',
  icon: 'h-10 w-10 p-0',
  'icon-sm': 'h-8 w-8 p-0 rounded-lg',
  'icon-lg': 'h-12 w-12 p-0',
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Polymorphic Button component.
 *
 * @param {{
 *   variant?: keyof VARIANTS,
 *   size?: keyof SIZES,
 *   loading?: boolean,
 *   loadingText?: string,
 *   leftIcon?: React.ReactNode,
 *   rightIcon?: React.ReactNode,
 *   fullWidth?: boolean,
 *   as?: React.ElementType,
 *   className?: string,
 *   children?: React.ReactNode,
 *   disabled?: boolean,
 *   onClick?: React.MouseEventHandler
 * }} props
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    as: Tag = 'button',
    className = '',
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;

  const classes = [
    BASE,
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag
      ref={ref}
      type={Tag === 'button' ? type : undefined}
      disabled={Tag === 'button' ? isDisabled : undefined}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={classes}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingText ?? children}
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </Tag>
  );
});

Button.displayName = 'Button';

export { Button };
export default Button;
