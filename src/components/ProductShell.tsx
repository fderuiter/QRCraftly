import type { ReactNode } from 'react';
import { QrCode } from 'lucide-react';

const generatorLinks = [
  ['URL', '/'],
  ['Text', '/text-qr-code'],
  ['WiFi', '/wifi-qr-code'],
  ['vCard', '/vcard-qr-code'],
] as const;

/**
 * Shared product chrome for informational and system pages.
 * @param root0 - Component properties.
 * @param root0.children - Page content displayed between the header and footer.
 * @returns The page wrapped in QRCraftly product chrome.
 */
export function ProductShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 p-4 sm:px-6">
          <a href="/" aria-label="QRCraftly Home" className="flex items-center gap-2 text-teal-700 transition-opacity hover:opacity-80 dark:text-teal-400">
            <QrCode className="size-7" aria-hidden="true" />
            <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">QRCraftly</span>
          </a>
          <nav aria-label="Primary navigation" className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
            <a href="/" className="rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-teal-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-teal-400">Create QR</a>
            <a href="/file-transfer" className="hidden rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-teal-700 sm:block dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-teal-400">Send File</a>
            <a href="/about" className="rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-teal-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-teal-400">About</a>
            <a href="/security" className="hidden rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-teal-700 md:block dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-teal-400">Security</a>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto_auto] sm:px-6">
          <div>
            <a href="/" className="inline-flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
              <QrCode className="size-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              QRCraftly
            </a>
            <p className="mt-3 max-w-sm text-sm text-slate-500 dark:text-slate-400">Private, browser-based tools for creating and sharing QR codes.</p>
          </div>
          <nav aria-label="QR generators">
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-200">Generators</h2>
            <ul className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              {generatorLinks.map(([label, href]) => <li key={href}><a href={href} className="hover:text-teal-600 dark:hover:text-teal-400">{label}</a></li>)}
            </ul>
          </nav>
          <nav aria-label="Company">
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-200">Company</h2>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li><a href="/about" className="hover:text-teal-600 dark:hover:text-teal-400">About</a></li>
              <li><a href="/security" className="hover:text-teal-600 dark:hover:text-teal-400">Security & Privacy</a></li>
              <li><a href="https://github.com/fderuiter/QRCraftly" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 dark:hover:text-teal-400">GitHub</a></li>
            </ul>
          </nav>
        </div>
        <p className="mx-auto max-w-7xl border-t border-slate-100 px-4 py-5 text-xs text-slate-500 sm:px-6 dark:border-slate-800 dark:text-slate-400">© {new Date().getFullYear()} QRCraftly. Open Source.</p>
      </footer>
    </div>
  );
}
