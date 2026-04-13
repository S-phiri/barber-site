from datetime import date

from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from barber.models import UserAccountProfile


def _serialize_user(u: User) -> dict:
    profile = UserAccountProfile.objects.filter(user=u).first()
    bd = profile.birthday.isoformat() if profile and profile.birthday else None
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "is_staff": u.is_staff,
        "birthday": bd,
    }


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
        username=username,
        email=email,
        password=make_password(password),
        first_name=data.get("first_name", ""),
        last_name=data.get("last_name", ""),
    )
    profile = UserAccountProfile.objects.create(user=user)
    bd_raw = data.get("birthday")
    if bd_raw:
        try:
            profile.birthday = date.fromisoformat(str(bd_raw)[:10])
            profile.save(update_fields=["birthday"])
        except ValueError:
            pass
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": _serialize_user(user),
        },
        status=201,
    )

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
    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": _serialize_user(user),
        },
    )


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(req):
    u = req.user
    if req.method == "GET":
        return Response(_serialize_user(u))
    data = req.data or {}
    profile, _ = UserAccountProfile.objects.get_or_create(user=u)
    bd = data.get("birthday")
    if bd in ("", None):
        profile.birthday = None
    else:
        try:
            profile.birthday = date.fromisoformat(str(bd)[:10])
        except ValueError:
            return Response({"detail": "Invalid birthday format (use YYYY-MM-DD)"}, status=400)
    profile.save()
    return Response(_serialize_user(u))
