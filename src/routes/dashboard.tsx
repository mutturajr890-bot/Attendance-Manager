import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your colleges — Smart Attendance Manager" },
      {
        name: "description",
        content: "All the colleges you teach at, each holding its own class files.",
      },
      { property: "og:title", content: "Your colleges — Smart Attendance Manager" },
      {
        property: "og:description",
        content: "Open a college to see its classes and attendance records.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

function Dashboard() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [year, setYear] = useState("");

  const { data: colleges = [], isLoading } = useQuery({
    queryKey: ["colleges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colleges")
        .select("id, name, academic_year, created_at, classes(count)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("colleges")
        .insert({
          name: name.trim(),
          academic_year: year.trim(),
          user_id: auth.user!.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setYear("");
      setOpen(false);
      toast.success("College added");
      qc.invalidateQueries({ queryKey: ["colleges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("colleges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("College removed");
      qc.invalidateQueries({ queryKey: ["colleges"] });
    },
  });

  return (
    <AppShell
      title="Your colleges"
      subtitle="Each college is a folder holding its class and subject files."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="size-4" /> New college
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a college</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="college-name">College name</Label>
              <Input
                id="college-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Govt. Engineering College"
              />
            </div>
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="college-year">Academic year</Label>
              <Input
                id="college-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2025-26"
              />
              <p className="text-xs text-muted-foreground">
                Each year is kept separate, so attendance never mixes between years.
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={() => add.mutate()}
                disabled={!name.trim() || !year.trim() || add.isPending}
              >
                Add college
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : colleges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <h2 className="text-lg font-semibold">No colleges yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Add your first college to start creating class files and marking
            attendance.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {colleges.map((c) => (
            <div
              key={c.id}
              className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <Link
                to="/college/$collegeId"
                params={{ collegeId: c.id }}
                className="block"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                  <FolderOpen className="size-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">{c.name}</h2>
                {c.academic_year ? (
                  <p className="mt-0.5 text-xs font-medium text-primary">
                    {c.academic_year}
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-muted-foreground">
                  {(c.classes as unknown as { count: number }[])?.[0]?.count ?? 0} class
                  files
                </p>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${c.name}`}
                className="absolute right-3 top-3 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm(`Delete "${c.name}" and everything inside it?`))
                    remove.mutate(c.id);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
