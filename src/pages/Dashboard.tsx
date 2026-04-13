import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth";
import { getMyBookings, patchMe } from "@/lib/api";
import { Calendar, Gift, MessageCircle, Scissors, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { waMeLink } from "@/lib/bookingMessages";

type MeBooking = {
  id: string;
  status: string;
  start_ts: string;
  end_ts: string;
  service_name: string;
  service: { id: string; name: string; price_cents: number };
  barber: { id: string; display_name: string };
};

const PAGE = "min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]";
const CARD =
  "rounded-sm border border-[var(--border-color)] bg-[var(--bg-card)] shadow-[0_4px_24px_rgba(0,0,0,0.4)]";
const LABEL = "text-xs uppercase tracking-widest text-[var(--text-secondary)]";
const SECTION = "text-xl font-bold uppercase tracking-widest text-[var(--text-primary)] mb-4";

const STATUS_BADGE: Record<string, string> = {
  pending: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  confirmed: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  rescheduled: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  completed: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  cancelled: "text-[#888888] border-white/10 bg-white/5",
  rejected: "text-red-400 border-red-500/35 bg-red-500/10",
  cancellation_requested: "text-orange-300 border-orange-500/35 bg-orange-500/10",
  reschedule_requested: "text-blue-300 border-blue-500/40 bg-blue-500/10",
  no_show: "text-red-300 border-red-500/30 bg-red-500/10",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg",
  });
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    pending: "Awaiting confirmation",
    confirmed: "Confirmed",
    rescheduled: "Rescheduled",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Declined",
    cancellation_requested: "Cancellation pending",
    reschedule_requested: "Reschedule pending",
    no_show: "No show",
  };
  return m[s] || s.replace(/_/g, " ");
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [bookings, setBookings] = useState<MeBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [birthdayInput, setBirthdayInput] = useState("");
  const [savingBirthday, setSavingBirthday] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await getMyBookings()) as unknown as MeBooking[];
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Could not load bookings", variant: "destructive" });
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { nextAppointment, loyaltyMod, cutsUntilFree, showFreeCut, progressPct } = useMemo(() => {
      const tnow = Date.now();
      const list = bookings;
      const completedCount = list.filter((b) => b.status === "completed").length;
      const mod = completedCount % 5;
      const cutsUntilFree =
        mod === 0 ? (completedCount === 0 ? 5 : 0) : 5 - mod;
      const showFreeCut = mod === 0 && completedCount > 0;
      const progressPct = showFreeCut ? 100 : (mod / 5) * 100;

      const upcoming = list
        .filter((b) => {
          const t = new Date(b.start_ts).getTime();
          if (t < tnow) return false;
          return !["cancelled", "rejected"].includes(b.status);
        })
        .sort((a, b) => new Date(a.start_ts).getTime() - new Date(b.start_ts).getTime());

      return {
        nextAppointment: upcoming[0] ?? null,
        loyaltyMod: mod,
        cutsUntilFree,
        showFreeCut,
        progressPct,
      };
    }, [bookings]);

  const history = useMemo(() => {
    const tnow = Date.now();
    return bookings
      .filter((b) => new Date(b.start_ts).getTime() < tnow)
      .sort((a, b) => new Date(b.start_ts).getTime() - new Date(a.start_ts).getTime())
      .slice(0, 10);
  }, [bookings]);

  const birthdayMonthMatch = useMemo(() => {
    if (!user?.birthday) return false;
    const d = new Date(String(user.birthday) + "T12:00:00");
    if (Number.isNaN(d.getTime())) return false;
    return d.getMonth() === new Date().getMonth();
  }, [user?.birthday]);

  const saveBirthday = async () => {
    if (!birthdayInput) {
      toast({ title: "Pick a date", variant: "destructive" });
      return;
    }
    setSavingBirthday(true);
    try {
      await patchMe({ birthday: birthdayInput });
      await refreshUser();
      toast({ title: "Birthday saved" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally {
      setSavingBirthday(false);
    }
  };

  const ramadWa = import.meta.env.VITE_RAMAD_WHATSAPP as string | undefined;
  const ramadLink = ramadWa
    ? waMeLink(ramadWa.replace(/\D/g, ""), "Hi Ramad! Message from BBIT dashboard.")
    : "";

  const username = user?.username ?? "there";

  if (user?.is_staff) {
    return <Navigate to="/barber-dashboard" replace />;
  }

  if (loading) {
    return (
      <div className={`${PAGE} flex items-center justify-center`}>
        <p className={LABEL}>Loading…</p>
      </div>
    );
  }

  return (
    <div className={PAGE}>
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 space-y-10">
        {/* Welcome */}
        <header className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Welcome back, {username}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Your BBIT customer hub</p>
          </div>

          {birthdayMonthMatch && (
            <div className="rounded-sm border border-amber-400/40 bg-gradient-to-r from-amber-950/80 via-yellow-900/40 to-amber-950/80 px-4 py-3 flex items-center gap-3">
              <Gift className="h-8 w-8 text-amber-300 shrink-0" />
              <p className="text-amber-100 font-semibold text-sm md:text-base">
                Happy Birthday! Show this for 10% off
              </p>
            </div>
          )}

          {!user?.birthday && (
            <div className={`${CARD} p-4 space-y-3`}>
              <p className={`${LABEL} text-[var(--text-secondary)]`}>Add your birthday (optional)</p>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <Label className="text-[var(--text-secondary)] text-xs">Birthday</Label>
                  <Input
                    type="date"
                    className="mt-1 bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)] rounded-sm"
                    value={birthdayInput}
                    onChange={(e) => setBirthdayInput(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  className="bbit-btn-primary-inline"
                  disabled={savingBirthday}
                  onClick={() => void saveBirthday()}
                >
                  Save
                </Button>
              </div>
            </div>
          )}

          <div className={`${CARD} p-6 md:p-8`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className={LABEL}>Next appointment</p>
                {nextAppointment ? (
                  <>
                    <p className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mt-2">
                      {nextAppointment.service?.name || nextAppointment.service_name}
                    </p>
                    <p className="text-[var(--text-secondary)] mt-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatWhen(nextAppointment.start_ts)}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] opacity-80 mt-1">
                      {nextAppointment.barber?.display_name}
                    </p>
                  </>
                ) : (
                  <p className="text-[var(--text-secondary)] mt-3">No upcoming appointment</p>
                )}
              </div>
              {!nextAppointment && (
                <Button
                  asChild
                  className="bbit-btn-primary-inline shrink-0"
                >
                  <Link to="/book">Book your next cut</Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Loyalty */}
        <section>
          <h2 className={SECTION}>Loyalty program</h2>
          <div className={`${CARD} p-6`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <p className={LABEL}>Points this cycle</p>
                <p className="text-4xl font-bold text-[var(--text-primary)] tabular-nums">{loyaltyMod} / 5</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Each completed visit = 1 point · Every 5 cuts earns a free haircut
                </p>
              </div>
              {showFreeCut ? (
                <div className="flex items-center gap-2 text-emerald-400 border border-emerald-500/40 rounded-sm px-3 py-2 bg-emerald-500/10">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-semibold">You earned a free cut! Show this to Ramad</span>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="text-[var(--text-primary)] font-semibold">{cutsUntilFree}</span> cut
                  {cutsUntilFree === 1 ? "" : "s"} until your free haircut
                </p>
              )}
            </div>
            <Progress value={progressPct} className="h-2 bg-[var(--border-color)] [&>div]:bg-[var(--text-primary)]" />
          </div>
        </section>

        {/* History */}
        <section>
          <h2 className={SECTION}>Booking history</h2>
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No past appointments yet.</p>
            ) : (
              history.map((b) => (
                <div
                  key={b.id}
                  className={`${CARD} p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}
                >
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{b.service?.name || b.service_name}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{formatWhen(b.start_ts)}</p>
                    <span
                      className={`inline-block mt-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                        STATUS_BADGE[b.status] || "text-[var(--text-primary)] border-[var(--border-color)]"
                      }`}
                    >
                      {statusLabel(b.status)}
                    </span>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] uppercase text-xs tracking-wide rounded-sm shrink-0"
                  >
                    <Link
                      to={`/book?service=${encodeURIComponent(b.service?.id || "")}&barber=${encodeURIComponent(b.barber?.id || "")}`}
                    >
                      Book again
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <h2 className={SECTION}>Quick actions</h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <Button
              asChild
              className="bbit-btn-primary-inline"
            >
              <Link to="/book">Book new appointment</Link>
            </Button>
            {ramadLink ? (
              <Button
                asChild
                variant="outline"
                className="border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] font-semibold uppercase text-xs tracking-wide rounded-sm"
              >
                <a href={ramadLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 mr-2 inline" />
                  WhatsApp Ramad
                </a>
              </Button>
            ) : null}
            <Button
              asChild
              variant="outline"
              className="border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] font-semibold uppercase text-xs tracking-wide rounded-sm"
            >
              <Link to="/bookings">
                <Scissors className="h-4 w-4 mr-2 inline" />
                View all bookings
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
