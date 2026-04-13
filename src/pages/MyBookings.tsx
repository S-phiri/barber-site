import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBookings } from "@/hooks/useBookings";
import { useAuth } from "@/contexts/auth";
import { Calendar as CalIcon, Clock, User, Scissors, CalendarIcon } from "lucide-react";
import { bookingRequestCancellation, bookingRequestReschedule } from "@/lib/api";
import {
  messageRamadCancellationRequest,
  messageRamadRescheduleRequest,
  waMeLink,
} from "@/lib/bookingMessages";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

export type MeBooking = {
  id: string;
  status: string;
  start_ts: string;
  end_ts: string;
  notes?: string;
  customer_name?: string;
  new_requested_date?: string | null;
  barber: { id: string; display_name: string };
  service: { id: string; name: string; price_cents: number };
};

function formatPrice(priceCents: number): string {
  return `R${(priceCents / 100).toFixed(2)}`;
}

function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-ZA", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg",
  });
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "pending")
    return "bg-amber-500/15 text-amber-600 border border-amber-500/40";
  if (s === "confirmed" || s === "rescheduled")
    return "bg-emerald-500/15 text-emerald-700 border border-emerald-500/40";
  if (s === "rejected") return "bg-red-500/10 text-red-700 border border-red-500/35";
  if (s === "cancelled") return "bg-neutral-200 text-neutral-600 border border-neutral-300";
  if (s === "cancellation_requested")
    return "bg-orange-500/15 text-orange-800 border border-orange-500/40";
  if (s === "reschedule_requested")
    return "bg-blue-500/15 text-blue-800 border border-blue-500/40";
  return "bg-neutral-100 text-neutral-700 border border-neutral-200";
}

function statusLabel(status: string): string {
  const m: Record<string, string> = {
    pending: "Awaiting Confirmation",
    confirmed: "Confirmed",
    rejected: "Declined",
    cancelled: "Cancelled",
    cancellation_requested: "Cancellation Pending",
    reschedule_requested: "Reschedule Pending",
    rescheduled: "Rescheduled",
  };
  return m[status] || status.replace(/_/g, " ");
}

const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];

