import uuid
from django.db import models
from django.conf import settings

class Barber(models.Model):
    """Barber model for the barbershop."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    display_name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    specialties = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_name']

    def __str__(self):
        return self.display_name

class Service(models.Model):
    """Service model for barbershop services."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80, unique=True)
    duration_minutes = models.PositiveIntegerField()
    price_cents = models.PositiveIntegerField()
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class Slot(models.Model):
    """Time slot model for barber availability."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    barber = models.ForeignKey(Barber, on_delete=models.CASCADE)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['start_at']
        constraints = [
            models.UniqueConstraint(fields=["barber", "start_at"], name="unique_barber_slot_start"),
        ]

    def __str__(self):
        return f"{self.barber.display_name} {self.start_at:%Y-%m-%d %H:%M}"

class SlotHold(models.Model):
    """Slot hold model for temporarily reserving slots."""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('released', 'Released'),
        ('converted', 'Converted'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slot = models.OneToOneField(Slot, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Hold for {self.slot} - {self.status}"

class Booking(models.Model):
    """Booking model for appointments."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
        ('no_show', 'No Show'),
        ('cancellation_requested', 'Cancellation Requested'),
        ('reschedule_requested', 'Reschedule Requested'),
        ('rescheduled', 'Rescheduled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slot = models.OneToOneField(Slot, on_delete=models.PROTECT)
    barber = models.ForeignKey(Barber, on_delete=models.PROTECT)
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    customer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings_as_customer',
    )
    customer_name = models.CharField(max_length=100)
    customer_phone = models.CharField(max_length=20)
    customer_email = models.EmailField(blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.CharField(max_length=500, blank=True)
    # Customer-requested reschedule (awaiting staff approval)
    new_requested_date = models.DateTimeField(null=True, blank=True)
    new_requested_time = models.CharField(max_length=32, blank=True)

    # Google Calendar event mapping
    gcal_event_id = models.CharField(max_length=256, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Booking {self.id} - {self.customer_name} ({self.status})"


class CustomerNote(models.Model):
    """Staff notes about a registered customer (linked to User)."""
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='barber_notes_received',
    )
    barber = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notes_written',
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['customer', 'barber'], name='unique_customer_note_per_barber'),
        ]

    def __str__(self):
        return f"Note for {self.customer_id}"


class BlockedDate(models.Model):
    """Per-barber day off — no bookings for this barber on this calendar date."""
    barber = models.ForeignKey(Barber, on_delete=models.CASCADE, null=True, blank=True)
    date = models.DateField()
    reason = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    gcal_event_id = models.CharField(
        max_length=256,
        blank=True,
        default="",
        help_text="Google Calendar event id for all-day block (primary calendar)",
    )

    class Meta:
        ordering = ['date']
        constraints = [
            models.UniqueConstraint(fields=["barber", "date"], name="unique_blocked_date_per_barber"),
        ]

    def __str__(self):
        return f"Blocked {self.date}"


class CustomerProfile(models.Model):
    """Optional profile keyed by phone for birthday / linking to User."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='barber_customer_profile',
    )
    phone = models.CharField(max_length=20, unique=True)
    birthday = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['phone']

    def __str__(self):
        return self.phone


class UserAccountProfile(models.Model):
    """Registered customer web account — birthday for dashboard promos."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bbit_account",
    )
    birthday = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User account profile"

    def __str__(self):
        return f"Profile {self.user_id}"


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