from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.pdf_extractor import PDFExtractionError, extract_pdf

router = APIRouter(prefix="/api/extract-pdf", tags=["Document extraction"])
MAX_PDF_BYTES = 20 * 1024 * 1024


@router.post("")
async def extract_uploaded_pdf(pdf_file: UploadFile = File(...)) -> dict[str, str]:
    data = await pdf_file.read(MAX_PDF_BYTES + 1)
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF files must be 20 MB or smaller.")
    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="The uploaded file is not a PDF.")
    try:
        text, method = extract_pdf(data)
    except PDFExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"text": text, "method": method}

