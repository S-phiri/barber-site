from datetime import time

def get_hours_for_weekday(weekday: int):
    # Mon=0 ... Sun=6
    if weekday in (0,1,2,3,4):  # Mon–Fri
        return time(9,0), time(18,0)
    if weekday == 5:            # Sat
        return time(9,0), time(16,0)
    return None, None           # Sun closed
