import asyncio
from firebase_admin import messaging 

async def send_push_notification(tokens, title, body):
    print(f"[push] title={title!r}, body={body!r} tokens={tokens}")
    if not tokens:
        return 
    message = messaging.MulticastMessage(
        notification=messaging.Notification(title=title, body=body),
        tokens=tokens,
    )
    return await asyncio.to_thread(messaging.send_each_for_multicast, message)