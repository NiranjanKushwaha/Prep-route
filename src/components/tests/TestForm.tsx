import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { DIFFICULTY_OPTIONS, TEST_TYPES } from "@/constants/common.constant";
import { subjectService } from "@/services/subject.service";
import type { CreateTestPayload } from "@/interfaces/test.interface";

const schema = z.object({
  name: z.string().trim().min(1, "Test name is required").max(120),
  type: z.string().min(1, "Test type is required"),
  subject: z.string().min(1, "Subject is required"),
  topics: z.array(z.string()).min(1, "Pick at least one topic"),
  sub_topics: z.array(z.string()),
  difficulty: z.enum(["easy", "medium", "difficult"]),
  total_time: z.coerce.number().int().min(1, "Duration is required").max(1000),
  total_questions: z.coerce.number().int().min(1, "At least 1 question").max(500),
  total_marks: z.coerce.number().int().min(1, "Total marks required").max(10000),
  correct_marks: z.coerce.number().int().min(-100).max(100),
  wrong_marks: z.coerce.number().int().min(-100).max(100),
  unattempt_marks: z.coerce.number().int().min(-100).max(100),
});

export type TestFormValues = z.infer<typeof schema>;

export interface TestFormProps {
  initial?: Partial<TestFormValues>;
  submitLabel: string;
  onSubmit: (values: CreateTestPayload) => Promise<unknown> | void;
  submitting?: boolean;
  onCancel?: () => void;
  hideTypeTabs?: boolean;
}

