
import React from 'react';
import { Github, Shield, Database, Code, ArrowLeft } from 'lucide-react';

/**
 * About Page Component
 *
 * Displays information about the QRCraftly project, including its core values
 * (Privacy, No Database, Open Source) and licensing information.
 * Includes a link to the GitHub repository.
 *
 * @returns {JSX.Element} The About page layout.
 */
export default function Page() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
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
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Tracking</h3>
          <p className="text-slate-600 dark:text-slate-400">
            We don't track your usage or collect any analytics data. Your privacy is our priority.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Database</h3>
          <p className="text-slate-600 dark:text-slate-400">
            We don't store your QR codes or the content you enter. Everything is generated instantly in your browser.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Code className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Open Source</h3>
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
