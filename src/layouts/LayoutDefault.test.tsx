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

import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LayoutDefault from './LayoutDefault';
import { useToast } from '../components/ui/Toast';

const ProblematicComponent = () => {
  throw new Error('Simulated fatal rendering error');
};

const NotificationTrigger = () => {
  const { addToast } = useToast();
  useEffect(() => {
    addToast({ type: 'success', message: 'Test Layout Notification' });
  }, [addToast]);
  return <div data-testid="notification-trigger">Trigger Mounted</div>;
};

describe('LayoutDefault', () => {
  it('renders children correctly', () => {
    render(
      <LayoutDefault>
        <div data-testid="child-content">Child Content</div>
      </LayoutDefault>
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('contains a main landmark', () => {
    render(
      <LayoutDefault>
        <div>Content</div>
      </LayoutDefault>
    );
    // This expects to find an element with role="main"
    // Using queryByRole to avoid throwing immediately if I want to assert it's missing first,
    // but usually we want to test for presence.
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('contains a bypass skip link targeting the main landmark', () => {
    render(
      <LayoutDefault>
        <div>Content</div>
      </LayoutDefault>
    );
    const skipLink = screen.getByRole('link', { name: /skip to/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabIndex', '-1');
  });

  it('simulates fatal rendering errors and ensures the safety boundary intercepts them (Requirement 1 & 2)', () => {
    // Prevent React and Vitest from polluting the console logs with the expected crash error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LayoutDefault>
        <ProblematicComponent />
      </LayoutDefault>
    );

    // Verify recovery UI displays the correct alert
    const alertHeader = screen.getByRole('alert');
    expect(alertHeader).toBeInTheDocument();
    expect(alertHeader).toHaveTextContent('Application Error');
    expect(screen.getByText("We're sorry, but something went wrong while rendering this page.")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('confirms the recovery interface page reload triggers exactly one browser refresh attempt (Requirement 3)', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LayoutDefault>
        <ProblematicComponent />
      </LayoutDefault>
    );

    // Mock window.location in JSDOM cleanly
    const originalLocation = window.location;
    const reloadSpy = vi.fn();
    const locationMock = {
      ...originalLocation,
      reload: reloadSpy,
    };
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: locationMock,
    });

    const reloadButton = screen.getByRole('button', { name: /reload page/i });
    expect(reloadButton).toBeInTheDocument();
    reloadButton.click();

    expect(reloadSpy).toHaveBeenCalledTimes(1);

    // Restore original window.location cleanly
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
    consoleSpy.mockRestore();
  });

  it('verifies all standard application content is wrapped inside the default safety layout (Requirement 4)', () => {
    render(
      <LayoutDefault>
        <div data-testid="target-app-content">Standard Content</div>
      </LayoutDefault>
    );

    const target = screen.getByTestId('target-app-content');
    expect(target).toBeInTheDocument();

    // Verify layout enclosing standard content
    const main = screen.getByRole('main');
    expect(main).toContainElement(target);
  });

  it('asserts that secondary elements like layout notifications continue to mount under normal operation (Requirement 5)', async () => {
    render(
      <LayoutDefault>
        <NotificationTrigger />
      </LayoutDefault>
    );

    // Layout notifications (Toasts) should mount and render
    const statusToast = await screen.findByRole('status');
    expect(statusToast).toBeInTheDocument();
    expect(statusToast).toHaveTextContent('Test Layout Notification');
  });

  it('triggers a simulated rendering crash via query parameters and successfully restores layout on reload', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Inject test flags
    (window as any).__VITEST__ = true;

    // Mock window.location cleanly
    const originalLocation = window.location;
    const reloadSpy = vi.fn();
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    const locationMock = {
      ...originalLocation,
      href: 'http://localhost/?simulate-crash=true',
      search: '?simulate-crash=true',
      reload: reloadSpy,
    };
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: locationMock,
    });

    render(
      <LayoutDefault>
        <div data-testid="target-app-content">Standard Content</div>
      </LayoutDefault>
    );

    // Verify error recovery UI displays after simulated crash
    const alertHeader = screen.getByRole('alert');
    expect(alertHeader).toBeInTheDocument();
    expect(alertHeader).toHaveTextContent('Application Error');
    expect(screen.getByText("We're sorry, but something went wrong while rendering this page.")).toBeInTheDocument();
    expect(screen.queryByTestId('target-app-content')).not.toBeInTheDocument();

    // Click Reload Page and assert it clears search parameters and calls reload
    const reloadButton = screen.getByRole('button', { name: /reload page/i });
    reloadButton.click();

    expect(replaceStateSpy).toHaveBeenCalled();
    // Verify the URL constructed in replaceState did not contain simulate-crash or crash
    const calledUrl = replaceStateSpy.mock.calls[0][2] as string;
    expect(calledUrl).not.toContain('simulate-crash');
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    // Clean up
    delete (window as any).__VITEST__;
    replaceStateSpy.mockRestore();
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
    consoleSpy.mockRestore();
  });
});
