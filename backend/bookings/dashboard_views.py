from datetime import datetime, timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from barber.queries import get_user_bookings

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard(req):
    """Get user dashboard data."""
    user_id = req.user.id
    now = datetime.now(timezone.utc)
    bookings = get_user_bookings(user_id)
    visits = len(bookings)
    
    # Get next appointment
    next_appt = None
    for booking in bookings:
        if booking.slot.start_at >= now:
            next_appt = {
                "id": str(booking.slot.id),
                "start_ts": booking.slot.start_at.isoformat()
            }
            break
    
    # Simple loyalty: 10 pts per confirmed booking
    confirmed = [b for b in bookings if b.status in ("confirmed", "pending")]
    loyalty_points = len(confirmed) * 10
    
    return Response({
        "visits": visits,
        "loyalty_points": loyalty_points,
        "next_appointment": next_appt
    })
