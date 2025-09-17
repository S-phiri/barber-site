import { Outlet } from "react-router-dom";
import { BookingProvider } from "@/contexts/BookingContext";

export default function BookingLayout() {
  return (
    <BookingProvider>
      <Outlet />
    </BookingProvider>
  );
}
