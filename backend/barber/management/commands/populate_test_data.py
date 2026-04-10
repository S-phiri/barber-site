from django.core.management.base import BaseCommand
from datetime import datetime, timedelta, timezone
from barber.models import Barber, Service, Slot


class Command(BaseCommand):
    help = 'Populate test data for barbershop'

    def handle(self, *args, **options):
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
        self.stdout.write(f"Barber: {barber}")

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
            self.stdout.write(f"Service: {service}")

        # Create test slots for today and tomorrow
        now = datetime.now(timezone.utc)
        for day_offset in range(2):  # Today and tomorrow
            day = now.date() + timedelta(days=day_offset)

            # Create slots for each day (9 AM to 6 PM, 45-minute slots)
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
                        self.stdout.write(f"Slot: {slot}")

        self.stdout.write(self.style.SUCCESS('Test data created successfully!'))
