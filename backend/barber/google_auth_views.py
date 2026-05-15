"""
Google Calendar OAuth views for barber authentication
"""

import os
from urllib.parse import urlencode

from django.http import HttpResponseRedirect
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .google_calendar import GoogleCalendarService
from .models import Barber, GoogleToken
import logging
import traceback

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def google_calendar_auth(request):
    """
    Initiate Google Calendar OAuth flow for barber
    """
    try:
        # Get the barber associated with the authenticated user
        try:
            barber = Barber.objects.get(user=request.user)
        except Barber.DoesNotExist:
            return Response(
                {"error": "No barber profile found for this user"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Initialize Google Calendar service
        calendar_service = GoogleCalendarService()
        
        # Generate authorization URL
        auth_url = calendar_service.get_authorization_url(str(barber.id))
        
        return Response({
            "authorization_url": auth_url,
            "barber_id": str(barber.id)
        })
        
    except Exception as e:
        logger.exception("Error initiating Google Calendar auth: %s", e)
        traceback.print_exc()
        return Response(
            {"error": "Failed to initiate Google Calendar authentication", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def _gcal_frontend_redirect(status: str, message: str):
    frontend_url = "http://localhost:5173/barber-dashboard"
    return HttpResponseRedirect(f"{frontend_url}?gcal={status}&msg={message}")


@api_view(['GET'])
@permission_classes([AllowAny])
def google_calendar_callback(request):
    """
    Handle Google Calendar OAuth callback.
    Unauthenticated: Google redirects here without JWT; barber identity comes from OAuth `state` (barber id).
    """
    query = dict(request.GET)
    logger.info("google_calendar_callback query_params=%s", query)

    oauth_error = request.GET.get("error")
    if oauth_error:
        desc = request.GET.get("error_description") or oauth_error
        logger.warning("Google OAuth returned error=%s desc=%s", oauth_error, desc)
        return _gcal_frontend_redirect("error", str(desc))

    code = request.GET.get("code")
    state = request.GET.get("state")  # barber UUID from auth initiation

    if not code:
        logger.warning("google_calendar_callback missing code (refresh or direct visit?)")
        return _gcal_frontend_redirect(
            "error",
            "Authorization code not provided. Use Connect Google Calendar on the dashboard, then approve in Google.",
        )

    if not state:
        return _gcal_frontend_redirect("error", "State parameter missing.")

    if not Barber.objects.filter(pk=state).exists():
        return _gcal_frontend_redirect("error", "Invalid state: unknown barber.")

    try:
        calendar_service = GoogleCalendarService()
        calendar_service.exchange_code_for_token(code, state)
        logger.info("Google Calendar connected for barber_id=%s", state)
        return _gcal_frontend_redirect("connected", "Google Calendar connected successfully.")
    except Exception as e:
        logger.exception("Error in Google Calendar callback: %s", e)
        traceback.print_exc()
        return _gcal_frontend_redirect("error", str(e))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def google_calendar_status(request):
    """
    Check if barber has connected their Google Calendar
    """
    try:
        # Get the barber associated with the authenticated user
        try:
            barber = Barber.objects.get(user=request.user)
        except Barber.DoesNotExist:
            return Response(
                {"error": "No barber profile found for this user"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        label_key = str(barber.id)
        gt = GoogleToken.objects.filter(label=str(barber.id)).first()
        is_connected = bool(gt and (gt.refresh_token or "").strip())
        logger.info(
            "google_calendar_status barber_id=%s query_field=label query_value=%s "
            "matched_google_token_pk=%s matched_label=%s is_connected=%s",
            label_key,
            label_key,
            getattr(gt, "pk", None),
            getattr(gt, "label", None),
            is_connected,
        )

        return Response({
            "is_connected": is_connected,
            "barber_id": str(barber.id)
        })
        
    except Exception as e:
        logger.exception("Error checking Google Calendar status: %s", e)
        traceback.print_exc()
        return Response(
            {"error": "Failed to check Google Calendar status", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def google_calendar_disconnect(request):
    """
    Disconnect barber's Google Calendar
    """
    try:
        # Get the barber associated with the authenticated user
        try:
            barber = Barber.objects.get(user=request.user)
        except Barber.DoesNotExist:
            return Response(
                {"error": "No barber profile found for this user"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Delete stored Google Calendar credentials
        from .models import GoogleToken
        GoogleToken.objects.filter(label=str(barber.id)).delete()
        
        return Response({
            "success": True,
            "message": "Google Calendar disconnected successfully"
        })
        
    except Exception as e:
        logger.exception("Error disconnecting Google Calendar: %s", e)
        traceback.print_exc()
        return Response(
            {"error": "Failed to disconnect Google Calendar", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )