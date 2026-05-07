"""CV file parser — extracts text from PDF and DOCX files."""
import io
from PyPDF2 import PdfReader
from docx import Document


def parse_cv_file(content: bytes, ext: str) -> str:
    """Parse CV file bytes into plain text."""
    if ext == "pdf":
        return _parse_pdf(content)
    elif ext == "docx":
        return _parse_docx(content)
    return ""


def _parse_pdf(content: bytes) -> str:
    """Extract text from PDF bytes."""
    reader = PdfReader(io.BytesIO(content))
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
    return "\n".join(text_parts)


def _parse_docx(content: bytes) -> str:
    """Extract text from DOCX bytes."""
    doc = Document(io.BytesIO(content))
    text_parts = []
    for para in doc.paragraphs:
        if para.text.strip():
            text_parts.append(para.text)
    return "\n".join(text_parts)
