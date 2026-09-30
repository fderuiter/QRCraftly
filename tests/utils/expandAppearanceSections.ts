import { fireEvent } from '@testing-library/react';

/**
 * Expands every collapsed appearance accordion section (Pattern & Colors, Layout & Border, Logo)
 * so tests can reach controls by role. The separate "Advanced Mode" disclosure is left alone.
 * @param root - Element to search within (defaults to the document body).
 */
export function expandAppearanceSections(root: ParentNode = document.body): void {
  const collapsed = root.querySelectorAll<HTMLButtonElement>('button[id^="accordion-button-"][aria-expanded="false"]');
  collapsed.forEach((button) => fireEvent.click(button));
}
