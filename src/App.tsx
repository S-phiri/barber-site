// src/App.tsx
import { Outlet, useLocation } from "react-router-dom";
import GlobalNav from "@/components/GlobalNav";

export default function App() {
  const location = useLocation();
  const isRevampHome = location.pathname === "/";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {!isRevampHome ? <GlobalNav /> : null}
      <div className={isRevampHome ? undefined : "pt-[60px]"}>
        <Outlet />
      </div>
    </div>
  );
}
