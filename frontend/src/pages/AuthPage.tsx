import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { login, register } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ============================================================
// Login Form
// ============================================================

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  const authLogin = useAuthStore((state) => state.login);

  const mutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: async (data) => {
      // After login, we need user info. For now, use username as placeholder
      // In production, fetch user info from /auth/me endpoint
      authLogin(data.access_token, {
        id: 0, // Will be updated when we fetch user info
        username,
        balance: 1000, // Default balance
      });
      navigate("/");
    },
    onError: (err: Error) => {
      setError(err.message || "Login failed. Please check your credentials.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-username">Username</Label>
        <Input
          id="login-username"
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={mutation.isPending || !username || !password}
      >
        {mutation.isPending ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

// ============================================================
// Register Form
// ============================================================

function RegisterForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  const authLogin = useAuthStore((state) => state.login);

  const registerMutation = useMutation({
    mutationFn: () => register(username, password),
    onSuccess: () => {
      // After successful registration, login the user
      loginAfterRegister.mutate();
    },
    onError: (err: Error) => {
      setError(err.message || "Registration failed. Username may already exist.");
    },
  });

  const loginAfterRegister = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: (data) => {
      authLogin(data.access_token, {
        id: 0,
        username,
        balance: 1000,
      });
      navigate("/");
    },
    onError: () => {
      // Registration succeeded but login failed - redirect to login tab
      setError("Account created! Please sign in.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    registerMutation.mutate();
  };

  const isPending = registerMutation.isPending || loginAfterRegister.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="register-username">Username</Label>
        <Input
          id="register-username"
          type="text"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          autoComplete="username"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-password">Password</Label>
        <Input
          id="register-password"
          type="password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-confirm">Confirm Password</Label>
        <Input
          id="register-confirm"
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !username || !password || !confirmPassword}
      >
        {isPending ? "Creating account..." : "Create Account"}
      </Button>
    </form>
  );
}

// ============================================================
// Auth Page
// ============================================================

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl">📈</span>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              PolyMOCK
            </CardTitle>
          </div>
          <CardDescription>
            Sign in to trade on prediction markets
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
