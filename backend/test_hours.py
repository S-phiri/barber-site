from bookings.hours import get_hours_for_weekday
from bookings.utils import generate_slots
from datetime import date

# Test different weekdays
test_dates = [
    (date(2024, 1, 15), 'Monday'),
    (date(2024, 1, 16), 'Tuesday'), 
    (date(2024, 1, 17), 'Wednesday'),
    (date(2024, 1, 18), 'Thursday'),
    (date(2024, 1, 19), 'Friday'),
    (date(2024, 1, 20), 'Saturday'),
    (date(2024, 1, 21), 'Sunday')
]

for day, day_name in test_dates:
    weekday = day.weekday()
    open_time, close_time = get_hours_for_weekday(weekday)
    
    if open_time is None:
        print(f'{day_name} ({day}): CLOSED')
    else:
        slots = generate_slots(day, open_time, close_time, 45, 45)
        last_slot = slots[-1] if slots else 'None'
        print(f'{day_name} ({day}): {open_time.strftime("%H:%M")}-{close_time.strftime("%H:%M")} | {len(slots)} slots | Last: {last_slot}')
