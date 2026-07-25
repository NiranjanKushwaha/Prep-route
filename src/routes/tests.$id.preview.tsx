import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { QuestionSidebar } from "@/components/layout/QuestionSidebar";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { LIVE_UNTIL_OPTIONS } from "@/constants/common.constant";
import { ROUTES } from "@/constants/routes.constant";
import type { Test, UpdateTestPayload } from "@/interfaces/test.interface";
import { questionService } from "@/services/question.service";
import { testService } from "@/services/test.service";

export const Route = createFileRoute("/tests/$id/preview")({
  head: () => ({
    meta: [
      { title: "Preview & Publish — PrepRoute" },
      { name: "description", content: "Review your test before publishing." },
    ],
  }),
  component: PreviewPage,
});

function subjectLabel(t?: Test): string {
  if (!t) return "";
  if (typeof t.subject === "string") return t.subject_name || t.subject;
  if (t.subject && typeof t.subject === "object") return t.subject.name;
  return "";
}

function addDuration(from: Date, liveUntil: string): Date | null {
  const d = new Date(from);
  switch (liveUntil) {
    case "1w":
      d.setDate(d.getDate() + 7);
      return d;
    case "2w":
      d.setDate(d.getDate() + 14);
      return d;
    case "3w":
      d.setDate(d.getDate() + 21);
      return d;
    case "1m":
      d.setMonth(d.getMonth() + 1);
      return d;
    default:
      return null;
  }
}

function combineLocalDateTime(date: string, time: string): string | null {
  if (!date) return null;
  const isoLocal = `${date}T${time || "00:00"}:00`;
  const parsed = new Date(isoLocal);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function PreviewPage() {
  const { id } = useParams({ from: "/tests/$id/preview" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [liveUntil, setLiveUntil] = useState("always");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59");

  const testQuery = useQuery({
    queryKey: ["test", id],
    queryFn: () => testService.getById(id).then((r) => r.data),
  });

  const test = testQuery.data;
  const questionIds = (test?.questions ?? []).filter((q): q is string => typeof q === "string");

  const questionsQuery = useQuery({
    queryKey: ["questions", questionIds],
    queryFn: () => questionService.fetchBulk(questionIds).then((r) => r.data),
    enabled: questionIds.length > 0,
  });

  const publishMut = useMutation({
    mutationFn: () => {
      const payload: UpdateTestPayload = { status: "live" };
      let base = new Date();

      if (mode === "schedule") {
        if (!scheduleDate) throw new Error("Select a publish date.");
        const scheduled = combineLocalDateTime(scheduleDate, scheduleTime);
        if (!scheduled) throw new Error("Invalid publish date/time.");
        payload.scheduled_date = scheduled;
        base = new Date(scheduled);
      }

      if (liveUntil === "custom") {
        const expiry = combineLocalDateTime(endDate, endTime);
        if (!expiry) throw new Error("Select an end date for custom duration.");
        payload.expiry_date = expiry;
      } else if (liveUntil !== "always") {
        const expiry = addDuration(base, liveUntil);
        if (expiry) payload.expiry_date = expiry.toISOString();
      }
      // "always" / publish-now: omit scheduled_date & expiry_date entirely —
      // the API rejects null with "must be a valid ISO 8601 date".

      return testService.publish(id, payload);
    },
    onSuccess: () => {
      toast.success(mode === "schedule" ? "Test scheduled!" : "Test published!");
      navigate({ to: ROUTES.DASHBOARD });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scrollToQuestion = (i: number) => {
    document
      .getElementById(`preview-q-${i}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <AppLayout
      sidebar={
        <QuestionSidebar
          testId={id}
          total={questionIds.length}
          doneCount={questionIds.length}
          onSelect={scrollToQuestion}
        />
      }
    >
      <Breadcrumbs
        items={[{ label: "Test Creation", to: ROUTES.DASHBOARD }, { label: "Preview & Publish" }]}
      />

      {testQuery.isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Test created</h2>
            <Badge className="rounded-full bg-success/20 text-success-foreground border-transparent hover:bg-success/20">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              All {questionIds.length} Questions done
            </Badge>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full bg-primary text-primary-foreground hover:bg-primary">
                      {String(test?.type ?? "Chapter Wise").replace(/^./, (c) => c.toUpperCase())}
                    </Badge>
                    <Badge className="rounded-full bg-success/20 text-success-foreground border-transparent hover:bg-success/20 capitalize">
                      {test?.difficulty ?? "Easy"}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold">{test?.name || "Untitled"}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Subject:</span>{" "}
                      <span className="font-medium">{subjectLabel(test)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Questions:</span>{" "}
                      <span className="font-medium">{questionIds.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total marks:</span>{" "}
                      <span className="font-medium">{test?.total_marks ?? 0}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate({ to: ROUTES.EDIT_TEST(id) })}
                  aria-label="Edit test"
                >
                  <Pencil className="h-4 w-4 text-primary" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-4">
                <span>⏱ {test?.total_time ?? 0} Min</span>
                <span>📄 {questionIds.length} Q's</span>
                <span>📊 {test?.total_marks ?? 0} Marks</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="inline-flex rounded-lg border border-border bg-card p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setMode("now")}
                  className={`px-4 py-1.5 text-sm rounded-md transition ${
                    mode === "now"
                      ? "border border-primary/40 bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Publish Now
                </button>
                <button
                  type="button"
                  onClick={() => setMode("schedule")}
                  className={`px-4 py-1.5 text-sm rounded-md transition ${
                    mode === "schedule"
                      ? "border border-primary/40 bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Schedule Publish
                </button>
              </div>

              <div>
                <h4 className="font-semibold text-sm">Live Until</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose how long this test should remain available on the platform.
                </p>
                <RadioGroup
                  value={liveUntil}
                  onValueChange={setLiveUntil}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {LIVE_UNTIL_OPTIONS.map((o) => (
                    <div className="flex items-center gap-2" key={o.value}>
                      <RadioGroupItem id={`lu-${o.value}`} value={o.value} />
                      <Label htmlFor={`lu-${o.value}`} className="font-normal">
                        {o.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {mode === "schedule" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="schedule-date">Select Date</Label>
                    <Input
                      id="schedule-date"
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schedule-time">Select Time</Label>
                    <Input
                      id="schedule-time"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {liveUntil === "custom" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="end-date">Select End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">Select End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => navigate({ to: ROUTES.DASHBOARD })}>
                  Cancel
                </Button>
                <Button onClick={() => publishMut.mutate()} disabled={publishMut.isPending}>
                  {publishMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold mb-4">Questions</h3>
              {questionIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No questions added yet.</p>
              ) : questionsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading questions…
                </div>
              ) : (
                <ol className="space-y-4">
                  {(questionsQuery.data ?? []).map((q, i) => (
                    <li
                      key={q.id ?? i}
                      id={`preview-q-${i}`}
                      className="scroll-mt-4 rounded-lg border border-border p-4"
                    >
                      <p className="font-medium mb-3">
                        Q{i + 1}. {q.question}
                      </p>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {(["option1", "option2", "option3", "option4"] as const).map((key, idx) => (
                          <li
                            key={key}
                            className={`rounded-md border px-3 py-2 text-sm ${
                              q.correct_option === key
                                ? "border-success bg-success/10 text-foreground"
                                : "border-border"
                            }`}
                          >
                            <span className="text-muted-foreground mr-2">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            {q[key] as string}
                          </li>
                        ))}
                      </ul>
                      {q.explanation && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          <span className="font-semibold">Explanation:</span> {q.explanation}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
