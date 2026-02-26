from playwright.sync_api import sync_playwright

def verify_tooltips():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Go to the application
        page.goto("http://localhost:3000")

        # Wait for the pattern controls to be visible
        # The pattern controls have aria-label="Pattern Style"
        pattern_group = page.get_by_role("group", name="Pattern Style")
        pattern_group.wait_for()

        # Get all pattern buttons
        buttons = pattern_group.get_by_role("button").all()

        print(f"Found {len(buttons)} pattern buttons")

        # Verify each button has a title attribute
        for i, button in enumerate(buttons):
            label = button.get_attribute("aria-label")
            title = button.get_attribute("title")
            print(f"Button {i+1}: Label='{label}', Title='{title}'")

            if not title:
                print(f"ERROR: Button {i+1} ({label}) is missing a title attribute!")
            else:
                print(f"SUCCESS: Button {i+1} has title: {title}")

        # Hover over the first button to trigger potential visual tooltip (browser native)
        # and take a screenshot.
        # Note: Native browser tooltips (title attribute) are not captured in screenshots by Playwright/Puppeteer usually.
        # But we can verify the attribute exists in the DOM as we did above.
        # We'll still take a screenshot of the area to ensure it looks correct layout-wise.
        buttons[0].hover()

        # Take a screenshot of the pattern controls area
        pattern_group.screenshot(path="pattern_controls.png")
        print("Screenshot saved to pattern_controls.png")

        browser.close()

if __name__ == "__main__":
    verify_tooltips()
