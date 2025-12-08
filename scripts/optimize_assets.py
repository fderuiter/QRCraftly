import os
from PIL import Image

def optimize_image(filepath, size=(192, 192)):
    """
    Resizes an image to the specified size and saves it.

    This function opens an image from the given filepath, resizes it using
    LANCZOS resampling for high quality, and saves it back to the same path
    as a PNG file with optimization enabled.

    Args:
        filepath (str): The path to the image file to be optimized.
        size (tuple): A tuple (width, height) representing the target size.
                      Defaults to (192, 192).

    Returns:
        None: This function prints the result to stdout but does not return a value.
    """
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    try:
        with Image.open(filepath) as img:
            print(f"Original size of {filepath}: {os.path.getsize(filepath) / 1024:.2f} KB")
            print(f"Original dimensions: {img.size}")

            # Resize using LANCZOS for high quality downsampling
            img_resized = img.resize(size, Image.Resampling.LANCZOS)

            # Save properly
            img_resized.save(filepath, "PNG", optimize=True)

            print(f"New size of {filepath}: {os.path.getsize(filepath) / 1024:.2f} KB")
            print(f"New dimensions: {img_resized.size}")

    except Exception as e:
        print(f"Error processing {filepath}: {e}")

if __name__ == "__main__":
    # Optimize favicon.png
    optimize_image("public/favicon.png", size=(192, 192))

    # Check star_style.png (just logging, not resizing unless we decide to)
    if os.path.exists("star_style.png"):
         with Image.open("star_style.png") as img:
            print(f"star_style.png dimensions: {img.size}")
            print(f"star_style.png size: {os.path.getsize('star_style.png') / 1024:.2f} KB")
