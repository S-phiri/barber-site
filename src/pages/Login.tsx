import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth";
import { me as apiMe } from "@/lib/api";

export default function Login() {
  const [username, setUsername] = useState(""); // username OR email
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user, ready } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next");
  /** Safe in-app path from ?next=, or null to use role-based default */
  const explicitNext = useMemo(() => {
    if (!nextParam || !nextParam.startsWith("/") || nextParam.startsWith("//")) return null;
    return nextParam;
  }, [nextParam]);

  // After login, /me must finish so user.is_staff is known before we redirect.
  // PrivateRoute uses ?next=/dashboard — staff must not follow that to the customer dashboard.
  useEffect(() => {
    if (!ready || !user) return;
    const staff = Boolean(user.is_staff);
    const customerDefaultPath =
      !explicitNext || explicitNext === "/" || explicitNext === "/dashboard";
    if (staff) {
      if (customerDefaultPath) {
        navigate("/barber-dashboard", { replace: true });
        return;
      }
      navigate(explicitNext!, { replace: true });
      return;
    }
    if (explicitNext && explicitNext !== "/") {
      navigate(explicitNext, { replace: true });
      return;
    }
    navigate("/dashboard", { replace: true });
  }, [ready, user, navigate, explicitNext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); 
    setLoading(true);
    try {
      await login(username, password);
      // Fetch fresh /me once and redirect based on is_staff (no cached role).
      const fresh = await apiMe();
      const isStaff = Boolean(fresh?.is_staff);
      navigate(isStaff ? "/barber-dashboard" : "/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <Card className="w-full max-w-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[var(--text-primary)]">Sign In</CardTitle>
          <p className="text-[var(--text-secondary)]">Welcome back to BBIT</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="text" placeholder="Username or Email" value={username} onChange={(e) => setUsername(e.target.value)} required className="border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]" />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]" />
            {error && <p className="text-[var(--color-danger)] text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full bg-black hover:bg-neutral-800 text-white" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-[var(--text-secondary)]">Don't have an account? <Link to="/signup" className="text-[var(--text-primary)] hover:underline font-medium">Sign up</Link></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
