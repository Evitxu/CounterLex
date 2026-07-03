"""Input sanitization for user-supplied text (the case description).

Strips HTML/markup and control characters before the text is used or echoed,
so nothing that could execute in a browser is ever processed or returned. The
React frontend also escapes on output — this is defense in depth. We store/return
plain text (not HTML-escaped entities) to avoid double-escaping in the UI.
"""

from __future__ import annotations

import re
import unicodedata

_TAG_RE = re.compile(r"<[^>]*>")
_CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]")


def sanitize_text(value: str) -> str:
    text = unicodedata.normalize("NFKC", value)
    text = _CTRL_RE.sub("", text)
    # Strip tags repeatedly so `<<script>>` collapses fully.
    prev = None
    while prev != text:
        prev = text
        text = _TAG_RE.sub("", text)
    return text.strip()
