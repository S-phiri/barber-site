from django.contrib import admin
from .models import Order, Payment


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'amount_cents', 'currency', 'status', 'slot_ref', 'created_at']
    list_filter = ['status', 'currency', 'created_at']
    search_fields = ['id', 'user__username', 'slot_ref', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'provider', 'status', 'pf_payment_id', 'created_at']
    list_filter = ['status', 'provider', 'created_at']
    search_fields = ['id', 'order__id', 'pf_payment_id']
    readonly_fields = ['id', 'created_at', 'raw_payload']
    ordering = ['-created_at']
