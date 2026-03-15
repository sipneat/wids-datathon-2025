from uuid import uuid4

from flask import Blueprint, jsonify, request


chatbot_bp = Blueprint('chatbot', __name__, url_prefix='')
USER_ID_HEADER = 'X-User-Id'

# In-memory conversation storage for scaffolding.
# Replace with Firestore/persistent storage when model integration is ready.
_conversation_store = {}

PLACEHOLDER_RESPONSE = (
	'Placeholder response: your model endpoint is not connected yet. '
	'Next we can wire this to your backend AI route and return grounded '
	'recommendations based on intake profile, insurance context, and local resource data.'
)


def get_user_id():
	user_id = request.headers.get(USER_ID_HEADER)
	if not user_id:
		return None, (jsonify({'error': f'Missing {USER_ID_HEADER} header'}), 400)
	return user_id, None


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
			'content': PLACEHOLDER_RESPONSE,
		}

		conversation.append(user_message)
		conversation.append(assistant_message)
		_conversation_store[key] = conversation

		return jsonify({
			'conversationId': conversation_id,
			'reply': assistant_message,
			'messages': conversation,
			'meta': {
				'mode': 'placeholder',
				'contextReceived': isinstance(context, dict),
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
