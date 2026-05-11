// Barber Dashboard — comprehensive interactive view
const initialRequests = [
  { id: 'r1', name: 'Thabo M.', service: 'Fade + Beard', time: 'Sat 18, 14:30', phone: '082 445 1290', note: 'First time — heard about you from a friend.' },
  { id: 'r2', name: 'Sipho K.', service: 'Haircut', time: 'Mon 20, 10:00', phone: '083 221 9908' },
  { id: 'r3', name: 'Daniel W.', service: 'Hot Towel Shave', time: 'Tue 21, 17:15', phone: '072 889 0012', note: 'Wedding on Friday.' },
];
const initialChanges = [
  { id: 'c1', name: 'Leo P.', service: 'Haircut', kind: 'Reschedule', from: 'Wed 22, 09:00', to: 'Thu 23, 11:00' },
];

const initialToday = [
  { id: 't1', time: '09:00', duration: '30m', name: 'Mandy S.', service: 'Haircut', status: 'done', tag: 'regular' },
  { id: 't2', time: '10:30', duration: '45m', name: 'James O.', service: 'Skin Fade + Beard Trim', status: 'now', tag: 'regular' },
  { id: 't3', time: '12:00', duration: '30m', name: 'Nkosi B.', service: 'Haircut', status: 'next' },
  { id: 't4', time: '14:30', duration: '45m', name: 'Thabo M.', service: 'Fade + Beard', status: 'pending', tag: 'new' },
  { id: 't5', time: '16:00', duration: '30m', name: 'Chris D.', service: 'Kids Cut', status: 'upcoming' },
];

// Build month grid for April 2026. April 1, 2026 = Wednesday.
const buildMonth = () => {
  const firstDow = 3; // Wed (Mon=0)
  const daysInMonth = 30;
  const prevPad = firstDow;
  const cells = [];
  for (let i = 0; i < prevPad; i++) cells.push({muted: true, n: 0});
  const bookings = {1:2, 2:4, 3:6, 4:5, 7:3, 8:7, 9:1, 10:2, 13:4, 14:3, 15:6, 16:2, 17:5, 20:1, 22:2, 23:4, 24:3, 27:5, 28:1, 29:3, 30:2};
  const blocked = new Set([11, 18, 25]);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ n: d, bookings: bookings[d] || 0, blocked: blocked.has(d), today: d === 18 });
  }
  while (cells.length % 7 !== 0) cells.push({muted: true, n: 0});
  return cells;
};

