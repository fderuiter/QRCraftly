
import time
from playwright.sync_api import sync_playwright

def verify_qr_styles():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Wait for dev server to start
            time.sleep(5)

            page.goto("http://localhost:3000")

            # Wait for content to load
            page.wait_for_selector("text=Standard Industrial")

            # Take a screenshot of the initial state (Standard Industrial)
            page.screenshot(path="verification/style_standard.png")
            print("Captured Standard style")

            # Click on "Modern Soft" style
            page.click("text=Modern Soft")
            time.sleep(1) # Wait for canvas update
            page.screenshot(path="verification/style_modern.png")
            print("Captured Modern style")

            # Click on "Swiss Dot" style
            page.click("text=Swiss Dot")
            time.sleep(1)
            page.screenshot(path="verification/style_swiss.png")
            print("Captured Swiss style")

            # Click on "Fluid Ink" style
            page.click("text=Fluid Ink")
            time.sleep(1)
            page.screenshot(path="verification/style_fluid.png")
            print("Captured Fluid style")

            # Click on "Cyber Circuit" style
            page.click("text=Cyber Circuit")
            time.sleep(1)
            page.screenshot(path="verification/style_circuit.png")
            print("Captured Circuit style")

            # Click on "The Hive" style
            page.click("text=The Hive")
            time.sleep(1)
            page.screenshot(path="verification/style_hive.png")
            print("Captured Hive style")

            # Click on "Kinetic" style
            page.click("text=Kinetic")
            time.sleep(1)
            page.screenshot(path="verification/style_kinetic.png")
            print("Captured Kinetic style")

             # Click on "Grunge" style
            page.click("text=Grunge")
            time.sleep(1)
            page.screenshot(path="verification/style_grunge.png")
            print("Captured Grunge style")

            # Click on "Starburst" style
            page.click("text=Starburst")
            time.sleep(1)
            page.screenshot(path="verification/style_starburst.png")
            print("Captured Starburst style")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_qr_styles()
