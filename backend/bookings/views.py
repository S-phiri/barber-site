from datetime import datetime, timedelta, date, time
from django.conf import settings
from django.utils import timezone as dj_tz
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from zoneinfo import ZoneInfo

from barber.queries import (
    list_active_services, list_active_barbers, get_barber_by_slug,
    available_slots, hold_slot, confirm_booking, cancel_booking,
    get_user_bookings, is_barber_interval_blocked,
)
from barber.models import Service
from .hours import get_hours_for_weekday
from .utils import generate_slots


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    u = authenticate(
        username=request.data.get("username"),
        password=request.data.get("password")
    )
    if not u:
        return Response({"detail": "Invalid credentials"}, status=400)
    login(request, u)            # sets the session cookie
    return Response({"ok": True})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response(status=204)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    u = request.user
    return Response({"id": u.id, "username": u.username, "email": u.email})

@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_token(request):
    """Get CSRF token for the frontend"""
    from django.middleware.csrf import get_token
    token = get_token(request)
    return Response({"csrfToken": token})


@api_view(["GET"])
def services_list(_req):
    """Get all active services."""
    services = list_active_services()
    items = [{"id": str(s.id), "name": s.name, "duration_min": s.duration_minutes, "price_cents": s.price_cents}
             for s in services]
    return Response(items)

@api_view(["GET"])
def barbers_list(_req):
    """Get all active barbers."""
    barbers = list_active_barbers()
    items = [{"id": str(b.id), "display_name": b.display_name, "specialties": b.specialties}
             for b in barbers]
    return Response(items)

@api_view(["GET"])
def barber_by_slug(_req, slug: str):
    """Get a specific barber by slug."""
    barber = get_barber_by_slug(slug)
    if not barber:
        return Response({"error": "Barber not found"}, status=404)
    
    return Response({
        "id": str(barber.id),
        "name": barber.display_name,
        "slug": barber.slug,
        "specialties": barber.specialties
    })

@api_view(["GET"])
def time_slots_list(req):
    """Get available time slots."""
    barber_id = req.query_params.get("barberId")
    service_id = req.query_params.get("serviceId")
    date_str = req.query_params.get("date")
    
    slots = available_slots(
        barber_id=barber_id,
        service_id=service_id,
        date=date_str
    )
    
    # Convert to the expected format
    items = []
    for slot in slots:
        items.append({
            "id": str(slot.id),
            "barber_id": str(slot.barber.id),
            "start_ts": slot.start_at.isoformat(),
            "end_ts": slot.end_at.isoformat(),
            "status": "open" if slot.is_available else "booked"
        })
    
    return Response(items)

@api_view(["POST"])
def time_slot_hold(_req, slot_id: str):
    """Hold a time slot."""
    user_id = _req.user.id if _req.user.is_authenticated else None
    hold = hold_slot(slot_id, user_id=user_id, ttl_minutes=10)
    
    if not hold:
        return Response({"detail": "Slot not available"}, status=status.HTTP_409_CONFLICT)
    
    return Response({
        "id": str(hold.id),
        "slot_id": str(hold.slot.id),
        "expires_at": hold.expires_at.isoformat(),
        "status": "held"
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def booking_create(req):
    """Create a new booking."""
    data = req.data or {}
    barber_id = data.get("barber_id")
    service_id = data.get("service_id")
    slot_id = data.get("slot_id")
    customer_name = data.get("customer_name", "")
    customer_phone = data.get("customer_phone", "")
    notes = data.get("notes", "")
    
    if not (barber_id and service_id and slot_id):
        return Response({"detail": "Missing fields"}, status=400)
    
    user_id = req.user.id
    booking = confirm_booking(
        slot_id=slot_id,
        barber_id=barber_id,
        service_id=service_id,
        customer_name=customer_name,
        customer_phone=customer_phone,
        notes=notes,
        user_id=user_id
    )
    
    if not booking:
        return Response({"detail": "Hold expired or slot invalid"}, status=409)
    
    return Response({"id": str(booking.id), "status": "confirmed"}, status=201)

@api_view(["GET"])
def bookings_me(req):
    """Get user's bookings."""
    if not req.user.is_authenticated:
        return Response([])
    
    bookings = get_user_bookings(req.user.id)
    items = []
    for booking in bookings:
        items.append({
            "id": str(booking.id),
            "slot_id": str(booking.slot.id),
            "barber_id": str(booking.barber.id),
            "service_id": str(booking.service.id),
            "barber_name": booking.barber.display_name,
            "service_name": booking.service.name,
            "customer_name": booking.customer_name,
            "status": booking.status,
            "created_at": booking.created_at.isoformat()
        })
    
    return Response(items)

@api_view(["POST"])
def checkout(_req):
    return Response({"redirect_url": "/checkout/success"})




@api_view(["GET"])
@permission_classes([AllowAny])
def slots(request):
    """Generate available time slots for a specific date, barber, and service (Django ORM)."""
    q = request.query_params
    barber_id = q.get("barber_id") or q.get("barber")
    service_id = q.get("service_id") or q.get("service")
    date_str = q.get("date")  # YYYY-MM-DD format

    if not (barber_id and service_id and date_str):
        return Response([], status=200)

    try:
        day = date.fromisoformat(date_str)
    except ValueError:
        return Response([], status=200)

    try:
        service = Service.objects.get(id=service_id, active=True)
        duration_min = service.duration_minutes
    except Service.DoesNotExist:
        duration_min = 45

    weekday = day.weekday()
    open_time, close_time = get_hours_for_weekday(weekday)
    if open_time is None or close_time is None:
        return Response([], status=200)

    slot_times = generate_slots(
        day, open_time, close_time, duration_min=duration_min, step_min=duration_min
    )

    tz = ZoneInfo(str(settings.TIME_ZONE))
    now = dj_tz.now()
    result = []

    for slot_time in slot_times:
        t = datetime.strptime(slot_time, "%H:%M").time()
        slot_dt = dj_tz.make_aware(datetime.combine(day, t), timezone=tz)
        end_dt = slot_dt + timedelta(minutes=duration_min)

        if day == now.date() and slot_dt <= now:
            continue
        if is_barber_interval_blocked(barber_id, slot_dt, end_dt):
            continue

        result.append({
            "start": slot_time,
            "start_ts": slot_dt.isoformat(),
            "end_ts": end_dt.isoformat(),
            "id": f"{day.isoformat()}_{slot_time.replace(':', '')}",
            "status": "open",
        })

    return Response(result, status=200)