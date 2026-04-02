import json
import os
from dotenv import load_dotenv


def load_env() -> bool:
    secret_id = (os.getenv('AWS_SECRETS_MANAGER_SECRET_ID') or '').strip()
    region = (os.getenv('AWS_REGION') or os.getenv('AWS_DEFAULT_REGION') or '').strip()

    if not secret_id or not region:
        print('secrets.py: using local .env (missing AWS_SECRETS_MANAGER_SECRET_ID or region)')
        load_dotenv()
        return False

    try:
        import boto3
    except ImportError:
        print('secrets.py: using local .env (boto3 not available)')
        load_dotenv()
        return False

    try:
        client = boto3.client('secretsmanager', region_name=region)
        response = client.get_secret_value(SecretId=secret_id)
        secret_str = response.get('SecretString')
        if not secret_str:
            print('secrets.py: using local .env (secret string is empty)')
            load_dotenv()
            return False

        payload = json.loads(secret_str)
        if not isinstance(payload, dict):
            print('secrets.py: using local .env (secret payload is not a JSON object)')
            load_dotenv()
            return False

        for key, value in payload.items():
            key_str = str(key)
            current_value = os.getenv(key_str)
            if key_str and (current_value is None or current_value == ''):
                os.environ[key_str] = str(value)
        return True
    except Exception as exc:
        print(f'secrets.py: using local .env (AWS secret load failed: {exc})')
        load_dotenv()
        return False
