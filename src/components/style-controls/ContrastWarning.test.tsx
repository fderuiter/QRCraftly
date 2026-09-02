/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software:Framework AGPL
*/

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe } from 'vitest-axe';
import { ContrastBadge, ContrastBanner } from './ContrastWarning';

describe('ContrastWarning Subcomponents', () => {
  describe('ContrastBadge', () => {
    it('renders aria-live polite container and displays badge when isVisible is true', () => {
      render(<ContrastBadge isVisible={true} contrastRatio={3.1415} data-testid="badge-test" />);

      const badge = screen.getByTestId('badge-test');
      expect(badge).toBeInTheDocument();
      expect(screen.getByText('Low Contrast (3.1)')).toBeInTheDocument();

      const liveRegion = badge.closest('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('formats decimal precision correctly based on prop', () => {
      render(<ContrastBadge isVisible={true} contrastRatio={3.1415} decimalPrecision={2} />);

      expect(screen.getByText('Low Contrast (3.14)')).toBeInTheDocument();
    });

    it('renders zero content inside polite live region when isVisible is false', () => {
      const { container } = render(<ContrastBadge isVisible={false} contrastRatio={3.1415} data-testid="badge-test" />);

      expect(screen.queryByTestId('badge-test')).not.toBeInTheDocument();
      expect(screen.queryByText(/Low Contrast/i)).not.toBeInTheDocument();

      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toBeEmptyDOMElement();
    });

    it('has zero accessibility violations when active or inactive', async () => {
      const { container, rerender } = render(<ContrastBadge isVisible={true} contrastRatio={2.8} />);
      let results = await axe(container);
      expect(results).toHaveNoViolations();

      rerender(<ContrastBadge isVisible={false} contrastRatio={2.8} />);
      results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ContrastBanner', () => {
    it('renders polite live region and color message when isVisible is true and messageType="color"', () => {
      render(<ContrastBanner isVisible={true} contrastRatio={2.456} messageType="color" />);

      const alert = screen.getByRole('status');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText(/Warning: The contrast ratio is low \(2.46\)/i)).toBeInTheDocument();

      const liveRegion = alert.closest('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('renders layout message when messageType="layout"', () => {
      render(<ContrastBanner isVisible={true} contrastRatio={2.456} messageType="layout" />);

      expect(screen.getByText(/The contrast ratio between the layout's text and background is low \(2.46\)/i)).toBeInTheDocument();
    });

    it('respects decimalPrecision, role, and custom className props', () => {
      render(
        <ContrastBanner
          isVisible={true}
          contrastRatio={3.8912}
          messageType="color"
          decimalPrecision={1}
          role="alert"
          className="custom-banner-class"
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass('custom-banner-class');
      expect(screen.getByText(/Warning: The contrast ratio is low \(3.9\)/i)).toBeInTheDocument();
    });

    it('renders zero content inside polite live region when isVisible is false', () => {
      const { container } = render(<ContrastBanner isVisible={false} contrastRatio={2.5} messageType="color" />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toBeEmptyDOMElement();
    });

    it('has zero accessibility violations when active or inactive', async () => {
      const { container, rerender } = render(<ContrastBanner isVisible={true} contrastRatio={2.8} messageType="color" />);
      let results = await axe(container);
      expect(results).toHaveNoViolations();

      rerender(<ContrastBanner isVisible={false} contrastRatio={2.8} messageType="color" />);
      results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
