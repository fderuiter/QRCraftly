from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to localhost:3000")
            page.goto("http://localhost:3000")

            # Wait for content
            page.wait_for_selector("text=Pattern Style")

            # Enable Border
            print("Enabling Border")
            # Using specific locator from memory
            border_checkbox = page.locator("label:has-text('Enable Border') input")
            # Force check because it might be covered by visual toggle
            border_checkbox.check(force=True)

            # Wait for animation
            time.sleep(1)

            # Change Border Width
            print("Changing Border Width")
            # Find the range input by ID
            border_input = page.locator("#border-size")
            # Set value to 0.1 (10%)
            border_input.fill("0.1")

            # Verify the displayed value
            # The span is sibling to label
            border_value_span = page.locator("label[for='border-size'] + span")
            # expect(border_value_span).to_have_text("10.0%")
            # Just print it for log
            print(f"Border Width displayed: {border_value_span.inner_text()}")

            # Upload Logo
            print("Uploading Logo")
            # Find the file input for logo (first one on page usually, or specific)
            # Memory: `div:has(h3:has-text('Logo')) input[type='file']`
            # Note: The structure might have changed slightly but `Logo` header is there.
            # But wait, Border logo input is also there if border enabled.
            # Border comes first in DOM.
            # So `input[type='file']` first might be border logo?
            # Let's target the main logo specifically.
            # Main logo section has "Upload Logo" text initially.
            # Or "Custom Logo" if uploaded.

            # The input ref is attached to:
            # <input ref={fileInputRef} type="file" ... onChange={handleLogoUpload} />
            # It's at the end of the Logo section.

            # I'll use `setInputFiles` on the specific input.
            # The main logo input is in the "Logo" section.
            # The "Logo" section starts with `h3:has-text('Logo')`.
            # I can scope to that section.

            # Let's try to upload to the last file input on the page, which should be the main logo input if border logo input is present (border is enabled).
            # Actually, `StyleControls` has:
            # 1. Border section (contains border logo input)
            # 2. Pattern Style
            # 3. Colors
            # 4. Logo section (contains main logo input)

            # So main logo input is the LAST file input.
            file_inputs = page.locator("input[type='file']")
            count = file_inputs.count()
            print(f"Found {count} file inputs")

            if count > 0:
                # Upload to the last one (Main Logo)
                file_inputs.last.set_input_files("public/favicon.png")

                # Wait for processing
                time.sleep(1)

                # Verify Logo Size
                print("Changing Logo Size")
                logo_size_input = page.locator("#logo-size")
                logo_size_input.fill("0.25")
                logo_size_span = page.locator("label[for='logo-size'] + span")
                print(f"Logo Size displayed: {logo_size_span.inner_text()}")

                # Verify Padding
                # Ensure 'Square' style is selected (it is default usually, but let's click it)
                # The button has title "Square"
                page.get_by_title("Square").click()

                print("Changing Logo Padding")
                logo_padding_input = page.locator("#logo-padding")
                logo_padding_input.fill("1")
                logo_padding_span = page.locator("label[for='logo-padding'] + span")
                print(f"Logo Padding displayed: {logo_padding_span.inner_text()}")

            # Scroll down to make sure controls are visible
            # page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            # Or scroll the specific container if it's scrollable.
            # The prompt memory mentions `.overflow-y-auto` container.
            # I'll just screenshot the whole page.

            time.sleep(1)

            screenshot_path = "/home/jules/verification/verification.png"
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png", full_page=True)
        finally:
            browser.close()

if __name__ == "__main__":
    run()
