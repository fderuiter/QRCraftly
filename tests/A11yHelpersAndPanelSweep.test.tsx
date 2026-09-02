import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToastProvider } from '@/components/ui/Toast';
import QRTool from '@/components/QRTool';
import StyleControls from '@/components/StyleControls';
import { TypeSelector } from '@/components/inputs/TypeSelector';
import { generateQRSvg } from '@/utils/svgExport';
import { DEFAULT_CONFIG } from '@/constants';
import { QRType, QRConfig, TemplateStyle } from '@/types';

// Controls for mock values
let mockScannabilityStatus = 'pass';
let mockScannabilityHealth = { score: 100, warnings: [] as string[] };

// Mock useScannability to control scannability status programmatically
vi.mock('@/hooks/useScannability', () => ({
  useScannability: () => ({
    status: mockScannabilityStatus,
    checkScannability: vi.fn(),
    health: mockScannabilityHealth,
  }),
}));

// Mock QRCanvas because canvas and context interactions can be problematic in jsdom
vi.mock('@/components/QRCanvas', () => ({
  default: () => (
    <div data-testid="qr-canvas-mock">
      <canvas data-testid="mock-canvas" />
    </div>
  ),
}));

/**
 * Custom helper to programmatically expand all style panel sections.
 * This ensures no interactive element gets skipped in the keyboard tab sequence.
 * @param container - The container element holding the style panels.
 * @param onChange - Callback function to simulate config changes.
 */
export function expandAllStyleSections(container: HTMLElement, onChange: any) {
  // 1. Expand "Advanced Mode" if not already expanded.
  const advancedBtn = within(container).queryByRole('button', { name: /Advanced Mode/i });
  if (advancedBtn && advancedBtn.getAttribute('aria-expanded') === 'false') {
    fireEvent.click(advancedBtn);
  }

  // 2. Expand "Border" by changing config to enable border if needed.
  if (onChange) {
    onChange({ isBorderEnabled: true });
  }

  // 3. Expand "Layout" options by choosing a template style.
  if (onChange) {
    onChange({ templateStyle: TemplateStyle.SOLID_FRAME });
  }
}

