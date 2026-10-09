# Regenerates every app icon from assets/images/logo-source.png.
#
#   python scripts/generate-icons.py
#
# Needs Pillow (pip install pillow). The source is the full tile artwork; the
# mark (leaves + dot) is cut out of its navy background and re-composed, so to
# change the logo, replace logo-source.png. To change how the icons look, edit
# the settings below. Then rebuild the app - launcher icons are baked into the
# APK, a JS reload won't change them.
#
# Outputs (assets/images/):
#   icon.png, adaptive-icon.png, monochrome-icon.png, splash-icon.png,
#   notification-icon.png, favicon.png     - the default icon, wired in app.json
#   app-icons/<variant>.png                - iOS tile for each variant
#   app-icons/<variant>-foreground.png     - Android adaptive foreground
# The variants are what users pick in Settings > Appearance > App icon; they
# must match ICON_VARIANTS in src/constants/appIcons.ts and the
# expo-alternate-app-icons entry in app.json.

import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
IMAGES = os.path.join(ROOT, "assets", "images")

# ---- Settings ---------------------------------------------------------------
SOURCE = os.path.join(IMAGES, "logo-source.png")
# Part of the source that holds the mark (left, top, right, bottom). Keeps the
# white rounded corners of the source tile out of the cut-out.
MARK_REGION = (190, 200, 1065, 960)
DEFAULT_BG = "#060F2B"
MARK_SCALE = 0.60  # mark size on the full tile icon, as a share of its width
ADAPTIVE_SCALE = 0.55  # Android crops to ~66%, keep the mark inside it
SPLASH_SCALE = 0.75

# Alternate icons (the default is the one above). name -> (tile colour, mark style: "color" | "white")
VARIANTS = {
	"Light": ("#F4F7FB", "color"),
	"Black": ("#000000", "color"),
	"Ocean": ("#0A84FF", "white"),
}
# -----------------------------------------------------------------------------


def hex_rgb(h):
	h = h.lstrip("#")
	return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def extract_mark(path):
	im = Image.open(path).convert("RGB")
	mark = Image.new("RGBA", im.size, (0, 0, 0, 0))
	px, mp = im.load(), mark.load()
	l, t, r, b = MARK_REGION
	for y in range(t, min(b, im.height)):
		for x in range(l, min(r, im.width)):
			cr, cg, cb = px[x, y]
			# The navy background stays under ~55 on every channel; ramp the
			# alpha over the anti-aliased edge.
			a = max(0, min(255, int((max(cr, cg, cb) - 55) * 255 / 70)))
			if a:
				mp[x, y] = (cr, cg, cb, a)
	return mark.crop(mark.getbbox())


def fit(img, box):
	s = box / max(img.size)
	return img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)


def on_canvas(img, size, bg=None):
	canvas = Image.new("RGBA", (size, size), (hex_rgb(bg) + (255,)) if bg else (0, 0, 0, 0))
	canvas.alpha_composite(img, ((size - img.width) // 2, (size - img.height) // 2))
	return canvas


def white(img):
	w = Image.new("RGBA", img.size, (255, 255, 255, 0))
	w.putalpha(img.getchannel("A"))
	return w


def save(img, *parts):
	path = os.path.join(IMAGES, *parts)
	os.makedirs(os.path.dirname(path), exist_ok=True)
	img.save(path)
	print("  ", os.path.relpath(path, ROOT))


def main():
	mark = extract_mark(SOURCE)
	print(f"mark {mark.size[0]}x{mark.size[1]}")

	save(on_canvas(fit(mark, 1024 * MARK_SCALE), 1024, DEFAULT_BG), "icon.png")
	save(on_canvas(fit(mark, 1024 * ADAPTIVE_SCALE), 1024), "adaptive-icon.png")
	save(on_canvas(fit(white(mark), 1024 * ADAPTIVE_SCALE), 1024), "monochrome-icon.png")
	save(on_canvas(fit(mark, 1024 * SPLASH_SCALE), 1024), "splash-icon.png")
	# Android draws notification icons from the alpha channel only.
	save(on_canvas(fit(white(mark), 84), 96), "notification-icon.png")
	fav = on_canvas(fit(mark, 120), 192, DEFAULT_BG)
	mask = Image.new("L", fav.size, 0)
	ImageDraw.Draw(mask).rounded_rectangle((0, 0, 191, 191), 42, fill=255)
	fav.putalpha(mask)
	save(fav.resize((48, 48), Image.LANCZOS), "favicon.png")

	for name, (bg, style) in VARIANTS.items():
		m = white(mark) if style == "white" else mark
		slug = name.lower()
		# iOS icons must not have transparency.
		save(on_canvas(fit(m, 1024 * MARK_SCALE), 1024, bg).convert("RGB"), "app-icons", f"{slug}.png")
		save(on_canvas(fit(m, 1024 * ADAPTIVE_SCALE), 1024), "app-icons", f"{slug}-foreground.png")


if __name__ == "__main__":
	main()
