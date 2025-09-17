import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/auth";

export default function Login() {
  const [username, setUsername] = useState(""); // username OR email
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user, ready } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/';

  // Navigate when user becomes authenticated
  useEffect(() => {
    if (ready && user) {
      navigate(next, { replace: true });
    }
  }, [ready, user, navigate, next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); 
    setLoading(true);
    try {
      await login(username, password);
      // Navigation will be handled by the useEffect above
    } catch (err: any) {
      setError(err?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-black">Sign In</CardTitle>
          <p className="text-silver-600">Welcome back to BBIT</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="text" placeholder="Username or Email" value={username} onChange={(e) => setUsername(e.target.value)} required className="border-silver-300" />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="border-silver-300" />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full bg-black hover:bg-charcoal-800 text-white" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-silver-600">Don't have an account? <Link to="/signup" className="text-black hover:underline font-medium">Sign up</Link></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
