# BBIT — Barbershop Booking & Management

BBIT is a barbershop booking and management platform built for **Ramad’s Barbershop** in **Cape Town**. It gives clients a smooth way to book online and gives the shop tools to run day-to-day operations from one place.

## What it does

- **Online booking wizard** — Clients pick services, staff, and time slots through a guided flow.
- **Barber dashboard** — Staff manage appointments, availability, and shop-specific workflows.
- **Google Calendar sync** — Bookings integrate with Google Calendar so the schedule stays accurate across tools.
- **WhatsApp notifications** — Customers can be reached on WhatsApp for confirmations and updates (where configured).

## Tech stack

| Layer | Technology |
|--------|------------|
| Frontend | React, TypeScript |
| Backend | Django, Django REST Framework |
| Integrations | Google Calendar API |

## Run locally

### Frontend

From the repository root:

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
python manage.py runserver
```

Use a virtual environment and install Python dependencies from `backend/requirements.txt` if you have not already.

## Environment setup

Secrets and integration keys must **never** be committed.

1. Copy the example env file:

   ```bash
   cp backend/.env.example backend/.env
   ```

   On Windows (PowerShell):

   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

2. Open `backend/.env` and fill in the values for your environment (database, Google OAuth / Calendar, WhatsApp or messaging providers, etc.).

3. Keep `backend/.env` local only — it is listed in `.gitignore`.

---

*Built for Ramad’s Barbershop, Cape Town.*
