import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CalendarDays,
  Lock,
  MessageCircle,
  Scissors,
  TrendingUp,
  Users,
} from "lucide-react";
import { getBarberApptUrl } from "@/lib/barbers";
import {
  barberAnalytics,
  barberBlockDate,
  barberBlockedDates,
  barberBookingsByDay,
  barberBookingAction,
  barberCustomers,
  barberGetCustomerNote,
  barberPending,
  barberSaveBirthday,
  barberSaveCustomerNote,
  barberToday,
  barberUnblockDate,
  barberWeek,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  messageToCustomerCancellationApproved,
  messageToCustomerCancellationDeclined,
  messageToCustomerConfirmed,
  messageToCustomerDeclined,
  messageToCustomerRescheduleApproved,
  messageToCustomerRescheduleDeclined,
  siteOrigin,
  waMeLink,
} from "@/lib/bookingMessages";

const PAGE = "min-h-screen bg-[#0a0a0a] text-[#e0e0e0]";
const CARD =
  "rounded-sm border border-white/[0.08] bg-[#141414] shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-colors hover:border-white/[0.15]";
const SECTION_TITLE = "text-xl font-bold uppercase tracking-widest text-white";
const LABEL = "text-xs uppercase tracking-widest text-[#888888]";
const BODY = "text-sm text-gray-300";
const SECTION_BLOCK =
  "py-12 border-b border-white/[0.04]";

const btnPrimary =
  "inline-flex items-center justify-center bg-white text-black hover:bg-gray-100 font-semibold uppercase tracking-wide text-xs px-4 py-2 rounded-sm transition-colors";
const btnSecondary =
  "inline-flex items-center justify-center border border-white/20 text-white hover:border-white/60 font-semibold uppercase tracking-wide text-xs px-4 py-2 rounded-sm transition-colors";
const btnDanger =
  "inline-flex items-center justify-center border border-red-500/40 text-red-400 hover:border-red-500 font-semibold uppercase tracking-wide text-xs px-4 py-2 rounded-sm transition-colors";
const btnSuccess =
  "inline-flex items-center justify-center border border-green-500/40 text-green-400 hover:border-green-500 font-semibold uppercase tracking-wide text-xs px-4 py-2 rounded-sm transition-colors";

/** Block Today + View Booking Page: secondary look, invert to white/black on hover */
const btnHeaderSecondary =
  "inline-flex items-center justify-center border border-white/20 text-white hover:bg-white hover:text-black hover:border-white font-semibold uppercase tracking-wide text-xs px-4 py-2 rounded-sm transition-colors duration-200";

type BookingRow = {
  id: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  whatsapp_url: string;
  slot_start: string;
  notes?: string;
  new_requested_date?: string | null;
  new_requested_time?: string;
  service: { name: string; duration_minutes: number };
};

type CustomerRow = {
  phone: string;
  phone_normalized: string;
  name: string;
  total_visits: number;
  last_visit: string | null;
  favorite_service: string;
  customer_user_id: number | null;
  birthday: string | null;
  booking_history: { id: string; slot_start: string; service_name: string; status: string }[];
};

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "pending")
    return "bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/40";
  if (s === "confirmed")
    return "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40";
  if (s === "rejected" || s === "no_show")
    return "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/35";
  if (s === "cancelled") return "bg-white/5 text-[#888888] border border-white/10";
  if (s === "completed")
    return "bg-sky-500/10 text-sky-300 border border-sky-500/30";
  if (s === "cancellation_requested")
    return "bg-orange-500/15 text-orange-300 border border-orange-500/35";
  if (s === "reschedule_requested")
    return "bg-transparent text-blue-300 border-2 border-blue-400/60";
  if (s === "rescheduled")
    return "bg-[#10b981]/15 text-emerald-300 border border-emerald-500/40";
  return "bg-white/5 text-[#e0e0e0] border border-white/10";
}

function statusDisplayLabel(status: string): string {
  const m: Record<string, string> = {
    pending: "Awaiting Confirmation",
    confirmed: "Confirmed",
    rejected: "Declined",
    cancellation_requested: "Cancellation Pending",
    reschedule_requested: "Reschedule Pending",
    cancelled: "Cancelled",
    rescheduled: "Rescheduled",
    completed: "Completed",
    no_show: "No Show",
  };
  return m[status] || status.replace(/_/g, " ");
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg",
  });
}

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Africa/Johannesburg",
  });
}

