import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/EmptyState";
import { useBookings } from "@/hooks/useBookings";
import { useAuth } from "@/auth";
import { Calendar, Clock, User, Scissors } from "lucide-react";
import type { Booking } from "@/types/types";

function formatPrice(priceCents: number): string {
  return `R${(priceCents / 100).toFixed(2)}`;
}

function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "default";
    case "pending":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{booking.service.name}</CardTitle>
          <Badge variant={getStatusVariant(booking.status)}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span>{booking.barber.display_name}</span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>{formatDateTime(booking.start_ts)}</span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>
            {new Date(booking.start_ts).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
            {" - "}
            {new Date(booking.end_ts).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <span className="font-semibold">
            {formatPrice(booking.service.price_cents)}
          </span>
          <span className="text-xs text-gray-500">Booking #{booking.id}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyBookings() {
  const { bookings, loading, error, fetchBookings } = useBookings();
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleBookNew = () => {
    navigate("/services");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-gray-600 mt-2">
              View and manage your appointments
            </p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleBookNew}>Book New Appointment</Button>
            <Button variant="outline" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>

        {error ? (
          <EmptyState
            title="Error Loading Bookings"
            description={error}
            actionLabel="Try Again"
            onAction={fetchBookings}
          />
        ) : bookings.length === 0 ? (
          <EmptyState
            title="No Bookings Yet"
            description="You haven't made any bookings yet. Book your first appointment to get started!"
            actionLabel="Book Appointment"
            onAction={handleBookNew}
            icon={<Scissors className="h-12 w-12" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
