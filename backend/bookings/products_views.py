from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from datetime import datetime, timezone
from .db import db

@api_view(["GET"])
@permission_classes([AllowAny])
def products_list(_req):
    items = []
    for p in db.products.find({"is_active": True}).sort("created_at", -1):
        items.append({
            "id": str(p["_id"]),
            "name": p["name"],
            "price_cents": p["price_cents"],
            "image": p.get("image"),
            "description": p.get("description","")
        })
    return Response(items)
