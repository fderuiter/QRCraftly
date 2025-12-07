from playwright.sync_api import sync_playwright
import os

def verify_font_loading():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the generated HTML file directly
        cwd = os.getcwd()
        file_url = f"file://{cwd}/dist/client/index.html"
        print(f"Navigating to {file_url}")

        page.goto(file_url)

        # Wait a bit to ensure potential async operations complete
        page.wait_for_timeout(1000)

        # Check if the stylesheet link exists
        # We look for the one that has our Google Fonts URL
        # We need to escape special regex chars in selector if needed, but css selector is simple strings
        element = page.locator("link[rel='stylesheet'][href*='fonts.googleapis.com']")
        count = element.count()
        print(f"Found {count} font stylesheet links")

        if count > 0:
            # We check the first one (there should be only one main stylesheet link, plus maybe noscript one but that is hidden)
            # Actually noscript is not rendered as DOM element link usually unless scripting disabled.

            # The one we added has media="print" initially and switches to "all" on load.
            # In file:// context, the font might not load due to CORS or just file protocol restrictions on fonts sometimes.
            # So media might stay "print".
            # But the presence of the element confirms our HTML structure.

            media_value = element.first.get_attribute("media")
            print(f"Media attribute value: {media_value}")

        page.screenshot(path="verification/font_loading.png")
        browser.close()

if __name__ == "__main__":
    verify_font_loading()
