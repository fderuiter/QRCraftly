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
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StyleControls from "./StyleControls";
import { DEFAULT_CONFIG } from "../constants";
import { QRConfig, SocialFormat, TemplateStyle } from "../types";

describe("LayoutControls (via StyleControls)", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("renders the Export Layout section heading", () => {
    render(
      <StyleControls
        config={DEFAULT_CONFIG as QRConfig}
        onChange={mockOnChange}
      />,
    );
    expect(screen.getByText("Export Layout")).toBeInTheDocument();
  });

  it("renders aspect-ratio format buttons", () => {
    render(
      <StyleControls
        config={DEFAULT_CONFIG as QRConfig}
        onChange={mockOnChange}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Square format/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Portrait format/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Story format/i }),
    ).toBeInTheDocument();
  });

  it("renders template style buttons", () => {
    render(
      <StyleControls
        config={DEFAULT_CONFIG as QRConfig}
        onChange={mockOnChange}
      />,
    );
    expect(
      screen.getByRole("button", { name: /None template/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Minimalist template/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Gradient template/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Solid Frame template/i }),
    ).toBeInTheDocument();
  });

  it("calls onChange with STORY_9_16 when Story button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <StyleControls
        config={DEFAULT_CONFIG as QRConfig}
        onChange={mockOnChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Story format/i }));
    expect(mockOnChange).toHaveBeenCalledWith({
      socialFormat: SocialFormat.STORY_9_16,
    });
  });

  it("calls onChange with PORTRAIT_4_5 when Portrait button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <StyleControls
        config={DEFAULT_CONFIG as QRConfig}
        onChange={mockOnChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Portrait format/i }));
    expect(mockOnChange).toHaveBeenCalledWith({
      socialFormat: SocialFormat.PORTRAIT_4_5,
    });
  });

  it("calls onChange with MINIMALIST when Minimalist button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <StyleControls
        config={DEFAULT_CONFIG as QRConfig}
        onChange={mockOnChange}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /Minimalist template/i }),
    );
    expect(mockOnChange).toHaveBeenCalledWith({
      templateStyle: TemplateStyle.MINIMALIST,
    });
  });

  it("does NOT show text inputs when templateStyle is NONE", () => {
    render(
      <StyleControls
        config={DEFAULT_CONFIG as QRConfig}
        onChange={mockOnChange}
      />,
    );
    expect(
      screen.queryByRole("textbox", { name: /headline/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /subtext/i }),
    ).not.toBeInTheDocument();
  });

  it("shows headline and subtext inputs when a template is active", () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    expect(
      screen.getByRole("textbox", { name: /headline/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /subtext/i }),
    ).toBeInTheDocument();
  });

  it("calls onChange with templateHeadline when headline input changes", async () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
      templateHeadline: "",
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    const input = screen.getByRole("textbox", { name: /headline/i });
    fireEvent.change(input, { target: { value: "Hello" } });
    expect(mockOnChange).toHaveBeenCalledWith({ templateHeadline: "Hello" });
  });

  it("calls onChange with templateSubtext when subtext input changes", async () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.SOLID_FRAME,
      templateSubtext: "",
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    const input = screen.getByRole("textbox", { name: /subtext/i });
    fireEvent.change(input, { target: { value: "@handle" } });
    expect(mockOnChange).toHaveBeenCalledWith({ templateSubtext: "@handle" });
  });

  it("marks the currently active format button as pressed", () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      socialFormat: SocialFormat.STORY_9_16,
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    const storyBtn = screen.getByRole("button", { name: /Story format/i });
    expect(storyBtn).toHaveAttribute("aria-pressed", "true");
  });
});

// ---------------------------------------------------------------------------
// Advanced Template Settings: RangeInput + ColorInput
// ---------------------------------------------------------------------------

