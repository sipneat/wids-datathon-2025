import base64
import importlib
import io
import os
import re
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from groq import Groq

from firebase_init import db

insurance_bp = Blueprint('insurance', __name__, url_prefix='')
USER_ID_HEADER = 'X-User-Id'
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_VISION_MODEL = os.getenv('GROQ_VISION_MODEL', 'meta-llama/llama-4-scout-17b-16e-instruct')
vision_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def get_user_id():
    user_id = request.headers.get(USER_ID_HEADER)
    if not user_id:
        return None, (jsonify({'error': f'Missing {USER_ID_HEADER} header'}), 400)
    return user_id, None


def _serialize(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _serialize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize(v) for v in value]
    return value


def _safe_text(value):
    return str(value or '').strip()


def _extract_pdf_text(file_bytes):
    try:
        pypdf_module = importlib.import_module('pypdf')
        PdfReader = getattr(pypdf_module, 'PdfReader')
    except Exception as e:
        raise ValueError(f'PDF extraction is not available: {e}')

    text_chunks = []
    reader = PdfReader(io.BytesIO(file_bytes))
    for page in reader.pages:
        page_text = _safe_text(page.extract_text())
        if page_text:
            text_chunks.append(page_text)
    return '\n\n'.join(text_chunks).strip()


def _extract_image_text_with_groq(file_bytes, mime_type):
    if not vision_client:
        return ''

    encoded = base64.b64encode(file_bytes).decode('utf-8')
    data_url = f'data:{mime_type};base64,{encoded}'

    completion = vision_client.chat.completions.create(
        model=GROQ_VISION_MODEL,
        temperature=0.0,
        max_tokens=1800,
        messages=[
            {
                'role': 'user',
                'content': [
                    {
                        'type': 'text',
                        'text': 'Extract all visible text from this insurance-related image. Return only plain text without commentary.'
                    },
                    {
                        'type': 'image_url',
                        'image_url': {'url': data_url}
                    },
                ],
            }
        ],
    )
    return _safe_text((completion.choices[0].message.content or ''))


def _extract_text_from_file(file_bytes, file_name, mime_type):
    lower_name = _safe_text(file_name).lower()
    lower_mime = _safe_text(mime_type).lower()

    if lower_name.endswith('.pdf') or lower_mime == 'application/pdf':
        return _extract_pdf_text(file_bytes)

    if lower_mime.startswith('image/') or lower_name.endswith(('.png', '.jpg', '.jpeg', '.webp')):
        return _extract_image_text_with_groq(file_bytes, mime_type or 'image/jpeg')

    raise ValueError('Unsupported file type. Please upload PDF, PNG, JPG, JPEG, or WEBP.')


def _extract_structured_insurance_fields(text):
    source = _safe_text(text)
    fields = {
        'policyNumber': '',
        'claimNumber': '',
        'deductibleAmount': '',
        'coverageLimit': '',
        'importantDeadline': '',
    }

    patterns = {
        'policyNumber': r'(?:policy\s*(?:number|#)\s*[:\-]?\s*)([A-Za-z0-9\-]{4,})',
        'claimNumber': r'(?:claim\s*(?:number|#)\s*[:\-]?\s*)([A-Za-z0-9\-]{4,})',
        'deductibleAmount': r'(?:deductible\s*[:\-]?\s*)(\$\s?[\d,]+(?:\.\d{2})?)',
        'coverageLimit': r'(?:coverage\s*(?:limit|amount)?\s*[:\-]?\s*)(\$\s?[\d,]+(?:\.\d{2})?)',
        'importantDeadline': r'((?:due|deadline|submit by|file by)\s*[:\-]?\s*[A-Za-z0-9,\-/ ]{6,40})',
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, source, flags=re.IGNORECASE)
        if match:
            fields[key] = _safe_text(match.group(1))

    return fields


