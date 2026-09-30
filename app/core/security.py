from fastapi import Header, HTTPException, status
from firebase_admin import auth as firebase_auth

async def get_current_user(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token in Authorization header",
        )
    
    token = authorization.split(" ")[1]
    try:
        decoded_token = firebase_auth.verify_id_token(authorization.removeprefix("Bearer ").strip())
        return decoded_token['uid']
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )