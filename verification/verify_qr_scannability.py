
import time
import cv2
import os
from playwright.sync_api import sync_playwright

STYLES_TO_TEST = ["Standard Industrial", "Modern Soft", "Swiss Dot", "Fluid Ink", "Cyber Circuit", "The Hive", "Grunge", "Starburst"]

def decode_qr(image_path):
    img = cv2.imread(image_path)
    detector = cv2.QRCodeDetector()
    data, bbox, straight_qrcode = detector.detectAndDecode(img)
    return data

def verify_scannability():
    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:3000")
            page.wait_for_selector("text=Standard Industrial")
            time.sleep(2) # Warm up

            for style in STYLES_TO_TEST:
                print(f"Testing style: {style}")

                # Select Style
                try:
                    # Scroll to ensure element is in view if needed
                    page.locator(f"text={style}").click()
                except Exception as e:
                    print(f"Failed to click {style}: {e}")
                    results[style] = False
                    continue

                time.sleep(1) # Wait for canvas render

                screenshot_path = f"verification/scan_{style.replace(' ', '_')}.png"
                page.screenshot(path=screenshot_path)

                # Decode
                decoded_data = decode_qr(screenshot_path)

                if decoded_data:
                    print(f"✅ {style}: Scanned successfully! Data: {decoded_data}")
                    results[style] = True
                else:
                    print(f"❌ {style}: Failed to scan.")
                    results[style] = False

        except Exception as e:
            print(f"Error during verification: {e}")
        finally:
            browser.close()

    print("\n--- Summary ---")
    all_passed = True
    for style, passed in results.items():
        status = "PASS" if passed else "FAIL"
        print(f"{style}: {status}")
        if not passed:
            all_passed = False

    if not all_passed:
        exit(1)

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    verify_scannability()
