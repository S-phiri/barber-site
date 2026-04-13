// src/lib/api.ts
import dayjs from "dayjs";

const API_URL = "http://localhost:8000";
const SERVER_BASE_URL = import.meta.env.VITE_SERVER_BASE_URL || "http://localhost:5174";

// JWT token management
let getAccessToken: (() => string | null) | null = null;
let refreshToken: (() => Promise<boolean>) | null = null;

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[2]) : null;
}

async function ensureCsrf() {
  if (!getCookie("csrftoken")) {
    await fetch(`${API_URL}/api/auth/csrf/`, { credentials: "include" });
  }
}

function bearerToken(): string | null {
  try {
    const ls = localStorage.getItem("access");
    if (ls) return ls;
  } catch {
    /* ignore */
  }
  return getAccessToken ? getAccessToken() : null;
}

export async function http(path: string, init: RequestInit = {}) {
  const h = init.headers;
  const merged: Record<string, string> =
    h instanceof Headers
      ? Object.fromEntries(h.entries())
      : { ...((h as Record<string, string> | undefined) || {}) };

  let token: string | null = null;
  try {
    token = localStorage.getItem("access");
  } catch {
    /* ignore */
  }
  if (!token) token = bearerToken();
  if (token) {
    merged.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: merged,
  });
}

/** DRF often returns `{ detail: string | object[] }` or `{ error: string }` on errors. */
async function errorMessageFromResponse(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: unknown; error?: unknown };
    const d = data?.detail;
    if (typeof d === "string" && d.trim()) return d;
    if (Array.isArray(d) && d[0] && typeof (d[0] as { msg?: string }).msg === "string") {
      return (d[0] as { msg: string }).msg;
    }
    const err = data?.error;
    if (typeof err === "string" && err.trim()) return err;
  } catch {
    /* non-JSON body */
  }
  return fallback;
}

export async function login(username: string, password: string) {
  await ensureCsrf();
  const csrftoken = getCookie("csrftoken") || "";
  const res = await http("/api/auth/login/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const fallback =
      res.status === 401 || res.status === 400
        ? "Invalid username or password."
        : `Login failed (${res.status})`;
    throw new Error(await errorMessageFromResponse(res, fallback));
  }
  return res.json();
}

export async function register(
  username: string,
  email: string,
  password: string,
  birthday?: string | null,
) {
  await ensureCsrf();
  const csrftoken = getCookie("csrftoken") || "";
  const res = await http("/api/auth/register/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify({
      username,
      email,
      password,
      ...(birthday ? { birthday } : {}),
    }),
  });
  if (!res.ok) {
    const fallback =
      res.status === 409
        ? "This username is already taken. Sign in or choose a different username."
        : res.status === 400
          ? "Please enter a username and password."
          : `Registration failed (${res.status})`;
    throw new Error(await errorMessageFromResponse(res, fallback));
  }
  return res.json();
}

/** SimpleJWT: POST JSON `{ refresh }` — use plain fetch so no Bearer is sent on this call. */
export async function refreshTokenApi(refresh: string) {
  const res = await fetch(`${API_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) throw new Error("Token refresh failed");
  return res.json() as Promise<{ access: string; refresh?: string }>;
}

export async function logout() {
  await ensureCsrf();
  const csrftoken = getCookie("csrftoken") || "";
  const res = await http("/api/auth/logout/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
    body: JSON.stringify({}), // keep JSON to avoid 415
  });
  if (!res.ok) throw new Error("Logout failed");
}

export async function me() {
  const res = await http("/api/auth/me/");
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json() as Promise<{
    id: number;
    username: string;
    email: string;
    is_staff: boolean;
    birthday: string | null;
  }>;
}

export async function patchMe(body: { birthday?: string | null }) {
  const res = await http("/api/auth/me/", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessageFromResponse(res, "Update failed"));
  return res.json() as Promise<{
    id: number;
    username: string;
    email: string;
    is_staff: boolean;
    birthday: string | null;
  }>;
}

// Legacy aliases for compatibility
export const loginApi = (p: { username: string; password: string }) => login(p.username, p.password);
export const logoutApi = logout;
export const getMe = me;
export const initCsrf = ensureCsrf;
export const registerApi = (p: {
  username: string;
  email: string;
  password: string;
  birthday?: string | null;
}) => register(p.username, p.email, p.password, p.birthday);
// Set up JWT authentication helpers
export function setAuthHelpers(
  getToken: () => string | null,
  refresh: () => Promise<boolean>
) {
  getAccessToken = getToken;
  refreshToken = refresh;
}

/** ===== Booking ===== */
export async function getServices() {
  const res = await http("/api/services/");
  if (!res.ok) throw new Error(`Get services failed: ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as any)?.services)) return (data as any).services;
  if (Array.isArray((data as any)?.results))  return (data as any).results;
  return [];
}

