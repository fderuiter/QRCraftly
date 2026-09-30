import type { ReactNode } from 'react';
import { QrCode } from 'lucide-react';
import { isDangerousUrl } from '../utils/security';
import { PrimaryNav } from './ui/PrimaryNav';
import { ThemeToggle } from './ui/ThemeToggle';
import { PLEDGE_TAGLINE } from '../data/pledge';

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
    <div className="flex min-h-screen w-full flex-col bg-page">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 p-4 sm:gap-6 sm:px-6">
          <a href="/" aria-label="QRCraftly Home" className="flex min-w-0 items-center gap-2 text-accent transition-opacity hover:opacity-80">
            <QrCode className="size-7" aria-hidden="true" />
            <span className="text-xl font-bold tracking-tight text-fg">QRCraftly</span>
          </a>
          <div className="flex shrink-0 items-center gap-1">
            <PrimaryNav />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto_auto] sm:px-6">
          <div>
            <a href="/" className="inline-flex items-center gap-2 font-bold text-fg">
              <QrCode className="size-5 text-accent" aria-hidden="true" />
              QRCraftly
            </a>
            <p className="mt-3 max-w-sm text-sm text-fg-muted">Private, browser-based tools for creating and sharing QR codes.</p>
          </div>
          <nav aria-label="QR generators">
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-fg uppercase">Generators</h2>
            <ul className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm text-fg-muted">
              {generatorLinks.map(([label, href]) => {
                if (!isDangerousUrl(href)) {
                  return (
                    <li key={href}>
                      <a href={href} className="hover:text-accent">
                        {label}
                      </a>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          </nav>
          <nav aria-label="Company">
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-fg uppercase">Company</h2>
            <ul className="space-y-2 text-sm text-fg-muted">
              <li><a href="/about" className="hover:text-accent">About</a></li>
              <li><a href="/free-forever" className="hover:text-accent">No-Ads Pledge</a></li>
              <li><a href="/security" className="hover:text-accent">Security & Privacy</a></li>
              <li><a href="https://github.com/fderuiter/QRCraftly" target="_blank" rel="noopener noreferrer" className="hover:text-accent">GitHub</a></li>
            </ul>
          </nav>
        </div>
        <p className="mx-auto max-w-7xl border-t border-line-subtle px-4 py-5 text-xs text-fg-muted sm:px-6"><a href="/free-forever" className="font-medium text-fg-muted hover:text-accent">{PLEDGE_TAGLINE}</a> © {new Date().getFullYear()} QRCraftly. Open Source.</p>
      </footer>
    </div>
  );
}
