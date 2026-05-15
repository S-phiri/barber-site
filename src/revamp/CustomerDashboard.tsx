import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { http } from "@/lib/api";
import { useAuth } from "@/contexts/auth";
import { AnimatedNumber, Card, Chip, Eyebrow, Icon, useToast } from "@/revamp/shared";

/** Match hardcoded eyebrow: "Saturday · 18 April 2026" — weekday · D MMMM YYYY */
function formatTodayHeaderDate(d: Date): string {
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  return `${weekday} · ${day} ${month} ${year}`;
}

function parseAccessTokenPayload(access: string | null): Record<string, unknown> | null {
  if (!access) return null;
  const parts = access.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : "";
    const json = atob(base64 + pad);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Display name from JWT: first matching claim, first letter capitalised. */
function displayNameFromAccessToken(access: string | null): string | null {
  const p = parseAccessTokenPayload(access);
  if (!p) return null;
  const raw = String(
    p.name ?? p.given_name ?? p.username ?? p.preferred_username ?? p.email ?? "",
  ).trim();
  if (!raw) return null;
  const first = raw.split(/\s+/)[0] ?? raw;
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

type MeBooking = {
  id: string;
  status: string;
  service_name: string;
  barber_name: string;
  start_ts: string;
  end_ts: string;
  created_at: string;
  service?: { name?: string; price_cents?: number };
  barber?: { display_name?: string };
};

function normalizeMeBooking(raw: Record<string, unknown>): MeBooking {
  const svc = raw.service as Record<string, unknown> | undefined;
  const bar = raw.barber as Record<string, unknown> | undefined;
  return {
    id: String(raw.id ?? ""),
    status: String(raw.status ?? ""),
    service_name: String(raw.service_name ?? svc?.name ?? ""),
    barber_name: String(raw.barber_name ?? bar?.display_name ?? ""),
    start_ts: String(raw.start_ts ?? ""),
    end_ts: String(raw.end_ts ?? ""),
    created_at: String(raw.created_at ?? ""),
    service:
      svc && (svc.name != null || svc.price_cents != null)
        ? { name: String(svc.name ?? ""), price_cents: Number(svc.price_cents ?? 0) }
        : undefined,
    barber: bar && bar.display_name != null ? { display_name: String(bar.display_name ?? "") } : undefined,
  };
}

export default function CustomerDashboard({ displayName: displayNameProp }: { displayName?: string }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { access } = useAuth();
  const [bookings, setBookings] = useState<MeBooking[]>([]);
  const [nowTick, setNowTick] = useState(0);

  const headerDate = useMemo(() => formatTodayHeaderDate(new Date()), [nowTick]);

  const customerName = useMemo(() => {
    const fromToken = displayNameFromAccessToken(access);
    if (fromToken) return fromToken;
    const prop = displayNameProp?.trim();
    if (prop) return prop.charAt(0).toUpperCase() + prop.slice(1).toLowerCase();
    return "there";
  }, [access, displayNameProp]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("access");
        const res = await http("/api/bookings/me/", {
          method: "GET",
          ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as unknown;
        const rows = Array.isArray(data) ? data : [];
        if (!cancelled) setBookings(rows.map((r) => normalizeMeBooking(r as Record<string, unknown>)));
      } catch (e) {
        console.error("[bookings/me] failed", e);
        if (!cancelled) setBookings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const i = window.setInterval(() => setNowTick((t) => t + 1), 60000);
    return () => window.clearInterval(i);
  }, []);

  const nextBooking = useMemo(() => {
    const now = Date.now();
    const candidates = bookings
      .filter((b) => b.status === "confirmed" || b.status === "rescheduled")
      .map((b) => ({ b, t: new Date(b.start_ts).getTime() }))
      .filter((x) => !Number.isNaN(x.t) && x.t > now)
      .sort((a, c) => a.t - c.t);
    return candidates[0]?.b ?? null;
  }, [bookings, nowTick]);

  const headerSubtitle = useMemo(() => {
    if (!nextBooking) return "Book your next cut below.";
    const dayLabel = dayjs(nextBooking.start_ts).format("dddd");
    return `Your next appointment is on ${dayLabel}.`;
  }, [nextBooking]);

  const nextAppt = useMemo(() => {
    if (!nextBooking) return null;
    const start = dayjs(nextBooking.start_ts);
    const end = dayjs(nextBooking.end_ts);
    const durationMin = end.isValid() && start.isValid() ? Math.max(0, end.diff(start, "minute")) : 0;
    const priceCents = nextBooking.service?.price_cents ?? 0;
    return {
      id: nextBooking.id,
      status: nextBooking.status,
      service: nextBooking.service_name || nextBooking.service?.name || "—",
      barber: nextBooking.barber_name || nextBooking.barber?.display_name || "—",
      date: start.format("dddd, D MMMM YYYY"),
      time: start.format("HH:mm"),
      duration: durationMin || 45,
      price: Math.round(priceCents / 100),
      address: "4 Market St, BBIT Barbers",
    };
  }, [nextBooking]);

  const targetTs = nextBooking ? new Date(nextBooking.start_ts).getTime() : 0;
  const remaining = Math.max(0, targetTs > 0 ? targetTs - Date.now() : 0);
  const MS_14D = 14 * 86400000;
  const progress = !targetTs ? 0 : remaining >= MS_14D ? 0 : 1 - remaining / MS_14D;
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);

  const circumference = 2 * Math.PI * 74;
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  const history = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.start_ts).getTime() - new Date(a.start_ts).getTime())
      .map((b) => ({
        id: b.id,
        date: dayjs(b.start_ts).format("YYYY / MM / DD"),
        service: b.service_name || b.service?.name || "—",
        barber: b.barber_name || b.barber?.display_name || "—",
        status: b.status,
      }));
  }, [bookings]);

  const totalVisits = useMemo(
    () =>
      bookings.filter((b) => ["confirmed", "completed", "rescheduled"].includes(b.status)).length,
    [bookings],
  );

  const memberSinceYear = useMemo(() => {
    const times = bookings.map((b) => new Date(b.created_at).getTime()).filter((n) => !Number.isNaN(n));
    if (!times.length) return new Date().getFullYear();
    const t = Math.min(...times);
    return new Date(t).getFullYear();
  }, [bookings]);

  const monthsWithBBIT = useMemo(() => {
    const times = bookings.map((b) => new Date(b.created_at).getTime()).filter((n) => !Number.isNaN(n));
    if (!times.length) return 0;
    const t = Math.min(...times);
    return Math.max(0, dayjs().diff(dayjs(t), "month"));
  }, [bookings]);

  const favouriteBarber = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookings) {
      const n = (b.barber_name || b.barber?.display_name || "").trim();
      if (!n) continue;
      counts.set(n, (counts.get(n) || 0) + 1);
    }
    let best = "";
    let bestC = 0;
    for (const [n, c] of counts) {
      if (c > bestC) {
        best = n;
        bestC = c;
      }
    }
    return best || "Ramad";
  }, [bookings]);

  const quickServices = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookings) {
      const n = (b.service_name || b.service?.name || "").trim();
      if (!n) continue;
      counts.set(n, (counts.get(n) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, c) => c[1] - a[1]).slice(0, 4);
    return sorted.map(([name], idx) => {
      const matching = bookings.filter((b) => (b.service_name || b.service?.name || "").trim() === name);
      const durs = matching
        .map((b) => {
          const a = new Date(b.start_ts).getTime();
          const z = new Date(b.end_ts).getTime();
          return !Number.isNaN(a) && !Number.isNaN(z) && z > a ? Math.round((z - a) / 60000) : 0;
        })
        .filter((m) => m > 0);
      const time = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 30;
      const cents = matching.map((b) => b.service?.price_cents ?? 0).filter((c) => c > 0);
      const price = cents.length ? Math.round(cents.reduce((a, b) => a + b, 0) / cents.length / 100) : 0;
      return { name, time, price, tag: idx === 0 ? ("favorite" as const) : undefined };
    });
  }, [bookings]);

  const reschedule = () => {
    toast({ title: "Reschedule requested", body: "Ramad will confirm shortly.", icon: "clock" });
  };

  const cancel = () => {
    toast({ title: "Cancellation sent", body: "You'll get a confirmation in a moment.", tone: "danger", icon: "x" });
  };

  const rebook = (s: { name: string; price: number; time: number }) => {
    // v1: reuse existing booking route
    navigate("/book");
    toast({ title: `Rebooking ${s.name}`, body: "Opening booking page…", icon: "scissors" });
  };

  return (
    <div className="page">
      <div className="page-header enter">
        <div>
          <Eyebrow>{headerDate}</Eyebrow>
          <h1 className="page-title" style={{ marginTop: 10 }}>
            Welcome back, <em>{customerName}</em>.
          </h1>
          <p className="page-subtitle">{headerSubtitle}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn" onClick={() => navigate("/bookings")}>
            <Icon name="calendar" size={14} />
            My bookings
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/book")}>
            <Icon name="plus" size={12} />
            New booking
          </button>
        </div>
      </div>

      {/* HERO: next appointment */}
      <div className="grid enter" style={{ gridTemplateColumns: "1.6fr 1fr", gap: 20, marginBottom: 48, animationDelay: ".1s" }}>
        <div className="hero-appt">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 2 }}>
            <div>
              <Eyebrow>Your next appointment</Eyebrow>
              <h2 style={{ fontFamily: "Instrument Serif, serif", fontSize: 44, lineHeight: 1, margin: "14px 0 0", letterSpacing: "-0.02em" }}>
                {nextAppt?.service ?? "No upcoming appointments"}
              </h2>
              <div style={{ marginTop: 16, display: "flex", gap: 22, flexWrap: "wrap" }}>
                <div>
                  <Eyebrow>With</Eyebrow>
                  <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{nextAppt?.barber ?? "—"}</div>
                </div>
                <div>
                  <Eyebrow>When</Eyebrow>
                  <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{nextAppt?.date ?? "—"}</div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
                    {nextAppt ? `${nextAppt.time} · ${nextAppt.duration} MIN` : "—"}
                  </div>
                  {nextAppt ? (
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6, letterSpacing: ".06em" }}>
                      {days > 0
                        ? `${days} day${days === 1 ? "" : "s"} until appointment`
                        : hours > 0
                          ? `${hours} hour${hours === 1 ? "" : "s"} until appointment`
                          : `${Math.max(0, mins)} minute${mins === 1 ? "" : "s"} until appointment`}
                    </div>
                  ) : null}
                </div>
                <div>
                  <Eyebrow>Where</Eyebrow>
                  <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="mapPin" size={13} />
                    {nextAppt?.address ?? "4 Market St, BBIT Barbers"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => toast({ title: "Added to calendar", icon: "check" })}>
                  <Icon name="calendar" size={12} />
                  Add to calendar
                </button>
                <button type="button" className="btn btn-sm" onClick={reschedule}>
                  <Icon name="clock" size={12} />
                  Reschedule
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={cancel}>
                  Cancel
                </button>
              </div>
            </div>
            <div className="ring-wrap">
              <svg viewBox="0 0 168 168">
                <circle cx="84" cy="84" r="74" className="ring-bg" />
                <circle
                  cx="84"
                  cy="84"
                  r="74"
                  className="ring-fg"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="ring-center">
                <div>
                  <div className="ring-value">{nextAppt ? (days > 0 ? days : hours > 0 ? hours : Math.max(0, mins)) : 0}</div>
                  <div className="ring-label">
                    {nextAppt ? (days > 0 ? "DAYS" : hours > 0 ? "HOURS" : "MINUTES") : "DAYS"}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              position: "relative",
              zIndex: 2,
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid var(--line)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Chip tone="green" dot live>
                {nextAppt?.status
                  ? nextAppt.status
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                      .join(" ")
                  : "—"}
              </Chip>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
                {nextAppt?.id ? `BOOKING #${nextAppt.id.slice(0, 8).toUpperCase()}` : "BOOKING #—"}
              </span>
            </div>
            <div className="mono" style={{ fontSize: 13 }}>
              {nextAppt && nextAppt.price > 0 ? (
                <>
                  R <AnimatedNumber value={nextAppt.price} />
                </>
              ) : (
                "R —"
              )}
            </div>
          </div>
        </div>

        {/* LOYALTY STAMP CARD */}
        <Card style={{ padding: 28, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <Eyebrow>Loyalty</Eyebrow>
            </div>
            <Icon name="gift" size={18} />
          </div>
          <p style={{ marginTop: 22, color: "var(--text-2)", fontSize: 15, lineHeight: 1.55 }}>
            Loyalty rewards coming soon
          </p>
        </Card>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-4 enter" style={{ marginBottom: 48, animationDelay: ".15s" }}>
        <Card>
          <Eyebrow>Member since</Eyebrow>
          <div className="metric-num" style={{ marginTop: 14 }}>
            {memberSinceYear}
          </div>
          <div className="metric-delta" style={{ color: "var(--text-2)", marginTop: 10 }}>
            {monthsWithBBIT} months with BBIT
          </div>
        </Card>
        <Card>
          <Eyebrow>Total visits</Eyebrow>
          <div className="metric-num" style={{ marginTop: 14 }}>
            <AnimatedNumber value={totalVisits} />
          </div>
          <div className="spark" style={{ marginTop: 14 }}>
            {[1, 2, 1, 0, 2, 1, 3, 0, 1, 2, 1, 2].map((v, i) => (
              <span key={i} style={{ height: `${15 + v * 20}%` }} className={i >= 9 ? "hi" : ""} />
            ))}
          </div>
        </Card>
        <Card>
          <Eyebrow>Spent this year</Eyebrow>
          <div className="metric-num" style={{ marginTop: 14 }}>
            —
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", marginTop: 12, lineHeight: 1.45, letterSpacing: "0.04em" }}>
            Tracked once payments go live.
          </div>
        </Card>
        <Card>
          <Eyebrow>Favourite barber</Eyebrow>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
            <span className="avatar avatar-g1" style={{ width: 44, height: 44, fontSize: 16 }}>
              {(favouriteBarber.trim().charAt(0) || "R").toUpperCase()}
            </span>
            <div>
              <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 28, lineHeight: 1 }}>
                <em>{favouriteBarber}</em>
              </div>
              <div style={{ display: "flex", gap: 2, marginTop: 6, color: "var(--amber)" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Icon key={i} name="star" size={11} />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* QUICK REBOOK */}
      <div className="section-head">
        <div>
          <Eyebrow>Book again</Eyebrow>
          <h2 className="section-title" style={{ marginTop: 4 }}>
            Your usual
          </h2>
        </div>
        <button type="button" className="btn btn-ghost btn-sm">
          See all services
          <Icon name="arrowRight" size={12} style={{ verticalAlign: "middle", marginLeft: 6 }} />
        </button>
      </div>

      <div className="grid grid-cols-4 enter" style={{ marginBottom: 48, animationDelay: ".2s" }}>
        {quickServices.map((s) => (
          <Card key={s.name} className="service-card" onClick={() => rebook(s)} style={{ cursor: "pointer", padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Icon name="scissors" size={16} />
              {s.tag === "favorite" ? (
                <Chip tone="amber">
                  <Icon name="heart" size={10} /> Favorite
                </Chip>
              ) : null}
            </div>
            <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 28, marginTop: 26, lineHeight: 1, letterSpacing: "-0.01em" }}>{s.name}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 }}>
              <div>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: ".14em" }}>
                  {s.time} MIN
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>{s.price > 0 ? `R ${s.price}` : "R —"}</div>
              </div>
              <span style={{ color: "var(--amber)", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, letterSpacing: ".08em" }}>
                BOOK <Icon name="arrowRight" size={12} />
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* HISTORY + NOTIFICATIONS */}
      <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <Card className="enter" style={{ padding: 28, animationDelay: ".25s" }}>
          <div className="section-head">
            <div>
              <Eyebrow>History</Eyebrow>
              <h2 className="section-title" style={{ marginTop: 4 }}>
                Your chair, recapped
              </h2>
            </div>
            <button type="button" className="btn btn-ghost btn-sm">
              <Icon name="download" size={12} />
              Export receipts
            </button>
          </div>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Barber</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                    {h.date}
                  </td>
                  <td style={{ fontWeight: 600 }}>{h.service}</td>
                  <td style={{ color: "var(--text-2)" }}>{h.barber}</td>
                  <td className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                    {h.status
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                      .join(" ")}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        const b = bookings.find(
                          (x) => (x.service_name || x.service?.name || "") === h.service,
                        );
                        const dur =
                          b && b.start_ts && b.end_ts
                            ? Math.max(0, dayjs(b.end_ts).diff(dayjs(b.start_ts), "minute"))
                            : 30;
                        const price = b?.service?.price_cents ? Math.round(b.service.price_cents / 100) : 0;
                        rebook({ name: h.service, price, time: dur || 30 });
                      }}
                    >
                      Rebook
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="enter" style={{ padding: 28, animationDelay: ".3s" }}>
          <div className="section-head">
            <div>
              <Eyebrow>Notifications</Eyebrow>
              <h2 className="section-title" style={{ marginTop: 4 }}>
                What&apos;s new
              </h2>
            </div>
          </div>
          <div style={{ padding: "28px 8px 12px", textAlign: "center", color: "var(--text-2)", fontSize: 14 }}>
            No new notifications.
          </div>
        </Card>
      </div>
    </div>
  );
}

