from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseRedirect
from django.utils.decorators import method_decorator
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.decorators import action
from django.utils import timezone
from zoneinfo import ZoneInfo
from datetime import datetime
from .models import Service, Slot, Booking, Product, Order, OrderItem, LoyaltyEntry
from . import serializers_barbers as s

@staff_member_required
def gcal_start_auth(request):
    # For now, redirect to admin page - barbers will use the new auth flow
    return HttpResponseRedirect('/admin/')

def gcal_callback(request):
    # This is handled by the new google_auth_views
    return HttpResponseRedirect('/admin/')

class ReadOnlyOrAuthenticated(permissions.IsAuthenticatedOrReadOnly):
    pass

class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Service.objects.all().order_by("name")
    serializer_class = s.ServiceSerializer

class SlotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Slot.objects.all().order_by("start_at")
    serializer_class = s.SlotSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by barber_id
        barber_id = self.request.query_params.get('barber_id')
        if barber_id:
            queryset = queryset.filter(barber_id=barber_id)
        
        # Filter by date
        date = self.request.query_params.get('date')
        if date:
            from datetime import datetime
            try:
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
                queryset = queryset.filter(start_at__date=date_obj)
            except ValueError:
                pass  # Invalid date format, ignore filter
        
        # Note: service_id filtering would require a relationship between Slot and Service
        # For now, we'll ignore this filter since slots don't have a direct service relationship
        
        return queryset

TZ_JHB = ZoneInfo("Africa/Johannesburg")


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related("service", "slot", "barber").all().order_by("-created_at")
    serializer_class = s.BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options", "patch"]

    def perform_create(self, serializer):
        serializer.save(customer_user=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_staff:
            return qs
        return qs.filter(customer_user=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied("Use the booking actions to update your appointment.")
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["patch"], url_path="request-cancellation")
    def request_cancellation(self, request, pk=None):
        booking = self.get_object()
        if booking.customer_user_id != request.user.id:
            raise PermissionDenied()
        if booking.status not in ("confirmed", "rescheduled"):
            raise ValidationError(
                {"detail": "Only confirmed appointments can request cancellation."}
            )
        booking.status = "cancellation_requested"
        booking.save(update_fields=["status"])
        return Response(s.BookingSerializer(booking).data)

    @action(detail=True, methods=["patch"], url_path="request-reschedule")
    def request_reschedule(self, request, pk=None):
        booking = self.get_object()
        if booking.customer_user_id != request.user.id:
            raise PermissionDenied()
        if booking.status not in ("confirmed", "rescheduled"):
            raise ValidationError(
                {"detail": "Only confirmed appointments can request a reschedule."}
            )
        new_start = (request.data or {}).get("new_start")
        if not new_start:
            raise ValidationError({"new_start": "Required ISO datetime string."})
        try:
            dt = datetime.fromisoformat(str(new_start).replace("Z", "+00:00"))
        except ValueError as e:
            raise ValidationError({"new_start": str(e)}) from e
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, TZ_JHB)
        new_time = (request.data or {}).get("new_time") or ""
        booking.new_requested_date = dt
        booking.new_requested_time = str(new_time)[:32]
        booking.status = "reschedule_requested"
        booking.save(
            update_fields=["new_requested_date", "new_requested_time", "status"]
        )
        return Response(s.BookingSerializer(booking).data)

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.all().order_by("name")
    serializer_class = s.ProductSerializer

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.prefetch_related("items").all().order_by("-created_at")
    serializer_class = s.OrderSerializer
    # ...

class LoyaltyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LoyaltyEntry.objects.all().order_by("-created_at")
    serializer_class = s.LoyaltyEntrySerializer
