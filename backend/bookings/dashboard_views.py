from datetime import datetime, timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .db import db

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard(req):
    user_id = str(req.user.id)
    now = datetime.now(timezone.utc)
    bookings = list(db.bookings.find({"user_id": user_id}))
    visits = len(bookings)
    next_appt = db.time_slots.find_one({
        "_id": {"$in": [b.get("slot_id") for b in bookings if b.get("slot_id")]},
        "start_ts": {"$gte": now}
    })
    # simple loyalty: 10 pts per confirmed booking
    confirmed = [b for b in bookings if b.get("status") in ("confirmed","pending")]  # tweak later
    loyalty_points = len(confirmed) * 10
    return Response({
        "visits": visits,
        "loyalty_points": loyalty_points,
        "next_appointment": next_appt and {
            "id": str(next_appt["_id"]),
            "start_ts": next_appt["start_ts"].isoformat()
        }
    })