describe('Modular Accessibility Test Helpers & Full Panel Sweep', () => {
  beforeEach(() => {
    mockScannabilityStatus = 'pass';
    mockScannabilityHealth = { score: 100, warnings: [] };
    vi.clearAllMocks();
  });

  // Requirement 1 / AC 1: Warning Dialog Focus Restoration
  it('restores focus to the triggering element when the safety gate warning dialog is closed', async () => {
    // Force scannability status to 'fail' to trigger the safety gate warning modal
    mockScannabilityStatus = 'fail';
    mockScannabilityHealth = { score: 50, warnings: ['Low Contrast'] };

    render(
      <ToastProvider>
        <QRTool />
      </ToastProvider>
    );

    // Locate the primary Download button
    const downloadBtn = screen.getAllByText('Download')[0];
    expect(downloadBtn).toBeInTheDocument();

    // Open download menu and click export format to trigger safety gate
    fireEvent.click(downloadBtn);
    const pngOption = screen.getByText(/PNG \(High Quality\)/i);
    pngOption.focus();
    expect(document.activeElement).toBe(pngOption);
    fireEvent.click(pngOption);

    // Verify warning dialog is open
    expect(screen.getByText('Scan Safety Warning')).toBeInTheDocument();

    // Find and click 'Go Back' inside the modal to cancel/close the warning
    const goBackBtn = screen.getByRole('button', { name: 'Go Back' });
    fireEvent.click(goBackBtn);

    // Confirm that the warning dialog is hidden
    await waitFor(() => {
      expect(screen.queryByText('Scan Safety Warning')).not.toBeInTheDocument();
    });

    // Verify focus is safely and seamlessly restored to the triggering element
    expect(document.activeElement).toBe(pngOption);
  });

  // Requirement 2 / AC 2: Bidirectional & Boundary Keyboard Navigation
  it('navigates sequentially and boundary-wraps across QR panels using Left, Right, Home, and End keys', () => {
    const mockOnSelect = vi.fn();
    render(<TypeSelector currentType={QRType.URL} onSelect={mockOnSelect} />);
    const tablist = screen.getByRole('tablist');
    const tabs = screen.getAllByRole('tab');

    expect(tabs.length).toBe(12);

    // Set initial focus to the first tab (URL)
    tabs[0].focus();
    expect(document.activeElement).toBe(tabs[0]);

    // Test End boundary key - jumps to the final (Social) tab
    fireEvent.keyDown(tablist, { key: 'End' });
    expect(document.activeElement).toBe(tabs[11]);
    expect(mockOnSelect).toHaveBeenCalledWith(QRType.SOCIAL);

    // Test Home boundary key - jumps back to the first (URL) tab
    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(document.activeElement).toBe(tabs[0]);
    expect(mockOnSelect).toHaveBeenCalledWith(QRType.URL);

    // Test ArrowRight key - moves to second tab (Text)
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabs[1]);
    expect(mockOnSelect).toHaveBeenCalledWith(QRType.TEXT);

    // Test ArrowLeft key - moves back to first tab (URL)
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tabs[0]);
    expect(mockOnSelect).toHaveBeenCalledWith(QRType.URL);

    // Test Wrap-around Left: ArrowLeft on the first element jumps to the last element (Social)
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tabs[11]);
    expect(mockOnSelect).toHaveBeenCalledWith(QRType.SOCIAL);

    // Test Wrap-around Right: ArrowRight on the last element wraps to the first element (URL)
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabs[0]);
    expect(mockOnSelect).toHaveBeenCalledWith(QRType.URL);
  });

  // Requirement 3 / AC 3: Contrast Alerts Polite Live Region Updates
  it('updates polite screen-reader live regions with contrast alerts during color combinations changes', () => {
    const mockOnChange = vi.fn();

    // High contrast styling configuration (no warning active)
    const highContrastConfig: QRConfig = {
      ...DEFAULT_CONFIG,
      fgColor: '#000000',
      bgColor: '#ffffff',
    };

    const { rerender } = render(
      <StyleControls config={highContrastConfig} onChange={mockOnChange} />
    );

    // Confirm warning banner is not visible initially
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    // Rerender with low contrast styling configuration (e.g. white foreground on white background)
    const lowContrastConfig: QRConfig = {
      ...DEFAULT_CONFIG,
      fgColor: '#ffffff',
      bgColor: '#ffffff',
    };

    rerender(<StyleControls config={lowContrastConfig} onChange={mockOnChange} />);

    // Assert screen-reader live region exists, is polite, and is populated with the warning alert
    const statusAlert = screen.getByRole('status');
    expect(statusAlert).toBeInTheDocument();
    expect(statusAlert.parentElement).toHaveAttribute('aria-live', 'polite');
    expect(statusAlert).toHaveTextContent(/Warning: The contrast ratio is low/);
  });

  // Requirement 4 / AC 4: SVG Meta-tag Inspection (Title & Description tags)
  it('inspects exported SVG documents to ensure correct, descriptive accessible meta-tags for data structures', async () => {
    // 1. Verify URL configuration SVG titles/descriptions
    const urlConfig: QRConfig = {
      ...DEFAULT_CONFIG,
      type: QRType.URL,
      value: 'https://qrcraftly.com/a11y',
    };
    const urlSvg = await generateQRSvg(urlConfig);
    expect(urlSvg).toContain('<title>URL QR Code</title>');
    expect(urlSvg).toContain('<desc>https://qrcraftly.com/a11y</desc>');

    // 2. Verify WiFi configuration SVG titles/descriptions
    const wifiConfig: QRConfig = {
      ...DEFAULT_CONFIG,
      type: QRType.WIFI,
      value: 'WIFI:T:WPA;S:MyA11yWiFiNetwork;P:superpass;;',
    };
    const wifiSvg = await generateQRSvg(wifiConfig);
    expect(wifiSvg).toContain('<title>WiFi Network QR Code</title>');
    expect(wifiSvg).toContain('<desc>MyA11yWiFiNetwork</desc>');

    // 3. Verify Contact (vCard) configuration SVG titles/descriptions
    const vcardConfig: QRConfig = {
      ...DEFAULT_CONFIG,
      type: QRType.VCARD,
      value: 'BEGIN:VCARD\nVERSION:3.0\nN:A11y;Engineer\nFN:A11y Engineer\nORG:W3C\nEND:VCARD',
    };
    const vcardSvg = await generateQRSvg(vcardConfig);
    expect(vcardSvg).toContain('<title>Contact QR Code</title>');
    expect(vcardSvg).toContain('<desc>Engineer A11y</desc>');
  });

  // Requirement 5 / AC 5: Programmatic Style Sections Expansion Helper
  it('utilizes custom helper to programmatically expand all style sections and checks interactive sequence compliance', () => {
    const mockOnChange = vi.fn();
    
    // Initial configuration with Border disabled and Template Style as NONE
    const collapsedConfig: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: false,
      templateStyle: TemplateStyle.NONE,
    };

    const { container, rerender } = render(
      <StyleControls config={collapsedConfig} onChange={mockOnChange} />
    );

    // Call custom helper to expand style panels
    expandAllStyleSections(container, mockOnChange);

    // Simulate standard parent react state update after calling onChange by re-rendering with expanded attributes
    const expandedConfig: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      templateStyle: TemplateStyle.SOLID_FRAME,
    };
    rerender(<StyleControls config={expandedConfig} onChange={mockOnChange} />);

    // Validate Advanced Mode has expanded
    const advancedToggle = screen.getByRole('button', { name: /Advanced Mode/i });
    expect(advancedToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Error Correction Level')).toBeInTheDocument();

    // Validate Border section has expanded
    expect(screen.getByLabelText('Style')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Text on border...')).toBeInTheDocument();

    // Validate Layout/Template details has expanded
    expect(screen.getByPlaceholderText('Headline (e.g. Scan Me!)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Subtext (e.g. @yourhandle)')).toBeInTheDocument();

    // Query all interactive/focusable elements
    const interactiveSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const interactiveElements = Array.from(container.querySelectorAll(interactiveSelector));

    // Confirm that every interactive element is visible, has valid dimensions, and is included in keyboard focus order
    expect(interactiveElements.length).toBeGreaterThan(0);
    interactiveElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      expect(htmlElement).toBeVisible();
      expect(htmlElement.tabIndex).toBeGreaterThanOrEqual(0);
    });
  });
});
