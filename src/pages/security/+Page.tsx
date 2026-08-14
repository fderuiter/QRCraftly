import { ArrowLeft, ShieldCheck, ShieldAlert, FileText } from 'lucide-react';
import { SanitizedHtml } from '@/components/ui/SanitizedHtml';
import docsManifest from '../../data/docs_manifest.json';
import { ProductShell } from '@/components/ProductShell';

/**
 *
 */
export default function Page() {
  return (
    <ProductShell>
    <div className="mx-auto max-w-7xl px-4 py-12">
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

      <div className="mb-16 grid gap-12 md:grid-cols-2">
        {docsManifest.map(doc => {
          return (
            <section key={doc.id} id={doc.id} className="prose dark:prose-invert prose-slate col-span-1 max-w-none rounded-2xl border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="not-prose mb-6 flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                  <FileText className="size-6" />
                </div>
                <h2 className="m-0 text-2xl font-bold text-slate-900 dark:text-white">{doc.title}</h2>
              </div>
              <SanitizedHtml html={doc.html} />
            </section>
          );
        })}
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-teal-50 p-8 text-center md:p-12 dark:border-indigo-800/30 dark:from-indigo-900/20 dark:to-teal-900/20">
        <div className="relative z-10">
          <div className="mx-auto mb-6 flex size-16 rotate-3 items-center justify-center rounded-2xl border border-indigo-100 bg-white shadow-sm transition-transform duration-300 hover:rotate-12 dark:border-indigo-700/50 dark:bg-slate-800">
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
            className="inline-flex items-center gap-3 rounded-xl bg-indigo-600 px-8 py-4 text-lg font-bold text-white transition-all hover:-translate-y-1 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 active:translate-y-0"
          >
            <ShieldCheck className="size-6" />
            Secure Disclosure Portal
          </a>
        </div>
      </section>
    </div>
    </ProductShell>
  );
}
