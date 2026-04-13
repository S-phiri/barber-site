"""
Staff-only barber dashboard API (is_staff required).
"""
from __future__ import annotations

import re
from collections import Counter
from datetime import date, datetime, timedelta

from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from zoneinfo import ZoneInfo

from .models import Barber, BlockedDate, Booking, CustomerNote, CustomerProfile, Service
from .google_calendar import GoogleCalendarService

TZ = ZoneInfo("Africa/Johannesburg")


def _barber_for_calendar(request):
    """Barber row linked to staff user, else first active barber (single-shop fallback)."""
    try:
        return Barber.objects.get(user=request.user)
    except Barber.DoesNotExist:
        return Barber.objects.filter(is_active=True).order_by("display_name").first()


class IsStaffUser(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_staff)


def _forbidden():
    return Response({"detail": "Staff only."}, status=status.HTTP_403_FORBIDDEN)


def _wa_url(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if not digits:
        return ""
    if digits.startswith("0") and len(digits) >= 9:
        digits = "27" + digits[1:]
    elif not digits.startswith("27"):
        digits = "27" + digits.lstrip("0")
    return f"https://wa.me/{digits}"


def _serialize_booking(b: Booking) -> dict:
    return {
        "id": str(b.id),
        "status": b.status,
        "customer_name": b.customer_name,
        "customer_phone": b.customer_phone,
        "whatsapp_url": _wa_url(b.customer_phone),
        "customer_email": b.customer_email,
        "customer_user_id": b.customer_user_id,
        "notes": b.notes,
        "rejection_reason": b.rejection_reason or "",
        "new_requested_date": b.new_requested_date.isoformat() if b.new_requested_date else None,
        "new_requested_time": b.new_requested_time or "",
        "slot_start": b.slot.start_at.isoformat(),
        "slot_end": b.slot.end_at.isoformat(),
        "service": {
            "id": str(b.service_id),
            "name": b.service.name,
            "duration_minutes": b.service.duration_minutes,
        },
        "barber": {"id": str(b.barber_id), "name": b.barber.display_name},
        "created_at": b.created_at.isoformat(),
    }


def _gcal_booking_payload(b: Booking) -> dict:
    return {
        "start_time": b.slot.start_at.isoformat(),
        "duration_minutes": b.service.duration_minutes,
        "service_name": b.service.name,
        "customer_name": b.customer_name,
        "customer_phone": b.customer_phone,
        "customer_email": b.customer_email or "",
        "notes": b.notes or "",
    }


def _booking_qs():
    return (
        Booking.objects.select_related("slot", "service", "barber")
        .all()
        .order_by("slot__start_at")
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffUser])
def today_bookings(request):
    if not request.user.is_staff:
        return _forbidden()
    today = timezone.now().astimezone(TZ).date()
    qs = (
        _booking_qs()
        .filter(slot__start_at__date=today)
        .exclude(status__in=("rejected", "cancelled"))
    )
    data = [_serialize_booking(b) for b in qs]
    return Response({"count": len(data), "results": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffUser])
def pending_bookings(request):
    if not request.user.is_staff:
        return _forbidden()
    st = ("pending", "cancellation_requested", "reschedule_requested")
    qs = _booking_qs().filter(status__in=st)
    data = [_serialize_booking(b) for b in qs]
    return Response({"count": len(data), "results": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffUser])
def bookings_by_day(request):
    if not request.user.is_staff:
        return _forbidden()
    d = request.query_params.get("date")
    if not d:
        return Response({"detail": "date query required (YYYY-MM-DD)"}, status=400)
    try:
        day = date.fromisoformat(d)
    except ValueError:
        return Response({"detail": "Invalid date"}, status=400)
    qs = _booking_qs().filter(slot__start_at__date=day).exclude(status__in=("rejected", "cancelled"))
    return Response({"date": d, "count": qs.count(), "results": [_serialize_booking(b) for b in qs]})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffUser])
def week_summary(request):
    """Next 7 days from today in shop TZ: date, booking count, blocked flag."""
    if not request.user.is_staff:
        return _forbidden()
    start = timezone.now().astimezone(TZ).date()
    blocked = set(
        BlockedDate.objects.filter(
            date__gte=start, date__lt=start + timedelta(days=7)
        ).values_list("date", flat=True)
    )
    days = []
    for i in range(7):
        d = start + timedelta(days=i)
        cnt = (
            Booking.objects.filter(slot__start_at__date=d)
            .exclude(status__in=("rejected", "cancelled"))
            .count()
        )
        days.append(
            {
                "date": d.isoformat(),
                "count": cnt,
                "blocked": d in blocked,
                "blocked_reason": (
                    BlockedDate.objects.filter(date=d).values_list("reason", flat=True).first()
                    or ""
                ),
            }
        )
    return Response({"days": days})


