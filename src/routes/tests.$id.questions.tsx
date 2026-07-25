import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { QuestionSidebar } from "@/components/layout/QuestionSidebar";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIFFICULTY_OPTIONS } from "@/constants/common.constant";
import { ROUTES } from "@/constants/routes.constant";
import type { Question } from "@/interfaces/question.interface";
import type { Test } from "@/interfaces/test.interface";
import { questionService } from "@/services/question.service";
import { testService } from "@/services/test.service";

export const Route = createFileRoute("/tests/$id/questions")({
  head: () => ({
    meta: [
      { title: "Add Questions — PrepRoute" },
      { name: "description", content: "Add MCQs to your test." },
    ],
  }),
  component: QuestionsPage,
});

const schema = z.object({
  question: z.string().trim().min(1, "Question is required").max(2000),
  option1: z.string().trim().min(1, "Option 1 required").max(500),
  option2: z.string().trim().min(1, "Option 2 required").max(500),
  option3: z.string().trim().min(1, "Option 3 required").max(500),
  option4: z.string().trim().min(1, "Option 4 required").max(500),
  correct_option: z.enum(["option1", "option2", "option3", "option4"]),
  explanation: z.string().max(2000).optional().or(z.literal("")),
  difficulty: z.string().optional(),
  media_url: z.string().max(500).optional().or(z.literal("")),
});

type Form = z.infer<typeof schema>;

function editableQuestion(q: Question): Question {
  return {
    ...(q.id ? { id: q.id } : {}),
    type: "mcq",
    question: typeof q.question === "string" ? q.question : "",
    option1: typeof q.option1 === "string" ? q.option1 : "",
    option2: typeof q.option2 === "string" ? q.option2 : "",
    option3: typeof q.option3 === "string" ? q.option3 : "",
    option4: typeof q.option4 === "string" ? q.option4 : "",
    correct_option:
      typeof q.correct_option === "string" ? q.correct_option : "option1",
    explanation: typeof q.explanation === "string" ? q.explanation : "",
    difficulty: typeof q.difficulty === "string" ? q.difficulty : "",
    media_url: typeof q.media_url === "string" ? q.media_url : "",
  };
}

function isQuestionComplete(q: Question): boolean {
  return schema.safeParse(q).success;
}

function subjectLabel(t?: Test): string {
  if (!t) return "";
  if (typeof t.subject === "string") return t.subject_name || t.subject;
  if (t.subject && typeof t.subject === "object") return t.subject.name;
  return "";
}

function firstNamed(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  const first = value[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "name" in first) {
    return String((first as { name?: string }).name ?? "");
  }
  return "";
}

