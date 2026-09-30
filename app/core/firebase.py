import firebase_admin
from firebase_admin import credentials, auth
from app.core.config import get_settings

def init_firebase() -> None:
    if firebase_admin._apps:
        return
    settings = get_settings()
    cred = credentials.Certificate(settings.firebase_credentials_path)
    firebase_admin.initialize_app(cred)