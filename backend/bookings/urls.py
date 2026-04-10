from django.urls import path
from . import views
from . import auth_views, dashboard_views, products_views
from .views import slots


urlpatterns = [
    # existing
    path("services/", views.services_list),
    path("barbers/", views.barbers_list),
    path("barbers/<str:slug>/", views.barber_by_slug),
    path("time-slots", views.time_slots_list),
    path("time-slots/<str:slot_id>/hold/", views.time_slot_hold),
    path("bookings/", views.booking_create),
    path("bookings/me/", views.bookings_me),
    path("checkout/", views.checkout),
    path("slots/", slots),  # ← NO extra 'api/' here


    # auth
    path("auth/register/", auth_views.register),
    path("auth/login/", auth_views.login),
    path("auth/me/", auth_views.me),

    # dashboard & products
    path("me/dashboard/", dashboard_views.dashboard),
    path("products/", products_views.products_list),
]