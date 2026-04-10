from django.contrib import admin
from .models import Barber, Service, Slot, SlotHold, Booking, Product, Order, OrderItem, LoyaltyEntry, GoogleToken


@admin.register(Barber)
class BarberAdmin(admin.ModelAdmin):
    list_display = ("id", "display_name", "slug", "phone", "is_active", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("display_name", "slug", "phone")
    readonly_fields = ("id", "created_at")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "duration_minutes", "price_cents", "active", "created_at")
    list_filter = ("active", "created_at")
    search_fields = ("name",)
    readonly_fields = ("id", "created_at")


@admin.register(Slot)
class SlotAdmin(admin.ModelAdmin):
    list_display = ("id", "barber", "start_at", "end_at", "is_available", "created_at")
    list_filter = ("is_available", "barber", "start_at", "created_at")
    search_fields = ("barber__display_name",)
    readonly_fields = ("id", "created_at")


@admin.register(SlotHold)
class SlotHoldAdmin(admin.ModelAdmin):
    list_display = ("id", "slot", "user", "status", "expires_at", "created_at")
    list_filter = ("status", "expires_at", "created_at")
    search_fields = ("slot__barber__display_name", "user__username")
    readonly_fields = ("id", "created_at")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id", "customer_name", "barber", "service", "slot", "status", "created_at")
    list_filter = ("status", "barber", "service", "created_at")
    search_fields = ("customer_name", "customer_phone", "barber__display_name", "service__name")
    readonly_fields = ("id", "created_at")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "price_cents", "stock")
    list_filter = ("stock",)
    search_fields = ("name",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "total_cents", "is_paid", "created_at")
    list_filter = ("is_paid", "created_at")
    search_fields = ("user__username", "user__email")
    readonly_fields = ("id", "created_at")


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "product", "qty", "line_total_cents")
    list_filter = ("product",)
    search_fields = ("order__user__username", "product__name")


@admin.register(LoyaltyEntry)
class LoyaltyEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "points", "reason", "created_at")
    list_filter = ("points", "created_at")
    search_fields = ("user__username", "reason")
    readonly_fields = ("id", "created_at")


@admin.register(GoogleToken)
class GoogleTokenAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "created_at", "updated_at")
    list_filter = ("created_at", "updated_at")
    search_fields = ("label",)
    readonly_fields = ("id", "created_at", "updated_at")