from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from datetime import datetime, timezone
from barber.models import Product

@api_view(["GET"])
@permission_classes([AllowAny])
def products_list(_req):
    """Get all active products."""
    products = Product.objects.filter(stock__gt=0).order_by('-id')
    items = []
    for p in products:
        items.append({
            "id": str(p.id),
            "name": p.name,
            "price_cents": p.price_cents,
            "image": None,  # Product model doesn't have image field yet
            "description": ""  # Product model doesn't have description field yet
        })
    return Response(items)
