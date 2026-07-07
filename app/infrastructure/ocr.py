"""OCR fallback for scanned (image-only) PDFs.

Renders pages with pypdfium2 (pure-Python, bundles pdfium — no system dep) and
runs Tesseract via pytesseract. Tesseract itself is a system install; if it (or
the Python libs) are missing, this returns "" so the caller degrades gracefully
to the normal "couldn't extract text" message.
"""

from __future__ import annotations

from app.core.logging import get_logger

log = get_logger(__name__)


def ocr_pdf(
    data: bytes,
    max_pages: int,
    languages: str,
    tesseract_cmd: str | None,
    tessdata_dir: str | None = None,
) -> str:
    try:
        import pypdfium2 as pdfium
        import pytesseract
    except ImportError:
        log.warning("ocr_skipped_missing_deps")
        return ""

    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    # A custom tessdata folder lets us ship language data without admin rights.
    config = f"--tessdata-dir {tessdata_dir}" if tessdata_dir else ""

    try:
        pdf = pdfium.PdfDocument(data)
    except Exception as exc:
        log.warning("ocr_open_failed", error=str(exc))
        return ""

    parts: list[str] = []
    n = min(len(pdf), max_pages)
    for i in range(n):
        try:
            page = pdf[i]
            bitmap = page.render(scale=2.0)  # ~150 DPI, good enough for OCR
            image = bitmap.to_pil()
            parts.append(pytesseract.image_to_string(image, lang=languages, config=config))
        except Exception as exc:  # tesseract missing / page error → skip
            log.info("ocr_page_failed", page=i, error=str(exc))
            continue
    return "\n".join(parts).strip()
