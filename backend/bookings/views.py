from django.shortcuts import render
from datetime import datetime, timedelta, timezone, date, time
from bson import ObjectId
from pymongo import ReturnDocument
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .db import db, norm
from .utils import generate_slots
from .hours import get_hours_for_weekday
# Models are in the barber app, not bookings
from django.utils import timezone
from django.contrib.auth import authenticate, login, logout


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
    items = [{"id": str(x["_id"]), "name": x["name"], "duration_min": x["duration_min"], "price_cents": x["price_cents"]}
             for x in db.services.find({"is_active": True})]
    return Response(items)

@api_view(["GET"])
def barbers_list(_req):
    items = [{"id": str(x["_id"]), "display_name": x["display_name"], "specialties": x.get("specialties", [])}
             for x in db.barbers.find({"is_active": True})]
    return Response(items)

@api_view(["GET"])
def time_slots_list(req):
    now = datetime.now(timezone.utc)
    barber_id = req.query_params.get("barberId")
    date_str  = req.query_params.get("date")
    q = {"$or": [{"status": "open"}, {"status": "held", "hold_expires_at": {"$lte": now}}]}
    if barber_id: q["barber_id"] = barber_id
    if date_str:
        start = datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        q["start_ts"] = {"$gte": start, "$lt": end}
    docs = list(db.time_slots.find(q).sort("start_ts", 1))
    return Response([norm(d) for d in docs])

@api_view(["POST"])
def time_slot_hold(_req, slot_id: str):
    now = datetime.now(timezone.utc)
    res = db.time_slots.find_one_and_update(
        {"_id": ObjectId(slot_id),
         "$or": [{"status": "open"}, {"status": "held", "hold_expires_at": {"$lte": now}}]},
        {"$set": {"status": "held", "hold_expires_at": now + timedelta(minutes=10)}},
        return_document=ReturnDocument.AFTER,
    )
    if not res:
        return Response({"detail": "Slot not available"}, status=status.HTTP_409_CONFLICT)
    return Response({"id": str(res["_id"]), "hold_expires_at": norm(res)["hold_expires_at"]})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def booking_create(req):
    data = req.data or {}
    barber_id  = data.get("barber_id")
    service_id = data.get("service_id")
    slot_id    = data.get("slot_id")
    if not (barber_id and service_id and slot_id):
        return Response({"detail":"Missing fields"}, status=400)
    now = datetime.now(timezone.utc)
    slot = db.time_slots.find_one({"_id": ObjectId(slot_id)})
    if not slot or slot.get("status") != "held" or slot.get("hold_expires_at", now) < now:
        return Response({"detail":"Hold expired or slot invalid"}, status=409)
    user_id = str(req.user.id)
    ins = db.bookings.insert_one({
        "user_id": user_id, "barber_id": barber_id, "service_id": service_id,
        "slot_id": slot_id, "status": "pending", "created_at": now
    })
    return Response({"id": str(ins.inserted_id), "status": "pending"}, status=201)

@api_view(["GET"])
def bookings_me(_req):
    docs = list(db.bookings.find().sort("created_at", -1))
    return Response([{"id": str(d["_id"]), "status": d["status"],
                      "barber_id": d["barber_id"], "service_id": d["service_id"], "slot_id": d["slot_id"]} for d in docs])

@api_view(["POST"])
def checkout(_req):
    return Response({"redirect_url": "/checkout/success"})




@api_view(["GET"])
@permission_classes([AllowAny])
def slots(request):
    """Generate available time slots for a specific date, barber, and service"""
    q = request.query_params
    barber_id = q.get("barber_id") or q.get("barber")
    service_id = q.get("service_id") or q.get("service")
    date_str = q.get("date")  # YYYY-MM-DD format

    if not (barber_id and service_id and date_str):
        return Response([], status=200)

    try:
        # Parse date using date.fromisoformat (Python 3.7+)
        day = date.fromisoformat(date_str)
        
        # Get weekday-specific hours (Mon=0, Sun=6)
        weekday = day.weekday()
        open_time, close_time = get_hours_for_weekday(weekday)
        
        # Check if the business is closed (Sunday)
        if open_time is None or close_time is None:
            return Response([], status=200)
        
        # Generate 45-minute slots with 45-minute steps
        slot_times = generate_slots(day, open_time, close_time, duration_min=45, step_min=45)
        
        # Convert to the expected format for the frontend
        available_slots = []
        for slot_time in slot_times:
            slot_dt = datetime.combine(day, datetime.strptime(slot_time, "%H:%M").time())
            end_dt = slot_dt + timedelta(minutes=45)
            
            available_slots.append({
                "start": slot_time,
                "start_ts": slot_dt.isoformat(),
                "end_ts": end_dt.isoformat(),
                "id": f"{day.isoformat()}_{slot_time.replace(':', '')}",
                "status": "open"
            })
        
        # Filter out past slots if it's today
        now = datetime.now()
        if day == now.date():
            current_time = now.time()
            available_slots = [
                slot for slot in available_slots
                if datetime.strptime(slot["start"], "%H:%M").time() > current_time
            ]
        
        # TODO: Filter out booked slots by checking existing bookings
        # This would require checking the bookings collection for conflicts
        
        return Response(available_slots, status=200)
        
    except ValueError:
        # Invalid date format
        return Response([], status=200)
    except Exception as e:
        # Any other error
        return Response([], status=200)