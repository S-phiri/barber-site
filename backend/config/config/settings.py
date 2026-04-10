"""
Django settings for config project (Dev).
Project layout:
  backend/
    ├─ config/
    │   ├─ manage.py
    │   └─ config/   ← THIS file (settings.py)
    ├─ payments/
    ├─ barber/
    └─ .env          ← PayFast + email keys live here
"""

from pathlib import Path
import os, sys
from dotenv import load_dotenv

# -----------------------------------------------------------------------------
# Paths
# -----------------------------------------------------------------------------
# We want BASE_DIR to point to the 'backend' folder (where .env & db.sqlite3 live)
BASE_DIR = Path(__file__).resolve().parent.parent.parent


# ✅ Make sure Python can import apps like "barber" and "payments" from backend/
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Load environment variables from backend/.env
load_dotenv(dotenv_path=BASE_DIR / ".env", override=True)

# -----------------------------------------------------------------------------
# Core
# -----------------------------------------------------------------------------
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-unsafe-secret-key")
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    ".ngrok.io",          # allow any ngrok tunnel
]

# -----------------------------------------------------------------------------
# Applications
# -----------------------------------------------------------------------------
INSTALLED_APPS = [
    # Django defaults
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",  # Add this
    "corsheaders",

    # Local apps
    "payments",
    "barber",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",   # keep high in the stack
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# -----------------------------------------------------------------------------
# Database (SQLite for dev)
# -----------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# -----------------------------------------------------------------------------
# Auth / REST
# -----------------------------------------------------------------------------
REST_FRAMEWORK = {
    # Most public API (bookings, payments) can be unauthenticated.
    # Lock down sensitive views with @permission_classes or DRF settings per-view.
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.AllowAny",),
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
}

# JWT Settings
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

# -----------------------------------------------------------------------------
# Internationalisation
# -----------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Johannesburg"
USE_I18N = True
USE_TZ = True

# -----------------------------------------------------------------------------
# Static / Media (dev)
# -----------------------------------------------------------------------------
STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# -----------------------------------------------------------------------------
# CORS / CSRF (dev)
# -----------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",   # Vite
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "https://*.ngrok.io",
]

# Cookies (dev-friendly)
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = False

# -----------------------------------------------------------------------------
# Email (dev default: print emails to console)
# -----------------------------------------------------------------------------
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587") or 587)
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@localhost")

# -----------------------------------------------------------------------------
# PayFast (read from .env)
# -----------------------------------------------------------------------------
PAYFAST_MODE         = os.getenv("PAYFAST_MODE", "sandbox")
PAYFAST_MERCHANT_ID  = os.getenv("PAYFAST_MERCHANT_ID", "")
PAYFAST_MERCHANT_KEY = os.getenv("PAYFAST_MERCHANT_KEY", "")
PAYFAST_PASSPHRASE   = os.getenv("PAYFAST_PASSPHRASE", "")
PAYFAST_RETURN_URL   = os.getenv("PAYFAST_RETURN_URL", "")
PAYFAST_CANCEL_URL   = os.getenv("PAYFAST_CANCEL_URL", "")
PAYFAST_NOTIFY_URL   = os.getenv("PAYFAST_NOTIFY_URL", "")

# Optional: shop address for ICS feed / emails
SHOP_ADDRESS = os.getenv("SHOP_ADDRESS", "Ramad Barbershop, Cape Town")

# -----------------------------------------------------------------------------
# Google Calendar Integration (read from .env)
# -----------------------------------------------------------------------------
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/barber/google-calendar/callback/")

# -----------------------------------------------------------------------------
# Booking Provider Configuration (read from .env)
# -----------------------------------------------------------------------------
BOOKING_PROVIDER = os.getenv("BOOKING_PROVIDER", "google")  # google, fresha, custom

# Fresha Configuration
FRESHA_BOOKING_URL = os.getenv("FRESHA_BOOKING_URL", "")
