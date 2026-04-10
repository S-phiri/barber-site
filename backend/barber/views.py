from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseRedirect
from django.utils.decorators import method_decorator
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from django.db import transaction
from .models import Service, Slot, Booking, Product, Order, OrderItem, LoyaltyEntry
from . import serializers_barbers as s

from .google_calendar import GoogleCalendarService

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
            from django.utils import timezone
            from datetime import datetime
            try:
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
                queryset = queryset.filter(start__date=date_obj)
            except ValueError:
                pass  # Invalid date format, ignore filter
        
        # Note: service_id filtering would require a relationship between Slot and Service
        # For now, we'll ignore this filter since slots don't have a direct service relationship
        
        return queryset

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related("service", "slot").all().order_by("-created_at")
    serializer_class = s.BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        # Automatically set the user to the current authenticated user
        serializer.save(user=self.request.user)
    
    def get_queryset(self):
        # Users can only see their own bookings
        return super().get_queryset().filter(user=self.request.user)

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
