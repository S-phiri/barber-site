import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBooking } from "@/contexts/BookingContext";
import { track } from "@/lib/analytics";
import { CheckCircle } from "lucide-react";

export default function CheckoutSuccess() {
  const { resetBooking } = useBooking();
  const navigate = useNavigate();

  useEffect(() => {
    track("checkout_success");
    // Reset booking state after successful payment
    resetBooking();
  }, [resetBooking]);

  const handleViewBookings = () => {
    navigate("/my-bookings");
  };

  const handleBookAnother = () => {
    navigate("/services");
  };

  return (
    <div className="bg-white min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-700">
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Your booking has been confirmed and payment processed successfully.
            You'll receive a confirmation email shortly.
          </p>

          <div className="space-y-3">
            <Button onClick={handleViewBookings} className="w-full">
              View My Bookings
            </Button>
            <Button
              onClick={handleBookAnother}
              variant="outline"
              className="w-full"
            >
              Book Another Appointment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
