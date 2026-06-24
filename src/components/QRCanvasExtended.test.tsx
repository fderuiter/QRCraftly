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

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import QRCanvas from "./QRCanvas";
import { DEFAULT_CONFIG } from "../constants";
import { QRConfig } from "../types";

// Save original Image constructor
const originalImage = window.Image;

describe("QRCanvas Border Extended Features", () => {
  let mockContext: any;
  let createdImages: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    createdImages = [];

    mockContext = {
      canvas: { width: 0, height: 0 },
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      roundRect: vi.fn(),
      rect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      bezierCurveTo: vi.fn(),
      strokeRect: vi.fn(),
      setLineDash: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 10 }),
      font: "",
      textAlign: "",
      textBaseline: "",
    };

    // Spy on getContext to return our mock context
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      (contextId) => {
        if (contextId === "2d") {
          return mockContext;
        }
        return null;
      },
    );

    // Mock Image to simulate loading
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = "";
      complete = false;
      crossOrigin = "";
      constructor() {
        // Simulate async loading with a small delay
        createdImages.push(this);
      }
    }
    window.Image = MockImage as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.Image = originalImage;
  });

  it("renders dashed border style", async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderSize: 0.1,
      borderColor: "#000000",
      borderStyle: "dashed",
    };

    render(<QRCanvas config={config} size={100} />);

    await waitFor(() => {
      expect(mockContext.setLineDash).toHaveBeenCalled();
      expect(mockContext.strokeRect).toHaveBeenCalled();
    });
  });

  it("renders border text", async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderSize: 0.1,
      borderText: "Scan Me",
      borderTextPosition: "bottom-center",
    };

    render(<QRCanvas config={config} size={100} />);

    await waitFor(() => {
      expect(mockContext.fillText).toHaveBeenCalledWith(
        "Scan Me",
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  it("renders border logo", async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderSize: 0.1,
      borderLogoUrl: "data:image/png;base64,fake",
    };

    render(<QRCanvas config={config} size={100} />);

    // Wait for image to load and draw
    await waitFor(() => {
      expect(createdImages.length).toBeGreaterThan(0);
    });

    act(() => {
      const img = createdImages[0];
      if (img && img.onload) {
        img.complete = true;
        img.onload();
      }
    });

    await waitFor(() => {
      expect(mockContext.drawImage).toHaveBeenCalled();
    });
  });
});