const BarberDashboard = () => {
  const toast = useToast();
  const [requests, setRequests] = React.useState(initialRequests);
  const [changes, setChanges] = React.useState(initialChanges);
  const [today, setToday] = React.useState(initialToday);
  const [month, setMonth] = React.useState(buildMonth());
  const [search, setSearch] = React.useState('');

  // Simulated "current time" — 10:42
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => { const i = setInterval(() => setTick(t => t+1), 30000); return () => clearInterval(i); }, []);

  const acceptRequest = (r) => {
    setRequests(rs => rs.filter(x => x.id !== r.id));
    setToday(t => [...t, { id: 'n'+r.id, time: r.time.split(', ')[1], duration: '45m', name: r.name, service: r.service, status: 'upcoming', tag: 'new' }].sort((a,b) => a.time.localeCompare(b.time)));
    toast({ title: `Accepted ${r.name}`, body: `${r.service} — ${r.time}`, tone: 'success', icon: 'check' });
  };
  const declineRequest = (r) => {
    setRequests(rs => rs.filter(x => x.id !== r.id));
    toast({ title: `Declined ${r.name}`, body: 'Customer was notified.', tone: 'danger', icon: 'x' });
  };
  const approveChange = (c) => {
    setChanges(cs => cs.filter(x => x.id !== c.id));
    toast({ title: `${c.kind} approved`, body: `${c.name} — ${c.to}`, tone: 'success', icon: 'check' });
  };

  const toggleBlock = (idx) => {
    setMonth(m => m.map((c, i) => i === idx ? {...c, blocked: !c.blocked} : c));
    const cell = month[idx];
    toast({ title: cell.blocked ? `Unblocked April ${cell.n}` : `Blocked April ${cell.n}`, icon: cell.blocked ? 'check' : 'ban' });
  };

  const customers = [
    { name: 'Mandy Solane',   phone: '084 289 5197', visits: 12, last: '2026 / 04 / 13', fav: 'Haircut', tag: 'VIP', g: 1 },
    { name: 'James Okafor',   phone: '072 145 0889', visits: 8,  last: '2026 / 04 / 10', fav: 'Fade + Beard', tag: 'Regular', g: 2 },
    { name: 'Nkosi Bethwell', phone: '083 902 4471', visits: 4,  last: '2026 / 03 / 28', fav: 'Haircut', tag: 'Regular', g: 3 },
    { name: 'Leo Perera',     phone: '078 552 1004', visits: 2,  last: '2026 / 03 / 14', fav: 'Haircut', g: 4 },
    { name: 'Chris Dlamini',  phone: '061 778 3345', visits: 1,  last: '2026 / 04 / 04', fav: 'Kids Cut', tag: 'New', g: 5 },
  ].filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const weekData = [
    { dow: 'SAT', n: 18, count: 0, blocked: true, today: true },
    { dow: 'SUN', n: 19, count: 0, closed: true },
    { dow: 'MON', n: 20, count: 5 },
    { dow: 'TUE', n: 21, count: 3 },
    { dow: 'WED', n: 22, count: 6 },
    { dow: 'THU', n: 23, count: 4 },
    { dow: 'FRI', n: 24, count: 7 },
  ];

  const bars30 = [2,4,3,5,1,0,0,6,3,2,4,1,3,0,0,5,2,4,1,3,6,0,0,3,1,5,2,4,7,1];
  const maxBar = Math.max(...bars30);

  return (
    <div className="page">
      {/* HEADER */}
      <div className="page-header enter" style={{animationDelay: '.05s'}}>
        <div>
          <Eyebrow>Saturday · 18 April 2026 · 10:42</Eyebrow>
          <h1 className="page-title" style={{marginTop: 10}}>Good morning, <em>Ramad</em>.</h1>
          <p className="page-subtitle">Two new booking requests, one reschedule, and James is in your chair right now.</p>
        </div>
        <div className="dock">
          <button><Icon name="plus"/>Walk-in</button>
          <button><Icon name="ban"/>Block time</button>
          <button><Icon name="coffee"/>On break</button>
          <button><Icon name="arrowUpRight"/>Booking page</button>
        </div>
      </div>

      {/* TOP ROW — Today's rail + Pending */}
      <div className="grid" style={{gridTemplateColumns:'1.6fr 1fr', gap: 20, marginBottom: 48}}>
        <Card className="enter" style={{padding:'24px 28px', animationDelay: '.1s'}}>
          <div className="section-head">
            <div>
              <Eyebrow>Today · Saturday</Eyebrow>
              <h2 className="section-title" style={{marginTop:4}}>In the chair</h2>
            </div>
            <div style={{display:'flex', gap: 10, alignItems:'center'}}>
              <Chip tone="amber" dot live>Live · 10:42</Chip>
              <span className="mono" style={{fontSize: 11, color:'var(--text-3)'}}>{today.length} appts · R{today.length * 180}</span>
            </div>
          </div>
          <div className="timeline">
            {today.map(t => (
              <div key={t.id} className={"tl-item " + (t.status === 'now' ? 'now' : t.status === 'done' ? 'done' : '')}>
                <div className="tl-time mono">{t.time}<span className="tl-duration">{t.duration}</span></div>
                <div>
                  <div className="tl-name">{t.name} {t.tag === 'new' && <Chip tone="silver" style={{marginLeft:8}}>New</Chip>}</div>
                  <div className="tl-svc">{t.service}</div>
                </div>
                <div style={{display:'flex', gap:6, alignItems:'center'}}>
                  {t.status === 'now' && <Chip tone="amber" dot live>Now</Chip>}
                  {t.status === 'done' && <Chip tone="green"><Icon name="check" size={10}/>Done</Chip>}
                  {t.status === 'next' && <Chip tone="silver">Up next</Chip>}
                  {t.status === 'pending' && <Chip tone="amber">Pending</Chip>}
                  {(t.status === 'upcoming' || t.status === 'next' || t.status === 'pending') && (
                    <button className="btn btn-ghost btn-sm"><Icon name="ellipsis" size={14}/></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="enter" style={{animationDelay: '.15s'}}>
          <div className="section-head">
            <div>
              <Eyebrow>Pending</Eyebrow>
              <h2 className="section-title" style={{marginTop:4}}>Needs your attention</h2>
            </div>
            <Chip tone="amber">{requests.length + changes.length}</Chip>
          </div>
          <div style={{display:'grid', gap: 10}}>
            {requests.length === 0 && changes.length === 0 && (
              <div className="empty-informative">
                <Eyebrow>All caught up</Eyebrow>
                <div style={{fontSize:14, color:'var(--text-2)'}}>You've responded to every request this week. Average response time: <b className="foil">8 min</b>.</div>
              </div>
            )}
            {requests.map(r => (
              <div key={r.id} style={{padding:'14px 14px', border: '1px solid var(--line)', borderRadius: 12, background:'var(--bg-2)'}}>
                <div style={{display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontWeight:600, fontSize:14}}>{r.name}</div>
                    <div style={{color:'var(--text-2)', fontSize:12.5, marginTop:2}}>{r.service}</div>
                    <div className="mono" style={{color:'var(--text-3)', fontSize:11, marginTop:6, letterSpacing:'.1em'}}>{r.time} · {r.phone}</div>
                  </div>
                  <Chip tone="amber">New</Chip>
                </div>
                {r.note && <div style={{fontSize:12, color:'var(--text-2)', marginTop:8, fontStyle:'italic', borderLeft:'1.5px solid var(--amber)', paddingLeft:10}}>"{r.note}"</div>}
                <div style={{display:'flex', gap:8, marginTop:12}}>
                  <button className="btn btn-primary btn-sm" onClick={() => acceptRequest(r)}><Icon name="check" size={12}/>Accept</button>
                  <button className="btn btn-sm btn-danger" onClick={() => declineRequest(r)}>Decline</button>
                </div>
              </div>
            ))}
            {changes.map(c => (
              <div key={c.id} style={{padding:'14px', border: '1px solid var(--line)', borderRadius: 12, background:'var(--bg-2)'}}>
                <div style={{display:'flex', justifyContent:'space-between', gap:10}}>
                  <div style={{fontWeight:600, fontSize:14}}>{c.name}</div>
                  <Chip tone="silver">{c.kind}</Chip>
                </div>
                <div className="mono" style={{fontSize:11, color:'var(--text-3)', marginTop:6, letterSpacing:'.08em'}}>
                  <span style={{textDecoration:'line-through'}}>{c.from}</span> → <span style={{color:'var(--amber)'}}>{c.to}</span>
                </div>
                <div style={{display:'flex', gap:8, marginTop:12}}>
                  <button className="btn btn-primary btn-sm" onClick={() => approveChange(c)}>Approve</button>
                  <button className="btn btn-sm">Counter-propose</button>
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
          <h2 className="section-title" style={{marginTop: 4}}>Next 7 days</h2>
        </div>
        <div style={{display:'flex', gap:8}}>
          <Chip dot tone="amber">Booked</Chip>
          <Chip dot tone="red">Blocked</Chip>
          <Chip dot tone="silver">Closed</Chip>
        </div>
      </div>
      <div className="grid grid-cols-7 enter" style={{marginBottom: 48, animationDelay: '.2s'}}>
        {weekData.map((d, i) => {
          const intensity = d.count >= 6 ? 'heavy' : d.count >= 3 ? 'light' : '';
          const cls = d.blocked ? 'blocked' : d.closed ? 'muted' : intensity === 'heavy' ? 'booked-heavy' : intensity === 'light' ? 'booked-light' : '';
          return (
            <div key={i} className={"cal-day " + cls + (d.today ? ' today' : '')} style={{aspectRatio: '1/1.15'}}>
              <div>
                <div className="mono" style={{fontSize:10, color:'var(--text-3)', letterSpacing:'.2em'}}>{d.dow}</div>
                <div style={{fontSize:26, fontWeight:700, marginTop:2}}>{d.n}</div>
              </div>
              <div>
                {d.blocked && <div className="mono" style={{fontSize:10, color:'var(--red)', letterSpacing:'.14em'}}>BLOCKED</div>}
                {d.closed && <div className="mono" style={{fontSize:10, color:'var(--text-3)', letterSpacing:'.14em'}}>CLOSED</div>}
                {!d.blocked && !d.closed && (
                  <>
                    <div className="mono" style={{fontSize:10, color:'var(--text-2)'}}>{d.count} booked</div>
                    <div className="cal-bar" style={{marginTop:4}}>
                      {Array.from({length:8}).map((_,j) => <span key={j} className={j < d.count ? 'f' : ''}/>)}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ANALYTICS */}
      <div className="section-head">
        <div>
          <Eyebrow>April 2026</Eyebrow>
          <h2 className="section-title" style={{marginTop: 4}}>The month so far</h2>
        </div>
        <button className="btn btn-sm"><Icon name="download" size={12}/>Export</button>
      </div>
      <div className="grid grid-cols-5 enter" style={{marginBottom: 32, animationDelay: '.25s'}}>
        <Card>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <Eyebrow>Cuts</Eyebrow>
            <Icon name="scissors" size={14}/>
          </div>
          <div className="metric-num" style={{marginTop: 16}}><AnimatedNumber value={47}/></div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 12}}>
            <span className="metric-delta up">↑ 18% vs March</span>
            <div className="spark" style={{width: 80}}>
              {[2,3,2,4,3,5,4,6,5,7].map((v,i) => <span key={i} style={{height: `${v*10}%`}} className={i >= 7 ? 'hi' : ''}/>)}
            </div>
          </div>
        </Card>
        <Card>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <Eyebrow>Revenue</Eyebrow>
            <Icon name="dollar" size={14}/>
          </div>
          <div className="metric-num" style={{marginTop: 16}}>R <AnimatedNumber value={8460}/></div>
          <div style={{marginTop: 12}}>
            <span className="metric-delta up">↑ R1 280 vs March</span>
            <div className="bar" style={{marginTop: 8}}><span style={{width: '68%'}}/></div>
            <div className="mono" style={{fontSize:10, color:'var(--text-3)', marginTop:6}}>68% of R12.5k goal</div>
          </div>
        </Card>
        <Card>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <Eyebrow>Busiest day</Eyebrow>
            <Icon name="calendar" size={14}/>
          </div>
          <div className="metric-num" style={{marginTop: 16}}>Friday</div>
          <div className="metric-delta" style={{color:'var(--text-2)', marginTop:14}}>Avg <b>7.2</b> cuts · peak 16:00–18:00</div>
        </Card>
        <Card>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <Eyebrow>Returning</Eyebrow>
            <Icon name="users" size={14}/>
          </div>
          <div className="metric-num" style={{marginTop: 16}}><AnimatedNumber value={73}/>%</div>
          <div className="metric-delta up" style={{marginTop:14}}>↑ 9pts — loyalty stamps working</div>
        </Card>
        <Card>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <Eyebrow>Top service</Eyebrow>
            <Icon name="star" size={14}/>
          </div>
          <div className="metric-num" style={{marginTop: 16}}>Fade</div>
          <div style={{marginTop:14, display:'flex', flexDirection:'column', gap: 4}}>
            {[{n:'Fade + Beard', pct: 42}, {n:'Haircut', pct: 33}, {n:'Hot Shave', pct: 14}].map(s => (
              <div key={s.n} style={{display:'flex', alignItems:'center', gap:8}}>
                <div className="mono" style={{fontSize:10, width: 80, color:'var(--text-2)'}}>{s.n}</div>
                <div className="bar" style={{flex:1}}><span style={{width: `${s.pct}%`}}/></div>
                <div className="mono" style={{fontSize:10, color:'var(--text-3)', width: 28, textAlign:'right'}}>{s.pct}%</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="enter" style={{padding: 28, marginBottom: 48, animationDelay: '.3s'}}>
        <div className="section-head">
          <div>
            <Eyebrow>Bookings · last 30 days</Eyebrow>
            <h3 className="section-title" style={{marginTop:4, fontSize:18}}>Momentum</h3>
          </div>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <span className="mono" style={{fontSize:11, color:'var(--text-3)'}}>TOTAL <b style={{color:'var(--text)'}}>{bars30.reduce((a,b)=>a+b,0)}</b></span>
            <span className="mono" style={{fontSize:11, color:'var(--text-3)'}}>AVG/DAY <b style={{color:'var(--text)'}}>{(bars30.reduce((a,b)=>a+b,0)/30).toFixed(1)}</b></span>
          </div>
        </div>
        <div style={{display:'flex', alignItems:'flex-end', gap: 5, height: 160, marginTop: 10}}>
          {bars30.map((v, i) => (
            <div key={i} style={{
              flex:1, height: `${(v/maxBar)*100}%`, minHeight: 2,
              background: i === 29 ? 'var(--gold-gradient)' : v === 0 ? 'var(--line)' : 'var(--silver-2)',
              opacity: v === 0 ? 0.4 : 1,
              borderRadius: 2,
              transition: 'all .3s'
            }} title={`Day ${i+1}: ${v}`}/>
          ))}
        </div>
        <div style={{display:'flex', justifyContent:'space-between', marginTop: 10}}>
          <span className="mono" style={{fontSize:10, color:'var(--text-3)'}}>MAR 20</span>
          <span className="mono" style={{fontSize:10, color:'var(--text-3)'}}>APR 4</span>
          <span className="mono" style={{fontSize:10, color:'var(--text-3)'}}>APR 18 · today</span>
        </div>
      </Card>

      {/* CUSTOMERS */}
      <div className="section-head">
        <div>
          <Eyebrow>Customers</Eyebrow>
          <h2 className="section-title" style={{marginTop: 4}}>Your people</h2>
        </div>
        <div className="search">
          <Icon name="search"/>
          <input placeholder="Search name or phone…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>
      <Card className="enter" style={{padding: 0, overflow:'hidden', marginBottom: 48, animationDelay: '.35s'}}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Visits</th>
              <th>Last visit</th>
              <th>Favourite</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.phone}>
                <td>
                  <span className={"avatar avatar-g" + c.g}>{c.name.split(' ').map(n=>n[0]).join('')}</span>
                  <span style={{fontWeight:600}}>{c.name}</span>
                  {c.tag && <Chip tone={c.tag==='VIP'?'amber':c.tag==='New'?'silver':'default'} style={{marginLeft:10}}>{c.tag}</Chip>}
                </td>
                <td className="mono" style={{color:'var(--text-2)', fontSize:12.5}}>{c.phone}</td>
                <td><span className="foil" style={{fontWeight:700, fontSize:15}}>{c.visits}</span></td>
                <td className="mono" style={{color:'var(--text-2)', fontSize:12.5}}>{c.last}</td>
                <td style={{color:'var(--amber)', fontSize:13}}>{c.fav}</td>
                <td style={{textAlign:'right'}}>
                  <button className="btn btn-ghost btn-sm"><Icon name="phone" size={12}/></button>
                  <button className="btn btn-ghost btn-sm"><Icon name="arrowRight" size={12}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* SCHEDULE · BLOCK DAYS */}
      <div className="section-head">
        <div>
          <Eyebrow>Schedule</Eyebrow>
          <h2 className="section-title" style={{marginTop: 4}}>Block days</h2>
          <div style={{color:'var(--text-3)', fontSize:12, marginTop: 6}}>Click any day to toggle. <span className="mono" style={{color:'var(--text-2)'}}>GOOGLE CALENDAR</span> is synced — no manual mirroring.</div>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button className="btn btn-sm"><Icon name="chevronL" size={12}/>Prev</button>
          <div className="mono" style={{padding:'0 16px', fontWeight:700, letterSpacing:'.16em'}}>APRIL 2026</div>
          <button className="btn btn-sm">Next<Icon name="chevronR" size={12}/></button>
        </div>
      </div>
      <div className="enter" style={{animationDelay: '.4s'}}>
        <div className="cal-head">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="cal-grid">
          {month.map((c, i) => {
            if (c.muted) return <div key={i} className="cal-day muted"/>;
            const intensity = c.bookings >= 5 ? 'booked-heavy' : c.bookings >= 2 ? 'booked-light' : '';
            const cls = c.blocked ? 'blocked' : intensity;
            return (
              <div key={i} className={"cal-day " + cls + (c.today ? ' today' : '')} onClick={() => toggleBlock(i)}>
                <div>{c.n}</div>
                <div>
                  {c.blocked ? (
                    <div className="mono" style={{fontSize:9, letterSpacing:'.14em'}}>BLOCKED</div>
                  ) : c.bookings > 0 ? (
                    <div className="cal-bar">
                      {Array.from({length:6}).map((_,j) => <span key={j} className={j < c.bookings ? 'f' : ''}/>)}
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
};

Object.assign(window, { BarberDashboard });