def _patch_booking_status(request, booking_id, new_status: str):
    if not request.user.is_staff:
        return _forbidden()
    booking = get_object_or_404(_booking_qs(), pk=booking_id)
    booking.status = new_status
    booking.save(update_fields=["status"])
    return Response(_serialize_booking(booking))


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsStaffUser])
def booking_accept(request, booking_id):
    if not request.user.is_staff:
        return _forbidden()
    booking = get_object_or_404(_booking_qs(), pk=booking_id)
    if booking.status != "pending":
        return Response(
            {"detail": "Only pending booking requests can be accepted."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    booking.status = "confirmed"
    booking.confirmed_at = timezone.now()
    booking.save(update_fields=["status", "confirmed_at"])
    if not booking.gcal_event_id:
        gcal = GoogleCalendarService()
        eid = gcal.create_calendar_event(str(booking.barber_id), _gcal_booking_payload(booking))
        if eid:
            booking.gcal_event_id = eid
            booking.save(update_fields=["gcal_event_id"])
    return Response(_serialize_booking(booking))


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsStaffUser])
def booking_decline(request, booking_id):
    if not request.user.is_staff:
        return _forbidden()
    booking = get_object_or_404(_booking_qs(), pk=booking_id)
    if booking.status != "pending":
        return Response(
            {"detail": "Only pending booking requests can be declined."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    reason = (request.data or {}).get("reason") or ""
    booking.status = "rejected"
    booking.rejection_reason = str(reason)[:500]
    booking.save(update_fields=["status", "rejection_reason"])
    return Response(_serialize_booking(booking))


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsStaffUser])
def booking_complete(request, booking_id):
    return _patch_booking_status(request, booking_id, "completed")


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsStaffUser])
def booking_no_show(request, booking_id):
    return _patch_booking_status(request, booking_id, "no_show")


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsStaffUser])
def booking_approve_cancellation(request, booking_id):
    if not request.user.is_staff:
        return _forbidden()
    booking = get_object_or_404(_booking_qs(), pk=booking_id)
    if booking.status != "cancellation_requested":
        return Response(
            {"detail": "Booking does not have a pending cancellation request."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    gcal = GoogleCalendarService()
    if booking.gcal_event_id:
        gcal.delete_calendar_event(str(booking.barber_id), booking.gcal_event_id)
    booking.gcal_event_id = ""
    booking.status = "cancelled"
    booking.cancelled_at = timezone.now()
    booking.save(update_fields=["status", "cancelled_at", "gcal_event_id"])
    return Response(_serialize_booking(booking))


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsStaffUser])
def booking_reject_cancellation(request, booking_id):
    if not request.user.is_staff:
        return _forbidden()
    booking = get_object_or_404(_booking_qs(), pk=booking_id)
    if booking.status != "cancellation_requested":
        return Response(
            {"detail": "Booking does not have a pending cancellation request."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    reason = (request.data or {}).get("reason") or ""
    booking.status = "confirmed"
    booking.rejection_reason = str(reason)[:500]
    booking.save(update_fields=["status", "rejection_reason"])
    return Response(_serialize_booking(booking))


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsStaffUser])
def booking_approve_reschedule(request, booking_id):
    if not request.user.is_staff:
        return _forbidden()
    booking = get_object_or_404(_booking_qs(), pk=booking_id)
    if booking.status != "reschedule_requested" or not booking.new_requested_date:
        return Response(
            {"detail": "Booking does not have a pending reschedule request."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    new_start = booking.new_requested_date
    if timezone.is_naive(new_start):
        new_start = timezone.make_aware(new_start, TZ)
    slot = booking.slot
    slot.start_at = new_start
    slot.end_at = new_start + timedelta(minutes=booking.service.duration_minutes)
    slot.save(update_fields=["start_at", "end_at"])
    booking.status = "rescheduled"
    booking.new_requested_date = None
    booking.new_requested_time = ""
    booking.confirmed_at = timezone.now()
    booking.save(update_fields=["status", "new_requested_date", "new_requested_time", "confirmed_at"])
    gcal = GoogleCalendarService()
    payload = _gcal_booking_payload(booking)
    if booking.gcal_event_id:
        gcal.update_calendar_event(str(booking.barber_id), booking.gcal_event_id, payload)
    else:
        eid = gcal.create_calendar_event(str(booking.barber_id), payload)
        if eid:
            booking.gcal_event_id = eid
            booking.save(update_fields=["gcal_event_id"])
    return Response(_serialize_booking(booking))


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsStaffUser])
def booking_reject_reschedule(request, booking_id):
    if not request.user.is_staff:
        return _forbidden()
    booking = get_object_or_404(_booking_qs(), pk=booking_id)
    if booking.status != "reschedule_requested":
        return Response(
            {"detail": "Booking does not have a pending reschedule request."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    reason = (request.data or {}).get("reason") or ""
    booking.status = "confirmed"
    booking.new_requested_date = None
    booking.new_requested_time = ""
    booking.rejection_reason = str(reason)[:500]
    booking.save(
        update_fields=["status", "new_requested_date", "new_requested_time", "rejection_reason"]
    )
    return Response(_serialize_booking(booking))


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffUser])
def analytics(request):
    if not request.user.is_staff:
        return _forbidden()
    now = timezone.now().astimezone(TZ)
    month_start = date(now.year, now.month, 1)
    if now.month == 12:
        next_month = date(now.year + 1, 1, 1)
    else:
        next_month = date(now.year, now.month + 1, 1)
    week_ago = (now.date() - timedelta(days=7))

    cuts_month = Booking.objects.filter(
        slot__start_at__gte=timezone.make_aware(
            datetime.combine(month_start, datetime.min.time()), TZ
        ),
        slot__start_at__lt=timezone.make_aware(
            datetime.combine(next_month, datetime.min.time()), TZ
        ),
        status__in=("confirmed", "completed", "rescheduled"),
    ).count()

    # busiest day this week (by name)
    dow_counts = Counter()
    for row in (
        Booking.objects.filter(
            slot__start_at__date__gte=week_ago,
            slot__start_at__date__lte=now.date(),
        )
        .values_list("slot__start_at", flat=True)
    ):
        local = timezone.localtime(row, TZ)
        dow_counts[local.strftime("%A")] += 1
    busiest = dow_counts.most_common(1)
    busiest_day = busiest[0][0] if busiest else ""

    # phones with bookings this month
    phones_m = (
        Booking.objects.filter(
            slot__start_at__gte=timezone.make_aware(
                datetime.combine(month_start, datetime.min.time()), TZ
            ),
            slot__start_at__lt=timezone.make_aware(
                datetime.combine(next_month, datetime.min.time()), TZ
            ),
        )
        .values_list("customer_phone", flat=True)
    )
    phone_set_m = {_norm_phone(p) for p in phones_m if p}

    prior_phones = set(
        _norm_phone(p)
        for p in Booking.objects.filter(
            slot__start_at__lt=timezone.make_aware(
                datetime.combine(month_start, datetime.min.time()), TZ
            )
        ).values_list("customer_phone", flat=True)
        if p
    )
    new_customers = sum(1 for p in phone_set_m if p and p not in prior_phones)
    returning_customers = sum(1 for p in phone_set_m if p and p in prior_phones)

    popular = (
        Booking.objects.filter(status__in=("confirmed", "completed", "no_show", "rescheduled"))
        .values("service__name")
        .annotate(c=Count("id"))
        .order_by("-c")
        .first()
    )
    most_popular = popular["service__name"] if popular else ""

    # last 30 days counts
    thirty = now.date() - timedelta(days=30)
    per_day = []
    counts_by_day = {}
    for b in Booking.objects.filter(slot__start_at__date__gte=thirty).values_list(
        "slot__start_at", flat=True
    ):
        d = timezone.localtime(b, TZ).date().isoformat()
        counts_by_day[d] = counts_by_day.get(d, 0) + 1
    cur = thirty
    end_d = now.date()
    while cur <= end_d:
        per_day.append({"date": cur.isoformat(), "count": counts_by_day.get(cur.isoformat(), 0)})
        cur += timedelta(days=1)

    return Response(
        {
            "cuts_this_month": cuts_month,
            "busiest_day_this_week": busiest_day,
            "new_customers_this_month": new_customers,
            "returning_customers_this_month": returning_customers,
            "most_popular_service": most_popular,
            "bookings_per_day": per_day,
        }
    )


