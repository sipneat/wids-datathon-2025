import json
import os
import re
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv
from flask import Blueprint, jsonify, request
from groq import Groq
from pinecone import Pinecone
import requests

from firebase_init import db

_ROUTES_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _ROUTES_DIR.parent
_PROJECT_ROOT = _BACKEND_DIR.parent
load_dotenv(_BACKEND_DIR / '.env')
load_dotenv(_PROJECT_ROOT / '.env')

chatbot_bp = Blueprint('chatbot', __name__, url_prefix='')
USER_ID_HEADER = 'X-User-Id'

# In-memory conversation storage for scaffolding.
_conversation_store = {}

# API keys
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
JINA_API_KEY = os.getenv('JINA_API_KEY')

# Runtime retrieval/generation settings are pinned in code by request.
INDEX_NAME = 'wildfire-narratives'
JINA_MODEL = 'jina-embeddings-v3'
JINA_DIMENSIONS = 1024
GROQ_MODEL = 'llama-3.3-70b-versatile'
API_URL = 'https://api.jina.ai/v1/embeddings'

pc = Pinecone(api_key=PINECONE_API_KEY) if PINECONE_API_KEY else None
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def get_user_id():
    user_id = request.headers.get(USER_ID_HEADER)
    if not user_id:
        return None, (jsonify({'error': f'Missing {USER_ID_HEADER} header'}), 400)
    return user_id, None


def extract_json(text):
    text = re.sub(r'^```(?:json)?|```$', '', text.strip(), flags=re.MULTILINE)
    json_match = re.search(r'\{[\s\S]*\}', text)
    if json_match:
        json_str = json_match.group()
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            print('JSON decode failed:', e)
            return {'error': 'Malformed JSON', 'raw': json_str}
    return {'error': 'No JSON found', 'raw': text}


def _embed_text(text):
    if not JINA_API_KEY:
        raise ValueError('Missing JINA_API_KEY')

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {JINA_API_KEY}',
    }
    data = {
        'model': JINA_MODEL,
        'dimensions': JINA_DIMENSIONS,
        'input': [text],
    }
    res = requests.post(API_URL, json=data, headers=headers, timeout=30)
    res.raise_for_status()
    return res.json()['data'][0]['embedding']


def _get_index(index_name=None):
    if not pc:
        raise ValueError('Missing PINECONE_API_KEY')
    return pc.Index(index_name or INDEX_NAME)


def _query_matches(index, vector, top_k=12, include_metadata=True):
    # Try default + common intent namespaces because embeddings can be routed by namespace.
    namespaces = [
        None,
        '',
        'general',
        'housing',
        'insurance',
        'school',
        'transport',
        'health',
    ]

    merged = []
    seen = set()
    for namespace in namespaces:
        kwargs = {
            'vector': vector,
            'top_k': top_k,
            'include_metadata': include_metadata,
        }
        if namespace:
            kwargs['namespace'] = namespace

        try:
            results = index.query(**kwargs)
        except Exception:
            continue

        for match in results.get('matches', []):
            item_id = match.get('id')
            if not item_id or item_id in seen:
                continue
            seen.add(item_id)
            merged.append(match)

    merged.sort(key=lambda m: float(m.get('score', 0.0)), reverse=True)
    return merged[:top_k]


def _safe_float(value, default=None):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_text(value):
    text = str(value or '').strip()
    return text or None


def _normalize_state(value):
    text = _safe_text(value)
    return text.upper() if text else None


def _normalize_county(value):
    text = _safe_text(value)
    if not text:
        return None
    return re.sub(r'\s+', ' ', text)


def _normalize_zip(value):
    text = _safe_text(value)
    return text if text else None


def _severity_score_from_text(value):
    text = str(value or '').strip().lower()
    if not text:
        return None
    if 'catastrophic' in text:
        return 0.95
    if 'severe' in text:
        return 0.8
    if 'moderate' in text:
        return 0.55
    if 'minor' in text:
        return 0.3
    return None


