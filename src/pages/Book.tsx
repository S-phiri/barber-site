import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/EmptyState";
import { useBooking } from "@/contexts/BookingContext";
import { getPaymentLink, startCheckout } from "@/lib/api";
import type { Service, TimeSlot } from "@/types/types";

export default function Book() {
  const navigate = useNavigate();
  const {
    barber,
    services,
    selectedService,
    date,
    slots,
    loading,
    setSelectedService,
    setDate,
    book,
  } = useBooking();

  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Generate next 14 days for date picker
  const getNext14Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date.toISOString().split("T")[0]);
    }
    return days;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatPrice = (priceCents: number) => {
    return `$${(priceCents / 100).toFixed(2)}`;
  };

  const handleContinueToPayment = async () => {
    if (!selectedSlot) return;

    try {
      const booking = await book(selectedSlot);
      const link = getPaymentLink(booking.id);
      
      if (link !== "/") {
        window.location.href = link;
      } else {
        try {
          const { url } = await startCheckout(booking.id);
          if (url) {
            window.location.href = url;
          } else {
            navigate("/my-bookings");
          }
        } catch {
          navigate("/my-bookings");
        }
      }
    } catch (error) {
      console.error("Failed to create booking:", error);
      // You might want to show an error message to the user here
    }
  };

  if (loading.init) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <EmptyState
          title="Barber Not Found"
          description="The requested barber could not be found."
        />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black">Book with {barber.display_name}</h1>
            <p className="text-silver-600 mt-2">Choose your service, date, and time</p>
          </div>

          {/* Step 1: Service Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>1. Choose Your Service</CardTitle>
              <CardDescription>Select the service you'd like to book</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.services ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : !Array.isArray(services) || services.length === 0 ? (
                <EmptyState
                  title="No Services Available"
                  description="There are currently no services available for booking."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service) => (
                    <Card
                      key={service.id}
                      className={`cursor-pointer transition-colors ${
                        selectedService?.id === service.id
                          ? "border-blue-500 bg-blue-50"
                          : "hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedService(service)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        <p className="text-sm text-gray-600">
                          {service.duration_min} minutes
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          {formatPrice(service.price_cents)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Date Selection */}
          {selectedService && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>2. Choose Your Date</CardTitle>
                <CardDescription>Select a date for your appointment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {getNext14Days().map((day) => {
                    const dayDate = new Date(day);
                    const isSelected = date === day;
                    const isToday = day === new Date().toISOString().split("T")[0];
                    
                    return (
                      <Button
                        key={day}
                        variant={isSelected ? "default" : "outline"}
                        className={`h-16 flex flex-col ${
                          isSelected ? "bg-blue-600 text-white" : ""
                        }`}
                        onClick={() => setDate(day)}
                      >
                        <span className="text-xs">
                          {dayDate.toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span className="text-sm font-semibold">
                          {dayDate.getDate()}
                        </span>
                        {isToday && (
                          <span className="text-xs text-blue-600">Today</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Time Slot Selection */}
          {selectedService && date && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>3. Choose Your Time</CardTitle>
                <CardDescription>Select an available time slot</CardDescription>
              </CardHeader>
              <CardContent>
                {loading.slots ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="lg" />
                  </div>
                ) : !Array.isArray(slots) || slots.length === 0 ? (
                  <EmptyState
                    title="No Available Slots"
                    description="There are no available time slots for the selected date."
                  />
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {slots.map((slot) => (
                      <Button
                        key={slot.id}
                        variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                        className={`h-12 ${
                          selectedSlot?.id === slot.id
                            ? "bg-blue-600 text-white"
                            : "hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedSlot(slot)}
                        disabled={slot.status !== "open"}
                      >
                        {formatTime(slot.start_ts)}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Continue to Payment */}
          {selectedService && selectedSlot && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>4. Complete Your Booking</CardTitle>
                <CardDescription>Review your selection and proceed to payment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold mb-2">Booking Summary</h4>
                  <p><strong>Service:</strong> {selectedService.name}</p>
                  <p><strong>Duration:</strong> {selectedService.duration_min} minutes</p>
                  <p><strong>Price:</strong> {formatPrice(selectedService.price_cents)}</p>
                  <p><strong>Date:</strong> {new Date(date).toLocaleDateString("en-US", { 
                    weekday: "long", 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric" 
                  })}</p>
                  <p><strong>Time:</strong> {formatTime(selectedSlot.start_ts)}</p>
                </div>
                
                <Button
                  onClick={handleContinueToPayment}
                  disabled={loading.booking}
                  className="w-full h-12 text-lg"
                >
                  {loading.booking ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Creating Booking...
                    </>
                  ) : (
                    "Continue to Payment"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