def _norm_phone(p: str) -> str:
    return re.sub(r"\D", "", p or "")


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffUser])
def customers_list(request):
    if not request.user.is_staff:
        return _forbidden()
    # Aggregate by normalized phone
    phones = (
        Booking.objects.exclude(customer_phone="")
        .values_list("customer_phone", flat=True)
        .distinct()
    )
    results = []
    for raw in phones:
        key = _norm_phone(raw)
        if not key:
            continue
        qs = Booking.objects.filter(customer_phone=raw).select_related("service")
        visits = qs.count()
        last = qs.order_by("-slot__start_at").first()
        last_visit = last.slot.start_at.isoformat() if last else None
        name = last.customer_name if last else ""
        svc_ids = list(qs.values_list("service_id", flat=True))
        fav = ""
        if svc_ids:
            fav_id = Counter(svc_ids).most_common(1)[0][0]
            fav = Service.objects.filter(id=fav_id).values_list("name", flat=True).first() or ""
        uid = (
            qs.exclude(customer_user_id__isnull=True)
            .values_list("customer_user_id", flat=True)
            .first()
        )
        profile = CustomerProfile.objects.filter(phone=key).first()
        if not profile and key:
            profile = CustomerProfile.objects.filter(phone=raw).first()
        birthday = profile.birthday.isoformat() if profile and profile.birthday else None
        history = [
            {
                "id": str(b.id),
                "slot_start": b.slot.start_at.isoformat(),
                "service_name": b.service.name,
                "status": b.status,
            }
            for b in qs.select_related("slot", "service").order_by("-slot__start_at")[:50]
        ]
        results.append(
            {
                "phone": raw,
                "phone_normalized": key,
                "name": name,
                "total_visits": visits,
                "last_visit": last_visit,
                "favorite_service": fav,
                "customer_user_id": uid,
                "birthday": birthday,
                "booking_history": history,
            }
        )
    results.sort(key=lambda x: x["name"] or x["phone"])
    return Response({"results": results})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsStaffUser])
