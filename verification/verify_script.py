
from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Verify Home Page with new styles in controls
        page.goto("http://localhost:3000")
        page.wait_for_selector("text=Star Dust")
        page.wait_for_selector("text=Love Heart")

        # Click on Star style
        page.click("text=Star Dust")
        # Wait a bit for canvas to update (though it's react state, so pretty fast)
        page.wait_for_timeout(500)
        page.screenshot(path="verification/star_style.png")

        # Click on Heart style
        page.click("text=Love Heart")
        page.wait_for_timeout(500)
        page.screenshot(path="verification/heart_style.png")

        # Verify About Page
        page.click("a[title='About Us']")
        page.wait_for_url("**/about")
        page.wait_for_selector("h1:has-text('About QRCraftly')")
        page.screenshot(path="verification/about_page.png")

        browser.close()

if __name__ == "__main__":
    verify_changes()
