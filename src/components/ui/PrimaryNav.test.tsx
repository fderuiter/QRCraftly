import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { PrimaryNav } from './PrimaryNav';
import { PRIMARY_NAV_ITEMS } from '@/data/navigation';

let mockPathname = '/';
vi.mock('vike-react/usePageContext', () => ({
  usePageContext: () => ({ urlPathname: mockPathname }),
}));

afterEach(() => {
  mockPathname = '/';
});

function openMenu() {
  const button = screen.getByRole('button', { name: 'Site menu' });
  fireEvent.click(button);
  return button;
}

describe('PrimaryNav', () => {
  it('renders every primary destination inline (responsive layout) with shared labels', () => {
    render(<PrimaryNav />);
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    for (const item of PRIMARY_NAV_ITEMS) {
      expect(within(nav).getByRole('link', { name: new RegExp(`^${item.label}`) })).toHaveAttribute('href', item.href);
    }
  });

  it('puts every destination in the narrow-screen menu, so nothing is removed on mobile', () => {
    render(<PrimaryNav layout="compact" />);
    const button = openMenu();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(button.getAttribute('aria-controls') as string) as HTMLElement;
    expect(within(panel).getAllByRole('link')).toHaveLength(PRIMARY_NAV_ITEMS.length);
    expect(within(panel).getByRole('link', { name: /File Transfer/ })).toHaveAttribute('href', '/file-transfer');
  });

  it('marks the current destination with aria-current="page"', () => {
    mockPathname = '/security';
    render(<PrimaryNav layout="compact" />);
    openMenu();
    expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'About' })).not.toHaveAttribute('aria-current');
  });

  it('marks File Transfer as active for both sender and receiver routes', () => {
    mockPathname = '/file-transfer/receive';
    render(<PrimaryNav layout="compact" />);
    openMenu();
    expect(screen.getByRole('link', { name: /File Transfer/ })).toHaveAttribute('aria-current', 'page');
  });

  it('treats every generator route as "Create QR"', () => {
    mockPathname = '/wifi-qr-code';
    render(<PrimaryNav layout="compact" />);
    openMenu();
    expect(screen.getByRole('link', { name: 'Create QR' })).toHaveAttribute('aria-current', 'page');
  });

  it('Escape closes the menu and restores focus to its button', () => {
    render(<PrimaryNav layout="compact" />);
    const button = openMenu();
    const link = screen.getByRole('link', { name: 'About' });
    link.focus();
    fireEvent.keyDown(link, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'About' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(button);
  });

  it('closes on an outside pointer press', () => {
    render(
      <div>
        <p>Elsewhere</p>
        <PrimaryNav layout="compact" />
      </div>,
    );
    const button = openMenu();
    fireEvent.mouseDown(screen.getByText('Elsewhere'));
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when focus leaves the menu', () => {
    render(
      <div>
        <PrimaryNav layout="compact" />
        <button type="button">Next control</button>
      </div>,
    );
    const button = openMenu();
    const next = screen.getByRole('button', { name: 'Next control' });
    fireEvent.focusOut(screen.getByRole('link', { name: 'About' }), { relatedTarget: next });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('uses links (disclosure), not ARIA menu roles, and keeps 44px targets', () => {
    render(<PrimaryNav layout="compact" />);
    const button = openMenu();
    expect(button).not.toHaveAttribute('aria-haspopup');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button.className).toContain('min-h-11');
    screen.getAllByRole('link').forEach((link) => expect(link.className).toContain('min-h-11'));
  });

  it('has no axe violations open or closed', async () => {
    const { container } = render(<PrimaryNav />);
    expect(await axe(container)).toHaveNoViolations();
    openMenu();
    expect(await axe(container)).toHaveNoViolations();
  });
});