export default function MyBookings() {
  const { bookings, loading, error, fetchBookings } = useBookings();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [rescheduleBooking, setRescheduleBooking] = useState<MeBooking | null>(null);
  const [resDate, setResDate] = useState<Date>(new Date());
  const [resTime, setResTime] = useState("10:00");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const list = bookings as unknown as MeBooking[];

  const openRamadWa = useCallback((msg: string) => {
    const ramad = import.meta.env.VITE_RAMAD_WHATSAPP as string | undefined;
    if (ramad) {
      window.open(waMeLink(ramad.replace(/\D/g, ""), msg), "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleRequestCancellation = async (b: MeBooking) => {
    setBusy(true);
    try {
      await bookingRequestCancellation(b.id);
      const d = new Date(b.start_ts);
      openRamadWa(
        messageRamadCancellationRequest({
          customerName: b.customer_name || "Customer",
          dateStr: format(d, "PPP"),
          timeStr: d.toLocaleTimeString("en-ZA", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Africa/Johannesburg",
          }),
          serviceName: b.service.name,
        }),
      );

      toast({
        title: "Cancellation request sent",
        description:
          "Cancellation request sent to Ramad. Note: deposits are non-refundable once confirmed. You'll be notified of Ramad's decision.",
      });
      await fetchBookings();
    } catch (e) {
      toast({
        title: "Request failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const submitReschedule = async () => {
    if (!rescheduleBooking) return;
    setBusy(true);
    try {
      const [hh, mm] = resTime.split(":").map((x) => parseInt(x, 10));
      const dt = new Date(resDate);
      dt.setHours(hh || 10, mm || 0, 0, 0);
      const newIso = dt.toISOString();
      await bookingRequestReschedule(rescheduleBooking.id, newIso, resTime);
      const cur = new Date(rescheduleBooking.start_ts);
      openRamadWa(
        messageRamadRescheduleRequest({
          customerName: rescheduleBooking.customer_name || "Customer",
          currentDate: format(cur, "PPP"),
          currentTime: format(cur, "HH:mm"),
          newDate: format(resDate, "PPP"),
          newTime: resTime,
          serviceName: rescheduleBooking.service.name,
        }),
      );
      toast({
        title: "Reschedule request sent",
        description: "Ramad will review your requested new time.",
      });
      setRescheduleBooking(null);
      await fetchBookings();
    } catch (e) {
      toast({
        title: "Request failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleBookNew = () => {
    navigate("/book");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="bg-[var(--bg-primary)] min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-primary)] min-h-screen text-[var(--text-primary)]">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">My Bookings</h1>
            <p className="text-[var(--text-secondary)] mt-2 text-sm">View and manage your appointments</p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleBookNew}
              className="bbit-btn-primary-inline"
            >
              Book appointment
            </Button>
            <Button variant="outline" className="border-[var(--border-color)] text-[var(--text-primary)]" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>

        {error ? (
          <EmptyState
            title="Error loading bookings"
            description={error}
            actionLabel="Try again"
            onAction={fetchBookings}
          />
        ) : list.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            description="Request your first appointment to get started."
            actionLabel="Book appointment"
            onAction={handleBookNew}
            icon={<Scissors className="h-12 w-12" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {list.map((booking) => (
              <Card
                key={booking.id}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg text-[var(--text-primary)]">{booking.service.name}</CardTitle>
                    <Badge className={cn("font-medium border", statusBadgeClass(booking.status))}>
                      {statusLabel(booking.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
                    <User className="h-4 w-4 shrink-0" />
                    <span>{booking.barber.display_name}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
                    <CalIcon className="h-4 w-4 shrink-0" />
                    <span>{formatDateTime(booking.start_ts)}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      {new Date(booking.start_ts).toLocaleTimeString("en-ZA", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                        timeZone: "Africa/Johannesburg",
                      })}
                      {" – "}
                      {new Date(booking.end_ts).toLocaleTimeString("en-ZA", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                        timeZone: "Africa/Johannesburg",
                      })}
                    </span>
                  </div>

                  {booking.status === "pending" && (
                    <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-sm p-2">
                      Awaiting confirmation. Ramad may request a deposit to secure your appointment.
                    </p>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
                    <span className="font-semibold text-[var(--text-primary)]">{formatPrice(booking.service.price_cents)}</span>
                    <span className="text-xs text-[var(--text-secondary)]">#{String(booking.id).slice(0, 8)}…</span>
                  </div>

                  {(booking.status === "confirmed" || booking.status === "rescheduled") && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/40 text-red-300 hover:bg-red-500/10 text-xs uppercase"
                        disabled={busy}
                        onClick={() => void handleRequestCancellation(booking)}
                      >
                        Request cancellation
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10 text-xs uppercase"
                        disabled={busy}
                        onClick={() => {
                          setRescheduleBooking(booking);
                          setResDate(new Date(booking.start_ts));
                          setResTime("10:00");
                        }}
                      >
                        Request reschedule
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!rescheduleBooking} onOpenChange={(o) => !o && setRescheduleBooking(null)}>
          <DialogContent className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--text-primary)]">Request new date &amp; time</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-[var(--border-color)] text-[var(--text-primary)]"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(resDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[var(--bg-card)] border-[var(--border-color)]">
                  <Calendar
                    mode="single"
                    selected={resDate}
                    onSelect={(d) => d && setResDate(d)}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {TIME_SLOTS.map((t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn(
                      resTime === t
                        ? "bbit-btn-primary-inline border-transparent"
                        : "border-[var(--border-color)] text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-primary)]",
                    )}
                    onClick={() => setResTime(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRescheduleBooking(null)}>
                Cancel
              </Button>
              <Button
                className="bbit-btn-primary-inline"
                disabled={busy}
                onClick={() => void submitReschedule()}
              >
                Send request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
