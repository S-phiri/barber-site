// Public-facing BBIT homepage
const SiteIcon = ({name, size=16}) => {
  const paths = {
    menu: <g><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></g>,
    whatsapp: <g><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.2-1.4A10 10 0 1 0 12 2z"/><path d="M9 9a1.5 1.5 0 0 1 3 0c0 1-1 1.5-1 2.5 0 2 3 4 5 4 1 0 1.5-1 1.5-1"/></g>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>,
    pin: <g><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></g>,
    clock: <g><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></g>,
    insta: <g><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/></g>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    arrowRight: <g><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></g>,
    scissors: <g><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></g>,
    sun: <g><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></g>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
  };
  const p = paths[name]; if (!p) return null;
  const fill = ['star'].includes(name) ? 'currentColor' : 'none';
  return <svg viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>{p}</svg>;
};

const useReveal = () => {
  React.useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
};

const SiteApp = () => {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{ "theme": "dark" }/*EDITMODE-END*/;
  const [theme, setTheme] = React.useState(() => localStorage.getItem('bbit-theme') || TWEAK_DEFAULTS.theme);
  const [solid, setSolid] = React.useState(false);

  React.useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('bbit-theme', theme); }, [theme]);
  React.useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useReveal();

  const gallery = [
    { url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=900&q=80', t: 'The Clean Fade', s: 'Fade · 30 min' },
    { url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&q=80', t: 'Classic Taper', s: 'Haircut · 30 min' },
    { url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900&q=80', t: 'Beard Sculpt', s: 'Beard · 30 min' },
    { url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80', t: 'Skin Fade', s: 'Fade · 45 min' },
    { url: 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=900&q=80', t: 'Hot Towel', s: 'Shave · 30 min' },
    { url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=900&q=80', t: 'Line Up', s: 'Detail · 15 min' },
    { url: 'https://images.unsplash.com/photo-1634302086738-b9a573d26d3a?w=900&q=80', t: 'Textured Crop', s: 'Haircut · 45 min' },
    { url: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=900&q=80', t: 'Tailored Cut', s: 'Haircut · 60 min' },
    { url: 'https://images.unsplash.com/photo-1596728325488-58c87691e9af?w=900&q=80', t: 'Signature Shave', s: 'Shave · 45 min' },
  ];

  const services = [
    { n: 'Beard Trim', d: 'Expert shaping and styling, hot-towel finish.', t: 30, p: 150 },
    { n: 'Haircut', d: 'Full precision cut and finish, tailored to your head shape.', t: 60, p: 250 },
    { n: 'Fade + Beard', d: 'Skin or taper fade paired with a sharp beard sculpt.', t: 45, p: 220 },
    { n: 'Hot Towel Shave', d: 'Traditional straight-razor shave with hot towel ritual.', t: 30, p: 180 },
    { n: 'Dye + Haircut', d: 'Colour treatment with full haircut — grey blending or fashion.', t: 90, p: 350 },
    { n: 'Kids Cut', d: 'Patient, quick and clean for ages 4–12.', t: 25, p: 120 },
  ];

  const team = [
    { n: 'Ramad', r: 'Master Barber · Owner', exp: '12 YRS', spec: 'Fades · Beards', img: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=900&q=80' },
    { n: 'Thabo', r: 'Senior Barber', exp: '7 YRS', spec: 'Classic cuts · Shaves', img: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=900&q=80' },
    { n: 'Sipho', r: 'Barber', exp: '4 YRS', spec: 'Textured · Kids', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80' },
  ];

  const reviews = [
    { body: 'Best fade in Claremont, hands down. Ramad takes his time — never feels rushed.', n: 'James O.', m: 'GOOGLE · 2 WEEKS AGO' },
    { body: 'Walked in for a wedding cut, left feeling like a different man. The hot towel is worth it alone.', n: 'Daniel W.', m: 'INSTAGRAM · 1 MONTH AGO' },
    { body: "Been going for a year now. The place feels like your own lounge. Clean, calm, expert hands.", n: 'Leo P.', m: 'GOOGLE · 3 MONTHS AGO' },
  ];

  const products = [
    { n: 'Pomade · Firm Hold', c: 'HAIRWEAR', p: 180, g: 'P' },
    { n: 'Beard Oil · Cedar', c: 'BEARD', p: 140, g: 'B' },
    { n: 'Clay · Matte Finish', c: 'HAIRWEAR', p: 160, g: 'C' },
    { n: 'Aftershave Balm', c: 'SKIN', p: 120, g: 'A' },
  ];

  return (
    <div className="site">
      <nav className={"site-nav " + (solid ? 'solid' : '')}>
        <div className="nav-left"><div className="brand"><img src="assets/bbit-logo.png" alt="BBIT — Best Barber In Town" className="brand-logo"/></div></div>
        <div className="nav-center">
          <a className="nav-link" href="#gallery">Gallery</a>
          <a className="nav-link" href="#services">Services</a>
          <a className="nav-link" href="#team">Team</a>
          <a className="nav-link" href="#products">Products</a>
          <a className="nav-link" href="#find">Contact</a>
        </div>
        <div className="nav-right">
          <button className="theme-toggle" onClick={() => setTheme(theme==='dark'?'light':'dark')}>
            <SiteIcon name={theme==='dark'?'sun':'moon'} size={15}/>
          </button>
          <a className="nav-link" href="BBIT Dashboards.html">Dashboard</a>
          <a className="nav-link" href="#">Logout</a>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero">
        <div className="hero-img"></div>
        <div className="hero-grain"></div>
        <div className="hero-content">
          <div>
            <img src="assets/bbit-logo.png" alt="BBIT" className="hero-logo"/>
            <div className="hero-eyebrow"><span className="line"></span>EST. 2019 · CLAREMONT, CAPE TOWN</div>
            <h1 className="hero-title">A cut<br/>above <em>the rest.</em></h1>
            <p className="hero-tagline">Precision cuts, traditional shaves and quiet Saturdays in the chair. Walk in looking for a trim; walk out feeling sharp.</p>
            <div className="hero-ctas">
              <a className="btn-hero" href="#services">Book appointment <SiteIcon name="arrowRight" size={14}/></a>
              <a className="btn-hero ghost" href="#"><SiteIcon name="whatsapp" size={14}/>WhatsApp us</a>
            </div>
          </div>
          <div className="hero-meta">
            <div className="hero-meta-item"><div className="k">Rating</div><div className="v"><em>4.9</em></div></div>
            <div className="hero-meta-item"><div className="k">Cuts</div><div className="v"><em>2 300+</em></div></div>
            <div className="hero-meta-item"><div className="k">Years</div><div className="v"><em>7</em></div></div>
          </div>
        </div>
        <div className="scroll-cue"><div>SCROLL</div><div className="bar"></div></div>
      </header>

      {/* GALLERY */}
      <section id="gallery" className="section">
        <div className="section-head-center reveal">
          <div className="open-pill"><span className="d"></span>Open now · closes 17:00</div>
          <h2 className="section-title-xl">Our <em>Signature</em> Cuts</h2>
          <div className="section-rule"></div>
          <p className="section-intro">A gallery of recent work. Every cut is tailored to the client — head shape, lifestyle, the occasion. These are a few we're proud of.</p>
        </div>
        <div className="gallery-grid reveal">
          {gallery.map((g, i) => (
            <div key={i} className={"g-card g-" + (i+1)}>
              <img src={g.url} alt={g.t}/>
              <div className="g-meta"><div className="t">{g.t}</div><div className="s">{g.s}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="section" style={{paddingTop: 40}}>
        <div className="section-head-center reveal">
          <h2 className="section-title-xl">Our <em>Services</em></h2>
          <div className="section-rule"></div>
          <p className="section-intro">Bookings via the app or WhatsApp. Walk-ins welcome when the chair is free.</p>
        </div>
        <div className="bill reveal">
          <div className="bill-head"><span>Service · Duration</span><span>Price · ZAR</span></div>
          {services.map((s, i) => (
            <div key={s.n} className="svc-row">
              <div className="svc-num">0{i+1}</div>
              <div>
                <div className="svc-name"><em>{s.n}</em></div>
                <div className="svc-desc">{s.d}</div>
                <div className="mono" style={{fontSize:11, color:'var(--text-3)', letterSpacing:'.16em', marginTop:8}}>{s.t} MIN</div>
              </div>
              <div className="svc-price">R{s.p}</div>
              <div className="svc-cta"><a className="btn btn-sm" href="#">Book now <SiteIcon name="arrowRight" size={11}/></a></div>
            </div>
          ))}
        </div>
      </section>

      {/* TEAM */}
      <section id="team" className="section" style={{paddingTop: 40}}>
        <div className="section-head-center reveal">
          <h2 className="section-title-xl">The <em>Chairs</em></h2>
          <div className="section-rule"></div>
          <p className="section-intro">Three barbers, three chairs, one standard. Pick your regular or let us match you.</p>
        </div>
        <div className="team-grid reveal">
          {team.map(t => (
            <div key={t.n} className="team-card">
              <img src={t.img} alt={t.n}/>
              <div className="team-meta">
                <div className="n"><em>{t.n}</em></div>
                <div className="r">{t.r}</div>
                <div className="s"><span>{t.exp}</span><span>·</span><span>{t.spec}</span></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section className="section" style={{paddingTop: 40}}>
        <div className="section-head-center reveal">
          <h2 className="section-title-xl">In Their <em>Words</em></h2>
          <div className="section-rule"></div>
          <div style={{display:'inline-flex', alignItems:'center', gap:10, marginTop: 16}}>
            <div style={{display:'flex', gap:3, color:'var(--amber)'}}>{Array.from({length:5}).map((_,i) => <SiteIcon key={i} name="star" size={14}/>)}</div>
            <span className="mono" style={{fontSize:11, color:'var(--text-2)', letterSpacing:'.14em'}}>4.9 · 180+ GOOGLE REVIEWS</span>
          </div>
        </div>
        <div className="quotes-rail reveal">
          {reviews.map((r, i) => (
            <div key={i} className="quote-card">
              <div className="quote-stars">{Array.from({length:5}).map((_,i) => <SiteIcon key={i} name="star" size={12}/>)}</div>
              <div className="quote-body">{r.body}</div>
              <div className="quote-attr">
                <div className="qavatar">{r.n.split(' ').map(x=>x[0]).join('')}</div>
                <div><div className="n">{r.n}</div><div className="m">{r.m}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="products" className="section" style={{paddingTop: 40}}>
        <div className="section-head-center reveal">
          <h2 className="section-title-xl">The <em>Shelf</em></h2>
          <div className="section-rule"></div>
          <p className="section-intro">A small, curated shelf of the grooming we actually use in-chair.</p>
        </div>
        <div className="prod-grid reveal">
          {products.map(p => (
            <div key={p.n} className="prod">
              <div className="prod-img">{p.g}</div>
              <div className="prod-body">
                <div className="n">{p.n}</div>
                <div className="c">{p.c}</div>
                <div className="p">R{p.p}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FIND US */}
      <section id="find" className="section" style={{paddingTop: 40}}>
        <div className="section-head-center reveal">
          <h2 className="section-title-xl">Find <em>Us</em></h2>
          <div className="section-rule"></div>
        </div>
        <div className="find-grid reveal">
          <div className="map-wrap">
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3312.5!2d18.47!3d-33.98!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzPCsDU4JzQ4LjAiUyAxOMKwMjgnMTIuMCJF!5e0!3m2!1sen!2sza!4v1700000000000" loading="lazy"></iframe>
          </div>
          <div className="find-info">
            <div className="info-row">
              <div className="ic"><SiteIcon name="pin" size={16}/></div>
              <div><div className="k">Location</div><div className="v">Draper Square, Shop No 7<br/>Claremont, Cape Town, 7708</div></div>
              <a className="btn btn-sm" href="#">Directions</a>
            </div>
            <div className="info-row">
              <div className="ic"><SiteIcon name="phone" size={16}/></div>
              <div><div className="k">Phone</div><div className="v"><a href="tel:+27670238197">+27 670 238 197</a></div></div>
              <a className="btn btn-sm" href="tel:+27670238197">Call</a>
            </div>
            <div className="info-row">
              <div className="ic"><SiteIcon name="clock" size={16}/></div>
              <div>
                <div className="k">Hours</div>
                <div className="v">Mon – Fri · 09:00 – 19:00<br/>Saturday · 09:00 – 17:00<br/>Sunday · Closed</div>
              </div>
              <div className="open-pill" style={{alignSelf:'center'}}><span className="d"></span>Open</div>
            </div>
            <div className="info-row">
              <div className="ic"><SiteIcon name="insta" size={16}/></div>
              <div><div className="k">Instagram</div><div className="v"><a href="#">@BBIT_Ramad</a></div></div>
              <a className="btn btn-sm" href="#">Follow</a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="cta-strip reveal">
        <h2>Ready for <em>the chair?</em></h2>
        <p>Book in under 30 seconds. Confirmation by SMS and WhatsApp.</p>
        <div className="hero-ctas">
          <a className="btn-hero" href="#">Book appointment <SiteIcon name="arrowRight" size={14}/></a>
          <a className="btn-hero ghost" href="#"><SiteIcon name="whatsapp" size={14}/>WhatsApp</a>
        </div>
      </section>

      <footer>
        <div className="site-foot">
          <div className="foot-col">
            <div className="foot-brand"><img src="assets/bbit-logo.png" alt="BBIT" style={{height: 64, width:'auto', filter: theme==='dark' ? 'invert(1) brightness(2)' : 'invert(1) brightness(0)'}}/></div>
            <div className="foot-tag">Precision cuts and traditional shaves in the heart of Claremont. Est. 2019.</div>
          </div>
          <div className="foot-col"><div className="k">Visit</div>
            <a href="#gallery">Gallery</a><a href="#services">Services</a><a href="#team">Team</a><a href="#products">Products</a>
          </div>
          <div className="foot-col"><div className="k">Contact</div>
            <a href="tel:+27670238197">+27 670 238 197</a><a href="#">WhatsApp</a><a href="#">Instagram</a>
          </div>
          <div className="foot-col"><div className="k">Account</div>
            <a href="BBIT Dashboards.html">Customer dashboard</a><a href="BBIT Dashboards.html">Barber dashboard</a>
          </div>
        </div>
        <div className="foot-base">© 2026 Best Barber In Town · All rights reserved</div>
      </footer>

      <a className="fab" href="#" aria-label="WhatsApp"><SiteIcon name="whatsapp" size={22}/></a>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<SiteApp/>);
