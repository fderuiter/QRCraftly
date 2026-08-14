import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScannabilityIndicator } from '../src/components/ScannabilityIndicator';
import { PatternControls } from '../src/components/style-controls/PatternControls';
import QRCanvas from '../src/components/QRCanvas';
import QRTool from '../src/components/QRTool';
import { ToastProvider } from '../src/components/ui/Toast';
import { DEFAULT_CONFIG } from '../src/constants';
import { QRStyle, QRConfig } from '../src/types';

describe('Structural Isolation and Reserved Space for QR Preview', () => {
  
  describe('Requirement 1: Scannability Feedback Wrapper Height', () => {
    it('renders with a fixed-height wrapper of 52px when idle to prevent layout shift', () => {
      render(<ScannabilityIndicator status="idle" />);
      const placeholder = screen.getByTestId('scannability-indicator-placeholder');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveClass('h-13');
    });

    it('renders with a fixed-height wrapper of 52px when checking/active to prevent layout shift', () => {
      render(<ScannabilityIndicator status="checking" />);
      const wrapper = screen.getByTestId('scannability-feedback-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('h-13');
    });

    it('retains the same 52px height wrapper when transitioning to scannability warning text (score < 100)', () => {
      const lowScannabilityHealth = {
        score: 40,
        warnings: ['Low contrast between modules and background'],
      };
      
      render(<ScannabilityIndicator status="fail" health={lowScannabilityHealth} />);
      const wrapper = screen.getByTestId('scannability-feedback-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('h-13');
      
      const alertMessage = screen.getByRole('alert');
      expect(alertMessage).toBeInTheDocument();
      expect(alertMessage).toHaveTextContent('Low contrast between modules and background');
    });
  });

  describe('Requirement 2: Conditional Style Configuration Warning', () => {
    it('does not reserve warning space when using high-reliability patterns', () => {
      const config: QRConfig = {
        ...DEFAULT_CONFIG,
        style: QRStyle.STANDARD,
      };
      const handleChange = vi.fn();
      
      render(<PatternControls config={config} onChange={handleChange} />);
      
      expect(screen.queryByTestId('pattern-warning-slot')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('renders a warning when selecting a low-reliability pattern', () => {
      const config: QRConfig = {
        ...DEFAULT_CONFIG,
        style: QRStyle.CIRCUIT, // LOW_RELIABILITY_PATTERN
      };
      const handleChange = vi.fn();
      
      render(<PatternControls config={config} onChange={handleChange} />);
      
      const slot = screen.getByTestId('pattern-warning-slot');
      expect(slot).toBeInTheDocument();
      
      const warningText = screen.getByRole('alert');
      expect(warningText).toBeInTheDocument();
      expect(warningText).toHaveTextContent(/complex and may reduce scannability/);
    });
  });

  describe('Requirement 3: Aspect-Ratio-Locked Container for Validation Alerts', () => {
    it('uses relative container and absolute positioning for validation alerts to prevent layout jumps', () => {
      const config: QRConfig = {
        ...DEFAULT_CONFIG,
        type: 'LOCATION' as any,
        value: 'geo:invalid_lat,invalid_lon', // Trigger latitude validation error
      };
      
      // Force latitude out of bounds or longitude out of bounds via latitude/longitude config
      const invalidConfig: QRConfig = {
        ...DEFAULT_CONFIG,
        type: 'LOCATION' as any,
        latitude: 150, // Latitude must be between -90 and 90
        longitude: 0,
        value: 'geo:150,0',
      };

      const { container } = render(<QRCanvas config={invalidConfig} />);
      
      // The canvas container should have relative, aspect-ratio and w-full classes
      const containerDiv = container.firstChild as HTMLElement;
      expect(containerDiv).toHaveClass('relative');
      expect(containerDiv).toHaveClass('aspect-square');
      expect(containerDiv).toHaveClass('w-full');
      
      // The Alert component should be nested in an absolutely-positioned wrapper
      const absoluteWrapper = containerDiv.querySelector('.absolute.inset-0');
      expect(absoluteWrapper).toBeInTheDocument();
      
      const alertElement = screen.getByRole('status');
      expect(alertElement).toBeInTheDocument();
      expect(alertElement).toHaveTextContent(/Generation Blocked/i);
    });
  });

  describe('Requirement 4: Mobile Workspace Uses Document Scrolling', () => {
    it('does not constrain the workspace or its panels to separate mobile scroll areas', () => {
      const { container } = render(
        <ToastProvider>
          <QRTool />
        </ToastProvider>
      );
      
      // The mobile workspace retains its preview-first layout without locking the document viewport.
      const parentContainer = container.querySelector('.bg-slate-50.dark\\:bg-slate-950');
      expect(parentContainer).toHaveClass('min-h-screen');
      expect(parentContainer).toHaveClass('flex-col-reverse');
      expect(parentContainer).not.toHaveClass('h-screen');
      expect(parentContainer).not.toHaveClass('overflow-hidden');
      
      // Both panels participate in normal document flow on mobile and at high zoom.
      const settingsPanel = screen.getByLabelText(/QR Code Settings/i);
      expect(settingsPanel).not.toHaveClass('max-h-[50vh]');
      expect(settingsPanel).not.toHaveClass('overflow-y-auto');
      
      const previewPanel = screen.getByLabelText(/QR Code Preview/i);
      expect(previewPanel).not.toHaveClass('max-h-[50vh]');
      expect(previewPanel).not.toHaveClass('overflow-y-auto');
    });
  });
});
