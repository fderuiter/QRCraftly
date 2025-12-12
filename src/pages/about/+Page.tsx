
import React from 'react';
import { Github, Shield, Database, Code, ArrowLeft, Zap } from 'lucide-react';

/**
 * About Page Component
 *
 * Displays information about the QRCraftly project, including its core values
 * (Privacy, No Database, Open Source, Free Use) and licensing information.
 * Includes a link to the GitHub repository.
 *
 * @returns {JSX.Element} The About page layout.
 */
export default function Page() {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About QRCraftly",
    "url": "https://qrcraftly.com/about",
    "mainEntity": {
      "@type": "Organization",
      "name": "QRCraftly",
      "description": "Privacy-focused, client-side QR code generator.",
      "slogan": "Free. Secure. Open Source.",
      "foundingDate": "2025"
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
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
          About QRCraftly
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          A privacy-focused QR code generator built with modern web technologies.
          Entirely free with no login required.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Free & No Login</h2>
          <p className="text-slate-600 dark:text-slate-400">
            QRCraftly is completely free to use. No sign-up, no login, and no hidden fees. Just generate your QR codes instantly.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Third-Party Tracking</h2>
          <p className="text-slate-600 dark:text-slate-400">
            We do not use tracking pixels, cookies, or third-party analytics. We only collect basic server logs for performance and reliability.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Zero Knowledge</h2>
          <p className="text-slate-600 dark:text-slate-400">
            We utilize a Zero Knowledge architecture. Your content is processed entirely in your browser and never transmitted to our servers.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Code className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Open Source</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Our code is open for inspection and contribution. We believe in transparency.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Open Source License
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
          QRCraftly is released under the <strong>GNU Affero General Public License v3.0 (AGPL-3.0)</strong>.
          This ensures that the software remains free and open source for everyone.
        </p>
        <a
          href="https://github.com/fderuiter/QRCraftly"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
        >
          <Github className="w-5 h-5" />
          View on GitHub
        </a>
      </div>
    </div>
  );
}
