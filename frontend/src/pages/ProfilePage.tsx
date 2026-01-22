import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { changePassword, fetchCurrentUser, updateProfile } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

// ============================================================
// Profile Page Component
// ============================================================

export default function ProfilePage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Profile form state
  const [avatarUrl, setAvatarUrl] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Profile update status
  const [profileSuccess, setProfileSuccess] = useState("");

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setAvatarUrl(user.avatar_url || "");
      setTheme(user.theme);
      setEmailNotifications(user.email_notifications);
    }
  }, [user]);

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      const updatedUser = await fetchCurrentUser();
      setUser(updatedUser);
      setProfileSuccess("Profile updated successfully!");
      setTimeout(() => setProfileSuccess(""), 3000);
    },
  });

  // Password change mutation
  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setTimeout(() => setPasswordSuccess(""), 3000);
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      setPasswordError(error.response?.data?.detail || "Failed to change password");
      setPasswordSuccess("");
    },
  });

  // Handlers
  const handleProfileUpdate = () => {
    profileMutation.mutate({
      avatar_url: avatarUrl || null,
      theme,
      email_notifications: emailNotifications,
    });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    passwordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-2xl">📈</span>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                PolyMOCK
              </h1>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                ← Back to Markets
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Profile Settings</h2>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Avatar & Account Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Account Information</h3>
            
            <div className="flex items-start gap-6">
              {/* Avatar Preview */}
              <div className="flex flex-col items-center gap-2">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-3xl">👤</span>
                  )}
                </div>
              </div>

              {/* Account Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Username</Label>
                  <p className="font-medium text-lg">{user?.username}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Balance</Label>
                  <p className="font-medium text-lg text-emerald-500">${user?.balance.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Avatar URL Input */}
            <div className="space-y-2">
              <Label htmlFor="avatar-url">Avatar URL</Label>
              <Input
                id="avatar-url"
                type="url"
                placeholder="https://example.com/your-avatar.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL to an image for your profile avatar
              </p>
            </div>
          </Card>

          {/* Settings */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Preferences</h3>
            
            <div className="space-y-6">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="theme-toggle" className="text-base">Dark Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Use dark theme for the interface
                  </p>
                </div>
                <Switch
                  id="theme-toggle"
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>

              <Separator />

              {/* Email Notifications Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications-toggle" className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about market activity
                  </p>
                </div>
                <Switch
                  id="notifications-toggle"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </div>

            <Separator className="my-6" />

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleProfileUpdate}
                disabled={profileMutation.isPending}
              >
                {profileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              {profileSuccess && (
                <span className="text-sm text-emerald-500">{profileSuccess}</span>
              )}
              {profileMutation.isError && (
                <span className="text-sm text-destructive">Failed to update profile</span>
              )}
            </div>
          </Card>

          {/* Password Change */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              {passwordError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-500">
                  {passwordSuccess}
                </div>
              )}

              <Button 
                type="submit" 
                variant="outline"
                disabled={passwordMutation.isPending}
              >
                {passwordMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
