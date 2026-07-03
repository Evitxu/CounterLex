"""Extract plain text from an uploaded PDF (pypdf — pure Python, no system deps).

Text-based (digital) PDFs work directly; scanned/image PDFs yield little or no
text (no OCR here), which the route detects and reports as a clear error.
"""

from __future__ import annotations

import io

from app.core.logging import get_logger

log = get_logger(__name__)


def extract_pdf_text(data: bytes, max_pages: int) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("pypdf not installed — pip install -r requirements.txt") from exc

    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception as exc:
        raise ValueError(f"Could not read PDF: {exc}") from exc

    parts: list[str] = []
    for page in reader.pages[:max_pages]:
        try:
            parts.append(page.extract_text() or "")
        except Exception:  # a broken page shouldn't abort the whole document
            continue
    return "\n".join(parts).strip()
