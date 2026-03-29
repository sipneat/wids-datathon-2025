import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from firebase_admin import firestore
from flask import Blueprint, jsonify, request
from groq import Groq

from firebase_init import db
from routes.intake import get_user_id
from routes.structs import serialize_document

resources_bp = Blueprint('resources', __name__, url_prefix='')

_ROUTES_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _ROUTES_DIR.parent
_PROJECT_ROOT = _BACKEND_DIR.parent
load_dotenv(_BACKEND_DIR / '.env')
load_dotenv(_PROJECT_ROOT / '.env')

GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_MODEL = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def _extract_json(text):
    if not text:
        return None
    cleaned = re.sub(r'^```(?:json)?|```$', '', text.strip(), flags=re.MULTILINE)
    match = re.search(r'\{[\s\S]*\}', cleaned)
    if not match:
        return None
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return None


def _get_latest_intake(user_id):
    query = db.collection('intakeResponses').where('userId', '==', user_id)
    docs = list(query.stream())
    if not docs:
        return {}
    sorted_docs = sorted(
        docs,
        key=lambda doc: str(doc.to_dict().get('submittedAt', '')),
        reverse=True
    )
    return sorted_docs[0].to_dict() or {}


def _build_financial_fallback(profile, responses):
    insurance_type = profile.get('insuranceType') or profile.get('insurance_type') or 'Not provided'
    claim_status = profile.get('insuranceClaimStatus') or profile.get('insurance_claim_status') or 'Not provided'
    housing_budget = profile.get('housingBudget') or responses.get('housing_budget') or 'Not provided'
    income_change = responses.get('income_change') or 'Not provided'

    return [
        {
            'label': 'Insurance Coverage',
            'value': insurance_type,
            'description': f'Claim status: {claim_status}'
        },
        {
            'label': 'Monthly Housing Budget',
            'value': f'${housing_budget}' if str(housing_budget).isdigit() else str(housing_budget),
            'description': 'Based on your intake responses'
        },
        {
            'label': 'Income Impact',
            'value': income_change,
            'description': 'Used to prioritize financial support options'
        }
    ]


def _display_name(profile):
    return profile.get('name') or profile.get('displayName') or 'you'


def _location_label(profile, responses):
    county = profile.get('county') or responses.get('county')
    state = profile.get('state') or responses.get('state')
    if county and state:
        return f'{county}, {state}'
    if state:
        return state
    return 'your area'


def _fallback_insights(profile, responses):
    name = _display_name(profile)
    location = _location_label(profile, responses)
    insurance_type = profile.get('insuranceType') or profile.get('insurance_type')
    return {
        'insightSource': 'fallback',
        'recoveryTimeline': [
            {
                'label': 'Estimated Return Home Date',
                'value': 'Pending assessment',
                'description': f'Hi {name}, we need updated assessments for {location} to estimate a return window.'
            },
            {
                'label': 'Neighborhood Access',
                'value': 'Status pending',
                'description': f'Access guidance for {location} is still being updated based on inspections.'
            },
            {
                'label': 'Rebuilding Permit Status',
                'value': 'Check local updates',
                'description': f'Check the permitting office serving {location} for rebuild timelines.'
            }
        ],
        'impactAssessment': [
            {
                'label': 'Area Fire Severity',
                'value': profile.get('fireSeverity') or responses.get('fire_severity') or 'Not provided',
                'description': f'Based on what you reported for {location}.'
            },
            {
                'label': 'Historical Fire Risk',
                'value': 'Requires AI analysis',
                'description': f'We will add historical risk analysis for {location} once AI is available.'
            },
            {
                'label': 'Recovery Progress',
                'value': 'Assessment pending',
                'description': f'Local recovery milestones for {location} are still being collected.'
            }
        ],
        'financialInsights': _build_financial_fallback(profile, responses)
    }


def _ensure_financial_insights(data, fallback_financial):
    if not isinstance(data, dict):
        return fallback_financial
    insights = data.get('financialInsights')
    if not isinstance(insights, list) or not insights:
        return fallback_financial
    return insights


def _generate_ai_insights(profile, responses):
    fallback = _fallback_insights(profile, responses)
    if not client:
        return fallback

    safe_profile = serialize_document(profile or {})
    safe_responses = serialize_document(responses or {})

    name = _display_name(profile)
    location = _location_label(profile, responses)
    prompt = (
        'You are a wildfire recovery analyst. Return JSON with three arrays: '
        'recoveryTimeline, impactAssessment, financialInsights. Each array must contain exactly 3 objects '
        'with keys: label, value, description.\n\n'
        f'User display name: {name}\n'
        f'User location: {location}\n'
        f'User profile: {json.dumps(safe_profile, ensure_ascii=True)}\n'
        f'Intake responses: {json.dumps(safe_responses, ensure_ascii=True)}\n\n'
        'Personalize language to the user when possible. '
        'Recovery timeline and impact assessment must be AI-generated using the provided context. '
        'Financial insights must be grounded in the intake and insurance data above.'
    )

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {'role': 'system', 'content': 'Return only JSON.'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.2,
            max_tokens=700
        )
        content = response.choices[0].message.content if response.choices else None
        parsed = _extract_json(content)
        if not parsed:
            return fallback

        parsed['insightSource'] = 'ai'
        parsed['financialInsights'] = _ensure_financial_insights(
            parsed,
            fallback['financialInsights']
        )
        return parsed
    except Exception as e:
        print(f'Error generating AI insights: {e}')
        return fallback


@resources_bp.route('/resources/insights', methods=['GET', 'OPTIONS'])
def get_resource_insights():
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id, auth_error = get_user_id()
        if auth_error:
            return auth_error

        profile_doc = db.collection('users').document(user_id).get()
        profile = profile_doc.to_dict() if profile_doc.exists else {}
        intake = _get_latest_intake(user_id)
        responses = intake.get('responses', {}) if isinstance(intake, dict) else {}

        insights = _generate_ai_insights(profile, responses)
        return jsonify(serialize_document(insights)), 200
    except Exception as e:
        print(f"Error in get_resource_insights: {e}")
        return jsonify({'error': str(e)}), 500