def _resolve_intake_constraints(payload, context):
    fire_radius_miles = _safe_float(payload.get('fire_radius_miles'), default=None)
    severity_score = _safe_float(payload.get('severity_score'), default=None)

    if isinstance(context, dict):
        if fire_radius_miles is None:
            fire_radius_miles = _safe_float(context.get('fire_radius_miles'), default=None)
        if severity_score is None:
            severity_score = _safe_float(context.get('severity_score'), default=None)

        profile = context.get('profile') if isinstance(context.get('profile'), dict) else {}
        if fire_radius_miles is None:
            fire_radius_miles = _safe_float(profile.get('fireRadius') or profile.get('fire_radius'), default=None)
        if severity_score is None:
            severity_score = _safe_float(profile.get('fireSeverityScore'), default=None)
        if severity_score is None:
            severity_score = _severity_score_from_text(profile.get('fireSeverity'))

    return fire_radius_miles, severity_score


def _resolve_location_constraints(payload, context):
    state = _normalize_state(payload.get('state'))
    county = _normalize_county(payload.get('county'))
    zip_code = _normalize_zip(payload.get('zip_code') or payload.get('zipCode'))

    if isinstance(context, dict):
        if state is None:
            state = _normalize_state(context.get('state'))
        if county is None:
            county = _normalize_county(context.get('county'))
        if zip_code is None:
            zip_code = _normalize_zip(context.get('zip_code') or context.get('zipCode'))

        profile = context.get('profile') if isinstance(context.get('profile'), dict) else {}
        if state is None:
            state = _normalize_state(profile.get('state'))
        if county is None:
            county = _normalize_county(profile.get('county'))
        if zip_code is None:
            zip_code = _normalize_zip(profile.get('zip_code') or profile.get('zipCode'))

    return state, county, zip_code


def _build_intake_summary(context):
    if not isinstance(context, dict):
        return {}
    profile = context.get('profile') if isinstance(context.get('profile'), dict) else {}
    return {
        'state': profile.get('state') or '',
        'county': profile.get('county') or '',
        'zip_code': profile.get('zipCode') or profile.get('zip_code') or '',
        'needs_housing': bool(profile.get('needsHousing')),
        'needs_employment': bool(profile.get('needsEmployment')),
        'has_children': bool(profile.get('hasChildren')),
        'has_insurance': bool(profile.get('hasInsurance')),
        'insurance_claim_status': profile.get('insuranceClaimStatus') or '',
        'caregiving_needs': profile.get('caregivingNeeds') or [],
        'housing_budget': profile.get('housingBudget') or '',
        'fire_radius_miles': profile.get('fireRadius') or profile.get('fire_radius') or '',
        'fire_severity': profile.get('fireSeverity') or '',
    }


def _query_matches_with_location_fallback(index, vector, top_k=12, include_metadata=True, state=None, county=None):
    namespaces = [
        None,
        '',
        'general',
        'housing',
        'insurance',
        'school',
        'transport',
        'health',
    ]

    strategy = []
    if county and state:
        strategy.append(('county_state', {'$and': [{'county': {'$eq': county}}, {'state': {'$eq': state}}]}))
    if state:
        strategy.append(('state_only', {'state': {'$eq': state}}))
    strategy.append(('semantic_only', None))

    def _run(filter_expr):
        merged = []
        seen = set()
        for namespace in namespaces:
            kwargs = {
                'vector': vector,
                'top_k': top_k,
                'include_metadata': include_metadata,
            }
            if namespace:
                kwargs['namespace'] = namespace
            if filter_expr:
                kwargs['filter'] = filter_expr

            try:
                results = index.query(**kwargs)
            except Exception:
                continue

            for match in results.get('matches', []):
                item_id = match.get('id')
                if not item_id or item_id in seen:
                    continue
                seen.add(item_id)
                merged.append(match)

        merged.sort(key=lambda m: float(m.get('score', 0.0)), reverse=True)
        return merged[:top_k]

    for mode, filter_expr in strategy:
        matches = _run(filter_expr)
        if matches:
            return matches, mode

    return [], 'no_matches'


