import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings   # 👈 add this


User = get_user_model()


class Order(models.Model):
    """Payment order for a booking slot."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="payment_orders",
    )
    amount_cents = models.PositiveIntegerField(help_text="Amount in cents")
    currency = models.CharField(max_length=3, default="ZAR")
    description = models.CharField(max_length=255)
    slot_ref = models.CharField(max_length=100, help_text="Reference to the booking slot")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Order {self.id} - {self.status} - {self.amount_cents/100:.2f} {self.currency}"

class Payment(models.Model):
    """Payment record for tracking PayFast transactions."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    provider = models.CharField(max_length=20, default="payfast")
    pf_payment_id = models.CharField(max_length=100, blank=True, null=True, help_text="PayFast payment ID")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    raw_payload = models.JSONField(default=dict, help_text="Raw PayFast webhook payload")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.id} - {self.status} - Order {self.order.id}"
