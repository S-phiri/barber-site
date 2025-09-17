import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/auth";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const { register } = useAuth();
  const navigate                = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(username, email, password);      // posts to /api/auth/register/
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Registration failed. Username may already be taken.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-black">Sign Up</CardTitle>
          <p className="text-silver-600">Join BBIT today</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="text"  placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className="border-silver-300" />
            <Input type="email" placeholder="Email"    value={email}    onChange={(e) => setEmail(e.target.value)}     required className="border-silver-300" />
            <Input type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required className="border-silver-300" />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full bg-black hover:bg-charcoal-800 text-white" disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-silver-600">Already have an account? <Link to="/login" className="text-black hover:underline font-medium">Sign in</Link></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
