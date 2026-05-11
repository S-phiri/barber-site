web: cd backend/config && python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
