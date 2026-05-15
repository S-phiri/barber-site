"""
Google Calendar Integration Service
Handles OAuth 2.0 authentication and calendar event creation
"""

import os
import json
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any
from django.conf import settings
from django.contrib.auth import get_user_model
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

# Must match barber/urls.py google-calendar/callback/ and Google Cloud Console (127.0.0.1, not localhost).
_DEFAULT_REDIRECT_URI = "http://127.0.0.1:8000/api/barber/google-calendar/callback/"


def oauth_redirect_uri() -> str:
    """Single source of truth for OAuth redirect — same value for auth URL and token exchange."""
    uri = getattr(settings, "GOOGLE_REDIRECT_URI", None) or getattr(
        settings, "GOOGLE_OAUTH_REDIRECT_URI", None
    )
    if uri and str(uri).strip():
        return str(uri).strip()
    return _DEFAULT_REDIRECT_URI


class GoogleCalendarService:
    """Service for managing Google Calendar integration"""
    
    # OAuth 2.0 scopes
    SCOPES = ['https://www.googleapis.com/auth/calendar']
    
    def __init__(self):
        self.client_id = getattr(settings, "GOOGLE_CLIENT_ID", None)
        self.client_secret = getattr(settings, "GOOGLE_CLIENT_SECRET", None)
        self.redirect_uri = oauth_redirect_uri()

    def _make_oauth_flow(self) -> Flow:
        """Build Flow with the same redirect_uri used for authorization and callback."""
        redirect_uri = oauth_redirect_uri()
        self.redirect_uri = redirect_uri
        if not self.client_id or not self.client_secret:
            raise ValueError("Google OAuth credentials not configured")
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri],
                }
            },
            scopes=self.SCOPES,
        )
        flow.redirect_uri = redirect_uri
        return flow

    def get_authorization_url(self, barber_id: str) -> str:
        """
        Generate authorization URL for barber to connect their Google Calendar
        
        Args:
            barber_id: ID of the barber
            
        Returns:
            Authorization URL for OAuth flow
        """
        flow = self._make_oauth_flow()
        logger.info("Google OAuth authorization redirect_uri=%s", self.redirect_uri)

        # Add state parameter to identify the barber
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            prompt='consent',
            include_granted_scopes='true',
            state=barber_id
        )
        
        return authorization_url
    
    def exchange_code_for_token(self, code: str, barber_id: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access token
        
        Args:
            code: Authorization code from Google
            barber_id: ID of the barber
            
        Returns:
            Token information
        """
        flow = self._make_oauth_flow()
        logger.info("Google OAuth token exchange redirect_uri=%s", self.redirect_uri)

        try:
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            # Store credentials in database
            self._store_credentials(barber_id, credentials)
            
            return {
                'access_token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'expires_at': credentials.expiry.isoformat() if credentials.expiry else None
            }
            
        except Exception as e:
            logger.error(f"Error exchanging code for token: {e}")
            raise
    
    def _store_credentials(self, barber_id: str, credentials: Credentials):
        """Store Google Calendar OAuth refresh token for a barber (GoogleToken.label == barber id)."""
        from .models import GoogleToken

        label = str(barber_id)
        if len(label) > 64:
            logger.error("GoogleToken.label max_length=64 exceeded for barber_id=%s", barber_id)
            return

        # Prefer incoming refresh_token; Google may omit it on some exchanges — keep stored value.
        existing = GoogleToken.objects.filter(label=label).first()
        new_rt = credentials.refresh_token
        refresh_to_store = (new_rt or (existing.refresh_token if existing else "") or "").strip()
        if not refresh_to_store:
            logger.warning("No refresh_token to store for barber_id=%s", barber_id)
            return

        GoogleToken.objects.update_or_create(
            label=label,
            defaults={"refresh_token": refresh_to_store},
        )
    
    def _get_credentials(self, barber_id: str) -> Optional[Credentials]:
        """Load refresh token via GoogleToken.label (barber UUID); refresh for an access token."""
        from google.auth.transport.requests import Request
        from .models import GoogleToken

        if not self.client_id or not self.client_secret:
            return None

        gt = GoogleToken.objects.filter(label=str(barber_id)).first()
        # Legacy row from before per-barber labels
        if not gt or not (gt.refresh_token or "").strip():
            gt = GoogleToken.objects.filter(label="barber").order_by("-updated_at").first()

        if not gt or not (gt.refresh_token or "").strip():
            return None

        credentials = Credentials(
            token=None,
            refresh_token=gt.refresh_token.strip(),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=self.SCOPES,
        )
        try:
            credentials.refresh(Request())
        except Exception as e:
            logger.warning("Google Calendar token refresh failed for barber %s: %s", barber_id, e)
            return None
        return credentials
    
    def create_calendar_event(self, barber_id: str, booking_data: Dict[str, Any]) -> Optional[str]:
        """
        Create a calendar event for a booking
        
        Args:
            barber_id: ID of the barber
            booking_data: Booking information
            
        Returns:
            Event ID if successful, None otherwise
        """
        credentials = self._get_credentials(barber_id)
        if not credentials:
            logger.warning(f"No Google Calendar credentials found for barber {barber_id}")
            return None
        
        try:
            # Build Google Calendar service
            service = build('calendar', 'v3', credentials=credentials)
            
            # Parse booking data
            start_time = datetime.fromisoformat(booking_data['start_time'].replace('Z', '+00:00'))
            end_time = start_time + timedelta(minutes=booking_data.get('duration_minutes', 60))
            
            # Create event
            event = {
                'summary': f"Booking - {booking_data.get('service_name', 'Haircut')}",
                'description': f"""
Customer: {booking_data.get('customer_name', 'N/A')}
Phone: {booking_data.get('customer_phone', 'N/A')}
Service: {booking_data.get('service_name', 'N/A')}
Notes: {booking_data.get('notes', 'None')}

Booked via BBIT Barbershop
                """.strip(),
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': 'Africa/Johannesburg',  # South African timezone
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': 'Africa/Johannesburg',
                },
                'attendees': [
                    {'email': booking_data.get('customer_email')} if booking_data.get('customer_email') else None
                ],
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},  # 24 hours before
                        {'method': 'popup', 'minutes': 30},       # 30 minutes before
                    ],
                },
            }
            
            # Remove None attendees
            event['attendees'] = [a for a in event['attendees'] if a is not None]
            
            # Create the event
            created_event = service.events().insert(
                calendarId='primary',
                body=event
            ).execute()
            
            logger.info(f"Created Google Calendar event: {created_event['id']}")
            return created_event['id']
            
        except HttpError as e:
            logger.error(f"Google Calendar API error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error creating calendar event: {e}")
            return None
    
    def update_calendar_event(self, barber_id: str, event_id: str, booking_data: Dict[str, Any]) -> bool:
        """
        Update an existing calendar event
        
        Args:
            barber_id: ID of the barber
            event_id: Google Calendar event ID
            booking_data: Updated booking information
            
        Returns:
            True if successful, False otherwise
        """
        credentials = self._get_credentials(barber_id)
        if not credentials:
            return False
        
        try:
            service = build('calendar', 'v3', credentials=credentials)
            
            # Get existing event
            event = service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            # Update event data
            start_time = datetime.fromisoformat(booking_data['start_time'].replace('Z', '+00:00'))
            end_time = start_time + timedelta(minutes=booking_data.get('duration_minutes', 60))
            
            event['summary'] = f"Booking - {booking_data.get('service_name', 'Haircut')}"
            event['description'] = f"""
Customer: {booking_data.get('customer_name', 'N/A')}
Phone: {booking_data.get('customer_phone', 'N/A')}
Service: {booking_data.get('service_name', 'N/A')}
Notes: {booking_data.get('notes', 'None')}

Booked via BBIT Barbershop
            """.strip()
            
            event['start'] = {
                'dateTime': start_time.isoformat(),
                'timeZone': 'Africa/Johannesburg',
            }
            event['end'] = {
                'dateTime': end_time.isoformat(),
                'timeZone': 'Africa/Johannesburg',
            }
            
            # Update the event
            service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event
            ).execute()
            
            logger.info(f"Updated Google Calendar event: {event_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating calendar event: {e}")
            return False
    
    def create_all_day_block_event(self, barber_id: str, block_date: date) -> Optional[str]:
        """
        Create an all-day event on the barber's primary calendar so Google Appointment
        Schedules treat the day as unavailable (same calendar as booking sync).
        """
        credentials = self._get_credentials(barber_id)
        if not credentials:
            logger.warning("No Google Calendar credentials for barber %s (all-day block)", barber_id)
            return None
        end_exclusive = block_date + timedelta(days=1)
        event = {
            "summary": "BLOCKED - Not Available",
            "description": "Shop closed / unavailable — blocked via BBIT dashboard.",
            "start": {"date": block_date.isoformat()},
            "end": {"date": end_exclusive.isoformat()},
        }
        try:
            service = build("calendar", "v3", credentials=credentials)
            created = (
                service.events()
                .insert(calendarId="primary", body=event)
                .execute()
            )
            eid = created.get("id")
            logger.info("Created all-day block event %s for %s", eid, block_date)
            return eid
        except HttpError as e:
            logger.error("Google Calendar all-day block API error: %s", e)
            return None
        except Exception as e:
            logger.error("Error creating all-day block event: %s", e)
            return None

    def delete_calendar_event(self, barber_id: str, event_id: str) -> bool:
        """
        Delete a calendar event
        
        Args:
            barber_id: ID of the barber
            event_id: Google Calendar event ID
            
        Returns:
            True if successful, False otherwise
        """
        credentials = self._get_credentials(barber_id)
        if not credentials:
            return False
        
        try:
            service = build('calendar', 'v3', credentials=credentials)
            
            service.events().delete(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            logger.info(f"Deleted Google Calendar event: {event_id}")
            return True
            
        except HttpError as e:
            status = getattr(e, "status_code", None) or getattr(getattr(e, "resp", None), "status", None)
            if status == 404:
                logger.info("Google Calendar event already removed: %s", event_id)
                return True
            logger.error(f"Error deleting calendar event: {e}")
            return False
        except Exception as e:
            logger.error(f"Error deleting calendar event: {e}")
            return False
    
    def is_barber_connected(self, barber_id: str) -> bool:
        """
        Check if barber has connected their Google Calendar
        
        Args:
            barber_id: ID of the barber
            
        Returns:
            True if connected, False otherwise
        """
        credentials = self._get_credentials(barber_id)
        return credentials is not None