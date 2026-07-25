from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tmp" / "imagegen"
PUBLIC = ROOT / "public" / "assets"
CONTACT = ROOT / "docs" / "asset-contact-sheet"


def fit_master(image: Image.Image, size: tuple[int, int], alpha: bool) -> Image.Image:
    image = image.convert("RGBA" if alpha else "RGB")
    fitted = ImageOps.contain(image, size, Image.Resampling.LANCZOS)
    background = Image.new("RGBA" if alpha else "RGB", size, (0, 0, 0, 0) if alpha else (5, 11, 19))
    x = (size[0] - fitted.width) // 2
    y = (size[1] - fitted.height) // 2
    background.paste(fitted, (x, y), fitted if alpha else None)
    if not alpha:
        background = background.filter(ImageFilter.UnsharpMask(radius=1.2, percent=105, threshold=3))
    return background


def save_environment(source_name: str, destination: Path, size: tuple[int, int]) -> None:
    with Image.open(SOURCE / source_name) as image:
        master = fit_master(image, size, alpha=False)
        destination.parent.mkdir(parents=True, exist_ok=True)
        master.save(destination, "WEBP", quality=92, method=6)


def normalize_character(state: str) -> None:
    destination = PUBLIC / "characters" / "lola" / f"lola-{state}.png"
    with Image.open(destination) as image:
        master = fit_master(image, (1536, 2048), alpha=True)
        master.save(destination, "PNG", optimize=True)


def save_vehicle() -> None:
    destination = PUBLIC / "vehicles" / "runner-car.png"
    with Image.open(destination) as image:
        sprite = fit_master(image, (768, 768), alpha=True)
        sprite.save(destination, "PNG", optimize=True)


def save_portrait() -> None:
    source = PUBLIC / "characters" / "lola" / "lola-neutral.png"
    destination = PUBLIC / "characters" / "lola" / "lola-portrait.webp"
    with Image.open(source).convert("RGBA") as image:
        crop = image.crop((380, 36, 1156, 812))
        crop = ImageOps.fit(crop, (768, 768), Image.Resampling.LANCZOS, centering=(0.5, 0.42))
        backdrop = Image.new("RGBA", (768, 768), (8, 20, 33, 255))
        glow = Image.new("RGBA", (768, 768), (0, 0, 0, 0))
        draw = ImageDraw.Draw(glow)
        draw.ellipse((100, 80, 668, 648), fill=(255, 55, 145, 74))
        glow = glow.filter(ImageFilter.GaussianBlur(80))
        backdrop.alpha_composite(glow)
        backdrop.alpha_composite(crop)
        backdrop.convert("RGB").save(destination, "WEBP", quality=94, method=6)


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = Path("C:/Windows/Fonts/arial.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def checker(size: tuple[int, int], cell: int = 20) -> Image.Image:
    board = Image.new("RGB", size, (19, 30, 42))
    draw = ImageDraw.Draw(board)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(35, 48, 61))
    return board


def make_contact_sheet(entries: list[dict[str, object]]) -> None:
    columns = 3
    cell_width, cell_height = 580, 560
    rows = (len(entries) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height + 100), (4, 9, 16))
    draw = ImageDraw.Draw(sheet)
    draw.text((34, 26), "PHASE 1 – ACTIVE ASSET CONTACT SHEET", font=font(34), fill=(247, 247, 251))

    for index, entry in enumerate(entries):
        path = ROOT / str(entry["file"])
        col = index % columns
        row = index // columns
        x = col * cell_width
        y = row * cell_height + 100
        draw.rounded_rectangle(
            (x + 16, y + 16, x + cell_width - 16, y + cell_height - 16),
            radius=24,
            fill=(7, 17, 29),
            outline=(47, 76, 99),
            width=2,
        )
        preview_area = (x + 32, y + 32, x + cell_width - 32, y + 438)
        with Image.open(path).convert("RGBA") as asset:
            preview = ImageOps.contain(
                asset,
                (preview_area[2] - preview_area[0], preview_area[3] - preview_area[1]),
                Image.Resampling.LANCZOS,
            )
            base = checker((preview_area[2] - preview_area[0], preview_area[3] - preview_area[1]))
            px = (base.width - preview.width) // 2
            py = (base.height - preview.height) // 2
            base.paste(preview, (px, py), preview)
            sheet.paste(base, (preview_area[0], preview_area[1]))
        draw.text((x + 34, y + 458), str(entry["id"]).upper(), font=font(24), fill=(255, 79, 154))
        dimensions = f'{entry["width"]} × {entry["height"]} · {"ALPHA" if entry["alpha"] else "OPAQUE"}'
        draw.text((x + 34, y + 495), dimensions, font=font(18), fill=(203, 219, 231))

    CONTACT.mkdir(parents=True, exist_ok=True)
    sheet.save(CONTACT / "phase1-contact-sheet.png", "PNG", optimize=True)


def inventory() -> list[dict[str, object]]:
    files = [
        ("world-island-night", PUBLIC / "world" / "island-night.webp"),
        ("pool-night", PUBLIC / "locations" / "pool" / "pool-night.webp"),
        ("yacht-dock-night", PUBLIC / "locations" / "yacht" / "yacht-dock-night.webp"),
        ("lola-neutral", PUBLIC / "characters" / "lola" / "lola-neutral.png"),
        ("lola-positive", PUBLIC / "characters" / "lola" / "lola-positive.png"),
        ("lola-flirty", PUBLIC / "characters" / "lola" / "lola-flirty.png"),
        ("lola-serious", PUBLIC / "characters" / "lola" / "lola-serious.png"),
        ("lola-annoyed", PUBLIC / "characters" / "lola" / "lola-annoyed.png"),
        ("lola-surprised", PUBLIC / "characters" / "lola" / "lola-surprised.png"),
        ("lola-portrait", PUBLIC / "characters" / "lola" / "lola-portrait.webp"),
        ("runner-car", PUBLIC / "vehicles" / "runner-car.png"),
    ]
    entries: list[dict[str, object]] = []
    for asset_id, path in files:
        with Image.open(path) as image:
            has_alpha = "A" in image.mode and image.getextrema()[-1][0] < 255
            entries.append(
                {
                    "id": asset_id,
                    "file": path.relative_to(ROOT).as_posix(),
                    "width": image.width,
                    "height": image.height,
                    "mode": image.mode,
                    "alpha": has_alpha,
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                }
            )
    return entries


def main() -> None:
    save_environment("world-island-night-source.png", PUBLIC / "world" / "island-night.webp", (2048, 3072))
    save_environment("pool-night-source.png", PUBLIC / "locations" / "pool" / "pool-night.webp", (1536, 2048))
    save_environment(
        "yacht-dock-night-source.png",
        PUBLIC / "locations" / "yacht" / "yacht-dock-night.webp",
        (1536, 2048),
    )
    for state in ("neutral", "positive", "flirty", "serious", "annoyed", "surprised"):
        normalize_character(state)
    save_vehicle()
    save_portrait()
    entries = inventory()
    CONTACT.mkdir(parents=True, exist_ok=True)
    (CONTACT / "phase1-assets.json").write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    make_contact_sheet(entries)
    print(f"Processed {len(entries)} active assets.")


if __name__ == "__main__":
    main()