describe("Advanced Template Settings (via StyleControls)", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("does NOT show Advanced Settings section when templateStyle is NONE", () => {
    render(
      <StyleControls
        config={DEFAULT_CONFIG as QRConfig}
        onChange={mockOnChange}
      />,
    );
    expect(screen.queryByText("Advanced Settings")).not.toBeInTheDocument();
  });

  it("shows Advanced Settings section when a template is selected", () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    expect(screen.getByText("Advanced Settings")).toBeInTheDocument();
  });

  it("shows the QR Scale range slider when a template is active", () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.GRADIENT_BLUR,
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    expect(screen.getByLabelText("QR Scale")).toBeInTheDocument();
    expect(screen.getByLabelText("QR Scale")).toHaveAttribute("type", "range");
  });

  it("calls onChange with templateQrScale when the scale slider changes", () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
      templateQrScale: 1.0,
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    const slider = screen.getByLabelText("QR Scale");
    fireEvent.change(slider, { target: { value: "0.75" } });
    expect(mockOnChange).toHaveBeenCalledWith({ templateQrScale: 0.75 });
  });

  it("shows the Override template background color checkbox", () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.SOLID_FRAME,
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    expect(
      screen.getByRole("checkbox", {
        name: /Override template background color/i,
      }),
    ).toBeInTheDocument();
  });

  it("shows the Override template text color checkbox", () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.SOLID_FRAME,
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    expect(
      screen.getByRole("checkbox", { name: /Override template text color/i }),
    ).toBeInTheDocument();
  });

  it("enables background override and calls onChange with bgColor as initial templateBgColor", async () => {
    const user = userEvent.setup();
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
      bgColor: "#aabbcc",
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    const checkbox = screen.getByRole("checkbox", {
      name: /Override template background color/i,
    });
    await user.click(checkbox);
    expect(mockOnChange).toHaveBeenCalledWith({ templateBgColor: "#aabbcc" });
  });

  it("disables background override and calls onChange with undefined", async () => {
    const user = userEvent.setup();
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
      templateBgColor: "#1a1a2e",
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    const checkbox = screen.getByRole("checkbox", {
      name: /Override template background color/i,
    });
    // Checkbox should be checked (override active)
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(mockOnChange).toHaveBeenCalledWith({ templateBgColor: undefined });
  });

  it("shows the custom background ColorInput only when override is active", () => {
    // Without override
    const configNoOverride: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
      templateBgColor: undefined,
    };
    const { rerender } = render(
      <StyleControls config={configNoOverride} onChange={mockOnChange} />,
    );
    // templateBgColor ColorInput is identified by id="templateBgColor"
    expect(document.getElementById("templateBgColor")).not.toBeInTheDocument();

    // With override
    const configWithOverride: QRConfig = {
      ...configNoOverride,
      templateBgColor: "#112233",
    };
    rerender(
      <StyleControls config={configWithOverride} onChange={mockOnChange} />,
    );
    expect(document.getElementById("templateBgColor")).toBeInTheDocument();
  });

  it("shows the custom text ColorInput only when override is active", () => {
    const configNoOverride: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
      templateTextColor: undefined,
    };
    const { rerender } = render(
      <StyleControls config={configNoOverride} onChange={mockOnChange} />,
    );
    expect(
      document.getElementById("templateTextColor"),
    ).not.toBeInTheDocument();

    const configWithOverride: QRConfig = {
      ...configNoOverride,
      templateTextColor: "#ff6600",
    };
    rerender(
      <StyleControls config={configWithOverride} onChange={mockOnChange} />,
    );
    expect(document.getElementById("templateTextColor")).toBeInTheDocument();
  });

  it("calls onChange with new templateBgColor when color input changes", () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
      templateBgColor: "#000000",
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    // The color input for templateBgColor (type=color)
    const colorInput = document.getElementById(
      "templateBgColor",
    ) as HTMLInputElement;
    expect(colorInput).toBeInTheDocument();
    fireEvent.change(colorInput, { target: { value: "#ff0000" } });
    expect(mockOnChange).toHaveBeenCalledWith({ templateBgColor: "#ff0000" });
  });

  it("calls onChange with new templateTextColor when text color input changes", () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
      templateTextColor: "#000000",
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    const colorInput = document.getElementById(
      "templateTextColor",
    ) as HTMLInputElement;
    expect(colorInput).toBeInTheDocument();
    fireEvent.change(colorInput, { target: { value: "#0000ff" } });
    expect(mockOnChange).toHaveBeenCalledWith({ templateTextColor: "#0000ff" });
  });

  it("Advanced Settings section is hidden again when switching back to None", () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
    };
    const { rerender } = render(
      <StyleControls config={config} onChange={mockOnChange} />,
    );
    expect(screen.getByText("Advanced Settings")).toBeInTheDocument();

    rerender(
      <StyleControls
        config={{ ...config, templateStyle: TemplateStyle.NONE }}
        onChange={mockOnChange}
      />,
    );
    expect(screen.queryByText("Advanced Settings")).not.toBeInTheDocument();
  });

  it("QR Scale slider has correct min, max, and step attributes", () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.GRADIENT_BLUR,
    };
    render(<StyleControls config={config} onChange={mockOnChange} />);
    const slider = screen.getByLabelText("QR Scale");
    expect(slider).toHaveAttribute("min", "0.5");
    expect(slider).toHaveAttribute("max", "1.5");
    expect(slider).toHaveAttribute("step", "0.05");
  });
});
