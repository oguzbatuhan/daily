"""Generates the PWA icons into public/. Run: python3 scripts/make-icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public"
BG = (20, 20, 20, 255)  # #141414 dark surface
FG = (230, 230, 230, 255)  # #e6e6e6
SS = 4  # draw large and downscale for anti-aliasing


def draw_icon(size, rounded, glyph_scale):
    n = size * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * 0.22), fill=BG)
    else:
        d.rectangle([0, 0, n, n], fill=BG)

    # Notebook glyph: drawn in 100x100 unit coordinates
    k = n * glyph_scale / 100
    ox = oy = n * (1 - glyph_scale) / 2

    def p(x, y):
        return ox + x * k, oy + y * k

    # page
    d.rounded_rectangle([*p(22, 12), *p(78, 88)], radius=int(8 * k), outline=FG, width=int(7 * k))
    # spine tabs
    for y in (30, 50, 70):
        d.rounded_rectangle([*p(14, y - 3), *p(30, y + 3)], radius=int(3 * k), fill=FG)
    # written lines
    d.line([p(44, 38), p(66, 38)], fill=FG, width=int(6 * k))
    d.line([p(44, 54), p(66, 54)], fill=FG, width=int(6 * k))
    d.line([p(44, 70), p(58, 70)], fill=FG, width=int(6 * k))
    for x, y in ((44, 38), (66, 38), (44, 54), (66, 54), (44, 70), (58, 70)):
        r = 3 * k
        cx, cy = p(x, y)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=FG)

    return img.resize((size, size), Image.LANCZOS)


draw_icon(192, True, 0.72).save(OUT / "icon-192.png")
draw_icon(512, True, 0.72).save(OUT / "icon-512.png")
# Maskable: edges may be cropped, so full bleed and a smaller glyph
draw_icon(512, False, 0.56).save(OUT / "icon-maskable-512.png")
# iOS rounds the corners itself
draw_icon(180, False, 0.66).save(OUT / "apple-touch-icon.png")
print("done")
