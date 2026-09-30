import { contentRegistry } from '@/data/contentRegistry';
import { Accordion, AccordionItem } from './ui/Accordion';

interface SidebarContentProps {
  toolId: string;
}

/**
 * Builds the overview heading for a registry entry without doubling a leading "About"
 * (for example "About QRCraftly" stays as is instead of becoming "About About QRCraftly").
 * @param name - Registry display name.
 * @returns The section heading.
 */
export function getAboutHeading(name: string): string {
  return /^about\b/i.test(name.trim()) ? name.trim() : `About ${name}`;
}

/**
 * Renders the overview, how-to and FAQ sections for a tool's registry entry.
 * @param root0 - Component properties.
 * @param root0.toolId - Content registry id.
 * @returns The content sections, or null for unknown ids.
 */
export function SidebarContent({ toolId }: SidebarContentProps) {
  const content = contentRegistry[toolId];

  if (!content) return null;

  const displayFaqs = (content.faqs && content.faqs.length > 0) 
    ? content.faqs 
    : contentRegistry['index'].faqs;

  return (
    <div id="content-section" className="mt-12 border-t border-line-subtle pt-8 text-fg-soft">
      
      {content.name && content.name !== 'QRCraftly' && (
        <section className="mb-10">
          <h2 className="mb-3 text-2xl font-bold text-fg">{getAboutHeading(content.name)}</h2>
          {content.description && <p className="mb-4 text-sm leading-relaxed">{content.description}</p>}
          {content.features && content.features.length > 0 && (
            <>
              <h3 className="mt-6 mb-3 text-sm font-bold tracking-wider text-slate-500 uppercase">Key Features</h3>
              <ul className="list-none space-y-2 text-sm">
                {content.features.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start">
                    <span className="mr-2 text-teal-500">•</span>
                    {feature.trim()}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {content.howTo && content.howTo.steps && content.howTo.steps.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-5 text-2xl font-bold text-fg">{content.howTo.name}</h2>
          {content.howTo.description && <p className="mb-5 text-sm text-fg-muted">{content.howTo.description}</p>}
          <div className="space-y-4">
            {content.howTo.steps.map((step, idx) => (
              <div key={idx} className="flex gap-4 rounded-xl border border-line bg-slate-50 p-4 dark:bg-slate-800/50">
                <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-accent dark:bg-teal-900/50">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-fg">{step.name}</h3>
                  <p className="text-sm text-fg-muted">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {displayFaqs && displayFaqs.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-5 text-2xl font-bold text-fg">Frequently Asked Questions</h2>
          <Accordion>
            {displayFaqs.map((q, idx) => (
              <AccordionItem key={idx} title={q.question}>
                {q.answer}
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
    </div>
  );
}
