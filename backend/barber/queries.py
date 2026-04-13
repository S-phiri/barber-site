"""
Query helpers for barber app using Django ORM.
"""
from datetime import datetime, timedelta, timezone
from django.utils import timezone as django_timezone
from django.db.models import Q
from .models import Barber, BlockedDate, Service, Slot, SlotHold, Booking


def list_active_services():
    """Get all active services."""
    return Service.objects.filter(active=True).order_by('name')


def list_active_barbers():
    """Get all active barbers."""
    return Barber.objects.filter(is_active=True).order_by('display_name')


def get_barber_by_slug(slug: str):
    """Get a barber by slug."""
    try:
        return Barber.objects.get(slug=slug, is_active=True)
    except Barber.DoesNotExist:
        return None


def available_slots(barber_id=None, service_id=None, date=None):
    """
    Get available slots for booking.
    
    Args:
        barber_id: Filter by specific barber
        service_id: Filter by service (for duration calculation)
        date: Filter by specific date (YYYY-MM-DD format)
    """
    now = django_timezone.now()
    
    # Base query for available slots
    queryset = Slot.objects.filter(
        is_available=True,
        start_at__gt=now
    ).select_related('barber')
    
    # Filter by barber
    if barber_id:
        queryset = queryset.filter(barber_id=barber_id)
    
    # Filter by date
    if date:
        if isinstance(date, str):
            date = datetime.strptime(date, '%Y-%m-%d').date()
        if BlockedDate.objects.filter(date=date).exists():
            return Slot.objects.none()
        start_of_day = datetime.combine(date, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_of_day = datetime.combine(date, datetime.max.time()).replace(tzinfo=timezone.utc)
        queryset = queryset.filter(start_at__gte=start_of_day, start_at__lt=end_of_day)
    
    # Exclude slots that have active holds
    active_holds = SlotHold.objects.filter(
        status='active',
        expires_at__gt=now
    ).values_list('slot_id', flat=True)
    
    queryset = queryset.exclude(id__in=active_holds)
    
    return queryset.order_by('start_at')


def hold_slot(slot_id, user_id=None, ttl_minutes=10):
    """
    Hold a slot for a specified duration.
    
    Args:
        slot_id: UUID of the slot to hold
        user_id: ID of the user holding the slot (optional)
        ttl_minutes: Time to live in minutes (default 10)
    
    Returns:
        SlotHold instance if successful, None if slot not available
    """
    try:
        slot = Slot.objects.get(id=slot_id, is_available=True)
    except Slot.DoesNotExist:
        return None
    
    # Check if slot already has an active hold
    now = django_timezone.now()
    existing_hold = SlotHold.objects.filter(
        slot=slot,
        status='active',
        expires_at__gt=now
    ).first()
    
    if existing_hold:
        return None
    
    # Create new hold
    expires_at = now + timedelta(minutes=ttl_minutes)
    hold = SlotHold.objects.create(
        slot=slot,
        user_id=user_id,
        expires_at=expires_at,
        status='active'
    )
    
    return hold


def release_hold(hold_id):
    """Release a slot hold."""
    try:
        hold = SlotHold.objects.get(id=hold_id)
        hold.status = 'released'
        hold.save()
        return True
    except SlotHold.DoesNotExist:
        return False


def confirm_booking(slot_id, barber_id, service_id, customer_name, customer_phone, notes='', user_id=None):
    """
    Create a confirmed booking.
    
    Args:
        slot_id: UUID of the slot
        barber_id: ID of the barber
        service_id: ID of the service
        customer_name: Customer's name
        customer_phone: Customer's phone number
        notes: Optional notes
        user_id: ID of the user making the booking (optional)
    
    Returns:
        Booking instance if successful, None if slot not available
    """
    try:
        slot = Slot.objects.get(id=slot_id, is_available=True)
        barber = Barber.objects.get(id=barber_id, is_active=True)
        service = Service.objects.get(id=service_id, active=True)
    except (Slot.DoesNotExist, Barber.DoesNotExist, Service.DoesNotExist):
        return None
    
    # Check if slot already has a booking
    if hasattr(slot, 'booking'):
        return None
    
    # Create booking (awaiting barber approval — no calendar sync yet)
    booking = Booking.objects.create(
        slot=slot,
        barber=barber,
        service=service,
        customer_name=customer_name,
        customer_phone=customer_phone,
        notes=notes,
        status='pending',
        customer_user_id=user_id,
    )
    
    # Mark slot as unavailable
    slot.is_available = False
    slot.save()
    
    # Release any active holds for this slot
    SlotHold.objects.filter(
        slot=slot,
        status='active'
    ).update(status='converted')
    
    return booking


def cancel_booking(booking_id):
    """
    Cancel a booking and make the slot available again.
    
    Args:
        booking_id: UUID of the booking to cancel
    
    Returns:
        True if successful, False if booking not found
    """
    try:
        booking = Booking.objects.get(id=booking_id)
        booking.status = 'cancelled'
        booking.save()
        
        # Make slot available again
        slot = booking.slot
        slot.is_available = True
        slot.save()
        
        return True
    except Booking.DoesNotExist:
        return False


def get_user_bookings(user_id):
    """Get all bookings for a specific user."""
    return (
        Booking.objects.filter(
            Q(customer_user_id=user_id) | Q(slot__slothold__user_id=user_id)
        )
        .distinct()
        .select_related('slot', 'barber', 'service')
        .order_by('-created_at')
    )


def create_pending_booking_request(
    *,
    barber_id,
    service_id,
    start_at,
    customer_name,
    customer_phone,
    customer_email,
    notes,
    user,
):
    from datetime import timedelta
    barber = Barber.objects.get(id=barber_id, is_active=True)
    service = Service.objects.get(id=service_id, active=True)
    end_at = start_at + timedelta(minutes=service.duration_minutes)
    slot = Slot.objects.create(
        barber=barber,
        start_at=start_at,
        end_at=end_at,
        is_available=False,
    )
    booking = Booking.objects.create(
        slot=slot,
        barber=barber,
        service=service,
        customer_user=user if getattr(user, 'is_authenticated', False) else None,
        customer_name=customer_name or '',
        customer_phone=customer_phone or '',
        customer_email=customer_email or '',
        notes=notes or '',
        status='pending',
    )
    return booking



def is_barber_interval_blocked(barber_id, start_at, end_at):
    """
    True if an overlapping Slot is booked (unavailable) or has an active hold.
    Used by generated slot APIs that synthesize times before persisting Slot rows.
    """
    now = django_timezone.now()
    overlapping = Slot.objects.filter(
        barber_id=barber_id,
        start_at__lt=end_at,
        end_at__gt=start_at,
    )
    if overlapping.filter(is_available=False).exists():
        return True
    if SlotHold.objects.filter(
        slot__in=overlapping,
        status="active",
        expires_at__gt=now,
    ).exists():
        return True
    return False


def cleanup_expired_holds():
    """Clean up expired holds (can be called by a cron job)."""
    now = django_timezone.now()
    expired_holds = SlotHold.objects.filter(
        status='active',
        expires_at__lte=now
    )
    
    for hold in expired_holds:
        hold.status = 'released'
        hold.save()
    
    return expired_holds.count()
