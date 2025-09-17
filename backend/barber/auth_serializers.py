from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Accepts either {"username","password"} or {"email","password"}.
    Also normalizes case so 'ryan' == 'Ryan' and emails match case-insensitively.
    """
    def validate(self, attrs):
        data = self.initial_data or {}
        email = (data.get("email") or "").strip()
        uname = (data.get("username") or "").strip()

        if email and not uname:
            u = User.objects.filter(email__iexact=email).first()
            if u:
                attrs["username"] = getattr(u, User.USERNAME_FIELD)

        if uname:
            u2 = User.objects.filter(**{f"{User.USERNAME_FIELD}__iexact": uname}).first()
            if u2:
                # Normalize to the stored username so auth succeeds
                attrs["username"] = getattr(u2, User.USERNAME_FIELD)

        return super().validate(attrs)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("username", "email", "password")

    def validate_username(self, v):
        if User.objects.filter(username__iexact=v).exists():
            raise serializers.ValidationError("Username already taken.")
        return v

    def validate_email(self, v):
        if v and User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError("Email already in use.")
        return v

    def create(self, validated_data):
        user = User(username=validated_data["username"], email=(validated_data.get("email") or "").strip())
        user.set_password(validated_data["password"])
        user.save()
        return user

    def to_representation(self, instance):
        refresh = RefreshToken.for_user(instance)
        return {
            "user": {"id": instance.id, "username": instance.username, "email": instance.email},
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
