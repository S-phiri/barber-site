from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from barber.models import Slot

class Command(BaseCommand):
    help = "Generate 7 days of 30-min slots for Ramad, 09:00-17:00"

    def handle(self, *args, **kwargs):
        now = timezone.now()
        # start today at 09:00
        start_day = now.replace(hour=9, minute=0, second=0, microsecond=0)
        count = 0
        for d in range(7):
            t = start_day + timedelta(days=d)
            while t.hour < 17:
                Slot.objects.get_or_create(
                    barber_name="Ramad",
                    start=t,
                    end=t + timedelta(minutes=30)
                )
                t += timedelta(minutes=30)
                count += 1
        self.stdout.write(self.style.SUCCESS(f"Generated/ensured {count} slots."))