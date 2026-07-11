#!/usr/bin/env python3
"""Render the abstract prediction-market artwork used by the public UI.

The images are deliberately generated at 2x and reduced with Lanczos so that
the thin, low-opacity details remain smooth at their final display sizes.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "art"
SCALE = 2
PALETTE = {
    "green": np.array((12, 59, 46), dtype=np.float32),
    "teal": np.array((23, 89, 74), dtype=np.float32),
    "black": np.array((8, 31, 24), dtype=np.float32),
    "ivory": (246, 245, 240),
    "gold": (168, 124, 31),
}


def smoothstep(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def mesh(size: tuple[int, int], seed: int, variant: int) -> Image.Image:
    """Create a soft, dark finance-grade gradient mesh with fine grain."""
    width, height = size
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    x /= width
    y /= height

    # Base diagonal blend, then three oversized gaussian color pools.
    diagonal = smoothstep(0.22 + 0.55 * (0.75 * x + 0.25 * (1 - y)))
    pixels = PALETTE["black"] * (1 - diagonal[..., None]) + PALETTE["green"] * diagonal[..., None]
    centers = [(0.72, 0.20), (0.20 + 0.08 * variant, 0.78), (0.80, 0.83)]
    strengths = (0.88, 0.52, 0.34)
    for (cx, cy), strength in zip(centers, strengths):
        radius_x = 0.30 + rng.uniform(-0.05, 0.08)
        radius_y = 0.28 + rng.uniform(-0.04, 0.09)
        pool = np.exp(-(((x - cx) / radius_x) ** 2 + ((y - cy) / radius_y) ** 2) * 2.2)
        target = PALETTE["teal"] if strength > 0.6 else PALETTE["green"]
        alpha = np.clip(pool * strength, 0, 0.80)[..., None]
        pixels = pixels * (1 - alpha) + target * alpha

    # Restrained micro-grain protects the gradients from looking flat or over-compressing.
    grain = rng.normal(0, 1.65, (height, width, 1))
    pixels = np.clip(pixels + grain, 0, 255).astype(np.uint8)
    return Image.fromarray(pixels, "RGB")


def overlay(size: tuple[int, int]) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    return layer, ImageDraw.Draw(layer)


def line(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: tuple[int, int, int, int], width: int) -> None:
    draw.line([(int(x), int(y)) for x, y in points], fill=fill, width=width, joint="curve")


def category_lines(kind: str, size: tuple[int, int], seed: int) -> Image.Image:
    width, height = size
    layer, draw = overlay(size)
    ivory = (*PALETTE["ivory"], 23)
    gold = (*PALETTE["gold"], 38)
    thin, medium = max(2, width // 900), max(3, width // 560)
    cx, cy = width * 0.56, height * 0.53
    rng = np.random.default_rng(seed)

    if kind == "crypto":
        for radius in np.linspace(width * 0.12, width * 0.55, 7):
            draw.arc((cx - radius, cy - radius, cx + radius, cy + radius), 195, 40, fill=ivory, width=thin)
            draw.arc((cx - radius, cy - radius, cx + radius, cy + radius), 70, 140, fill=gold, width=thin)
    elif kind == "politics":
        for i in range(8):
            x = width * (0.11 + i * 0.115)
            draw.rectangle((x, height * .12, x + medium, height * .87), fill=ivory)
            draw.line((x - width * .025, height * .17, x + width * .035, height * .17), fill=gold, width=medium)
            draw.line((x - width * .02, height * .84, x + width * .03, height * .84), fill=ivory, width=medium)
    elif kind == "sports":
        for i in range(6):
            start_x = -width * .1 + i * width * .12
            pts = []
            for t in np.linspace(0, 1.25, 80):
                px = start_x + width * t
                py = height * (.85 - .72 * (4 * (t - .48) ** 2) - i * .025)
                pts.append((px, py))
            line(draw, pts, gold if i % 2 else ivory, thin)
    elif kind == "tech":
        gap = width // 11
        for x in range(-gap, width + gap, gap):
            line(draw, [(x, 0), (x + width * .12, height)], ivory, thin)
        for y in range(0, height + gap, gap):
            line(draw, [(0, y), (width, y - height * .13)], gold if y % (gap * 2) == 0 else ivory, thin)
        for x in range(gap, width, gap * 2):
            draw.ellipse((x - medium * 2, height * .46 - medium * 2, x + medium * 2, height * .46 + medium * 2), fill=gold)
    elif kind == "pop":
        source = (width * .50, -height * .08)
        for i, end_x in enumerate(np.linspace(-width * .2, width * 1.2, 8)):
            draw.polygon((source, (end_x - width * .12, height), (end_x + width * .12, height)), fill=(*PALETTE["ivory" if i % 2 else "gold"], 15))
    elif kind == "memes":
        for _ in range(55):
            r = rng.uniform(width * .006, width * .037)
            x, y = rng.uniform(0, width), rng.uniform(0, height)
            draw.ellipse((x - r, y - r, x + r, y + r), outline=gold if rng.random() > .4 else ivory, width=thin)

    return layer.filter(ImageFilter.GaussianBlur(radius=max(0.35, width / 5000)))


def hero_chart(size: tuple[int, int]) -> Image.Image:
    width, height = size
    layer, draw = overlay(size)
    # Broad, understated chart-grid scaffolding.
    for x in range(int(width * .08), int(width * .96), width // 9):
        draw.line((x, height * .16, x, height * .87), fill=(*PALETTE["ivory"], 10), width=max(1, width // 1400))
    points = [
        (width * .04, height * .77), (width * .17, height * .71), (width * .27, height * .73),
        (width * .39, height * .57), (width * .51, height * .62), (width * .64, height * .42),
        (width * .77, height * .47), (width * .96, height * .18),
    ]
    # Interpolate each segment so the line reads as a smooth ascent.
    smooth = []
    for a, b in zip(points, points[1:]):
        for t in np.linspace(0, 1, 26, endpoint=False):
            eased = smoothstep(np.array(t)).item()
            smooth.append((a[0] * (1 - eased) + b[0] * eased, a[1] * (1 - eased) + b[1] * eased))
    smooth.append(points[-1])
    line(draw, smooth, (*PALETTE["ivory"], 105), max(4, width // 600))
    line(draw, smooth, (*PALETTE["gold"], 82), max(2, width // 1150))
    for x, y in points[1::2]:
        draw.ellipse((x - width * .008, y - width * .008, x + width * .008, y + width * .008), fill=(*PALETTE["ivory"], 105))
    return layer.filter(ImageFilter.GaussianBlur(radius=.4))


def render(name: str, final_size: tuple[int, int], seed: int) -> Path:
    high_size = (final_size[0] * SCALE, final_size[1] * SCALE)
    image = mesh(high_size, seed, seed % 5)
    detail = hero_chart(high_size) if name == "hero" else category_lines(name, high_size, seed)
    image = Image.alpha_composite(image.convert("RGBA"), detail)
    image = image.resize(final_size, Image.Resampling.LANCZOS).convert("RGB")
    destination = OUTPUT / f"{name}.png"
    image.save(destination, format="PNG", optimize=True, compress_level=6)
    return destination


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    jobs = [("hero", (1920, 1080))] + [(name, (1200, 1200)) for name in ("crypto", "politics", "sports", "tech", "pop", "memes")]
    created = [render(name, size, 711 + index * 97) for index, (name, size) in enumerate(jobs)]
    for path in created:
        print(f"{path.relative_to(ROOT)}: {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
