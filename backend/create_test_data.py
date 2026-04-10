#!/usr/bin/env python
"""
Script to create test data for the barbershop app.
Run this from the Django project root: python manage.py shell < create_test_data.py
"""
import os
import sys
import django
from datetime import datetime, timedelta, timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from barber.models import Barber, Service, Slot, Booking
from django.contrib.auth import get_user_model

User = get_user_model()

def create_test_data():
    print("Creating test data...")
    
    # Create a test barber
    barber, created = Barber.objects.get_or_create(
        slug='ramad',
        defaults={
            'display_name': 'Ramad',
            'phone': '+1234567890',
            'specialties': ['fades', 'beards'],
            'is_active': True
        }
    )
    print(f"Barber created: {barber}")
    
    # Create test services
    services_data = [
        {'name': 'Skin Fade', 'duration_minutes': 45, 'price_cents': 20000},
        {'name': 'Beard Trim', 'duration_minutes': 30, 'price_cents': 15000},
        {'name': 'Full Service', 'duration_minutes': 75, 'price_cents': 35000},
    ]
    
    for service_data in services_data:
        service, created = Service.objects.get_or_create(
            name=service_data['name'],
            defaults=service_data
        )
        print(f"Service created: {service}")
    
    # Create test slots for the next few days
    now = datetime.now(timezone.utc)
    for day_offset in range(7):  # Next 7 days
        day = now.date() + timedelta(days=day_offset)
        
        # Create slots for each day (9 AM to 6 PM, 45-minute slots)
        start_time = datetime.combine(day, datetime.min.time().replace(hour=9, minute=0))
        start_time = start_time.replace(tzinfo=timezone.utc)
        
        for hour in range(9, 18):  # 9 AM to 5 PM
            for minute in [0, 45]:  # Every 45 minutes
                if hour == 17 and minute == 45:  # Skip 5:45 PM
                    continue
                    
                slot_start = datetime.combine(day, datetime.min.time().replace(hour=hour, minute=minute))
                slot_start = slot_start.replace(tzinfo=timezone.utc)
                slot_end = slot_start + timedelta(minutes=45)
                
                slot, created = Slot.objects.get_or_create(
                    barber=barber,
                    start_at=slot_start,
                    defaults={
                        'end_at': slot_end,
                        'is_available': True
                    }
                )
                if created:
                    print(f"Slot created: {slot}")
    
    print("Test data creation completed!")

if __name__ == '__main__':
    create_test_data()
