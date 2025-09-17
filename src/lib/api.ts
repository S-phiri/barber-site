// src/lib/api.ts
import dayjs from "dayjs";

const API_URL = "http://localhost:8000";

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[2]) : null;
}

async function ensureCsrf() {
  if (!getCookie("csrftoken")) {
    await fetch(`${API_URL}/api/auth/csrf/`, { credentials: "include" });
  }
}

async function http(path: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { ...(init.headers || {}) },
    ...init,
  });
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
  if (res.status === 400) throw new Error("Invalid credentials");
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return res.json();
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
  if (res.status === 403) return null;
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

// Legacy aliases for compatibility
export const loginApi = (p: { username: string; password: string }) => login(p.username, p.password);
export const logoutApi = logout;
export const getMe = me;
export const initCsrf = ensureCsrf;
export const registerApi = (p: { username: string; email: string; password: string }) => {
  throw new Error("Registration not implemented");
};
export const setAuthHelpers = () => {}; // Stub function

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
  } catch {}
  // Fallback to our single barber
  return [{ id: 1, name: "Ramad", slug: "ramad" }];
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

export default { login, logout, me, ensureCsrf };