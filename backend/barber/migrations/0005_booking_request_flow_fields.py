# Generated manually for request-based booking flow

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("barber", "0004_barber_dashboard_models"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="confirmed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="cancelled_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="rejection_reason",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="booking",
            name="new_requested_date",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="new_requested_time",
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AlterField(
            model_name="booking",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("confirmed", "Confirmed"),
                    ("cancelled", "Cancelled"),
                    ("rejected", "Rejected"),
                    ("completed", "Completed"),
                    ("no_show", "No Show"),
                    ("cancellation_requested", "Cancellation Requested"),
                    ("reschedule_requested", "Reschedule Requested"),
                    ("rescheduled", "Rescheduled"),
                ],
                default="pending",
                max_length=32,
            ),
        ),
    ]
