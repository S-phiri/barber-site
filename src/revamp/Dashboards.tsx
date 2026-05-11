import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BBIT_THEME_CHANGE_EVENT, getBbitTheme, setBbitTheme, type BbitTheme } from "@/lib/bbitTheme";
import BarberDashboard from "@/revamp/BarberDashboard";
import CustomerDashboard from "@/revamp/CustomerDashboard";
import { Defs, Icon, ToastProvider } from "@/revamp/shared";

type DashTab = "barber" | "customer";

export default function Dashboards() {
  const [theme, setTheme] = useState<BbitTheme>(() => getBbitTheme());
  const [dash, setDash] = useState<DashTab>(() => (localStorage.getItem("bbit-dash") as DashTab) || "barber");

  useEffect(() => {
    const sync = () => setTheme(getBbitTheme());
    window.addEventListener(BBIT_THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(BBIT_THEME_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    localStorage.setItem("bbit-dash", dash);
  }, [dash]);

  return (
    <ToastProvider>
      <Defs />
      <nav className="nav">
        <div className="nav-left">
          <div className="brand">BBIT</div>
        </div>
        <div className="nav-center">
          <Link className="nav-link" to="/revamp">
            Home
          </Link>
          <a className="nav-link" href="/#gallery">
            Gallery
          </a>
          <a className="nav-link" href="/#services">
            Services
          </a>
          <a className="nav-link" href="/#products">
            Products
          </a>
          <a className="nav-link" href="/#contact">
            Contact
          </a>
        </div>
        <div className="nav-right">
          <div className="dash-switch" data-screen-label={dash === "barber" ? "01 Barber Dashboard" : "02 Customer Dashboard"}>
            <button className={dash === "barber" ? "active" : ""} onClick={() => setDash("barber")} type="button">
              Barber
            </button>
            <button className={dash === "customer" ? "active" : ""} onClick={() => setDash("customer")} type="button">
              Customer
            </button>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setBbitTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
            type="button"
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
          </button>
          <Link className="nav-link" to="/">
            <Icon name="logout" size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Back to app
          </Link>
        </div>
      </nav>
      <main key={dash}>{dash === "barber" ? <BarberDashboard /> : <CustomerDashboard />}</main>
    </ToastProvider>
  );
}

