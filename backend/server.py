import os
from flask import Flask, jsonify
from flask_cors import CORS

from secrets import load_env
load_env()

from routes import blueprints

app = Flask(__name__)

CORS(app, supports_credentials=True)

@app.route('/', methods=['GET'])
def root():
    output = []
    for rule in app.url_map.iter_rules():
        if rule.endpoint == 'static':
            continue
        methods = ','.join(sorted(rule.methods - {'HEAD', 'OPTIONS'}))
        output.append({
            'endpoint': rule.endpoint,
            'methods': methods,
            'path': str(rule)
        })
    return jsonify(routes=output), 200

@app.route('/api', methods=['GET'])
def health():
    return jsonify(status="ok"), 200

for bp in blueprints:
    app.register_blueprint(bp, url_prefix=f"/api{bp.url_prefix}")

if __name__ == '__main__':
    port = int(os.getenv('PORT', '3000'))
    debug = os.getenv('FLASK_DEBUG', 'true')
    app.run(host='0.0.0.0', port=port, debug=debug)