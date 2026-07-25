import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
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

function subjectLabel(t?: Test): string {
  if (!t) return "";
  if (typeof t.subject === "string") return t.subject_name || t.subject;
  if (t.subject && typeof t.subject === "object") return t.subject.name;
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

  useEffect(() => {
    if (editingIdx !== null && drafts[editingIdx]) {
      const q = drafts[editingIdx];
      reset({
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correct_option: q.correct_option as Form["correct_option"],
        explanation: q.explanation ?? "",
        difficulty: q.difficulty ?? "",
        media_url: q.media_url ?? "",
      });
    }
  }, [editingIdx, drafts, reset]);

  const saveMut = useMutation({
    mutationFn: async (final: Question[]) => {
      const payload = final.map((q) => ({ ...q, type: "mcq", test_id: id }));
      const res = await questionService.bulkCreate(payload);
      const ids = res.data.map((q) => q.id!).filter(Boolean);
      await testService.update(id, {
        questions: ids,
        total_questions: ids.length,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Questions saved");
      navigate({ to: ROUTES.PREVIEW_TEST(id) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = handleSubmit((values) => {
    const q: Question = { ...values, type: "mcq" };
    setDrafts((prev) => {
      if (editingIdx !== null) {
        const copy = [...prev];
        copy[editingIdx] = q;
        return copy;
      }
      return [...prev, q];
    });
    setEditingIdx(null);
    reset(defaults);
    toast.success(editingIdx !== null ? "Question updated" : "Question added");
  });

  const test = testQuery.data;
  const totalTarget = test?.total_questions ?? 0;

  return (
    <AppLayout>
      <Breadcrumbs
        items={[
          { label: "Test Creation", to: ROUTES.DASHBOARD },
          { label: "Create Test" },
          { label: "Chapter Wise" },
        ]}
      />

      {testQuery.isLoading ? (
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

          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Question creation</h3>
                  <span className="text-xs text-muted-foreground">
                    Total: {drafts.length}/{totalTarget || "—"}
                  </span>
                </div>
                <div className="space-y-2">
                  {drafts.map((q, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setEditingIdx(i)}
                      className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        editingIdx === i
                          ? "border-success/40 bg-success/10"
                          : "border-success/30 bg-success/5 hover:bg-success/10"
                      }`}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        Question {i + 1}
                      </span>
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrafts((prev) => prev.filter((_, idx) => idx !== i));
                            if (editingIdx === i) {
                              setEditingIdx(null);
                              reset(defaults);
                            }
                          }}
                          className="text-muted-foreground hover:text-destructive p-1"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </button>
                  ))}
                  {drafts.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No questions yet
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4 gap-2"
                  onClick={() => {
                    setEditingIdx(null);
                    reset(defaults);
                  }}
                >
                  <Plus className="h-4 w-4" /> Add Another
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {editingIdx !== null
                        ? `Editing Q${editingIdx + 1}`
                        : `Question ${drafts.length + 1}`}
                    </h3>
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
                        onClick={() => saveMut.mutate(drafts)}
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
