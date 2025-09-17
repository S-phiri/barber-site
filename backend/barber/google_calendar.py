from django.conf import settings
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import Flow
from .models import GoogleToken

def _creds_from_refresh(refresh_token: str) -> Credentials:
    return Credentials(
        None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=settings.GOOGLE_SCOPES,
    )

def get_service():
    tok = GoogleToken.objects.filter(label="barber").first()
    if not tok:
        raise RuntimeError("Google account not connected. Visit /api/gcal/start-auth.")
    creds = _creds_from_refresh(tok.refresh_token)
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    calendar_id = settings.GOOGLE_CALENDAR_ID or "primary"
    return service, calendar_id

def start_oauth_flow() -> str:
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_OAUTH_REDIRECT_URI],
            }
        },
        scopes=settings.GOOGLE_SCOPES,
    )
    flow.redirect_uri = settings.GOOGLE_OAUTH_REDIRECT_URI
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url

def finish_oauth_flow(code: str):
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_OAUTH_REDIRECT_URI],
            }
        },
        scopes=settings.GOOGLE_SCOPES,
    )
    flow.redirect_uri = settings.GOOGLE_OAUTH_REDIRECT_URI
    flow.fetch_token(code=code)
    creds = flow.credentials
    if not creds.refresh_token:
        raise RuntimeError("No refresh token received; ensure prompt=consent & offline access.")
    GoogleToken.objects.update_or_create(
        label="barber",
        defaults={"refresh_token": creds.refresh_token},
    )

def is_free(start_dt, end_dt) -> bool:
    service, calendar_id = get_service()
    body = {
        "timeMin": start_dt.astimezone().isoformat(),
        "timeMax": end_dt.astimezone().isoformat(),
        "items": [{"id": calendar_id}],
    }
    fb = service.freebusy().query(body=body).execute()
    busy = fb["calendars"][calendar_id]["busy"]
    return len(busy) == 0

def create_event(summary: str, start_dt, end_dt, description: str = "", attendees=None) -> str:
    service, calendar_id = get_service()
    event = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_dt.isoformat()},
        "end": {"dateTime": end_dt.isoformat()},
        "attendees": attendees or [],
    }
    created = service.events().insert(calendarId=calendar_id, body=event).execute()
    return created["id"]

def delete_event(event_id: str) -> None:
    service, calendar_id = get_service()
    service.events().delete(calendarId=calendar_id, eventId=event_id).execute()