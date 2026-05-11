// Root App — shell with nav + dashboard switcher + theme toggle
const App = () => {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "dark",
    "dashboard": "barber"
  }/*EDITMODE-END*/;

  const [theme, setTheme] = React.useState(() => localStorage.getItem('bbit-theme') || TWEAK_DEFAULTS.theme);
  const [dash, setDash] = React.useState(() => localStorage.getItem('bbit-dash') || TWEAK_DEFAULTS.dashboard);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bbit-theme', theme);
  }, [theme]);
  React.useEffect(() => { localStorage.setItem('bbit-dash', dash); }, [dash]);

  // Edit mode listener
  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setEditOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setEditOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({type: '__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', handler);
  }, []);
  const [editOpen, setEditOpen] = React.useState(false);

  const applyEdit = (patch) => {
    window.parent.postMessage({type: '__edit_mode_set_keys', edits: patch}, '*');
  };

  return (
    <ToastProvider>
      <Defs/>
      <nav className="nav">
        <div className="nav-left">
          <div className="brand">BBIT</div>
        </div>
        <div className="nav-center">
          <a className="nav-link" href="#">Gallery</a>
          <a className="nav-link" href="#">Services</a>
          <a className="nav-link" href="#">Products</a>
          <a className="nav-link" href="#">Contact</a>
        </div>
        <div className="nav-right">
          <div className="dash-switch" data-screen-label={dash === 'barber' ? '01 Barber Dashboard' : '02 Customer Dashboard'}>
            <button className={dash==='barber'?'active':''} onClick={() => setDash('barber')}>Barber</button>
            <button className={dash==='customer'?'active':''} onClick={() => setDash('customer')}>Customer</button>
          </div>
          <button className="theme-toggle" onClick={() => { const n = theme==='dark'?'light':'dark'; setTheme(n); applyEdit({theme: n}); }} title="Toggle theme">
            <Icon name={theme==='dark'?'sun':'moon'} size={15}/>
          </button>
          <a className="nav-link" href="#"><Icon name="logout" size={13} style={{verticalAlign:'middle', marginRight: 6}}/>Logout</a>
        </div>
      </nav>

      <main key={dash}>
        {dash === 'barber' ? <BarberDashboard/> : <CustomerDashboard/>}
      </main>

      {editOpen && (
        <div style={{
          position:'fixed', bottom: 24, right: 24, zIndex: 90,
          background: 'var(--bg-1)', border: '1px solid var(--line-2)', borderRadius: 14, padding: 18, width: 260,
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{fontWeight:700, letterSpacing:'.14em', fontSize:11, textTransform:'uppercase', color:'var(--text-3)', marginBottom: 12}}>Tweaks</div>
          <div style={{fontSize:12, color:'var(--text-2)', marginBottom: 6}}>Theme</div>
          <div className="dash-switch" style={{width:'100%'}}>
            <button className={theme==='dark'?'active':''} onClick={() => { setTheme('dark'); applyEdit({theme:'dark'}); }} style={{flex:1}}>Dark</button>
            <button className={theme==='light'?'active':''} onClick={() => { setTheme('light'); applyEdit({theme:'light'}); }} style={{flex:1}}>Light</button>
          </div>
          <div style={{fontSize:12, color:'var(--text-2)', marginTop: 14, marginBottom: 6}}>Dashboard</div>
          <div className="dash-switch" style={{width:'100%'}}>
            <button className={dash==='barber'?'active':''} onClick={() => setDash('barber')} style={{flex:1}}>Barber</button>
            <button className={dash==='customer'?'active':''} onClick={() => setDash('customer')} style={{flex:1}}>Customer</button>
          </div>
        </div>
      )}
    </ToastProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
