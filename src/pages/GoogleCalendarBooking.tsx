import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, Scissors, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth";
import { useServices } from "@/hooks/useServices";
import { useBarbers } from "@/hooks/useBarbers";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { type BarberKey } from "@/lib/barbers";
import { createBarberBookingRequest, http } from "@/lib/api";
import { messageToRamadNewRequest, messageCustomerSelfReminder, waMeLink } from "@/lib/bookingMessages";

const RAMAD_WHATSAPP_DIGITS = "27670238197";

interface BookingFormData {
  serviceId: string;
  barberId: string;
  barberKey: BarberKey | null;
  date: Date;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string;
}

const STEP_LABELS = ["Service", "Barber", "Date", "Time", "Details"];

const inputClass =
  "w-full bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus-visible:border-[var(--text-primary)] focus-visible:ring-[var(--text-primary)]";
const labelClass = "text-[var(--text-secondary)] uppercase tracking-widest text-xs";

function ServicePrice({ cents }: { cents: number }) {
  if (cents === 0) {
    return <span className="text-sm italic text-[var(--text-secondary)]">Price TBC</span>;
  }
  return <span className="font-bold text-[var(--text-primary)]">R{(cents / 100).toFixed(2)}</span>;
}

function CardSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)] border-b border-[var(--border-color)] pb-4 mb-6">
      {children}
    </h3>
  );
}

