import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from routes import blueprints

app = Flask(__name__)
load_dotenv()

# Get allowed origins from environment or use defaults
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    FRONTEND_URL
]

# Configure CORS to allow requests from the frontend
CORS(app, 
     resources={r"/*": {"origins": ALLOWED_ORIGINS}},
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     supports_credentials=True)

@app.route('/', methods=['GET'])
def root():
    routes = ["/api"]
    routes += [bp.url_prefix for bp in blueprints]
    return jsonify(routes=routes), 200

@app.route('/api', methods=['GET'])
def health():
    return jsonify(status="ok"), 200

for bp in blueprints:
    app.register_blueprint(bp, url_prefix=f"/api{bp.url_prefix or ''}")

if __name__ == '__main__':
    PORT = int(os.getenv('PORT', 3000))
    app.run(host='0.0.0.0', port=PORT, debug=True)