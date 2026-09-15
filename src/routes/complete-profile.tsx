import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/complete-profile")({
  head: () => ({
    meta: [
      { title: "Finish setting up your account — Smart Attendance Manager" },
      {
        name: "description",
        content: "Set a username and password so you can sign in without Google next time.",
      },
    ],
  }),
  component: CompleteProfile,
});

function CompleteProfile() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    // Only Google-only accounts (no email/password credential yet) land here.
    const hasPasswordLogin = user.app_metadata?.providers?.includes("email");
    if (hasPasswordLogin) {
      navigate({ to: "/dashboard" });
      return;
    }
    setFullName((user.user_metadata?.full_name as string | undefined) ?? "");
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { full_name: fullName },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("You can now sign in with your email and password too.");
    navigate({ to: "/dashboard" });
  }

  if (loading || !user) {
    return (
      <div className="surface-grid grid min-h-screen place-items-center px-4 py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="surface-grid grid min-h-screen place-items-center px-4 py-12">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div>
          <h1 className="font-display text-lg font-bold">Finish setting up your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You signed in with Google. Choose a username and password so you can also sign in
            directly with your email next time.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-name">Username</Label>
          <Input
            id="cp-name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-pass">Password</Label>
          <PasswordInput
            id="cp-pass"
            autoComplete="new-password"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-pass-confirm">Confirm password</Label>
          <PasswordInput
            id="cp-pass-confirm"
            autoComplete="new-password"
            minLength={6}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Save and continue"}
        </Button>
      </form>
    </div>
  );
}
