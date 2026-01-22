import { fetchCurrentUser, login, register } from "@/lib/api";
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

  const mutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: async (data) => {
      // Store token first so fetchCurrentUser can use it
      useAuthStore.getState().login(data.access_token, {
        id: 0,
        username,
        balance: 0,
        is_admin: false,
        avatar_url: null,
        theme: "dark",
        email_notifications: true,
      });

      // Fetch real user info (including is_admin)
      try {
        const user = await fetchCurrentUser();
        useAuthStore.getState().login(data.access_token, user);
      } catch {
        // User info fetch failed, keep placeholder
      }

      navigate("/");
    },
    onError: (err: unknown) => {
      // Check for 401 Unauthorized (bad credentials)
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 401
      ) {
        setError("Invalid username or password.");
      } else if (err instanceof Error) {
        setError(err.message || "Login failed. Please try again.");
      } else {
        setError("Login failed. Please try again.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="login-username" className="block text-sm font-medium text-gray-300">
          Username
        </label>
        <input
          id="login-username"
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD60A] focus:ring-1 focus:ring-[#FFD60A] transition-all"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="login-password" className="block text-sm font-medium text-gray-300">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD60A] focus:ring-1 focus:ring-[#FFD60A] transition-all"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || !username || !password}
        className="w-full py-3.5 px-4 bg-[#FFD60A] hover:bg-[#E6C109] text-black font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {mutation.isPending ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </button>
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
    onSuccess: async (data) => {
      // Store token first so fetchCurrentUser can use it
      useAuthStore.getState().login(data.access_token, {
        id: 0,
        username,
        balance: 0,
        is_admin: false,
        avatar_url: null,
        theme: "dark",
        email_notifications: true,
      });

      // Fetch real user info (including is_admin)
      try {
        const user = await fetchCurrentUser();
        useAuthStore.getState().login(data.access_token, user);
      } catch {
        // User info fetch failed, keep placeholder
      }

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="register-username" className="block text-sm font-medium text-gray-300">
          Username
        </label>
        <input
          id="register-username"
          type="text"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          autoComplete="username"
          className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD60A] focus:ring-1 focus:ring-[#FFD60A] transition-all"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="register-password" className="block text-sm font-medium text-gray-300">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD60A] focus:ring-1 focus:ring-[#FFD60A] transition-all"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="register-confirm" className="block text-sm font-medium text-gray-300">
          Confirm Password
        </label>
        <input
          id="register-confirm"
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD60A] focus:ring-1 focus:ring-[#FFD60A] transition-all"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !username || !password || !confirmPassword}
        className="w-full py-3.5 px-4 bg-[#FFD60A] hover:bg-[#E6C109] text-black font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </button>
    </form>
  );
}

// ============================================================
// Tab Button Component
// ============================================================

function TabButton({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
        active
          ? "bg-[#22C55E] text-white"
          : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================
// Auth Page
// ============================================================

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Subtle gradient background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFD60A]/5 via-transparent to-[#22C55E]/5 pointer-events-none" />
      
      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="bg-[#121212] border border-[#1f1f1f] rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#FFD60A] to-[#FF9500] rounded-xl flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              PolyMOCK
            </h1>
            <p className="text-gray-400 text-sm">
              Trade on prediction markets
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 p-1.5 bg-[#1a1a1a] rounded-xl mb-6">
            <TabButton 
              active={activeTab === "login"} 
              onClick={() => setActiveTab("login")}
            >
              Sign In
            </TabButton>
            <TabButton 
              active={activeTab === "register"} 
              onClick={() => setActiveTab("register")}
            >
              Register
            </TabButton>
          </div>

          {/* Forms */}
          {activeTab === "login" ? <LoginForm /> : <RegisterForm />}

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-[#1f1f1f]">
            <p className="text-center text-xs text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FFD60A]/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
