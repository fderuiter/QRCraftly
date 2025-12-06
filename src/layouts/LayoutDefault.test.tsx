import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LayoutDefault from './LayoutDefault';

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
});
