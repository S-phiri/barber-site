"""
URL patterns for the barber app
"""

from django.urls import path
from . import google_auth_views, booking_views, staff_views

urlpatterns = [
    # Google Calendar authentication URLs
    path('google-calendar/auth/', google_auth_views.google_calendar_auth, name='google_calendar_auth'),
    path('google-calendar/callback/', google_auth_views.google_calendar_callback, name='google_calendar_callback'),
    path('google-calendar/status/', google_auth_views.google_calendar_status, name='google_calendar_status'),
    path('google-calendar/disconnect/', google_auth_views.google_calendar_disconnect, name='google_calendar_disconnect'),
    
    # Staff dashboard (is_staff only) — list before generic booking_id routes
    path('today/', staff_views.today_bookings),
    path('pending/', staff_views.pending_bookings),
    path('bookings-by-day/', staff_views.bookings_by_day),
    path('week/', staff_views.week_summary),
    path('analytics/', staff_views.analytics),
    path('customers/', staff_views.customers_list),
    path('bookings/<uuid:booking_id>/accept/', staff_views.booking_accept),
    path('bookings/<uuid:booking_id>/decline/', staff_views.booking_decline),
    path('bookings/<uuid:booking_id>/complete/', staff_views.booking_complete),
    path('bookings/<uuid:booking_id>/no-show/', staff_views.booking_no_show),
    path('bookings/<uuid:booking_id>/approve-cancellation/', staff_views.booking_approve_cancellation),
    path('bookings/<uuid:booking_id>/reject-cancellation/', staff_views.booking_reject_cancellation),
    path('bookings/<uuid:booking_id>/approve-reschedule/', staff_views.booking_approve_reschedule),
    path('bookings/<uuid:booking_id>/reject-reschedule/', staff_views.booking_reject_reschedule),
    path('blocked-dates/', staff_views.blocked_dates_list_create),
    path('blocked-dates/<int:pk>/', staff_views.blocked_date_delete),
    path('customer-notes/<int:customer_id>/', staff_views.customer_notes),
    path('customers/<str:phone>/birthday/', staff_views.customer_profile_birthday),

    # Booking URLs with Google Calendar integration
    path('bookings/', booking_views.create_booking, name='create_booking'),
    path('bookings/user/', booking_views.get_user_bookings, name='get_user_bookings'),
    path('bookings/<str:booking_id>/', booking_views.update_booking, name='update_booking'),
    path('bookings/<str:booking_id>/cancel/', booking_views.cancel_booking, name='cancel_booking'),
]
