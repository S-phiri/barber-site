import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import heroLogoUrl from "@/assets/Logo.png";
import { getBbitTheme, setBbitTheme, type BbitTheme, BBIT_THEME_CHANGE_EVENT } from "@/lib/bbitTheme";
import { useAuth } from "@/contexts/auth";

type SiteIconName =
  | "menu"
  | "whatsapp"
  | "phone"
  | "pin"
  | "clock"
  | "insta"
  | "star"
  | "arrowRight"
  | "scissors"
  | "sun"
  | "moon";

function SiteIcon({ name, size = 16 }: { name: SiteIconName; size?: number }) {
  const paths: Record<SiteIconName, React.ReactNode> = {
    menu: (
      <g>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </g>
    ),
    whatsapp: (
      <g>
        <path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.2-1.4A10 10 0 1 0 12 2z" />
        <path d="M9 9a1.5 1.5 0 0 1 3 0c0 1-1 1.5-1 2.5 0 2 3 4 5 4 1 0 1.5-1 1.5-1" />
      </g>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    ),
    pin: (
      <g>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </g>
    ),
    clock: (
      <g>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </g>
    ),
    insta: (
      <g>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
      </g>
    ),
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
    arrowRight: (
      <g>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </g>
    ),
    scissors: (
      <g>
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" />
        <line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
      </g>
    ),
    sun: (
      <g>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </g>
    ),
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  };

  const p = paths[name];
  const fill = name === "star" ? "currentColor" : "none";
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
    >
      {p}
    </svg>
  );
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function SiteApp() {
  const { user, logout, isAdmin } = useAuth();
  const staffUser = isAdmin || Boolean(user?.is_staff);
  const [theme, setTheme] = useState<BbitTheme>(() => getBbitTheme());
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const sync = () => setTheme(getBbitTheme());
    window.addEventListener(BBIT_THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(BBIT_THEME_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useReveal();

  const gallery = useMemo(
    () => [
      { url: "/gallery/fade1.png", t: "Signature Fade", s: "Fade · 30 min" },
      { url: "/gallery/fade2.png", t: "Clean Taper", s: "Haircut · 30 min" },
      { url: "/gallery/fade3.png", t: "Beard Sculpt", s: "Beard · 30 min" },
      { url: "/gallery/fade4.png", t: "Skin Fade", s: "Fade · 45 min" },
      { url: "/gallery/fade5.png", t: "Hot Towel", s: "Shave · 30 min" },
      { url: "/gallery/fade6.png", t: "Line Up", s: "Detail · 15 min" },
    ],
    [],
  );

  const services = useMemo(
    () => [
      { n: "Beard Trim", d: "Expert shaping and styling, hot-towel finish.", t: 30, p: 150 },
      { n: "Haircut", d: "Full precision cut and finish, tailored to your head shape.", t: 60, p: 250 },
      { n: "Fade + Beard", d: "Skin or taper fade paired with a sharp beard sculpt.", t: 45, p: 220 },
      { n: "Hot Towel Shave", d: "Traditional straight-razor shave with hot towel ritual.", t: 30, p: 180 },
      { n: "Dye + Haircut", d: "Colour treatment with full haircut — grey blending or fashion.", t: 90, p: 350 },
      { n: "Kids Cut", d: "Patient, quick and clean for ages 4–12.", t: 25, p: 120 },
    ],
    [],
  );

  return (
    <div className="site">
      <nav className={`site-nav ${solid ? "solid" : ""}`}>
        <div className="nav-left">
          <div className="brand">
            <img src={heroLogoUrl} alt="BBIT — Best Barber In Town" className="brand-logo" />
          </div>
        </div>
        <div className="nav-center">
          <a className="nav-link" href="#gallery">
            Gallery
          </a>
          <a className="nav-link" href="#services">
            Services
          </a>
          <a className="nav-link" href="#products">
            Products
          </a>
          <a className="nav-link" href="#find">
            Contact
          </a>
        </div>
        <div className="nav-right">
          <button
            className="theme-toggle"
            onClick={() => {
              const next: BbitTheme = theme === "dark" ? "light" : "dark";
              setBbitTheme(next);
            }}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <SiteIcon name={theme === "dark" ? "sun" : "moon"} size={15} />
          </button>
          {!user ? (
            <Link className="nav-link" to="/login">
              Sign in
            </Link>
          ) : (
            <>
              {staffUser ? (
                <Link className="nav-link" to="/barber-dashboard">
                  Barber Dashboard
                </Link>
              ) : (
                <Link className="nav-link" to="/dashboard">
                  Dashboard
                </Link>
              )}
              <button
                type="button"
                className="nav-link"
                onClick={() => {
                  logout();
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <header className="hero">
        <div className="hero-img" />
        <div className="hero-content">
          <div>
            <div className="hero-eyebrow">
              <span className="line" />
              EST. 2019 · CLAREMONT, CAPE TOWN
            </div>
            <h1 className="hero-title">
              A cut
              <br />
              above <em>the rest.</em>
            </h1>
            <p className="hero-tagline">
              Precision cuts, traditional shaves and quiet Saturdays in the chair. Walk in looking for a trim; walk out
              feeling sharp.
            </p>
            <div className="hero-ctas">
              <a className="btn-hero" href="#services">
                Book appointment <SiteIcon name="arrowRight" size={14} />
              </a>
              <a className="btn-hero ghost" href="#">
                <SiteIcon name="whatsapp" size={14} />
                WhatsApp us
              </a>
            </div>
          </div>
          <div className="hero-meta">
            <div className="hero-meta-item">
              <div className="k">Rating</div>
              <div className="v">
                <em>4.9</em>
              </div>
            </div>
            <div className="hero-meta-item">
              <div className="k">Cuts</div>
              <div className="v">
                <em>2 300+</em>
              </div>
            </div>
            <div className="hero-meta-item">
              <div className="k">Years</div>
              <div className="v">
                <em>7</em>
              </div>
            </div>
          </div>
        </div>
        <div className="scroll-cue">
          <div>SCROLL</div>
          <div className="bar" />
        </div>
      </header>

      {/* GALLERY */}
      <section id="gallery" className="section">
        <div className="section-head-center reveal">
          <div className="open-pill">
            <span className="d" />
            Open now · closes 17:00
          </div>
          <h2 className="section-title-xl">
            Our <em>Signature</em> Cuts
          </h2>
          <div className="section-rule" />
          <p className="section-intro">
            A gallery of recent work. Every cut is tailored to the client — head shape, lifestyle, the occasion. These
            are a few we&apos;re proud of.
          </p>
        </div>
        <div className="gallery-grid reveal">
          {gallery.map((g, i) => (
            <div key={i} className={`g-card g-${i + 1}`}>
              <img src={g.url} alt={g.t} />
              <div className="g-meta">
                <div className="t">{g.t}</div>
                <div className="s">{g.s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="section" style={{ paddingTop: 40 }}>
        <div className="section-head-center reveal">
          <h2 className="section-title-xl">
            Our <em>Services</em>
          </h2>
          <div className="section-rule" />
          <p className="section-intro">Bookings via the app or WhatsApp. Walk-ins welcome when the chair is free.</p>
        </div>
        <div className="bill reveal">
          <div className="bill-head">
            <span>Service · Duration</span>
          </div>
          {services.map((s, i) => (
            <div key={s.n} className="svc-row">
              <div className="svc-num">0{i + 1}</div>
              <div>
                <div className="svc-name">
                  <em>{s.n}</em>
                </div>
                <div className="svc-desc">{s.d}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: ".16em", marginTop: 8 }}>
                  {s.t} MIN
                </div>
              </div>
              <div className="svc-cta">
                <a className="btn btn-sm" href="#">
                  Book now <SiteIcon name="arrowRight" size={11} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="products" className="section" style={{ paddingTop: 40 }}>
        <div className="section-head-center reveal">
          <h2 className="section-title-xl">
            The <em>Shelf</em>
          </h2>
          <div className="section-rule" />
          <p className="section-intro">A small, curated shelf of the grooming we actually use in-chair.</p>
        </div>
        <p className="section-intro reveal" style={{ marginTop: 14, textAlign: "center" }}>
          Products coming soon.
        </p>
      </section>

      {/* FIND US */}
      <section id="find" className="section" style={{ paddingTop: 40 }}>
        <div className="section-head-center reveal">
          <h2 className="section-title-xl">
            Find <em>Us</em>
          </h2>
          <div className="section-rule" />
        </div>
        <div className="find-grid reveal">
          <div className="map-wrap">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3312.5!2d18.47!3d-33.98!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzPCsDU4JzQ4LjAiUyAxOMKwMjgnMTIuMCJF!5e0!3m2!1sen!2sza!4v1700000000000"
              loading="lazy"
              title="BBIT map"
            />
          </div>
          <div className="find-info">
            <div className="info-row">
              <div className="ic">
                <SiteIcon name="pin" size={16} />
              </div>
              <div>
                <div className="k">Location</div>
                <div className="v">
                  Draper Square, Shop No 7
                  <br />
                  Claremont, Cape Town, 7708
                </div>
              </div>
              <a className="btn btn-sm" href="#">
                Directions
              </a>
            </div>
            <div className="info-row">
              <div className="ic">
                <SiteIcon name="phone" size={16} />
              </div>
              <div>
                <div className="k">Phone</div>
                <div className="v">
                  <a href="tel:+27670238197">+27 670 238 197</a>
                </div>
              </div>
              <a className="btn btn-sm" href="tel:+27670238197">
                Call
              </a>
            </div>
            <div className="info-row">
              <div className="ic">
                <SiteIcon name="clock" size={16} />
              </div>
              <div>
                <div className="k">Hours</div>
                <div className="v">
                  Mon–Fri: 09:00–17:00
                  <br />
                  Sat: 09:00–15:00 · Sun: Closed
                </div>
              </div>
              <span className="chip chip-green" style={{ marginTop: 6 }}>
                <span className="dot dot-live" /> Open
              </span>
            </div>
            <div className="info-row">
              <div className="ic">
                <SiteIcon name="insta" size={16} />
              </div>
              <div>
                <div className="k">Instagram</div>
                <div className="v">
                  <a href="#" target="_blank" rel="noreferrer">
                    @BBIT_Ramad
                  </a>
                </div>
              </div>
              <a className="btn btn-sm" href="#" target="_blank" rel="noreferrer">
                Follow
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="site-foot">
          <div className="foot-col">
            <div className="foot-brand">
              <em>BBIT</em>
            </div>
            <div className="foot-tag">Best Barber In Town — Claremont. Precision cuts, traditional shaves, calm chairs.</div>
          </div>
          <div className="foot-col">
            <div className="k">Explore</div>
            <a href="#gallery">Gallery</a>
            <a href="#services">Services</a>
            <a href="#products">Products</a>
            <a href="#find">Contact</a>
          </div>
          <div className="foot-col">
            <div className="k">Account</div>
            {!user ? (
              <Link to="/login">Sign in</Link>
            ) : (
              <>
                {staffUser ? <Link to="/barber-dashboard">Barber Dashboard</Link> : <Link to="/dashboard">Dashboard</Link>}
                <button type="button" className="nav-link" onClick={() => logout()} style={{ padding: 0 }}>
                  Logout
                </button>
              </>
            )}
          </div>
          <div className="foot-col">
            <div className="k">Contact</div>
            <a href="tel:+27670238197">+27 670 238 197</a>
            <a href="#">WhatsApp</a>
          </div>
        </div>
        <div className="foot-base">BBIT · BEST BARBER IN TOWN · CLAREMONT</div>
      </footer>

      {/* WhatsApp FAB (monochrome) */}
      <a className="fab" href="#" aria-label="WhatsApp">
        <SiteIcon name="whatsapp" size={18} />
      </a>
    </div>
  );
}

