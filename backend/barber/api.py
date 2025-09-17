from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceViewSet, SlotViewSet, BookingViewSet, ProductViewSet, OrderViewSet, LoyaltyViewSet

router = DefaultRouter()
router.register(r"services", ServiceViewSet, basename="service")
router.register(r"slots", SlotViewSet, basename="slot")
router.register(r"bookings", BookingViewSet, basename="booking")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"loyalty", LoyaltyViewSet, basename="loyalty")

urlpatterns = [
    path("", include(router.urls)),
]