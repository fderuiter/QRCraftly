import React from 'react';
import { mergeClasses } from './styles';

/**
 * Properties for the Card container component.
 */
export interface CardProps {
  /**
   * The content to render inside the card.
   */
  children: React.ReactNode;
  /**
   * Additional className to apply to the card wrapper.
   */
  className?: string;
  /**
   * Background classes. Defaults to "bg-white dark:bg-slate-900".
   */
  bg?: string;
  /**
   * Border classes. Defaults to "border border-slate-200 dark:border-slate-800".
   */
  border?: string;
  /**
   * Shadow classes. Defaults to "shadow-2xl".
   */
  shadow?: string;
  /**
   * Padding classes. Defaults to "p-8".
   */
  padding?: string;
  /**
   * Rounded classes. Defaults to "rounded-3xl".
   */
  rounded?: string;
}

/**
 * A reusable, strictly presentational Card container component.
 * Supports customizable background, border, shadow, rounded corners, and padding.
 * @param root0 The properties object.
 * @param root0.children The content to render inside the card.
 * @param root0.className Additional className to apply to the card wrapper.
 * @param root0.bg Background classes. Defaults to "bg-white dark:bg-slate-900".
 * @param root0.border Border classes. Defaults to "border border-slate-200 dark:border-slate-800".
 * @param root0.shadow Shadow classes. Defaults to "shadow-2xl".
 * @param root0.padding Padding classes. Defaults to "p-8".
 * @param root0.rounded Rounded classes. Defaults to "rounded-3xl".
 * @returns The rendered Card component wrapper.
 */
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  bg = 'bg-white dark:bg-slate-900',
  border = 'border border-slate-200 dark:border-slate-800',
  shadow = 'shadow-2xl',
  padding = 'p-8',
  rounded = 'rounded-3xl',
}) => {
  const cardClasses = mergeClasses(
    bg,
    border,
    shadow,
    padding,
    rounded,
    className
  );

  return (
    <div className={cardClasses}>
      {children}
    </div>
  );
};
