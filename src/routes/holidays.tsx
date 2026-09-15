import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/holidays")({
  head: () => ({
    meta: [
      { title: "Holidays — Smart Attendance Manager" },
      {
        name: "description",
        content:
          "Mark college and government holidays so they are excluded from attendance percentages.",
      },
      { property: "og:title", content: "Holidays — Smart Attendance Manager" },
      {
        property: "og:description",
        content: "Holidays are automatically skipped in every attendance calculation.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <HolidaysPage />
    </RequireAuth>
  ),
});

function HolidaysPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .order("holiday_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("holidays")
        .insert({ holiday_date: date, reason, user_id: auth.user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setDate("");
      setReason("");
      toast.success("Holiday added");
      qc.invalidateQueries({ queryKey: ["holidays"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("holidays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Holiday removed");
      qc.invalidateQueries({ queryKey: ["holidays"] });
    },
  });

  return (
    <AppShell
      title="Holidays"
      subtitle="These dates are left out of every attendance percentage."
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="h-fit rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Add a holiday</h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="h-date">Date</Label>
              <Input
                id="h-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="h-reason">Reason</Label>
              <Input
                id="h-reason"
                value={reason}
                placeholder="e.g. Independence Day"
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => add.mutate()}
              disabled={!date || add.isPending}
            >
              Add holiday
            </Button>
          </div>
        </div>

        {holidays.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <h2 className="text-lg font-semibold">No holidays marked</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Anything you add here is skipped when percentages are calculated.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">
                    {new Date(`${h.holiday_date}T00:00:00`).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">{h.reason || "Holiday"}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove holiday"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate(h.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
