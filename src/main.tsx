import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import App from "./App";
import Home from "@/components/home";
import Services from "@/pages/Services";
import Book from "@/pages/Book";
import BarberPicker from "@/pages/BarberPicker";
import SlotCalendarPage from "@/pages/SlotCalendar";
import Checkout from "@/pages/Checkout";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import CheckoutFailed from "@/pages/CheckoutFailed";
import MyBookings from "@/pages/MyBookings";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import BookingLayout from "@/pages/BookingLayout";
import GoogleCalendarBooking from "@/pages/GoogleCalendarBooking";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import { AuthProvider } from "@/contexts/auth";
import PrivateRoute from "@/components/PrivateRoute";
import { BookingProvider } from "@/contexts/BookingContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="book" element={<PrivateRoute><GoogleCalendarBooking /></PrivateRoute>} />
            <Route path="booking/google-calendar" element={<PrivateRoute><GoogleCalendarBooking /></PrivateRoute>} />
            <Route path="barbers/:slug/calendar" element={<PrivateRoute><BookingProvider><Book /></BookingProvider></PrivateRoute>} />
            <Route path="dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route element={<PrivateRoute><BookingLayout /></PrivateRoute>}>
              <Route path="booking" element={<Services />} />
              <Route path="booking/barbers" element={<BarberPicker />} />
              <Route path="booking/slots" element={<SlotCalendarPage />} />
              <Route path="checkout" element={<Checkout />} />
            </Route>
            <Route path="checkout/success" element={<PrivateRoute><BookingProvider><CheckoutSuccess /></BookingProvider></PrivateRoute>} />
            <Route path="checkout/failed" element={<PrivateRoute><CheckoutFailed /></PrivateRoute>} />
            <Route path="success" element={<PaymentSuccess />} />
            <Route path="cancel" element={<PaymentCancel />} />
            <Route path="bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
            <Route path="admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
            <Route path="products" element={<PrivateRoute><Products /></PrivateRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
