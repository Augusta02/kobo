import uuid 
from decimal import Decimal, InvalidOperation
import boto3
from app.core.config import get_settings

def _parse_total(expense_document: dict) -> Decimal | None:
    """Parse the total amount from the Textract analyze Expense response.

    Textract can return the same field type multpile times at different 
    confidence levels, so we need to find the one with the highest confidence.
    """
    totals = [
        field for field in expense_document['SummaryFields']
        if field['Type']['Text'] == 'TOTAL' and 'ValueDetection' in field
    ]
    if not totals:
        return None

    best = max(totals, key=lambda f: f['Type']['Confidence'])
    raw_text = best['ValueDetection']['Text']
    cleaned = raw_text.replace(',', '').replace('₦', '').strip()
    try:
        total = Decimal(cleaned)
    except (InvalidOperation, TypeError):
        raise ValueError("Invalid total amount in expense document")
    return total

def process_receipt(image_bytes: bytes, filename_hint: str = "jpg") -> dict:
    """Upload a receipt photo to S3 and extract its total via Textract.

    Returns a dict with the parsed total (or None if nothing was found)
    and the S3 key the photo was stored under, for later reference.
    """
    settings = get_settings()

    s3 = boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )
    key = f"receipts/{uuid.uuid4()}.{filename_hint}"
    s3.put_object(Bucket=settings.s3_bucket_name, Key=key, Body=image_bytes)

    textract = boto3.client(
        "textract",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )
    response = textract.analyze_expense(Document={"Bytes": image_bytes})
    total = _parse_total(response["ExpenseDocuments"][0])

    return {"total": total, "s3_key": key}