def generate_fire_response(user_query, ranking, intake_summary):
    resources = ranking.get('top_resources', []) if isinstance(ranking, dict) else []
    if not resources:
        return (
            'I could not find strong matching recovery resources yet. '
            'Try adding your county/state, urgency level, or whether you need shelter, rent support, or insurance help.'
        )

    if not client:
        return 'Here are the most relevant recovery resources I found: ' + ', '.join(
            [r.get('title') or r.get('id') for r in resources]
        )

    prompt = (
        'You are a wildfire recovery assistant. Answer the user using only the retrieved resources and intake summary. '
        'Prioritize housing guidance first when the user asks about housing. '
        'Use a balanced tone: recommend one best next action and include alternatives. Mention uncertainty if context is weak.\n\n'
        'Format your response with exactly these four headings:\n'
        '1) Immediate Actions\n'
        '2) Move Decision\n'
        '3) Return Timeline\n'
        '4) Why This Recommendation\n\n'
        'For Move Decision, include an estimated move distance range (for example: 10-25 miles, 30-60 miles) when risk is elevated. '
        'For Return Timeline, include a months estimate based on retrieved context. '
        'When recurrence risk is high or recurrence years < 3, explicitly mention risk of re-fire.\n\n'
        f'User query: {user_query}\n\n'
        f'Intake summary: {json.dumps(intake_summary, ensure_ascii=True)}\n\n'
        f'Retrieval mode: {ranking.get("retrieval_mode", "unknown")}\n\n'
        f'Retrieved resources: {json.dumps(resources, ensure_ascii=True)}'
    )

    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{'role': 'user', 'content': prompt}],
            temperature=0.2,
        )
        content = (completion.choices[0].message.content or '').strip()
        if content:
            return content
    except Exception as e:
        print(f'Error generating Groq response: {e}')

    return 'Here are the most relevant recovery resources I found: ' + ', '.join(
        [r.get('title') or r.get('id') for r in resources]
    )


def index_fire_resources(collection='wildfire_resources', index_name=None):
    index = _get_index(index_name)
    docs = db.collection(collection).get()

    for resource_doc in docs:
        resource = resource_doc.to_dict() or {}
        resource_id = resource_doc.id

        fire_radius = _safe_float(resource.get('fire_radius_miles', resource.get('radius_miles')), default=0.0)
        severity = _safe_float(resource.get('severity_score', resource.get('severity')), default=0.0)

        score_text = (
            f"Title: {resource.get('title', '')}, "
            f"Summary: {resource.get('summary', '')}, "
            f"Category: {resource.get('category', '')}, "
            f"Fire Radius Miles: {fire_radius}, "
            f"Severity Score: {severity}, "
            f"County: {resource.get('county', '')}, "
            f"State: {resource.get('state', '')}, "
            f"Recovery Phase: {resource.get('recovery_phase', '')}"
        )

        embedding = _embed_text(score_text)
        index.upsert(
            vectors=[
                {
                    'id': resource_id,
                    'values': embedding,
                    'metadata': {
                        'title': resource.get('title', ''),
                        'summary': resource.get('summary', ''),
                        'category': resource.get('category', ''),
                        'fire_radius_miles': fire_radius,
                        'severity_score': severity,
                        'county': resource.get('county', ''),
                        'state': resource.get('state', ''),
                        'zip_code': resource.get('zip_code', ''),
                        'incidents_5yr': resource.get('incidents_5yr'),
                        'avg_recurrence_years': resource.get('avg_recurrence_years'),
                        'risk_category': resource.get('risk_category', ''),
                        'return_timeline_months': resource.get('return_timeline_months'),
                        'recovery_phase': resource.get('recovery_phase', ''),
                        'score_summary': score_text,
                    },
                }
            ]
        )


