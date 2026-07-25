import base64

import fitz
import openai

from app.config import get_settings


class PDFExtractionError(RuntimeError):
    pass


def _clean(text: str) -> str:
    return " ".join(text.split())


def _has_usable_text(text: str) -> bool:
    compact = _clean(text)
    if len(compact) < 40:
        return False
    non_space = sum(not char.isspace() for char in compact)
    letters = sum(char.isalpha() for char in compact)
    replacements = sum(char == "\ufffd" or "\ue000" <= char <= "\uf8ff" for char in compact)
    return letters / max(non_space, 1) >= 0.35 and replacements / max(non_space, 1) <= 0.01


def _ocr_pages(document: fitz.Document) -> str:
    settings = get_settings()
    if not settings.openai_api_key:
        raise PDFExtractionError("This PDF needs OCR, but OPENAI_API_KEY is not configured.")
    if document.page_count > 30:
        raise PDFExtractionError("Scanned PDF OCR is limited to 30 pages per upload.")

    client = openai.OpenAI(api_key=settings.openai_api_key)
    extracted_chunks = []
    for batch_start in range(0, document.page_count, 4):
        content = [{
            "type": "text",
            "text": (
                "Transcribe every readable word from these story pages in page order. Preserve the original "
                "language, paragraph order, punctuation, speaker labels, and dialogue. Do not summarize, translate, "
                "explain, or add text. Separate pages with a blank line."
            ),
        }]
        for page_number in range(batch_start, min(batch_start + 4, document.page_count)):
            page = document.load_page(page_number)
            pixmap = page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6), alpha=False)
            encoded = base64.b64encode(pixmap.tobytes("jpeg", jpg_quality=78)).decode("ascii")
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{encoded}", "detail": "high"},
            })
        try:
            response = client.chat.completions.create(
                model=settings.openai_model,
                max_tokens=4000,
                messages=[{"role": "user", "content": content}],
            )
        except openai.APIError as exc:
            raise PDFExtractionError(f"OCR provider failed: {exc}") from exc
        extracted_chunks.append((response.choices[0].message.content or "").strip())

    text = _clean("\n\n".join(extracted_chunks))
    if not _has_usable_text(text):
        raise PDFExtractionError("OCR completed, but no reliable story text could be recovered.")
    return text


def extract_pdf(data: bytes) -> tuple[str, str]:
    try:
        document = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise PDFExtractionError("The PDF is damaged or could not be opened.") from exc

    try:
        if document.needs_pass:
            raise PDFExtractionError("This PDF is password-protected. Remove the password and try again.")
        embedded_text = "\n\n".join(page.get_text("text") for page in document)
        if _has_usable_text(embedded_text):
            return _clean(embedded_text), "embedded_text"
        return _ocr_pages(document), "vision_ocr"
    finally:
        document.close()