def customer_notes(request, customer_id: int):
    if not request.user.is_staff:
        return _forbidden()
    from django.contrib.auth import get_user_model

    User = get_user_model()
    customer = get_object_or_404(User, pk=customer_id)
    barber = request.user
    if request.method == "GET":
        note = CustomerNote.objects.filter(customer=customer, barber=barber).first()
        if not note:
            return Response({"note": "", "customer_id": customer_id})
        return Response(
            {
                "note": note.note,
                "customer_id": customer_id,
                "updated_at": note.updated_at.isoformat(),
            }
        )
    body = request.data or {}
    text = (body.get("note") or "").strip()
    note, _ = CustomerNote.objects.update_or_create(
        customer=customer,
        barber=barber,
        defaults={"note": text},
    )
    return Response(
        {
            "note": note.note,
            "customer_id": customer_id,
            "updated_at": note.updated_at.isoformat(),
        }
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsStaffUser])
def blocked_dates_list_create(request):
    if not request.user.is_staff:
        return _forbidden()
    if request.method == "GET":
        rows = BlockedDate.objects.all().order_by("date")
        return Response(
            {
                "results": [
                    {
                        "id": r.id,
                        "date": r.date.isoformat(),
                        "reason": r.reason,
                        "created_at": r.created_at.isoformat(),
                        "gcal_synced": bool(getattr(r, "gcal_event_id", "") or ""),
                    }
                    for r in rows
                ]
            }
        )
    body = request.data or {}
    d = body.get("date")
    reason = (body.get("reason") or "")[:200]
    if not d:
        return Response({"detail": "date required"}, status=400)
    try:
        day = date.fromisoformat(d)
    except ValueError:
        return Response({"detail": "Invalid date"}, status=400)

    row, _ = BlockedDate.objects.update_or_create(
        date=day,
        defaults={"reason": reason, "created_by": request.user},
    )

    gcal = GoogleCalendarService()
    barber = _barber_for_calendar(request)
    gcal_synced = bool(row.gcal_event_id)
    if barber and not row.gcal_event_id:
        eid = gcal.create_all_day_block_event(str(barber.id), day)
        if eid:
            row.gcal_event_id = eid
            row.save(update_fields=["gcal_event_id"])
            gcal_synced = True
    elif barber and row.gcal_event_id:
        gcal_synced = True

    return Response(
        {
            "id": row.id,
            "date": row.date.isoformat(),
            "reason": row.reason,
            "created_at": row.created_at.isoformat(),
            "gcal_synced": gcal_synced,
        },
        status=201,
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsStaffUser])
def blocked_date_delete(request, pk: int):
    if not request.user.is_staff:
        return _forbidden()
    row = get_object_or_404(BlockedDate, pk=pk)
    barber = _barber_for_calendar(request)
    if row.gcal_event_id and barber:
        gcal = GoogleCalendarService()
        gcal.delete_calendar_event(str(barber.id), row.gcal_event_id)
    row.delete()
    return Response(status=204)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsStaffUser])
def customer_profile_birthday(request, phone: str):
    """Set birthday for a phone key (digits)."""
    if not request.user.is_staff:
        return _forbidden()
    key = _norm_phone(phone)
    body = request.data or {}
    bday = body.get("birthday")
    if bday in ("", None):
        CustomerProfile.objects.filter(phone=key).update(birthday=None)
        return Response({"phone": key, "birthday": None})
    try:
        bd = date.fromisoformat(str(bday)[:10])
    except ValueError:
        return Response({"detail": "Invalid birthday"}, status=400)
    profile, _ = CustomerProfile.objects.get_or_create(phone=key)
    profile.birthday = bd
    profile.save(update_fields=["birthday"])
    return Response({"phone": key, "birthday": bd.isoformat()})