def rank_fire_resources(
    user_query,
    fire_radius_miles=None,
    severity_score=None,
    state=None,
    county=None,
    zip_code=None,
    max_retries=2,
    index_name=None,
):
    if not user_query:
        raise ValueError('query is required')

    index = _get_index(index_name)
    query_embedding = _embed_text(user_query)
    normalized_state = _normalize_state(state)
    normalized_county = _normalize_county(county)
    normalized_zip_code = _normalize_zip(zip_code)
    matches, retrieval_mode = _query_matches_with_location_fallback(
        index=index,
        vector=query_embedding,
        top_k=12,
        include_metadata=True,
        state=normalized_state,
        county=normalized_county,
    )

    context_entries = []
    valid_ids = []
    top_resources = []
    all_ids = []
    all_resources = []
    for match in matches:
        meta = match.get('metadata', {}) or {}
        item_id = match.get('id')
        if not item_id:
            continue

        item_radius = _safe_float(meta.get('fire_radius_miles'), default=None)
        item_severity = _safe_float(meta.get('severity_score'), default=None)

        all_ids.append(item_id)
        all_resources.append(
            {
                'id': item_id,
                'title': meta.get('title', ''),
                'summary': meta.get('summary', ''),
                'category': meta.get('category', ''),
                'fire_radius_miles': item_radius,
                'severity_score': item_severity,
                'county': meta.get('county', ''),
                'state': meta.get('state', ''),
                'zip_code': meta.get('zip_code', ''),
                'incidents_5yr': meta.get('incidents_5yr'),
                'avg_recurrence_years': meta.get('avg_recurrence_years'),
                'risk_category': meta.get('risk_category', ''),
                'return_timeline_months': meta.get('return_timeline_months'),
                'recovery_phase': meta.get('recovery_phase', ''),
            }
        )

        if normalized_county and meta.get('county'):
            if _normalize_county(meta.get('county')) != normalized_county:
                continue
        if normalized_state and meta.get('state'):
            if _normalize_state(meta.get('state')) != normalized_state:
                continue
        if normalized_zip_code and meta.get('zip_code'):
            if _normalize_zip(meta.get('zip_code')) != normalized_zip_code:
                continue
        if fire_radius_miles is not None and item_radius is not None and item_radius > float(fire_radius_miles):
            continue
        if severity_score is not None and item_severity is not None and item_severity < float(severity_score):
            continue

        valid_ids.append(item_id)
        top_resources.append(
            {
                'id': item_id,
                'title': meta.get('title', ''),
                'summary': meta.get('summary', ''),
                'category': meta.get('category', ''),
                'fire_radius_miles': item_radius,
                'severity_score': item_severity,
                'county': meta.get('county', ''),
                'state': meta.get('state', ''),
                'zip_code': meta.get('zip_code', ''),
                'incidents_5yr': meta.get('incidents_5yr'),
                'avg_recurrence_years': meta.get('avg_recurrence_years'),
                'risk_category': meta.get('risk_category', ''),
                'return_timeline_months': meta.get('return_timeline_months'),
                'recovery_phase': meta.get('recovery_phase', ''),
            }
        )
        context_entries.append(
            json.dumps(
                {
                    'id': item_id,
                    'title': meta.get('title', ''),
                    'summary': meta.get('summary', ''),
                    'category': meta.get('category', ''),
                    'fire_radius_miles': item_radius,
                    'severity_score': item_severity,
                    'county': meta.get('county', ''),
                    'state': meta.get('state', ''),
                    'zip_code': meta.get('zip_code', ''),
                    'incidents_5yr': meta.get('incidents_5yr'),
                    'avg_recurrence_years': meta.get('avg_recurrence_years'),
                    'risk_category': meta.get('risk_category', ''),
                    'return_timeline_months': meta.get('return_timeline_months'),
                    'recovery_phase': meta.get('recovery_phase', ''),
                }
            )
        )

    constraints_applied = fire_radius_miles is not None or severity_score is not None
    location_constraints_applied = bool(normalized_county or normalized_state or normalized_zip_code)
    constraint_relaxed = False
    if (constraints_applied or location_constraints_applied) and not valid_ids and all_ids:
        # If intake constraints over-filter everything, fall back to top semantic matches.
        constraint_relaxed = True
        valid_ids = all_ids[:5]
        top_resources = all_resources[:5]
        context_entries = [
            json.dumps(
                {
                    'id': r.get('id', ''),
                    'title': r.get('title', ''),
                    'summary': r.get('summary', ''),
                    'category': r.get('category', ''),
                    'fire_radius_miles': r.get('fire_radius_miles'),
                    'severity_score': r.get('severity_score'),
                    'county': r.get('county', ''),
                    'state': r.get('state', ''),
                    'zip_code': r.get('zip_code', ''),
                    'incidents_5yr': r.get('incidents_5yr'),
                    'avg_recurrence_years': r.get('avg_recurrence_years'),
                    'risk_category': r.get('risk_category', ''),
                    'return_timeline_months': r.get('return_timeline_months'),
                    'recovery_phase': r.get('recovery_phase', ''),
                }
            )
            for r in top_resources
        ]

    context = '[\n' + ',\n'.join(context_entries) + '\n]'

    # If Groq is unavailable, keep Pinecone similarity order as a deterministic fallback.
    if not client:
        if valid_ids:
            return {
                'sorted_ids': valid_ids,
                'rerank_source': 'pinecone_similarity',
                'groq_enabled': False,
                'retrieval_mode': retrieval_mode,
                'top_resources': top_resources[:3],
                'constraint_relaxed': constraint_relaxed,
            }
        return {
            'sorted_ids': [],
            'groq_enabled': False,
            'rerank_source': 'no_matches',
            'retrieval_mode': retrieval_mode,
            'top_resources': [],
        }

    sys_prompt = f"""
You are an assistant ranking wildfire recovery resources.
Given the resources below, return IDs sorted from best to worst for the user's request.
Prioritize resources that are relevant to the request, within fire radius constraints, and with matching severity urgency.

Context:
{context}

ONLY return a single line of raw JSON - no markdown, no explanation, no commentary.
Format:
{{ "sorted_ids": ["id1", "id2", ...] }}

Use the exact resource IDs provided. Do not invent or rename them.
"""

    for _ in range(max_retries):
        chat_response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {'role': 'system', 'content': sys_prompt},
                {'role': 'user', 'content': user_query},
            ],
            tools=[
                {
                    'type': 'function',
                    'function': {
                        'name': 'rank_fire_resources',
                        'description': 'Sort wildfire resource IDs from best to worst based on user query, fire radius, and severity.',
                        'parameters': {
                            'type': 'object',
                            'properties': {
                                'sorted_ids': {
                                    'type': 'array',
                                    'items': {'type': 'string'},
                                    'description': 'Wildfire resource IDs sorted from best to worst',
                                }
                            },
                            'required': ['sorted_ids'],
                        },
                    },
                }
            ],
            tool_choice={'type': 'function', 'function': {'name': 'rank_fire_resources'}},
        )

        tool_calls = chat_response.choices[0].message.tool_calls or []
        if tool_calls:
            tool_args = json.loads(tool_calls[0].function.arguments)
            sorted_ids = tool_args.get('sorted_ids', [])
            filtered = [item_id for item_id in sorted_ids if item_id in valid_ids]
            if filtered:
                return {
                    'sorted_ids': filtered,
                    'rerank_source': 'groq_tool_call',
                    'groq_enabled': True,
                    'retrieval_mode': retrieval_mode,
                    'top_resources': [r for r in top_resources if r.get('id') in filtered][:3],
                    'constraint_relaxed': constraint_relaxed,
                }

        response_content = (chat_response.choices[0].message.content or '').strip()
        response_json = extract_json(response_content)
        if 'sorted_ids' in response_json:
            sorted_ids = response_json.get('sorted_ids', [])
            filtered = [item_id for item_id in sorted_ids if item_id in valid_ids]
            if filtered:
                return {
                    'sorted_ids': filtered,
                    'rerank_source': 'groq_json',
                    'groq_enabled': True,
                    'retrieval_mode': retrieval_mode,
                    'top_resources': [r for r in top_resources if r.get('id') in filtered][:3],
                    'constraint_relaxed': constraint_relaxed,
                }

    if valid_ids:
        return {
            'sorted_ids': valid_ids,
            'rerank_source': 'pinecone_similarity_fallback',
            'groq_enabled': bool(client),
            'retrieval_mode': retrieval_mode,
            'top_resources': top_resources[:3],
            'constraint_relaxed': constraint_relaxed,
        }
    return {
        'sorted_ids': [],
        'groq_enabled': bool(client),
        'rerank_source': 'no_matches',
        'retrieval_mode': retrieval_mode,
        'top_resources': [],
    }


