/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import {
  Github,
  Shield,
  Database,
  Code,
  ArrowLeft,
  Zap,
  Wifi,
  Coffee,
} from "lucide-react";
import { safeJsonLdStringify } from "@/utils/security";
import { contentRegistry } from "@/data/contentRegistry";
import { generateSchema } from "@/utils/schemaGenerator";
import { resolveDomainForPath } from "@/utils/metadataEngine";
import { SidebarContent } from "@/components/SidebarContent";
import { usePageContext } from "vike-react/usePageContext";

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
  const pageContext = usePageContext();
  const urlPathname = pageContext?.urlPathname ?? "/about";
  const resolvedDomain = resolveDomainForPath(urlPathname);
  const schemaData = generateSchema(
    contentRegistry["about"],
    resolvedDomain,
    urlPathname,
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schemaData) }}
      />
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
          A privacy-focused QR code generator built with modern web
          technologies. Entirely free with no login required.
        </p>
      </div>

      <section className="mb-16">
        <h2 className="sr-only">Why Choose QRCraftly?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Free & No Login
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              QRCraftly is completely free to use. No sign-up, no login, and no
              hidden fees. Just generate your QR codes instantly.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No Third-Party Tracking
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              We do not use tracking pixels, cookies, or third-party analytics.
              We only collect basic server logs for performance and reliability.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Privacy First
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              We utilize a Privacy First architecture. Your content is processed
              entirely in your browser and not transmitted to our servers
              without your explicit opt-in for telemetry.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Code className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Open Source
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Our code is open for inspection and contribution. We believe in
              transparency.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Specialized Generators
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-6">
          Looking for a specific use case? Try our dedicated tools.
        </p>
        <a
          href="/wifi-qr-code"
          className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 text-white rounded-xl font-medium hover:bg-teal-800 transition-colors shadow-lg shadow-teal-900/20"
        >
          <Wifi className="w-5 h-5" />
          Create WiFi QR Code
        </a>
      </section>

      <section className="mb-16 bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20 rounded-2xl p-8 md:p-12 border border-rose-100 dark:border-rose-800/30 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-rose-300/20 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-orange-300/20 dark:bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-rose-100 dark:border-rose-700/50 rotate-3 transition-transform hover:rotate-12 duration-300">
            <Coffee className="w-8 h-8 text-[#FF5E5B]" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Support the Project
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            QRCraftly is 100% free, open-source, and privacy-respecting. If you
            find this tool helpful, consider buying me a coffee! Your support
            helps cover hosting costs and fuels future development.
          </p>
          <a
            href="https://ko-fi.com/laser_loon"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#FF5E5B] text-white rounded-xl font-bold text-lg hover:bg-[#FF4A47] transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FF5E5B]/25 active:translate-y-0"
          >
            <Coffee className="w-6 h-6" />
            Support me on Ko-fi
          </a>
        </div>
      </section>

      <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center mb-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Open Source License
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
          QRCraftly is released under the{" "}
          <strong>GNU Affero General Public License v3.0 (AGPL-3.0)</strong>.
          This ensures that the software remains free and open source for
          everyone.
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
      </section>

      <div className="max-w-3xl mx-auto">
        <SidebarContent toolId="about" />
      </div>
    </div>
  );
}
