from rest_framework import serializers
from .models import Service, Slot, Booking, Product, Order, OrderItem, LoyaltyEntry

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = "__all__"

class SlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slot
        fields = "__all__"

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = "__all__"
        read_only_fields = ["user", "status", "created_at", "gcal_event_id"]
    
    def create(self, validated_data):
        # Handle the case where we receive barber_id, service_id, and start
        # instead of slot_id
        if 'barber_id' in validated_data and 'service_id' in validated_data and 'start' in validated_data:
            from .models import Slot, Service
            from django.utils import timezone
            from datetime import datetime
            
            # Find or create a slot for the given start time
            start_time = validated_data.pop('start')
            barber_id = validated_data.pop('barber_id')
            service_id = validated_data.pop('service_id')
            
            # Get the service to calculate duration
            try:
                service = Service.objects.get(id=service_id)
                validated_data['service'] = service
            except Service.DoesNotExist:
                raise serializers.ValidationError("Service not found")
            
            # Parse the start time
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            
            # Calculate end time based on service duration
            duration_minutes = service.duration_min
            end_dt = start_dt + timezone.timedelta(minutes=duration_minutes)
            
            # Find or create the slot
            slot, created = Slot.objects.get_or_create(
                start=start_dt,
                barber_name="Ramad",  # For now, hardcoded to Ramad
                defaults={'end': end_dt}
            )
            
            validated_data['slot'] = slot
            
        return super().create(validated_data)

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = "__all__"

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    class Meta:
        model = Order
        fields = ["id", "user", "total_cents", "is_paid", "created_at", "items"]

class LoyaltyEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyEntry
        fields = "__all__"