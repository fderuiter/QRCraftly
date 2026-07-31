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
    <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 duration-300 mb-4 overflow-hidden rounded-xl transition-all">
      <button
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-5 py-4 text-left w-full"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <span className="dark:text-slate-200 font-semibold text-slate-800">{title}</span>
        {isOpen ? (
          <ChevronUp className="dark:text-slate-400 h-5 text-slate-500 w-5" />
        ) : (
          <ChevronDown className="dark:text-slate-400 h-5 text-slate-500 w-5" />
        )}
      </button>
      {isOpen && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="dark:text-slate-400 pb-4 px-5 text-slate-600"
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
