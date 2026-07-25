import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { TestForm, type TestFormValues } from "@/components/tests/TestForm";
import { testService } from "@/services/test.service";
import { ROUTES } from "@/constants/routes.constant";
import type { CreateTestPayload, Test } from "@/interfaces/test.interface";

export const Route = createFileRoute("/tests/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Test — PrepRoute" },
      { name: "description", content: "Update your test details." },
    ],
  }),
  component: EditTestPage,
});

function normalize(test: Test): Partial<TestFormValues> {
  const subject =
    typeof test.subject === "object" && test.subject
      ? test.subject.id
      : (test.subject as string) || "";
  const topics = Array.isArray(test.topics)
    ? (test.topics as unknown[]).map((t) =>
        typeof t === "string" ? t : ((t as { id: string }).id ?? ""),
      )
    : [];
  const sub_topics = Array.isArray(test.sub_topics)
    ? (test.sub_topics as unknown[]).map((t) =>
        typeof t === "string" ? t : ((t as { id: string }).id ?? ""),
      )
    : [];
  return {
    name: test.name ?? "",
    type: (test.type as string) ?? "chapterwise",
    subject,
    topics,
    sub_topics,
    difficulty: (test.difficulty as TestFormValues["difficulty"]) ?? "easy",
    total_time: test.total_time ?? 60,
    total_questions: test.total_questions ?? 50,
    total_marks: test.total_marks ?? 250,
    correct_marks: test.correct_marks ?? 5,
    wrong_marks: test.wrong_marks ?? -1,
    unattempt_marks: test.unattempt_marks ?? 0,
  };
}

function EditTestPage() {
  const { id } = useParams({ from: "/tests/$id/edit" });
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["test", id],
    queryFn: () => testService.getById(id).then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateTestPayload) => testService.update(id, payload),
    onSuccess: () => {
      toast.success("Test updated");
      navigate({ to: ROUTES.ADD_QUESTIONS(id) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <Breadcrumbs
        items={[{ label: "Test Creation", to: ROUTES.DASHBOARD }, { label: "Edit Test" }]}
      />
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading test…
            </div>
          ) : isError || !data ? (
            <p className="py-8 text-center text-sm text-destructive">Failed to load test.</p>
          ) : (
            <TestForm
              initial={normalize(data)}
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
