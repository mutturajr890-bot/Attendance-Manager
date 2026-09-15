import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PasswordInput } from "@/components/PasswordInput";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Smart Attendance Manager" },
      {
        name: "description",
        content:
          "Sign in with a one-time code or create an account to manage your class attendance records.",
      },
      { property: "og:title", content: "Sign in — Smart Attendance Manager" },
      {
        property: "og:description",
        content: "Access your colleges, classes and attendance records.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [sentTo, setSentTo] = useState("");

  // login step: "password" -> "code"
  const [step, setStep] = useState<"password" | "code">("password");
  const [code, setCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const awaitingCode = useRef(false);

  useEffect(() => {
    if (!loading && user && !awaitingCode.current) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    awaitingCode.current = true;
    // Step 1 — check the password is right.
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      awaitingCode.current = false;
      setBusy(false);
      toast.error(error.message);
      return;
    }
    // Keep the page here while the short-lived password session is cleared.
    await supabase.auth.signOut();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (otpError) {
      awaitingCode.current = false;
      toast.error(otpError.message);
      return;
    }
    setStep("code");
    setResendSeconds(60);
    toast.success("We emailed you a 6-digit code.");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    awaitingCode.current = false;
    navigate({ to: "/dashboard" });
  }

  async function resendCode() {
    if (resendSeconds > 0 || busy) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResendSeconds(60);
    toast.success("New code sent.");
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSentTo(email);
      toast.success("Check your email and tap the link to verify your account.");
      return;
    }
    navigate({ to: "/dashboard" });
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/complete-profile`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      toast.error("Google sign-in failed. Please try again.");
    }
    // Supabase performs a full browser redirect to Google and back, so no
    // client-side navigation is needed here on success.
  }

  return (
    <div className="surface-grid grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-sm font-bold">
            AM
          </span>
          <span className="font-display font-semibold">Attendance Manager</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {step === "code" ? (
            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <h1 className="font-display text-lg font-bold">Enter your code</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a verification code to {email}.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="text-center text-lg tracking-[0.4em]"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Verify & sign in"}
              </Button>
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resendCode}
                  disabled={busy || resendSeconds > 0}
                  className="h-auto px-0 text-xs"
                >
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    awaitingCode.current = false;
                    setStep("password");
                    setCode("");
                  }}
                  className="h-auto px-0 text-xs"
                >
                  Use a different account
                </Button>
              </div>
            </form>
          ) : (
            <>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={signIn} className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="si-email">Email</Label>
                      <Input
                        id="si-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="si-pass">Password</Label>
                      <PasswordInput
                        id="si-pass"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Continue"
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      We email you a one-time code to finish signing in.
                    </p>
                    <Link
                      to="/reset-password"
                      className="block w-full text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  {sentTo ? (
                    <div className="mt-5 rounded-xl border border-border bg-secondary/50 p-4 text-sm">
                      <p className="font-medium">Verify your email</p>
                      <p className="mt-1 text-muted-foreground">
                        We sent a verification link to {sentTo}. Tap it to activate your
                        account, then sign in.
                      </p>
                    </div>
                  ) : null}
                  <form onSubmit={signUp} className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="su-name">Full name</Label>
                      <Input
                        id="su-name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-email">Email</Label>
                      <Input
                        id="su-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-pass">Password</Label>
                      <Input
                        id="su-pass"
                        autoComplete="new-password"
                        minLength={6}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Create account"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or{" "}
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button variant="outline" className="w-full" onClick={google}>
                Continue with Google
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}