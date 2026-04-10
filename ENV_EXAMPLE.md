# Environment Variables Example

Create a `.env.local` file in your project root with these variables:

```bash
# Booking Provider Configuration
VITE_BOOKING_PROVIDER=google-embed

# Google Calendar Configuration
VITE_GCAL_TZ=Africa/Johannesburg

# Per-barber Appointment Schedule links (public):
# Get these from Google Calendar > Appointment Schedules > Copy link
VITE_GCAL_APPT_RAMAD=https://calendar.app.google/your-ramad-appointment-link

# Optional: Full calendar embed URLs (if you want calendar view in modal iframe)
VITE_GCAL_EMBED_RAMAD=https://calendar.google.com/calendar/embed?src=your-ramad-calendar-id&ctz=Africa%2FJohannesburg

# Existing Fresha Configuration (keep for other providers)
VITE_FRESHA_URL=https://www.fresha.com/book-now/best-barber-in-town-ygfwor2k/all-offer?share=true&pId=2668367

# API Configuration
VITE_API_URL=http://localhost:8000

# PayFast Configuration
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=your_passphrase
PAYFAST_MODE=sandbox

# Server Configuration
PUBLIC_BASE_URL=http://localhost:5173
SERVER_BASE_URL=http://localhost:5174
```

## How to Get Google Appointment Schedule Links:

1. Go to [Google Calendar](https://calendar.google.com)
2. Click the "+" button and select "Appointment schedule"
3. Set up your appointment schedule with:
   - Duration (e.g., 45 minutes for haircuts)
   - Available times
   - Services (optional)
4. Click "Save"
5. Copy the "Booking page" link
6. Use that link as your `VITE_GCAL_APPT_RAMAD` value

## Testing Different Providers:

- `VITE_BOOKING_PROVIDER=google-embed` - Use Google Appointment Schedule modal
- `VITE_BOOKING_PROVIDER=custom` - Use existing custom booking flow
- `VITE_BOOKING_PROVIDER=fresha` - Use Fresha integration
