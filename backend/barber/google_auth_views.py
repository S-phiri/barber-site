"""
Google Calendar OAuth views for barber authentication
"""

from django.shortcuts import redirect
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .google_calendar import GoogleCalendarService
from .models import Barber, GoogleToken
import logging

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
        logger.error(f"Error initiating Google Calendar auth: {e}")
        return Response(
            {"error": "Failed to initiate Google Calendar authentication"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def google_calendar_callback(request):
    """
    Handle Google Calendar OAuth callback.
    Unauthenticated: Google redirects here without JWT; barber identity comes from OAuth `state` (barber id).
    """
    try:
        code = request.GET.get('code')
        state = request.GET.get('state')  # barber UUID from auth initiation
        
        if not code:
            return Response(
                {"error": "Authorization code not provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not state:
            return Response(
                {"error": "State parameter missing"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if not Barber.objects.filter(pk=state).exists():
            return Response(
                {"error": "Invalid state: unknown barber"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Initialize Google Calendar service
        calendar_service = GoogleCalendarService()
        
        # Exchange code for token (credentials stored keyed by barber id from state)
        token_info = calendar_service.exchange_code_for_token(code, state)
        
        return Response({
            "success": True,
            "message": "Google Calendar connected successfully",
            "access_token": token_info.get('access_token'),
            "expires_at": token_info.get('expires_at')
        })
        
    except Exception as e:
        logger.error(f"Error in Google Calendar callback: {e}")
        return Response(
            {"error": "Failed to connect Google Calendar"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

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
        
        # Same GoogleToken resolution as GoogleCalendarService._get_credentials (field=label)
        label_key = str(barber.id)
        gt = GoogleToken.objects.filter(label=label_key).first()
        token_row_resolution = "primary"
        if not gt or not (gt.refresh_token or "").strip():
            gt = GoogleToken.objects.filter(label="barber").order_by("-updated_at").first()
            token_row_resolution = "legacy_barber_label" if gt else "none"
        logger.info(
            "google_calendar_status barber_id=%s query_field=label query_value=%s "
            "token_row_resolution=%s matched_google_token_pk=%s matched_label=%s has_nonempty_refresh_token=%s",
            label_key,
            label_key,
            token_row_resolution,
            getattr(gt, "pk", None),
            getattr(gt, "label", None),
            bool(gt and (gt.refresh_token or "").strip()),
        )

        calendar_service = GoogleCalendarService()
        is_connected = calendar_service.is_barber_connected(label_key)
        logger.info(
            "google_calendar_status barber_id=%s is_connected=%s "
            "(is_barber_connected uses _get_credentials: same label + refresh OAuth refresh)",
            label_key,
            is_connected,
        )

        return Response({
            "is_connected": is_connected,
            "barber_id": str(barber.id)
        })
        
    except Exception as e:
        logger.error(f"Error checking Google Calendar status: {e}")
        return Response(
            {"error": "Failed to check Google Calendar status"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
        logger.error(f"Error disconnecting Google Calendar: {e}")
        return Response(
            {"error": "Failed to disconnect Google Calendar"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )