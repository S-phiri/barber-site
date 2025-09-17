// src/App.tsx
import { Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Outlet />
    </div>
  );
}