export default function GoogleCalendarBooking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { services } = useServices();
  const { barbers } = useBarbers();

  const [booking, setBooking] = useState<BookingFormData>({
    serviceId: "",
    barberId: "",
    barberKey: null,
    date: new Date(),
    time: "",
    customerName: user?.username || "",
    customerPhone: "",
    customerEmail: user?.email || "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitted, setSubmitted] = useState<{
    bookingId: string;
    serviceName: string;
    dateStr: string;
    timeStr: string;
    customerName: string;
    ramadHref: string;
    selfHref: string;
  } | null>(null);
  const prefillApplied = useRef(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (prefillApplied.current || !services.length || !barbers.length) return;
    const sid = searchParams.get("service");
    const bid = searchParams.get("barber");
    if (!sid) return;
    const svc = services.find((s) => String(s.id) === String(sid));
    if (!svc) return;
    prefillApplied.current = true;
    if (bid) {
      const br = barbers.find((b) => String(b.id) === String(bid));
      if (br) {
        setBooking((prev) => ({
          ...prev,
          serviceId: String(svc.id),
          barberId: String(br.id),
          barberKey: "ramad",
        }));
        setStep(3);
        return;
      }
    }
    setBooking((prev) => ({ ...prev, serviceId: String(svc.id) }));
    setStep(2);
  }, [searchParams, services, barbers]);

  useEffect(() => {
    if (!submitted?.ramadHref) return;
    const href = submitted.ramadHref;
    const t = window.setTimeout(() => {
      window.open(href, "_blank", "noopener,noreferrer");
    }, 2000);
    return () => clearTimeout(t);
  }, [submitted?.bookingId, submitted?.ramadHref]);

  useEffect(() => {
    if (step !== 4 || !booking.serviceId) return;
    let cancelled = false;
    const dateStr = format(booking.date, "yyyy-MM-dd");
    const sp = new URLSearchParams({
      date: dateStr,
      service_id: String(booking.serviceId),
    });
    if (booking.barberId) sp.set("barber_id", String(booking.barberId));

    (async () => {
      setSlotsLoading(true);
      try {
        const res = await http(`/api/barber/available-slots/?${sp.toString()}`);
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || `Failed to load slots (${res.status})`);
        }
        const data = (await res.json()) as unknown;
        const rows = Array.isArray(data) ? data : [];
        if (!cancelled) {
          setAvailableSlots(
            rows
              .filter((x): x is { time: string; available: boolean } => {
                const o = x as Record<string, unknown>;
                return typeof o?.time === "string" && typeof o?.available === "boolean";
              })
              .map((x) => ({ time: x.time, available: x.available })),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setAvailableSlots([]);
          toast({
            title: "Couldn’t load times",
            description: e instanceof Error ? e.message : "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, booking.date, booking.barberId, booking.serviceId]);

  const handleServiceChange = (serviceId: string) => {
    setBooking((prev) => ({ ...prev, serviceId }));
    setStep(2);
  };

  const handleBarberChange = (barberId: string) => {
    const barberKey = "ramad" as const;
    setBooking((prev) => ({ ...prev, barberId, barberKey }));
    setStep(3);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setBooking((prev) => ({ ...prev, date }));
      setStep(4);
    }
  };

  const handleTimeSelect = (time: string) => {
    setBooking((prev) => ({ ...prev, time }));
    setStep(5);
  };

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setBooking((prev) => ({ ...prev, [field]: value }));
  };

  /** Selected calendar day + HH:mm interpreted as Africa/Johannesburg (SAST, UTC+2); returns UTC ISO for the API. */
  const toStartIso = (calendarDate: Date, hhmm: string) => {
    const dateStr = format(calendarDate, "yyyy-MM-dd");
    const [yy, mo, dd] = dateStr.split("-").map((x) => parseInt(x, 10));
    const [hhS, mmS] = hhmm.split(":").map((x) => parseInt(x, 10));
    const h = Number.isFinite(hhS) ? hhS : 9;
    const mi = Number.isFinite(mmS) ? mmS : 0;
    const utcMs = Date.UTC(yy, mo - 1, dd, h - 2, mi, 0, 0);
    return new Date(utcMs).toISOString();
  };

  const handleSubmitBooking = async () => {
    const timeStr = booking.time;
    const requiredFields = ["serviceId", "barberId", "time", "customerName", "customerPhone"];

    const missingFields = requiredFields.filter((field) => {
      const v = booking[field as keyof BookingFormData];
      return field === "time" ? !timeStr : !v;
    });

    if (missingFields.length > 0) {
      toast({
        title: "Incomplete request",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const selectedService = services.find((s) => String(s.id) === String(booking.serviceId));
      const selectedBarber = barbers.find((b) => String(b.id) === String(booking.barberId));

      if (!selectedService || !selectedBarber) {
        throw new Error("Service or barber not found");
      }

      const startIso = toStartIso(booking.date, timeStr || "10:00");

      const res = await createBarberBookingRequest({
        service_id: String(selectedService.id),
        barber_id: String(selectedBarber.id),
        start_time: startIso,
        customer_name: booking.customerName,
        customer_phone: booking.customerPhone,
        customer_email: booking.customerEmail || "",
        notes: booking.notes || "",
      });

      const dateStr = format(booking.date, "PPP");
      const displayTime = timeStr || "10:00";
      const msgRamad = messageToRamadNewRequest({
        serviceName: selectedService.name,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        dateStr,
        timeStr: displayTime,
        notes: booking.notes || "",
        bookingId: res.booking_id,
      });
      const ramadDigits =
        (import.meta.env.VITE_RAMAD_WHATSAPP as string | undefined)?.replace(/\D/g, "") || RAMAD_WHATSAPP_DIGITS;
      const msgSelf = messageCustomerSelfReminder({
        serviceName: selectedService.name,
        dateStr,
        timeStr: displayTime,
      });
      setSubmitted({
        bookingId: res.booking_id,
        serviceName: selectedService.name,
        dateStr,
        timeStr: displayTime,
        customerName: booking.customerName,
        ramadHref: waMeLink(ramadDigits, msgRamad),
        selfHref: waMeLink(booking.customerPhone, msgSelf),
      });

      toast({
        title: "Request sent",
        description: "Ramad will review your booking request shortly.",
      });
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedService = services.find((s) => String(s.id) === String(booking.serviceId));
  const summaryPriceCents = selectedService?.price_cents ?? 0;

  if (!user) {
    return null;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] py-12 px-4 text-[var(--text-primary)]">
        <div className="container mx-auto max-w-lg text-center space-y-8">
          <div className="flex justify-center">
            <div className="rounded-full bg-[var(--color-success)]/15 p-4 border border-[var(--color-success)]/40">
              <CheckCircle2 className="h-16 w-16 text-[var(--color-success)]" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-widest text-[var(--text-primary)]">
              REQUEST SENT!
            </h1>
            <p className="mt-3 inline-block rounded-sm border border-[var(--color-amber)]/35 bg-[var(--color-amber)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--color-amber)]">
              Pending confirmation
            </p>
            <p className="mt-4 text-[var(--text-secondary)] text-sm leading-relaxed">
              Ramad will review your request and confirm via WhatsApp shortly.
            </p>
          </div>

          <div className="rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-left space-y-0 divide-y divide-[var(--border-color)]">
            <div className="flex justify-between gap-4 py-3 first:pt-0">
              <span className="text-sm text-[var(--text-secondary)]">Customer</span>
              <span className="text-sm font-medium text-[var(--text-primary)] text-right">{submitted.customerName}</span>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <span className="text-sm text-[var(--text-secondary)]">Service</span>
              <span className="text-sm font-medium text-[var(--text-primary)] text-right">{submitted.serviceName}</span>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <span className="text-sm text-[var(--text-secondary)]">Date</span>
              <span className="text-sm font-medium text-[var(--text-primary)] text-right">{submitted.dateStr}</span>
            </div>
            <div className="flex justify-between gap-4 py-3 last:pb-0">
              <span className="text-sm text-[var(--text-secondary)]">Time</span>
              <span className="text-sm font-medium text-[var(--text-primary)] text-right">{submitted.timeStr}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={submitted.ramadHref}
              target="_blank"
              rel="noopener noreferrer"
              className="bbit-btn-primary text-center no-underline"
            >
              Notify Ramad on WhatsApp
            </a>
            <a
              href={submitted.selfHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-sm border border-[var(--border-color)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors no-underline"
            >
              Send yourself a reminder
            </a>
            <p className="text-xs text-[var(--text-secondary)] text-center">
              Opening WhatsApp to notify Ramad in a few seconds…
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Link to="/dashboard" className="bbit-btn-primary text-center no-underline">
              View my dashboard
            </Link>
            <Link
              to="/"
              className="inline-flex justify-center rounded-sm border border-[var(--border-color)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors no-underline"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 md:py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <header className="mb-10 text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-[var(--text-primary)] font-bold">Request an appointment</p>
          <p className="text-[var(--text-secondary)] text-sm max-w-xl mx-auto">
            Your request will be sent to Ramad for approval
          </p>
        </header>

        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-center gap-0 flex-wrap">
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border shrink-0",
                    step >= stepNumber ? "bbit-step-active" : "bg-transparent text-[var(--text-secondary)] border-[var(--border-color)]",
                  )}
                >
                  {stepNumber}
                </div>
                {stepNumber < 5 && (
                  <div
                    className={cn(
                      "w-10 sm:w-16 h-px mx-1 sm:mx-2",
                      step > stepNumber ? "bg-[var(--text-primary)]" : "bg-[var(--border-color)]",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1 max-w-xl mx-auto mt-3 text-center">
            {STEP_LABELS.map((label) => (
              <span key={label} className="text-[10px] sm:text-xs uppercase tracking-widest text-[var(--text-secondary)]">
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-8">
          <CardSectionTitle>
            {step === 1 && "Select service"}
            {step === 2 && "Choose barber"}
            {step === 3 && "Pick date"}
            {step === 4 && "Select time"}
            {step === 5 && "Your details"}
          </CardSectionTitle>

          {step === 1 && (
            <div className="space-y-3">
              {services.map((service) => {
                const selected = String(booking.serviceId) === String(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleServiceChange(String(service.id))}
                    className={cn(
                      "w-full text-left rounded-sm border p-4 transition-colors",
                      "bg-transparent border-[var(--border-color)] hover:border-[var(--text-primary)]",
                      selected && "bbit-service-selected",
                    )}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{service.name}</p>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">{service.duration_min} minutes</p>
                      </div>
                      <ServicePrice cents={service.price_cents} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {barbers.map((barber) => {
                  const barberSelected = String(booking.barberId) === String(barber.id);
                  return (
                  <button
                    key={barber.id}
                    type="button"
                    onClick={() => handleBarberChange(String(barber.id))}
                    className={cn(
                      "w-full text-left rounded-sm border p-4 transition-colors",
                      "border-[var(--border-color)] bg-transparent hover:border-[var(--text-primary)]",
                      barberSelected && "bbit-service-selected",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#0a0a0a] border border-[var(--border-color)] flex items-center justify-center shrink-0 text-white">
                        <Scissors className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-lg text-[var(--text-primary)]">{barber.display_name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(barber.specialties?.length ? barber.specialties : ["General barbering"]).map((s) => (
                            <span
                              key={s}
                              className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-sm border border-[var(--border-color)] text-[var(--text-secondary)]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
                })}
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-[var(--border-color)] text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-primary)]"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start rounded-sm border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {booking.date ? format(booking.date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[var(--bg-card)] border border-[var(--border-color)]">
                  <Calendar
                    mode="single"
                    selected={booking.date}
                    onSelect={handleDateSelect}
                    disabled={(date) => {
                      const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                      return start(date) < start(new Date()) || date.getDay() === 0;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="outline"
                className="border-[var(--border-color)] text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-primary)]"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {slotsLoading ? (
                <p className="text-sm text-[var(--text-secondary)]">Loading available times…</p>
              ) : null}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableSlots.map(({ time: slotTime, available }) => (
                  <Button
                    key={slotTime}
                    type="button"
                    variant="outline"
                    disabled={!available}
                    className={cn(
                      "h-12 rounded-sm",
                      !available && "opacity-45 cursor-not-allowed",
                      available &&
                        booking.time === slotTime &&
                        "bbit-btn-primary-inline border-transparent",
                      available &&
                        booking.time !== slotTime &&
                        "border-[var(--border-color)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-primary)]",
                    )}
                    onClick={() => {
                      if (!available) return;
                      handleTimeSelect(slotTime);
                    }}
                  >
                    <Clock className="mr-2 h-4 w-4 shrink-0" />
                    {slotTime}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-[var(--border-color)] text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-primary)]"
                onClick={() => setStep(3)}
              >
                Back
              </Button>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <p className="text-xs text-[var(--color-amber)] bg-[var(--color-amber)]/10 border border-[var(--color-amber)]/25 rounded-sm p-3">
                Note: A deposit may be required to secure your booking. Ramad will confirm deposit details when accepting.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className={labelClass}>
                    Full name
                  </Label>
                  <Input
                    id="customerName"
                    value={booking.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                    placeholder="Your full name"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className={labelClass}>
                    Phone
                  </Label>
                  <Input
                    id="customerPhone"
                    value={booking.customerPhone}
                    onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                    placeholder="Your phone number"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail" className={labelClass}>
                  Email
                </Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={booking.customerEmail}
                  onChange={(e) => handleInputChange("customerEmail", e.target.value)}
                  placeholder="your.email@example.com"
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className={labelClass}>
                  Special requests (optional)
                </Label>
                <Textarea
                  id="notes"
                  value={booking.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Notes for your barber..."
                  rows={3}
                  className={inputClass}
                />
              </div>

              <div className="rounded-sm border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 space-y-0 divide-y divide-[var(--border-color)]">
                <div className="flex justify-between gap-4 py-2 first:pt-0">
                  <span className="text-sm text-[var(--text-secondary)]">Service</span>
                  <span className="text-sm font-medium text-[var(--text-primary)] text-right">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <span className="text-sm text-[var(--text-secondary)]">Barber</span>
                  <span className="text-sm font-medium text-[var(--text-primary)] text-right">
                    {barbers.find((b) => String(b.id) === String(booking.barberId))?.display_name}
                  </span>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <span className="text-sm text-[var(--text-secondary)]">Date</span>
                  <span className="text-sm font-medium text-[var(--text-primary)] text-right">{format(booking.date, "PPP")}</span>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <span className="text-sm text-[var(--text-secondary)]">Time</span>
                  <span className="text-sm font-medium text-[var(--text-primary)] text-right">
                    {booking.time}
                  </span>
                </div>
                <div className="flex justify-between gap-4 py-2 last:pb-0">
                  <span className="text-sm text-[var(--text-secondary)]">Price</span>
                  <span className="text-sm font-medium text-right">
                    {summaryPriceCents === 0 ? (
                      <span className="italic text-[var(--text-secondary)]">Price TBC</span>
                    ) : (
                      <span className="text-[var(--text-primary)]">R{(summaryPriceCents / 100).toFixed(2)}</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[var(--border-color)] text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-primary)] sm:w-auto"
                  onClick={() => setStep(4)}
                >
                  Back
                </Button>
                <button
                  type="button"
                  disabled={loading || !booking.customerName || !booking.customerPhone}
                  onClick={() => void handleSubmitBooking()}
                  className="bbit-btn-primary flex-1 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? "Sending…" : "Send booking request"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
