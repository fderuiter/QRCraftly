import { contentRegistry } from '@/data/contentRegistry';
import { Accordion, AccordionItem } from './ui/Accordion';

interface SidebarContentProps {
  toolId: string;
}

export function SidebarContent({ toolId }: SidebarContentProps) {
  const content = contentRegistry[toolId];

  if (!content) return null;

  return (
    <div id="content-section" className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
      
      {content.name && content.name !== 'QRCraftly' && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3 text-slate-800 dark:text-slate-100">About {content.name}</h2>
          {content.description && <p className="mb-4 text-sm leading-relaxed">{content.description}</p>}
          {content.features && content.features.length > 0 && (
            <>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 mt-6">Key Features</h3>
              <ul className="list-none space-y-2 text-sm">
                {content.features.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-teal-500 mr-2">•</span>
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
          <h2 className="text-2xl font-bold mb-5 text-slate-800 dark:text-slate-100">{content.howTo.name}</h2>
          {content.howTo.description && <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">{content.howTo.description}</p>}
          <div className="space-y-4">
            {content.howTo.steps.map((step: any, idx: number) => (
              <div key={idx} className="flex gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-sm">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">{step.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {content.faqs && content.faqs.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-5 text-slate-800 dark:text-slate-100">Frequently Asked Questions</h2>
          <Accordion>
            {content.faqs.map((q: any, idx: number) => (
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
