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

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import StyleControls from "./StyleControls";
import { DEFAULT_CONFIG } from "../constants";

describe("StyleControls Accessibility", () => {
  const mockOnChange = vi.fn();

  it("Advanced Mode toggle should have correct aria attributes", () => {
    render(<StyleControls config={DEFAULT_CONFIG} onChange={mockOnChange} />);

    // Find the Advanced Mode toggle button
    const advancedToggle = screen.getByRole("button", {
      name: /Advanced Mode/i,
    });

    // Initial state: not expanded
    expect(advancedToggle).toHaveAttribute("aria-expanded", "false");
    expect(advancedToggle).toHaveAttribute(
      "aria-controls",
      "advanced-settings-panel",
    );

    // Click to expand
    fireEvent.click(advancedToggle);

    // Expect aria-expanded to be true
    expect(advancedToggle).toHaveAttribute("aria-expanded", "true");

    // Verify the panel exists and has the correct ID
    const panel = document.getElementById("advanced-settings-panel");
    expect(panel).toBeInTheDocument();

    // Verify content is inside the panel (e.g. Error Correction Level)
    expect(screen.getByText("Error Correction Level")).toBeInTheDocument();
    expect(panel).toContainElement(
      screen.getByText("Error Correction Level").closest("div")
        ?.parentElement || null,
    );
  });
});
