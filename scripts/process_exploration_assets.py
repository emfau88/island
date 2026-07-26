from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tmp" / "imagegen"
PUBLIC = ROOT / "public" / "assets"


ASSETS = (
    (
        "bar-night-source.png",
        PUBLIC / "locations" / "bar" / "bar-night.webp",
        (0.5, 0.53),
    ),
    (
        "dock-service-night-source.png",
        PUBLIC / "locations" / "dock" / "dock-service-night.webp",
        (0.5, 0.52),
    ),
    (
        "midnight-wing-source.png",
        PUBLIC / "property" / "midnight-wing.webp",
        (0.5, 0.5),
    ),
)


def process(source_name: str, destination: Path, centering: tuple[float, float]) -> None:
    with Image.open(SOURCE / source_name).convert("RGB") as image:
        fitted = ImageOps.fit(
            image,
            (1536, 2048),
            Image.Resampling.LANCZOS,
            centering=centering,
        )
        fitted = fitted.filter(
            ImageFilter.UnsharpMask(radius=1.0, percent=90, threshold=3)
        )
        destination.parent.mkdir(parents=True, exist_ok=True)
        fitted.save(destination, "WEBP", quality=91, method=6)
        print(f"{destination.relative_to(ROOT)}: {destination.stat().st_size} bytes")


def main() -> None:
    for source_name, destination, centering in ASSETS:
        process(source_name, destination, centering)


if __name__ == "__main__":
    main()
