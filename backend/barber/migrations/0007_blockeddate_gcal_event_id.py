from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("barber", "0006_user_account_profile"),
    ]

    operations = [
        migrations.AddField(
            model_name="blockeddate",
            name="gcal_event_id",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Google Calendar event id for all-day block (primary calendar)",
                max_length=256,
            ),
        ),
    ]
