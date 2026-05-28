import React, { useEffect, useState, useRef } from 'react';

interface SchemaNode {
  '@type'?: string;
  name?: string;
  description?: string;
  featureList?: string;
  browserRequirements?: string;
  step?: Array<{ name?: string; text?: string }>;
  mainEntity?: Array<{ name?: string; acceptedAnswer?: { text?: string } }>;
  [key: string]: unknown;
}

export interface SchemaData {
  '@graph'?: SchemaNode[];
  [key: string]: unknown;
}

interface SEOContentProps {
  schemaData: SchemaData;
}

export const SEOContent: React.FC<SEOContentProps> = ({ schemaData }) => {
  const graph = schemaData['@graph'] || [];
  const webApp = graph.find((item: SchemaNode) => item['@type'] === 'WebApplication');
  const howTo = graph.find((item: SchemaNode) => item['@type'] === 'HowTo');
  const faq = graph.find((item: SchemaNode) => item['@type'] === 'FAQPage');

  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setShowBackToTop(entry.isIntersecting);
      },
      { rootMargin: '0px', threshold: 0 },
    );
    if (contentRef.current) {
      observer.observe(contentRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      id="content-section"
      ref={contentRef}
      className="w-full max-w-4xl mx-auto px-6 py-16 text-slate-700 dark:text-slate-300"
    >
      {webApp && (
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4 text-teal-700 dark:text-teal-400">About {webApp.name}</h2>
          {howTo && <p className="mb-4 text-lg">{howTo.description}</p>}
          {webApp.featureList && (
            <>
              <h3 className="text-xl font-semibold mb-3">Key Features:</h3>
              <ul className="list-disc pl-6 space-y-2">
                {webApp.featureList.split(',').map((feature: string, idx: number) => (
                  <li key={idx}>{feature.trim()}</li>
                ))}
              </ul>
            </>
          )}
          {webApp.browserRequirements && <p className="mt-4 italic text-sm">{webApp.browserRequirements}</p>}
        </section>
      )}

      {howTo && howTo.step && (
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-teal-700 dark:text-teal-400">{howTo.name}</h2>
          <ol className="list-decimal pl-6 space-y-6">
            {howTo.step.map((step: NonNullable<SchemaNode['step']>[number], idx: number) => (
              <li key={idx}>
                <h3 className="text-xl font-semibold">{step.name}</h3>
                <p className="mt-1">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {faq && faq.mainEntity && (
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-teal-700 dark:text-teal-400">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faq.mainEntity.map((q: NonNullable<SchemaNode['mainEntity']>[number], idx: number) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700"
              >
                <h3 className="text-lg font-bold mb-2">{q.name}</h3>
                <p>{q.acceptedAnswer?.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Floating Back to Tool Button */}
      {showBackToTop && (
        <div className="fixed bottom-6 right-6 z-50">
          <a
            href="#top"
            className="bg-teal-600 hover:bg-teal-700 text-white p-3 rounded-full shadow-lg transition-colors flex items-center justify-center opacity-90 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            title="Back to Tool"
            aria-label="Back to Tool"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
};
