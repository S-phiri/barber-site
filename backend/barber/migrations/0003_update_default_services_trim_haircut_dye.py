# Re-seed default services: Trim 30m, Haircut 45m, Dye + Haircut 60m (prices TBD = 0).

import uuid

from django.db import migrations

# Keep in sync with barber.default_services.DEFAULT_SERVICES
_DEFAULT_ROWS = (
    ("Trim", 30, 0),
    ("Haircut", 45, 0),
    ("Dye + Haircut", 60, 0),
)


def _clear_barber_scheduling_tables(schema_editor):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("DELETE FROM barber_booking")
        cursor.execute("DELETE FROM barber_slothold")
        cursor.execute("DELETE FROM barber_slot")
        cursor.execute("DELETE FROM barber_service")


def forwards(apps, schema_editor):
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


def backwards(apps, schema_editor):
    Service = apps.get_model("barber", "Service")
    names = [row[0] for row in _DEFAULT_ROWS]
    Service.objects.filter(name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("barber", "0002_seed_default_services"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
