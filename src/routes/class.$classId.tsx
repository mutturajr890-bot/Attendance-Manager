import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Info, Pencil, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/class/$classId")({
  head: () => ({
    meta: [
      { title: "Mark attendance — Smart Attendance Manager" },
      {
        name: "description",
        content:
          "Tap one button per student to mark present or absent, view the full course schedule and download the register.",
      },
      { property: "og:title", content: "Mark attendance — Smart Attendance Manager" },
      {
        property: "og:description",
        content: "Daily register, schedule view and monthly percentages.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ClassPage />
    </RequireAuth>
  ),
});

const iso = (d: Date) => {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return t.toISOString().slice(0, 10);
};

function ClassPage() {
  const { classId } = Route.useParams();
  const qc = useQueryClient();
  const [date, setDate] = useState(iso(new Date()));
  const [marks, setMarks] = useState<Record<string, "present" | "absent">>({});
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingDates, setEditingDates] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState(false);
  const [editName, setEditName] = useState("");
  const [editReg, setEditReg] = useState("");

  const { data: klass } = useQuery({
    queryKey: ["class", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["class-students", klass?.branch_id],
    enabled: !!klass?.branch_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("branch_id", klass!.branch_id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: records = [] } = useQuery({
    queryKey: ["attendance", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("student_id, att_date, status")
        .eq("class_id", classId);
      if (error) throw error;
      return data;
    },
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays")
        .select("holiday_date, reason")
        .order("holiday_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const holidaySet = useMemo(
    () => new Set(holidays.map((h) => h.holiday_date)),
    [holidays],
  );

  useEffect(() => {
    const forDate: Record<string, "present" | "absent"> = {};
    for (const s of students) forDate[s.id] = "absent";
    for (const r of records) {
      if (r.att_date === date) forDate[r.student_id] = r.status as "present" | "absent";
    }
    setMarks(forDate);
  }, [date, students, records]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const rows = students.map((s) => ({
        user_id: auth.user!.id,
        class_id: classId,
        student_id: s.id,
        att_date: date,
        status: marks[s.id] ?? "absent",
      }));
      const { error } = await supabase
        .from("attendance")
        .upsert(rows, { onConflict: "class_id,student_id,att_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attendance saved");
      qc.invalidateQueries({ queryKey: ["attendance", classId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveDates = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("classes")
        .update({ term_start: startDate || null, term_end: endDate || null })
        .eq("id", classId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Schedule updated");
      setEditingDates(false);
      qc.invalidateQueries({ queryKey: ["class", classId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markedDates = useMemo(() => {
    const set = new Set(records.map((r) => r.att_date));
    return [...set].filter((d) => !holidaySet.has(d)).sort();
  }, [records, holidaySet]);

  /** Every college working day between the subject's start and end dates. */
  const scheduleDays = useMemo(() => {
    if (!klass?.term_start || !klass?.term_end) return markedDates;
    const out: string[] = [];
    const cur = new Date(`${klass.term_start}T00:00:00`);
    const end = new Date(`${klass.term_end}T00:00:00`);
    let guard = 0;
    while (cur <= end && guard < 800) {
      out.push(iso(cur));
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
    return out;
  }, [klass, markedDates]);

  /** Schedule table filtered down to a single searched date, if any. */
  const visibleScheduleDays = useMemo(() => {
    if (!scheduleSearch) return scheduleDays;
    return scheduleDays.filter((d) => d === scheduleSearch);
  }, [scheduleDays, scheduleSearch]);

  const monthlyRows = useMemo(() => {
    const days = markedDates.filter((d) => d.startsWith(month));
    return students.map((s) => {
      const present = records.filter(
        (r) =>
          r.student_id === s.id && r.status === "present" && days.includes(r.att_date),
      ).length;
      const pct = days.length ? Math.round((present / days.length) * 1000) / 10 : 0;
      return { student: s, present, total: days.length, pct };
    });
  }, [students, records, markedDates, month]);

  const detail = useMemo(() => {
    const student = students.find((s) => s.id === detailId);
    if (!student) return null;
    const mine = records.filter(
      (r) => r.student_id === student.id && markedDates.includes(r.att_date),
    );
    const present = mine.filter((r) => r.status === "present").length;
    const total = markedDates.length;
    const pct = total ? Math.round((present / total) * 1000) / 10 : 0;
    return { student, present, absent: total - present, total, pct };
  }, [detailId, students, records, markedDates]);

  useEffect(() => {
    const student = students.find((s) => s.id === detailId);
    if (student) {
      setEditingStudent(false);
      setEditName(student.name);
      setEditReg(student.register_number);
    }
  }, [detailId, students]);

  const updateStudent = useMutation({
    mutationFn: async () => {
      if (!detailId) return;
      const { error } = await supabase
        .from("students")
        .update({ name: editName.trim(), register_number: editReg.trim() })
        .eq("id", detailId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student details updated");
      setEditingStudent(false);
      qc.invalidateQueries({ queryKey: ["class-students", klass?.branch_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function statusFor(studentId: string, day: string) {
    if (holidaySet.has(day)) return "holiday";
    const r = records.find((x) => x.student_id === studentId && x.att_date === day);
    return r ? r.status : "—";
  }

  function download() {
    const header = ["Register No", "Name", ...markedDates, "Present", "Total", "%"];
    const rows = students.map((s) => {
      const cells = markedDates.map((d) => {
        const r = records.find((x) => x.student_id === s.id && x.att_date === d);
        return r?.status === "present" ? "P" : r ? "A" : "";
      });
      const present = cells.filter((c) => c === "P").length;
      const pct = markedDates.length
        ? Number(((present / markedDates.length) * 100).toFixed(1))
        : 0;
      return [s.register_number, s.name, ...cells, present, markedDates.length, pct];
    });
    const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Attendance");
    XLSX.writeFile(
      book,
      `${klass?.subject_name ?? "attendance"}-register.xlsx`.replace(/\s+/g, "-"),
    );
  }

  const presentCount = Object.values(marks).filter((m) => m === "present").length;

  return (
    <AppShell
      title={klass?.subject_name ?? "Subject"}
      subtitle={
        klass
          ? `${klass.class_name}${klass.subject_code ? ` · ${klass.subject_code}` : ""}`
          : undefined
      }
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link to="/branch/$branchId" params={{ branchId: klass?.branch_id ?? "" }}>
              Back
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={download}>
            <Download className="size-4" /> Download
          </Button>
        </>
      }
    >
      <Tabs defaultValue="mark">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mark">Mark</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="monthly">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="mt-5">
          <div className="mb-4 space-y-3 rounded-2xl border border-border bg-card p-4">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {presentCount} of {students.length} present
              {holidaySet.has(date) ? " · this date is a holiday" : ""}
            </p>
          </div>

          {students.length === 0 ? (
            <EmptyStudents branchId={klass?.branch_id} />
          ) : (
            <ul className="space-y-2">
              {students.map((s) => {
                const present = (marks[s.id] ?? "absent") === "present";
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Student details"
                      className="shrink-0 rounded-full bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15 transition-all hover:scale-105 hover:bg-primary hover:text-primary-foreground hover:shadow-md active:scale-95"
                      onClick={() => setDetailId(s.id)}
                    >
                      <Info className="size-4" />
                    </Button>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.register_number}</p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={present}
                      onClick={() =>
                        setMarks((m) => ({ ...m, [s.id]: present ? "absent" : "present" }))
                      }
                      className={cn(
                        "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                        present
                          ? "bg-success/15 text-success"
                          : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {present ? "Present" : "Absent"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {students.length > 0 && (
            <Button
              className="mt-4 w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
              Save attendance
            </Button>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="mt-5 space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            {editingDates ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ts">Course starts</Label>
                  <Input
                    id="ts"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="te">Course ends</Label>
                  <Input
                    id="te"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => saveDates.mutate()}
                    disabled={saveDates.isPending}
                  >
                    {saveDates.isPending ? "Saving…" : "Save schedule"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingDates(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {klass?.term_start && klass?.term_end
                      ? `Course runs ${klass.term_start} → ${klass.term_end}.`
                      : "No course dates set for this subject, showing the days you marked."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setStartDate(klass?.term_start ?? "");
                      setEndDate(klass?.term_end ?? "");
                      setEditingDates(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="mt-3 w-full gap-1.5"
                  onClick={download}
                >
                  <Download className="size-4" /> Download register
                </Button>
              </>
            )}
          </div>

          {students.length === 0 ? (
            <EmptyStudents branchId={klass?.branch_id} />
          ) : (
            <>
              <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="schedule-search">Search a date</Label>
                  <Input
                    id="schedule-search"
                    type="date"
                    value={scheduleSearch}
                    onChange={(e) => setScheduleSearch(e.target.value)}
                  />
                </div>
                {scheduleSearch ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setScheduleSearch("")}
                  >
                    Clear
                  </Button>
                ) : (
                  <Button type="button" variant="outline" disabled className="gap-1.5">
                    <Search className="size-4" /> Search
                  </Button>
                )}
              </div>

              {visibleScheduleDays.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  No class was scheduled on that date.
                </div>
              ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-xs">
                <thead className="bg-secondary/60 text-left">
                  <tr>
                    <th className="sticky left-0 bg-secondary/60 px-3 py-2 font-semibold">
                      Student
                    </th>
                    {visibleScheduleDays.map((d) => (
                      <th key={d} className="whitespace-nowrap px-2 py-2 font-semibold">
                        {d.slice(5)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="sticky left-0 whitespace-nowrap bg-card px-3 py-2 font-medium">
                      {s.name}
                    </td>
                      {visibleScheduleDays.map((d) => {
                        const st = statusFor(s.id, d);
                        return (
                          <td key={d} className="px-2 py-2 text-center">
                            <span
                              className={cn(
                                "font-semibold",
                                st === "present" && "text-success",
                                st === "absent" && "text-destructive",
                                st === "holiday" && "text-muted-foreground",
                              )}
                            >
                              {st === "present"
                                ? "P"
                                : st === "absent"
                                  ? "A"
                                  : st === "holiday"
                                    ? "H"
                                    : "—"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {monthlyRows.map((r) => (
              <li key={r.student.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.present} of {r.total} days
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-semibold",
                    r.pct >= 75
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive",
                  )}
                >
                  {r.pct}%
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Days marked as holidays are excluded from these totals.
          </p>
        </TabsContent>
      </Tabs>

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-[22rem] rounded-2xl">
          <DialogHeader className="flex flex-row items-center justify-between gap-2">
            <DialogTitle className="text-left">
              {editingStudent ? "Edit student" : (detail?.student.name ?? "Student")}
            </DialogTitle>
            {!editingStudent && detail ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Edit name and register number"
                className="shrink-0"
                onClick={() => {
                  setEditingStudent(true);
                  setEditName(detail.student.name);
                  setEditReg(detail.student.register_number);
                }}
              >
                <Pencil className="size-4" />
              </Button>
            ) : null}
          </DialogHeader>
          {detail ? (
            <div className="space-y-3">
              {editingStudent ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-reg">Register number</Label>
                    <Input
                      id="edit-reg"
                      value={editReg}
                      onChange={(e) => setEditReg(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => updateStudent.mutate()}
                      disabled={updateStudent.isPending || !editName.trim() || !editReg.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setEditingStudent(false);
                        setEditName(detail.student.name);
                        setEditReg(detail.student.register_number);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Roll / register no: {detail.student.register_number}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Classes held" value={String(detail.total)} />
                <Stat label="Present" value={String(detail.present)} />
                <Stat label="Absent" value={String(detail.absent)} />
                <Stat label="Attendance" value={`${detail.pct}%`} />
              </div>
              <p
                className={cn(
                  "rounded-xl px-3 py-2 text-center text-xs font-semibold",
                  detail.pct >= 75
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive",
                )}
              >
                {detail.pct >= 75 ? "Above 75% requirement" : "Below 75% requirement"}
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function EmptyStudents({ branchId }: { branchId?: string | undefined }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <h2 className="text-base font-semibold">No students yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Add students to this branch — they apply to all of its subjects.
      </p>
      {branchId ? (
        <Button asChild variant="outline" className="mt-4">
          <Link to="/branch/$branchId" params={{ branchId }}>
            Add students
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}