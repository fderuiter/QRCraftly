import { ArrowLeft, ShieldCheck, ShieldAlert, FileText } from 'lucide-react';
import { SanitizedHtml } from '@/components/ui/SanitizedHtml';
import docsManifest from '../../data/docs_manifest.json';
import { ProductShell } from '@/components/ProductShell';
import { JsonLdScript } from '@/components/ui/JsonLdScript';
import { contentRegistry } from '@/data/contentRegistry';
import { generateSchema } from '@/utils/schemaGenerator';
import { resolveDomainForPath } from '@/utils/metadataEngine';
import { SidebarContent } from '@/components/SidebarContent';
import { usePageContext } from 'vike-react/usePageContext';

/**
 * Typography for compiled Markdown. The project does not ship @tailwindcss/typography, so
 * `prose` classes would be inert; these descendant utilities style the manifest HTML
 * explicitly and keep long code, tables and URLs inside the card on narrow screens.
 */
const DOC_PROSE_CLASSES = [
  'min-w-0 max-w-none text-base leading-relaxed text-slate-700 [overflow-wrap:anywhere] dark:text-slate-300',
  '[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-900 dark:[&_h3]:text-white',
  '[&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-slate-900 dark:[&_h4]:text-slate-100',
  '[&_h5]:mt-4 [&_h5]:mb-2 [&_h5]:font-semibold [&_h5]:text-slate-900 dark:[&_h5]:text-slate-100',
  '[&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1',
  '[&_a]:font-medium [&_a]:text-teal-700 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-teal-400',
  '[&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-slate-100',
  '[&_hr]:my-8 [&_hr]:border-slate-200 dark:[&_hr]:border-slate-700',
  '[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm dark:[&_code]:bg-slate-900',
  '[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-slate-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_table]:my-4 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:text-sm',
  '[&_th]:border-b [&_th]:border-slate-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold dark:[&_th]:border-slate-600',
  '[&_td]:border-b [&_td]:border-slate-100 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top dark:[&_td]:border-slate-800',
].join(' ');

/**
 * Security & Privacy Transparency Page Component.
 */
export default function Page() {
  const pageContext = usePageContext();
  const urlPathname = pageContext?.urlPathname ?? '/security';
  const resolvedDomain = resolveDomainForPath(urlPathname);
  const schemaData = generateSchema(contentRegistry['security'], resolvedDomain, urlPathname);

  return (
    <ProductShell>
      <JsonLdScript data={schemaData} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <nav className="mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="size-5" />
            Back to Home
          </a>
        </nav>
        
        <header className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-slate-900 dark:text-white">
            Security & Privacy Transparency Hub
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            We believe in complete transparency. Our architecture ensures your data remains yours, with privacy-first processing.
          </p>
        </header>

        <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          {docsManifest.map(doc => {
            return (
              <section key={doc.id} id={doc.id} className="min-w-0 scroll-mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-6 flex min-w-0 items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <FileText className="size-6" aria-hidden="true" />
                  </div>
                  <h2 className="m-0 min-w-0 text-2xl font-bold text-slate-900 dark:text-white">{doc.title}</h2>
                </div>
                <SanitizedHtml html={doc.html} className={DOC_PROSE_CLASSES} />
              </section>
            );
          })}
        </div>

        <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-teal-50 p-6 text-center sm:p-8 md:p-12 dark:border-indigo-800/30 dark:from-indigo-900/20 dark:to-teal-900/20">
          <div className="relative z-10">
            <div className="mx-auto mb-6 flex size-16 rotate-3 items-center justify-center rounded-2xl border border-indigo-100 bg-white shadow-sm motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:rotate-12 dark:border-indigo-700/50 dark:bg-slate-800">
              <ShieldAlert className="size-8 text-indigo-500" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">Report a Vulnerability</h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Security is our top priority. If you have discovered a security vulnerability, we want to hear from you immediately through our secure channel.
            </p>
            <a
              href="https://github.com/fderuiter/QRCraftly/security/advisories/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-3 rounded-xl bg-indigo-600 px-6 py-4 text-lg font-bold text-white transition-colors hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 motion-safe:hover:-translate-y-1 motion-safe:active:translate-y-0 sm:px-8"
            >
              <ShieldCheck className="size-6" />
              Secure Disclosure Portal
            </a>
          </div>
        </section>

        <div className="mx-auto max-w-3xl pt-12">
          <SidebarContent toolId="security" />
        </div>
      </div>
    </ProductShell>
  );
}
