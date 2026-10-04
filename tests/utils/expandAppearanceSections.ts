import { fireEvent } from '@testing-library/react';

/**
 * Expands every collapsed appearance accordion section (Pattern & Colors, Layout & Border, Logo)
 * so tests can reach controls by role. The separate "Advanced Mode" and "Style Gallery" disclosures
 * are left alone (the gallery repeats the pattern and colour names).
 * @param root - Element to search within (defaults to the document body).
 */
export function expandAppearanceSections(root: ParentNode = document.body): void {
  const collapsed = root.querySelectorAll<HTMLButtonElement>('button[id^="accordion-button-"][aria-expanded="false"]');
  collapsed.forEach((button) => {
    if (button.textContent?.includes('Style Gallery')) return;
    fireEvent.click(button);
  });
}
