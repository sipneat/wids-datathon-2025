from flask import Blueprint, request, jsonify
from firebase_init import db
from firebase_admin import auth as admin_auth
from datetime import datetime

intake_bp = Blueprint('intake', __name__)

def verify_firebase_token(id_token):
    """Verify Firebase ID token and return user info"""
    try:
        decoded_token = admin_auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None

@intake_bp.route('/intake/submit', methods=['POST', 'OPTIONS'])
def submit_intake():
    if request.method == 'OPTIONS':
        return '', 204
    """Submit intake form responses and user profile"""
    try:
        # Verify authentication
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        id_token = auth_header.split('Bearer ')[1]
        decoded_token = verify_firebase_token(id_token)
        
        if not decoded_token:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        user_id = decoded_token['uid']
        
        # Get request data
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Save intake responses to Firestore
        intake_ref = db.collection('intakeResponses').document()
        intake_data = {
            'userId': user_id,
            'email': data.get('email'),
            'displayName': data.get('displayName'),
            'photoURL': data.get('photoURL'),
            'responses': data.get('responses', {}),
            'submittedAt': datetime.utcnow(),
            'createdAt': data.get('submittedAt', datetime.utcnow().isoformat())
        }
        intake_ref.set(intake_data)
        
        # Save/update user profile
        user_ref = db.collection('users').document(user_id)
        profile_data = {
            **data.get('profile', {}),
            'email': data.get('email'),
            'displayName': data.get('displayName'),
            'photoURL': data.get('photoURL'),
            'updatedAt': datetime.utcnow()
        }
        user_ref.set(profile_data, merge=True)
        
        return jsonify({
            'success': True,
            'message': 'Intake responses saved successfully',
            'intakeId': intake_ref.id,
            'userId': user_id
        }), 200
        
    except Exception as e:
        print(f"Error in submit_intake: {e}")
        return jsonify({'error': str(e)}), 500

@intake_bp.route('/user/profile/<user_id>', methods=['GET', 'OPTIONS'])
def get_user_profile(user_id):
    if request.method == 'OPTIONS':
        return '', 204
    """Get user profile by user ID"""
    try:
        # Verify authentication
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        id_token = auth_header.split('Bearer ')[1]
        decoded_token = verify_firebase_token(id_token)
        
        if not decoded_token:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        # Verify user can only access their own profile
        if decoded_token['uid'] != user_id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        # Get user profile from Firestore
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User profile not found'}), 404
        
        profile = user_doc.to_dict()
        
        # Convert datetime objects to ISO format
        if 'updatedAt' in profile:
            profile['updatedAt'] = profile['updatedAt'].isoformat() if hasattr(profile['updatedAt'], 'isoformat') else str(profile['updatedAt'])
        if 'completedAt' in profile:
            profile['completedAt'] = profile['completedAt'] if isinstance(profile['completedAt'], str) else profile['completedAt'].isoformat()
        
        return jsonify(profile), 200
        
    except Exception as e:
        print(f"Error in get_user_profile: {e}")
        return jsonify({'error': str(e)}), 500

@intake_bp.route('/user/intake/<user_id>', methods=['GET', 'OPTIONS'])
def get_user_intake(user_id):
    if request.method == 'OPTIONS':
        return '', 204
    """Get user's intake responses"""
    try:
        # Verify authentication
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        id_token = auth_header.split('Bearer ')[1]
        decoded_token = verify_firebase_token(id_token)
        
        if not decoded_token:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        # Verify user can only access their own data
        if decoded_token['uid'] != user_id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        # Get intake responses from Firestore
        # Note: Using where() without order_by to avoid needing a composite index
        intake_query = db.collection('intakeResponses').where('userId', '==', user_id)
        intake_docs = list(intake_query.stream())
        
        if not intake_docs:
            return jsonify({'responses': {}, 'submittedAt': None}), 200
        
        # Sort by submittedAt manually to get the most recent
        sorted_docs = sorted(intake_docs, key=lambda x: x.to_dict().get('submittedAt', ''), reverse=True)
        latest_intake = sorted_docs[0].to_dict()
        
        # Convert datetime to ISO format
        if 'submittedAt' in latest_intake:
            latest_intake['submittedAt'] = latest_intake['submittedAt'].isoformat() if hasattr(latest_intake['submittedAt'], 'isoformat') else str(latest_intake['submittedAt'])
        if 'createdAt' in latest_intake:
            latest_intake['createdAt'] = latest_intake['createdAt'] if isinstance(latest_intake['createdAt'], str) else latest_intake['createdAt'].isoformat()
        
        return jsonify(latest_intake), 200
        
    except Exception as e:
        print(f"Error in get_user_intake: {e}")
        return jsonify({'error': str(e)}), 500

@intake_bp.route('/user/actions', methods=['POST', 'OPTIONS'])
def update_action_status():
    if request.method == 'OPTIONS':
        return '', 204
    """Update user action status"""
    try:
        # Verify authentication
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        id_token = auth_header.split('Bearer ')[1]
        decoded_token = verify_firebase_token(id_token)
        
        if not decoded_token:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        user_id = decoded_token['uid']
        
        # Get request data
        data = request.json
        if not data or 'actionId' not in data or 'status' not in data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Verify user can only update their own actions
        if data.get('userId') != user_id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        action_id = data['actionId']
        
        # Save/update action status
        action_ref = db.collection('userActions').document(f"{user_id}_{action_id}")
        action_data = {
            'userId': user_id,
            'actionId': action_id,
            'status': data['status'],
            'notes': data.get('notes', ''),
            'updatedAt': datetime.utcnow()
        }
        action_ref.set(action_data, merge=True)
        
        return jsonify({
            'success': True,
            'message': 'Action status updated successfully',
            'actionId': action_id,
            'status': data['status']
        }), 200
        
    except Exception as e:
        print(f"Error in update_action_status: {e}")
        return jsonify({'error': str(e)}), 500

@intake_bp.route('/user/actions/<user_id>', methods=['GET', 'OPTIONS'])
def get_user_actions(user_id):
    if request.method == 'OPTIONS':
        return '', 204
    """Get user's action statuses"""
    try:
        # Verify authentication
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        id_token = auth_header.split('Bearer ')[1]
        decoded_token = verify_firebase_token(id_token)
        
        if not decoded_token:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        # Verify user can only access their own data
        if decoded_token['uid'] != user_id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        # Get action statuses from Firestore
        actions_query = db.collection('userActions').where('userId', '==', user_id)
        actions_docs = actions_query.get()
        
        actions = {}
        for doc in actions_docs:
            action_data = doc.to_dict()
            action_id = action_data.get('actionId')
            if action_id:
                # Convert datetime to ISO format
                if 'updatedAt' in action_data:
                    action_data['updatedAt'] = action_data['updatedAt'].isoformat() if hasattr(action_data['updatedAt'], 'isoformat') else str(action_data['updatedAt'])
                actions[action_id] = action_data
        
        return jsonify({'actions': actions}), 200
        
    except Exception as e:
        print(f"Error in get_user_actions: {e}")
        return jsonify({'error': str(e)}), 500
