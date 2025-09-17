export interface Service {
  id: number;
  name: string;
  duration_min: number;
  price_cents: number;
}

export interface Barber {
  id: number;
  name: string;
  display_name: string;
  slug: string;
  specialties: string[];
}

export interface TimeSlot {
  id: number;
  start_ts: string;
  end_ts: string;
  status: "open" | "held" | "booked";
}

export interface SlotHold {
  id: number;
  hold_expires_at: string;
}

export interface Booking {
  id: number;
  status: "pending" | "confirmed" | "cancelled";
  start_ts: string;
  end_ts: string;
  barber: {
    id: number;
    display_name: string;
  };
  service: {
    id: number;
    name: string;
    price_cents: number;
  };
}

export interface CreateBookingRequest {
  barber_id: number;
  service_id: number;
  slot_id: number;
}

export interface CreateBookingResponse {
  id: number;
  status: "pending" | "confirmed";
}

export interface CheckoutRequest {
  booking_id: number;
}

export interface CheckoutResponse {
  redirect_url: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface BookingState {
  serviceId: number | null;
  barberId: number | null;
  slotId: number | null;
  selectedDate: string;
  heldSlot: SlotHold | null;
}

export interface AdminBooking {
  id: number;
  customer_email: string;
  barber: {
    id: number;
    display_name: string;
  };
  service: {
    id: number;
    name: string;
  };
  start_ts: string;
  end_ts: string;
  status: string;
}