function QuestionsPage() {
  const { id } = useParams({ from: "/tests/$id/questions" });
  const navigate = useNavigate();

  const testQuery = useQuery({
    queryKey: ["test", id],
    queryFn: () => testService.getById(id).then((r) => r.data),
  });

  const [drafts, setDrafts] = useState<Question[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [seeded, setSeeded] = useState(false);

  // Load questions already saved on this test so they can be edited.
  const savedIds = (testQuery.data?.questions ?? []).filter(
    (q): q is string => typeof q === "string",
  );
  const savedQuery = useQuery({
    queryKey: ["questions", savedIds],
    queryFn: () => questionService.fetchBulk(savedIds).then((r) => r.data),
    enabled: savedIds.length > 0,
  });

  const defaults: Form = {
    question: "",
    option1: "",
    option2: "",
    option3: "",
    option4: "",
    correct_option: "option1",
    explanation: "",
    difficulty: "",
    media_url: "",
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: defaults });

  const fillForm = (q: Question) => {
    reset({
      question: q.question ?? "",
      option1: q.option1 ?? "",
      option2: q.option2 ?? "",
      option3: q.option3 ?? "",
      option4: q.option4 ?? "",
      correct_option: (q.correct_option as Form["correct_option"]) || "option1",
      explanation: q.explanation ?? "",
      difficulty: q.difficulty ?? "",
      media_url: q.media_url ?? "",
    });
  };

  // Seed drafts from saved questions and open the first one in the form.
  useEffect(() => {
    if (seeded) return;
    if (savedIds.length === 0 && testQuery.isSuccess) {
      setSeeded(true);
      return;
    }
    if (!savedQuery.data) return;

    const loaded = savedQuery.data.map(editableQuestion);
    setDrafts(loaded);
    setSeeded(true);
    if (loaded.length > 0) {
      setEditingIdx(0);
      fillForm(loaded[0]);
    }
    // fillForm/reset intentionally omitted — only seed once per visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seeded, savedIds.length, savedQuery.data, testQuery.isSuccess]);

  useEffect(() => {
    if (editingIdx === null) return;
    const q = drafts[editingIdx];
    if (q) fillForm(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingIdx]);

  const test = testQuery.data;

  const saveMut = useMutation({
    mutationFn: async (final: Question[]) => {
      // Backend requires subject on each question. GET /tests returns names for
      // subject/topics/sub_topics, and POST /questions/bulk expects those names
      // (topic UUIDs 404).
      const subject = subjectLabel(test);
      if (!subject) throw new Error("Test subject is missing; cannot save questions.");
      const topic = firstNamed(test?.topics);
      const subTopic = firstNamed(test?.sub_topics);

      // Whitelist writable fields. Fetched questions also contain nullable and
      // read-only fields that the update validator rejects when echoed back.
      const enrich = (q: Question): Question => ({
        type: "mcq",
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correct_option: q.correct_option,
        ...(q.explanation ? { explanation: q.explanation } : {}),
        ...(q.difficulty ? { difficulty: q.difficulty } : {}),
        ...(q.media_url ? { media_url: q.media_url } : {}),
        test_id: id,
        subject,
        ...(topic ? { topic } : {}),
        ...(subTopic ? { sub_topic: subTopic } : {}),
      });

      // Existing questions (have an id) are updated in place; new ones are bulk-created.
      const updates = final.filter((q) => q.id);
      const creations = final.filter((q) => !q.id);

      await Promise.all(updates.map((q) => questionService.update(q.id!, enrich(q))));

      let createdIds: string[] = [];
      if (creations.length > 0) {
        const res = await questionService.bulkCreate(creations.map(enrich));
        createdIds = res.data.map((q) => q.id!).filter(Boolean);
      }

      // Preserve draft order: existing ids in place, created ids fill the gaps in order.
      let createdCursor = 0;
      const ids = final
        .map((q) => q.id ?? createdIds[createdCursor++])
        .filter((v): v is string => Boolean(v));

      await testService.update(id, {
        questions: ids,
        total_questions: ids.length,
      });
      return ids;
    },
    onSuccess: () => {
      toast.success("Questions saved");
      navigate({ to: ROUTES.PREVIEW_TEST(id) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDraft = async (idx: number) => {
    const target = drafts[idx];
    if (target?.id) {
      try {
        await questionService.remove(target.id);
        const remaining = savedIds.filter((qid) => qid !== target.id);
        await testService.update(id, {
          questions: remaining,
          total_questions: Math.max(remaining.length, 0),
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete question");
        return;
      }
    }
    setDrafts((prev) => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) {
      setEditingIdx(null);
      reset(defaults);
    }
  };

  const mergeFormValues = (values: Form): Question[] => {
    const next = [...drafts];
    const question = { ...values, type: "mcq" };
    if (editingIdx !== null) {
      next[editingIdx] = { ...next[editingIdx], ...question };
    } else {
      next.push(question);
    }
    return next;
  };

  const onSubmit = handleSubmit((values) => {
    setDrafts(mergeFormValues(values));
    setEditingIdx(null);
    reset(defaults);
    toast.success(editingIdx !== null ? "Question updated" : "Question added");
  });

  const addAnother = handleSubmit((values) => {
    const completed = mergeFormValues(values);
    const next = [...completed, { ...defaults, type: "mcq" }];
    setDrafts(next);
    setEditingIdx(next.length - 1);
    reset(defaults);
  });

  const saveQuestions = (questions: Question[]) => {
    const incompleteIndex = questions.findIndex((q) => !isQuestionComplete(q));
    if (incompleteIndex >= 0) {
      setEditingIdx(incompleteIndex);
      fillForm(questions[incompleteIndex]);
      toast.error(`Complete Question ${incompleteIndex + 1} before continuing.`);
      return;
    }
    saveMut.mutate(questions);
  };

  const handleNext = () => {
    if (editingIdx === null) {
      saveQuestions(drafts);
      return;
    }
    void handleSubmit((values) => {
      const next = mergeFormValues(values);
      setDrafts(next);
      saveQuestions(next);
    })();
  };

  const totalTarget = test?.total_questions ?? 0;
  const questionStates = drafts.map(isQuestionComplete);
  const displayedTotal = Math.max(totalTarget, drafts.length, 1);

  return (
    <AppLayout
      sidebar={
        <QuestionSidebar
          testId={id}
          total={displayedTotal}
          doneCount={questionStates.filter(Boolean).length}
          questionStates={questionStates}
          activeIndex={editingIdx}
          onSelect={(i) => setEditingIdx(i)}
        />
      }
    >
      <Breadcrumbs
        items={[
          { label: "Test Creation", to: ROUTES.DASHBOARD },
          { label: "Create Test" },
          { label: "Chapter Wise" },
        ]}
      />

      {testQuery.isLoading || (savedIds.length > 0 && !seeded) ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full bg-primary text-primary-foreground hover:bg-primary">
                    {String(test?.type ?? "Chapter Wise").replace(/^./, (c) => c.toUpperCase())}
                  </Badge>
                  <Badge className="rounded-full bg-success/20 text-success-foreground border-transparent hover:bg-success/20 capitalize">
                    {test?.difficulty ?? "Easy"}
                  </Badge>
                </div>
                <h2 className="text-lg font-semibold">{test?.name || "Untitled"}</h2>
                <p className="text-sm text-muted-foreground">Subject: {subjectLabel(test)}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>⏱ {test?.total_time ?? 0} Min</span>
                <span>📄 {totalTarget} Q's</span>
                <span>📊 {test?.total_marks ?? 0} Marks</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold">
                    Question {editingIdx !== null ? editingIdx + 1 : drafts.length + 1}
                    <span className="text-muted-foreground">/{displayedTotal}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => void addAnother()}
                    >
                      <Plus className="h-4 w-4" /> Add Another
                    </Button>
                    {editingIdx !== null && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
                        onClick={() => void removeDraft(editingIdx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                </div>
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="flex justify-end">
                    <Badge variant="secondary">MCQ</Badge>
                  </div>

                  <div className="space-y-2">
                    <Label>Question</Label>
                    <Textarea rows={4} placeholder="Type here…" {...register("question")} />
                    {errors.question && (
                      <p className="text-xs text-destructive">{errors.question.message}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Options</Label>
                    <Controller
                      control={control}
                      name="correct_option"
                      render={({ field }) => (
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="space-y-2"
                        >
                          {(["option1", "option2", "option3", "option4"] as const).map(
                            (name, i) => (
                              <div className="flex items-center gap-3" key={name}>
                                <RadioGroupItem value={name} id={name} />
                                <Input placeholder={`Type Option ${i + 1}`} {...register(name)} />
                              </div>
                            ),
                          )}
                        </RadioGroup>
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      Select the radio next to the correct option.
                    </p>
                    {(errors.option1 || errors.option2 || errors.option3 || errors.option4) && (
                      <p className="text-xs text-destructive">All four options are required.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Add Solution (optional)</Label>
                    <Textarea rows={3} placeholder="Explanation…" {...register("explanation")} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Level of Difficulty (optional)</Label>
                      <Controller
                        control={control}
                        name="difficulty"
                        render={({ field }) => (
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select from Drop-down" />
                            </SelectTrigger>
                            <SelectContent>
                              {DIFFICULTY_OPTIONS.map((d) => (
                                <SelectItem key={d.value} value={d.value}>
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Media URL (optional)</Label>
                      <Input placeholder="https://…" {...register("media_url")} />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => navigate({ to: ROUTES.DASHBOARD })}
                    >
                      Exit Test Creation
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button type="submit" variant="outline" className="gap-2">
                        {editingIdx !== null ? (
                          <>
                            <Pencil className="h-4 w-4" /> Update Question
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" /> Add Question
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        disabled={drafts.length === 0 || saveMut.isPending}
                        onClick={handleNext}
                      >
                        {saveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Next
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </AppLayout>
  );
}
