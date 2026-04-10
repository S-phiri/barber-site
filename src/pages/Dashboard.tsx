import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth";

interface DashboardData {
  visits: number;
  loyalty_points: number;
  next_appointment?: {
    id: string;
    start_ts: string;
  };
}

const BASE = import.meta.env.VITE_API_URL;

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { access } = useAuth();

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch(`${BASE}/api/me/dashboard/`, {
          headers: {
            Authorization: `Bearer ${access}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch dashboard");
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    if (access) {
      fetchDashboard();
    }
  }, [access]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-silver-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-black mb-8">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-silver-200">
            <CardHeader>
              <CardTitle className="text-lg text-black">Total Visits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-black">{data?.visits || 0}</p>
              <p className="text-silver-600 text-sm">Appointments completed</p>
            </CardContent>
          </Card>

          <Card className="border-silver-200">
            <CardHeader>
              <CardTitle className="text-lg text-black">Loyalty Points</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-black">{data?.loyalty_points || 0}</p>
              <p className="text-silver-600 text-sm">Points earned</p>
            </CardContent>
          </Card>

          <Card className="border-silver-200">
            <CardHeader>
              <CardTitle className="text-lg text-black">Next Appointment</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.next_appointment ? (
                <div>
                  <p className="text-lg font-semibold text-black">
                    {new Date(data.next_appointment.start_ts).toLocaleDateString()}
                  </p>
                  <p className="text-silver-600 text-sm">
                    {new Date(data.next_appointment.start_ts).toLocaleTimeString()}
                  </p>
                </div>
              ) : (
                <p className="text-silver-600">No upcoming appointments</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