export function TestForm({
  initial,
  submitLabel,
  onSubmit,
  submitting,
  onCancel,
  hideTypeTabs,
}: TestFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      type: initial?.type ?? "chapterwise",
      subject: initial?.subject ?? "",
      topics: initial?.topics ?? [],
      sub_topics: initial?.sub_topics ?? [],
      difficulty: (initial?.difficulty as TestFormValues["difficulty"]) ?? "easy",
      total_time: initial?.total_time ?? 60,
      total_questions: initial?.total_questions ?? 50,
      total_marks: initial?.total_marks ?? 250,
      correct_marks: initial?.correct_marks ?? 5,
      wrong_marks: initial?.wrong_marks ?? -1,
      unattempt_marks: initial?.unattempt_marks ?? 0,
    },
  });

  const subjectId = watch("subject");
  const selectedTopics = watch("topics");
  const type = watch("type");

  const subjectsQuery = useQuery({
    queryKey: ["subjects"],
    queryFn: () => subjectService.list().then((r) => r.data),
  });

  const topicsQuery = useQuery({
    queryKey: ["topics", subjectId],
    queryFn: () => subjectService.topicsBySubject(subjectId).then((r) => r.data),
    enabled: !!subjectId,
  });

  const subTopicsQuery = useQuery({
    queryKey: ["sub-topics", selectedTopics],
    queryFn: () => subjectService.subTopicsByTopics(selectedTopics).then((r) => r.data),
    enabled: selectedTopics.length > 0,
  });

  // Reset dependent selects when parent changes.
  const [prevSubject, setPrevSubject] = useState(subjectId);
  useEffect(() => {
    if (prevSubject && prevSubject !== subjectId) {
      setValue("topics", []);
      setValue("sub_topics", []);
    }
    setPrevSubject(subjectId);
  }, [subjectId, prevSubject, setValue]);

  const topics = topicsQuery.data ?? [];
  const subTopics = subTopicsQuery.data ?? [];

  const topicMap = useMemo(() => new Map(topics.map((t) => [t.id, t.name])), [topics]);
  const subTopicMap = useMemo(() => new Map(subTopics.map((s) => [s.id, s.name])), [subTopics]);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      ...values,
      status: null,
    });
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      {!hideTypeTabs && (
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div className="inline-flex rounded-full border border-border bg-card p-1 gap-1">
              {TEST_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => field.onChange(t.value)}
                  className={`px-5 py-2 text-sm rounded-full transition-colors ${
                    field.value === t.value
                      ? "bg-accent text-accent-foreground border border-primary/30 font-semibold shadow-sm"
                      : "border border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Subject" error={errors.subject?.message}>
          <Controller
            control={control}
            name="subject"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose from Drop-down" />
                </SelectTrigger>
                <SelectContent>
                  {subjectsQuery.isLoading && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</div>
                  )}
                  {(subjectsQuery.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="Name of Test" error={errors.name?.message}>
          <Input placeholder="Enter name of Test" {...register("name")} />
        </Field>

        <Field label="Topics" error={errors.topics?.message}>
          <Controller
            control={control}
            name="topics"
            render={({ field }) => (
              <MultiSelect
                placeholder={subjectId ? "Choose topics" : "Select subject first"}
                disabled={!subjectId || topicsQuery.isLoading}
                options={topics.map((t) => ({ value: t.id, label: t.name }))}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  setValue("sub_topics", []);
                }}
                selectedLabels={field.value.map((id) => topicMap.get(id) ?? id)}
              />
            )}
          />
        </Field>

        <Field label="Sub Topic" error={errors.sub_topics?.message}>
          <Controller
            control={control}
            name="sub_topics"
            render={({ field }) => (
              <MultiSelect
                placeholder={selectedTopics.length ? "Choose sub topics" : "Select topics first"}
                disabled={selectedTopics.length === 0 || subTopicsQuery.isLoading}
                options={subTopics.map((s) => ({ value: s.id, label: s.name }))}
                value={field.value}
                onChange={field.onChange}
                selectedLabels={field.value.map((id) => subTopicMap.get(id) ?? id)}
              />
            )}
          />
        </Field>

        <Field label="Duration (Minutes)" error={errors.total_time?.message}>
          <Input type="number" min={1} placeholder="Enter the time" {...register("total_time")} />
        </Field>

        <Field label="Test Difficulty Level" error={errors.difficulty?.message}>
          <Controller
            control={control}
            name="difficulty"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex gap-6 flex-wrap pt-2"
              >
                {DIFFICULTY_OPTIONS.map((d) => (
                  <div className="flex items-center gap-2" key={d.value}>
                    <RadioGroupItem id={`diff-${d.value}`} value={d.value} />
                    <Label htmlFor={`diff-${d.value}`} className="font-normal">
                      {d.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </Field>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Marking Scheme</h3>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
          <Field label="Wrong Answer" error={errors.wrong_marks?.message}>
            <Input type="number" {...register("wrong_marks")} />
          </Field>
          <Field label="Unattempted" error={errors.unattempt_marks?.message}>
            <Input type="number" {...register("unattempt_marks")} />
          </Field>
          <Field label="Correct Answer" error={errors.correct_marks?.message}>
            <Input type="number" {...register("correct_marks")} />
          </Field>
          <Field label="No of Questions" error={errors.total_questions?.message}>
            <Input type="number" min={1} placeholder="Ex: 50" {...register("total_questions")} />
          </Field>
          <Field label="Total Marks" error={errors.total_marks?.message}>
            <Input type="number" min={1} placeholder="Ex: 250" {...register("total_marks")} />
          </Field>
        </div>
      </div>

      <input type="hidden" value={type} readOnly />

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="secondary" className="min-w-28" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting} className="min-w-28">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  selectedLabels,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  selectedLabels: string[];
}) {
  const [open, setOpen] = useState(false);
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex w-full min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm text-left ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedLabels.map((l, i) => (
              <Badge key={`${l}-${i}`} variant="secondary" className="font-normal">
                {l}
              </Badge>
            ))
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <div className="max-h-64 overflow-y-auto p-1">
          {options.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">No options</div>
          ) : (
            options.map((o) => {
              const checked = value.includes(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => toggle(o.value)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                >
                  <Checkbox checked={checked} className="pointer-events-none" />
                  {o.label}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
