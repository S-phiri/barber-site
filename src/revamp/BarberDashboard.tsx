import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedNumber, Card, Chip, Eyebrow, Icon, useToast } from "@/revamp/shared";
import dayjs from "dayjs";
import { http } from "@/lib/api";

const formatSAST = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

type RequestRow = { id: string; name: string; service: string; time: string; phone: string; note?: string };
type ChangeRow = { id: string; name: string; service: string; kind: string; from: string; to: string };
type TodayRow = {
  id: string;
  time: string;
  duration: string;
  name: string;
  service: string;
  status: "done" | "now" | "next" | "pending" | "upcoming";
  tag?: "regular" | "new";
};

type UpcomingDayApi = {
  date: string;
  day_of_week: string;
  day_number: number;
  count: number;
  is_blocked: boolean;
  is_closed: boolean;
};

type CustomerRowApi = {
  name: string;
  phone: string;
  visit_count: number;
  last_visit: string;
  favourite_service: string;
  status: string;
};

type AnalyticsTopServiceApi = {
  name: string;
  count: number;
  percentage: number;
};

type AnalyticsDailyCountApi = {
  date: string;
  count: number;
};

type MonthAnalyticsApi = {
  total_bookings: number;
  total_revenue: number;
  busiest_day: string;
  top_services: AnalyticsTopServiceApi[];
  daily_counts: AnalyticsDailyCountApi[];
};

type MonthCell = { muted?: boolean; n: number; blocked?: boolean; today?: boolean };

const JOBURG_TZ = "Africa/Johannesburg";

/** Today's calendar Y-M-D in Africa/Johannesburg (for date comparisons). */
function getJohannesburgCalendarDateParts(d: Date = new Date()): { y: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JOBURG_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const v = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: v("year"), m: v("month") - 1, day: v("day") };
}

function isCalendarDayBeforeJohannesburgToday(
  y: number,
  month0: number,
  day: number,
  jToday: { y: number; m: number; day: number },
): boolean {
  if (y !== jToday.y) return y < jToday.y;
  if (month0 !== jToday.m) return month0 < jToday.m;
  return day < jToday.day;
}

/** Monday-first weekday index for the 1st of the month (Mon=0 … Sun=6). */
function leadingEmptyCells(year: number, month: number): number {
  const first = new Date(year, month, 1);
  return (first.getDay() + 6) % 7;
}

function buildMonth(year: number, month: number, todayDate: Date = new Date()): MonthCell[] {
  const prevPad = leadingEmptyCells(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: MonthCell[] = [];
  for (let i = 0; i < prevPad; i++) cells.push({ muted: true, n: 0 });
  const jToday = getJohannesburgCalendarDateParts(todayDate);
  const isToday = (d: number) => jToday.y === year && jToday.m === month && jToday.day === d;
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ n: d, blocked: false, today: isToday(d) });
  }
  while (cells.length % 7 !== 0) cells.push({ muted: true, n: 0 });
  return cells;
}

