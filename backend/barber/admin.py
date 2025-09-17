from django.contrib import admin
from .models import Service, Slot, Booking, Product, Order, OrderItem, LoyaltyEntry, GoogleToken

admin.site.register(Service)
admin.site.register(Slot)
admin.site.register(Booking)
admin.site.register(Product)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(LoyaltyEntry)
admin.site.register(GoogleToken)