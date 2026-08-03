import { contentRegistry } from '@/data/contentRegistry';
import { Accordion, AccordionItem } from './ui/Accordion';

/**
 *
 */
interface SidebarContentProps {
  /**
   *
   */
  toolId: string;
}

/**
 *
 * @param root0
 * @param root0.toolId
 */
export function SidebarContent({ toolId }: SidebarContentProps) {
  const content = contentRegistry[toolId];

  if (!content) return null;

  const displayFaqs = (content.faqs && content.faqs.length > 0) 
    ? content.faqs 
    : contentRegistry['index'].faqs;

  return (
    <div id="content-section" className="mt-12 border-t border-slate-100 pt-8 text-slate-700 dark:border-slate-800 dark:text-slate-300">
      
      {content.name && content.name !== 'QRCraftly' && (
        <section className="mb-10">
          <h2 className="mb-3 text-2xl font-bold text-slate-800 dark:text-slate-100">About {content.name}</h2>
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
          <h2 className="mb-5 text-2xl font-bold text-slate-800 dark:text-slate-100">{content.howTo.name}</h2>
          {content.howTo.description && <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">{content.howTo.description}</p>}
          <div className="space-y-4">
            {content.howTo.steps.map((step: any, idx: number) => (
              <div key={idx} className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-600 dark:bg-teal-900/50 dark:text-teal-400">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{step.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {displayFaqs && displayFaqs.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-5 text-2xl font-bold text-slate-800 dark:text-slate-100">Frequently Asked Questions</h2>
          <Accordion>
            {displayFaqs.map((q: any, idx: number) => (
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
