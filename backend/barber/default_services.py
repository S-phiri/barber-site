"""
Canonical default services for BBIT.
Used by management commands; seeded by migrations 0002+ (see latest barber data migration).
"""

DEFAULT_SERVICES = [
    {"name": "Trim", "duration_minutes": 30, "price_cents": 0},
    {"name": "Haircut", "duration_minutes": 45, "price_cents": 0},
    {"name": "Dye + Haircut", "duration_minutes": 60, "price_cents": 0},
]
