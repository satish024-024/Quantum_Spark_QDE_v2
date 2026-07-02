"""Generate all favicon resolutions from icon.png for Quantum Jobs Tracker"""
import os
import sys

# Install Pillow if missing
try:
    from PIL import Image
except ImportError:
    os.system(f"{sys.executable} -m pip install Pillow")
    from PIL import Image

def generate_favicons():
    img_path = os.path.join('static', 'icon.png')
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found")
        return

    img = Image.open(img_path).convert('RGBA')

    try:
        resample_mode = Image.Resampling.LANCZOS
    except AttributeError:
        resample_mode = Image.ANTIALIAS

    sizes = {
        'favicon-16x16.png': (16, 16),
        'favicon-32x32.png': (32, 32),
        'favicon-48x48.png': (48, 48),
        'favicon-96x96.png': (96, 96),
        'favicon-144x144.png': (144, 144),
        'favicon-192x192.png': (192, 192),
        'favicon-512x512.png': (512, 512),
        'apple-touch-icon.png': (180, 180),
    }

    for name, size in sizes.items():
        resized = img.resize(size, resample=resample_mode)
        out_path = os.path.join('static', name)
        resized.save(out_path, 'PNG')
        print(f"Generated {out_path} ({size[0]}x{size[1]})")

    # Generate favicon.ico
    ico_img = img.resize((48, 48), resample=resample_mode)
    ico_path = os.path.join('static', 'favicon.ico')
    ico_img.save(ico_path, format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"Generated {ico_path} (16, 32, 48)")

    print("\nAll favicons generated successfully!")

if __name__ == '__main__':
    generate_favicons()
