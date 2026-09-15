import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Smart Attendance Manager" },
      {
        name: "description",
        content:
          "Get a one-time code by email and choose a new password for your attendance account.",
      },
      { property: "og:title", content: "Reset your password — Smart Attendance Manager" },
      {
        property: "og:description",
        content: "Finish resetting your attendance account password with an emailed code.",
      },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStep("code");
    setResendSeconds(60);
    toast.success("We emailed you a verification code.");
  }

  async function resendCode() {
    if (busy || resendSeconds > 0) return;
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResendSeconds(60);
    toast.success("New code sent.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "recovery",
    });
    if (otpError) {
      setBusy(false);
      toast.error(otpError.message);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. You are signed in.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="surface-grid grid min-h-screen place-items-center px-4 py-12">
      {step === "email" ? (
        <form
          onSubmit={sendCode}
          className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h1 className="font-display text-lg font-bold">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we will send you a verification code.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="rp-email">Email</Label>
            <Input
              id="rp-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Send code"}
          </Button>
          <Link
            to="/auth"
            className="block text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </form>
      ) : (
        <form
          onSubmit={submit}
          className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h1 className="font-display text-lg font-bold">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            Enter the code we sent to {email}.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="rp-code">Verification code</Label>
            <Input
              id="rp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center text-lg tracking-[0.4em]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np">New password</Label>
            <PasswordInput
              id="np"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={busy || password.length < 6 || code.trim().length < 4}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-xs"
            onClick={resendCode}
            disabled={busy || resendSeconds > 0}
          >
            {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
          </Button>
        </form>
      )}
    </div>
  );
}