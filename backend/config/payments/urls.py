from django.urls import path
from . import views

urlpatterns = [
    path("ping/", views.ping, name="payments-ping"),
    path("checkout/", views.checkout, name="payments-checkout"),
    path("notify/", views.notify, name="payments-notify"),
    path("order/<uuid:order_id>/status/", views.order_status, name="payments-order-status"),
]
