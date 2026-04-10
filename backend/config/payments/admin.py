from django.contrib import admin
from .models import Order, Payment


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "amount_cents", "created_at")
    list_filter = ("status",)
    search_fields = ("id", "user__username")
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "status", "provider", "created_at")
    list_filter = ("status", "provider")
    search_fields = ("id", "order__id")
    readonly_fields = ['id', 'created_at', 'raw_payload']
    ordering = ['-created_at']
