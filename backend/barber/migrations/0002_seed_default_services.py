# Data migration: replace all services with BBIT defaults (prices TBD = 0).

import uuid

from django.db import migrations


# Keep in sync with barber.default_services.DEFAULT_SERVICES
_DEFAULT_ROWS = (
    ("Beard Trim", 30, 0),
    ("Haircut", 60, 0),
    ("Dye + Haircut", 90, 0),
)


def _clear_barber_scheduling_tables(schema_editor):
    """
    Raw DELETE avoids ORM collectors touching Booking rows when the DB schema
    is out of sync with current models.
    """
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("DELETE FROM barber_booking")
        cursor.execute("DELETE FROM barber_slothold")
        cursor.execute("DELETE FROM barber_slot")
        cursor.execute("DELETE FROM barber_service")


def seed_default_services(apps, schema_editor):
    """
    Remove existing services (and dependent booking rows) so only the three defaults exist.
    WARNING: Deletes all bookings and slots to clear FKs to Service/Slot.
    """
    _clear_barber_scheduling_tables(schema_editor)

    Service = apps.get_model("barber", "Service")
    for name, duration_minutes, price_cents in _DEFAULT_ROWS:
        Service.objects.create(
            id=uuid.uuid4(),
            name=name,
            duration_minutes=duration_minutes,
            price_cents=price_cents,
            active=True,
        )


def unseed_default_services(apps, schema_editor):
    Service = apps.get_model("barber", "Service")
    names = [row[0] for row in _DEFAULT_ROWS]
    Service.objects.filter(name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("barber", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_default_services, unseed_default_services),
    ]