export async function getBarbers() {
  try {
    const res = await http("/api/barbers/");
    if (!res.ok) throw new Error(`Get barbers failed: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as any)?.results)) return (data as any).results;
  } catch {
    /* try slug fallback below — DB uses UUID barber ids, never use a fake integer id */
  }
  try {
    const b = await getBarberBySlug("ramad");
    const displayName = (b as { display_name?: string; name?: string }).display_name ?? (b as { name?: string }).name ?? "Ramad";
    return [{ ...b, display_name: displayName }];
  } catch {
    return [];
  }
}

export async function getBarberBySlug(slug: string) {
  try {
    const res = await http(`/api/barbers/${slug}/`);
    if (!res.ok) throw new Error(`Get barber failed: ${res.status}`);
    return res.json();
  } catch {
    if (slug === "ramad") return { id: 1, name: "Ramad", slug: "ramad" }; // <-- ensure id matches DB
    throw new Error("Barber not found");
  }
}

/** ===== Time Slots ===== */
export async function getSlots(params: {
  barberId: number|string;
  serviceId: number|string;
  date: string; // YYYY-MM-DD format
}) {
  const { barberId, serviceId, date } = params;
  
  // Ensure date is in YYYY-MM-DD format using dayjs
  const formattedDate = dayjs(date).format("YYYY-MM-DD");
  
  const queryParams = new URLSearchParams({
    barber_id: String(barberId),
    barber: String(barberId),
    service_id: String(serviceId),
    service: String(serviceId),
    date: formattedDate,
  });
  
  const res = await http(`/api/slots/?${queryParams}`);
  if (!res.ok) throw new Error(`Get slots failed: ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as any)?.slots)) return (data as any).slots;
  return [];
}

export async function createBooking(p: {
  barber_id: number|string;
  service_id: number|string;
  start: string; // ISO datetime string
}) {
  await ensureCsrf();
  const csrftoken = getCookie("csrftoken") || "";
  const res = await http("/api/bookings/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error(`Create booking failed: ${res.status}`);
  return res.json();
}

/** ===== Payments ===== */
export function getPaymentLink(bookingId: number|string) {
  const base = import.meta.env.VITE_PAYMENT_LINK; // hosted payment link (optional)
  return base ? `${base}?ref=${bookingId}` : "/";
}

export async function startCheckout(bookingId: number|string) {
  await ensureCsrf();
  const csrftoken = getCookie("csrftoken") || "";
  const res = await http("/api/payments/checkout/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify({ booking_id: bookingId }),
  });
  if (!res.ok) throw new Error(`Checkout failed: ${res.status}`);
  return res.json() as Promise<{ url: string }>;
}

/** ===== Compatibility aliases (to stop named-export errors) ===== */

// legacy: getTimeSlots(barberId, serviceId, date) -> getSlots({ ... })
export async function getTimeSlots(
  barberId: number|string,
  serviceId: number|string,
  date: string
) {
  return getSlots({ barberId, serviceId, date });
}

