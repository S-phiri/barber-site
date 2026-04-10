import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/analytics";
import { XCircle } from "lucide-react";

export default function CheckoutFailed() {
  const navigate = useNavigate();

  useEffect(() => {
    track("checkout_failed");
  }, []);

  const handleTryAgain = () => {
    navigate("/checkout");
  };

  const handleViewBookings = () => {
    navigate("/bookings");
  };

  const handleStartOver = () => {
    navigate("/booking");
  };

  return (
    <div className="bg-white min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-700">
            Payment Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            We couldn't process your payment. Your booking slot may still be
            held for a few more minutes if you'd like to try again.
          </p>

          <div className="space-y-3">
            <Button onClick={handleTryAgain} className="w-full">
              Try Payment Again
            </Button>
            <Button
              onClick={handleViewBookings}
              variant="outline"
              className="w-full"
            >
              View My Bookings
            </Button>
            <Button
              onClick={handleStartOver}
              variant="outline"
              className="w-full"
            >
              Start Over
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
