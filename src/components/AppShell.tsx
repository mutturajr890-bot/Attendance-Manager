import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, GraduationCap, LogOut, User2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/dashboard", label: "Colleges", icon: GraduationCap },
  { to: "/holidays", label: "Holidays", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: User2 },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-secondary/40 py-0 sm:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-background shadow-xl sm:min-h-[calc(100vh-3rem)] sm:rounded-[2rem] sm:border sm:border-border">
        <header className="sticky top-0 z-40 rounded-t-[2rem] border-b border-border/70 bg-background/90 px-5 pb-3 pt-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-xs font-bold">
                AM
              </span>
              <span className="font-display text-sm font-semibold">Attendance Manager</span>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto text-muted-foreground"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[320px] rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will need to sign in again with your email code.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row justify-end gap-2">
                  <AlertDialogCancel className="mt-0">No</AlertDialogCancel>
                  <AlertDialogAction onClick={signOut}>Yes</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <h1 className="mt-3 font-display text-xl font-bold leading-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </header>

        <main className="flex-1 px-5 pb-28 pt-5">{children}</main>

        <nav className="sticky bottom-0 z-40 mt-auto grid grid-cols-3 gap-1 rounded-b-[2rem] border-t border-border bg-background/95 px-3 py-2 backdrop-blur">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "bg-secondary text-primary" }}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