// legacy: holdTimeSlot(...) – we don't hold server-side yet; stub success
export async function holdTimeSlot(args: {
  start: string;
  barber_id: number|string;
  service_id: number|string;
  ttlSeconds?: number;
}) {
  return {
    id: Math.floor(Math.random() * 1000000), // Generate a random ID
    hold_expires_at: new Date(Date.now() + (args.ttlSeconds ?? 120) * 1000).toISOString(),
  };
}

// legacy: checkout(request) – call startCheckout or fallback to hosted link
export async function checkout(request: any) {
  try {
    const id =
      request?.booking_id ??
      request?.id ??
      (typeof request === "number" || typeof request === "string" ? request : null);
    if (!id) throw new Error("Missing booking id");
    try {
      const { url } = await startCheckout(id);
      if (url) return { url };
    } catch (e: any) {
      if (e?.response?.status !== 404) throw e;
    }
    // fallback to hosted payment link
    return { url: getPaymentLink(id) };
  } catch (e) {
    return { url: "/" };
  }
}

// legacy: getAdminBookings() – keep if used anywhere
export async function getAdminBookings() {
  const res = await http("/api/bookings/admin/");
  if (!res.ok) throw new Error(`Get admin bookings failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (Array.isArray((data as any)?.results) ? (data as any).results : []);
}

// legacy: getMyBookings() – keep if used
export async function getMyBookings() {
  const res = await http("/api/bookings/me/");
  if (!res.ok) throw new Error(`Get my bookings failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (Array.isArray((data as any)?.results) ? (data as any).results : []);
}

/** POST /api/bookings/ — pending request (JWT); creates Slot + Booking with status pending */
export async function createBarberBookingRequest(payload: {
  service_id: string;
  barber_id: string;
  start_time: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  notes?: string;
}) {
  await ensureCsrf();
  const csrftoken = getCookie("csrftoken") || "";
  const post = () =>
    http("/api/bookings/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
      },
      body: JSON.stringify(payload),
    });

  let res = await post();
  if (res.status === 401) {
    const r = localStorage.getItem("refresh");
    if (r) {
      try {
        const data = await refreshTokenApi(r);
        if (data?.access) {
          localStorage.setItem("access", data.access);
          res = await post();
        }
      } catch {
        /* fall through to error handling below */
      }
    }
  }
  if (!res.ok) {
    const msg = await errorMessageFromResponse(res, `Booking request failed (${res.status})`);
    throw new Error(msg);
  }
  return res.json() as Promise<{
    success?: boolean;
    booking_id: string;
    id?: string;
    status: string;
    message?: string;
  }>;
}

export async function bookingRequestCancellation(bookingId: string) {
  const res = await http(`/api/bookings/${bookingId}/request-cancellation/`, {
    method: "PATCH",
  });
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res, `Request failed: ${res.status}`));
  }
  return res.json();
}

export async function bookingRequestReschedule(
  bookingId: string,
  new_start: string,
  new_time?: string,
) {
  const res = await http(`/api/bookings/${bookingId}/request-reschedule/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_start, new_time: new_time ?? "" }),
  });
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res, `Request failed: ${res.status}`));
  }
  return res.json();
}

// PayFast checkout functions
export interface BookingData {
  serviceId: string;
  serviceName: string;
  price: number;
  barberId: string;
  barberName: string;
  dateISO: string;
  startISO: string;
  endISO: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface CheckoutResponse {
  redirectUrl: string;
  bookingId: string;
}

export async function createCheckout(booking: BookingData): Promise<CheckoutResponse> {
  const response = await fetch(`${SERVER_BASE_URL}/api/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ booking }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create checkout' }));
    throw new Error(error.error || 'Failed to create checkout');
  }

  return response.json();
}

