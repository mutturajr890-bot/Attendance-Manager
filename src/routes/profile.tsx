import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Smart Attendance Manager" },
      {
        name: "description",
        content:
          "Save your name, contact details, college, designation and department.",
      },
      { property: "og:title", content: "Your profile — Smart Attendance Manager" },
      {
        property: "og:description",
        content: "Keep your teaching details up to date.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});

const fields = [
  { key: "full_name", label: "Full name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "college_name", label: "College" },
  { key: "designation", label: "Designation" },
  { key: "department", label: "Department" },
] as const;

type Form = Record<(typeof fields)[number]["key"], string>;

const empty: Form = {
  full_name: "",
  email: "",
  phone: "",
  college_name: "",
  designation: "",
  department: "",
};

function ProfilePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(empty);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [editing, setEditing] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        college_name: profile.college_name ?? "",
        designation: profile.designation ?? "",
        department: profile.department ?? "",
      });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: auth.user!.id, ...form, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function sendCode() {
    if (resendSeconds > 0) return;
    const { error } = await supabase.auth.reauthenticate();
    if (error) {
      toast.error(error.message);
      return;
    }
    setCodeSent(true);
    setResendSeconds(60);
    toast.success("We emailed you a 6-digit code.");
  }

  async function changePassword() {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      nonce: code.trim(),
      current_password: currentPassword,
    } as { password: string; nonce: string; current_password: string });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPassword("");
    setCurrentPassword("");
    setCode("");
    setCodeSent(false);
    toast.success("Password updated");
  }

  return (
    <AppShell title="Your profile" subtitle="Details saved to your account.">
      <div className="grid gap-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold">Profile details</h2>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  value={form[f.key]}
                  disabled={!editing}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          {editing ? (
            <div className="mt-6 flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save profile"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  if (profile) {
                    setForm({
                      full_name: profile.full_name ?? "",
                      email: profile.email ?? "",
                      phone: profile.phone ?? "",
                      college_name: profile.college_name ?? "",
                      designation: profile.designation ?? "",
                      department: profile.department ?? "",
                    });
                  }
                }}
              >
                Cancel
              </Button>
            </div>
          ) : null}
        </div>

        <div className="h-fit rounded-2xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Change password</h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cur-pass">Current password</Label>
              <PasswordInput
                id="cur-pass"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pass">New password</Label>
              <PasswordInput
                id="new-pass"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            {codeSent ? (
              <div className="space-y-1.5">
                <Label htmlFor="pw-code">6-digit code from your email</Label>
                <Input
                  id="pw-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="text-center text-lg tracking-[0.4em]"
                />
              </div>
            ) : null}
            {codeSent ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={changePassword}
                disabled={
                  newPassword.length < 6 ||
                  currentPassword.length < 6 ||
                  code.trim().length < 6
                }
              >
                Update password
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={sendCode}
                disabled={newPassword.length < 6 || currentPassword.length < 6}
              >
                Email me a code
              </Button>
            )}
            {codeSent ? (
              <Button
                type="button"
                variant="ghost"
                onClick={sendCode}
                disabled={resendSeconds > 0}
                className="w-full text-xs"
              >
                {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
              </Button>
            ) : null}
            <Link
              to="/reset-password"
              className="block pt-1 text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
