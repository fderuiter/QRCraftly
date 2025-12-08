
from playwright.sync_api import sync_playwright, expect

def verify_about_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:3000/about")

            # Wait for the main heading to ensure page load
            expect(page.get_by_role("heading", name="About QRCraftly", level=1)).to_be_visible()

            # Verify the title
            title = page.title()
            print(f"Page Title: {title}")
            assert title == "About QRCraftly - Privacy & Open Source"

            # Verify heading hierarchy (h2 for "No Third-Party Tracking", etc.)
            expect(page.get_by_role("heading", name="No Third-Party Tracking", level=2)).to_be_visible()
            expect(page.get_by_role("heading", name="Zero Knowledge", level=2)).to_be_visible()
            expect(page.get_by_role("heading", name="Open Source", level=2, exact=True)).to_be_visible()
            expect(page.get_by_role("heading", name="Open Source License", level=2)).to_be_visible()

            # Take a screenshot
            page.screenshot(path="verification/about_verification.png", full_page=True)
            print("Verification successful!")

        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_about_page()