export async function getBooking(bookingId: string) {
  const response = await fetch(`${SERVER_BASE_URL}/api/bookings/${bookingId}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Booking not found');
    }
    throw new Error('Failed to fetch booking');
  }

  return response.json();
}

/** ===== Barber staff dashboard (is_staff) ===== */
export async function barberToday() {
  const res = await http("/api/barber/today/");
  if (!res.ok) throw new Error(`Today: ${res.status}`);
  return res.json() as Promise<{ count: number; results: unknown[] }>;
}

export async function barberPending() {
  const res = await http("/api/barber/pending/");
  if (!res.ok) throw new Error(`Pending: ${res.status}`);
  return res.json() as Promise<{ count: number; results: unknown[] }>;
}

export async function barberBookingsByDay(date: string) {
  const res = await http(`/api/barber/bookings-by-day/?date=${encodeURIComponent(date)}`);
  if (!res.ok) throw new Error(`Bookings by day: ${res.status}`);
  return res.json() as Promise<{ date: string; count: number; results: unknown[] }>;
}

export async function barberWeek() {
  const res = await http("/api/barber/week/");
  if (!res.ok) throw new Error(`Week: ${res.status}`);
  return res.json() as Promise<{
    days: { date: string; count: number; blocked: boolean; blocked_reason: string }[];
  }>;
}

export async function barberAnalytics() {
  const res = await http("/api/barber/analytics/");
  if (!res.ok) throw new Error(`Analytics: ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function barberCustomers() {
  const res = await http("/api/barber/customers/");
  if (!res.ok) throw new Error(`Customers: ${res.status}`);
  return res.json() as Promise<{ results: unknown[] }>;
}

export async function barberBookingAction(
  bookingId: string,
  action: string,
  body?: Record<string, unknown>,
) {
  const hasBody = body && Object.keys(body).length > 0;
  const res = await http(`/api/barber/bookings/${bookingId}/${action}/`, {
    method: "PATCH",
    ...(hasBody
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  if (!res.ok) throw new Error(`Action ${action}: ${res.status}`);
  return res.json();
}

export async function barberBlockedDates() {
  const res = await http("/api/barber/blocked-dates/");
  if (!res.ok) throw new Error(`Blocked dates: ${res.status}`);
  return res.json() as Promise<{
    results: { id: number; date: string; reason: string; gcal_synced?: boolean }[];
  }>;
}

export async function barberBlockDate(date: string, reason: string) {
  await ensureCsrf();
  const csrftoken = getCookie("csrftoken") || "";
  const res = await http("/api/barber/blocked-dates/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify({ date, reason }),
  });
  if (!res.ok) throw new Error(`Block date: ${res.status}`);
  return res.json() as Promise<{
    id: number;
    date: string;
    reason: string;
    created_at: string;
    gcal_synced?: boolean;
  }>;
}

export async function barberUnblockDate(id: number) {
  await ensureCsrf();
  const csrftoken = getCookie("csrftoken") || "";
  const res = await http(`/api/barber/blocked-dates/${id}/`, {
    method: "DELETE",
    headers: { "X-CSRFToken": csrftoken },
  });
  if (!res.ok) throw new Error(`Unblock: ${res.status}`);
}

export async function barberGetCustomerNote(customerId: number) {
  const res = await http(`/api/barber/customer-notes/${customerId}/`);
  if (!res.ok) throw new Error(`Note: ${res.status}`);
  return res.json() as Promise<{ note: string; customer_id: number; updated_at?: string }>;
}

export async function barberSaveCustomerNote(customerId: number, note: string) {
  await ensureCsrf();
  const csrftoken = getCookie("csrftoken") || "";
  const res = await http(`/api/barber/customer-notes/${customerId}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) throw new Error(`Save note: ${res.status}`);
  return res.json();
}

export async function barberSaveBirthday(phoneDigits: string, birthday: string | null) {
  await ensureCsrf();
  const csrftoken = getCookie("csrftoken") || "";
  const res = await http(`/api/barber/customers/${encodeURIComponent(phoneDigits)}/birthday/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify({ birthday }),
  });
  if (!res.ok) throw new Error(`Birthday: ${res.status}`);
  return res.json();
}

export default { login, logout, me, ensureCsrf, createCheckout, getBooking };