function todayIsoJohannesburg(): string {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  return s;
}

export default function BarberDashboard() {
  const { toast } = useToast();
  const [today, setToday] = useState<BookingRow[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [pending, setPending] = useState<BookingRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [week, setWeek] = useState<
    { date: string; count: number; blocked: boolean; blocked_reason: string }[]
  >([]);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [blocked, setBlocked] = useState<
    { id: number; date: string; reason: string; gcal_synced?: boolean }[]
  >([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [dayBookings, setDayBookings] = useState<BookingRow[]>([]);
  const [custSearch, setCustSearch] = useState("");
  const [expandedCust, setExpandedCust] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [birthdayDraft, setBirthdayDraft] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [blockInline, setBlockInline] = useState<{ iso: string; reason: string } | null>(null);
  const [headerNow, setHeaderNow] = useState(() => new Date());
  const [reasonDialog, setReasonDialog] = useState<
    null | { action: "decline" | "reject-cancellation" | "reject-reschedule"; id: string }
  >(null);
  const [reasonDraft, setReasonDraft] = useState("");

  useEffect(() => {
    const t = setInterval(() => setHeaderNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const headerDateStr = useMemo(() => {
    return headerNow
      .toLocaleDateString("en-ZA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Africa/Johannesburg",
      })
      .toUpperCase();
  }, [headerNow]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p, w, a, c, b] = await Promise.all([
        barberToday(),
        barberPending(),
        barberWeek(),
        barberAnalytics(),
        barberCustomers(),
        barberBlockedDates(),
      ]);
      setTodayCount(t.count);
      setToday((t.results || []) as BookingRow[]);
      setPendingCount(p.count);
      setPending((p.results || []) as BookingRow[]);
      setWeek(w.days || []);
      setAnalytics(a);
      setCustomers((c.results || []) as CustomerRow[]);
      setBlocked(b.results || []);
    } catch (e) {
      toast({
        title: "Load failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const runStaffAction = async (id: string, action: string, body?: Record<string, unknown>) => {
    try {
      const data = (await barberBookingAction(id, action, body)) as BookingRow;
      const site = siteOrigin();
      const phone = data.customer_phone;

      const openWa = (msg: string) => {
        window.open(waMeLink(phone, msg), "_blank", "noopener,noreferrer");
      };

      if (action === "accept") {
        openWa(
          messageToCustomerConfirmed({
            customerName: data.customer_name,
            serviceName: data.service.name,
            dateStr: formatDateLong(data.slot_start),
            timeStr: formatTime(data.slot_start),
            siteUrl: site,
          }),
        );
      } else if (action === "decline") {
        openWa(
          messageToCustomerDeclined({
            customerName: data.customer_name,
            dateStr: formatDateLong(data.slot_start),
            timeStr: formatTime(data.slot_start),
            reason: String(body?.reason ?? ""),
            siteUrl: site,
          }),
        );
      } else if (action === "approve-cancellation") {
        openWa(
          messageToCustomerCancellationApproved({
            customerName: data.customer_name,
            dateStr: formatDateLong(data.slot_start),
            timeStr: formatTime(data.slot_start),
          }),
        );
      } else if (action === "reject-cancellation") {
        openWa(
          messageToCustomerCancellationDeclined({
            customerName: data.customer_name,
            dateStr: formatDateLong(data.slot_start),
            timeStr: formatTime(data.slot_start),
            reason: String(body?.reason ?? ""),
          }),
        );
      } else if (action === "approve-reschedule") {
        openWa(
          messageToCustomerRescheduleApproved({
            customerName: data.customer_name,
            serviceName: data.service.name,
            dateStr: formatDateLong(data.slot_start),
            timeStr: formatTime(data.slot_start),
            siteUrl: site,
          }),
        );
      } else if (action === "reject-reschedule") {
        openWa(
          messageToCustomerRescheduleDeclined({
            customerName: data.customer_name,
            dateStr: formatDateLong(data.slot_start),
            timeStr: formatTime(data.slot_start),
            reason: String(body?.reason ?? ""),
          }),
        );
      }

      toast({ title: "Updated" });
      await load();
      if (expandedDay) {
        const d = await barberBookingsByDay(expandedDay);
        setDayBookings((d.results || []) as BookingRow[]);
      }
      return true;
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
      return false;
    }
  };

  const expandDay = async (date: string) => {
    if (expandedDay === date) {
      setExpandedDay(null);
      setDayBookings([]);
      return;
    }
    setExpandedDay(date);
    try {
      const d = await barberBookingsByDay(date);
      setDayBookings((d.results || []) as BookingRow[]);
    } catch {
      setDayBookings([]);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.phone_normalized.includes(q),
    );
  }, [customers, custSearch]);

  const openCustomer = async (row: CustomerRow) => {
    const key = row.phone_normalized;
    setExpandedCust(key);
    setBirthdayDraft(row.birthday ? row.birthday.slice(0, 10) : "");
    if (row.customer_user_id) {
      try {
        const n = await barberGetCustomerNote(row.customer_user_id);
        setNoteDraft(n.note || "");
      } catch {
        setNoteDraft("");
      }
    } else {
      setNoteDraft("");
    }
  };

  const saveNote = async (row: CustomerRow) => {
    if (!row.customer_user_id) {
      toast({ title: "Notes need a registered customer account", variant: "destructive" });
      return;
    }
    try {
      await barberSaveCustomerNote(row.customer_user_id, noteDraft);
      toast({ title: "Note saved" });
      await load();
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    }
  };

  const saveBirth = async (row: CustomerRow) => {
    try {
      await barberSaveBirthday(row.phone_normalized, birthdayDraft || null);
      toast({ title: "Birthday saved" });
      await load();
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    }
  };

  const chartData = useMemo(() => {
    const raw = (analytics?.bookings_per_day as { date: string; count: number }[]) || [];
    return raw.map((r) => ({
      ...r,
      label: r.date.slice(5),
      fullDate: r.date,
    }));
  }, [analytics]);

  const monthGrid = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const first = new Date(y, m, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: ({ d: number; iso: string } | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ d, iso });
    }
    return cells;
  }, [calendarMonth]);

  const blockedByDate = useMemo(() => {
    const m = new Map<string, { id: number; reason: string }>();
    blocked.forEach((b) => m.set(b.date, { id: b.id, reason: b.reason }));
    return m;
  }, [blocked]);

  const showGcalManualBlockWarning = useMemo(
    () => blocked.some((b) => b.gcal_synced === false),
    [blocked],
  );

  const handleBlockToday = async () => {
    const iso = todayIsoJohannesburg();
    try {
      const res = await barberBlockDate(iso, "Blocked via dashboard");
      toast({
        title: "Today blocked",
        ...(res.gcal_synced === false
          ? {
              description:
                "Google Calendar was not updated. Block this day in Google Calendar so appointment links stay in sync.",
            }
          : {}),
      });
      await load();
    } catch (e) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    }
  };

  const submitInlineBlock = async () => {
    if (!blockInline) return;
    try {
      const res = await barberBlockDate(blockInline.iso, blockInline.reason);
      toast({
        title: "Date blocked",
        ...(res.gcal_synced === false
          ? {
              description:
                "Google Calendar was not updated. Block this day in Google Calendar so appointment links stay in sync.",
            }
          : {}),
      });
      setBlockInline(null);
      await load();
    } catch (e) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    }
  };

  const toggleBlockDay = async (iso: string) => {
    const existing = blockedByDate.get(iso);
    if (existing) {
      try {
        await barberUnblockDate(existing.id);
        toast({ title: "Unblocked" });
        await load();
      } catch (e) {
        toast({
          title: "Failed",
          description: e instanceof Error ? e.message : "",
          variant: "destructive",
        });
      }
      return;
    }
    setBlockInline({ iso, reason: "" });
  };

  const renderActions = (b: BookingRow, compact = false) => {
    const s = b.status;
    const wrap = (children: React.ReactNode) =>
      compact ? (
        <div className="flex flex-wrap gap-2 justify-end">{children}</div>
      ) : (
        <div className="flex gap-2 flex-wrap pt-2 border-t border-white/[0.06]">{children}</div>
      );
    if (s === "pending") {
      return wrap(
        <>
          <button type="button" className={btnSuccess} onClick={() => void runStaffAction(b.id, "accept")}>
            Accept
          </button>
          <button
            type="button"
            className={btnDanger}
            onClick={() => setReasonDialog({ action: "decline", id: b.id })}
          >
            Decline
          </button>
        </>,
      );
    }
    if (s === "confirmed" || s === "rescheduled") {
      return wrap(
        <>
          <button type="button" className={btnPrimary} onClick={() => void runStaffAction(b.id, "complete")}>
            Mark Complete
          </button>
          <button type="button" className={btnDanger} onClick={() => void runStaffAction(b.id, "no-show")}>
            No Show
          </button>
        </>,
      );
    }
    if (s === "cancellation_requested") {
      return wrap(
        <>
          <button
            type="button"
            className={btnDanger}
            onClick={() => void runStaffAction(b.id, "approve-cancellation")}
          >
            Approve cancel
          </button>
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setReasonDialog({ action: "reject-cancellation", id: b.id })}
          >
            Reject
          </button>
        </>,
      );
    }
    if (s === "reschedule_requested") {
      return wrap(
        <>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => void runStaffAction(b.id, "approve-reschedule")}
          >
            Approve
          </button>
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setReasonDialog({ action: "reject-reschedule", id: b.id })}
          >
            Reject
          </button>
        </>,
      );
    }
    return null;
  };

  const todayCard = (b: BookingRow) => (
    <div
      key={b.id}
      className={`${CARD} p-5 min-w-[280px] max-w-[320px] flex-shrink-0 flex flex-col relative`}
    >
      <span
        className={`absolute top-4 right-4 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm ${statusBadgeClass(b.status)}`}
      >
        {statusDisplayLabel(b.status)}
      </span>
      <div className="text-4xl font-bold text-white tabular-nums">{formatTime(b.slot_start)}</div>
      <div className={`${LABEL} mt-1`}>{b.service.name}</div>
      <div className="text-base font-bold text-white mt-3">{b.customer_name}</div>
      <div className={`${BODY} mt-1`}>{b.service.duration_minutes} min</div>
      <a
        href={b.whatsapp_url || `https://wa.me/27${b.customer_phone.replace(/\D/g, "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-sm bg-[#25D366]/15 border border-[#25D366]/40 text-[#4ade80] px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-[#25D366]/25 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </a>
      {renderActions(b)}
    </div>
  );

  const weekTodayIso = todayIsoJohannesburg();

  const publicBookingPageUrl = useMemo(() => getBarberApptUrl("ramad") ?? "/book", []);

  const newBookingRequests = useMemo(() => pending.filter((b) => b.status === "pending"), [pending]);
  const changeRequests = useMemo(
    () => pending.filter((b) => ["cancellation_requested", "reschedule_requested"].includes(b.status)),
    [pending],
  );

  if (loading && !today.length && !pending.length) {
    return (
      <div className={`${PAGE} flex items-center justify-center`}>
        <p className="text-[#888888] text-sm uppercase tracking-widest">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className={PAGE}>
      {/* Header */}
      <header className="w-full border-b border-white/[0.06] bg-black px-4 md:px-8 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-white font-bold tracking-[0.2em] text-sm">BBIT</span>
          <span className="text-white/20">|</span>
          <span className="text-xs font-bold uppercase tracking-widest text-[#e0e0e0]">Barber Dashboard</span>
          {pendingCount > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#f59e0b] border border-[#f59e0b]/35 px-2 py-1 rounded-sm bg-[#f59e0b]/10">
              Requests waiting ({pendingCount})
            </span>
          )}
        </div>
        <div className="flex-1 flex justify-center">
          <p className="text-sm md:text-base font-bold text-white tracking-[0.15em] text-center">{headerDateStr}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className={btnHeaderSecondary} onClick={handleBlockToday}>
            Block Today
          </button>
          <a
            href={publicBookingPageUrl}
            className={btnHeaderSecondary}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Booking Page
          </a>
          <Link to="/" className={btnPrimary}>
            ← Home
          </Link>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 md:px-8 pb-8 space-y-0">
        {/* 1 Today */}
        <section className={SECTION_BLOCK}>
          <h2 className={`${SECTION_TITLE} mb-6`}>Today&apos;s bookings</h2>
          {today.length === 0 ? (
            <div className={`${CARD} p-12 flex flex-col items-center justify-center text-center`}>
              <Scissors className="h-10 w-10 text-[#888888] mb-4" strokeWidth={1.25} />
              <p className="text-[#e0e0e0] text-sm max-w-md">
                No bookings today — enjoy your day Ramad
              </p>
              <a
                href={publicBookingPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 text-xs font-medium text-[#a3a3a3] hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                Booking page is live →
              </a>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
              {today.map(todayCard)}
            </div>
          )}
        </section>

        {/* 2 Pending — new requests + change requests */}
        <section className={SECTION_BLOCK}>
          <div className="flex items-center gap-2 mb-6">
            {pendingCount > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f59e0b] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f59e0b]" />
              </span>
            )}
            <h2 className={SECTION_TITLE}>Pending requests</h2>
            {pendingCount > 0 && (
              <span className="text-xs font-bold text-[#f59e0b] tabular-nums">({pendingCount})</span>
            )}
          </div>

          <div className="space-y-10">
            <div>
              <h3 className={`${LABEL} mb-3 text-white`}>New booking requests</h3>
              <div className="rounded-sm border border-white/[0.06] border-l-[3px] border-l-[#f59e0b] bg-[rgba(245,158,11,0.05)] shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden">
                {newBookingRequests.length === 0 ? (
                  <p className={`${BODY} p-6 text-[#888888]`}>No new requests.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead>
                        <tr className="border-b border-white/[0.08]">
                          <th className={`${LABEL} text-left p-4`}>Customer</th>
                          <th className={`${LABEL} text-left p-4`}>Phone</th>
                          <th className={`${LABEL} text-left p-4`}>Service</th>
                          <th className={`${LABEL} text-left p-4`}>Date</th>
                          <th className={`${LABEL} text-left p-4`}>Time</th>
                          <th className={`${LABEL} text-left p-4`}>Notes</th>
                          <th className={`${LABEL} text-right p-4`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newBookingRequests.map((b) => (
                          <tr key={b.id} className="border-b border-white/[0.05] hover:bg-black/20">
                            <td className="p-4 font-semibold text-white">{b.customer_name}</td>
                            <td className={`p-4 ${BODY} tabular-nums`}>{b.customer_phone}</td>
                            <td className={`p-4 ${BODY}`}>{b.service.name}</td>
                            <td className={`p-4 ${BODY}`}>{formatDateLong(b.slot_start)}</td>
                            <td className="p-4 text-white tabular-nums">{formatTime(b.slot_start)}</td>
                            <td className={`p-4 ${BODY} max-w-[200px] truncate`} title={b.notes}>
                              {b.notes?.trim() ? b.notes : "—"}
                            </td>
                            <td className="p-4 text-right">{renderActions(b, true)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className={`${LABEL} mb-3 text-white`}>Cancellation &amp; reschedule</h3>
              <div className="rounded-sm border border-white/[0.06] border-l-[3px] border-l-[#f59e0b] bg-[rgba(245,158,11,0.05)] shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden">
                {changeRequests.length === 0 ? (
                  <p className={`${BODY} p-6 text-[#888888]`}>No change requests.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[960px]">
                      <thead>
                        <tr className="border-b border-white/[0.08]">
                          <th className={`${LABEL} text-left p-4`}>Type</th>
                          <th className={`${LABEL} text-left p-4`}>Customer</th>
                          <th className={`${LABEL} text-left p-4`}>Service</th>
                          <th className={`${LABEL} text-left p-4`}>Current</th>
                          <th className={`${LABEL} text-left p-4`}>Requested</th>
                          <th className={`${LABEL} text-right p-4`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changeRequests.map((b) => (
                          <tr key={b.id} className="border-b border-white/[0.05] hover:bg-black/20">
                            <td className="p-4">
                              <span
                                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm ${statusBadgeClass(b.status)}`}
                              >
                                {statusDisplayLabel(b.status)}
                              </span>
                            </td>
                            <td className="p-4 font-semibold text-white">{b.customer_name}</td>
                            <td className={`p-4 ${BODY}`}>{b.service.name}</td>
                            <td className={`p-4 ${BODY}`}>
                              {formatDateLong(b.slot_start)} {formatTime(b.slot_start)}
                            </td>
                            <td className={`p-4 ${BODY}`}>
                              {b.status === "reschedule_requested" && b.new_requested_date
                                ? `${formatDateLong(b.new_requested_date)} ${formatTime(b.new_requested_date)}`
                                : "—"}
                            </td>
                            <td className="p-4 text-right">{renderActions(b, true)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3 Week */}
        <section className={SECTION_BLOCK}>
          <h2 className={`${SECTION_TITLE} mb-6`}>Upcoming week</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {week.map((day) => {
              const isToday = day.date === weekTodayIso;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => expandDay(day.date)}
                  className={`${CARD} p-4 text-left transition-all ${
                    isToday ? "ring-1 ring-white border-white/30" : ""
                  } ${day.blocked ? "opacity-80" : ""}`}
                >
                  <div className="text-sm font-bold text-[#888888] uppercase tracking-wider">
                    {new Date(day.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "short" })}
                  </div>
                  <div className="text-2xl font-bold text-white mt-1">{day.date.slice(8)}</div>
                  <div className="text-base mt-2 tabular-nums">
                    {day.count > 0 ? (
                      <span className="font-bold text-[#f59e0b]">{day.count}</span>
                    ) : (
                      <span className="text-[#525252] font-medium">—</span>
                    )}
                  </div>
                  {day.blocked && (
                    <div className="text-[10px] text-[#ef4444] mt-1 uppercase tracking-wide">Blocked</div>
                  )}
                </button>
              );
            })}
          </div>
          {expandedDay && (
            <div className={`${CARD} mt-6 p-6`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white">{expandedDay}</h3>
                <button type="button" className={btnSecondary} onClick={() => expandDay(expandedDay)}>
                  Close
                </button>
              </div>
              {dayBookings.length === 0 ? (
                <p className={BODY}>No bookings.</p>
              ) : (
                <div className="flex flex-wrap gap-4">{dayBookings.map(todayCard)}</div>
              )}
            </div>
          )}
        </section>

        {/* 4 Analytics */}
        <section className={SECTION_BLOCK}>
          <p className={`${LABEL} mb-2`}>This month</p>
          <h2 className={`${SECTION_TITLE} mb-8`}>Analytics</h2>
          {analytics && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
                {[
                  {
                    label: "Cuts this month",
                    val: String(analytics.cuts_this_month ?? "—"),
                    icon: Scissors,
                    accent: "border-t-2 border-t-white",
                  },
                  {
                    label: "Busiest day (week)",
                    val: String(analytics.busiest_day_this_week || "—"),
                    icon: CalendarDays,
                    accent: "border-t-2 border-t-[#f59e0b]",
                  },
                  {
                    label: "New customers",
                    val: String(analytics.new_customers_this_month ?? "—"),
                    icon: Users,
                    accent: "border-t-2 border-t-[#10b981]",
                  },
                  {
                    label: "Returning",
                    val: String(analytics.returning_customers_this_month ?? "—"),
                    icon: TrendingUp,
                    accent: "border-t-2 border-t-[#3b82f6]",
                  },
                  {
                    label: "Top service",
                    val: String(analytics.most_popular_service || "—"),
                    icon: BarChart3,
                    accent: "border-t-2 border-t-[#9ca3af]",
                  },
                ].map(({ label, val, icon: Icon, accent }) => (
                  <div key={label} className={`${CARD} ${accent} p-5 relative`}>
                    <Icon className="absolute top-4 right-4 h-4 w-4 text-[#888888]" strokeWidth={1.5} />
                    <p className={`${LABEL} pr-8`}>{label}</p>
                    <p className="text-4xl font-bold text-white mt-3 break-words">{val}</p>
                  </div>
                ))}
              </div>
              <div className={`${CARD} p-6`}>
                <h3 className={`${SECTION_TITLE} text-sm mb-6`}>Bookings — last 30 days</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 32 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#888888"
                        tick={{ fill: "#888888", fontSize: 10 }}
                        interval={4}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#888888"
                        tick={{ fill: "#888888", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        label={{
                          value: "Bookings",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#888888",
                          fontSize: 11,
                        }}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload as { fullDate?: string; date?: string; count: number };
                          const d = p.fullDate || p.date;
                          return (
                            <div className="rounded-sm border border-white/10 bg-[#141414] px-3 py-2 shadow-xl">
                              <p className="text-xs text-white font-medium">{d}</p>
                              <p className="text-xs text-[#e0e0e0] mt-1">
                                Bookings: <span className="text-white font-bold">{p.count}</span>
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="rgba(255,255,255,0.8)"
                        activeBar={{
                          fill: "rgba(255,255,255,0.98)",
                          stroke: "rgba(255,255,255,0.7)",
                          strokeWidth: 1,
                          style: { filter: "drop-shadow(0 0 14px rgba(255,255,255,0.55))" },
                        }}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </section>

        {/* 5 Customers */}
        <section className={SECTION_BLOCK}>
          <h2 className={`${SECTION_TITLE} mb-6`}>Customers</h2>
          <Input
            placeholder="Search name or phone…"
            value={custSearch}
            onChange={(e) => setCustSearch(e.target.value)}
            className="max-w-md bg-[#141414] border border-white/20 text-white placeholder:text-[#888888] rounded-sm mb-6 h-11"
          />
          <div className={`${CARD} overflow-hidden`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.12]">
                  <th className={`${LABEL} text-left p-4`}>Name</th>
                  <th className={`${LABEL} text-left p-4`}>Phone</th>
                  <th className={`${LABEL} text-left p-4`}>Visits</th>
                  <th className={`${LABEL} text-left p-4`}>Last visit</th>
                  <th className={`${LABEL} text-left p-4`}>Favourite</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((row) => (
                  <Fragment key={row.phone}>
                    <tr
                      className="border-b border-white/[0.05] hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                      onClick={() => openCustomer(row)}
                    >
                      <td className="p-4 font-medium text-white">{row.name || "—"}</td>
                      <td className={`p-4 ${BODY}`}>{row.phone}</td>
                      <td className={`p-4 ${BODY}`}>{row.total_visits}</td>
                      <td className={`p-4 text-[#888888]`}>
                        {row.last_visit ? new Date(row.last_visit).toLocaleString("en-ZA") : "—"}
                      </td>
                      <td className={`p-4 ${BODY}`}>{row.favorite_service || "—"}</td>
                    </tr>
                    {expandedCust === row.phone_normalized && (
                      <tr className="bg-[#0f0f0f]">
                        <td colSpan={5} className="p-6 space-y-6">
                          <div>
                            <h4 className={`${LABEL} mb-4`}>Booking history</h4>
                            <div className="space-y-3 border-l border-white/[0.08] pl-4 ml-1">
                              {row.booking_history?.map((h) => (
                                <div key={h.id} className="relative">
                                  <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-white/30" />
                                  <p className="text-xs text-[#888888]">
                                    {new Date(h.slot_start).toLocaleString("en-ZA")}
                                  </p>
                                  <p className="text-sm text-[#e0e0e0] mt-0.5">
                                    {h.service_name}{" "}
                                    <span className={`text-[10px] ml-2 ${statusBadgeClass(h.status)} px-1.5 py-0.5 rounded-sm`}>
                                      {h.status}
                                    </span>
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className={LABEL}>Birthday</label>
                            <Input
                              type="date"
                              className="mt-2 max-w-xs bg-[#141414] border border-white/15 text-white rounded-sm"
                              value={birthdayDraft}
                              onChange={(e) => setBirthdayDraft(e.target.value)}
                            />
                            <button type="button" className={`${btnPrimary} mt-3`} onClick={() => saveBirth(row)}>
                              Save birthday
                            </button>
                          </div>
                          {row.customer_user_id ? (
                            <div>
                              <label className={LABEL}>Staff note</label>
                              <textarea
                                className="mt-2 w-full min-h-[100px] bg-[#141414] border border-white/[0.08] rounded-sm p-3 text-sm text-[#e0e0e0]"
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                              />
                              <button type="button" className={`${btnPrimary} mt-3`} onClick={() => saveNote(row)}>
                                Save note
                              </button>
                            </div>
                          ) : (
                            <p className={`${BODY} text-[#888888]`}>
                              Staff notes require a registered customer (linked user).
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 6 Schedule */}
        <section className="py-12 border-b-0">
          <h2 className={`${SECTION_TITLE} mb-6`}>Schedule · block days</h2>
          {showGcalManualBlockWarning ? (
            <div
              role="status"
              className="mb-6 rounded-sm border border-amber-500/45 bg-amber-950/50 px-4 py-3 text-sm text-amber-100/95 leading-relaxed"
            >
              <p className="font-semibold text-amber-200 mb-1">Google Calendar</p>
              <p className="text-amber-100/90">
                Note: You must also block this date manually in Google Calendar to prevent new bookings via your
                appointment schedule. Open{" "}
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium text-amber-50 hover:text-white"
                >
                  Google Calendar
                </a>{" "}
                and mark the day unavailable, or connect Calendar in BBIT settings if available.
              </p>
            </div>
          ) : null}
          <div className="flex gap-4 mb-6 items-center">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            >
              Prev
            </button>
            <span className="text-sm font-bold uppercase tracking-widest text-white">
              {calendarMonth.toLocaleString("en-ZA", { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            >
              Next
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-[#888888] mb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthGrid.map((cell, i) => {
              if (!cell) return <div key={i} />;
              const isBlocked = blockedByDate.has(cell.iso);
              const isTodayCell = cell.iso === weekTodayIso;
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => toggleBlockDay(cell.iso)}
                  className={`min-h-[44px] rounded-sm border text-sm font-medium transition-all ${
                    isBlocked
                      ? "bg-[#1a0000] border-[#ef4444]/50 text-[#ef4444]"
                      : isTodayCell
                        ? "bg-[#141414] border-white text-white ring-1 ring-white/40"
                        : `${CARD} text-[#e0e0e0]`
                  }`}
                >
                  {cell.d}
                </button>
              );
            })}
          </div>

          {blockInline && (
            <div className={`${CARD} mt-6 p-4 flex flex-col sm:flex-row gap-3 items-end`}>
              <div className="flex-1 w-full">
                <p className={`${LABEL} mb-2`}>Block {blockInline.iso}</p>
                <Input
                  placeholder="Reason (optional)"
                  value={blockInline.reason}
                  onChange={(e) => setBlockInline({ ...blockInline, reason: e.target.value })}
                  className="bg-[#141414] border border-white/15 text-white placeholder:text-[#888888] rounded-sm"
                />
              </div>
              <button type="button" className={btnPrimary} onClick={submitInlineBlock}>
                Confirm block
              </button>
              <button type="button" className={btnSecondary} onClick={() => setBlockInline(null)}>
                Cancel
              </button>
            </div>
          )}

          <p className={`${BODY} text-[#888888] mt-6 flex items-center gap-2`}>
            <Lock className="h-3.5 w-3.5" />
            Blocked days are hidden from the booking picker. Click a date to block or unblock.
          </p>
        </section>
      </main>

      <Dialog
        open={!!reasonDialog}
        onOpenChange={(open) => {
          if (!open) {
            setReasonDialog(null);
            setReasonDraft("");
          }
        }}
      >
        <DialogContent className="bg-[#141414] border border-white/[0.08] text-[#e0e0e0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-base uppercase tracking-widest">
              {reasonDialog?.action === "decline" ? "Decline request" : "Reject — optional note"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#888888]">
            Optional text to include in the WhatsApp message to the customer.
          </p>
          <Textarea
            value={reasonDraft}
            onChange={(e) => setReasonDraft(e.target.value)}
            placeholder="Reason…"
            className="bg-[#0a0a0a] border-white/10 text-white min-h-[100px] rounded-sm"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                setReasonDialog(null);
                setReasonDraft("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={btnPrimary}
              onClick={async () => {
                if (!reasonDialog) return;
                const act =
                  reasonDialog.action === "decline"
                    ? "decline"
                    : reasonDialog.action === "reject-cancellation"
                      ? "reject-cancellation"
                      : "reject-reschedule";
                const ok = await runStaffAction(reasonDialog.id, act, { reason: reasonDraft });
                if (ok) {
                  setReasonDialog(null);
                  setReasonDraft("");
                }
              }}
            >
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
