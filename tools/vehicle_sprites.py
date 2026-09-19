# Top-down vehicle sprites for the partner app's map, nose pointing up (north at rotation 0).
# Drawn at 8x and downsampled to 3x output; shading comes from gradient masks so bodies read as
# rounded. Run: python3 tools/vehicle_sprites.py  (needs Pillow)
from PIL import Image, ImageChops, ImageDraw, ImageFilter

S = 8
import pathlib

OUT = str(pathlib.Path(__file__).resolve().parent.parent / 'ridex-partner-app/assets/vehicles') + '/'
OUTPUT_SCALE = 3  # device-pixel density the PNGs are exported for


def new(w, h):
    return Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))


def sc(box):
    # A flat box (x0, y0, x1, y1) or a list of (x, y) points, scaled to the supersampled canvas.
    if box and isinstance(box[0], tuple):
        return [(x * S, y * S) for x, y in box]
    return [v * S for v in box]


def shape(w, h, draw_fn):
    """A white-on-black mask of whatever draw_fn draws."""
    m = Image.new('L', (w * S, h * S), 0)
    draw_fn(ImageDraw.Draw(m))
    return m


def hgrad(w, h, edge, centre):
    """Horizontal gradient: dark at the sides, light in the middle - a rounded roof or bonnet."""
    g = Image.new('RGBA', (w * S, h * S))
    px = g.load()
    W = w * S
    for x in range(W):
        t = abs((x / (W - 1)) * 2 - 1) ** 1.8
        c = tuple(int(centre[i] * (1 - t) + edge[i] * t) for i in range(3)) + (255,)
        for y in range(h * S):
            px[x, y] = c
    return g


def vgrad(w, h, top, bottom):
    g = Image.new('RGBA', (w * S, h * S))
    d = ImageDraw.Draw(g)
    H = h * S
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (w * S, y)], fill=tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3)) + (255,))
    return g


def paint(img, layer, mask):
    img.alpha_composite(Image.composite(layer, Image.new('RGBA', img.size, (0, 0, 0, 0)), mask))


def fill(img, colour, mask):
    paint(img, Image.new('RGBA', img.size, colour), mask)


def glass(img, w, h, mask):
    """Tinted glass with a diagonal sky reflection."""
    paint(img, vgrad(w, h, (70, 92, 120), (22, 30, 44)), mask)
    streak = shape(w, h, lambda d: d.polygon(sc([(0, h * 0.2), (w, h * 0.05), (w, h * 0.12), (0, h * 0.3)]), fill=90))
    paint(img, Image.new('RGBA', img.size, (255, 255, 255, 255)), ImageChops.multiply(streak, mask))


