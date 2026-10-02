import React, { useState, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from './Button';

/**
 * Props for {@link AccordionItem}.
 */
interface AccordionItemProps {
  /** Visible label of the disclosure button (also names the panel region). */
  title: string;
  /** Panel content. It stays mounted while collapsed so local state survives toggling. */
  children: React.ReactNode;
  /** Whether the panel starts expanded. */
  defaultOpen?: boolean;
  /** Wraps the disclosure button in a heading of this level so the section appears in the document outline. */
  headingLevel?: 2 | 3 | 4;
  /** Optional stable id for the panel (defaults to a generated id). */
  panelId?: string;
  /** Called with the new expanded state whenever the section is toggled. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * A single disclosure section: a button exposing `aria-expanded`/`aria-controls` and a labelled
 * region. Collapsed panels are hidden with the `hidden` attribute rather than unmounted, so
 * form state inside them is kept and the content remains in server-rendered HTML.
 * @param props - Component props.
 * @param props.title - Visible label of the disclosure button.
 * @param props.children - Content.
 * @param props.defaultOpen - Whether the panel starts expanded.
 * @param props.headingLevel - Heading level wrapping the button.
 * @param props.panelId - Optional stable panel id.
 * @param props.onOpenChange - Called with the new expanded state.
 * @returns The disclosure section.
 */
export function AccordionItem({ title, children, defaultOpen = false, headingLevel, panelId: panelIdProp, onOpenChange }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const buttonId = `accordion-button-${id}`;
  const panelId = panelIdProp ?? `accordion-panel-${id}`;

  const button = (
    <Button
      id={buttonId}
      variant="ghost"
      size="none"
      onClick={() => {
        const next = !isOpen;
        setIsOpen(next);
        onOpenChange?.(next);
      }}
      className="flex min-h-11 w-full justify-between! rounded-none px-5 py-4 text-left hover:bg-surface-hover"
      aria-expanded={isOpen}
      aria-controls={panelId}
    >
      <span className="font-semibold text-fg">{title}</span>
      <ChevronDown
        aria-hidden="true"
        className={`size-5 text-fg-muted motion-safe:transition-transform ${isOpen ? 'rotate-180' : ''}`}
      />
    </Button>
  );

  const Heading = headingLevel ? (`h${headingLevel}` as const) : null;

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-line bg-surface-raised transition-colors duration-(--duration-slow)">
      {Heading ? <Heading className="m-0 text-base">{button}</Heading> : button}
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
        className="px-5 pb-4 text-fg-muted"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Props for {@link Accordion}.
 */
interface AccordionProps {
  /** One or more {@link AccordionItem}s. */
  children: React.ReactNode;
}

/**
 * Vertical group of independent disclosure sections.
 * @param props - Component props.
 * @param props.children - Content.
 * @returns The accordion container.
 */
export function Accordion({ children }: AccordionProps) {
  return <div className="w-full">{children}</div>;
}
