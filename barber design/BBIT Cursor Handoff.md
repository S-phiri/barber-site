# BBIT — Cursor / Claude Code Handoff Brief
**Project:** Best Barber In Town — Barbershop Improvements
**Date:** April 2026
**Scope:** Port the redesigned public website + barber/customer dashboards into the live codebase.

---

## 1. What's been designed

Three deliverables are in this project (`Barbershop Improvements`):

| File | What it is |
|---|---|
| `BBIT Website.html` | Redesigned public-facing site (7 sections) |
| `BBIT Dashboards.html` | Barber + Customer dashboards (interactive) |
| `styles.css` | Shared design system tokens + component classes |
| `site.css` | Public site–specific layout (hero, gallery, services, team, etc.) |
| `components/SiteApp.jsx` | Public site React component tree |
| `components/BarberDashboard.jsx` | Barber dashboard React component |
| `components/CustomerDashboard.jsx` | Customer dashboard React component |
| `components/shared.jsx` | Icon component, Card, Chip, Toast, AnimatedNumber |
| `assets/bbit-logo.png` | Official BBIT logo (PNG, transparent) |

---

## 2. Design system — tokens to preserve exactly

### Fonts (Google Fonts — already imported)
```
Instrument Serif      → display headings, editorial numerics (italic weight used heavily)
Inter Tight           → all UI body text, buttons, nav
JetBrains Mono        → labels, timestamps, codes, mono numerics
```

### Color philosophy
- **Dark mode default.** Dark background is the brand — never swap hero to light.
- **Single accent:** amber/gold (`#e8a951`) used as a hairline, gradient, and foil. Never fill large areas with it.
- **Silver** (`#c9cdd4`) as a secondary accent for "regular" states / secondary chips.
- **No new colors.** Only green (`#7bc48a`) for confirmed/open states, red (`#d76a6a`) for blocked/declined, blue (`#7ba3d7`) if needed for informational. These are already in the token sheet.
- Logo is always the BBIT scissor mark (`assets/bbit-logo.png`). Never substitute text "BBIT" as a brand mark.

### CSS variables (in `styles.css` `:root` — do not change names)
```css
--bg, --bg-1, --bg-2, --bg-3        /* surface layers */
--line, --line-2                     /* borders */
--text, --text-2, --text-3          /* copy hierarchy */
--amber, --amber-2, --amber-soft    /* gold accent */
--silver, --silver-2, --silver-soft /* silver accent */
--green, --red, --blue              /* status colors */
--gold-gradient                     /* CSS gradient for CTAs, stamps, ring */
--silver-gradient                   /* CSS gradient for secondary CTAs */
--shadow                            /* box-shadow */
--radius (14px), --radius-sm (10px)
```

Light mode is a `[data-theme="light"]` override block — keep this pattern, applied on `<html>`.

---

## 3. Public website — section map

```
<header>   Hero          full-bleed grayscale photo + logo + title + 3 CTAs
<section>  Gallery       asymmetric 12-col grid, hover reveals color
<section>  Services      "tailor bill" row list — numbered, serif names, gold hairline hover
<section>  Team          3-up tall portrait cards (dark overlay, serif name)
<section>  Reviews       3-col quote cards — Instrument Serif italic body
<section>  Products      4-up shelf cards (placeholder images)
<section>  Find Us       grayscale Google Maps iframe + info rows + hours pill
           CTA strip     dark full-bleed, centered booking CTA — ALWAYS dark even in light mode
<footer>   4-col grid — logo, nav links, contact, account
```

**Nav behaviour:**
- Transparent + white text over hero photo.
- Goes `backdrop-filter: blur` + `--bg` tinted on scroll past 80px.
- Logo: white (inverted) over hero; natural on solid nav.
- Links: Gallery, Services, Team, Products, Contact | Dashboard | Logout

**Hero rules:**
- Background image = the actual barbershop photo. `filter: grayscale(1) contrast(1.08) brightness(.72)`.
- Keep `@keyframes heroZoom` (subtle Ken Burns scale 1.06 → 1).
- Logo sits above the headline (height 88px, inverted white).
- Gradient overlay: `linear-gradient(180deg, rgba(0,0,0,.5) 0%, rgba(0,0,0,.2) 35%, rgba(0,0,0,.55) 80%, #0a0a0a 100%)`.
- Never remove the grain texture overlay (it kills the moody feel).

**Scroll reveals:** every section uses `.reveal` class + IntersectionObserver → adds `.in` class. See `useReveal` hook in `SiteApp.jsx`.

**WhatsApp FAB:** monochrome (no green). `background: var(--text); color: var(--bg)`. Pulse ring animation. Links to WhatsApp chat.

---

## 4. Dashboards — feature map

