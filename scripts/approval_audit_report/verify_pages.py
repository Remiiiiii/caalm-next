"""Render the approval audit PDF and convert each page to JPEG.

Usage:
  python verify_pages.py
  python verify_pages.py --pdf report.pdf --out-dir ./preview
Exit non-zero if pdftoppm is missing or fewer than 5 pages are produced.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
GENERATOR = HERE / "generate_report.py"
SAMPLE = HERE / "sample_payload.json"


def find_pdftoppm() -> str | None:
    return shutil.which("pdftoppm")


def render_with_pypdfium(pdf_path: Path, out_dir: Path) -> None:
    try:
        import pypdfium2 as pdfium
    except ImportError as exc:
        raise SystemExit(
            "pdftoppm not found and pypdfium2 is not installed. "
            "Install poppler (choco/brew/winget) or `pip install pypdfium2`."
        ) from exc
    doc = pdfium.PdfDocument(str(pdf_path))
    for index, page in enumerate(doc, start=1):
        bitmap = page.render(scale=150 / 72)
        bitmap.to_pil().convert("RGB").save(
            out_dir / f"page-{index}.jpg", "JPEG", quality=85
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", help="Existing PDF to inspect")
    parser.add_argument("--out-dir", default=str(HERE / ".verify"))
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = Path(args.pdf) if args.pdf else out_dir / "report.pdf"

    if not args.pdf:
        subprocess.check_call(
            [sys.executable, str(GENERATOR), "--input", str(SAMPLE), "--output", str(pdf_path)]
        )

    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}", file=sys.stderr)
        return 1

    pdftoppm = find_pdftoppm()
    if pdftoppm:
        prefix = out_dir / "page"
        subprocess.check_call(
            [pdftoppm, "-jpeg", "-r", "150", str(pdf_path), str(prefix)]
        )
    else:
        render_with_pypdfium(pdf_path, out_dir)
    pages = sorted(out_dir.glob("page*.jpg"))
    if len(pages) < 5:
        print(f"Expected 5 JPEG pages, found {len(pages)}", file=sys.stderr)
        return 1
    print(f"Wrote {len(pages)} pages to {out_dir}")
    for page in pages:
        print(f"  {page.name} ({page.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
