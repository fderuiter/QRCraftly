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

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StyleControls from "./StyleControls";
import { DEFAULT_CONFIG } from "../constants";
import { QRConfig } from "../types";

describe("StyleControls Contrast Check", () => {
  const mockOnChange = vi.fn();

  it("shows contrast warning for border text", async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderText: "Low Contrast",
      borderTextColor: "#333333", // Dark Grey
      borderColor: "#303030", // Dark Grey (Low contrast)
    };

    render(<StyleControls config={config} onChange={mockOnChange} />);

    expect(screen.getByText(/Low Contrast \(/)).toBeInTheDocument();
  });

  it("does not show warning for good contrast", async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderText: "High Contrast",
      borderTextColor: "#ffffff", // White
      borderColor: "#000000", // Black
    };

    render(<StyleControls config={config} onChange={mockOnChange} />);

    expect(screen.queryByText(/Low Contrast \(/)).not.toBeInTheDocument();
  });

  it("does not show warning if no text", async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderText: "", // No text
      borderTextColor: "#333333",
      borderColor: "#303030",
    };

    render(<StyleControls config={config} onChange={mockOnChange} />);

    // Might match the other warning (main QR contrast), so we need to be specific or assume standard config has good contrast
    // DEFAULT_CONFIG has good contrast for main QR.
    expect(screen.queryByText(/Low Contrast \(/)).not.toBeInTheDocument();
  });
});
