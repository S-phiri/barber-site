"""
Booking views with Google Calendar integration
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Barber, Service, Booking, Slot
from .google_calendar import GoogleCalendarService
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_booking(request):
    """
    Create a new booking and sync to Google Calendar
    """
    try:
        data = request.data
        
        # Validate required fields
        required_fields = ['service_id', 'barber_id', 'customer_name', 'customer_phone', 'start_time']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {"error": f"Missing required field: {field}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get service and barber
        try:
            service = Service.objects.get(id=data['service_id'])
            barber = Barber.objects.get(id=data['barber_id'])
        except (Service.DoesNotExist, Barber.DoesNotExist):
            return Response(
                {"error": "Invalid service or barber ID"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse start time
        start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
        end_time = start_time + timedelta(minutes=service.duration_minutes)
        
        # Create time slot
        slot = Slot.objects.create(
            barber=barber,
            start_at=start_time,
            end_at=end_time,
            is_available=False  # This slot is now booked
        )
        
        # Create booking
        booking = Booking.objects.create(
            slot=slot,
            barber=barber,
            service=service,
            customer_name=data['customer_name'],
            customer_phone=data['customer_phone'],
            customer_email=data.get('customer_email', ''),
            notes=data.get('notes', ''),
            status='confirmed'
        )
        
        # Sync to Google Calendar
        calendar_service = GoogleCalendarService()
        booking_data = {
            'start_time': start_time.isoformat(),
            'duration_minutes': service.duration_minutes,
            'service_name': service.name,
            'customer_name': data['customer_name'],
            'customer_phone': data['customer_phone'],
            'customer_email': data.get('customer_email', ''),
            'notes': data.get('notes', ''),
            'barber_name': barber.display_name
        }
        
        # Create calendar event
        event_id = calendar_service.create_calendar_event(str(barber.id), booking_data)
        if event_id:
            booking.gcal_event_id = event_id
            booking.save()
            logger.info(f"Created Google Calendar event {event_id} for booking {booking.id}")
        else:
            logger.warning(f"Failed to create Google Calendar event for booking {booking.id}")
        
        return Response({
            "success": True,
            "booking_id": str(booking.id),
            "message": "Booking created successfully and synced to calendar",
            "calendar_event_id": event_id
        })
        
    except Exception as e:
        logger.error(f"Error creating booking: {e}")
        return Response(
            {"error": "Failed to create booking"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_bookings(request):
    """
    Get bookings for the authenticated user
    """
    try:
        # For now, we'll get bookings by customer name/phone
        # In a real app, you'd link users to bookings
        customer_name = request.query_params.get('customer_name')
        customer_phone = request.query_params.get('customer_phone')
        
        if not customer_name and not customer_phone:
            return Response(
                {"error": "Customer name or phone required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        bookings_query = Booking.objects.filter(status='confirmed')
        
        if customer_name:
            bookings_query = bookings_query.filter(customer_name__icontains=customer_name)
        if customer_phone:
            bookings_query = bookings_query.filter(customer_phone=customer_phone)
        
        bookings = bookings_query.order_by('-slot__start_at')
        
        booking_list = []
        for booking in bookings:
            booking_list.append({
                'id': str(booking.id),
                'service_name': booking.service.name,
                'barber_name': booking.barber.display_name,
                'start_time': booking.slot.start_at.isoformat(),
                'end_time': booking.slot.end_at.isoformat(),
                'status': booking.status,
                'notes': booking.notes,
                'calendar_event_id': booking.gcal_event_id
            })
        
        return Response(booking_list)
        
    except Exception as e:
        logger.error(f"Error fetching bookings: {e}")
        return Response(
            {"error": "Failed to fetch bookings"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_booking(request, booking_id):
    """
    Update a booking and sync changes to Google Calendar
    """
    try:
        booking = Booking.objects.get(id=booking_id)
        data = request.data
        
        # Update booking fields
        if 'customer_name' in data:
            booking.customer_name = data['customer_name']
        if 'customer_phone' in data:
            booking.customer_phone = data['customer_phone']
        if 'customer_email' in data:
            booking.customer_email = data['customer_email']
        if 'notes' in data:
            booking.notes = data['notes']
        
        booking.save()
        
        # Update Google Calendar event if it exists
        if booking.gcal_event_id:
            calendar_service = GoogleCalendarService()
            booking_data = {
                'start_time': booking.slot.start_at.isoformat(),
                'duration_minutes': booking.service.duration_minutes,
                'service_name': booking.service.name,
                'customer_name': booking.customer_name,
                'customer_phone': booking.customer_phone,
                'customer_email': getattr(booking, 'customer_email', ''),
                'notes': booking.notes,
                'barber_name': booking.barber.display_name
            }
            
            success = calendar_service.update_calendar_event(
                str(booking.barber.id), 
                booking.gcal_event_id, 
                booking_data
            )
            
            if not success:
                logger.warning(f"Failed to update Google Calendar event {booking.gcal_event_id}")
        
        return Response({
            "success": True,
            "message": "Booking updated successfully"
        })
        
    except Booking.DoesNotExist:
        return Response(
            {"error": "Booking not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error updating booking: {e}")
        return Response(
            {"error": "Failed to update booking"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancel_booking(request, booking_id):
    """
    Cancel a booking and remove from Google Calendar
    """
    try:
        booking = Booking.objects.get(id=booking_id)
        
        # Cancel the booking
        booking.status = 'cancelled'
        booking.save()
        
        # Remove from Google Calendar
        if booking.gcal_event_id:
            calendar_service = GoogleCalendarService()
            success = calendar_service.delete_calendar_event(
                str(booking.barber.id), 
                booking.gcal_event_id
            )
            
            if success:
                logger.info(f"Deleted Google Calendar event {booking.gcal_event_id}")
            else:
                logger.warning(f"Failed to delete Google Calendar event {booking.gcal_event_id}")
        
        return Response({
            "success": True,
            "message": "Booking cancelled successfully"
        })
        
    except Booking.DoesNotExist:
        return Response(
            {"error": "Booking not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error cancelling booking: {e}")
        return Response(
            {"error": "Failed to cancel booking"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
