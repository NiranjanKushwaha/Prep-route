import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { TestForm, type TestFormValues } from "@/components/tests/TestForm";
import { subjectService } from "@/services/subject.service";
import { testService } from "@/services/test.service";
import { ROUTES } from "@/constants/routes.constant";
import type { CreateTestPayload } from "@/interfaces/test.interface";

export const Route = createFileRoute("/tests/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Test — PrepRoute" },
      { name: "description", content: "Update your test details." },
    ],
  }),
  component: EditTestPage,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Pull a raw id-or-name string from either a plain string or `{ id, name }` object. */
function rawRef(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const obj = value as { id?: string; name?: string };
    if (obj.id) return obj.id;
    if (obj.name) return obj.name;
  }
  return "";
}

/** Resolve an API name or UUID against a `{ id, name }[]` catalog. */
function resolveId(ref: string, catalog: { id: string; name: string }[]): string {
  if (!ref) return "";
  if (UUID_RE.test(ref)) return ref;
  return catalog.find((item) => item.name === ref)?.id ?? "";
}

function EditTestPage() {
  const { id } = useParams({ from: "/tests/$id/edit" });
  const navigate = useNavigate();

  const testQuery = useQuery({
    queryKey: ["test", id],
    queryFn: () => testService.getById(id).then((r) => r.data),
  });

  const subjectsQuery = useQuery({
    queryKey: ["subjects"],
    queryFn: () => subjectService.list().then((r) => r.data),
  });

  const test = testQuery.data;

  const subjectId = useMemo(() => {
    if (!test) return "";
    return resolveId(rawRef(test.subject), subjectsQuery.data ?? []);
  }, [test, subjectsQuery.data]);

  const topicsQuery = useQuery({
    queryKey: ["topics", subjectId],
    queryFn: () => subjectService.topicsBySubject(subjectId).then((r) => r.data),
    enabled: !!subjectId,
  });

  const topicIds = useMemo(() => {
    if (!test) return [] as string[];
    const catalog = topicsQuery.data ?? [];
    return asList(test.topics)
      .map((t) => resolveId(rawRef(t), catalog))
      .filter(Boolean);
  }, [test, topicsQuery.data]);

  const subTopicsQuery = useQuery({
    queryKey: ["sub-topics", topicIds],
    queryFn: () => subjectService.subTopicsByTopics(topicIds).then((r) => r.data),
    enabled: topicIds.length > 0,
  });

  const initial = useMemo((): Partial<TestFormValues> | null => {
    if (!test || !subjectId) return null;
    // Wait until topic catalog is ready when the test has topics, so we never
    // hydrate names into ID fields.
    if (asList(test.topics).length > 0 && topicsQuery.isLoading) return null;
    if (topicIds.length > 0 && subTopicsQuery.isLoading) return null;

    const subCatalog = subTopicsQuery.data ?? [];
    return {
      name: test.name ?? "",
      type: (test.type as string) ?? "chapterwise",
      subject: subjectId,
      topics: topicIds,
      sub_topics: asList(test.sub_topics)
        .map((t) => resolveId(rawRef(t), subCatalog))
        .filter(Boolean),
      difficulty: (test.difficulty as TestFormValues["difficulty"]) ?? "easy",
      total_time: test.total_time ?? 60,
      total_questions: test.total_questions ?? 50,
      total_marks: test.total_marks ?? 250,
      correct_marks: test.correct_marks ?? 5,
      wrong_marks: test.wrong_marks ?? -1,
      unattempt_marks: test.unattempt_marks ?? 0,
    };
  }, [
    test,
    subjectId,
    topicIds,
    topicsQuery.isLoading,
    subTopicsQuery.isLoading,
    subTopicsQuery.data,
  ]);

  const existingStatus = typeof test?.status === "string" && test.status ? test.status : "draft";

  const mutation = useMutation({
    mutationFn: (payload: CreateTestPayload) => testService.update(id, payload),
    onSuccess: () => {
      toast.success("Test updated");
      navigate({ to: ROUTES.ADD_QUESTIONS(id) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loading =
    testQuery.isLoading ||
    subjectsQuery.isLoading ||
    (!!subjectId && topicsQuery.isLoading) ||
    (topicIds.length > 0 && subTopicsQuery.isLoading) ||
    !initial;

  return (
    <AppLayout>
      <Breadcrumbs
        items={[{ label: "Test Creation", to: ROUTES.DASHBOARD }, { label: "Edit Test" }]}
      />
      <Card>
        <CardContent className="pt-6">
          {testQuery.isError || (!testQuery.isLoading && !test) ? (
            <p className="py-8 text-center text-sm text-destructive">Failed to load test.</p>
          ) : loading || !initial ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading test…
            </div>
          ) : (
            <TestForm
              initial={initial}
              status={existingStatus}
              submitLabel="Save"
              submitting={mutation.isPending}
              onSubmit={(values) => mutation.mutateAsync(values)}
              onCancel={() => navigate({ to: ROUTES.DASHBOARD })}
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
