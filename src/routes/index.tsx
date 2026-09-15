import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarCheck2, FileSpreadsheet, PieChart, Users2 } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Attendance Manager — Class attendance made simple" },
      {
        name: "description",
        content:
          "Mark daily attendance in one tap, manage colleges, classes and students, track holidays and get monthly percentage reports.",
      },
      { property: "og:title", content: "Smart Attendance Manager" },
      {
        property: "og:description",
        content:
          "Mark daily attendance in one tap and get instant monthly attendance percentages.",
      },
    ],
  }),
  component: Home,
});

const features = [
  {
    icon: Users2,
    title: "Colleges, classes, students",
    text: "Organise every college as a folder, every subject as a class file, with student rolls inside.",
  },
  {
    icon: CalendarCheck2,
    title: "One-tap daily marking",
    text: "Pick a date, tap present or absent per student, and save the whole class at once.",
  },
  {
    icon: PieChart,
    title: "Monthly percentages",
    text: "Instant per-student totals and percentages, with holidays excluded automatically.",
  },
  {
    icon: FileSpreadsheet,
    title: "Export anytime",
    text: "Download a full attendance sheet as a spreadsheet for records and audits.",
  },
];

function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-sm font-bold">
            AM
          </span>
          <span className="font-display font-semibold">Attendance Manager</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="surface-grid border-y border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <p className="mx-auto w-fit rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            For teachers and departments
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            Daily attendance, finished before the bell.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Keep every college, class and student in one place. Mark the register in
            seconds and see accurate monthly percentages without a single spreadsheet
            formula.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Create your account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">I already have one</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                <f.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        Smart Attendance Manager
      </footer>
    </div>
  );
}
