import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, it, expect } from 'vitest';
import { Accordion, AccordionItem } from './Accordion';

describe('Accordion Component Accessibility', () => {
  it('should have zero accessibility violations when collapsed', async () => {
    const { container } = render(
      <Accordion>
        <AccordionItem title="Item 1">
          Content 1
        </AccordionItem>
      </Accordion>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have zero accessibility violations when expanded', async () => {
    const { container } = render(
      <Accordion>
        <AccordionItem title="Item 1" defaultOpen={true}>
          Content 1
        </AccordionItem>
      </Accordion>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    const button = screen.getByRole('button', { name: 'Item 1' });
    const panel = screen.getByRole('region', { name: 'Item 1' });
    expect(button).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', button.id);
  });

  it('should have zero accessibility violations after toggling state', async () => {
    const { container } = render(
      <Accordion>
        <AccordionItem title="Item 1">
          Content 1
        </AccordionItem>
      </Accordion>
    );
    
    // Initially collapsed
    let results = await axe(container);
    expect(results).toHaveNoViolations();
    
    // Expand
    const button = screen.getByRole('button', { name: 'Item 1' });
    await userEvent.click(button);
    
    // Check expanded state
    results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
