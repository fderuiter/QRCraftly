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

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Page from './+Page';

// Hoist the mock functions
const { mockUsePageContext } = vi.hoisted(() => {
  return {
    mockUsePageContext: vi.fn()
  };
});

// Mock usePageContext
vi.mock('vike-react/usePageContext', () => ({
  usePageContext: mockUsePageContext
}));

describe('Error Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('handles 404 status correctly', () => {
    mockUsePageContext.mockReturnValue({
      is404: true
    });

    render(<Page />);

    // Verify 404 message is displayed
    expect(screen.getByRole('heading', { level: 1, name: /404 - Page Not Found/i })).toBeInTheDocument();
    expect(screen.getByText(/The page you are looking for does not exist/i)).toBeInTheDocument();
    
    // Verify reload / return safety controls are present
    const goHomeLink = screen.getByRole('link', { name: /Go Home/i });
    expect(goHomeLink).toBeInTheDocument();
    expect(goHomeLink).toHaveAttribute('href', '/');
    expect(screen.getByRole('navigation', { name: /Primary navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('handles 500 status correctly', () => {
    mockUsePageContext.mockReturnValue({
      is404: false
    });

    render(<Page />);

    // Verify 500 message is displayed
    expect(screen.getByRole('heading', { level: 1, name: /500 - Internal Server Error/i })).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong on our end/i)).toBeInTheDocument();
    
    // Verify reload / return safety controls are present
    const goHomeLink = screen.getByRole('link', { name: /Go Home/i });
    expect(goHomeLink).toBeInTheDocument();
    expect(goHomeLink).toHaveAttribute('href', '/');
  });
});
