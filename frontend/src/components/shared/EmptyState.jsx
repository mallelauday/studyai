/**
 * @fileoverview EmptyState.jsx - Empty state illustration for StudyAI Platform
 *
 * Renders a centred illustration, heading, description, and optional CTA
 * when a list, search, or feature has no data to show.
 *
 * @module components/shared/EmptyState
 */

import { BookOpen, Search, Upload, Zap, FolderOpen, BarChart2 } from 'lucide-react';
import { Button } from './Button';

// ─── Preset Icons ─────────────────────────────────────────────────────────────

const PRESET_ICONS = {
  default:   FolderOpen,
  search:    Search,
  upload:    Upload,
  study:     BookOpen,
  ai:        Zap,
  analytics: BarChart2,
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Empty state component.
 *
 * @param {{
 *   icon?: React.ReactNode | keyof PRESET_ICONS,
 *   title?: string,
 *   description?: string,
 *   action?: { label: string, onClick: () => void, variant?: string },
 *   secondaryAction?: { label: string, onClick: () => void },
 *   size?: 'sm' | 'md' | 'lg',
 *   className?: string
 * }} props
 */
export function EmptyState({
  icon = 'default',
  title = 'Nothing here yet',
  description = '',
  action,
  secondaryAction,
  size = 'md',
  className = '',
}) {
  const sizeClass = {
    sm: { wrap: 'py-8',  iconWrap: 'w-12 h-12', iconSize: 'w-5 h-5', title: 'text-base', desc: 'text-sm' },
    md: { wrap: 'py-16', iconWrap: 'w-16 h-16', iconSize: 'w-7 h-7', title: 'text-lg',   desc: 'text-sm' },
    lg: { wrap: 'py-24', iconWrap: 'w-20 h-20', iconSize: 'w-9 h-9', title: 'text-xl',   desc: 'text-base' },
  }[size] ?? { wrap: 'py-16', iconWrap: 'w-16 h-16', iconSize: 'w-7 h-7', title: 'text-lg', desc: 'text-sm' };

  // Resolve icon: string preset → component, else render as-is
  const IconEl =
    typeof icon === 'string'
      ? (PRESET_ICONS[icon] ?? PRESET_ICONS.default)
      : null;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${sizeClass.wrap} ${className}`}
      role="status"
      aria-label={title}
    >
      {/* Icon container */}
      <div
        className={`${sizeClass.iconWrap} rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950/50 dark:to-indigo-950/50 flex items-center justify-center mb-5 shadow-inner`}
      >
        {IconEl ? (
          <IconEl
            className={`${sizeClass.iconSize} text-violet-500 dark:text-violet-400`}
          />
        ) : (
          icon
        )}
      </div>

      {/* Title */}
      <h3
        className={`${sizeClass.title} font-semibold text-gray-900 dark:text-white mb-2`}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={`${sizeClass.desc} text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed mb-6`}
        >
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button
              variant={action.variant ?? 'primary'}
              onClick={action.onClick}
              size="md"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
              size="md"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