### Barber dashboard (`/dashboard/barber`)
| Section | Functionality |
|---|---|
| Page header | Greeting + quick-action dock (Walk-in, Block time, On break, Booking page) |
| Today's timeline | Live "now" indicator with amber pulse dot, statuses: done/now/next/pending/upcoming |
| Pending requests | Accept → adds to timeline + toast. Decline → removes + toast. Reschedule → approve/counter |
| Next 7 days | Week strip — booking heat per day, blocked/closed states |
| Analytics | 5 metric cards: Cuts, Revenue (progress bar vs goal), Busiest day, Returning %, Top service |
| Momentum chart | 30-day booking bar chart — amber for today, silver for past, line for zero-days |
| Customers table | Avatar, name, tag (VIP/Regular/New), phone, visits, last visit, favourite service. Searchable |
| Block-day calendar | Month grid — click any day to toggle blocked. Amber = booked-light/heavy, red = blocked |

### Customer dashboard (`/dashboard/customer`)
| Section | Functionality |
|---|---|
| Hero appointment card | Countdown ring (SVG, gold gradient stroke), service/barber/date/address, Reschedule/Cancel |
| Loyalty stamp card | 6-stamp grid, filled = gold scissors icon, next = amber pulse border, animated stamp-in |
| Stats row | Member since, total visits (sparkline), spent this year, favourite barber |
| Quick rebook | 4 service cards — click triggers rebook toast (prefill booking form) |
| History table | Date, service, barber, price, Rebook button |
| Notifications | Unread count chip, unread items have amber icon bg + amber dot |

### Shared patterns
- Toast system: `useToast()` context → `ToastProvider` wraps both dashboards.
- Theme: stored in `localStorage('bbit-theme')`, applied as `data-theme` on `<html>`.
- Dashboard tab: stored in `localStorage('bbit-dash')`.
- Page title uses `Instrument Serif` italic + amber gradient text for the name (`<em>`).
- All numeric displays: `Instrument Serif` italic for large, `JetBrains Mono` for labels.

---

## 5. Integration checklist

### Data to wire up
- [ ] Booking requests → `initialRequests` array in `BarberDashboard.jsx`
- [ ] Today's appointments → `initialToday` array
- [ ] Customer list → `customers` array (add real visits, last-visit, phone)
- [ ] Monthly booking counts → `bookings` object in `buildMonth()`
- [ ] Analytics figures → hardcoded in metric cards (make dynamic)
- [ ] Next appointment → `nextAppt` state in `CustomerDashboard.jsx`
- [ ] Loyalty stamp count → `loyaltyCount` state (load from user profile)
- [ ] Notifications → `notifs` array

### Auth
- Dashboard switcher shows both tabs in the prototype. In production: barber sees only barber view; customer sees only customer view based on role.
- "Logout" nav link → connect to existing auth logout.

### Real assets to swap in
- Hero background → replace unsplash URL with actual barbershop photo.
- Gallery images → 9 real cut photos (any aspect ratio — grid handles it). Update `gallery` array in `SiteApp.jsx`.
- Team portraits → 3 barber headshots. Update `team` array.
- Google Maps embed → update `src` on `<iframe>` in the Find Us section with real coordinates.
- WhatsApp link → replace `href="#"` on FAB and hero CTA with `https://wa.me/27XXXXXXXXX`.
- Instagram → update `@BBIT_Ramad` + href.
- Phone number → already `+27 670 238 197` — confirm this is correct.

### Products section
- Placeholder monogram tiles. When real product photos are available, replace `.prod-img` content with `<img>` tags.

---

## 6. Things NOT to change
- Logo mark (`assets/bbit-logo.png`) — never substitute text.
- Hero always dark in both light and dark modes (the photo section is intentionally moody).
- CTA strip at the bottom is always `background: #0a0a0a` regardless of theme.
- Gold accent stays as a hairline / micro-highlight, not a background fill.
- Font stack — do not swap Instrument Serif for anything else; the italic weight is load-bearing for the editorial feel.

---

## 7. Suggested prompt for Cursor / Claude Code

Paste the below into Cursor or Claude Code after importing the project files:

```
I have a barbershop website design built in vanilla React/JSX. 
The design files are in: styles.css, site.css, components/SiteApp.jsx, 
components/BarberDashboard.jsx, components/CustomerDashboard.jsx, components/shared.jsx.

Task: port this into [YOUR FRAMEWORK — e.g. Next.js 14 App Router].

Rules:
1. Preserve all CSS variable names exactly as in styles.css.
2. Keep all font families: Instrument Serif, Inter Tight, JetBrains Mono.
3. Keep the data-theme="light/dark" toggle on <html>.
4. The logo is assets/bbit-logo.png — use it in nav, hero, footer. Never text "BBIT" as a logo.
5. Wire the booking/customer data to [YOUR API/DB].
6. Hero section must stay dark in both themes.
7. Keep the WhatsApp FAB monochrome (no green).
8. Do not add new colors — only use the tokens in styles.css :root.

Start by scaffolding the page layout and design system tokens, then work section by section.
```
