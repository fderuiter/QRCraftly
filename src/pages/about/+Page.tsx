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


import React from 'react';
import { Shield, Database, Code, ArrowLeft, Zap, Wifi, Ban } from 'lucide-react';
import { PLEDGE_COMMITMENT, PLEDGE_HEADLINE } from '@/data/pledge';
import { JsonLdScript } from '@/components/ui/JsonLdScript';
import { contentRegistry } from '@/data/contentRegistry';
import { generateSchema } from '@/utils/schemaGenerator';
import { resolveDomainForPath } from '@/utils/metadataEngine';
import { usePageContext } from 'vike-react/usePageContext';
import { ProductShell } from '@/components/ProductShell';
import { ButtonLink } from '@/components/ui/Button';

const GithubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

/**
 * About Page Component
 *
 * Displays information about the QRCraftly project, including its core values
 * (Privacy, No Database, Open Source, Free Use), the no-ads pledge and licensing information.
 * Includes a link to the GitHub repository.
 * @returns The About page layout.
 */
export default function Page() {
  const pageContext = usePageContext();
  const urlPathname = pageContext?.urlPathname ?? '/about';
  const resolvedDomain = resolveDomainForPath(urlPathname);
  const schemaData = generateSchema(contentRegistry['about'], resolvedDomain, urlPathname);

  return (
    <ProductShell>
    <div className="mx-auto max-w-5xl px-4 py-12">
      <JsonLdScript data={schemaData} />
      <nav className="mb-8">

        <a
          href="/"
          className="inline-flex items-center gap-2 text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-5" />
          Back to Home
        </a>
      </nav>
      <header className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-fg">
          About QRCraftly
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-fg-muted">
          A privacy-focused QR code generator built with modern web technologies.
          Entirely free, with no ads and no login required.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="sr-only">Why Choose QRCraftly?</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-line bg-surface-raised p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Zap className="size-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-fg">Free & No Login</h3>
            <p className="text-fg-muted">
              QRCraftly is completely free to use. No sign-up, no login, and no hidden fees. Just generate your QR codes instantly.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface-raised p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Shield className="size-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-fg">No Third-Party Tracking</h3>
            <p className="text-fg-muted">
              No analytics, tracking cookies, tracking pixels or third-party scripts. Our host, Cloudflare, only sees ordinary page requests, never your QR content.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface-raised p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Database className="size-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-fg">Privacy First</h3>
            <p className="text-fg-muted">
              Your content is processed entirely in your browser and is never sent to a server. Nothing is reported back, ever.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface-raised p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Code className="size-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-fg">Open Source</h3>
            <p className="text-fg-muted">
              Our code is open for inspection and contribution. We believe in transparency.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-16 text-center">
        <h2 className="mb-4 text-2xl font-bold text-fg">Specialized Generators</h2>
        <p className="mx-auto mb-6 max-w-2xl text-lg text-fg-muted">
          Looking for a specific use case? Try our dedicated tools.
        </p>
        <ButtonLink href="/wifi-qr-code" variant="primary" size="lg">
          <Wifi className="size-5" aria-hidden="true" />
          Create WiFi QR Code
        </ButtonLink>
      </section>

      <section
        aria-labelledby="about-pledge"
        className="mb-16 rounded-2xl border border-teal-100 bg-teal-50 p-8 text-center md:p-12 dark:border-teal-800/40 dark:bg-teal-900/20"
      >
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-teal-100 bg-surface-raised shadow-sm dark:border-teal-700/50">
          <Ban className="size-8 text-accent" aria-hidden="true" />
        </div>
        <h2 id="about-pledge" className="mb-4 text-3xl font-bold text-fg">{PLEDGE_HEADLINE}</h2>
        <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-fg-muted">{PLEDGE_COMMITMENT}</p>
        <ButtonLink href="/free-forever" variant="primary" size="lg">
          Read the QRCraftly Pledge
        </ButtonLink>
      </section>

      <section className="mb-12 rounded-2xl border border-line bg-slate-50 p-8 text-center dark:bg-slate-800/50">
        <h2 className="mb-4 text-2xl font-bold text-fg">
          Open Source License
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-fg-muted">
          QRCraftly is released under the <strong>GNU Affero General Public License v3.0 (AGPL-3.0)</strong>.
          This ensures that the software remains free and open source for everyone.
        </p>
        <ButtonLink href="https://github.com/fderuiter/QRCraftly" target="_blank" rel="noopener noreferrer" variant="outline" size="lg">
          <GithubIcon className="size-5" />
          View on GitHub
        </ButtonLink>
      </section>

    </div>
    </ProductShell>
  );
}
