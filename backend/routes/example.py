from flask import Blueprint, request, jsonify
from firebase_init import db
from .structs import Example

example_bp = Blueprint('example', __name__, url_prefix='/example')

def get_example():
    docs = db.collection('example').get()
    doc = docs[0] if docs else None
    if doc.exists:
        data = doc.to_dict()
        data['id'] = doc.id
        example = Example(**data)
        example.validate()
        return jsonify(example.to_dict()), 200
    else:
        return jsonify(error="Document not found"), 404

@example_bp.route('', methods=['GET', 'OPTIONS'])
def handle_example_options():
    if request.method == 'OPTIONS':
        response = jsonify()
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        return response, 200
    match request.method:
        case 'GET':
            return get_example()
        case _:
            return jsonify(error="Method not allowed"), 405