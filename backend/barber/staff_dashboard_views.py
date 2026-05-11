"""
Additional staff dashboard JSON APIs (is_staff only).
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from zoneinfo import ZoneInfo

from .models import Barber, BlockedDate, Booking


TZ = ZoneInfo("Africa/Johannesburg")

DOW_LABELS = ("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN")


class IsStaffUser(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_staff)


def _forbidden():
    return Response({"detail": "Staff only."}, status=status.HTTP_403_FORBIDDEN)


def _norm_phone(p: str) -> str:
    import re

    return re.sub(r"\D", "", p or "")


def _ramad_barber() -> Barber | None:
    b = Barber.objects.filter(display_name__iexact="Ramad").first()
    if b:
        return b
    return Barber.objects.filter(slug__iexact="ramad").first()


def _month_bounds_local():
    now = timezone.now().astimezone(TZ)
    month_start = date(now.year, now.month, 1)
    if now.month == 12:
        next_month = date(now.year + 1, 1, 1)
    else:
        next_month = date(now.year, now.month + 1, 1)
    start_dt = timezone.make_aware(datetime.combine(month_start, datetime.min.time()), TZ)
    end_dt = timezone.make_aware(datetime.combine(next_month, datetime.min.time()), TZ)
    return now, month_start, next_month, start_dt, end_dt


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffUser])
def dashboard_upcoming(request):
    if not request.user.is_staff:
        return _forbidden()
    start = timezone.now().astimezone(TZ).date()
    blocked_dates = set(
        BlockedDate.objects.filter(
            date__gte=start,
            date__lte=start + timedelta(days=6),
        ).values_list("date", flat=True)
    )
    days_out = []
    for i in range(7):
        d = start + timedelta(days=i)
        cnt = Booking.objects.filter(
            slot__start_at__date=d,
            status="confirmed",
        ).count()
        days_out.append(
            {
                "date": d.isoformat(),
                "day_of_week": DOW_LABELS[d.weekday()],
                "day_number": d.day,
                "count": cnt,
                "is_blocked": d in blocked_dates,
                "is_closed": d.weekday() == 6,
            }
        )
    return Response({"days": days_out})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffUser])
def dashboard_customers_ramad(request):
    if not request.user.is_staff:
        return _forbidden()
    ramad = _ramad_barber()
    if not ramad:
        return Response({"results": []})

    base = (
        Booking.objects.filter(barber=ramad)
        .exclude(status__in=("rejected", "cancelled"))
        .select_related("service", "slot")
    )

    by_norm: defaultdict[str, list] = defaultdict(list)
    for b in base:
        key = _norm_phone(b.customer_phone)
        if not key:
            continue
        by_norm[key].append(b)

    results = []
    for key, bookings in by_norm.items():
        visit_count = len(bookings)
        last = max(bookings, key=lambda x: x.slot.start_at)
        last_visit = timezone.localtime(last.slot.start_at, TZ).date().isoformat()
        name = last.customer_name or ""
        display_phone = last.customer_phone or key
        svc_names = [x.service.name for x in bookings if x.service_id]
        favourite_service = ""
        if svc_names:
            favourite_service = Counter(svc_names).most_common(1)[0][0]
        if visit_count >= 10:
            cust_status = "VIP"
        elif visit_count >= 3:
            cust_status = "Regular"
        else:
            cust_status = "New"
        results.append(
            {
                "name": name,
                "phone": display_phone,
                "visit_count": visit_count,
                "last_visit": last_visit,
                "favourite_service": favourite_service,
                "status": cust_status,
            }
        )
    results.sort(key=lambda x: (x["name"] or x["phone"]).lower())
    return Response({"results": results})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffUser])
def dashboard_analytics_month(request):
    if not request.user.is_staff:
        return _forbidden()

    now, _, _, start_dt, end_dt = _month_bounds_local()

    month_qs = Booking.objects.filter(
        slot__start_at__gte=start_dt,
        slot__start_at__lt=end_dt,
    ).exclude(status__in=("rejected", "cancelled"))

    total_bookings = month_qs.count()

    rev = (
        month_qs.select_related("service")
        .aggregate(total_cents=Sum("service__price_cents"))
    )["total_cents"]
    total_cents = int(rev or 0)
    total_revenue = total_cents / 100.0

    dow_counts: Counter[str] = Counter()
    for row in month_qs.values_list("slot__start_at", flat=True):
        local = timezone.localtime(row, TZ)
        dow_counts[local.strftime("%A")] += 1
    busiest_tuple = dow_counts.most_common(1)
    busiest_day = busiest_tuple[0][0] if busiest_tuple else ""

    service_rows = (
        month_qs.values("service__name")
        .annotate(c=Count("id"))
        .order_by("-c")
    )
    top_services = []
    for row in service_rows:
        svc_name = row["service__name"] or ""
        c = row["c"]
        pct = round(100.0 * c / total_bookings, 1) if total_bookings else 0.0
        top_services.append({"name": svc_name, "count": c, "percentage": pct})

    now_date = now.date()
    daily_start = now_date - timedelta(days=29)
    confirmed_by_local_date = Counter()
    for dt in Booking.objects.filter(
        status="confirmed",
        slot__start_at__date__gte=daily_start,
        slot__start_at__date__lte=now_date,
    ).values_list("slot__start_at", flat=True):
        d_key = timezone.localtime(dt, TZ).date().isoformat()
        confirmed_by_local_date[d_key] += 1
    daily_counts = []
    for offset in range(30):
        d = daily_start + timedelta(days=offset)
        daily_counts.append(
            {"date": d.isoformat(), "count": confirmed_by_local_date.get(d.isoformat(), 0)}
        )

    return Response(
        {
            "total_bookings": total_bookings,
            "total_revenue": total_revenue,
            "busiest_day": busiest_day,
            "top_services": top_services,
            "daily_counts": daily_counts,
        }
    )
