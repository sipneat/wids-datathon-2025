import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from secrets import load_env

load_env()

FIREBASE_CREDENTIALS_JSON = os.getenv('FIREBASE_CREDENTIALS_JSON', '').strip()
FIREBASE_CRED_PATH = os.getenv('FIREBASE_CRED_PATH', 'serviceAccountKey.json')

if not firebase_admin._apps:
    if FIREBASE_CREDENTIALS_JSON:
        service_account_info = json.loads(FIREBASE_CREDENTIALS_JSON)
        cred = credentials.Certificate(service_account_info)
    else:
        # Local/dev fallback
        cred = credentials.Certificate(FIREBASE_CRED_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()
