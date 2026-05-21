#!/usr/bin/env python3
"""Generate transparent hairstyle overlay PNGs without external dependencies."""

from __future__ import annotations

import math
import os
import struct
import zlib
from typing import Iterable, Sequence

Color = tuple[int, int, int, int]
Point = tuple[float, float]


WIDTH = 512
HEIGHT = 512


def blend(dst: Color, src: Color) -> Color:
    sr, sg, sb, sa = src
    if sa == 255:
        return src
    if sa == 0:
        return dst

    dr, dg, db, da = dst
    source_alpha = sa / 255
    dest_alpha = da / 255
    out_alpha = source_alpha + dest_alpha * (1 - source_alpha)
    if out_alpha == 0:
        return (0, 0, 0, 0)

    out_r = (sr * source_alpha + dr * dest_alpha * (1 - source_alpha)) / out_alpha
    out_g = (sg * source_alpha + dg * dest_alpha * (1 - source_alpha)) / out_alpha
    out_b = (sb * source_alpha + db * dest_alpha * (1 - source_alpha)) / out_alpha
    return (round(out_r), round(out_g), round(out_b), round(out_alpha * 255))


class Canvas:
    def __init__(self, width: int = WIDTH, height: int = HEIGHT) -> None:
        self.width = width
        self.height = height
        self.pixels: list[Color] = [(0, 0, 0, 0)] * (width * height)

    def set_pixel(self, x: int, y: int, color: Color) -> None:
        if 0 <= x < self.width and 0 <= y < self.height:
            index = y * self.width + x
            self.pixels[index] = blend(self.pixels[index], color)

    def draw_ellipse(self, cx: float, cy: float, rx: float, ry: float, color: Color) -> None:
        min_x = max(0, int((cx - rx) * self.width))
        max_x = min(self.width - 1, int((cx + rx) * self.width))
        min_y = max(0, int((cy - ry) * self.height))
        max_y = min(self.height - 1, int((cy + ry) * self.height))
        for y in range(min_y, max_y + 1):
            ny = ((y + 0.5) / self.height - cy) / ry
            for x in range(min_x, max_x + 1):
                nx = ((x + 0.5) / self.width - cx) / rx
                if nx * nx + ny * ny <= 1:
                    self.set_pixel(x, y, color)

    def draw_polygon(self, points: Sequence[Point], color: Color) -> None:
        scaled = [(x * self.width, y * self.height) for x, y in points]
        min_x = max(0, int(min(x for x, _ in scaled)))
        max_x = min(self.width - 1, int(max(x for x, _ in scaled)))
        min_y = max(0, int(min(y for _, y in scaled)))
        max_y = min(self.height - 1, int(max(y for _, y in scaled)))

        for y in range(min_y, max_y + 1):
            for x in range(min_x, max_x + 1):
                if contains_point(scaled, x + 0.5, y + 0.5):
                    self.set_pixel(x, y, color)

    def draw_arc_dots(
        self,
        center: Point,
        radius: float,
        start: float,
        end: float,
        dot_radius: float,
        color: Color,
        count: int,
    ) -> None:
        for index in range(count):
            angle = start + (end - start) * index / max(1, count - 1)
            x = center[0] + radius * math.cos(angle)
            y = center[1] + radius * math.sin(angle)
            self.draw_ellipse(x, y, dot_radius, dot_radius, color)

    def write_png(self, path: str) -> None:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        raw = bytearray()
        for y in range(self.height):
            raw.append(0)
            for x in range(self.width):
                raw.extend(self.pixels[y * self.width + x])

        def chunk(name: bytes, data: bytes) -> bytes:
            return (
                struct.pack(">I", len(data))
                + name
                + data
                + struct.pack(">I", zlib.crc32(name + data) & 0xFFFFFFFF)
            )

        png = b"\x89PNG\r\n\x1a\n"
        png += chunk(b"IHDR", struct.pack(">IIBBBBB", self.width, self.height, 8, 6, 0, 0, 0))
        png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        png += chunk(b"IEND", b"")
        with open(path, "wb") as image:
            image.write(png)


