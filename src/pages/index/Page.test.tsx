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

import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "./+Page";

// Mock QRTool to avoid rendering complex children
vi.mock("../../components/QRTool", () => ({
  default: () => <div data-testid="qr-tool-mock">QRTool</div>,
}));

describe("Home Page", () => {
  it("renders structured data with required SEO properties", () => {
    const { container } = render(<Page />);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeInTheDocument();

    const json = JSON.parse(script?.textContent || "{}");
    expect(json["@context"]).toBe("https://schema.org");
    expect(json["@graph"]).toBeDefined();

    const graph = json["@graph"];
    expect(Array.isArray(graph)).toBe(true);

    const webApp = graph.find(
      (item: any) => item["@type"] === "WebApplication",
    );
    expect(webApp).toBeDefined();
    expect(webApp.name).toBe("QRCraftly");
    expect(webApp.author).toEqual({
      "@id": "https://qrcraftly.com/#organization",
    });

    // Check for critical SEO properties
    expect(webApp.softwareVersion).toBe("0.1.0");
    expect(webApp.image).toBe("https://qrcraftly.com/og-image.png");
    expect(webApp.datePublished).toBe("2025-01-01");
    expect(webApp.browserRequirements).toBe(
      "Requires JavaScript. Works in all modern browsers.",
    );
  });
});
