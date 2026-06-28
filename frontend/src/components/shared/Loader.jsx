/**
 * @fileoverview Loader.jsx - Loading indicators for StudyAI Platform
 *
 * Provides three exported components:
 *   - Loader        → spinner (inline or full-screen)
 *   - SkeletonBox   → shimmer placeholder for arbitrary shapes
 *   - PageLoader    → full-viewport branded loading screen
 *
 * @module components/shared/Loader
 */

// ─── Spinner ──────────────────────────────────────────────────────────────────

const SIZES = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
  xl: 'h-12 w-12 border-4',
};

const COLOURS = {
  primary: 'border-violet-200 dark:border-violet-900 border-t-violet-600 dark:border-t-violet-400',
  white:   'border-white/30 border-t-white',
  gray:    'border-gray-200 dark:border-gray-700 border-t-gray-500 dark:border-t-gray-400',
};

/**
 * Circular spinner component.
 *
 * @param {{
 *   size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl',
 *   colour?: 'primary' | 'white' | 'gray',
 *   label?: string,
 *   center?: boolean,
 *   className?: string
 * }} props
 */
export function Loader({
  size = 'md',
  colour = 'primary',
  label = 'Loading…',
  center = false,
  className = '',
}) {
  const spinner = (
    <div
      role="status"
      aria-label={label}
      className={`inline-flex flex-col items-center gap-2 ${center ? 'mx-auto' : ''} ${className}`}
    >
      <div
        className={`rounded-full animate-spin ${SIZES[size] ?? SIZES.md} ${COLOURS[colour] ?? COLOURS.primary}`}
      />
      <span className="sr-only">{label}</span>
    </div>
  );

  if (center) {
    return (
      <div className="flex items-center justify-center w-full py-12">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// ─── Skeleton Box ─────────────────────────────────────────────────────────────

/**
 * Shimmer skeleton placeholder.
 *
 * @param {{
 *   width?: string,
 *   height?: string,
 *   rounded?: string,
 *   className?: string
 * }} props
 */
export function SkeletonBox({
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded-lg',
  className = '',
}) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${width} ${height} ${rounded} ${className}`}
    />
  );
}

/**
 * Skeleton for a card-like block.
 *
 * @param {{ lines?: number, hasAvatar?: boolean }} props
 */
export function SkeletonCard({ lines = 3, hasAvatar = false }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3">
      {hasAvatar && (
        <div className="flex items-center gap-3">
          <SkeletonBox width="w-10" height="h-10" rounded="rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBox height="h-3" width="w-1/2" />
            <SkeletonBox height="h-3" width="w-1/4" />
          </div>
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          width={i === lines - 1 ? 'w-3/4' : 'w-full'}
          height="h-3"
        />
      ))}
    </div>
  );
}

// ─── Page Loader ──────────────────────────────────────────────────────────────

/**
 * Full-viewport branded loading screen.
 *
 * @param {{ message?: string }} props
 */
export function PageLoader({ message = 'Loading StudyAI…' }) {
  return (
    <div
      role="status"
      aria-label={message}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center
                 bg-white dark:bg-gray-950"
    >
      {/* Brand mark */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          StudyAI
        </span>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5 mb-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-violet-600 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      <span className="sr-only">{message}</span>
    </div>
  );
}
