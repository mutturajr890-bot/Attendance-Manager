import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Layers, Plus, Trash2 } from "lucide-react";
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

export const Route = createFileRoute("/college/$collegeId")({
  head: () => ({
    meta: [
      { title: "Years & branches — Smart Attendance Manager" },
      {
        name: "description",
        content:
          "Set the present year and create branches, then add students once for every subject.",
      },
      { property: "og:title", content: "Years & branches — Smart Attendance Manager" },
      {
        property: "og:description",
        content: "Open a branch to add students and create its subjects.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CollegePage />
    </RequireAuth>
  ),
});

const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

function CollegePage() {
  const { collegeId } = Route.useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [year, setYear] = useState(years[0]!);

  const { data: college } = useQuery({
    queryKey: ["college", collegeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colleges")
        .select("id, name")
        .eq("id", collegeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches", collegeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*, students(count), classes(count)")
        .eq("college_id", collegeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("branches").insert({
        name: name.trim(),
        year_label: year,
        college_id: collegeId,
        user_id: auth.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setOpen(false);
      toast.success("Branch created");
      qc.invalidateQueries({ queryKey: ["branches", collegeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branch removed");
      qc.invalidateQueries({ queryKey: ["branches", collegeId] });
    },
  });

  const count = (v: unknown) => (v as { count: number }[])?.[0]?.count ?? 0;

  return (
    <AppShell
      title={college?.name ?? "College"}
      subtitle="Pick a year, create a branch, then add its students once."
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard">Back</Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> New branch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create a branch</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Present year</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setYear(y)}
                        className={
                          "rounded-xl border px-3 py-2 text-sm font-medium transition-colors " +
                          (year === y
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground")
                        }
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="branch-name">Branch name</Label>
                  <Input
                    id="branch-name"
                    value={name}
                    placeholder="e.g. Computer Science A"
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  className="w-full"
                  onClick={() => add.mutate()}
                  disabled={!name.trim() || add.isPending}
                >
                  Create branch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : branches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <h2 className="text-base font-semibold">No branches yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a branch for the present year to add students and subjects.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((b) => (
            <div
              key={b.id}
              className="relative rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <Link to="/branch/$branchId" params={{ branchId: b.id }} className="block pr-10">
                <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                  <Layers className="size-5" />
                </span>
                <h2 className="mt-3 text-base font-semibold">{b.name}</h2>
                <p className="text-xs text-muted-foreground">{b.year_label}</p>
                <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {count(b.students)} students · {count(b.classes)} subjects
                </p>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${b.name}`}
                className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm(`Delete "${b.name}" and its students and subjects?`))
                    remove.mutate(b.id);
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
