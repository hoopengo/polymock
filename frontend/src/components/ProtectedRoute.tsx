import { fetchCurrentUser } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);

  // Refresh user info on page load to ensure is_admin and other data is up-to-date
  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentUser()
        .then((user) => {
          setUser(user);
        })
        .catch(() => {
          // If fetching user fails (e.g., token expired), the 401 interceptor will logout
        });
    }
  }, [isAuthenticated, setUser]);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
