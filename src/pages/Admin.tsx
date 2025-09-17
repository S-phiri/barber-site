import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/auth";
import { getAdminBookings } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import type { AdminBooking } from "@/types/types";

function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-US", {
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

export default function Admin() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate("/services");
      return;
    }

    async function fetchAdminBookings() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAdminBookings();
        setBookings(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load admin bookings";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchAdminBookings();
  }, [isAdmin, navigate]);

  if (!isAdmin) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleBackToBookings = () => {
    navigate("/my-bookings");
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
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Manage all bookings</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleBackToBookings}>
              My Bookings
            </Button>
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
            onAction={() => window.location.reload()}
          />
        ) : bookings.length === 0 ? (
          <EmptyState
            title="No Bookings Found"
            description="There are currently no bookings in the system."
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Bookings ({bookings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">ID</th>
                      <th className="text-left py-2 px-4">Customer</th>
                      <th className="text-left py-2 px-4">Barber</th>
                      <th className="text-left py-2 px-4">Service</th>
                      <th className="text-left py-2 px-4">Start</th>
                      <th className="text-left py-2 px-4">End</th>
                      <th className="text-left py-2 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-2 px-4 font-mono text-sm">
                          #{booking.id}
                        </td>
                        <td className="py-2 px-4">{booking.customer_email}</td>
                        <td className="py-2 px-4">
                          {booking.barber.display_name}
                        </td>
                        <td className="py-2 px-4">{booking.service.name}</td>
                        <td className="py-2 px-4 text-sm">
                          {formatDateTime(booking.start_ts)}
                        </td>
                        <td className="py-2 px-4 text-sm">
                          {formatDateTime(booking.end_ts)}
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant={getStatusVariant(booking.status)}>
                            {booking.status.charAt(0).toUpperCase() +
                              booking.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
