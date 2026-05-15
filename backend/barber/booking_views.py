"""
Booking views with Google Calendar integration
"""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model

from .models import Barber, BlockedDate, Booking, Service
from .queries import create_pending_booking_request
from .google_calendar import GoogleCalendarService
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

TZ = ZoneInfo("Africa/Johannesburg")

# Bookings that still reserve the slot in the calendar
_BLOCKING_STATUSES = frozenset(
    ("pending", "confirmed", "cancellation_requested", "reschedule_requested")
)


def _default_barber():
    b = Barber.objects.filter(display_name__iexact="Ramad", is_active=True).first()
    if b:
        return b
    b = Barber.objects.filter(slug__iexact="ramad", is_active=True).first()
    if b:
        return b
    return Barber.objects.filter(is_active=True).order_by("display_name").first()


def _slot_time_labels():
    """Half-hour labels from 09:00 through 17:30 inclusive."""
    labels = []
    minutes = 9 * 60
    end = 17 * 60 + 30
    while minutes <= end:
        h, m = divmod(minutes, 60)
        labels.append(f"{h:02d}:{m:02d}")
        minutes += 30
    return labels


def _parse_hhmm(s: str):
    parts = str(s).strip().split(":")
    if len(parts) != 2:
        return None
    try:
        h, m = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    if not (0 <= h <= 23 and 0 <= m <= 59):
        return None
    return h, m


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_slots(request):
    """
    GET ?date=YYYY-MM-DD&service_id=...&barber_id=optional
    Returns [{ "time": "09:00", "available": true }, ...] in SAST wall-clock labels;
    overlap checks use UTC-aware Slot times from the database.
    """
    date_raw = request.query_params.get("date")
    service_id = request.query_params.get("service_id")
    barber_id = request.query_params.get("barber_id")

    if not date_raw:
        return Response({"error": "date query parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
    if not service_id:
        return Response({"error": "service_id query parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        day = date.fromisoformat(str(date_raw)[:10])
    except ValueError:
        return Response({"error": "Invalid date"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        service = Service.objects.get(id=service_id, active=True)
    except Service.DoesNotExist:
        return Response({"error": "Invalid service_id"}, status=status.HTTP_400_BAD_REQUEST)

    if barber_id:
        barber = Barber.objects.filter(id=barber_id, is_active=True).first()
    else:
        barber = _default_barber()

    if not barber:
        return Response({"error": "No active barber found"}, status=status.HTTP_400_BAD_REQUEST)

    duration = timedelta(minutes=service.duration_minutes)
    labels = _slot_time_labels()
    now_local = timezone.now().astimezone(TZ)

    # Sunday in Johannesburg: weekday Monday=0 .. Sunday=6
    if day.weekday() == 6:
        return Response([{"time": lab, "available": False} for lab in labels])

    blocked = BlockedDate.objects.filter(date=day).filter(Q(barber=barber) | Q(barber__isnull=True)).exists()
    if blocked:
        return Response([{"time": lab, "available": False} for lab in labels])

    day_start = datetime.combine(day, time.min, tzinfo=TZ)
    day_end = day_start + timedelta(days=1)

    blocking_qs = (
        Booking.objects.filter(
            barber=barber,
            status__in=_BLOCKING_STATUSES,
            slot__start_at__lt=day_end,
            slot__end_at__gt=day_start,
        )
        .select_related("slot")
    )
    occupied = [(b.slot.start_at, b.slot.end_at) for b in blocking_qs]

    out = []
    for lab in labels:
        parsed = _parse_hhmm(lab)
        if not parsed:
            out.append({"time": lab, "available": False})
            continue
        hh, mm = parsed
        candidate_start = datetime.combine(day, time(hh, mm, 0), tzinfo=TZ)
        candidate_end = candidate_start + duration

        if day == now_local.date() and candidate_start <= now_local:
            out.append({"time": lab, "available": False})
            continue

        busy = False
        for bs, be in occupied:
            if candidate_start < be and candidate_end > bs:
                busy = True
                break
        out.append({"time": lab, "available": not busy})

    return Response(out)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_booking(request):
    """
    Create a new booking and sync to Google Calendar
    """
    try:
        data = request.data
        
        # Validate required fields
        required_fields = ['service_id', 'barber_id', 'customer_name', 'customer_phone', 'start_time']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {"error": f"Missing required field: {field}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get service and barber
        try:
            service = Service.objects.get(id=data['service_id'])
            barber = Barber.objects.get(id=data['barber_id'])
        except (Service.DoesNotExist, Barber.DoesNotExist):
            return Response(
                {"error": "Invalid service or barber ID"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.utils import timezone as django_timezone
        start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
        if django_timezone.is_naive(start_time):
            start_time = django_timezone.make_aware(
                start_time, django_timezone.get_current_timezone()
            )
        booking = create_pending_booking_request(
            barber_id=data['barber_id'],
            service_id=data['service_id'],
            start_at=start_time,
            customer_name=data['customer_name'],
            customer_phone=data['customer_phone'],
            customer_email=data.get('customer_email', ''),
            notes=data.get('notes', ''),
            user=request.user,
        )
        
        return Response({
            "success": True,
            "booking_id": str(booking.id),
            "status": booking.status,
            "message": "Booking request created — awaiting barber approval",
        })
        
    except Exception as e:
        logger.error(f"Error creating booking: {e}")
        return Response(
            {"error": "Failed to create booking"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_bookings(request):
    """
    Get bookings for the authenticated user
    """
    try:
        # For now, we'll get bookings by customer name/phone
        # In a real app, you'd link users to bookings
        customer_name = request.query_params.get('customer_name')
        customer_phone = request.query_params.get('customer_phone')
        
        if not customer_name and not customer_phone:
            return Response(
                {"error": "Customer name or phone required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        bookings_query = Booking.objects.filter(status='confirmed')
        
        if customer_name:
            bookings_query = bookings_query.filter(customer_name__icontains=customer_name)
        if customer_phone:
            bookings_query = bookings_query.filter(customer_phone=customer_phone)
        
        bookings = bookings_query.order_by('-slot__start_at')
        
        booking_list = []
        for booking in bookings:
            booking_list.append({
                'id': str(booking.id),
                'service_name': booking.service.name,
                'barber_name': booking.barber.display_name,
                'start_time': booking.slot.start_at.isoformat(),
                'end_time': booking.slot.end_at.isoformat(),
                'status': booking.status,
                'notes': booking.notes,
                'calendar_event_id': booking.gcal_event_id
            })
        
        return Response(booking_list)
        
    except Exception as e:
        logger.error(f"Error fetching bookings: {e}")
        return Response(
            {"error": "Failed to fetch bookings"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_booking(request, booking_id):
    """
    Update a booking and sync changes to Google Calendar
    """
    try:
        booking = Booking.objects.get(id=booking_id)
        data = request.data
        
        # Update booking fields
        if 'customer_name' in data:
            booking.customer_name = data['customer_name']
        if 'customer_phone' in data:
            booking.customer_phone = data['customer_phone']
        if 'customer_email' in data:
            booking.customer_email = data['customer_email']
        if 'notes' in data:
            booking.notes = data['notes']
        
        booking.save()
        
        # Update Google Calendar event if it exists
        if booking.gcal_event_id:
            calendar_service = GoogleCalendarService()
            booking_data = {
                'start_time': booking.slot.start_at.isoformat(),
                'duration_minutes': booking.service.duration_minutes,
                'service_name': booking.service.name,
                'customer_name': booking.customer_name,
                'customer_phone': booking.customer_phone,
                'customer_email': getattr(booking, 'customer_email', ''),
                'notes': booking.notes,
                'barber_name': booking.barber.display_name
            }
            
            success = calendar_service.update_calendar_event(
                str(booking.barber.id), 
                booking.gcal_event_id, 
                booking_data
            )
            
            if not success:
                logger.warning(f"Failed to update Google Calendar event {booking.gcal_event_id}")
        
        return Response({
            "success": True,
            "message": "Booking updated successfully"
        })
        
    except Booking.DoesNotExist:
        return Response(
            {"error": "Booking not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error updating booking: {e}")
        return Response(
            {"error": "Failed to update booking"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancel_booking(request, booking_id):
    """
    Cancel a booking and remove from Google Calendar
    """
    try:
        booking = Booking.objects.get(id=booking_id)
        
        # Cancel the booking
        booking.status = 'cancelled'
        booking.save()
        
        # Remove from Google Calendar
        if booking.gcal_event_id:
            calendar_service = GoogleCalendarService()
            success = calendar_service.delete_calendar_event(
                str(booking.barber.id), 
                booking.gcal_event_id
            )
            
            if success:
                logger.info(f"Deleted Google Calendar event {booking.gcal_event_id}")
            else:
                logger.warning(f"Failed to delete Google Calendar event {booking.gcal_event_id}")
        
        return Response({
            "success": True,
            "message": "Booking cancelled successfully"
        })
        
    except Booking.DoesNotExist:
        return Response(
            {"error": "Booking not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error cancelling booking: {e}")
        return Response(
            {"error": "Failed to cancel booking"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
