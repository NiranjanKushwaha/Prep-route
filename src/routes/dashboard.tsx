import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Eye, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { testService } from "@/services/test.service";
import { ROUTES } from "@/constants/routes.constant";
import type { Test } from "@/interfaces/test.interface";
import { ApiError } from "@/services/rest.service";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PrepRoute" },
      { name: "description", content: "Manage every test you've built in PrepRoute." },
    ],
  }),
  component: DashboardPage,
});

function subjectLabel(t: Test): string {
  if (typeof t.subject === "string") return t.subject_name || t.subject;
  if (t.subject && typeof t.subject === "object") return t.subject.name;
  return t.subject_name || "—";
}

function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<Test | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["tests"],
    queryFn: () => testService.list().then((r) => r.data ?? []),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => testService.remove(id),
    onSuccess: () => {
      toast.success("Test deleted");
      qc.invalidateQueries({ queryKey: ["tests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tests = (data ?? []).filter((t) =>
    query ? (t.name || "").toLowerCase().includes(query.toLowerCase()) : true,
  );

  const stats = {
    total: data?.length ?? 0,
    live: (data ?? []).filter((t) => t.status === "live").length,
    draft: (data ?? []).filter((t) => t.status !== "live").length,
  };

  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Failed to load tests.";

  return (
    <AppLayout>
      {/* Fill the shell; only the table body scrolls so Sign out stays visible. */}
      <div className="flex h-full min-h-0 flex-col gap-6">
        <div className="flex shrink-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">All tests you've created.</p>
          </div>
          <Button onClick={() => navigate({ to: ROUTES.CREATE_TEST })} className="gap-2">
            <Plus className="h-4 w-4" /> Create New Test
          </Button>
        </div>

        <div className="grid shrink-0 gap-4 md:grid-cols-3">
          <StatCard label="Total tests" value={stats.total} />
          <StatCard label="Published" value={stats.live} accent />
          <StatCard label="Drafts" value={stats.draft} />
        </div>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardHeader className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              Tests
              {isFetching && !isLoading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tests…"
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pt-0">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading tests…
              </div>
            ) : isError ? (
              <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-destructive">{errorMessage}</p>
                <Button variant="outline" onClick={() => refetch()} className="mt-3">
                  Retry
                </Button>
              </div>
            ) : tests.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">No tests found.</p>
                <Button className="mt-4 gap-2" onClick={() => navigate({ to: ROUTES.CREATE_TEST })}>
                  <Plus className="h-4 w-4" /> Create your first test
                </Button>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-[1] bg-card">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name || "Untitled"}</TableCell>
                        <TableCell className="text-muted-foreground">{subjectLabel(t)}</TableCell>
                        <TableCell>{t.total_questions ?? "—"}</TableCell>
                        <TableCell>{t.total_time ? `${t.total_time} min` : "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={String(t.status ?? "draft")} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" asChild>
                              <Link to={ROUTES.PREVIEW_TEST(t.id)} aria-label="View">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button size="icon" variant="ghost" asChild>
                              <Link to={ROUTES.EDIT_TEST(t.id)} aria-label="Edit">
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setToDelete(t)}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this test?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.name}" and its data will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toDelete?.id) deleteMut.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-2 text-3xl font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live")
    return (
      <Badge className="rounded-full bg-success/20 text-success-foreground hover:bg-success/20 border-transparent">
        Live
      </Badge>
    );
  return (
    <Badge variant="secondary" className="rounded-full">
      Draft
    </Badge>
  );
}
