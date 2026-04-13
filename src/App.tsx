// src/App.tsx
import { Outlet } from "react-router-dom";
import GlobalNav from "@/components/GlobalNav";

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <GlobalNav />
      <div className="pt-[60px]">
        <Outlet />
      </div>
    </div>
  );
}
