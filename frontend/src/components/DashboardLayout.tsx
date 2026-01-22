import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { Link } from "react-router-dom";
import { MarketsGrid } from "./MarketsGrid";

export function DashboardLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📈</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              PolyMOCK
            </h1>
          </div>
          <nav className="flex items-center gap-4">
            {user && (
              <>
                <span className="text-sm text-muted-foreground">
                  Welcome, <span className="font-medium text-foreground">{user.username}</span>
                </span>
                <span className="text-sm font-medium text-emerald-500">
                  ${user.balance.toFixed(2)}
                </span>
                <Link to="/profile">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <span className="h-6 w-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center overflow-hidden text-xs">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        "👤"
                      )}
                    </span>
                    Profile
                  </Button>
                </Link>
                {user.is_admin && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm">
                      ⚙️ Admin
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={logout}>
                  Sign Out
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Markets</h2>
          <p className="text-muted-foreground mt-2">
            Trade on the outcomes of real-world events
          </p>
        </div>

        <MarketsGrid />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 PolyMOCK. Prediction Market Demo.</p>
        </div>
      </footer>
    </div>
  );
}
