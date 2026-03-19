from flask import Blueprint, request, jsonify
from firebase_init import db
from routes.structs import (
    IntakeSubmitRequest,
    IntakeRecord,
    UserProfileRecord,
    ActionStatusUpdateRequest,
    ActionStatusRecord,
    IntakeSubmitResponse,
    ActionStatusUpdateResponse,
    serialize_document,
)

intake_bp = Blueprint('intake', __name__, url_prefix='')
USER_ID_HEADER = 'X-User-Id'

def get_user_id():
    user_id = request.headers.get(USER_ID_HEADER)
    if not user_id:
        return None, (jsonify({'error': f'Missing {USER_ID_HEADER} header'}), 400)
    return user_id, None

def ensure_same_user(request_user_id, user_id):
    if request_user_id != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403
    return None


@intake_bp.route('/intake/submit', methods=['POST', 'OPTIONS'])
def submit_intake():
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id, auth_error = get_user_id()
        if auth_error:
            return auth_error

        intake_request = IntakeSubmitRequest.from_payload(request.json)
        intake_ref = db.collection('intakeResponses').document()
        intake_data = IntakeRecord.from_submit_request(user_id, intake_request)
        intake_ref.set(intake_data.to_firestore())

        user_ref = db.collection('users').document(user_id)
        profile_data = UserProfileRecord.from_submit_request(intake_request)
        user_ref.set(profile_data.data, merge=True)

        response = IntakeSubmitResponse(
            success=True,
            message='Intake responses saved successfully',
            intakeId=intake_ref.id,
            userId=user_id,
        )
        return jsonify(response.to_dict()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
        
    except Exception as e:
        print(f"Error in submit_intake: {e}")
        return jsonify({'error': str(e)}), 500

@intake_bp.route('/user/profile', methods=['GET', 'OPTIONS'])
def get_user_profile():
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id, auth_error = get_user_id()
        if auth_error:
            return auth_error

        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User profile not found'}), 404

        return jsonify(serialize_document(user_doc.to_dict())), 200
        
    except Exception as e:
        print(f"Error in get_user_profile: {e}")
        return jsonify({'error': str(e)}), 500

@intake_bp.route('/user/intake', methods=['GET', 'OPTIONS'])
def get_user_intake():
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id, auth_error = get_user_id()
        if auth_error:
            return auth_error

        intake_query = db.collection('intakeResponses').where('userId', '==', user_id)
        intake_docs = list(intake_query.stream())
        
        if not intake_docs:
            return jsonify({'responses': {}, 'submittedAt': None}), 200

        sorted_docs = sorted(intake_docs, key=lambda x: x.to_dict().get('submittedAt', ''), reverse=True)
        latest_intake = sorted_docs[0].to_dict()
        return jsonify(serialize_document(latest_intake)), 200
        
    except Exception as e:
        print(f"Error in get_user_intake: {e}")
        return jsonify({'error': str(e)}), 500

@intake_bp.route('/user/actions', methods=['POST', 'OPTIONS'])
def update_action_status():
    if request.method == 'OPTIONS':
        return '', 204
    """Update user action status"""
    try:
        user_id, auth_error = get_user_id()
        if auth_error:
            return auth_error

        action_request = ActionStatusUpdateRequest.from_payload(request.json)
        user_error = ensure_same_user(action_request.userId, user_id)
        if user_error:
            return user_error

        action_ref = db.collection('userActions').document(f"{user_id}_{action_request.actionId}")
        action_data = ActionStatusRecord.from_update_request(action_request)
        action_ref.set(action_data.to_firestore(), merge=True)

        response = ActionStatusUpdateResponse(
            success=True,
            message='Action status updated successfully',
            actionId=action_request.actionId,
            status=action_request.status,
        )
        return jsonify(response.to_dict()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
        
    except Exception as e:
        print(f"Error in update_action_status: {e}")
        return jsonify({'error': str(e)}), 500

@intake_bp.route('/user/actions/<user_id>', methods=['GET', 'OPTIONS'])
def get_user_actions(user_id):
    if request.method == 'OPTIONS':
        return '', 204
    """Get user's action statuses"""
    try:
        user_id, auth_error = get_user_id()
        if auth_error:
            return auth_error

        user_error = ensure_same_user(user_id, user_id)
        if user_error:
            return user_error

        actions_query = db.collection('userActions').where('userId', '==', user_id)
        actions_docs = actions_query.get()
        
        actions = {}
        for doc in actions_docs:
            action_data = doc.to_dict()
            action_id = action_data.get('actionId')
            if action_id:
                actions[action_id] = serialize_document(action_data)
        
        return jsonify({'actions': actions}), 200
        
    except Exception as e:
        print(f"Error in get_user_actions: {e}")
        return jsonify({'error': str(e)}), 500
