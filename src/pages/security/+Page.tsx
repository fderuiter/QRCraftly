import { ArrowLeft, ShieldCheck, Lock, ShieldAlert } from 'lucide-react';
import { Marked } from 'marked';

import complianceText from '../../../COMPLIANCE.md?raw';
import securityText from '../../../SECURITY.md?raw';

const customMarked = new Marked({
  walkTokens(token) {
    if (token.type === 'link') {
      const href = token.href;
      if (href === 'COMPLIANCE.md' || href.startsWith('COMPLIANCE.md#')) {
        token.href = '#privacy-architecture';
      } else if (href === 'SECURITY.md' || href.startsWith('SECURITY.md#')) {
        token.href = '#security-policy';
      }
    }
  }
});

export default function Page() {
  const complianceHtml = customMarked.parse(complianceText) as string;
  const securityHtml = customMarked.parse(securityText) as string;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </a>
      </div>
      
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
          Security & Privacy Transparency Hub
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          We believe in complete transparency. Our architecture ensures your data remains yours, with privacy-first processing.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <section id="privacy-architecture" className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 prose dark:prose-invert prose-slate max-w-none">
          <div className="flex items-center gap-3 mb-6 not-prose">
            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Privacy Architecture</h2>
          </div>
          {/* eslint-disable-next-line no-restricted-syntax */}
          <div dangerouslySetInnerHTML={{ __html: complianceHtml }} />
        </section>

        <section id="security-policy" className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 prose dark:prose-invert prose-slate max-w-none">
          <div className="flex items-center gap-3 mb-6 not-prose">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Security Policy</h2>
          </div>
          {/* eslint-disable-next-line no-restricted-syntax */}
          <div dangerouslySetInnerHTML={{ __html: securityHtml }} />
        </section>
      </div>

      <section className="bg-gradient-to-br from-indigo-50 to-teal-50 dark:from-indigo-900/20 dark:to-teal-900/20 rounded-2xl p-8 md:p-12 border border-indigo-100 dark:border-indigo-800/30 text-center relative overflow-hidden">
        <div className="relative z-10">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-indigo-100 dark:border-indigo-700/50 rotate-3 transition-transform hover:rotate-12 duration-300">
            <ShieldAlert className="w-8 h-8 text-indigo-500" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Report a Vulnerability</h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Security is our top priority. If you have discovered a security vulnerability, we want to hear from you immediately through our secure channel.
          </p>
          <a
            href="https://github.com/fderuiter/QRCraftly/security/advisories/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-600/25 active:translate-y-0"
          >
            <ShieldCheck className="w-6 h-6" />
            Secure Disclosure Portal
          </a>
        </div>
      </section>
    </div>
  );
}
