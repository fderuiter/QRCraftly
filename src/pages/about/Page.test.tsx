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
import { describe, it, expect } from "vitest";
import Page from "./+Page";

describe("About Page", () => {
  it("renders the About page content", () => {
    render(<Page />);

    // Check main heading
    expect(
      screen.getByRole("heading", { level: 1, name: /About QRCraftly/i }),
    ).toBeInTheDocument();

    // Check existing content
    expect(
      screen.getByText(/Privacy-focused QR code generator/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Free & No Login/i }),
    ).toBeInTheDocument();
  });

  it("contains a link to the WiFi QR Code generator for better SEO discovery", () => {
    render(<Page />);

    // Check for the new section heading
    expect(
      screen.getByRole("heading", { name: /Specialized Generators/i }),
    ).toBeInTheDocument();

    // Check for the descriptive text
    expect(
      screen.getByText(/Looking for a specific use case/i),
    ).toBeInTheDocument();

    // Check for the internal link
    const wifiLink = screen.getByRole("link", { name: /Create WiFi QR Code/i });
    expect(wifiLink).toBeInTheDocument();
    expect(wifiLink).toHaveAttribute("href", "/wifi-qr-code");
  });
});
