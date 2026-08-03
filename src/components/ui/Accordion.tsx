import React, { useState, useId } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 *
 */
interface AccordionItemProps {
  /**
   *
   */
  title: string;
  /**
   *
   */
  children: React.ReactNode;
  /**
   *
   */
  defaultOpen?: boolean;
}

/**
 *
 * @param root0
 * @param root0.title
 * @param root0.children
 * @param root0.defaultOpen
 */
export function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const buttonId = `accordion-button-${id}`;
  const panelId = `accordion-panel-${id}`;

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 dark:border-slate-700 dark:bg-slate-800">
      <button
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <span className="font-semibold text-slate-800 dark:text-slate-200">{title}</span>
        {isOpen ? (
          <ChevronUp className="size-5 text-slate-500 dark:text-slate-400" />
        ) : (
          <ChevronDown className="size-5 text-slate-500 dark:text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="px-5 pb-4 text-slate-600 dark:text-slate-400"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 *
 */
interface AccordionProps {
  /**
   *
   */
  children: React.ReactNode;
}

/**
 *
 * @param root0
 * @param root0.children
 */
export function Accordion({ children }: AccordionProps) {
  return <div className="w-full">{children}</div>;
}
