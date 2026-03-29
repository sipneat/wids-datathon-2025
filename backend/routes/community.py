from flask import Blueprint, request, jsonify
from firebase_admin import firestore

from firebase_init import db
from routes.intake import get_user_id
from routes.structs import (
    CommunityPostCreateRequest,
    CommunityPostRecord,
    CommunityReplyCreateRequest,
    CommunityReplyRecord,
    serialize_document,
)

community_bp = Blueprint('community', __name__, url_prefix='')


def _normalize_filter(value, skip_values=None):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if skip_values and text in skip_values:
        return None
    return text


def _get_replies(post_id):
    replies_ref = (
        db.collection('communityPosts')
        .document(post_id)
        .collection('replies')
        .order_by('createdAt', direction=firestore.Query.ASCENDING)
        .limit(200)
    )
    replies = []
    for reply_doc in replies_ref.stream():
        reply = reply_doc.to_dict()
        reply['id'] = reply_doc.id
        replies.append(reply)
    return replies


@community_bp.route('/community/posts', methods=['GET', 'OPTIONS'])
def get_posts():
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id, auth_error = get_user_id()
        if auth_error:
            return auth_error

        region = _normalize_filter(request.args.get('region'), skip_values={'All Regions'})
        thread = _normalize_filter(request.args.get('thread'), skip_values={'general'})

        query = db.collection('communityPosts')
        if region:
            query = query.where('region', '==', region)
        if thread:
            query = query.where('thread', '==', thread)
        query = query.order_by('createdAt', direction=firestore.Query.DESCENDING).limit(200)

        posts = []
        for doc in query.stream():
            post = doc.to_dict()
            post['id'] = doc.id
            post['replies'] = _get_replies(doc.id)
            posts.append(post)

        return jsonify({'posts': serialize_document(posts)}), 200
    except Exception as e:
        print(f"Error in get_posts: {e}")
        return jsonify({'error': str(e)}), 500


@community_bp.route('/community/posts', methods=['POST', 'OPTIONS'])
def create_post():
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id, auth_error = get_user_id()
        if auth_error:
            return auth_error

        post_request = CommunityPostCreateRequest.from_payload(request.json)
        post_record = CommunityPostRecord.from_request(user_id, post_request)

        post_ref = db.collection('communityPosts').document()
        post_ref.set(post_record.to_firestore())

        response_post = post_record.to_firestore()
        response_post['id'] = post_ref.id
        response_post['replies'] = []

        return jsonify({'post': serialize_document(response_post)}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"Error in create_post: {e}")
        return jsonify({'error': str(e)}), 500


@community_bp.route('/community/posts/<post_id>/replies', methods=['POST', 'OPTIONS'])
def create_reply(post_id):
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id, auth_error = get_user_id()
        if auth_error:
            return auth_error

        post_ref = db.collection('communityPosts').document(post_id)
        if not post_ref.get().exists:
            return jsonify({'error': 'Post not found'}), 404

        reply_request = CommunityReplyCreateRequest.from_payload(request.json)
        reply_record = CommunityReplyRecord.from_request(user_id, reply_request)

        reply_ref = post_ref.collection('replies').document()
        reply_ref.set(reply_record.to_firestore())

        response_reply = reply_record.to_firestore()
        response_reply['id'] = reply_ref.id
        return jsonify({'reply': serialize_document(response_reply)}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"Error in create_reply: {e}")
        return jsonify({'error': str(e)}), 500


@community_bp.route('/community/posts/<post_id>', methods=['DELETE', 'OPTIONS'])
def delete_post(post_id):
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id, auth_error = get_user_id()
        if auth_error:
            return auth_error

        post_ref = db.collection('communityPosts').document(post_id)
        post_doc = post_ref.get()
        if not post_doc.exists:
            return jsonify({'error': 'Post not found'}), 404

        post_data = post_doc.to_dict() or {}
        if post_data.get('userId') != user_id:
            return jsonify({'error': 'Unauthorized access'}), 403

        replies_ref = post_ref.collection('replies')
        replies = list(replies_ref.stream())
        batch = db.batch()
        for reply_doc in replies:
            batch.delete(reply_doc.reference)
        batch.delete(post_ref)
        batch.commit()

        return jsonify({'success': True}), 200
    except Exception as e:
        print(f"Error in delete_post: {e}")
        return jsonify({'error': str(e)}), 500


@community_bp.route('/community/posts/<post_id>/replies/<reply_id>', methods=['DELETE', 'OPTIONS'])
def delete_reply(post_id, reply_id):
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id, auth_error = get_user_id()
        if auth_error:
            return auth_error

        post_ref = db.collection('communityPosts').document(post_id)
        if not post_ref.get().exists:
            return jsonify({'error': 'Post not found'}), 404

        reply_ref = post_ref.collection('replies').document(reply_id)
        reply_doc = reply_ref.get()
        if not reply_doc.exists:
            return jsonify({'error': 'Reply not found'}), 404

        reply_data = reply_doc.to_dict() or {}
        if reply_data.get('userId') != user_id:
            return jsonify({'error': 'Unauthorized access'}), 403

        reply_ref.delete()
        return jsonify({'success': True}), 200
    except Exception as e:
        print(f"Error in delete_reply: {e}")
        return jsonify({'error': str(e)}), 500
