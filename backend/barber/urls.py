"""
URL patterns for the barber app
"""

from django.urls import path
from . import google_auth_views, booking_views

urlpatterns = [
    # Google Calendar authentication URLs
    path('google-calendar/auth/', google_auth_views.google_calendar_auth, name='google_calendar_auth'),
    path('google-calendar/callback/', google_auth_views.google_calendar_callback, name='google_calendar_callback'),
    path('google-calendar/status/', google_auth_views.google_calendar_status, name='google_calendar_status'),
    path('google-calendar/disconnect/', google_auth_views.google_calendar_disconnect, name='google_calendar_disconnect'),
    
    # Booking URLs with Google Calendar integration
    path('bookings/', booking_views.create_booking, name='create_booking'),
    path('bookings/user/', booking_views.get_user_bookings, name='get_user_bookings'),
    path('bookings/<str:booking_id>/', booking_views.update_booking, name='update_booking'),
    path('bookings/<str:booking_id>/cancel/', booking_views.cancel_booking, name='cancel_booking'),
]
