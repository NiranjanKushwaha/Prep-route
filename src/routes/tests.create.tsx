import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { TestForm } from "@/components/tests/TestForm";
import { testService } from "@/services/test.service";
import { ROUTES } from "@/constants/routes.constant";
import type { CreateTestPayload } from "@/interfaces/test.interface";

export const Route = createFileRoute("/tests/create")({
  head: () => ({
    meta: [
      { title: "Create Test — PrepRoute" },
      { name: "description", content: "Configure a new test." },
    ],
  }),
  component: CreateTestPage,
});

function CreateTestPage() {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: (payload: CreateTestPayload) => testService.create(payload),
    onSuccess: (res) => {
      toast.success("Test created");
      navigate({ to: ROUTES.ADD_QUESTIONS(res.data.id) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <Breadcrumbs
        items={[
          { label: "Test Creation", to: ROUTES.DASHBOARD },
          { label: "Create Test" },
          { label: "Chapter Wise" },
        ]}
      />
      <Card>
        <CardContent className="pt-6">
          <TestForm
            submitLabel="Next"
            submitting={mutation.isPending}
            onSubmit={(values) => mutation.mutateAsync(values)}
            onCancel={() => navigate({ to: ROUTES.DASHBOARD })}
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
}
