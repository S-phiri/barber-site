/** wa.me links — no external APIs */

export function waMeLink(phoneDigits: string, message: string): string {
  let d = phoneDigits.replace(/\D/g, "");
  if (d.startsWith("0") && d.length >= 9) d = "27" + d.slice(1);
  else if (d && !d.startsWith("27")) d = "27" + d.replace(/^0+/, "");
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}

export function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return import.meta.env.VITE_SITE_URL || "";
}

export function barberDashboardUrl(): string {
  return `${siteOrigin()}/barber-dashboard`;
}

export function customerDashboardUrl(): string {
  return `${siteOrigin()}/dashboard`;
}

export function messageToRamadNewRequest(p: {
  serviceName: string;
  customerName: string;
  customerPhone: string;
  dateStr: string;
  timeStr: string;
  notes: string;
  bookingId: string;
}): string {
  return `Hi Ramad! New booking REQUEST on BBIT:
Service: ${p.serviceName}
Customer: ${p.customerName}
Phone: ${p.customerPhone}
Date: ${p.dateStr}
Time: ${p.timeStr}
Notes: ${p.notes || "—"}

To manage this booking, go to:
${barberDashboardUrl()}/bookings/${p.bookingId}`;
}

export function messageCustomerSelfReminder(p: {
  serviceName: string;
  dateStr: string;
  timeStr: string;
}): string {
  return `Hi! I've sent my booking request to BBIT Barbershop.
Service: ${p.serviceName}
Date: ${p.dateStr} at ${p.timeStr}
Waiting for Ramad to confirm - I'll update you shortly!`;
}

export function messageToCustomerConfirmed(p: {
  customerName: string;
  serviceName: string;
  dateStr: string;
  timeStr: string;
  siteUrl: string;
}): string {
  return `Hi ${p.customerName}! Ramad has confirmed your BBIT appointment:
Service: ${p.serviceName}
Date: ${p.dateStr} at ${p.timeStr}
Address: Draper Square, Shop 7, Claremont

Please arrive 5 minutes early.
To cancel or reschedule, reply here or visit ${p.siteUrl}/dashboard

See you soon! - BBIT`;
}

export function messageToCustomerDeclined(p: {
  customerName: string;
  dateStr: string;
  timeStr: string;
  reason: string;
  siteUrl: string;
}): string {
  const r = p.reason.trim();
  return `Hi ${p.customerName}, unfortunately Ramad is unable to accommodate your booking request for ${p.dateStr} at ${p.timeStr}.
${r ? r + "\n" : ""}Please visit ${p.siteUrl}/book to choose another time.
Sorry for the inconvenience - BBIT`;
}

export function messageRamadCancellationRequest(p: {
  customerName: string;
  dateStr: string;
  timeStr: string;
  serviceName: string;
}): string {
  return `Cancellation request from ${p.customerName} for ${p.dateStr} at ${p.timeStr} (${p.serviceName}).
Approve in dashboard: ${barberDashboardUrl()}`;
}

export function messageRamadRescheduleRequest(p: {
  customerName: string;
  currentDate: string;
  currentTime: string;
  newDate: string;
  newTime: string;
  serviceName: string;
}): string {
  return `Reschedule request from ${p.customerName}:
Current: ${p.currentDate} at ${p.currentTime}
Requested: ${p.newDate} at ${p.newTime}
(${p.serviceName})
Approve in dashboard: ${barberDashboardUrl()}`;
}

export function messageToCustomerCancellationApproved(p: {
  customerName: string;
  dateStr: string;
  timeStr: string;
}): string {
  return `Hi ${p.customerName}, your cancellation for ${p.dateStr} at ${p.timeStr} has been confirmed. — BBIT Barbershop`;
}

export function messageToCustomerCancellationDeclined(p: {
  customerName: string;
  dateStr: string;
  timeStr: string;
  reason: string;
}): string {
  const r = p.reason.trim();
  return `Hi ${p.customerName}, your cancellation request for ${p.dateStr} at ${p.timeStr} could not be approved.${r ? " " + r : ""} Your appointment remains confirmed. — BBIT`;
}

export function messageToCustomerRescheduleApproved(p: {
  customerName: string;
  serviceName: string;
  dateStr: string;
  timeStr: string;
  siteUrl: string;
}): string {
  return `Hi ${p.customerName}! Your BBIT appointment (${p.serviceName}) is now confirmed for ${p.dateStr} at ${p.timeStr}. Address: Draper Square, Shop 7, Claremont. See ${p.siteUrl}/dashboard — BBIT`;
}

export function messageToCustomerRescheduleDeclined(p: {
  customerName: string;
  dateStr: string;
  timeStr: string;
  reason: string;
}): string {
  const r = p.reason.trim();
  return `Hi ${p.customerName}, your reschedule request could not be approved. Your original time ${p.dateStr} at ${p.timeStr} still stands.${r ? " " + r : ""} — BBIT`;
}
