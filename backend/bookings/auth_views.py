from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

@api_view(["POST"])
@permission_classes([AllowAny])
def register(req):
    data = req.data or {}
    username = (data.get("username") or "").strip().lower()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return Response({"detail": "username and password required"}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"detail": "username taken"}, status=409)
    user = User.objects.create(
        username=username, email=email, password=make_password(password), first_name=data.get("first_name",""), last_name=data.get("last_name","")
    )
    refresh = RefreshToken.for_user(user)
    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {"id": user.id, "username": user.username, "email": user.email}
    }, status=201)

@api_view(["POST"])
@permission_classes([AllowAny])
def login(req):
    data = req.data or {}
    username = (data.get("username") or "").strip().lower()
    password = data.get("password") or ""
    try:
        user = User.objects.get(username=username)
        if not user.check_password(password):
            raise Exception()
    except Exception:
        return Response({"detail": "Invalid credentials"}, status=401)
    refresh = RefreshToken.for_user(user)
    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {"id": user.id, "username": user.username, "email": user.email}
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(req):
    u = req.user
    return Response({"id": u.id, "username": u.username, "email": u.email})
