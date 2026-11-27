"""Makes plain workout clothes from the MakeHuman CC0 textures: no logos or
watermarks, charcoal track pants for the man, quiet sneakers for both.
Usage: python3 prep_textures.py <mpfb user data dir>
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter

D = sys.argv[1]
src = lambda *p: os.path.join(D, 'clothes', *p)

def save(arr, path):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(path)

# Man: plain tee (team colour) on top, charcoal track pants below. No logo.
p = src('male_casualsuit06', 'male_casualsuit06_diffuse.png')
orig = p + '.orig.png'
if not os.path.exists(orig):
    os.rename(p, orig)
im = Image.open(orig).convert('RGB')
a = np.asarray(im).astype(np.float32)
H = a.shape[0]
lum = a.mean(axis=2)
cut = int(H * 0.43)
# Top: shirt. Blur the brightness to wipe the logo, keep soft fold shading.
top_l = np.asarray(Image.fromarray(lum[:cut].astype(np.uint8)).filter(ImageFilter.GaussianBlur(28))).astype(np.float32)
shirt = np.array([38, 52, 74], np.float32)  # deep navy
a[:cut] = shirt[None, None, :] * (0.55 + 0.45 * top_l[..., None] / 255.0) * 1.15
# Bottom: jeans to charcoal, keep the fabric texture.
jl = lum[cut:]
a[cut:] = (jl[..., None] * 0.32 + 14) * np.array([1.0, 1.0, 1.08], np.float32)[None, None, :]
# Wipe the corner watermark.
a[int(H * 0.94):, int(H * 0.8):] = a[int(H * 0.94) - 60:int(H * 0.94) - 59, int(H * 0.8):].mean(axis=(0, 1))
save(a, p)

# Woman: same suit, wipe the corner watermark only.
p = src('female_sportsuit01', 'female_sportsuit01_diffuse.png')
orig = p + '.orig.png'
if not os.path.exists(orig):
    os.rename(p, orig)
a = np.asarray(Image.open(orig).convert('RGB')).astype(np.float32)
H = a.shape[0]
a[int(H * 0.95):, int(H * 0.8):] = a[int(H * 0.95) - 40, int(H * 0.8) - 40]
save(a, p)

# Sneakers: soften the side stripes and drop the green accents.
p = src('shoes05', 'shoes05_diffuse.png')
orig = p + '.orig.png'
if not os.path.exists(orig):
    os.rename(p, orig)
a = np.asarray(Image.open(orig).convert('RGB')).astype(np.float32)
l = a.mean(axis=2)
blur = np.asarray(Image.fromarray(l.astype(np.uint8)).filter(ImageFilter.GaussianBlur(18))).astype(np.float32)
l2 = 0.75 * blur + 0.25 * l
a = np.stack([l2 * 0.97, l2 * 0.98, l2 * 1.0], axis=2)
save(a, p)
print('textures ready')
