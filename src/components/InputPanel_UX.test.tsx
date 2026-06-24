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

import { render, screen } from "@testing-library/react";
import InputPanel from "./InputPanel";
import { DEFAULT_CONFIG } from "../constants";
import { QRType } from "../types";
import { describe, it, expect, vi } from "vitest";

describe("InputPanel UX", () => {
  const mockOnChange = vi.fn();

  it("renders visible labels for vCard address fields", () => {
    render(
      <InputPanel
        config={{ ...DEFAULT_CONFIG, type: QRType.VCARD }}
        onChange={mockOnChange}
      />,
    );

    // These should exist as visible <label> elements
    // Currently they do not (they are aria-labels on inputs)
    expect(
      screen.getByText("Street", { selector: "label" }),
    ).toBeInTheDocument();
    expect(screen.getByText("City", { selector: "label" })).toBeInTheDocument();
    expect(
      screen.getByText("Country", { selector: "label" }),
    ).toBeInTheDocument();

    // Also verify they are associated with inputs
    const streetLabel = screen.getByText("Street", { selector: "label" });
    const streetInput = screen.getByLabelText("Street");
    expect(streetLabel.getAttribute("for")).toBe(streetInput.id);
  });
});
