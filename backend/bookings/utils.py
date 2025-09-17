from datetime import datetime, timedelta, date, time
from typing import List

def generate_slots(day: date, open_time: time, close_time: time, duration_min: int = 45, step_min: int = 45) -> List[str]:
    """Return list of HH:MM starts such that start + duration <= close_time."""
    start_dt = datetime.combine(day, open_time)
    end_dt   = datetime.combine(day, close_time)
    dur = timedelta(minutes=duration_min)
    step = timedelta(minutes=step_min)

    slots = []
    cur = start_dt
    while cur + dur <= end_dt:
        slots.append(cur.strftime("%H:%M"))
        cur += step
    return slots
