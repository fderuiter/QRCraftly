import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductShell } from './ProductShell';

describe('ProductShell', () => {
  it('renders page content within the main landmark', () => {
    render(
      <ProductShell>
        <section>Page content</section>
      </ProductShell>,
    );

    expect(screen.getByRole('main')).toHaveTextContent('Page content');
  });
});