def finish(img, w, h, name):
    alpha = img.split()[3]
    shadow = Image.new('RGBA', img.size, (0, 0, 0, 0))
    shadow.putalpha(alpha.point(lambda a: int(a * 0.5)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(2.5 * S))
    pad = 6 * S
    out = Image.new('RGBA', (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    out.alpha_composite(shadow, (pad + S, pad + 2 * S))
    out.alpha_composite(img, (pad, pad))
    out.resize(((w + 12) * OUTPUT_SCALE, (h + 12) * OUTPUT_SCALE), Image.LANCZOS).save(OUT + name + '.png')


def wheels(img, w, h, xs, ys, tw, th):
    m = shape(w, h, lambda d: [d.rounded_rectangle(sc((x, y, x + tw, y + th)), radius=2 * S, fill=255) for x in xs for y in ys])
    fill(img, (24, 24, 28, 255), m)


def car():
    w, h = 44, 88
    img = new(w, h)
    wheels(img, w, h, (2, 36), (14, 62), 6, 14)
    body = shape(w, h, lambda d: d.rounded_rectangle(sc((5, 2, 39, 86)), radius=12 * S, fill=255))
    paint(img, hgrad(w, h, (150, 156, 166), (252, 252, 253)), body)
    # bonnet crease lines
    crease = shape(w, h, lambda d: [d.line(sc((x, 8, x, 24)), fill=70, width=S) for x in (15, 29)])
    fill(img, (120, 126, 136, 255), crease)
    glass(img, w, h, shape(w, h, lambda d: d.polygon(sc([(9, 27), (35, 27), (32, 38), (12, 38)]), fill=255)))
    roof = shape(w, h, lambda d: d.rounded_rectangle(sc((11, 38, 33, 66)), radius=4 * S, fill=255))
    paint(img, hgrad(w, h, (176, 182, 192), (240, 242, 246)), roof)
    glass(img, w, h, shape(w, h, lambda d: d.polygon(sc([(12, 66), (32, 66), (34, 74), (10, 74)]), fill=255)))
    # side windows as thin dark strips along the cabin
    fill(img, (40, 50, 66, 255), shape(w, h, lambda d: [d.rectangle(sc(b), fill=255) for b in ((8, 40, 10, 64), (34, 40, 36, 64))]))
    fill(img, (255, 244, 200, 255), shape(w, h, lambda d: [d.ellipse(sc(b), fill=255) for b in ((8, 3, 15, 7), (29, 3, 36, 7))]))
    fill(img, (214, 40, 48, 255), shape(w, h, lambda d: [d.rounded_rectangle(sc(b), radius=S, fill=255) for b in ((8, 82, 15, 85), (29, 82, 36, 85))]))
    fill(img, (230, 232, 236, 255), shape(w, h, lambda d: [d.ellipse(sc(b), fill=255) for b in ((1, 27, 7, 32), (37, 27, 43, 32))]))
    finish(img, w, h, 'car')


def coach(name, w, h, ac_units):
    img = new(w, h)
    wheels(img, w, h, (1, w - 7), (10, h - 26), 6, 16)
    body = shape(w, h, lambda d: d.rounded_rectangle(sc((4, 2, w - 4, h - 2)), radius=7 * S, fill=255))
    paint(img, hgrad(w, h, (160, 166, 176), (250, 250, 252)), body)
    glass(img, w, h, shape(w, h, lambda d: d.rounded_rectangle(sc((7, 4, w - 7, 14)), radius=3 * S, fill=255)))
    # roof ribs
    ribs = shape(w, h, lambda d: [d.line(sc((7, y, w - 7, y)), fill=60, width=S) for y in range(22, h - 10, 8)])
    fill(img, (150, 156, 166, 255), ribs)
    # rooftop AC units and an escape hatch
    for i in range(ac_units):
        y = 24 + i * ((h - 50) // max(1, ac_units))
        unit = shape(w, h, lambda d, y=y: d.rounded_rectangle(sc((10, y, w - 10, y + 14)), radius=3 * S, fill=255))
        paint(img, vgrad(w, h, (236, 238, 242), (188, 194, 204)), unit)
        fill(img, (120, 128, 140, 255), shape(w, h, lambda d, y=y: [d.line(sc((x, y + 3, x, y + 11)), fill=255, width=S) for x in range(14, w - 12, 4)]))
    fill(img, (60, 70, 86, 255), shape(w, h, lambda d: d.rounded_rectangle(sc((w / 2 - 6, h - 20, w / 2 + 6, h - 12)), radius=2 * S, fill=255)))
    glass(img, w, h, shape(w, h, lambda d: d.rounded_rectangle(sc((8, h - 9, w - 8, h - 4)), radius=2 * S, fill=255)))
    fill(img, (255, 244, 200, 255), shape(w, h, lambda d: [d.rectangle(sc(b), fill=255) for b in ((6, 2.5, 11, 4), (w - 11, 2.5, w - 6, 4))]))
    fill(img, (230, 232, 236, 255), shape(w, h, lambda d: [d.ellipse(sc(b), fill=255) for b in ((0, 10, 5, 16), (w - 5, 10, w, 16))]))
    finish(img, w, h, name)


def auto():
    # Indian auto rickshaw: narrow nose with one front wheel, yellow canopy over a green tub.
    w, h = 40, 72
    img = new(w, h)
    wheels(img, w, h, (17,), (1,), 6, 12)          # single front wheel
    wheels(img, w, h, (1, 33), (50,), 6, 14)       # two rear wheels
    tub = shape(w, h, lambda d: d.polygon(sc([(14, 6), (26, 6), (35, 26), (36, 68), (4, 68), (5, 26)]), fill=255))
    paint(img, hgrad(w, h, (18, 96, 52), (46, 160, 90)), tub)
    glass(img, w, h, shape(w, h, lambda d: d.polygon(sc([(12, 16), (28, 16), (32, 25), (8, 25)]), fill=255)))
    canopy = shape(w, h, lambda d: d.rounded_rectangle(sc((5, 24, 35, 66)), radius=6 * S, fill=255))
    paint(img, hgrad(w, h, (196, 150, 8), (255, 214, 40)), canopy)
    seams = shape(w, h, lambda d: [d.line(sc((x, 26, x, 64)), fill=90, width=S) for x in (13, 20, 27)])
    fill(img, (170, 126, 0, 255), seams)
    fill(img, (255, 244, 200, 255), shape(w, h, lambda d: d.ellipse(sc((17, 6, 23, 10)), fill=255)))
    finish(img, w, h, 'auto')


def bike():
    # Scooter or motorcycle with a rider: tyres, handlebar, shoulders and helmet from above.
    w, h = 26, 64
    img = new(w, h)
    fill(img, (24, 24, 28, 255), shape(w, h, lambda d: [d.rounded_rectangle(sc(b), radius=2 * S, fill=255) for b in ((10, 1, 16, 15), (10, 48, 16, 63))]))
    body = shape(w, h, lambda d: d.rounded_rectangle(sc((8, 12, 18, 52)), radius=5 * S, fill=255))
    paint(img, hgrad(w, h, (120, 18, 28), (220, 44, 56)), body)
    fill(img, (60, 62, 70, 255), shape(w, h, lambda d: d.rounded_rectangle(sc((2, 15, 24, 18)), radius=S, fill=255)))
    # arms to the grips, shoulders, helmet
    fill(img, (52, 70, 110, 255), shape(w, h, lambda d: [d.line(sc(l), fill=255, width=3 * S) for l in ((6, 30, 4, 18), (20, 30, 22, 18))]))
    shoulders = shape(w, h, lambda d: d.ellipse(sc((3, 25, 23, 38)), fill=255))
    paint(img, hgrad(w, h, (36, 50, 84), (72, 96, 150)), shoulders)
    helmet = shape(w, h, lambda d: d.ellipse(sc((7, 22, 19, 34)), fill=255))
    paint(img, hgrad(w, h, (20, 20, 24), (90, 92, 100)), helmet)
    fill(img, (255, 244, 200, 255), shape(w, h, lambda d: d.ellipse(sc((11, 11, 15, 14)), fill=255)))
    finish(img, w, h, 'bike')


car()
coach('minibus', 46, 110, 2)
coach('bus', 50, 150, 3)
auto()
bike()
print('ok')
