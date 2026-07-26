from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tmp" / "imagegen"
PUBLIC = ROOT / "public" / "assets"


def save_environment(source_name: str, destination: Path) -> None:
    with Image.open(SOURCE / source_name).convert("RGB") as image:
        master = ImageOps.fit(
            image,
            (1536, 2048),
            Image.Resampling.LANCZOS,
            centering=(0.5, 0.48),
        )
        master = master.filter(ImageFilter.UnsharpMask(radius=1.1, percent=95, threshold=3))
        destination.parent.mkdir(parents=True, exist_ok=True)
        master.save(destination, "WEBP", quality=91, method=6)


def save_mia_portrait() -> None:
    source = PUBLIC / "characters" / "mia" / "mia-neutral.png"
    destination = PUBLIC / "characters" / "mia" / "mia-portrait.webp"
    with Image.open(source).convert("RGBA") as image:
        width, height = image.size
        crop = image.crop(
            (
                round(width * 0.22),
                round(height * 0.025),
                round(width * 0.78),
                round(height * 0.40),
            )
        )
        crop = ImageOps.fit(crop, (768, 768), Image.Resampling.LANCZOS, centering=(0.5, 0.42))
        backdrop = Image.new("RGBA", (768, 768), (6, 17, 28, 255))
        glow = Image.new("RGBA", (768, 768), (0, 0, 0, 0))
        draw = ImageDraw.Draw(glow)
        draw.ellipse((90, 70, 678, 658), fill=(56, 201, 255, 56))
        draw.ellipse((250, 120, 720, 690), fill=(255, 79, 154, 42))
        glow = glow.filter(ImageFilter.GaussianBlur(90))
        backdrop.alpha_composite(glow)
        backdrop.alpha_composite(crop)
        destination.parent.mkdir(parents=True, exist_ok=True)
        backdrop.convert("RGB").save(destination, "WEBP", quality=93, method=6)


def main() -> None:
    save_environment(
        "villa-night-source.png",
        PUBLIC / "locations" / "villa" / "villa-night.webp",
    )
    save_environment(
        "club-night-source.png",
        PUBLIC / "locations" / "club" / "club-night.webp",
    )
    save_mia_portrait()
    print("Processed Mia portrait, Villa and Club assets.")


if __name__ == "__main__":
    main()