def _doc_to_response(doc_id, payload):
    output = {
        'id': doc_id,
        'userId': payload.get('userId'),
        'fileName': payload.get('fileName'),
        'fileSize': payload.get('fileSize'),
        'mimeType': payload.get('mimeType'),
        'status': payload.get('status'),
        'uploadedAt': _serialize(payload.get('uploadedAt')),
        'updatedAt': _serialize(payload.get('updatedAt')),
        'extractedText': payload.get('extractedText', ''),
        'editedText': payload.get('editedText', ''),
        'structuredFields': payload.get('structuredFields') or {},
    }
    return output


@insurance_bp.route('/insurance/documents', methods=['GET', 'POST', 'OPTIONS'])
def insurance_documents_route():
    if request.method == 'OPTIONS':
        return '', 204

    user_id, auth_error = get_user_id()
    if auth_error:
        return auth_error

    if request.method == 'GET':
        try:
            docs = list(
                db.collection('insuranceDocuments')
                .where('userId', '==', user_id)
                .stream()
            )
            docs.sort(
                key=lambda d: ((d.to_dict() or {}).get('updatedAt') or datetime.min.replace(tzinfo=timezone.utc)),
                reverse=True,
            )
            documents = [_doc_to_response(doc.id, doc.to_dict() or {}) for doc in docs[:50]]
            return jsonify({'documents': documents}), 200
        except Exception as e:
            print(f'Error loading insurance documents: {e}')
            return jsonify({'error': str(e)}), 500

    try:
        file = request.files.get('file')
        if not file:
            return jsonify({'error': 'No file provided'}), 400

        file_name = _safe_text(file.filename)
        if not file_name:
            return jsonify({'error': 'File name is required'}), 400

        file_bytes = file.read()
        if not file_bytes:
            return jsonify({'error': 'File is empty'}), 400

        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            return jsonify({'error': 'File is too large. Maximum 10MB allowed.'}), 400

        mime_type = _safe_text(file.mimetype) or 'application/octet-stream'
        extracted_text = _extract_text_from_file(file_bytes, file_name, mime_type)
        structured_fields = _extract_structured_insurance_fields(extracted_text)
        status = 'processed' if extracted_text else 'processing_failed'

        now = datetime.now(timezone.utc)
        payload = {
            'userId': user_id,
            'fileName': file_name,
            'fileSize': len(file_bytes),
            'mimeType': mime_type,
            'status': status,
            'uploadedAt': now,
            'updatedAt': now,
            'extractedText': extracted_text,
            'editedText': extracted_text,
            'structuredFields': structured_fields,
        }

        doc_ref = db.collection('insuranceDocuments').document()
        doc_ref.set(payload)
        return jsonify({'document': _doc_to_response(doc_ref.id, payload)}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f'Error uploading insurance document: {e}')
        return jsonify({'error': str(e)}), 500


@insurance_bp.route('/insurance/documents/<document_id>', methods=['PATCH', 'DELETE', 'OPTIONS'])
def insurance_document_route(document_id):
    if request.method == 'OPTIONS':
        return '', 204

    user_id, auth_error = get_user_id()
    if auth_error:
        return auth_error

    doc_ref = db.collection('insuranceDocuments').document(document_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({'error': 'Document not found'}), 404

    payload = doc.to_dict() or {}
    if payload.get('userId') != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    if request.method == 'DELETE':
        try:
            doc_ref.delete()
            return jsonify({'success': True}), 200
        except Exception as e:
            print(f'Error deleting insurance document: {e}')
            return jsonify({'error': str(e)}), 500

    try:
        body = request.get_json(silent=True) or {}
        edited_text = _safe_text(body.get('editedText'))
        if not edited_text:
            return jsonify({'error': 'editedText is required'}), 400

        structured_fields = _extract_structured_insurance_fields(edited_text)
        update_payload = {
            'editedText': edited_text,
            'structuredFields': structured_fields,
            'status': 'processed',
            'updatedAt': datetime.now(timezone.utc),
        }
        doc_ref.set(update_payload, merge=True)

        merged = {**payload, **update_payload}
        return jsonify({'document': _doc_to_response(document_id, merged)}), 200
    except Exception as e:
        print(f'Error updating insurance document: {e}')
        return jsonify({'error': str(e)}), 500
