from django.db import models
from django.conf import settings

class Service(models.Model):
    name = models.CharField(max_length=80, unique=True)
    duration_min = models.PositiveIntegerField()
    price_cents = models.PositiveIntegerField()

    def __str__(self):
        return self.name

class Slot(models.Model):
    start = models.DateTimeField()
    end = models.DateTimeField()
    barber_name = models.CharField(max_length=80, default="Ramad")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["barber_name", "start"], name="unique_barber_slot_start"),
        ]

    def __str__(self):
        return f"{self.barber_name} {self.start:%Y-%m-%d %H:%M}"

class Booking(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    slot = models.OneToOneField(Slot, on_delete=models.PROTECT)  # one booking per slot
    status = models.CharField(max_length=20, default="confirmed")
    created_at = models.DateTimeField(auto_now_add=True)

    # Google Calendar event mapping
    gcal_event_id = models.CharField(max_length=256, blank=True, null=True)

class Product(models.Model):
    name = models.CharField(max_length=120)
    price_cents = models.PositiveIntegerField()
    stock = models.PositiveIntegerField(default=0)

class Order(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    total_cents = models.PositiveIntegerField(default=0)
    is_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty = models.PositiveIntegerField()
    line_total_cents = models.PositiveIntegerField()

class LoyaltyEntry(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    points = models.IntegerField()
    reason = models.CharField(max_length=160)
    created_at = models.DateTimeField(auto_now_add=True)

class GoogleToken(models.Model):
    """Stores OAuth refresh token for the barber's Google account."""
    label = models.CharField(max_length=64, default="barber", unique=True)
    refresh_token = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)