def contains_point(points: Sequence[tuple[float, float]], x: float, y: float) -> bool:
    inside = False
    previous = points[-1]
    for current in points:
        xi, yi = current
        xj, yj = previous
        intersects = (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi
        if intersects:
            inside = not inside
        previous = current
    return inside


def shadow(canvas: Canvas) -> None:
    canvas.draw_ellipse(0.5, 0.38, 0.36, 0.24, (0, 0, 0, 42))


def bob() -> Canvas:
    c = Canvas()
    shadow(c)
    base = (37, 26, 22, 255)
    highlight = (75, 52, 43, 165)
    c.draw_ellipse(0.5, 0.4, 0.36, 0.3, base)
    c.draw_ellipse(0.28, 0.57, 0.12, 0.26, base)
    c.draw_ellipse(0.72, 0.57, 0.12, 0.26, base)
    c.draw_polygon([(0.18, 0.38), (0.36, 0.27), (0.35, 0.56), (0.22, 0.72)], base)
    c.draw_polygon([(0.82, 0.38), (0.64, 0.27), (0.65, 0.56), (0.78, 0.72)], base)
    c.draw_ellipse(0.5, 0.33, 0.31, 0.13, base)
    for x in (0.36, 0.45, 0.54, 0.63):
        c.draw_polygon([(x - 0.09, 0.25), (x + 0.04, 0.25), (x, 0.48)], base)
    c.draw_ellipse(0.42, 0.33, 0.045, 0.2, highlight)
    c.draw_ellipse(0.61, 0.36, 0.035, 0.18, highlight)
    return c


def curtain_bangs() -> Canvas:
    c = Canvas()
    shadow(c)
    base = (98, 52, 28, 255)
    light = (166, 100, 50, 170)
    c.draw_ellipse(0.5, 0.39, 0.35, 0.27, base)
    c.draw_polygon([(0.18, 0.35), (0.45, 0.24), (0.34, 0.77), (0.17, 0.82)], base)
    c.draw_polygon([(0.82, 0.35), (0.55, 0.24), (0.66, 0.77), (0.83, 0.82)], base)
    c.draw_polygon([(0.47, 0.25), (0.22, 0.56), (0.44, 0.49), (0.5, 0.34)], base)
    c.draw_polygon([(0.53, 0.25), (0.78, 0.56), (0.56, 0.49), (0.5, 0.34)], base)
    c.draw_ellipse(0.33, 0.54, 0.05, 0.25, light)
    c.draw_ellipse(0.67, 0.54, 0.05, 0.25, light)
    c.draw_ellipse(0.5, 0.31, 0.08, 0.04, (65, 32, 18, 210))
    return c


def pixie() -> Canvas:
    c = Canvas()
    shadow(c)
    base = (134, 55, 47, 255)
    dark = (75, 28, 31, 210)
    c.draw_ellipse(0.5, 0.36, 0.32, 0.21, base)
    for point in (
        [(0.22, 0.36), (0.35, 0.2), (0.36, 0.46)],
        [(0.34, 0.26), (0.49, 0.13), (0.47, 0.43)],
        [(0.48, 0.23), (0.64, 0.14), (0.58, 0.45)],
        [(0.62, 0.26), (0.8, 0.22), (0.68, 0.49)],
    ):
        c.draw_polygon(point, base)
    c.draw_polygon([(0.28, 0.41), (0.55, 0.28), (0.44, 0.55)], dark)
    c.draw_polygon([(0.53, 0.3), (0.77, 0.38), (0.59, 0.53)], dark)
    c.draw_ellipse(0.28, 0.48, 0.08, 0.1, base)
    c.draw_ellipse(0.72, 0.48, 0.08, 0.1, base)
    return c


def curls() -> Canvas:
    c = Canvas()
    shadow(c)
    base = (25, 22, 22, 255)
    shine = (82, 70, 61, 130)
    for y, row in enumerate((0.31, 0.39, 0.48, 0.58)):
        count = 7 if y < 2 else 6
        start = 0.25 if count == 7 else 0.29
        for i in range(count):
            x = start + i * 0.085
            radius = 0.072 if y < 2 else 0.08
            c.draw_ellipse(x, row + (0.015 if i % 2 else 0), radius, radius, base)
    c.draw_ellipse(0.5, 0.39, 0.31, 0.24, base)
    c.draw_arc_dots((0.5, 0.44), 0.24, math.pi * 0.9, math.pi * 2.1, 0.036, shine, 9)
    c.draw_ellipse(0.38, 0.36, 0.035, 0.035, shine)
    c.draw_ellipse(0.62, 0.34, 0.03, 0.03, shine)
    return c


def high_bun() -> Canvas:
    c = Canvas()
    shadow(c)
    base = (185, 128, 54, 255)
    dark = (119, 75, 34, 160)
    light = (232, 186, 97, 180)
    c.draw_ellipse(0.5, 0.2, 0.16, 0.13, base)
    c.draw_arc_dots((0.5, 0.2), 0.08, 0, math.pi * 2, 0.045, dark, 10)
    c.draw_ellipse(0.5, 0.39, 0.31, 0.23, base)
    c.draw_polygon([(0.24, 0.43), (0.46, 0.27), (0.36, 0.59), (0.2, 0.62)], base)
    c.draw_polygon([(0.76, 0.43), (0.54, 0.27), (0.64, 0.59), (0.8, 0.62)], base)
    c.draw_polygon([(0.5, 0.25), (0.36, 0.52), (0.49, 0.47)], dark)
    c.draw_polygon([(0.5, 0.25), (0.64, 0.52), (0.51, 0.47)], dark)
    c.draw_ellipse(0.4, 0.34, 0.035, 0.15, light)
    c.draw_ellipse(0.6, 0.34, 0.035, 0.15, light)
    return c


def icon() -> Canvas:
    c = Canvas()
    c.draw_ellipse(0.5, 0.5, 0.42, 0.42, (255, 247, 241, 255))
    c.draw_ellipse(0.5, 0.51, 0.29, 0.34, (245, 194, 159, 255))
    c.draw_ellipse(0.5, 0.31, 0.32, 0.22, (54, 37, 31, 255))
    c.draw_polygon([(0.2, 0.33), (0.41, 0.2), (0.34, 0.58), (0.19, 0.72)], (54, 37, 31, 255))
    c.draw_polygon([(0.8, 0.33), (0.59, 0.2), (0.66, 0.58), (0.81, 0.72)], (54, 37, 31, 255))
    c.draw_ellipse(0.5, 0.66, 0.17, 0.08, (238, 105, 96, 255))
    return c


def main() -> None:
    styles: Iterable[tuple[str, Canvas]] = (
        ("bob.png", bob()),
        ("curtain-bangs.png", curtain_bangs()),
        ("pixie.png", pixie()),
        ("curls.png", curls()),
        ("high-bun.png", high_bun()),
    )
    for filename, canvas in styles:
        canvas.write_png(os.path.join("assets", "hairstyles", filename))
    icon().write_png(os.path.join("assets", "icon.png"))


if __name__ == "__main__":
    main()