@chatbot_bp.route('/rank_resources', methods=['GET'])
def rank_resources_route():
    try:
        query = request.args.get('query')
        fire_radius_miles = request.args.get('fire_radius_miles')
        severity_score = request.args.get('severity_score')

        result = rank_fire_resources(
            user_query=query,
            fire_radius_miles=_safe_float(fire_radius_miles, default=None),
            severity_score=_safe_float(severity_score, default=None),
            state=request.args.get('state'),
            county=request.args.get('county'),
            zip_code=request.args.get('zip_code'),
            index_name=request.args.get('indexName') or INDEX_NAME,
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@chatbot_bp.route('/chat', methods=['POST', 'OPTIONS'])
def send_chat_message():
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id, auth_error = get_user_id()
        if auth_error:
            return auth_error

        payload = request.get_json(silent=True) or {}
        message = (payload.get('message') or '').strip()
        context = payload.get('context') or {}
        conversation_id = payload.get('conversationId') or str(uuid4())

        if not message:
            return jsonify({'error': 'Message is required'}), 400

        fire_radius_miles, severity_score = _resolve_intake_constraints(payload, context)
        state, county, zip_code = _resolve_location_constraints(payload, context)

        ranking = rank_fire_resources(
            user_query=message,
            fire_radius_miles=fire_radius_miles,
            severity_score=severity_score,
            state=state,
            county=county,
            zip_code=zip_code,
            index_name=payload.get('indexName') or INDEX_NAME,
        )
        intake_summary = _build_intake_summary(context)
        intake_summary.update({
            'state': state or intake_summary.get('state', ''),
            'county': county or intake_summary.get('county', ''),
            'zip_code': zip_code or intake_summary.get('zip_code', ''),
        })
        assistant_text = generate_fire_response(message, ranking, intake_summary)

        key = f'{user_id}:{conversation_id}'
        conversation = _conversation_store.get(key, [])

        user_message = {
            'id': f'user-{uuid4()}',
            'role': 'user',
            'content': message,
        }
        assistant_message = {
            'id': f'assistant-{uuid4()}',
            'role': 'assistant',
            'content': assistant_text,
        }

        conversation.append(user_message)
        conversation.append(assistant_message)
        _conversation_store[key] = conversation

        return jsonify({
            'conversationId': conversation_id,
            'reply': assistant_message,
            'messages': conversation,
            'meta': {
                'mode': 'wildfire_ranked_retrieval',
                'contextReceived': isinstance(context, dict),
                'fire_radius_miles': fire_radius_miles,
                'severity_score': severity_score,
                'state': state,
                'county': county,
                'zip_code': zip_code,
                'ranking': ranking,
            },
        }), 200

    except Exception as e:
        print(f'Error in send_chat_message: {e}')
        return jsonify({'error': str(e)}), 500


@chatbot_bp.route('/chat/history/<conversation_id>', methods=['GET', 'OPTIONS'])
def get_chat_history(conversation_id):
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id, auth_error = get_user_id()
        if auth_error:
            return auth_error

        key = f'{user_id}:{conversation_id}'
        messages = _conversation_store.get(key, [])

        return jsonify({
            'conversationId': conversation_id,
            'messages': messages,
        }), 200

    except Exception as e:
        print(f'Error in get_chat_history: {e}')
        return jsonify({'error': str(e)}), 500
