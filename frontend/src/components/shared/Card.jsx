/**
 * @fileoverview Card.jsx - Versatile card component for StudyAI Platform
 *
 * Provides a composable Card system with sub-components:
 *   Card, Card.Header, Card.Body, Card.Footer
 *
 * @module components/shared/Card
 */

import { forwardRef } from 'react';

// ─── Variant Map ──────────────────────────────────────────────────────────────

const VARIANTS = {
  default:
    'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
  elevated:
    'bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/60 dark:shadow-gray-950/60',
  glass:
    'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border border-white/40 dark:border-gray-700/40',
  gradient:
    'bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 ' +
    'border border-violet-100 dark:border-violet-900/30',
  outline:
    'bg-transparent border-2 border-gray-200 dark:border-gray-700',
};

// ─── Root Card ────────────────────────────────────────────────────────────────

/**
 * Base Card container.
 *
 * @param {{
 *   variant?: 'default' | 'elevated' | 'glass' | 'gradient' | 'outline',
 *   hover?: boolean,
 *   clickable?: boolean,
 *   padding?: 'none' | 'sm' | 'md' | 'lg',
 *   className?: string,
 *   children?: React.ReactNode,
 *   onClick?: React.MouseEventHandler
 * }} props
 */
const Card = forwardRef(function Card(
  {
    variant = 'default',
    hover = false,
    clickable = false,
    padding = 'none',
    className = '',
    children,
    onClick,
    ...rest
  },
  ref
) {
  const paddingClass = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  const interactiveClass =
    (hover || clickable)
      ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-gray-900/60'
      : '';

  const clickableClass = clickable
    ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500'
    : '';

  const classes = [
    'rounded-2xl overflow-hidden',
    VARIANTS[variant] ?? VARIANTS.default,
    paddingClass,
    interactiveClass,
    clickableClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={classes}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick?.(e);
            }
          : undefined
      }
      {...rest}
    >
      {children}
    </div>
  );
});

// ─── Card.Header ──────────────────────────────────────────────────────────────

function CardHeader({ className = '', children, ...rest }) {
  return (
    <div
      className={`px-6 py-4 border-b border-gray-100 dark:border-gray-800 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─── Card.Body ────────────────────────────────────────────────────────────────

function CardBody({ className = '', children, ...rest }) {
  return (
    <div className={`px-6 py-4 ${className}`} {...rest}>
      {children}
    </div>
  );
}

// ─── Card.Footer ──────────────────────────────────────────────────────────────

function CardFooter({ className = '', children, ...rest }) {
  return (
    <div
      className={`px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─── Attach sub-components ────────────────────────────────────────────────────

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.displayName = 'Card';

export { Card };
export default Card;
