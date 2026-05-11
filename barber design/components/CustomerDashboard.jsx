// Customer Dashboard — cohesive with barber view

const CustomerDashboard = () => {
  const toast = useToast();
  const [loyaltyCount, setLoyaltyCount] = React.useState(4); // 4 of 6 stamps
  const [nextAppt, setNextAppt] = React.useState({
    service: 'Skin Fade + Beard Trim',
    barber: 'Ramad',
    date: 'Tuesday, 21 April 2026',
    time: '14:30',
    duration: 45,
    price: 220,
    address: '4 Market St, BBIT Barbers',
  });

  // Countdown: now = Sat 18, 10:42. Target = Tue 21, 14:30
  const target = React.useMemo(() => new Date(2026, 3, 21, 14, 30).getTime(), []);
  const start  = React.useMemo(() => new Date(2026, 3, 18, 10, 42).getTime(), []);
  const [remaining, setRemaining] = React.useState(target - start);
  React.useEffect(() => {
    const i = setInterval(() => setRemaining(r => Math.max(0, r - 60000)), 60000); // advance 1 minute per real minute
    return () => clearInterval(i);
  }, []);
  const totalWindow = target - start;
  const progress = 1 - (remaining / totalWindow);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);

  const circumference = 2 * Math.PI * 74;
  const dashOffset = circumference * (1 - progress);

  const history = [
    { date: '2026 / 04 / 13', service: 'Haircut', barber: 'Ramad', price: 160, status: 'paid' },
    { date: '2026 / 03 / 28', service: 'Fade + Beard', barber: 'Ramad', price: 220, status: 'paid' },
    { date: '2026 / 03 / 07', service: 'Haircut', barber: 'Ramad', price: 160, status: 'paid' },
    { date: '2026 / 02 / 15', service: 'Hot Towel Shave', barber: 'Ramad', price: 180, status: 'paid' },
  ];

  const notifs = [
    { id:'n1', unread: true, icon: 'check', title: 'Booking confirmed for Tue 21 April · 14:30', meta: '2 HOURS AGO' },
    { id:'n2', unread: true, icon: 'gift', title: 'Only 2 more cuts until a free Hot Towel Shave', meta: 'YESTERDAY' },
    { id:'n3', unread: false, icon: 'sparkle', title: 'New gallery: April Edition is up — see the latest looks', meta: '3 DAYS AGO' },
    { id:'n4', unread: false, icon: 'calendar', title: 'Ramad is away Sat 18 — book any other day', meta: '5 DAYS AGO' },
  ];

  const quickServices = [
    { name: 'Haircut', price: 160, time: 30 },
    { name: 'Fade + Beard', price: 220, time: 45, tag: 'favorite' },
    { name: 'Hot Towel Shave', price: 180, time: 30 },
    { name: 'Kids Cut', price: 120, time: 25 },
  ];

  const reschedule = () => {
    setNextAppt(a => ({...a, date: 'Wednesday, 22 April 2026', time: '16:00'}));
    toast({ title: 'Reschedule requested', body: 'Ramad will confirm shortly.', icon: 'clock' });
  };
  const cancel = () => {
    toast({ title: 'Cancellation sent', body: 'You\'ll get a confirmation in a moment.', tone: 'danger', icon: 'x' });
  };
  const rebook = (s) => {
    toast({ title: `Rebooking ${s.name}`, body: 'Opening booking page with your details prefilled…', icon: 'scissors' });
  };
  const fillStamp = () => {
    if (loyaltyCount < 6) setLoyaltyCount(c => c + 1);
    else { setLoyaltyCount(0); toast({ title: 'Free shave unlocked!', body: 'Ramad has added a voucher to your account.', icon: 'gift' }); }
  };

  return (
    <div className="page">
      <div className="page-header enter">
        <div>
          <Eyebrow>Saturday · 18 April 2026</Eyebrow>
          <h1 className="page-title" style={{marginTop: 10}}>Welcome back, <em>Mandy</em>.</h1>
          <p className="page-subtitle">Your chair's waiting on Tuesday. Two more cuts to a free shave.</p>
        </div>
        <div style={{display:'flex', gap:10}}>
          <button className="btn" onClick={() => toast({title:'Opened booking page', icon:'scissors'})}><Icon name="calendar" size={14}/>My bookings</button>
          <button className="btn btn-primary"><Icon name="plus" size={12}/>New booking</button>
        </div>
      </div>

      {/* HERO: next appointment */}
      <div className="grid enter" style={{gridTemplateColumns:'1.6fr 1fr', gap: 20, marginBottom: 48, animationDelay: '.1s'}}>
        <div className="hero-appt">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative', zIndex: 2}}>
            <div>
              <Eyebrow>Your next appointment</Eyebrow>
              <h2 style={{fontFamily:'Instrument Serif, serif', fontSize: 44, lineHeight: 1, margin: '14px 0 0', letterSpacing:'-0.02em'}}>
                {nextAppt.service}
              </h2>
              <div style={{marginTop: 16, display:'flex', gap: 22, flexWrap:'wrap'}}>
                <div>
                  <Eyebrow>With</Eyebrow>
                  <div style={{fontWeight:600, fontSize:15, marginTop:4}}>{nextAppt.barber}</div>
                </div>
                <div>
                  <Eyebrow>When</Eyebrow>
                  <div style={{fontWeight:600, fontSize:15, marginTop:4}}>{nextAppt.date}</div>
                  <div className="mono" style={{fontSize:12, color:'var(--text-2)', marginTop:2}}>{nextAppt.time} · {nextAppt.duration} MIN</div>
                </div>
                <div>
                  <Eyebrow>Where</Eyebrow>
                  <div style={{fontWeight:600, fontSize:15, marginTop:4, display:'flex', alignItems:'center', gap:6}}>
                    <Icon name="mapPin" size={13}/>{nextAppt.address}
                  </div>
                </div>
              </div>
              <div style={{display:'flex', gap: 10, marginTop: 22, flexWrap:'wrap'}}>
                <button className="btn btn-primary btn-sm" onClick={() => toast({title:'Added to calendar', icon:'check'})}>
                  <Icon name="calendar" size={12}/>Add to calendar
                </button>
                <button className="btn btn-sm" onClick={reschedule}><Icon name="clock" size={12}/>Reschedule</button>
                <button className="btn btn-sm btn-danger" onClick={cancel}>Cancel</button>
              </div>
            </div>
            <div className="ring-wrap">
              <svg viewBox="0 0 168 168">
                <circle cx="84" cy="84" r="74" className="ring-bg"/>
                <circle cx="84" cy="84" r="74" className="ring-fg"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}/>
              </svg>
              <div className="ring-center">
                <div>
                  <div className="ring-value">
                    {days > 0 ? days : hours > 0 ? hours : mins}
                  </div>
                  <div className="ring-label">{days > 0 ? 'DAYS' : hours > 0 ? 'HOURS' : 'MINUTES'}</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{position:'relative', zIndex:2, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap: 12}}>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <Chip tone="green" dot live>Confirmed</Chip>
              <span className="mono" style={{fontSize:11, color:'var(--text-3)'}}>BOOKING #BB-4021</span>
            </div>
            <div className="mono" style={{fontSize:13}}>R <AnimatedNumber value={nextAppt.price}/></div>
          </div>
        </div>

        {/* LOYALTY STAMP CARD */}
        <Card style={{padding: 28, display:'flex', flexDirection:'column'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <div>
              <Eyebrow>Loyalty</Eyebrow>
              <div style={{fontFamily:'Instrument Serif, serif', fontSize: 28, marginTop: 8, lineHeight: 1.1, letterSpacing:'-0.01em'}}>
                <em>Every 6<sup style={{fontSize: 16}}>th</sup> cut is on us</em>
              </div>
            </div>
            <Icon name="gift" size={18}/>
          </div>
          <div style={{display:'flex', alignItems:'baseline', gap: 8, marginTop: 22}}>
            <span className="loyalty-num foil">{loyaltyCount}</span>
            <span className="mono" style={{fontSize: 12, color:'var(--text-3)', letterSpacing:'.14em'}}>/ 6 STAMPS</span>
          </div>
          <div className="stamp-row" style={{marginTop: 18}}>
            {Array.from({length: 6}).map((_, i) => {
              const isFilled = i < loyaltyCount;
              const isNext = i === loyaltyCount;
              return (
                <div key={i} className={"stamp " + (isFilled ? 'filled' : isNext ? 'next' : '')} onClick={isNext ? fillStamp : undefined} style={{cursor: isNext ? 'pointer' : 'default'}}>
                  {isFilled ? <Icon name="scissors" size={14}/> : <span className="mono" style={{fontSize:11}}>{i+1}</span>}
                </div>
              );
            })}
          </div>
          <div style={{marginTop: 18, padding: '12px 14px', background: 'var(--amber-soft)', borderRadius: 12, border: '1px solid color-mix(in oklab, var(--amber) 20%, transparent)'}}>
            <div style={{fontSize:12.5, fontWeight:600}}>
              <span className="foil">2 more cuts</span> to unlock a free hot towel shave
            </div>
            <div style={{fontSize: 11, color:'var(--text-2)', marginTop: 4}}>Earned after your next visit on 21 April.</div>
          </div>
        </Card>
      </div>

      {/* INFORMATIVE EMPTY / STATS ROW */}
      <div className="grid grid-cols-4 enter" style={{marginBottom: 48, animationDelay: '.15s'}}>
        <Card>
          <Eyebrow>Member since</Eyebrow>
          <div className="metric-num" style={{marginTop: 14}}>2024</div>
          <div className="metric-delta" style={{color:'var(--text-2)', marginTop:10}}>13 months with BBIT</div>
        </Card>
        <Card>
          <Eyebrow>Total visits</Eyebrow>
          <div className="metric-num" style={{marginTop: 14}}><AnimatedNumber value={12}/></div>
          <div className="spark" style={{marginTop: 14}}>
            {[1,2,1,0,2,1,3,0,1,2,1,2].map((v,i) => <span key={i} style={{height: `${15 + v*20}%`}} className={i >= 9 ? 'hi' : ''}/>)}
          </div>
        </Card>
        <Card>
          <Eyebrow>Spent this year</Eyebrow>
          <div className="metric-num" style={{marginTop: 14}}>R <AnimatedNumber value={1480}/></div>
          <div className="metric-delta" style={{color:'var(--text-2)', marginTop:10}}>Avg R 160 / visit</div>
        </Card>
        <Card>
          <Eyebrow>Favourite barber</Eyebrow>
          <div style={{display:'flex', alignItems:'center', gap:12, marginTop: 14}}>
            <span className="avatar avatar-g1" style={{width: 44, height: 44, fontSize: 16}}>R</span>
            <div>
              <div style={{fontFamily:'Instrument Serif, serif', fontSize: 28, lineHeight:1}}><em>Ramad</em></div>
              <div style={{display:'flex', gap: 2, marginTop: 6, color:'var(--amber)'}}>
                {Array.from({length:5}).map((_,i) => <Icon key={i} name="star" size={11}/>)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* QUICK REBOOK */}
      <div className="section-head">
        <div>
          <Eyebrow>Book again</Eyebrow>
          <h2 className="section-title" style={{marginTop:4}}>Your usual</h2>
        </div>
        <button className="btn btn-ghost btn-sm">See all services<Icon name="arrowRight" size={12}/></button>
      </div>
      <div className="grid grid-cols-4 enter" style={{marginBottom: 48, animationDelay: '.2s'}}>
        {quickServices.map(s => (
          <Card key={s.name} className="service-card" onClick={() => rebook(s)} style={{cursor:'pointer', padding: 22}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
              <Icon name="scissors" size={16}/>
              {s.tag === 'favorite' && <Chip tone="amber"><Icon name="heart" size={10}/>Favorite</Chip>}
            </div>
            <div style={{fontFamily:'Instrument Serif, serif', fontSize: 28, marginTop: 26, lineHeight: 1, letterSpacing:'-0.01em'}}>{s.name}</div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop: 14}}>
              <div>
                <div className="mono" style={{fontSize:11, color:'var(--text-3)', letterSpacing:'.14em'}}>{s.time} MIN</div>
                <div style={{fontSize: 17, fontWeight:600, marginTop:2}}>R {s.price}</div>
              </div>
              <span style={{color:'var(--amber)', display:'inline-flex', alignItems:'center', gap: 4, fontSize: 12, fontWeight:600, letterSpacing:'.08em'}}>
                BOOK<Icon name="arrowRight" size={12}/>
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* HISTORY + NOTIFICATIONS */}
      <div className="grid" style={{gridTemplateColumns:'1.5fr 1fr', gap: 20}}>
        <Card className="enter" style={{padding: 28, animationDelay: '.25s'}}>
          <div className="section-head">
            <div>
              <Eyebrow>History</Eyebrow>
              <h2 className="section-title" style={{marginTop:4}}>Your chair, recapped</h2>
            </div>
            <button className="btn btn-ghost btn-sm"><Icon name="download" size={12}/>Export receipts</button>
          </div>
          <table className="table" style={{marginTop: 8}}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Barber</th>
                <th style={{textAlign:'right'}}>Paid</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td className="mono" style={{fontSize:12, color:'var(--text-2)'}}>{h.date}</td>
                  <td style={{fontWeight:600}}>{h.service}</td>
                  <td style={{color:'var(--text-2)'}}>{h.barber}</td>
                  <td style={{textAlign:'right'}} className="mono">R {h.price}</td>
                  <td style={{textAlign:'right'}}>
                    <button className="btn btn-ghost btn-sm" onClick={() => rebook({name: h.service, price: h.price, time: 30})}>Rebook</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="enter" style={{padding: 28, animationDelay: '.3s'}}>
          <div className="section-head">
            <div>
              <Eyebrow>Notifications</Eyebrow>
              <h2 className="section-title" style={{marginTop:4}}>What's new</h2>
            </div>
            <Chip tone="amber">{notifs.filter(n => n.unread).length}</Chip>
          </div>
          <div>
            {notifs.map(n => (
              <div key={n.id} className={"notif-item " + (n.unread ? 'unread' : '')}>
                <div className="notif-icon"><Icon name={n.icon} size={14}/></div>
                <div>
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-meta">{n.meta}</div>
                </div>
                {n.unread && <span className="dot" style={{background:'var(--amber)', marginTop: 12}}></span>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

Object.assign(window, { CustomerDashboard });
