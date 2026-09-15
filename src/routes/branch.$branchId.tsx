import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { parseStudentFile } from "@/lib/student-import";

export const Route = createFileRoute("/branch/$branchId")({
  head: () => ({
    meta: [
      { title: "Branch students & subjects — Smart Attendance Manager" },
      {
        name: "description",
        content:
          "Add students by hand or from an Excel sheet, then create subjects that all share the same students.",
      },
      {
        property: "og:title",
        content: "Branch students & subjects — Smart Attendance Manager",
      },
      {
        property: "og:description",
        content: "One student list, every subject of the branch.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <BranchPage />
    </RequireAuth>
  ),
});

const emptySubject = {
  subject_name: "",
  subject_code: "",
  term_start: "",
  term_end: "",
};

function BranchPage() {
  const { branchId } = Route.useParams();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [studentOpen, setStudentOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", register_number: "" });
  const [subject, setSubject] = useState(emptySubject);

  const { data: branch } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("id", branchId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("branch_id", branchId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addStudent = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("students").insert({
        ...newStudent,
        branch_id: branchId,
        user_id: auth.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewStudent({ name: "", register_number: "" });
      setStudentOpen(false);
      toast.success("Student added");
      qc.invalidateQueries({ queryKey: ["students", branchId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importStudents = useMutation({
    mutationFn: async (file: File) => {
      const rows = await parseStudentFile(file);
      if (!rows.length) throw new Error("No students found in that file");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("students").insert(
        rows.map((r) => ({
          name: r.name,
          register_number: r.register_number,
          branch_id: branchId,
          user_id: auth.user!.id,
        })),
      );
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} students added from the sheet`);
      qc.invalidateQueries({ queryKey: ["students", branchId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeStudent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students", branchId] });
    },
  });

  const addSubject = useMutation({
    mutationFn: async () => {
      if (!branch) throw new Error("Branch not loaded");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("classes").insert({
        class_name: branch.name,
        subject_name: subject.subject_name.trim(),
        subject_code: subject.subject_code.trim() || null,
        semester_label: branch.year_label,
        term_start: subject.term_start || null,
        term_end: subject.term_end || null,
        branch_id: branchId,
        college_id: branch.college_id,
        user_id: auth.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubject(emptySubject);
      setSubjectOpen(false);
      toast.success("Subject created");
      qc.invalidateQueries({ queryKey: ["subjects", branchId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSubject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects", branchId] });
    },
  });

  return (
    <AppShell
      title={branch?.name ?? "Branch"}
      subtitle={
        branch
          ? `${branch.year_label} · ${students.length} students shared by every subject`
          : undefined
      }
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/college/$collegeId" params={{ collegeId: branch?.college_id ?? "" }}>
            Back
          </Link>
        </Button>
      }
    >
      <Tabs defaultValue="subjects">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="mt-5 space-y-3">
          <Dialog open={subjectOpen} onOpenChange={setSubjectOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-1.5">
                <Plus className="size-4" /> New subject
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create a subject</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sub-name">Subject name</Label>
                  <Input
                    id="sub-name"
                    value={subject.subject_name}
                    placeholder="Data Structures"
                    onChange={(e) =>
                      setSubject({ ...subject, subject_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-code">Subject code</Label>
                  <Input
                    id="sub-code"
                    value={subject.subject_code}
                    placeholder="CS301"
                    onChange={(e) =>
                      setSubject({ ...subject, subject_code: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-start">Course starts</Label>
                    <Input
                      id="sub-start"
                      type="date"
                      value={subject.term_start}
                      onChange={(e) =>
                        setSubject({ ...subject, term_start: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-end">Course ends</Label>
                    <Input
                      id="sub-end"
                      type="date"
                      value={subject.term_end}
                      onChange={(e) => setSubject({ ...subject, term_end: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  These are the college start and end dates for this subject.
                </p>
              </div>
              <DialogFooter>
                <Button
                  className="w-full"
                  onClick={() => addSubject.mutate()}
                  disabled={!subject.subject_name.trim() || addSubject.isPending}
                >
                  Create subject
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {subjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <h2 className="text-base font-semibold">No subjects yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Every subject you create uses this branch's student list.
              </p>
            </div>
          ) : (
            subjects.map((s) => (
              <div
                key={s.id}
                className="relative rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <Link to="/class/$classId" params={{ classId: s.id }} className="block pr-10">
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                    <BookOpen className="size-5" />
                  </span>
                  <h2 className="mt-3 text-base font-semibold">{s.subject_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {s.subject_code ? `${s.subject_code} · ` : ""}
                    {students.length} students
                  </p>
                  {s.term_start && s.term_end ? (
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {s.term_start} → {s.term_end}
                    </p>
                  ) : null}
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${s.subject_name}`}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete "${s.subject_name}" and its attendance?`))
                      removeSubject.mutate(s.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="students" className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Dialog open={studentOpen} onOpenChange={setStudentOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5">
                  <Plus className="size-4" /> Add one
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add a student</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="st-name">Name</Label>
                    <Input
                      id="st-name"
                      value={newStudent.name}
                      onChange={(e) =>
                        setNewStudent({ ...newStudent, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="st-reg">Register number</Label>
                    <Input
                      id="st-reg"
                      value={newStudent.register_number}
                      onChange={(e) =>
                        setNewStudent({ ...newStudent, register_number: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    className="w-full"
                    onClick={() => addStudent.mutate()}
                    disabled={
                      !newStudent.name.trim() ||
                      !newStudent.register_number.trim() ||
                      addStudent.isPending
                    }
                  >
                    Add student
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              className="gap-1.5"
              disabled={importStudents.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" /> Excel sheet
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importStudents.mutate(f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The sheet should have a column for the register number and one for the name.
          </p>

          {students.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <h2 className="text-base font-semibold">No students yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add them one by one or upload your class sheet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {students.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.register_number}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${s.name}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Remove ${s.name}?`)) removeStudent.mutate(s.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
