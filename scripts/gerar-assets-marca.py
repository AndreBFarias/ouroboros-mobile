#!/usr/bin/env python3
"""Gera os assets de marca do Ouroboros a partir de SVG procedural.

Substitui placeholders Expo default por icone, adaptive-icon, splash e
favicon coerentes com src/components/brand/OuroborosLogo.tsx (anel
principal + cabeca/cauda, sem wordmark — simbolo puro resiliente a
tamanhos pequenos como launcher 48dp).

Uso:
    pip install --user cairosvg pillow
    python3 scripts/gerar-assets-marca.py

Saida:
    assets/icon.png            1024x1024 — launcher Android (cantos arredondados)
    assets/icon-foreground.png 1024x1024 — foreground transparente
    assets/adaptive-icon.png   1024x1024 — Android 13+ adaptive icon
    assets/splash-icon.png     1024x1024 — splash module SDK 54
    assets/splash.png          2400x2400 — splash centralizado em bg #282a36
    assets/favicon.png          196x196  — web/Gauntlet

Origem: sprint C3 M-RELEASE-ASSETS (release readiness pre-APK 1.0).
"""
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

# SVG do simbolo Ouroboros — sem wordmark, viewBox 320x320, anel + cabeca.
# Derivado de src/components/brand/OuroborosLogo.tsx linhas 60-170.
SYMBOL_SVG = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
  <defs>
    <linearGradient id="og1" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#bd93f9"/>
      <stop offset="100%" stop-color="#ff79c6"/>
    </linearGradient>
    <radialGradient id="og-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#bd93f9" stop-opacity="0.22"/>
      <stop offset="70%" stop-color="#bd93f9" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="160" cy="160" r="150" fill="url(#og-glow)"/>
  <circle cx="160" cy="160" r="142" fill="none" stroke="#bd93f9" stroke-width="0.6" stroke-dasharray="1 8" opacity="0.35"/>
  <circle cx="160" cy="160" r="78" fill="none" stroke="#8be9fd" stroke-width="1" stroke-dasharray="3 7" opacity="0.35"/>
  <path d="M 155 40 A 120 120 0 0 0 40 160 A 120 120 0 0 0 160 280 A 120 120 0 0 0 280 160 A 120 120 0 0 0 175 40"
        fill="none" stroke="url(#og1)" stroke-width="11" stroke-linecap="round"/>
  <path d="M 155 40 A 120 120 0 0 0 40 160 A 120 120 0 0 0 160 280 A 120 120 0 0 0 280 160 A 120 120 0 0 0 175 40"
        fill="none" stroke="#0e0f15" stroke-width="11" stroke-linecap="round" stroke-dasharray="1.5 13" opacity="0.55"/>
  <circle cx="155" cy="40" r="6" fill="#bd93f9"/>
  <g transform="translate(175, 40)">
    <path d="M 0 -2 C -4 -10, -16 -12, -24 -8 C -28 -6, -30 -2, -28 0 L -8 -1 Z"
          fill="#ff79c6" stroke="#bd93f9" stroke-width="0.8" stroke-linejoin="round"/>
    <path d="M 0 2 C -4 8, -14 10, -22 7 C -26 5, -28 2, -26 0 L -8 1 Z"
          fill="#c77ab0" stroke="#bd93f9" stroke-width="0.8" stroke-linejoin="round"/>
    <ellipse cx="-4" cy="-3" rx="9" ry="5" fill="#ff79c6" opacity="0.9"/>
    <circle cx="-6" cy="-4" r="1.8" fill="#0e0f15"/>
    <circle cx="-5.5" cy="-4.6" r="0.6" fill="#f8f8f2"/>
    <path d="M -28 0 L -34 -2 M -28 0 L -34 2"
          stroke="#ff79c6" stroke-width="0.8" stroke-linecap="round" fill="none"/>
  </g>
</svg>"""

# Paleta Dracula
BG_SPLASH = (0x28, 0x2a, 0x36, 255)   # --bg
BG_ROUNDED = (0x14, 0x15, 0x1a, 255)  # --bg-page para o launcher (mais escuro)


def render_svg(svg_str, out_path, width, height):
    cairosvg.svg2png(
        bytestring=svg_str.encode("utf-8"),
        write_to=str(out_path),
        output_width=width,
        output_height=height,
    )


def composite_on_bg(foreground_img, out_path, size, bg_color, rounded_radius=None):
    bg = Image.new("RGBA", (size, size), bg_color)
    fg = foreground_img if foreground_img.size == (size, size) else foreground_img.resize((size, size), Image.LANCZOS)
    bg.paste(fg, (0, 0), fg)
    if rounded_radius:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=rounded_radius, fill=255)
        bg.putalpha(mask)
    bg.save(out_path, "PNG", optimize=True)


def main():
    tmp = ROOT / "build" / "assets-tmp"
    tmp.mkdir(parents=True, exist_ok=True)

    fg_1024 = tmp / "foreground-1024.png"
    render_svg(SYMBOL_SVG, fg_1024, 1024, 1024)

    foreground = Image.open(fg_1024).convert("RGBA")

    # Launcher icon — fundo Dracula bg-page com cantos arredondados (~22% raio iOS).
    composite_on_bg(foreground, ASSETS / "icon.png", 1024, BG_ROUNDED, rounded_radius=224)

    # Foreground transparente (referenciado em adaptiveIcon.foregroundImage).
    foreground.save(ASSETS / "icon-foreground.png", "PNG", optimize=True)

    # Adaptive icon Android 13+ — foreground centralizado, Expo aplica backgroundColor.
    foreground.save(ASSETS / "adaptive-icon.png", "PNG", optimize=True)

    # Splash icon SDK 54.
    foreground.save(ASSETS / "splash-icon.png", "PNG", optimize=True)

    # Splash screen — anel em ~42% do canvas centralizado em bg #282a36.
    splash_size = 2400
    fg_size = int(splash_size * 0.42)
    splash_bg = Image.new("RGBA", (splash_size, splash_size), BG_SPLASH)
    fg_resized = foreground.resize((fg_size, fg_size), Image.LANCZOS)
    pos = ((splash_size - fg_size) // 2, (splash_size - fg_size) // 2)
    splash_bg.paste(fg_resized, pos, fg_resized)
    splash_bg.save(ASSETS / "splash.png", "PNG", optimize=True)

    # Favicon — 196x196, mesmo tratamento do icon launcher mas em escala.
    composite_on_bg(foreground, ASSETS / "favicon.png", 196, BG_ROUNDED, rounded_radius=42)

    print("OK — 6 assets atualizados em", ASSETS)


if __name__ == "__main__":
    main()
