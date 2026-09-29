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

import { useCallback, useId, useRef, useState } from 'react';
import { Menu as MenuIcon, X } from 'lucide-react';
import { usePageContext } from 'vike-react/usePageContext';
import { Button } from './Button';
import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';
import { PRIMARY_NAV_ITEMS, PrimaryNavItem, getCurrentPrimaryNavId } from '@/data/navigation';

/**
 * Returns the current pathname from Vike's page context, falling back to the browser
 * location (for components rendered outside Vike, such as isolated tests).
 * @returns The current pathname.
 */
function useCurrentPathname(): string {
  const pageContext = usePageContext() as { urlPathname?: string } | undefined;
  if (pageContext?.urlPathname) return pageContext.urlPathname;
  return typeof window !== 'undefined' ? window.location.pathname : '/';
}

const BETA_BADGE_CLASSES =
  'rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300';

const LINK_BASE_CLASSES =
  'flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-slate-800 dark:hover:text-teal-400';

const LINK_IDLE_CLASSES = 'text-slate-600 dark:text-slate-300';
const LINK_CURRENT_CLASSES = 'text-teal-800 underline decoration-2 underline-offset-4 dark:text-teal-300';

/**
 * One navigation link, marked with `aria-current="page"` when it owns the current route.
 * @param root0 - Component properties.
 * @param root0.item - The destination.
 * @param root0.isCurrent - Whether it is the current page.
 * @param root0.onNavigate - Called when the link is activated.
 * @returns The list item.
 */
function NavLink({ item, isCurrent, onNavigate }: { item: PrimaryNavItem; isCurrent: boolean; onNavigate?: () => void }) {
  return (
    <li>
      <a
        href={item.href}
        aria-current={isCurrent ? 'page' : undefined}
        onClick={onNavigate}
        className={`${LINK_BASE_CLASSES} ${isCurrent ? LINK_CURRENT_CLASSES : LINK_IDLE_CLASSES}`}
      >
        <span>{item.label}</span>
        {item.beta && <span className={BETA_BADGE_CLASSES}>Beta</span>}
      </a>
    </li>
  );
}

/**
 * Properties for {@link PrimaryNav}.
 */
interface PrimaryNavProps {
  /**
   * `responsive` shows the links inline from the `md` breakpoint and a menu button below it
   * (product shell). `compact` always uses the menu button (narrow tool sidebars).
   */
  layout?: 'responsive' | 'compact';
}

/**
 * Site-wide primary navigation built from the shared `PRIMARY_NAV_ITEMS` data model, so
 * every route family offers the same destinations with the same labels. Below the inline
 * breakpoint every destination moves into a disclosure panel (not an ARIA menu: these are
 * ordinary links in the Tab order). The panel closes on Escape (restoring focus to its
 * button), on a pointer press outside and when focus leaves it. Targets are at least 44px.
 * @param props - Navigation properties.
 * @param props.layout
 * @returns The primary navigation landmark.
 */
export function PrimaryNav({ layout = 'responsive' }: PrimaryNavProps) {
  const pathname = useCurrentPathname();
  const currentId = getCurrentPrimaryNavId(pathname);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  usePopoverDismiss({ open, containerRef, triggerRef: buttonRef, onClose: close });

  const isResponsive = layout === 'responsive';

  return (
    <nav aria-label="Primary navigation" className="flex items-center">
      {isResponsive && (
        <ul className="hidden items-center gap-1 md:flex">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <NavLink key={item.id} item={item} isCurrent={item.id === currentId} />
          ))}
        </ul>
      )}
      <div ref={containerRef} className={`relative ${isResponsive ? 'md:hidden' : ''}`.trim()}>
        <Button
          ref={buttonRef}
          variant="icon"
          size="icon"
          className="min-h-11 min-w-11 rounded-full"
          aria-label="Site menu"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((isOpen) => !isOpen)}
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <MenuIcon className="size-5" aria-hidden="true" />}
        </Button>
        {open && (
          <ul
            id={panelId}
            className="absolute top-full right-0 z-40 mt-2 w-56 max-w-[calc(100vw-2rem)] space-y-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            {PRIMARY_NAV_ITEMS.map((item) => (
              <NavLink key={item.id} item={item} isCurrent={item.id === currentId} onNavigate={close} />
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}