export default function BarberDashboard({ displayName = "Ramad" }: { displayName?: string }) {
  const toast = useToast();
  const [calendarView, setCalendarView] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [today, setToday] = useState<TodayRow[]>([]);
  const [gcalConnected, setGcalConnected] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [upcomingDays, setUpcomingDays] = useState<UpcomingDayApi[]>([]);
  const [customerRows, setCustomerRows] = useState<CustomerRowApi[]>([]);
  const [monthAnalytics, setMonthAnalytics] = useState<MonthAnalyticsApi | null>(null);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(() => new Set());
  const blockedDatesInitialFetchDone = useRef(false);

  const upcomingByIso = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of upcomingDays) {
      const raw = String(d.date ?? "").trim();
      const key = raw.length >= 10 ? raw.slice(0, 10) : raw;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      map.set(key, Number(d.count ?? 0));
    }
    return map;
  }, [upcomingDays]);

  const blockMonthGrid = useMemo(() => {
    const { y, m } = calendarView;
    const base = buildMonth(y, m, new Date());
    const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;
    return base.map((c) => {
      if (!c.n || c.muted) return c;
      const iso = `${prefix}-${String(c.n).padStart(2, "0")}`;
      return { ...c, blocked: blockedDates.has(iso) };
    });
  }, [calendarView, blockedDates]);

  async function getJson(primaryPath: string) {
    const res = await http(primaryPath);
    if (!res.ok) throw new Error(`GET ${primaryPath} failed (${res.status})`);
    return res.json() as Promise<any>;
  }

  async function fetchDashboardData() {
    const [pendingData, todayData] = await Promise.all([getJson("/api/barber/pending/"), getJson("/api/barber/today/")]);

    const pendingResults: any[] = (pendingData?.results as any[]) || [];
    const todayResultsRaw: any[] = (todayData?.results as any[]) || [];

    const reqRows: RequestRow[] = [];
    const changeRows: ChangeRow[] = [];

    for (const b of pendingResults) {
      const id = String(b?.id ?? "");
      const name = String(b?.customer_name ?? b?.name ?? "");
      const service = String(b?.service_name ?? b?.service?.name ?? b?.service ?? "");
      const phone = String(b?.customer_phone ?? b?.phone ?? "");
      const startIso = String(b?.start_time ?? b?.start ?? b?.slot_start_at ?? "");
      const time = startIso ? `${dayjs(startIso).format("ddd D")}, ${formatSAST(startIso)}` : "";
      const note = (b?.notes ?? b?.note) ? String(b?.notes ?? b?.note) : undefined;
      const status = String(b?.status ?? "pending");

      if (status === "reschedule_requested" || status === "cancellation_requested") {
        const from = time;
        const toIso = String(b?.new_requested_date ?? "");
        const toTime = String(b?.new_requested_time ?? "");
        const to =
          toIso
            ? toIso.includes("T")
              ? `${dayjs(toIso).format("ddd D")}, ${formatSAST(toIso)}`
              : dayjs(toIso).format("ddd D, HH:mm")
            : toTime
              ? toTime
              : status === "cancellation_requested"
                ? "Cancel"
                : "";

        changeRows.push({
          id,
          name,
          service,
          kind: status === "reschedule_requested" ? "Reschedule" : "Cancellation",
          from,
          to,
        });
      } else {
        reqRows.push({ id, name, service, time, phone, ...(note ? { note } : {}) });
      }
    }

    // Sort pending by time (best-effort)
    reqRows.sort((a, b) => a.time.localeCompare(b.time));
    changeRows.sort((a, b) => a.from.localeCompare(b.from));

    const now = dayjs();
    const todayResults = [...todayResultsRaw].sort((a, b) =>
      String(a?.slot_start ?? a?.start_time ?? "").localeCompare(String(b?.slot_start ?? b?.start_time ?? "")),
    );

    const mappedToday: (TodayRow & { _start?: string; _end?: string })[] = todayResults.map((b) => {
      const id = String(b?.id ?? "");
      const name = String(b?.customer_name ?? b?.name ?? "");
      const service = String(b?.service_name ?? b?.service?.name ?? b?.service ?? "");
      const startIso = String(b?.start_time ?? b?.slot_start ?? b?.slot_start_at ?? b?.slot?.start_at ?? "");
      const durMin = Number(b?.duration_minutes ?? b?.duration ?? 0);
      const start = startIso ? dayjs(startIso) : null;
      const end = start && durMin ? start.add(durMin, "minute") : null;

      const backendStatus = String(b?.status ?? "");
      const done = backendStatus === "completed";
      const pending = backendStatus === "pending" || backendStatus.endsWith("_requested");

      return {
        id,
        time: startIso ? formatSAST(startIso) : "",
        duration: durMin ? `${durMin}m` : "",
        name,
        service,
        status: done ? "done" : pending ? "pending" : "upcoming",
        _start: start ? start.toISOString() : undefined,
        _end: end ? end.toISOString() : undefined,
      };
    });

    // Derive a single "now" and "next" for non-done, non-pending rows.
    const activeCandidates = mappedToday
      .map((t, idx) => ({ t, idx }))
      .filter(({ t }) => t.status === "upcoming" && t._start)
      .sort((a, b) => String(a.t._start).localeCompare(String(b.t._start)));

    let nextIdx: number | null = null;
    let nowIdx: number | null = null;
    for (const { t, idx } of activeCandidates) {
      const start = t._start ? dayjs(t._start) : null;
      const end = t._end ? dayjs(t._end) : null;
      if (start && end && now.isAfter(start) && now.isBefore(end)) {
        nowIdx = idx;
        break;
      }
      if (start && now.isBefore(start) && nextIdx == null) nextIdx = idx;
    }
    if (nowIdx == null && nextIdx == null && activeCandidates.length > 0) {
      nextIdx = activeCandidates[0]!.idx;
    }

    const finalToday: TodayRow[] = mappedToday.map(({ _start, _end, ...t }, idx) => {
      if (t.status === "upcoming" && idx === nowIdx) return { ...t, status: "now" };
      if (t.status === "upcoming" && idx === nextIdx) return { ...t, status: "next" };
      return t;
    });

    return { reqRows, changeRows, finalToday };
  }

  async function reloadDashboard() {
    // Empty state while loading
    setRequests([]);
    setChanges([]);
    setToday([]);

    try {
      const { reqRows, changeRows, finalToday } = await fetchDashboardData();
      setRequests(reqRows);
      setChanges(changeRows);
      setToday(finalToday);
    } catch (err) {
      console.error("Failed to load barber dashboard data", err);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await reloadDashboard();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await http("/api/barber/google-calendar/status/");
        if (!res.ok) throw new Error(`GET /api/barber/google-calendar/status/ failed (${res.status})`);
        const data = await res.json();
        setGcalConnected(Boolean(data?.is_connected));
        console.log("[gcal status]", data);
      } catch (err) {
        setGcalConnected(null);
        console.error("[gcal status] failed", err);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const access = localStorage.getItem("access");
        const res = await http("/api/barber/upcoming/", {
          method: "GET",
          ...(access ? { headers: { Authorization: `Bearer ${access}` } } : {}),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { days?: unknown };
        const raw = Array.isArray(data?.days) ? data.days : [];
        const days: UpcomingDayApi[] = raw.map((row: Record<string, unknown>) => ({
          date: String(row?.date ?? ""),
          day_of_week: String(row?.day_of_week ?? ""),
          day_number: Number(row?.day_number ?? 0),
          count: Number(row?.count ?? 0),
          is_blocked: Boolean(row?.is_blocked),
          is_closed: Boolean(row?.is_closed),
        }));
        if (!cancelled) setUpcomingDays(days);
      } catch (e) {
        console.error("[upcoming] failed", e);
        if (!cancelled) setUpcomingDays([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const access = localStorage.getItem("access");
        const res = await http("/api/barber/customers/", {
          method: "GET",
          ...(access ? { headers: { Authorization: `Bearer ${access}` } } : {}),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { results?: unknown };
        const raw = Array.isArray(data?.results) ? data.results : [];
        const rows: CustomerRowApi[] = raw.map((row: Record<string, unknown>) => ({
          name: String(row?.name ?? ""),
          phone: String(row?.phone ?? ""),
          visit_count: Number(row?.visit_count ?? 0),
          last_visit: String(row?.last_visit ?? ""),
          favourite_service: String(row?.favourite_service ?? ""),
          status: String(row?.status ?? ""),
        }));
        if (!cancelled) setCustomerRows(rows);
      } catch (e) {
        console.error("[customers] failed", e);
        if (!cancelled) setCustomerRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const access = localStorage.getItem("access");
        const res = await http("/api/barber/analytics/", {
          method: "GET",
          ...(access ? { headers: { Authorization: `Bearer ${access}` } } : {}),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Record<string, unknown>;
        const rawTop = Array.isArray(data?.top_services) ? data.top_services : [];
        const top_services: AnalyticsTopServiceApi[] = rawTop.map((row: Record<string, unknown>) => ({
          name: String(row?.name ?? ""),
          count: Number(row?.count ?? 0),
          percentage: Number(row?.percentage ?? 0),
        }));
        const rawDaily = Array.isArray(data?.daily_counts) ? data.daily_counts : [];
        const daily_counts: AnalyticsDailyCountApi[] = rawDaily.map((row: Record<string, unknown>) => ({
          date: String(row?.date ?? ""),
          count: Number(row?.count ?? 0),
        }));
        const payload: MonthAnalyticsApi = {
          total_bookings: Number(data?.total_bookings ?? 0),
          total_revenue: Number(data?.total_revenue ?? 0),
          busiest_day: String(data?.busiest_day ?? ""),
          top_services,
          daily_counts,
        };
        if (!cancelled) setMonthAnalytics(payload);
      } catch (e) {
        console.error("[analytics] failed", e);
        if (!cancelled) setMonthAnalytics(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // GET /api/barber/blocked-dates/ once on mount (no re-fetch after block/unblock — toggles use setBlockedForIso).
  useEffect(() => {
    if (blockedDatesInitialFetchDone.current) return;
    blockedDatesInitialFetchDone.current = true;
    let cancelled = false;
    (async () => {
      try {
        const access = localStorage.getItem("access");
        const res = await http("/api/barber/blocked-dates/", {
          method: "GET",
          ...(access ? { headers: { Authorization: `Bearer ${access}` } } : {}),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as unknown;
        const dates = Array.isArray(data) ? data : [];
        const normalized = new Set<string>();
        for (const d of dates) {
          if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) normalized.add(d);
        }
        if (cancelled) return;
        setBlockedDates(normalized);
      } catch (e) {
        console.error("[blocked-dates] failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setBlockedForIso = (iso: string, isBlocked: boolean) => {
    setBlockedDates((prev) => {
      const next = new Set(prev);
      if (isBlocked) next.add(iso);
      else next.delete(iso);
      return next;
    });
  };

  // Simulated "current time" — (just triggers subtle re-render like prototype)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => window.clearInterval(i);
  }, []);

  const now = useMemo(() => dayjs(), [tick]);
  const greeting = now.hour() < 12 ? "Good morning" : now.hour() < 17 ? "Good afternoon" : "Good evening";
  const displayNameCaps = useMemo(() => {
    const s = String(displayName || "").trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [displayName]);

  const connectGoogleCalendar = async () => {
    try {
      const res = await http("/api/barber/google-calendar/auth/");
      if (!res.ok) throw new Error(`GET /api/barber/google-calendar/auth/ failed (${res.status})`);
      const data = await res.json();
      const url = String(data?.authorization_url || "");
      if (!url) throw new Error("Missing authorization_url");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("[gcal connect] failed", err);
    }
  };

  const acceptRequest = async (r: RequestRow) => {
    setRequests((rs) => rs.filter((x) => x.id !== r.id));
    try {
      const res = await http(`/api/barber/bookings/${r.id}/accept/`, { method: "PATCH" });
      if (!res.ok) throw new Error(`PATCH /api/barber/bookings/${r.id}/accept/ failed (${res.status})`);
      toast({ title: `Accepted ${r.name}`, body: `${r.service} — ${r.time}`, tone: "success", icon: "check" });
      await reloadDashboard();
    } catch (err) {
      console.error("Failed to accept booking", err);
      toast({ title: "Couldn’t accept booking", body: "Please try again.", tone: "danger", icon: "x" });
      await reloadDashboard();
    }
  };

  const declineRequest = async (r: RequestRow) => {
    setRequests((rs) => rs.filter((x) => x.id !== r.id));
    try {
      const res = await http(`/api/barber/bookings/${r.id}/decline/`, { method: "PATCH" });
      if (!res.ok) throw new Error(`PATCH /api/barber/bookings/${r.id}/decline/ failed (${res.status})`);
      toast({ title: `Declined ${r.name}`, body: "Customer was notified.", tone: "danger", icon: "x" });
      await reloadDashboard();
    } catch (err) {
      console.error("Failed to decline booking", err);
      toast({ title: "Couldn’t decline booking", body: "Please try again.", tone: "danger", icon: "x" });
      await reloadDashboard();
    }
  };

  const approveChange = async (c: ChangeRow) => {
    setChanges((cs) => cs.filter((x) => x.id !== c.id));
    try {
      const path =
        c.kind === "Reschedule"
          ? `/api/barber/bookings/${c.id}/approve-reschedule/`
          : `/api/barber/bookings/${c.id}/approve-cancellation/`;
      const res = await http(path, { method: "PATCH" });
      if (!res.ok) throw new Error(`PATCH ${path} failed (${res.status})`);
      toast({ title: `${c.kind} approved`, body: `${c.name} — ${c.to}`, tone: "success", icon: "check" });
      await reloadDashboard();
    } catch (err) {
      console.error("Failed to approve change", err);
      toast({ title: `Couldn’t approve ${c.kind.toLowerCase()}`, body: "Please try again.", tone: "danger", icon: "x" });
      await reloadDashboard();
    }
  };

  const toggleBlock = (idx: number) => {
    const cell = blockMonthGrid[idx];
    if (!cell || cell.muted || !cell.n) return;
    const { y, m: mo } = calendarView;
    if (new Date(y, mo, cell.n).getDay() === 0) return;
    const iso = `${y}-${String(mo + 1).padStart(2, "0")}-${String(cell.n).padStart(2, "0")}`;
    const monthName = new Date(y, mo, 1).toLocaleDateString("en-GB", { month: "long" });
    const willBlock = !Boolean(cell.blocked);
    (async () => {
      try {
        const access = localStorage.getItem("access");
        if (willBlock) {
          const res = await http("/api/barber/blocked-dates/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(access ? { Authorization: `Bearer ${access}` } : {}),
            },
            body: JSON.stringify({ date: iso }),
          });
          if (!res.ok) throw new Error(`POST /api/barber/blocked-dates/ failed (${res.status})`);
          setBlockedForIso(iso, true);
          toast({ title: `Blocked ${monthName} ${cell.n}`, icon: "ban" });
        } else {
          const res = await http(`/api/barber/blocked-dates/${iso}/`, {
            method: "DELETE",
            ...(access ? { headers: { Authorization: `Bearer ${access}` } } : {}),
          });
          if (!res.ok) throw new Error(`DELETE /api/barber/blocked-dates/${iso}/ failed (${res.status})`);
          setBlockedForIso(iso, false);
          toast({ title: `Unblocked ${monthName} ${cell.n}`, icon: "check" });
        }
      } catch (e) {
        console.error("[blocked-dates toggle] failed", e);
        toast({ title: "Couldn’t update blocked day", body: "Please try again.", tone: "danger", icon: "x" });
      }
    })();
  };

  const toggleTodayBlocked = async () => {
    const todayDay = blockMonthGrid.find((c) => c.today)?.n;
    if (!todayDay) return;
    const { y, m: mo } = calendarView;
    if (new Date(y, mo, todayDay).getDay() === 0) return;
    const iso = `${y}-${String(mo + 1).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`;
    const isCurrentlyBlocked = blockedDates.has(iso) || Boolean(blockMonthGrid.find((c) => c.n === todayDay)?.blocked);
    const willBlock = !isCurrentlyBlocked;
    try {
      const access = localStorage.getItem("access");
      if (willBlock) {
        const res = await http("/api/barber/blocked-dates/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(access ? { Authorization: `Bearer ${access}` } : {}),
          },
          body: JSON.stringify({ date: iso }),
        });
        if (!res.ok) throw new Error(`POST /api/barber/blocked-dates/ failed (${res.status})`);
        setBlockedForIso(iso, true);
        toast({ title: "Time blocked", icon: "ban" });
      } else {
        const res = await http(`/api/barber/blocked-dates/${iso}/`, {
          method: "DELETE",
          ...(access ? { headers: { Authorization: `Bearer ${access}` } } : {}),
        });
        if (!res.ok) throw new Error(`DELETE /api/barber/blocked-dates/${iso}/ failed (${res.status})`);
        setBlockedForIso(iso, false);
        toast({ title: "Time unblocked", icon: "check" });
      }
    } catch (e) {
      console.error("[blocked-dates today toggle] failed", e);
      toast({ title: "Couldn’t update blocked day", body: "Please try again.", tone: "danger", icon: "x" });
    }
  };

  const displayedCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customerRows;
    return customerRows.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q),
    );
  }, [customerRows, search]);

  const dailyCounts = monthAnalytics?.daily_counts;
  const bars30 = useMemo(() => {
    if (!dailyCounts?.length) return Array.from({ length: 30 }, () => 0);
    const counts = dailyCounts.map((d) => d.count);
    const out = counts.slice(0, 30);
    while (out.length < 30) out.push(0);
    return out;
  }, [dailyCounts]);

  const maxBar = useMemo(() => Math.max(1, ...bars30), [bars30]);

  const momentumAxisLabels = useMemo(() => {
    const dc = monthAnalytics?.daily_counts;
    if (!dc?.length) {
      return { start: "", mid: "", end: "" };
    }
    const fmt = (iso: string) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? dayjs(iso.slice(0, 10)).format("MMM D").toUpperCase() : "");
    const lastIdx = Math.min(dc.length, 30) - 1;
    const endIso = dc[lastIdx]?.date ?? "";
    const todayIso = now.format("YYYY-MM-DD");
    const endLabel =
      endIso.slice(0, 10) === todayIso && endIso ? `${fmt(endIso)} · today` : fmt(endIso);
    return {
      start: fmt(dc[0]?.date ?? ""),
      mid: fmt(dc[Math.floor(lastIdx / 2)]?.date ?? ""),
      end: endLabel,
    };
  }, [monthAnalytics?.daily_counts, now]);

  const blockCalendarHeading = useMemo(() => {
    const { y, m } = calendarView;
    return new Date(y, m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" }).toUpperCase();
  }, [calendarView]);

  const goBlockCalendarPrev = () => {
    setCalendarView((cv) => {
      let { y, m } = cv;
      m -= 1;
      if (m < 0) {
        m = 11;
        y -= 1;
      }
      return { y, m };
    });
  };

  const goBlockCalendarNext = () => {
    setCalendarView((cv) => {
      let { y, m } = cv;
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
      return { y, m };
    });
  };

  return (
    <div className="page">
      {/* HEADER */}
      <div className="page-header enter" style={{ animationDelay: ".05s" }}>
        <div>
          <Eyebrow>{now.format("dddd · D MMMM YYYY · HH:mm")}</Eyebrow>
          <h1 className="page-title" style={{ marginTop: 10 }}>
            {greeting}, <em>{displayNameCaps}</em>.
          </h1>
          <p className="page-subtitle">
            {requests.length === 0
              ? "No new booking requests"
              : `You have ${requests.length} new booking request${requests.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="dock">
          {/* TODO: move to settings */}
          {gcalConnected === false ? (
            <button type="button" onClick={connectGoogleCalendar}>
              <Icon name="calendar" />
              Connect Google Calendar
            </button>
          ) : null}
          <button type="button" onClick={toggleTodayBlocked}>
            <Icon name="ban" />
            Block time
          </button>
          <button type="button" onClick={() => window.open("/book", "_blank")}>
            <Icon name="arrowUpRight" />
            Booking page
          </button>
        </div>
      </div>

      {/* TOP ROW — Today's rail + Pending */}
      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", gap: 20, marginBottom: 48 }}>
        <Card className="enter" style={{ padding: "24px 28px", animationDelay: ".1s" }}>
          <div className="section-head">
            <div>
              <Eyebrow>Today · {now.format("dddd")}</Eyebrow>
              <h2 className="section-title" style={{ marginTop: 4 }}>
                In the chair
              </h2>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Chip tone="amber" dot live>
                Live · {now.format("HH:mm")}
              </Chip>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
                {today.length} appts · R{today.length * 180}
              </span>
            </div>
          </div>
          <div className="timeline">
            {today.map((t) => (
              <div key={t.id} className={`tl-item ${t.status === "now" ? "now" : t.status === "done" ? "done" : ""}`}>
                <div className="tl-time mono">
                  {t.time}
                  <span className="tl-duration">{t.duration}</span>
                </div>
                <div>
                  <div className="tl-name">
                    {t.name} {t.tag === "new" ? <Chip tone="silver" style={{ marginLeft: 8 }}>New</Chip> : null}
                    <span className="mono" style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 10, letterSpacing: ".1em" }}>
                      {t.time}
                    </span>
                  </div>
                  <div className="tl-svc">{t.service}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {t.status === "now" ? (
                    <Chip tone="amber" dot live>
                      Now
                    </Chip>
                  ) : null}
                  {t.status === "done" ? (
                    <Chip tone="green">
                      <Icon name="check" size={10} /> Done
                    </Chip>
                  ) : null}
                  {t.status === "next" ? <Chip tone="silver">Up next</Chip> : null}
                  {t.status === "pending" ? <Chip tone="amber">Pending</Chip> : null}
                  {/* v1: no row options menu */}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="enter" style={{ animationDelay: ".15s" }}>
          <div className="section-head">
            <div>
              <Eyebrow>Pending</Eyebrow>
              <h2 className="section-title" style={{ marginTop: 4 }}>
                Needs your attention
              </h2>
            </div>
            <Chip tone="amber">{requests.length + changes.length}</Chip>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {requests.length === 0 && changes.length === 0 ? (
              <div className="empty-informative">
                <Eyebrow>All caught up</Eyebrow>
                <div style={{ fontSize: 14, color: "var(--text-2)" }}>You&apos;ve responded to every request this week.</div>
              </div>
            ) : null}

            {requests.map((r) => (
              <div key={r.id} style={{ padding: "14px 14px", border: "1px solid var(--line)", borderRadius: 12, background: "var(--bg-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                    <div style={{ color: "var(--text-2)", fontSize: 12.5, marginTop: 2 }}>{r.service}</div>
                    <div className="mono" style={{ color: "var(--text-3)", fontSize: 11, marginTop: 6, letterSpacing: ".1em" }}>
                      {r.time} · {r.phone}
                    </div>
                  </div>
                  <Chip tone="amber">New</Chip>
                </div>
                {r.note ? (
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8, fontStyle: "italic", borderLeft: "1.5px solid var(--amber)", paddingLeft: 10 }}>
                    &quot;{r.note}&quot;
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => acceptRequest(r)}>
                    <Icon name="check" size={12} />
                    Accept
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => declineRequest(r)}>
                    Decline
                  </button>
                </div>
              </div>
            ))}

            {changes.map((c) => (
              <div key={c.id} style={{ padding: "14px", border: "1px solid var(--line)", borderRadius: 12, background: "var(--bg-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <Chip tone="silver">{c.kind}</Chip>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6, letterSpacing: ".08em" }}>
                  <span style={{ textDecoration: "line-through" }}>{c.from}</span> → <span style={{ color: "var(--amber)" }}>{c.to}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => approveChange(c)}>
                    Approve
                  </button>
                  <button type="button" className="btn btn-sm">
                    Counter-propose
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* WEEK */}
      <div className="section-head">
        <div>
          <Eyebrow>Upcoming</Eyebrow>
          <h2 className="section-title" style={{ marginTop: 4 }}>
            Next 7 days
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Chip dot tone="amber">
            Booked
          </Chip>
          <Chip dot tone="red">
            Blocked
          </Chip>
          <Chip dot tone="silver">
            Closed
          </Chip>
        </div>
      </div>

      <div className="grid grid-cols-7 enter" style={{ marginBottom: 48, animationDelay: ".2s" }}>
        {upcomingDays.map((d) => {
          const intensity = d.count >= 6 ? "heavy" : d.count >= 3 ? "light" : "";
          const cls = d.is_blocked
            ? "blocked"
            : d.is_closed
              ? "muted"
              : intensity === "heavy"
                ? "booked-heavy"
                : intensity === "light"
                  ? "booked-light"
                  : "";
          const isToday = d.date && d.date === now.format("YYYY-MM-DD");
          const greyClosed = d.is_closed ? { opacity: 0.45 } : undefined;
          return (
            <div
              key={d.date || d.day_of_week}
              className={`cal-day ${cls}${isToday ? " today" : ""}`}
              style={{ aspectRatio: "1/1.15", ...greyClosed }}
            >
              <div>
                <div className="mono" style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: ".2em" }}>
                  {d.day_of_week}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }}>{d.day_number}</div>
              </div>
              <div>
                {d.is_blocked ? (
                  <div className="mono" style={{ fontSize: 10, color: "var(--red)", letterSpacing: ".14em" }}>
                    BLOCKED
                  </div>
                ) : null}
                {d.is_closed ? (
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: ".14em" }}>
                    CLOSED
                  </div>
                ) : null}
                {!d.is_blocked && !d.is_closed ? (
                  <>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-2)" }}>
                      {d.count} booked
                    </div>
                    <div className="cal-bar" style={{ marginTop: 4 }}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <span key={j} className={j < d.count ? "f" : ""} />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* ANALYTICS */}
      <div className="section-head">
        <div>
          <Eyebrow>{now.format("MMMM YYYY")}</Eyebrow>
          <h2 className="section-title" style={{ marginTop: 4 }}>
            The month so far
          </h2>
        </div>
        <button type="button" className="btn btn-sm">
          <Icon name="download" size={12} />
          Export
        </button>
      </div>

      <div className="grid grid-cols-3 enter" style={{ marginBottom: 32, animationDelay: ".25s" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Eyebrow>Bookings</Eyebrow>
            <Icon name="scissors" size={14} />
          </div>
          <div className="metric-num" style={{ marginTop: 16 }}>
            <AnimatedNumber value={monthAnalytics?.total_bookings ?? 0} />
          </div>
          <div className="metric-delta" style={{ color: "var(--text-3)", marginTop: 14 }}>
            Confirmed and completed this month
          </div>
        </Card>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Eyebrow>Busiest day</Eyebrow>
            <Icon name="calendar" size={14} />
          </div>
          <div className="metric-num" style={{ marginTop: 16 }}>
            {monthAnalytics?.busiest_day?.trim() ? monthAnalytics.busiest_day : "—"}
          </div>
          <div className="metric-delta" style={{ color: "var(--text-2)", marginTop: 14 }}>
            Most bookings by weekday
          </div>
        </Card>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Eyebrow>Top services</Eyebrow>
            <Icon name="star" size={14} />
          </div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 4 }}>
            {(monthAnalytics?.top_services?.length ? monthAnalytics.top_services : []).map((s, i) => (
              <div key={`${s.name}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="mono" style={{ fontSize: 10, flex: "0 0 100px", color: "var(--text-2)" }}>
                  {s.name || "—"}
                </div>
                <div className="bar" style={{ flex: 1 }}>
                  <span style={{ width: `${Math.min(100, Math.max(0, s.percentage))}%` }} />
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--text-3)", width: 40, textAlign: "right" }}>
                  {Number.isFinite(s.percentage) ? `${s.percentage}%` : "—"}
                </div>
              </div>
            ))}
            {!monthAnalytics?.top_services?.length ? (
              <div className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
                No service breakdown yet
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="enter" style={{ padding: 28, marginBottom: 48, animationDelay: ".3s" }}>
        <div className="section-head">
          <div>
            <Eyebrow>Bookings · last 30 days</Eyebrow>
            <h3 className="section-title" style={{ marginTop: 4, fontSize: 18 }}>
              Momentum
            </h3>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
              TOTAL <b style={{ color: "var(--text)" }}>{bars30.reduce((a, b) => a + b, 0)}</b>
            </span>
            <span className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
              AVG/DAY{" "}
              <b style={{ color: "var(--text)" }}>{(bars30.reduce((a, b) => a + b, 0) / 30).toFixed(1)}</b>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 160, marginTop: 10 }}>
          {bars30.map((v, i) => (
            <div
              key={dailyCounts?.[i]?.date ?? i}
              style={{
                flex: 1,
                height: `${(v / maxBar) * 100}%`,
                minHeight: 2,
                background:
                  i === bars30.length - 1 ? "var(--gold-gradient)" : v === 0 ? "var(--line)" : "var(--silver-2)",
                opacity: v === 0 ? 0.4 : 1,
                borderRadius: 2,
                transition: "all .3s",
              }}
              title={`${dailyCounts?.[i]?.date ?? `Day ${i + 1}`}: ${v} confirmed`}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--text-3)" }}>
            {momentumAxisLabels.start || "—"}
          </span>
          <span className="mono" style={{ fontSize: 10, color: "var(--text-3)" }}>
            {momentumAxisLabels.mid || "—"}
          </span>
          <span className="mono" style={{ fontSize: 10, color: "var(--text-3)" }}>
            {momentumAxisLabels.end || "—"}
          </span>
        </div>
      </Card>

      {/* CUSTOMERS */}
      <div className="section-head">
        <div>
          <Eyebrow>Customers</Eyebrow>
          <h2 className="section-title" style={{ marginTop: 4 }}>
            Your people
          </h2>
        </div>
        <div className="search">
          <Icon name="search" />
          <input placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="enter" style={{ padding: 0, overflow: "hidden", marginBottom: 48, animationDelay: ".35s" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Visits</th>
              <th>Last visit</th>
              <th>Favourite</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {displayedCustomers.map((c, i) => {
              const initials = c.name
                .split(/\s+/)
                .filter(Boolean)
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const g = 1 + (i % 5);
              const st = c.status;
              const chipTone = st === "VIP" ? "amber" : st === "New" ? "silver" : "default";
              const lastDisplay =
                c.last_visit && /^\d{4}-\d{2}-\d{2}/.test(c.last_visit)
                  ? dayjs(c.last_visit.slice(0, 10)).format("YYYY / MM / DD")
                  : c.last_visit || "—";
              return (
                <tr key={`${c.phone}-${i}`}>
                  <td>
                    <span className={`avatar avatar-g${g}`}>{initials || "?"}</span>
                    <span style={{ fontWeight: 600 }}>{c.name || "—"}</span>
                    {st ? (
                      <Chip tone={chipTone} style={{ marginLeft: 10 }}>
                        {st}
                      </Chip>
                    ) : null}
                  </td>
                  <td className="mono" style={{ color: "var(--text-2)", fontSize: 12.5 }}>
                    {c.phone}
                  </td>
                  <td>
                    <span className="foil" style={{ fontWeight: 700, fontSize: 15 }}>
                      {c.visit_count}
                    </span>
                  </td>
                  <td className="mono" style={{ color: "var(--text-2)", fontSize: 12.5 }}>
                    {lastDisplay}
                  </td>
                  <td style={{ color: "var(--amber)", fontSize: 13 }}>{c.favourite_service || "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="btn btn-ghost btn-sm" aria-label="Call">
                      <Icon name="phone" size={12} />
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" aria-label="View">
                      <Icon name="arrowRight" size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* SCHEDULE · BLOCK DAYS */}
      <div className="section-head">
        <div>
          <Eyebrow>Schedule</Eyebrow>
          <h2 className="section-title" style={{ marginTop: 4 }}>
            Block days
          </h2>
          <div style={{ color: "var(--text-3)", fontSize: 12, marginTop: 6 }}>
            Click any day to block or unblock. Changes are saved automatically.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" className="btn btn-sm" onClick={goBlockCalendarPrev}>
            <Icon name="chevronL" size={12} />
            Prev
          </button>
          <div className="mono" style={{ padding: "0 16px", fontWeight: 700, letterSpacing: ".16em" }}>
            {blockCalendarHeading}
          </div>
          <button type="button" className="btn btn-sm" onClick={goBlockCalendarNext}>
            Next
            <Icon name="chevronR" size={12} />
          </button>
        </div>
      </div>

      <div className="enter" style={{ animationDelay: ".4s" }}>
        <div className="cal-head">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}</div>
        <div className="cal-grid">
          {blockMonthGrid.map((c, i) => {
            const { y: cy, m: cm } = calendarView;
            const dayKey = `${cy}-${cm}-${c.n}`;
            if (c.muted) return <div key={`m-${cy}-${cm}-${i}`} className="cal-day muted" />;
            const cellDate = new Date(cy, cm, c.n);
            const isSunday = cellDate.getDay() === 0;
            const jToday = getJohannesburgCalendarDateParts(new Date());
            const isCellToday = cy === jToday.y && cm === jToday.m && c.n === jToday.day;
            const isPast = isCalendarDayBeforeJohannesburgToday(cy, cm, c.n, jToday);
            const iso = `${cy}-${String(cm + 1).padStart(2, "0")}-${String(c.n).padStart(2, "0")}`;
            const inUpcoming = upcomingByIso.has(iso);
            const b = inUpcoming ? upcomingByIso.get(iso)! : 0;
            const intensity = b >= 5 ? "booked-heavy" : b >= 2 ? "booked-light" : "";
            const cls = isSunday ? "muted" : c.blocked ? "blocked" : intensity;
            const greyClosed = isSunday ? { opacity: 0.45 } : undefined;
            const showBars = !isSunday && !isPast && !c.blocked && inUpcoming && b > 0;
            const barFilled = Math.min(b, 6);
            return (
              <div
                key={dayKey}
                className={`cal-day ${cls}${isCellToday ? " today" : ""}`}
                style={greyClosed}
                onClick={isSunday ? undefined : () => toggleBlock(i)}
              >
                <div>{c.n}</div>
                <div>
                  {isSunday ? (
                    <div className="mono" style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: ".14em" }}>
                      CLOSED
                    </div>
                  ) : c.blocked ? (
                    <div className="mono" style={{ fontSize: 9, letterSpacing: ".14em" }}>
                      BLOCKED
                    </div>
                  ) : showBars ? (
                    <div className="cal-bar">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <span key={j} className={j < barFilled ? "f" : ""} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

