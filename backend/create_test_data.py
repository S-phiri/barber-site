#!/usr/bin/env python
"""
Script to create test data for the barbershop app.
Run this from the Django project root: python manage.py shell < create_test_data.py
"""
import os
import django
from datetime import datetime, timedelta, timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from barber.default_services import DEFAULT_SERVICES
from barber.models import Barber, Service, Slot

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
    
    for row in DEFAULT_SERVICES:
        service, _ = Service.objects.update_or_create(
            name=row["name"],
            defaults={
                "duration_minutes": row["duration_minutes"],
                "price_cents": row["price_cents"],
                "active": True,
            },
        )
        print(f"Service: {service}")
    
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
