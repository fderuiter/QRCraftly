import os
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the app
        print("Navigating to app...")
        page.goto("http://localhost:3000/")
        page.wait_for_load_state("networkidle")

        # Take a screenshot of the default state
        print("Taking default screenshot...")
        os.makedirs("verification", exist_ok=True)
        page.screenshot(path="verification/qr_default.png")

        # Now try to upload a logo
        # The input for logo is in StyleControls -> Appearance section
        # We might need to click "Appearance" or scroll to it

        # In the component structure, StyleControls is rendered.
        # Let's find the logo upload input.
        # It's likely an input[type="file"].

        # Based on StyleControls.tsx (implied), there should be a file input for logo.
        # Let's upload 'public/favicon.png'

        logo_input = page.locator('input[type="file"]').first
        if logo_input.count() > 0:
            print("Found logo input, uploading...")
            logo_input.set_input_files("public/favicon.png")
            # Wait for canvas update (debounce 100ms + render time)
            page.wait_for_timeout(1000)
            page.screenshot(path="verification/qr_with_logo.png")
            print("Screenshot with logo taken.")
        else:
            print("Logo input not found.")

        # Change style to 'Modern' (uses drawRoundRect)
        # Assuming there are radio buttons or select for style.
        # I'll just check if the app is still responsive and rendering.

    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
